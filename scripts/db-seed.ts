/**
 * Loads reference data (countries) and, unless --countries-only is passed,
 * a demo community for local development. Safe to run repeatedly.
 */
import { eq, sql } from "drizzle-orm";
import countryData from "../src/data/countries.json";
import { generatePublicId, hashPassword } from "../src/server/auth/password";
import { db, pool, schema } from "../src/server/db";
import {
  COMMUNITY_TRAVELERS,
  DEMO_EMAIL,
  PHOTO_TRAVELER,
  SEED_FOLLOWS,
  SEED_PASSWORD,
  SEED_USERS,
  type PhotoTraveler,
} from "../src/server/db/seed-data";
import { putObject } from "../src/server/storage";
import { processPhoto } from "../src/server/storage/images";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function seedCountries() {
  const rows = countryData.map((c) => ({
    isoCode: c.code,
    name: c.name,
    capital: c.capital,
    continent: c.continent,
    subregion: c.subregion,
    flag: c.flag,
    isSovereign: c.sovereign,
  }));
  await db
    .insert(schema.countries)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.countries.isoCode,
      set: {
        name: sql`excluded.name`,
        capital: sql`excluded.capital`,
        continent: sql`excluded.continent`,
        subregion: sql`excluded.subregion`,
        flag: sql`excluded.flag`,
        isSovereign: sql`excluded.is_sovereign`,
      },
    });
  console.log(`✓ ${rows.length} countries`);
}

async function seedDemo() {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, DEMO_EMAIL) });
  if (existing) {
    console.log("• Demo community already present — skipping");
    return;
  }

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const ids = new Map<string, string>();

  for (const [i, s] of SEED_USERS.entries()) {
    const [user] = await db
      .insert(schema.users)
      .values({
        publicId: generatePublicId(),
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        username: s.username,
        email: s.id === "u_demo" ? DEMO_EMAIL : `${s.username.replace(/\W/g, "")}@example.com`,
        passwordHash,
        bio: s.bio,
        location: s.location,
        isPrivate: Boolean(s.isPrivate),
        onboarded: true,
        createdAt: daysAgo(400 - i * 20),
      })
      .returning({ id: schema.users.id });
    ids.set(s.id, user.id);

    const visited = new Set(s.visited);
    const statuses = [
      ...s.visited.map((c) => ({ countryCode: c, status: "VISITED" as const })),
      ...s.wishlist.filter((c) => !visited.has(c)).map((c) => ({ countryCode: c, status: "WANT_TO_VISIT" as const })),
    ];
    if (statuses.length) {
      await db.insert(schema.userCountries).values(statuses.map((st) => ({ ...st, userId: user.id })));
    }

    for (const [j, t] of s.trips.entries()) {
      const created = new Date(t.endDate ?? t.startDate ?? Date.now());
      const [trip] = await db
        .insert(schema.trips)
        .values({
          userId: user.id,
          countryCode: t.country,
          title: t.title,
          description: t.notes ?? "",
          cities: t.cities ?? [],
          startDate: t.startDate,
          endDate: t.endDate,
          createdAt: created,
          updatedAt: created,
        })
        .returning({ id: schema.trips.id });
      if (t.photoIds.length) {
        await db.insert(schema.tripPhotos).values(
          t.photoIds.map((ref, k) => ({
            userId: user.id,
            tripId: trip.id,
            seedRef: ref,
            isCover: k === 0,
            position: k,
          })),
        );
      }
      // Recent activity for the feed: the newest trips look like they were just added.
      await db.insert(schema.activities).values({
        userId: user.id,
        type: "TRIP_ADDED",
        countryCode: t.country,
        tripId: trip.id,
        createdAt: new Date(Date.now() - (i * 5 + j * 2 + 1) * 3_600_000),
      });
    }

    // A couple of map updates per person, so the feed has variety.
    const extras = [
      s.visited[0] && { type: "COUNTRY_VISITED" as const, countryCode: s.visited[0] },
      s.wishlist[0] && { type: "COUNTRY_WISHLISTED" as const, countryCode: s.wishlist[0] },
    ].filter(Boolean) as { type: "COUNTRY_VISITED" | "COUNTRY_WISHLISTED"; countryCode: string }[];
    if (extras.length) {
      await db.insert(schema.activities).values(
        extras.map((e, k) => ({ ...e, userId: user.id, createdAt: new Date(Date.now() - (i * 7 + k * 3 + 2) * 3_600_000) })),
      );
    }
  }

  await db.insert(schema.follows).values(
    SEED_FOLLOWS.map(([follower, following, d]) => ({
      followerId: ids.get(follower)!,
      followingId: ids.get(following)!,
      status: "ACCEPTED" as const,
      createdAt: daysAgo(d),
    })),
  );
  await db.insert(schema.notifications).values(
    SEED_FOLLOWS.map(([follower, following, d]) => ({
      userId: ids.get(following)!,
      actorUserId: ids.get(follower)!,
      type: "FOLLOW" as const,
      read: true,
      createdAt: daysAgo(d),
    })),
  );

  console.log(`✓ ${SEED_USERS.length} demo users (sign in as ${DEMO_EMAIL} / ${SEED_PASSWORD})`);
}

const COMMONS_UA = { "User-Agent": "TripfolioSeed/1.0 (local development)" };

/** Download a Commons image (1600px rendition), process it like a real upload, store it. */
async function importCommonsPhoto(userId: string, file: string) {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1600`;
  const res = await fetch(url, { headers: COMMONS_UA, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const img = await processPhoto(Buffer.from(await res.arrayBuffer()), { full: 2048, thumb: 600 });
  const id = crypto.randomUUID();
  const key = `photos/${userId}/${id}`;
  await putObject(`${key}/full.webp`, img.full, "image/webp");
  await putObject(`${key}/thumb.webp`, img.thumb, "image/webp");
  return { id, storageKey: key, width: img.width, height: img.height, bytes: img.bytes };
}

/** Create one photo traveler with trips and real photos. Returns the new user id, or null if they exist. */
async function seedPhotoTraveler(t: PhotoTraveler) {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, t.email) });
  if (existing) {
    console.log(`• @${t.username} already present — skipping`);
    return null;
  }

  const [user] = await db
    .insert(schema.users)
    .values({
      publicId: generatePublicId(),
      firstName: t.firstName,
      lastName: t.lastName,
      gender: t.gender,
      username: t.username,
      email: t.email,
      passwordHash: await hashPassword(SEED_PASSWORD),
      bio: t.bio,
      location: t.location,
      onboarded: true,
      // Joined about six weeks before their first trip, so profiles read naturally.
      createdAt: new Date(Math.min(...t.trips.map((trip) => new Date(trip.startDate).getTime())) - 45 * 86_400_000),
    })
    .returning({ id: schema.users.id });

  let photoCount = 0;
  for (const trip of t.trips) {
    // Trips look like they were posted a couple of days after getting home.
    const postedAt = new Date(new Date(trip.endDate).getTime() + 2 * 86_400_000);
    const credit = "\n\n📷 Photos via Wikimedia Commons: " + trip.photos.map((p) => `${p.artist} (${p.license})`).join(", ");
    const [row] = await db
      .insert(schema.trips)
      .values({
        userId: user.id,
        countryCode: trip.country,
        title: trip.title,
        description: trip.notes + credit,
        cities: trip.cities,
        startDate: trip.startDate,
        endDate: trip.endDate,
        createdAt: postedAt,
        updatedAt: postedAt,
      })
      .returning({ id: schema.trips.id });

    let position = 0;
    for (const photo of trip.photos) {
      try {
        const stored = await importCommonsPhoto(user.id, photo.file);
        await db.insert(schema.tripPhotos).values({ ...stored, userId: user.id, tripId: row.id, isCover: position === 0, position });
        position++;
        photoCount++;
      } catch (err) {
        console.warn(`  ! skipped photo "${photo.file}": ${(err as Error).message}`);
      }
    }
    await db.insert(schema.activities).values({ userId: user.id, type: "TRIP_ADDED", countryCode: trip.country, tripId: row.id, createdAt: postedAt });
  }

  const visited = new Set(t.trips.map((trip) => trip.country));
  const statuses = [
    ...[...visited].map((c) => ({ countryCode: c, status: "VISITED" as const })),
    ...t.wishlist.filter((c) => !visited.has(c)).map((c) => ({ countryCode: c, status: "WANT_TO_VISIT" as const })),
  ];
  await db.insert(schema.userCountries).values(statuses.map((s) => ({ ...s, userId: user.id })));

  console.log(`✓ @${t.username}: ${t.trips.length} trips, ${photoCount} photos from Wikimedia Commons`);
  return user.id;
}

/** Follows run after everyone exists, so travelers can follow each other (looked up by username). */
async function seedTravelerFollows(created: Map<string, PhotoTraveler>) {
  let count = 0;
  for (const [userId, t] of created) {
    for (const username of t.follows) {
      const target = await db.query.users.findFirst({ where: eq(schema.users.username, username) });
      if (!target || target.id === userId) continue;
      const createdAt = new Date(Date.now() - Math.floor(Math.random() * 30 * 86_400_000));
      const inserted = await db
        .insert(schema.follows)
        .values({ followerId: userId, followingId: target.id, status: "ACCEPTED", createdAt })
        .onConflictDoNothing()
        .returning();
      if (!inserted.length) continue;
      // Only the last few days' follows show up as unread.
      await db.insert(schema.notifications).values({
        userId: target.id,
        actorUserId: userId,
        type: "FOLLOW",
        createdAt,
        read: Date.now() - createdAt.getTime() > 3 * 86_400_000,
      });
      count++;
    }
  }
  if (count) console.log(`✓ ${count} follows between travelers`);
}

async function main() {
  await seedCountries();
  if (!process.argv.includes("--countries-only")) {
    await seedDemo();
    const created = new Map<string, PhotoTraveler>();
    for (const t of [PHOTO_TRAVELER, ...COMMUNITY_TRAVELERS]) {
      const id = await seedPhotoTraveler(t);
      if (id) created.set(id, t);
    }
    await seedTravelerFollows(created);
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
