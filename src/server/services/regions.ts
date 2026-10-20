import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";
import { HttpError } from "../http/errors";
import { ensureVisited } from "./countries";
import { toStatus } from "./mappers";
import { getVisibility } from "./privacy";
import { requireUserByUsername } from "./users";
import { getRegion, isRegionCountry } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";

function assertRegionCountry(country: string) {
  const c = country.toUpperCase();
  if (!isRegionCountry(c)) throw new HttpError("VALIDATION", "That country doesn't have a regions map yet.", "country");
  return c;
}

/** A user's regions (in one country, or in every country with a regions map), as the viewer is allowed to see them. */
export async function getRegions(viewerId: string | null, username: string, country?: string) {
  const c = country ? assertRegionCountry(country) : null;
  const owner = await requireUserByUsername(username);
  const { vis } = await getVisibility(owner, viewerId);
  const statuses: Record<string, CountryStatus> = {};
  if (vis.visited || vis.wishlist) {
    const rows = await db
      .select({ code: schema.userRegions.regionCode, status: schema.userRegions.status })
      .from(schema.userRegions)
      .where(and(eq(schema.userRegions.userId, owner.id), c ? eq(schema.userRegions.countryCode, c) : undefined));
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
  if (!region) throw new HttpError("VALIDATION", "Unknown region.", "regionCode");
  const country = region.country;

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
