import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";
import { HttpError } from "../http/errors";
import { ensureVisited } from "./countries";
import { toStatus } from "./mappers";
import { getVisibility } from "./privacy";
import { requireUserByUsername } from "./users";
import { getRegion, isRegionOf, REGION_COUNTRIES } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";

function assertRegionCountry(country: string) {
  const c = country.toUpperCase();
  if (!(c in REGION_COUNTRIES)) throw new HttpError("VALIDATION", "That country doesn't have a regions map yet.", "country");
  return c;
}

/** A user's regions in one country, as the viewer is allowed to see them. */
export async function getRegions(viewerId: string | null, username: string, country: string) {
  const c = assertRegionCountry(country);
  const owner = await requireUserByUsername(username);
  const { vis } = await getVisibility(owner, viewerId);
  const statuses: Record<string, CountryStatus> = {};
  if (vis.visited || vis.wishlist) {
    const rows = await db
      .select({ code: schema.userRegions.regionCode, status: schema.userRegions.status })
      .from(schema.userRegions)
      .where(and(eq(schema.userRegions.userId, owner.id), eq(schema.userRegions.countryCode, c)));
    for (const r of rows) if (r.status === "VISITED" ? vis.visited : vis.wishlist) statuses[r.code] = toStatus(r.status);
  }
  return { country: c, statuses };
}

/**
 * Mark a region. Visiting a region marks its country visited on the world map;
 * wishing for a region puts the country on the wishlist if it isn't on the map yet.
 */
export async function setRegionStatus(userId: string, regionCode: string, status: "VISITED" | "WANT_TO_VISIT") {
  const region = getRegion(regionCode);
  const country = regionCode.slice(0, 2).toUpperCase();
  if (!region || !isRegionOf(country, regionCode)) throw new HttpError("VALIDATION", "Unknown region.", "regionCode");
  assertRegionCountry(country);

  await db
    .insert(schema.userRegions)
    .values({ userId, countryCode: country, regionCode: region.code, status })
    .onConflictDoUpdate({
      target: [schema.userRegions.userId, schema.userRegions.regionCode],
      set: { status, updatedAt: new Date() },
    });

  if (status === "VISITED") {
    await ensureVisited(userId, country);
  } else {
    await db
      .insert(schema.userCountries)
      .values({ userId, countryCode: country, status: "WANT_TO_VISIT" })
      .onConflictDoNothing();
  }
}

export async function removeRegionStatus(userId: string, regionCode: string) {
  if (!getRegion(regionCode)) throw new HttpError("VALIDATION", "Unknown region.", "regionCode");
  await db
    .delete(schema.userRegions)
    .where(and(eq(schema.userRegions.userId, userId), eq(schema.userRegions.regionCode, regionCode.toUpperCase())));
}
