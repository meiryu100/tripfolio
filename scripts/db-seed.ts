/**
 * Loads reference data (countries) and, unless --countries-only is passed,
 * a demo community for local development. Safe to run repeatedly.
 */
import { eq, sql } from "drizzle-orm";
import countryData from "../src/data/countries.json";
import { generatePublicId, hashPassword } from "../src/server/auth/password";
import { db, pool, schema } from "../src/server/db";
import { DEMO_EMAIL, SEED_FOLLOWS, SEED_PASSWORD, SEED_USERS } from "../src/server/db/seed-data";

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

async function main() {
  await seedCountries();
  if (!process.argv.includes("--countries-only")) await seedDemo();
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
