import "server-only";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { db, schema } from "../db";
import { toUserSummary } from "./mappers";
import { decodeCursor, encodeCursor } from "./pagination";
import type { AppNotification, NotificationType, Page } from "@/lib/types";

/** Create a notification, honouring the recipient's preferences. */
export async function notify(input: { userId: string; actorUserId: string; type: NotificationType; tripId?: string }) {
  if (input.userId === input.actorUserId) return;
  const recipient = await db.query.users.findFirst({
    columns: { notifyFollows: true, notifyTrips: true },
    where: eq(schema.users.id, input.userId),
  });
  if (!recipient) return;
  if (input.type === "TRIP" ? !recipient.notifyTrips : !recipient.notifyFollows) return;
  // Requests are always delivered — otherwise a private user could never see them.
  await db.insert(schema.notifications).values(input);
}

/** Tell followers who opted in that someone added a trip. */
export async function notifyFollowersOfTrip(authorId: string, tripId: string) {
  const followers = await db
    .select({ id: schema.users.id })
    .from(schema.follows)
    .innerJoin(schema.users, eq(schema.users.id, schema.follows.followerId))
    .where(
      and(
        eq(schema.follows.followingId, authorId),
        eq(schema.follows.status, "ACCEPTED"),
        eq(schema.users.notifyTrips, true),
      ),
    )
    .limit(1000);
  if (!followers.length) return;
  await db
    .insert(schema.notifications)
    .values(followers.map((f) => ({ userId: f.id, actorUserId: authorId, type: "TRIP" as const, tripId })));
}

export async function listNotifications(userId: string, cursor: string | undefined, limit: number): Promise<Page<AppNotification>> {
  const c = decodeCursor(cursor);
  const rows = await db
    .select({ n: schema.notifications, actor: schema.users, trip: schema.trips })
    .from(schema.notifications)
    .innerJoin(schema.users, eq(schema.users.id, schema.notifications.actorUserId))
    .leftJoin(schema.trips, eq(schema.trips.id, schema.notifications.tripId))
    .where(
      and(
        eq(schema.notifications.userId, userId),
        c
          ? or(
              lt(schema.notifications.createdAt, c.at),
              and(eq(schema.notifications.createdAt, c.at), lt(schema.notifications.id, c.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(schema.notifications.createdAt), desc(schema.notifications.id))
    .limit(limit + 1);

  const items = rows.slice(0, limit).map(({ n, actor, trip }) => ({
    id: n.id,
    type: n.type,
    actor: toUserSummary(actor),
    trip: trip ? { id: trip.id, title: trip.title, countryCode: trip.countryCode } : null,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
  const last = rows[limit - 1];
  return { items, nextCursor: rows.length > limit && last ? encodeCursor(last.n.createdAt, last.n.id) : null };
}

export async function markAllRead(userId: string) {
  await db
    .update(schema.notifications)
    .set({ read: true })
    .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.read, false)));
}

export async function deleteFollowNotifications(actorId: string, userId: string) {
  await db
    .delete(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.actorUserId, actorId),
        inArray(schema.notifications.type, ["FOLLOW_REQUEST"]),
      ),
    );
}
