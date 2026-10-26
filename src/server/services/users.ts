import "server-only";
import { randomBytes } from "node:crypto";
import { and, count, eq, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { generatePublicId, hashPassword, verifyPassword } from "../auth/password";
import { revokeOtherSessions } from "../auth/session";
import { db, schema } from "../db";
import type { UserRow } from "../db/schema";
import { env } from "../env";
import { conflict, HttpError, notFound } from "../http/errors";
import { deleteObjects, putObject } from "../storage";
import { processPhoto } from "../storage/images";
import { mailHtml, sendMail } from "./mailer";
import { toUserSummary } from "./mappers";
import { messageCounts, messagePhotoObjects, messagingStatus } from "./messages";
import { getVisibility } from "./privacy";
import { sendVerification } from "./verification";
import type { Attribution } from "@/lib/attribution";
import { SOVEREIGN_CODES } from "@/lib/countries";
import type { Me, Profile } from "@/lib/types";
import type { z } from "zod";
import { confirmsAccount, isReservedUsername, type aboutYouSchema, type profileSchema, type settingsSchema } from "@/lib/validation";
import type { Device } from "@/lib/device";

export async function findByUsername(username: string) {
  const row = await db.query.users.findFirst({
    where: sql`lower(${schema.users.username}) = ${username.toLowerCase()}`,
  });
  return row ?? null;
}

export async function requireUserByUsername(username: string) {
  const u = await findByUsername(username);
  if (!u) throw notFound("User not found.");
  return u;
}

/** A free username built from the email's local part, e.g. for sign-ups that haven't chosen one yet. */
export async function generateUsername(email: string) {
  const base = (email.split("@")[0] || "traveler")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, 14)
    .padEnd(3, "0");
  let username = isReservedUsername(base) ? `${base}${randomBytes(2).toString("hex")}` : base;
  for (let i = 0; i < 20; i++) {
    const taken = await db.query.users.findFirst({
      columns: { id: true },
      where: sql`lower(${schema.users.username}) = ${username}`,
    });
    if (!taken) break;
    username = `${base}${randomBytes(2).toString("hex")}`;
  }
  return username;
}

export async function assertAvailable(fields: { username?: string; email?: string }, selfId?: string) {
  if (fields.username) {
    if (isReservedUsername(fields.username)) {
      // Someone who already has the name keeps it (e.g. saving their profile unchanged).
      const own = selfId && (await db.query.users.findFirst({ columns: { username: true }, where: eq(schema.users.id, selfId) }));
      if (!own || own.username.toLowerCase() !== fields.username.toLowerCase())
        throw conflict("That username isn't available. Try another one.", "username");
    }
    const taken = await db.query.users.findFirst({
      columns: { id: true },
      where: and(
        sql`lower(${schema.users.username}) = ${fields.username.toLowerCase()}`,
        selfId ? ne(schema.users.id, selfId) : undefined,
      ),
    });
    if (taken) throw conflict("That username is taken.", "username");
  }
  if (fields.email) {
    const taken = await db.query.users.findFirst({
      columns: { id: true },
      where: and(
        sql`lower(${schema.users.email}) = ${fields.email.toLowerCase()}`,
        selfId ? ne(schema.users.id, selfId) : undefined,
      ),
    });
    if (taken) throw conflict("An account with this email already exists.", "email");
  }
}

export async function createUser(input: {
  firstName: string;
  lastName: string;
  gender?: "male" | "female";
  username: string;
  email: string;
  password?: string;
  googleId?: string;
  facebookId?: string;
  /** Google/Facebook already confirmed the email; email sign-ups confirm it by link. */
  emailVerified?: boolean;
  invitedBy?: string;
  attribution?: Attribution;
  device?: Device | null;
}) {
  await assertAvailable(input);
  const [user] = await db
    .insert(schema.users)
    .values({
      publicId: generatePublicId(),
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender, // undefined → column default (male), e.g. Google sign-ups
      username: input.username,
      email: input.email,
      passwordHash: input.password ? await hashPassword(input.password) : null,
      googleId: input.googleId,
      facebookId: input.facebookId,
      emailVerifiedAt: input.emailVerified ? new Date() : null,
      invitedBy: input.invitedBy,
      signupSource: input.attribution?.source,
      signupMedium: input.attribution?.medium,
      signupCampaign: input.attribution?.campaign,
      signupReferrer: input.attribution?.referrer,
      signupDevice: input.device,
    })
    .returning();
  return user;
}

export async function toMe(u: UserRow): Promise<Me> {
  const [[unread], [pending], messages] = await Promise.all([
    db
      .select({ n: count() })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, u.id), eq(schema.notifications.read, false))),
    db
      .select({ n: count() })
      .from(schema.follows)
      .where(and(eq(schema.follows.followingId, u.id), eq(schema.follows.status, "PENDING"))),
    messageCounts(u.id),
  ]);
  return {
    ...toUserSummary(u),
    publicId: u.publicId,
    gender: u.gender,
    email: u.email,
    bio: u.bio,
    location: u.location,
    website: u.website,
    onboarded: u.onboarded,
    hasPassword: Boolean(u.passwordHash),
    googleLinked: Boolean(u.googleId),
    facebookLinked: Boolean(u.facebookId),
    emailVerified: Boolean(u.emailVerifiedAt),
    pendingEmail: u.pendingEmail,
    createdAt: u.createdAt.toISOString(),
    unreadNotifications: unread.n,
    pendingRequests: pending.n,
    ...messages,
    settings: {
      isPrivate: u.isPrivate,
      showVisited: u.showVisited,
      showWishlist: u.showWishlist,
      showTrips: u.showTrips,
      showPhotos: u.showPhotos,
      notifyFollows: u.notifyFollows,
      notifyTrips: u.notifyTrips,
      notifyEmail: u.notifyEmail,
      theme: u.theme,
    },
  };
}

export async function getProfile(viewerId: string | null, username: string): Promise<Profile> {
  const owner = await requireUserByUsername(username);
  const [{ rel, vis }, messaging] = await Promise.all([getVisibility(owner, viewerId), messagingStatus(viewerId, owner)]);

  const [followers, following, statusCounts, tripCount, photoCount] = await Promise.all([
    db
      .select({ n: count() })
      .from(schema.follows)
      .where(and(eq(schema.follows.followingId, owner.id), eq(schema.follows.status, "ACCEPTED"))),
    db
      .select({ n: count() })
      .from(schema.follows)
      .where(and(eq(schema.follows.followerId, owner.id), eq(schema.follows.status, "ACCEPTED"))),
    db
      .select({ status: schema.userCountries.status, n: count() })
      .from(schema.userCountries)
      .where(
        and(
          eq(schema.userCountries.userId, owner.id),
          // Only sovereign countries count as visited; territories don't.
          or(eq(schema.userCountries.status, "WANT_TO_VISIT"), inArray(schema.userCountries.countryCode, SOVEREIGN_CODES)),
        ),
      )
      .groupBy(schema.userCountries.status),
    db.select({ n: count() }).from(schema.trips).where(eq(schema.trips.userId, owner.id)),
    db
      .select({ n: count() })
      .from(schema.tripPhotos)
      .innerJoin(schema.trips, eq(schema.trips.id, schema.tripPhotos.tripId))
      .where(eq(schema.trips.userId, owner.id)),
  ]);
  const byStatus = Object.fromEntries(statusCounts.map((r) => [r.status, r.n]));

  return {
    ...toUserSummary(owner),
    bio: owner.bio,
    location: owner.location,
    website: owner.website,
    isPrivate: owner.isPrivate,
    joinedAt: owner.createdAt.toISOString(),
    isMe: viewerId === owner.id,
    relationship: rel,
    canView: vis,
    ...messaging,
    counts: {
      followers: followers[0].n,
      following: following[0].n,
      visited: vis.visited ? (byStatus.VISITED ?? 0) : null,
      wishlist: vis.wishlist ? (byStatus.WANT_TO_VISIT ?? 0) : null,
      trips: vis.trips ? tripCount[0].n : null,
      photos: vis.photos ? photoCount[0].n : null,
    },
  };
}

export async function updateProfile(userId: string, input: z.infer<typeof profileSchema>) {
  await assertAvailable({ username: input.username }, userId);
  const [u] = await db.update(schema.users).set(input).where(eq(schema.users.id, userId)).returning();
  return u;
}

export async function updateSettings(userId: string, input: z.infer<typeof settingsSchema>) {
  const [u] = await db.update(schema.users).set(input).where(eq(schema.users.id, userId)).returning();
  // Going public auto-accepts anyone who was waiting.
  if (input.isPrivate === false) {
    await db
      .update(schema.follows)
      .set({ status: "ACCEPTED" })
      .where(and(eq(schema.follows.followingId, userId), eq(schema.follows.status, "PENDING")));
  }
  return u;
}

export async function saveAboutYou(userId: string, input: z.infer<typeof aboutYouSchema>) {
  await assertAvailable({ username: input.username }, userId);
  const [u] = await db.update(schema.users).set(input).where(eq(schema.users.id, userId)).returning();
  return u;
}

export async function completeOnboarding(userId: string) {
  await db.update(schema.users).set({ onboarded: true }).where(eq(schema.users.id, userId));
}

/** Tell the account's (old) address about a sign-in change, so a takeover doesn't go unnoticed. */
export async function sendSecurityNotice(user: UserRow, change: string) {
  const url = `${env.appUrl}/forgot-password`;
  await sendMail({
    to: user.email,
    subject: `Your Tripfolio ${change} was changed`,
    text: `Hi ${user.firstName},\n\nThe ${change} on your Tripfolio account was just changed.\n\nIf this was you, there's nothing to do. If it wasn't, reset your password now:\n${url}`,
    html: mailHtml({
      greeting: `Hi ${user.firstName},`,
      lines: [`The ${change} on your Tripfolio account was just changed.`, "If this was you, there's nothing to do."],
      button: { label: "Wasn't me — reset password", url },
      footer: "You're getting this because it's a security change on your account.",
    }),
  });
}

/**
 * The new address isn't proven yet, so it waits as `pendingEmail` and gets a confirmation link;
 * the account keeps signing in with its current email until the link is clicked (`verifyEmail`
 * swaps them). A typo can't lock anyone out — just change it again.
 */
export async function changeEmail(user: UserRow, email: string, password: string) {
  if (user.passwordHash && !(await verifyPassword(password, user.passwordHash)))
    throw new HttpError("VALIDATION", "Password is incorrect.", "password");
  if (email.toLowerCase() === user.email.toLowerCase()) {
    // Back to the current address (or only its capitalization): drop any pending change.
    await db.update(schema.users).set({ email, pendingEmail: null }).where(eq(schema.users.id, user.id));
    return;
  }
  await assertAvailable({ email }, user.id);
  await db.update(schema.users).set({ pendingEmail: email }).where(eq(schema.users.id, user.id));
  await sendVerification(user, email, "change");
}

export async function changePassword(user: UserRow, sessionId: string, current: string, next: string) {
  // Google-only accounts can set a first password without a current one.
  if (user.passwordHash && !(await verifyPassword(current, user.passwordHash)))
    throw new HttpError("VALIDATION", "Current password is incorrect.", "current");
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(schema.users.id, user.id));
  // A password change signs out every other device.
  await revokeOtherSessions(user.id, sessionId);
  await sendSecurityNotice(user, "password");
}

export async function setAvatar(user: UserRow, file: Buffer) {
  const img = await processPhoto(file, { full: 512, thumb: 128 });
  const key = `avatars/${user.id}/${crypto.randomUUID()}`;
  await putObject(`${key}.webp`, img.full, "image/webp");
  await db.update(schema.users).set({ avatarKey: key.split("/").slice(1).join("_") }).where(eq(schema.users.id, user.id));
  if (user.avatarKey) await deleteObjects([avatarObjectKey(user.avatarKey)]).catch(() => {});
}

export async function removeAvatar(user: UserRow) {
  if (!user.avatarKey) return;
  await db.update(schema.users).set({ avatarKey: null }).where(eq(schema.users.id, user.id));
  await deleteObjects([avatarObjectKey(user.avatarKey)]).catch(() => {});
}

/** avatarKey is "<userId>_<uuid>"; the object lives at avatars/<userId>/<uuid>.webp */
export function avatarObjectKey(avatarKey: string) {
  const [userId, id] = avatarKey.split("_");
  return `avatars/${userId}/${id}.webp`;
}

export async function deleteAccount(user: UserRow, password: string, confirm: string) {
  if (!confirmsAccount(confirm, user))
    throw new HttpError("VALIDATION", `Type your username (${user.username}) or your email to confirm.`, "confirm");
  if (user.passwordHash && !(await verifyPassword(password, user.passwordHash)))
    throw new HttpError("VALIDATION", "Password is incorrect.", "password");

  const photos = await db
    .select({ key: schema.tripPhotos.storageKey })
    .from(schema.tripPhotos)
    .where(eq(schema.tripPhotos.userId, user.id));
  // Their chats go too (both sides), so do the photos in them.
  const chatPhotos = await db
    .select({ key: schema.messages.photoKey })
    .from(schema.messages)
    .innerJoin(schema.conversations, eq(schema.conversations.id, schema.messages.conversationId))
    .where(
      and(
        isNotNull(schema.messages.photoKey),
        or(eq(schema.conversations.userLowId, user.id), eq(schema.conversations.userHighId, user.id)),
      ),
    );
  await db.delete(schema.users).where(eq(schema.users.id, user.id)); // cascades to everything else
  const keys = photos.flatMap((p) => (p.key ? [`${p.key}/full.webp`, `${p.key}/thumb.webp`] : []));
  keys.push(...chatPhotos.flatMap((p) => (p.key ? messagePhotoObjects(p.key) : [])));
  if (user.avatarKey) keys.push(avatarObjectKey(user.avatarKey));
  await deleteObjects(keys).catch((e) => console.error("[storage] cleanup failed", e));
}
