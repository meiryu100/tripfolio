import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import countryData from "@/data/countries.json";
import { db, schema } from "../db";
import { HttpError } from "../http/errors";
import { toStatus } from "./mappers";
import { getVisibility } from "./privacy";
import { requireUserByUsername } from "./users";
import type { Country, MapData } from "@/lib/types";

export const COUNTRIES = countryData as Country[];
const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string) {
  return byCode.get(code.toUpperCase()) ?? null;
}

export function assertCountry(code: string) {
  const c = getCountry(code);
  if (!c) throw new HttpError("VALIDATION", "Unknown country.", "countryCode");
  return c;
}

/** A user's map as the viewer is allowed to see it. */
export async function getMap(viewerId: string | null, username: string): Promise<MapData> {
  const owner = await requireUserByUsername(username);
  const { vis } = await getVisibility(owner, viewerId);

  const statuses: MapData["statuses"] = {};
  if (vis.visited || vis.wishlist) {
    const rows = await db
      .select({ code: schema.userCountries.countryCode, status: schema.userCountries.status })
      .from(schema.userCountries)
      .where(eq(schema.userCountries.userId, owner.id));
    for (const r of rows) {
      if (r.status === "VISITED" ? vis.visited : vis.wishlist) statuses[r.code] = toStatus(r.status);
    }
  }

  let photoCountries: string[] = [];
  if (vis.photos) {
    const rows = await db
      .selectDistinct({ code: schema.trips.countryCode })
      .from(schema.trips)
      .innerJoin(schema.tripPhotos, eq(schema.tripPhotos.tripId, schema.trips.id))
      .where(eq(schema.trips.userId, owner.id));
    photoCountries = rows.map((r) => r.code);
  }

  return { statuses, photoCountries, visibility: vis };
}

async function logActivity(userId: string, type: "COUNTRY_VISITED" | "COUNTRY_WISHLISTED", countryCode: string) {
  await db.insert(schema.activities).values({ userId, type, countryCode });
}

/** Mark a country. Marking it visited removes it from the wishlist automatically. */
export async function setStatus(userId: string, code: string, status: "VISITED" | "WANT_TO_VISIT") {
  assertCountry(code);
  if (status === "WANT_TO_VISIT") {
    const hasTrips = await db.query.trips.findFirst({
      columns: { id: true },
      where: and(eq(schema.trips.userId, userId), eq(schema.trips.countryCode, code)),
    });
    if (hasTrips) throw new HttpError("CONFLICT", "You have trips here — delete them first to move it to your wishlist.");
    const visitedRegion = await db.query.userRegions.findFirst({
      columns: { id: true },
      where: and(
        eq(schema.userRegions.userId, userId),
        eq(schema.userRegions.countryCode, code),
        eq(schema.userRegions.status, "VISITED"),
      ),
    });
    if (visitedRegion) throw new HttpError("CONFLICT", "You've visited states here — clear them on the USA map first.");
  }
  const prev = await db.query.userCountries.findFirst({
    where: and(eq(schema.userCountries.userId, userId), eq(schema.userCountries.countryCode, code)),
  });
  await db
    .insert(schema.userCountries)
    .values({ userId, countryCode: code, status })
    .onConflictDoUpdate({
      target: [schema.userCountries.userId, schema.userCountries.countryCode],
      set: { status, updatedAt: new Date() },
    });
  if (prev?.status !== status) await logActivity(userId, status === "VISITED" ? "COUNTRY_VISITED" : "COUNTRY_WISHLISTED", code);
}

/** A country stays visited while it has at least one trip. */
export async function removeStatus(userId: string, code: string) {
  assertCountry(code);
  const hasTrips = await db.query.trips.findFirst({
    columns: { id: true },
    where: and(eq(schema.trips.userId, userId), eq(schema.trips.countryCode, code)),
  });
  if (hasTrips) throw new HttpError("CONFLICT", "You have trips here — delete them first to unmark this country.");
  await db
    .delete(schema.userCountries)
    .where(and(eq(schema.userCountries.userId, userId), eq(schema.userCountries.countryCode, code)));
  // Its states/regions go with it.
  await db.delete(schema.userRegions).where(and(eq(schema.userRegions.userId, userId), eq(schema.userRegions.countryCode, code)));
}

/** Onboarding: set many countries at once (never downgrades visited → wishlist). */
export async function setStatuses(userId: string, codes: string[], status: "VISITED" | "WANT_TO_VISIT") {
  const valid = [...new Set(codes.map((c) => c.toUpperCase()))].filter((c) => byCode.has(c));
  if (!valid.length) return;
  if (status === "WANT_TO_VISIT") {
    const visited = await db
      .select({ code: schema.userCountries.countryCode })
      .from(schema.userCountries)
      .where(
        and(
          eq(schema.userCountries.userId, userId),
          eq(schema.userCountries.status, "VISITED"),
          inArray(schema.userCountries.countryCode, valid),
        ),
      );
    const skip = new Set(visited.map((v) => v.code));
    codes = valid.filter((c) => !skip.has(c));
  } else codes = valid;
  if (!codes.length) return;
  await db
    .insert(schema.userCountries)
    .values(codes.map((countryCode) => ({ userId, countryCode, status })))
    .onConflictDoUpdate({
      target: [schema.userCountries.userId, schema.userCountries.countryCode],
      set: { status: sql`excluded.status`, updatedAt: new Date() },
    });
}

/** Ensure a country is marked visited (used when a trip is saved). */
export async function ensureVisited(userId: string, code: string) {
  const prev = await db.query.userCountries.findFirst({
    where: and(eq(schema.userCountries.userId, userId), eq(schema.userCountries.countryCode, code)),
  });
  if (prev?.status === "VISITED") return;
  await db
    .insert(schema.userCountries)
    .values({ userId, countryCode: code, status: "VISITED" })
    .onConflictDoUpdate({
      target: [schema.userCountries.userId, schema.userCountries.countryCode],
      set: { status: "VISITED", updatedAt: new Date() },
    });
}

