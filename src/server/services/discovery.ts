import "server-only";
import { and, count, desc, eq, ilike, inArray, isNotNull, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "../db";
import type { UserRow } from "../db/schema";
import { notFound } from "../http/errors";
import { COUNTRIES, getCountry } from "./countries";
import { toPhoto, toStatus, toUserSummary } from "./mappers";
import { decodeCursor, encodeCursor } from "./pagination";
import { followedIds, getRelationships } from "./privacy";
import { hydrateTrips } from "./trips";
import type { Activity, CountryDetail, ExploreData, Page, SearchResults, Traveler, UserSummary } from "@/lib/types";

const u = schema.users;

/**
 * SQL condition: rows owned by users whose `flag` content the viewer may see —
 * themselves, or public profiles / private ones they follow that haven't hidden it.
 */
function visibleOwner(viewerId: string | null, followed: Set<string>, flag: typeof u.showTrips | typeof u.showPhotos) {
  const audience = followed.size ? or(eq(u.isPrivate, false), inArray(u.id, [...followed])) : eq(u.isPrivate, false);
  const others = and(audience, eq(flag, true));
  return viewerId ? or(eq(u.id, viewerId), others) : others;
}

async function travelers(viewerId: string | null, users: UserRow[]): Promise<Traveler[]> {
  if (!users.length) return [];
  const ids = users.map((x) => x.id);
  const [visited, rels] = await Promise.all([
    db
      .select({ userId: schema.userCountries.userId, n: count() })
      .from(schema.userCountries)
      .where(and(inArray(schema.userCountries.userId, ids), eq(schema.userCountries.status, "VISITED")))
      .groupBy(schema.userCountries.userId),
    getRelationships(viewerId, ids),
  ]);
  const vmap = new Map(visited.map((v) => [v.userId, v.n]));
  return users.map((x) => ({
    ...toUserSummary(x),
    // Hide the count when the viewer can't see their map.
    visited: x.showVisited && (!x.isPrivate || rels.get(x.id)?.following || x.id === viewerId) ? (vmap.get(x.id) ?? 0) : 0,
    relationship: rels.get(x.id) ?? { following: false, requested: false, followsYou: false, friends: false },
  }));
}

async function tripsWithAuthors(viewerId: string | null, where: SQL | undefined, limit: number, followed: Set<string>) {
  const rows = await db
    .select({ t: schema.trips, a: u })
    .from(schema.trips)
    .innerJoin(u, eq(u.id, schema.trips.userId))
    .where(and(visibleOwner(viewerId, followed, u.showTrips), where))
    .orderBy(desc(schema.trips.createdAt))
    .limit(limit);
  const authors = new Map(rows.map((r) => [r.a.id, r.a]));
  return hydrateTrips(
    rows.map((r) => r.t),
    { authors, showPhotosFor: (t) => t.userId === viewerId || Boolean(authors.get(t.userId)?.showPhotos) },
  );
}

// ─── Feed ────────────────────────────────────────────────────────────────────

export async function getFeed(viewerId: string, cursor: string | undefined, limit: number): Promise<Page<Activity>> {
  const followed = await followedIds(viewerId);
  if (!followed.size) return { items: [], nextCursor: null };
  const c = decodeCursor(cursor);
  const a = schema.activities;
  const rows = await db
    .select({ a, user: u })
    .from(a)
    .innerJoin(u, eq(u.id, a.userId))
    .where(
      and(
        inArray(a.userId, [...followed]),
        // Respect each person's section visibility.
        or(
          and(eq(a.type, "COUNTRY_VISITED"), eq(u.showVisited, true)),
          and(eq(a.type, "COUNTRY_WISHLISTED"), eq(u.showWishlist, true)),
          and(eq(a.type, "TRIP_ADDED"), eq(u.showTrips, true), isNotNull(a.tripId)),
        ),
        c ? or(lt(a.createdAt, c.at), and(eq(a.createdAt, c.at), lt(a.id, c.id))) : undefined,
      ),
    )
    .orderBy(desc(a.createdAt), desc(a.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const tripIds = page.flatMap((r) => (r.a.tripId ? [r.a.tripId] : []));
  const tripRows = tripIds.length ? await db.select().from(schema.trips).where(inArray(schema.trips.id, tripIds)) : [];
  const authors = new Map(page.map((r) => [r.user.id, r.user]));
  const trips = new Map(
    (await hydrateTrips(tripRows, { showPhotosFor: (t) => Boolean(authors.get(t.userId)?.showPhotos) })).map((t) => [t.id, t]),
  );
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({
      id: r.a.id,
      type: r.a.type,
      user: toUserSummary(r.user),
      countryCode: r.a.countryCode,
      trip: r.a.tripId ? (trips.get(r.a.tripId) ?? null) : null,
      createdAt: r.a.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.a.createdAt, last.a.id) : null,
  };
}

// ─── Explore ─────────────────────────────────────────────────────────────────

export async function getExplore(viewerId: string | null): Promise<ExploreData> {
  const followed = await followedIds(viewerId);
  const uc = schema.userCountries;

  const [statusCounts, topRows, suggestionRows, journeys, photoRows] = await Promise.all([
    db
      .select({ code: uc.countryCode, status: uc.status, n: count() })
      .from(uc)
      .innerJoin(u, eq(u.id, uc.userId))
      .where(eq(u.isPrivate, false))
      .groupBy(uc.countryCode, uc.status),
    db
      .select({ user: u, n: count() })
      .from(u)
      .innerJoin(uc, and(eq(uc.userId, u.id), eq(uc.status, "VISITED")))
      .where(and(eq(u.isPrivate, false), eq(u.showVisited, true)))
      .groupBy(u.id)
      .orderBy(desc(count()))
      .limit(8),
    // Suggestions: people you don't follow yet, most-travelled first.
    db
      .select({ user: u, n: count(uc.id) })
      .from(u)
      .leftJoin(uc, and(eq(uc.userId, u.id), eq(uc.status, "VISITED")))
      .where(
        and(
          viewerId ? ne(u.id, viewerId) : undefined,
          followed.size ? sql`${u.id} not in (${sql.join([...followed].map((id) => sql`${id}`), sql`, `)})` : undefined,
        ),
      )
      .groupBy(u.id)
      .orderBy(desc(count(uc.id)))
      .limit(6),
    tripsWithAuthors(viewerId, viewerId ? ne(schema.trips.userId, viewerId) : undefined, 9, followed),
    db
      .select({ p: schema.tripPhotos, t: schema.trips, a: u })
      .from(schema.tripPhotos)
      .innerJoin(schema.trips, eq(schema.trips.id, schema.tripPhotos.tripId))
      .innerJoin(u, eq(u.id, schema.trips.userId))
      .where(
        and(
          visibleOwner(viewerId, followed, u.showPhotos),
          eq(u.showTrips, true),
          viewerId ? ne(u.id, viewerId) : undefined,
        ),
      )
      .orderBy(desc(schema.tripPhotos.createdAt))
      .limit(12),
  ]);

  const tally = new Map<string, { visited: number; wishlist: number }>();
  for (const r of statusCounts) {
    const t = tally.get(r.code) ?? { visited: 0, wishlist: 0 };
    t[toStatus(r.status)] += r.n;
    tally.set(r.code, t);
  }
  const trending = [...tally.entries()]
    .map(([code, t]) => ({ code, ...t }))
    .sort((a, b) => b.visited + b.wishlist - (a.visited + a.wishlist) || a.code.localeCompare(b.code))
    .slice(0, 8);
  const wishlisted = [...tally.entries()]
    .filter(([, t]) => t.wishlist > 0)
    .map(([code, t]) => ({ code, count: t.wishlist }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
    .slice(0, 8);

  const photoTrips = await hydrateTrips(
    [...new Map(photoRows.map((r) => [r.t.id, r.t])).values()],
    { authors: new Map(photoRows.map((r) => [r.a.id, r.a])) },
  );
  const tripMap = new Map(photoTrips.map((t) => [t.id, t]));

  return {
    trending,
    wishlisted,
    topTravelers: await travelers(viewerId, topRows.map((r) => r.user)),
    suggestions: await travelers(viewerId, suggestionRows.map((r) => r.user)),
    journeys,
    photos: photoRows.map((r) => ({ photo: toPhoto(r.p), trip: tripMap.get(r.t.id)! })),
  };
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function search(viewerId: string | null, q: string): Promise<SearchResults> {
  const query = q.trim().replace(/^@/, "");
  const like = `%${query.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
  const lower = query.toLowerCase();

  const countries = COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(lower) || c.capital.toLowerCase().includes(lower) || c.code.toLowerCase() === lower,
  )
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(lower)) - Number(!b.name.toLowerCase().startsWith(lower)))
    .slice(0, 6);
  const countryCodes = countries.map((c) => c.code);

  const followed = await followedIds(viewerId);
  const [userRows, trips] = await Promise.all([
    db
      .select()
      .from(u)
      .where(
        or(
          ilike(u.username, like),
          ilike(u.firstName, like),
          ilike(u.lastName, like),
          ilike(sql`${u.firstName} || ' ' || ${u.lastName}`, like),
        ),
      )
      .limit(8),
    tripsWithAuthors(
      viewerId,
      or(
        ilike(schema.trips.title, like),
        sql`exists (select 1 from unnest(${schema.trips.cities}) c where c ilike ${like})`,
        countryCodes.length ? inArray(schema.trips.countryCode, countryCodes) : undefined,
      ),
      8,
      followed,
    ),
  ]);
  return { users: await travelers(viewerId, userRows), countries, trips };
}

// ─── Country page ────────────────────────────────────────────────────────────

export async function getCountryDetail(viewerId: string | null, code: string): Promise<CountryDetail> {
  const country = getCountry(code);
  if (!country) throw notFound("Country not found.");
  const uc = schema.userCountries;
  const followed = await followedIds(viewerId);

  const [mine, myTripRows, peopleRows, totals, journeys] = await Promise.all([
    viewerId
      ? db.query.userCountries.findFirst({ where: and(eq(uc.userId, viewerId), eq(uc.countryCode, country.code)) })
      : null,
    viewerId
      ? db
          .select()
          .from(schema.trips)
          .where(and(eq(schema.trips.userId, viewerId), eq(schema.trips.countryCode, country.code)))
          .orderBy(desc(schema.trips.startDate))
      : [],
    followed.size
      ? db
          .select({ user: u, status: uc.status })
          .from(uc)
          .innerJoin(u, eq(u.id, uc.userId))
          .where(and(eq(uc.countryCode, country.code), inArray(uc.userId, [...followed])))
      : [],
    db
      .select({ status: uc.status, n: count() })
      .from(uc)
      .where(eq(uc.countryCode, country.code))
      .groupBy(uc.status),
    tripsWithAuthors(
      viewerId,
      and(eq(schema.trips.countryCode, country.code), viewerId ? ne(schema.trips.userId, viewerId) : undefined),
      9,
      followed,
    ),
  ]);

  const people = { visited: [] as UserSummary[], wishlist: [] as UserSummary[] };
  for (const r of peopleRows) {
    if (r.status === "VISITED" && r.user.showVisited) people.visited.push(toUserSummary(r.user));
    if (r.status === "WANT_TO_VISIT" && r.user.showWishlist) people.wishlist.push(toUserSummary(r.user));
  }
  const t = Object.fromEntries(totals.map((r) => [r.status, r.n]));

  return {
    country,
    myStatus: mine ? toStatus(mine.status) : null,
    myTrips: await hydrateTrips(myTripRows),
    following: people,
    travelers: { visited: t.VISITED ?? 0, wishlist: t.WANT_TO_VISIT ?? 0 },
    journeys,
  };
}
