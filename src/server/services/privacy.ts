import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "../db";
import type { UserRow } from "../db/schema";
import { forbidden } from "../http/errors";
import type { Relationship, Visibility } from "@/lib/types";

const NONE: Relationship = { following: false, requested: false, followsYou: false, friends: false };

export async function getRelationship(viewerId: string | null | undefined, otherId: string): Promise<Relationship> {
  if (!viewerId || viewerId === otherId) return NONE;
  const rows = await db
    .select()
    .from(schema.follows)
    .where(
      or(
        and(eq(schema.follows.followerId, viewerId), eq(schema.follows.followingId, otherId)),
        and(eq(schema.follows.followerId, otherId), eq(schema.follows.followingId, viewerId)),
      ),
    );
  const out = rows.find((r) => r.followerId === viewerId);
  const inc = rows.find((r) => r.followerId === otherId);
  const following = out?.status === "ACCEPTED";
  const followsYou = inc?.status === "ACCEPTED";
  return { following, requested: out?.status === "PENDING", followsYou, friends: following && followsYou };
}

/** Relationships to many users at once (for lists). */
export async function getRelationships(viewerId: string | null | undefined, otherIds: string[]) {
  const map = new Map<string, Relationship>();
  if (!viewerId || otherIds.length === 0) return map;
  const rows = await db
    .select()
    .from(schema.follows)
    .where(
      or(
        and(eq(schema.follows.followerId, viewerId), inArray(schema.follows.followingId, otherIds)),
        and(eq(schema.follows.followingId, viewerId), inArray(schema.follows.followerId, otherIds)),
      ),
    );
  for (const id of otherIds) {
    if (id === viewerId) {
      map.set(id, NONE);
      continue;
    }
    const out = rows.find((r) => r.followerId === viewerId && r.followingId === id);
    const inc = rows.find((r) => r.followerId === id && r.followingId === viewerId);
    const following = out?.status === "ACCEPTED";
    const followsYou = inc?.status === "ACCEPTED";
    map.set(id, { following, requested: out?.status === "PENDING", followsYou, friends: following && followsYou });
  }
  return map;
}

/**
 * The single source of truth for "what may this viewer see of this user".
 * Private profiles show nothing beyond the header until a follow is accepted;
 * each section can additionally be hidden by the owner.
 */
export function visibilityFor(owner: UserRow, viewerId: string | null | undefined, rel: Relationship): Visibility {
  if (viewerId === owner.id) return { visited: true, wishlist: true, trips: true, photos: true };
  const content = !owner.isPrivate || rel.following;
  return {
    visited: content && owner.showVisited,
    wishlist: content && owner.showWishlist,
    trips: content && owner.showTrips,
    photos: content && owner.showTrips && owner.showPhotos,
  };
}

export async function getVisibility(owner: UserRow, viewerId: string | null | undefined) {
  const rel = await getRelationship(viewerId, owner.id);
  return { rel, vis: visibilityFor(owner, viewerId, rel) };
}

export function assertCan(allowed: boolean, what = "This content is private.") {
  if (!allowed) throw forbidden(what);
}

/**
 * IDs of users whose trips/photos the viewer may see in aggregated views
 * (Explore, search, country pages): public profiles plus private ones they follow.
 */
export async function followedIds(viewerId: string | null | undefined) {
  if (!viewerId) return new Set<string>();
  const rows = await db
    .select({ id: schema.follows.followingId })
    .from(schema.follows)
    .where(and(eq(schema.follows.followerId, viewerId), eq(schema.follows.status, "ACCEPTED")));
  return new Set(rows.map((r) => r.id));
}
