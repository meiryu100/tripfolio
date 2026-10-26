import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { computeStats } from "@/features/stats/compute";
import { getCountry } from "@/lib/countries";
import type { CountryStatus } from "@/lib/types";
import { db, schema } from "../db";
import { env } from "../env";
import { mailHtml, sendMail } from "./mailer";

/**
 * The weekly email ("Email notifications" in Settings, off by default — backlog #19): friends'
 * new trips of the past week, how far the user is from their next milestone, and a nudge to add a
 * first trip for people who joined in the last month and have none. Sent only when there's
 * something new for them (a friend's trip or the first-trip nudge), so a quiet week sends nothing.
 */

const WEEK_MS = 7 * 86_400_000;
const NEW_USER_MS = 30 * 86_400_000;
const MAX_FRIEND_TRIPS = 5;

export interface Digest {
  friendTrips: { name: string; title: string; country: string; id: string }[];
  milestone: string | null;
  firstTripNudge: boolean;
}

export async function buildDigest(userId: string, joinedAt: Date, now = new Date()): Promise<Digest> {
  const since = new Date(now.getTime() - WEEK_MS);
  // People this user follows (accepted), and only trips their owners let everyone see.
  const friendTrips = await db
    .select({ id: schema.trips.id, title: schema.trips.title, country: schema.trips.countryCode, first: schema.users.firstName, last: schema.users.lastName })
    .from(schema.trips)
    .innerJoin(schema.users, eq(schema.users.id, schema.trips.userId))
    .innerJoin(schema.follows, and(eq(schema.follows.followingId, schema.trips.userId), eq(schema.follows.followerId, userId), eq(schema.follows.status, "ACCEPTED")))
    .where(and(gt(schema.trips.createdAt, since), eq(schema.users.showTrips, true)))
    .orderBy(sql`${schema.trips.createdAt} desc`)
    .limit(MAX_FRIEND_TRIPS);

  const marks = await db.select({ code: schema.userCountries.countryCode, status: schema.userCountries.status }).from(schema.userCountries).where(eq(schema.userCountries.userId, userId));
  const statuses = Object.fromEntries(marks.map((m) => [m.code, (m.status === "VISITED" ? "visited" : "wishlist") as CountryStatus]));
  const next = computeStats(statuses).nextMilestone;

  const [{ trips }] = await db.select({ trips: sql<number>`count(*)::int` }).from(schema.trips).where(eq(schema.trips.userId, userId));

  return {
    friendTrips: friendTrips.map((t) => ({ id: t.id, title: t.title, country: t.country, name: `${t.first} ${t.last}`.trim() })),
    milestone: next ? `You're ${next.remaining} ${next.remaining === 1 ? "country" : "countries"} away from ${next.label}.` : null,
    firstTripNudge: trips === 0 && now.getTime() - joinedAt.getTime() < NEW_USER_MS,
  };
}

const worthSending = (d: Digest) => d.friendTrips.length > 0 || d.firstTripNudge;

function digestMail(firstName: string, d: Digest) {
  // "Traveler" is sign-up's placeholder until the user sets a name.
  const hi = firstName && firstName !== "Traveler" ? `Hi ${firstName},` : "Hi,";
  const friend = d.friendTrips[0]?.name.split(" ")[0];
  const others = new Set(d.friendTrips.map((t) => t.name)).size > 1;
  const lines: string[] = [];
  if (d.friendTrips.length) {
    lines.push("New from the travelers you follow this week:");
    for (const t of d.friendTrips) lines.push(`• ${t.name} added "${t.title}" in ${getCountry(t.country)?.flag ?? ""} ${getCountry(t.country)?.name ?? t.country}`);
  }
  if (d.firstTripNudge) lines.push("Your map is colored in, but your trips aren't there yet. Add one — only the country is required, dates and photos are optional.");
  if (d.milestone) lines.push(d.milestone);
  const button = d.friendTrips.length ? { label: "See their trips", url: `${env.appUrl}/home` } : { label: "Add a trip", url: `${env.appUrl}/trips` };
  const footer = "You get this weekly because Email notifications is on. Turn it off in Settings → Notifications.";
  return {
    subject: friend ? (others ? `${friend} and friends added new trips` : `${friend} added a new trip`) : "Your week on Tripfolio",
    text: `${hi}\n\n${lines.join("\n")}\n\n${button.label}: ${button.url}\n\n${footer} ${env.appUrl}/settings`,
    html: mailHtml({ greeting: hi, lines, button, footer }),
  };
}

/** Send this week's email to everyone who turned it on. Returns how many were sent and skipped. */
export async function sendWeeklyDigests(now = new Date()) {
  const recipients = await db
    .select({ id: schema.users.id, email: schema.users.email, firstName: schema.users.firstName, createdAt: schema.users.createdAt })
    .from(schema.users)
    .where(and(eq(schema.users.notifyEmail, true), eq(schema.users.isTestUser, false), sql`${schema.users.emailVerifiedAt} is not null`));

  let sent = 0;
  for (const r of recipients) {
    const digest = await buildDigest(r.id, r.createdAt, now);
    if (!worthSending(digest)) continue;
    await sendMail({ to: r.email, ...digestMail(r.firstName, digest) });
    sent++;
  }
  return { recipients: recipients.length, sent, skipped: recipients.length - sent };
}
