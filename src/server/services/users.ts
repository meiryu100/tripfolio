import "server-only";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { generatePublicId, hashPassword, verifyPassword } from "../auth/password";
import { revokeOtherSessions } from "../auth/session";
import { db, schema } from "../db";
import type { UserRow } from "../db/schema";
import { conflict, HttpError, notFound } from "../http/errors";
import { deleteObjects, putObject } from "../storage";
import { processPhoto } from "../storage/images";
import { toUserSummary } from "./mappers";
import { getVisibility } from "./privacy";
import type { Me, Profile } from "@/lib/types";
import type { z } from "zod";
import type { profileSchema, settingsSchema } from "@/lib/validation";

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

export async function assertAvailable(fields: { username?: string; email?: string }, selfId?: string) {
  if (fields.username) {
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
  username: string;
  email: string;
  password?: string;
  googleId?: string;
}) {
  await assertAvailable(input);
  const [user] = await db
    .insert(schema.users)
    .values({
      publicId: generatePublicId(),
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      email: input.email,
      passwordHash: input.password ? await hashPassword(input.password) : null,
      googleId: input.googleId,
    })
    .returning();
  return user;
}

export async function toMe(u: UserRow): Promise<Me> {
  const [[unread], [pending]] = await Promise.all([
    db
      .select({ n: count() })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, u.id), eq(schema.notifications.read, false))),
    db
      .select({ n: count() })
      .from(schema.follows)
      .where(and(eq(schema.follows.followingId, u.id), eq(schema.follows.status, "PENDING"))),
  ]);
  return {
    ...toUserSummary(u),
    publicId: u.publicId,
    email: u.email,
    bio: u.bio,
    location: u.location,
    website: u.website,
    onboarded: u.onboarded,
    hasPassword: Boolean(u.passwordHash),
    googleLinked: Boolean(u.googleId),
    createdAt: u.createdAt.toISOString(),
    unreadNotifications: unread.n,
    pendingRequests: pending.n,
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
  const { rel, vis } = await getVisibility(owner, viewerId);

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
      .where(eq(schema.userCountries.userId, owner.id))
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

export async function completeOnboarding(userId: string) {
  await db.update(schema.users).set({ onboarded: true }).where(eq(schema.users.id, userId));
}

export async function changeEmail(user: UserRow, email: string, password: string) {
  if (user.passwordHash && !(await verifyPassword(password, user.passwordHash)))
    throw new HttpError("VALIDATION", "Password is incorrect.", "password");
  await assertAvailable({ email }, user.id);
  await db.update(schema.users).set({ email }).where(eq(schema.users.id, user.id));
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
  if (confirm.trim().toLowerCase() !== user.username.toLowerCase())
    throw new HttpError("VALIDATION", "Type your username to confirm.", "confirm");
  if (user.passwordHash && !(await verifyPassword(password, user.passwordHash)))
    throw new HttpError("VALIDATION", "Password is incorrect.", "password");

  const photos = await db
    .select({ key: schema.tripPhotos.storageKey })
    .from(schema.tripPhotos)
    .where(eq(schema.tripPhotos.userId, user.id));
  await db.delete(schema.users).where(eq(schema.users.id, user.id)); // cascades to everything else
  const keys = photos.flatMap((p) => (p.key ? [`${p.key}/full.webp`, `${p.key}/thumb.webp`] : []));
  if (user.avatarKey) keys.push(avatarObjectKey(user.avatarKey));
  await deleteObjects(keys).catch((e) => console.error("[storage] cleanup failed", e));
}
