import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "../db";
import type { TripRow, UserRow } from "../db/schema";
import { forbidden, HttpError, notFound } from "../http/errors";
import { deleteObjects, putObject } from "../storage";
import { processPhoto } from "../storage/images";
import { assertCountry, ensureVisited } from "./countries";
import { toPhoto, toTrip, toUserSummary } from "./mappers";
import { notifyFollowersOfTrip } from "./notifications";
import { decodeOffset, encodeOffset } from "./pagination";
import { getVisibility } from "./privacy";
import { requireUserByUsername } from "./users";
import type { Page, Trip } from "@/lib/types";
import type { z } from "zod";
import type { tripSchema } from "@/lib/validation";

const MAX_PHOTOS_PER_TRIP = 30;
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

/** Newest trip first: by start date, falling back to creation time. */
const tripOrder = [desc(sql`coalesce(${schema.trips.startDate}, ${schema.trips.endDate}, ${schema.trips.createdAt}::date)`), desc(schema.trips.createdAt)];

/** Attach covers / photo counts / authors to trip rows in two queries. */
export async function hydrateTrips(
  rows: TripRow[],
  opts: { authors?: Map<string, UserRow>; showPhotosFor?: (t: TripRow) => boolean } = {},
): Promise<Trip[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [counts, covers] = await Promise.all([
    db
      .select({ tripId: schema.tripPhotos.tripId, n: count() })
      .from(schema.tripPhotos)
      .where(inArray(schema.tripPhotos.tripId, ids))
      .groupBy(schema.tripPhotos.tripId),
    db
      .selectDistinctOn([schema.tripPhotos.tripId])
      .from(schema.tripPhotos)
      .where(inArray(schema.tripPhotos.tripId, ids))
      .orderBy(schema.tripPhotos.tripId, desc(schema.tripPhotos.isCover), asc(schema.tripPhotos.position)),
  ]);
  const countMap = new Map(counts.map((c) => [c.tripId, c.n]));
  const coverMap = new Map(covers.map((c) => [c.tripId, c]));
  return rows.map((t) => {
    const author = opts.authors?.get(t.userId);
    return toTrip(t, {
      cover: coverMap.get(t.id) ?? null,
      photoCount: countMap.get(t.id) ?? 0,
      author: author ? toUserSummary(author) : undefined,
      showPhotos: opts.showPhotosFor ? opts.showPhotosFor(t) : true,
    });
  });
}

export async function listUserTrips(
  viewerId: string | null,
  username: string,
  opts: { cursor?: string; limit: number; country?: string },
): Promise<Page<Trip>> {
  const owner = await requireUserByUsername(username);
  const { vis } = await getVisibility(owner, viewerId);
  if (!vis.trips) return { items: [], nextCursor: null };
  const offset = decodeOffset(opts.cursor);
  const rows = await db
    .select()
    .from(schema.trips)
    .where(and(eq(schema.trips.userId, owner.id), opts.country ? eq(schema.trips.countryCode, opts.country) : undefined))
    .orderBy(...tripOrder)
    .limit(opts.limit + 1)
    .offset(offset);
  const items = await hydrateTrips(rows.slice(0, opts.limit), { showPhotosFor: () => vis.photos });
  return { items, nextCursor: rows.length > opts.limit ? encodeOffset(offset + opts.limit) : null };
}

async function loadTripForViewer(viewerId: string | null, tripId: string) {
  const trip = await db.query.trips.findFirst({ where: eq(schema.trips.id, tripId) });
  if (!trip) throw notFound("Trip not found.");
  const owner = await db.query.users.findFirst({ where: eq(schema.users.id, trip.userId) });
  if (!owner) throw notFound("Trip not found.");
  const { vis } = await getVisibility(owner, viewerId);
  // Same response as a missing trip, so private trip IDs can't be probed.
  if (!vis.trips) throw notFound("Trip not found.");
  return { trip, owner, vis };
}

export async function getTrip(viewerId: string | null, tripId: string): Promise<Trip> {
  const { trip, owner, vis } = await loadTripForViewer(viewerId, tripId);
  const photos = vis.photos
    ? await db.query.tripPhotos.findMany({
        where: eq(schema.tripPhotos.tripId, trip.id),
        orderBy: [asc(schema.tripPhotos.position)],
      })
    : [];
  const cover = photos.find((p) => p.isCover) ?? photos[0] ?? null;
  return toTrip(trip, { photos, cover, photoCount: photos.length, author: toUserSummary(owner), showPhotos: vis.photos });
}

async function requireOwnTrip(userId: string, tripId: string) {
  const trip = await db.query.trips.findFirst({ where: eq(schema.trips.id, tripId) });
  if (!trip || trip.userId !== userId) throw notFound("Trip not found.");
  return trip;
}

/** Verify every photo belongs to the user and is either unattached or on this trip. */
async function claimPhotos(userId: string, photoIds: string[], tripId: string | null) {
  if (!photoIds.length) return;
  if (photoIds.length > MAX_PHOTOS_PER_TRIP) throw new HttpError("VALIDATION", `Up to ${MAX_PHOTOS_PER_TRIP} photos per trip.`);
  const rows = await db.query.tripPhotos.findMany({ where: inArray(schema.tripPhotos.id, photoIds) });
  const ok = rows.length === new Set(photoIds).size && rows.every((p) => p.userId === userId && (p.tripId === null || p.tripId === tripId));
  if (!ok) throw forbidden("One or more photos can't be used.");
}

async function syncPhotos(tripId: string, photoIds: string[]) {
  const existing = await db.query.tripPhotos.findMany({ where: eq(schema.tripPhotos.tripId, tripId) });
  const removed = existing.filter((p) => !photoIds.includes(p.id));
  if (removed.length) {
    await db.delete(schema.tripPhotos).where(inArray(schema.tripPhotos.id, removed.map((p) => p.id)));
    await deletePhotoObjects(removed.map((p) => p.storageKey));
  }
  for (const [i, id] of photoIds.entries()) {
    await db
      .update(schema.tripPhotos)
      .set({ tripId, position: i, isCover: i === 0 })
      .where(eq(schema.tripPhotos.id, id));
  }
}

export async function createTrip(userId: string, input: z.infer<typeof tripSchema>) {
  assertCountry(input.countryCode);
  await claimPhotos(userId, input.photoIds, null);
  const { photoIds, ...fields } = input;
  const [trip] = await db.insert(schema.trips).values({ ...fields, userId }).returning();
  await syncPhotos(trip.id, photoIds);
  await ensureVisited(userId, trip.countryCode);
  await db.insert(schema.activities).values({ userId, type: "TRIP_ADDED", countryCode: trip.countryCode, tripId: trip.id });
  await notifyFollowersOfTrip(userId, trip.id);
  return getTrip(userId, trip.id);
}

export async function updateTrip(userId: string, tripId: string, input: z.infer<typeof tripSchema>) {
  await requireOwnTrip(userId, tripId);
  assertCountry(input.countryCode);
  await claimPhotos(userId, input.photoIds, tripId);
  const { photoIds, ...fields } = input;
  await db.update(schema.trips).set(fields).where(eq(schema.trips.id, tripId));
  await syncPhotos(tripId, photoIds);
  await ensureVisited(userId, input.countryCode);
  return getTrip(userId, tripId);
}

export async function deleteTrip(userId: string, tripId: string) {
  await requireOwnTrip(userId, tripId);
  const photos = await db.query.tripPhotos.findMany({ where: eq(schema.tripPhotos.tripId, tripId) });
  await db.delete(schema.trips).where(eq(schema.trips.id, tripId)); // cascades photos
  await deletePhotoObjects(photos.map((p) => p.storageKey));
}

// ─── Photos ──────────────────────────────────────────────────────────────────

async function deletePhotoObjects(keys: (string | null)[]) {
  const objects = keys.flatMap((k) => (k ? [`${k}/full.webp`, `${k}/thumb.webp`] : []));
  await deleteObjects(objects).catch((e) => console.error("[storage] delete failed", e));
}

/** Upload a photo (not yet attached to a trip). */
export async function uploadPhoto(userId: string, file: Buffer) {
  await cleanupPendingPhotos(userId);
  const img = await processPhoto(file, { full: 2048, thumb: 600 });
  const id = crypto.randomUUID();
  const key = `photos/${userId}/${id}`;
  await Promise.all([
    putObject(`${key}/full.webp`, img.full, "image/webp"),
    putObject(`${key}/thumb.webp`, img.thumb, "image/webp"),
  ]);
  const [row] = await db
    .insert(schema.tripPhotos)
    .values({ id, userId, storageKey: key, width: img.width, height: img.height, bytes: img.bytes })
    .returning();
  return {
    id: row.id,
    src: `/api/photos/${row.id}`,
    thumb: `/api/photos/${row.id}?size=thumb`,
    isCover: false,
    width: row.width,
    height: row.height,
  };
}

/** Delete an uploaded photo that hasn't been saved to a trip yet. */
export async function discardPendingPhoto(userId: string, photoId: string) {
  const p = await db.query.tripPhotos.findFirst({ where: eq(schema.tripPhotos.id, photoId) });
  if (!p || p.userId !== userId || p.tripId !== null) throw notFound("Photo not found.");
  await db.delete(schema.tripPhotos).where(eq(schema.tripPhotos.id, photoId));
  await deletePhotoObjects([p.storageKey]);
}

async function cleanupPendingPhotos(userId: string) {
  const stale = await db.query.tripPhotos.findMany({
    where: and(
      eq(schema.tripPhotos.userId, userId),
      isNull(schema.tripPhotos.tripId),
      lt(schema.tripPhotos.createdAt, new Date(Date.now() - PENDING_TTL_MS)),
    ),
  });
  if (!stale.length) return;
  await db.delete(schema.tripPhotos).where(inArray(schema.tripPhotos.id, stale.map((p) => p.id)));
  await deletePhotoObjects(stale.map((p) => p.storageKey));
}

/** Authorize access to a photo file. Returns its object-storage key. */
export async function authorizePhoto(viewerId: string | null, photoId: string) {
  const p = await db.query.tripPhotos.findFirst({ where: eq(schema.tripPhotos.id, photoId) });
  if (!p?.storageKey) throw notFound("Photo not found.");
  if (p.userId === viewerId) return p.storageKey;
  if (!p.tripId) throw notFound("Photo not found."); // pending uploads are owner-only
  const owner = await db.query.users.findFirst({ where: eq(schema.users.id, p.userId) });
  if (!owner) throw notFound("Photo not found.");
  const { vis } = await getVisibility(owner, viewerId);
  if (!vis.photos) throw notFound("Photo not found.");
  return p.storageKey;
}

export { requireUserByUsername };

/** All photos across a user's trips, newest first (respecting their privacy). */
export async function listUserPhotos(viewerId: string | null, username: string, opts: { cursor?: string; limit: number }) {
  const owner = await requireUserByUsername(username);
  const { vis } = await getVisibility(owner, viewerId);
  if (!vis.photos) return { items: [], nextCursor: null };
  const offset = decodeOffset(opts.cursor);
  const rows = await db
    .select({ p: schema.tripPhotos, t: schema.trips })
    .from(schema.tripPhotos)
    .innerJoin(schema.trips, eq(schema.trips.id, schema.tripPhotos.tripId))
    .where(eq(schema.trips.userId, owner.id))
    .orderBy(...tripOrder, asc(schema.tripPhotos.position))
    .limit(opts.limit + 1)
    .offset(offset);
  return {
    items: rows.slice(0, opts.limit).map(({ p, t }) => ({
      photo: toPhoto(p),
      trip: { id: t.id, title: t.title, countryCode: t.countryCode },
    })),
    nextCursor: rows.length > opts.limit ? encodeOffset(offset + opts.limit) : null,
  };
}
