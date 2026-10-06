import "server-only";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { db, schema } from "../db";
import { badRequest, notFound } from "../http/errors";
import { toUserSummary } from "./mappers";
import { deleteFollowNotifications, notify } from "./notifications";
import { decodeCursor, encodeCursor } from "./pagination";
import { assertCan, getRelationship, getRelationships } from "./privacy";
import { requireUserByUsername } from "./users";
import type { FollowRequest, Page, Relationship, UserSummary } from "@/lib/types";

/** Follow someone. Private profiles get a request instead. */
export async function follow(viewerId: string, username: string): Promise<Relationship> {
  const target = await requireUserByUsername(username);
  if (target.id === viewerId) throw badRequest("You can't follow yourself.");
  const existing = await db.query.follows.findFirst({
    where: and(eq(schema.follows.followerId, viewerId), eq(schema.follows.followingId, target.id)),
  });
  if (!existing) {
    const status = target.isPrivate ? "PENDING" : "ACCEPTED";
    await db.insert(schema.follows).values({ followerId: viewerId, followingId: target.id, status });
    await notify({ userId: target.id, actorUserId: viewerId, type: status === "PENDING" ? "FOLLOW_REQUEST" : "FOLLOW" });
  }
  return getRelationship(viewerId, target.id);
}

/** Unfollow, or cancel a pending request. */
export async function unfollow(viewerId: string, username: string): Promise<Relationship> {
  const target = await requireUserByUsername(username);
  const [removed] = await db
    .delete(schema.follows)
    .where(and(eq(schema.follows.followerId, viewerId), eq(schema.follows.followingId, target.id)))
    .returning();
  if (removed?.status === "ACCEPTED") await notify({ userId: target.id, actorUserId: viewerId, type: "UNFOLLOW" });
  if (removed?.status === "PENDING") await deleteFollowNotifications(viewerId, target.id);
  return getRelationship(viewerId, target.id);
}

export async function listRequests(userId: string): Promise<FollowRequest[]> {
  const rows = await db
    .select({ f: schema.follows, u: schema.users })
    .from(schema.follows)
    .innerJoin(schema.users, eq(schema.users.id, schema.follows.followerId))
    .where(and(eq(schema.follows.followingId, userId), eq(schema.follows.status, "PENDING")))
    .orderBy(desc(schema.follows.createdAt))
    .limit(100);
  return rows.map(({ f, u }) => ({ user: toUserSummary(u), createdAt: f.createdAt.toISOString() }));
}

export async function acceptRequest(userId: string, requesterUsername: string) {
  const requester = await requireUserByUsername(requesterUsername);
  const [row] = await db
    .update(schema.follows)
    .set({ status: "ACCEPTED" })
    .where(
      and(
        eq(schema.follows.followerId, requester.id),
        eq(schema.follows.followingId, userId),
        eq(schema.follows.status, "PENDING"),
      ),
    )
    .returning();
  if (!row) throw notFound("Request not found.");
  await deleteFollowNotifications(requester.id, userId);
  await notify({ userId: requester.id, actorUserId: userId, type: "FOLLOW_ACCEPTED" });
}

export async function declineRequest(userId: string, requesterUsername: string) {
  const requester = await requireUserByUsername(requesterUsername);
  await db
    .delete(schema.follows)
    .where(
      and(
        eq(schema.follows.followerId, requester.id),
        eq(schema.follows.followingId, userId),
        eq(schema.follows.status, "PENDING"),
      ),
    );
  await deleteFollowNotifications(requester.id, userId);
}

/** Remove someone from your followers. */
export async function removeFollower(userId: string, followerUsername: string) {
  const follower = await requireUserByUsername(followerUsername);
  await db
    .delete(schema.follows)
    .where(and(eq(schema.follows.followerId, follower.id), eq(schema.follows.followingId, userId)));
}

export async function listFollows(
  viewerId: string | null,
  username: string,
  kind: "followers" | "following",
  opts: { cursor?: string; limit: number },
): Promise<Page<UserSummary & { relationship: Relationship }>> {
  const owner = await requireUserByUsername(username);
  if (owner.isPrivate && owner.id !== viewerId) {
    const rel = await getRelationship(viewerId, owner.id);
    assertCan(rel.following, "This account is private.");
  }
  const c = decodeCursor(opts.cursor);
  const otherCol = kind === "followers" ? schema.follows.followerId : schema.follows.followingId;
  const ownerCol = kind === "followers" ? schema.follows.followingId : schema.follows.followerId;
  const rows = await db
    .select({ f: schema.follows, u: schema.users })
    .from(schema.follows)
    .innerJoin(schema.users, eq(schema.users.id, otherCol))
    .where(
      and(
        eq(ownerCol, owner.id),
        eq(schema.follows.status, "ACCEPTED"),
        c
          ? or(lt(schema.follows.createdAt, c.at), and(eq(schema.follows.createdAt, c.at), lt(otherCol, c.id)))
          : undefined,
      ),
    )
    .orderBy(desc(schema.follows.createdAt), desc(otherCol))
    .limit(opts.limit + 1);

  const page = rows.slice(0, opts.limit);
  const rels = await getRelationships(viewerId, page.map((r) => r.u.id));
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({ ...toUserSummary(r.u), relationship: rels.get(r.u.id) ?? emptyRel })),
    nextCursor: rows.length > opts.limit && last ? encodeCursor(last.f.createdAt, last.u.id) : null,
  };
}

const emptyRel: Relationship = { following: false, requested: false, followsYou: false, friends: false };

/** People who follow each other with the viewer. */
export async function listFriends(userId: string): Promise<UserSummary[]> {
  const rows = await db
    .select({ u: schema.users })
    .from(schema.follows)
    .innerJoin(schema.users, eq(schema.users.id, schema.follows.followingId))
    .where(and(eq(schema.follows.followerId, userId), eq(schema.follows.status, "ACCEPTED")));
  const rels = await getRelationships(userId, rows.map((r) => r.u.id));
  return rows.filter((r) => rels.get(r.u.id)?.friends).map((r) => toUserSummary(r.u));
}
