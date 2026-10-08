import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─── Users & auth ────────────────────────────────────────────────────────────

export const themeEnum = pgEnum("theme", ["light", "dark", "system"]);
export const genderEnum = pgEnum("gender", ["male", "female"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Immutable, human-friendly account ID, e.g. TW-8F42A91. */
    publicId: text("public_id").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    /** Existing accounts default to male; new sign-ups must choose (enforced by registerSchema). */
    gender: genderEnum("gender").notNull().default("male"),
    username: text("username").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"), // null for Google-only accounts
    googleId: text("google_id").unique(),
    avatarKey: text("avatar_key"),
    bio: text("bio").notNull().default(""),
    location: text("location").notNull().default(""),
    website: text("website").notNull().default(""),
    onboarded: boolean("onboarded").notNull().default(false),
    // Privacy
    isPrivate: boolean("is_private").notNull().default(false),
    showVisited: boolean("show_visited").notNull().default(true),
    showWishlist: boolean("show_wishlist").notNull().default(true),
    showTrips: boolean("show_trips").notNull().default(true),
    showPhotos: boolean("show_photos").notNull().default(true),
    // Notifications & appearance
    notifyFollows: boolean("notify_follows").notNull().default(true),
    notifyTrips: boolean("notify_trips").notNull().default(true),
    notifyEmail: boolean("notify_email").notNull().default(false),
    theme: themeEnum("theme").notNull().default("system"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_username_lower_idx").on(sql`lower(${t.username})`),
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token; the raw token only lives in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent").notNull().default(""),
    ip: text("ip").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Countries ───────────────────────────────────────────────────────────────

/** Reference data. Geometry lives in the static TopoJSON, joined by ISO code. */
export const countries = pgTable("countries", {
  isoCode: char("iso_code", { length: 2 }).primaryKey(),
  name: text("name").notNull(),
  capital: text("capital").notNull().default(""),
  continent: text("continent").notNull(),
  subregion: text("subregion").notNull().default(""),
  flag: text("flag").notNull(),
  /** Counts toward the "% of the world" denominator (UN members + observers). */
  isSovereign: boolean("is_sovereign").notNull().default(false),
});

export const countryStatusEnum = pgEnum("country_status", ["VISITED", "WANT_TO_VISIT"]);

export const userCountries = pgTable(
  "user_countries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    countryCode: char("country_code", { length: 2 })
      .notNull()
      .references(() => countries.isoCode),
    status: countryStatusEnum("status").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("user_countries_user_country_idx").on(t.userId, t.countryCode)],
);

/**
 * Regions inside a country (ISO 3166-2, e.g. "US-CA"). Same statuses as
 * countries; visiting a region marks its country visited.
 */
export const userRegions = pgTable(
  "user_regions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    countryCode: char("country_code", { length: 2 })
      .notNull()
      .references(() => countries.isoCode),
    regionCode: text("region_code").notNull(),
    status: countryStatusEnum("status").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("user_regions_user_region_idx").on(t.userId, t.regionCode),
    index("user_regions_user_country_idx").on(t.userId, t.countryCode),
  ],
);

// ─── Trips & photos ──────────────────────────────────────────────────────────

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    countryCode: char("country_code", { length: 2 })
      .notNull()
      .references(() => countries.isoCode),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    cities: text("cities").array().notNull().default(sql`'{}'::text[]`),
    startDate: date("start_date"),
    endDate: date("end_date"),
    ...timestamps,
  },
  (t) => [
    index("trips_user_idx").on(t.userId, t.startDate),
    index("trips_country_idx").on(t.countryCode),
  ],
);

export const tripPhotos = pgTable(
  "trip_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Null while uploaded but not yet attached to a saved trip. */
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
    /** Object-storage key prefix; null for seeded illustration photos. */
    storageKey: text("storage_key"),
    /** Seeded illustration reference ("seed:emoji:hue") — demo data only. */
    seedRef: text("seed_ref"),
    width: integer("width"),
    height: integer("height"),
    bytes: integer("bytes"),
    isCover: boolean("is_cover").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("trip_photos_trip_idx").on(t.tripId, t.position)],
);

// ─── Social ──────────────────────────────────────────────────────────────────

export const followStatusEnum = pgEnum("follow_status", ["PENDING", "ACCEPTED"]);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: followStatusEnum("status").notNull().default("ACCEPTED"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_idx").on(t.followingId, t.status),
  ],
);

export const notificationTypeEnum = pgEnum("notification_type", [
  "FOLLOW",
  "FOLLOW_REQUEST",
  "FOLLOW_ACCEPTED",
  "UNFOLLOW",
  "TRIP",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const activityTypeEnum = pgEnum("activity_type", ["COUNTRY_VISITED", "COUNTRY_WISHLISTED", "TRIP_ADDED"]);

/** Append-only log that powers the Travel Feed. */
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    countryCode: char("country_code", { length: 2 })
      .notNull()
      .references(() => countries.isoCode),
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activities_user_idx").on(t.userId, t.createdAt)],
);

export type UserRow = typeof users.$inferSelect;
export type TripRow = typeof trips.$inferSelect;
export type PhotoRow = typeof tripPhotos.$inferSelect;
