import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * Numbers for the admin stats page. "Real" users are is_test_user = false, the same
 * definition the analytics agent uses (~/tripfolio-agents/scripts/metrics.ts), so the
 * page and the daily report agree. The owner's own account counts as a real user.
 */
const REAL = sql`(select id from users where not is_test_user)`;

async function one<T>(query: ReturnType<typeof sql>) {
  const { rows } = await db.execute<Record<keyof T, string | number | null>>(query);
  return Object.fromEntries(Object.entries(rows[0] ?? {}).map(([k, v]) => [k, Number(v ?? 0)])) as T;
}

export interface AdminStats {
  users: {
    real: number;
    verified: number;
    onboarded: number;
    test: number;
    new24h: number;
    new7d: number;
    new30d: number;
    invited: number;
    private: number;
  };
  active: { dau: number; wau: number; mau: number };
  content: {
    trips: number;
    trips7d: number;
    photos: number;
    photos7d: number;
    visited: number;
    wishlisted: number;
    follows: number;
    pendingFollows: number;
    messages: number;
    storageBytes: number;
  };
  funnel30d: { signedUp: number; onboarded: number; markedCountry: number; addedTrip: number; followed: number };
  signupsByDay: { day: string; signups: number }[];
  sources30d: { source: string; signups: number }[];
  topVisited: { name: string; code: string; users: number }[];
  topWishlisted: { name: string; code: string; users: number }[];
  /** Every UTM combination real users signed up with (first touch, src/lib/attribution.ts). */
  utm: { source: string; medium: string; campaign: string; referrer: string; total: number; last30d: number }[];
  recentSignups: {
    username: string;
    name: string;
    createdAt: string;
    source: string;
    medium: string | null;
    campaign: string | null;
    verified: boolean;
  }[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const [users, active, content, funnel30d, byDay, sources, utm, topVisited, topWishlisted, recent] = await Promise.all([
    one<AdminStats["users"]>(sql`
      select
        count(*) filter (where not is_test_user)                                                as real,
        count(*) filter (where not is_test_user and email_verified_at is not null)              as verified,
        count(*) filter (where not is_test_user and onboarded)                                  as onboarded,
        count(*) filter (where is_test_user)                                                    as test,
        count(*) filter (where not is_test_user and created_at > now() - interval '24 hours')   as "new24h",
        count(*) filter (where not is_test_user and created_at > now() - interval '7 days')     as "new7d",
        count(*) filter (where not is_test_user and created_at > now() - interval '30 days')    as "new30d",
        count(*) filter (where not is_test_user and invited_by is not null)                     as invited,
        count(*) filter (where not is_test_user and is_private)                                 as private
      from users`),
    one<AdminStats["active"]>(sql`
      select
        count(distinct user_id) filter (where last_seen_at > now() - interval '24 hours') as dau,
        count(distinct user_id) filter (where last_seen_at > now() - interval '7 days')   as wau,
        count(distinct user_id) filter (where last_seen_at > now() - interval '30 days')  as mau
      from sessions where user_id in ${REAL}`),
    one<AdminStats["content"]>(sql`
      select
        (select count(*) from trips where user_id in ${REAL})                                                    as trips,
        (select count(*) from trips where user_id in ${REAL} and created_at > now() - interval '7 days')        as "trips7d",
        (select count(*) from trip_photos where user_id in ${REAL})                                              as photos,
        (select count(*) from trip_photos where user_id in ${REAL} and created_at > now() - interval '7 days')  as "photos7d",
        (select count(*) from user_countries where user_id in ${REAL} and status = 'VISITED')                   as visited,
        (select count(*) from user_countries where user_id in ${REAL} and status = 'WANT_TO_VISIT')             as wishlisted,
        (select count(*) from follows where follower_id in ${REAL} and status = 'ACCEPTED')                     as follows,
        (select count(*) from follows where following_id in ${REAL} and status = 'PENDING')                     as "pendingFollows",
        (select count(*) from messages where sender_id in ${REAL})                                               as messages,
        (select coalesce(sum(bytes), 0) from trip_photos where storage_key is not null)                         as "storageBytes"`),
    one<AdminStats["funnel30d"]>(sql`
      with cohort as (select id, onboarded from users where not is_test_user and created_at > now() - interval '30 days')
      select
        count(*)                                                                                       as "signedUp",
        count(*) filter (where onboarded)                                                              as onboarded,
        count(*) filter (where exists (select 1 from user_countries uc where uc.user_id = cohort.id))  as "markedCountry",
        count(*) filter (where exists (select 1 from trips t where t.user_id = cohort.id))             as "addedTrip",
        count(*) filter (where exists (select 1 from follows f where f.follower_id = cohort.id))       as followed
      from cohort`),
    db.execute<{ day: string; signups: number }>(sql`
      select to_char(d, 'YYYY-MM-DD') as day,
             (select count(*)::int from users where not is_test_user and created_at::date = d::date) as signups
      from generate_series(current_date - 29, current_date, interval '1 day') d
      order by d`),
    db.execute<{ source: string; signups: number }>(sql`
      select coalesce(signup_source, case when invited_by is not null then 'invite' end, signup_referrer, 'direct') as source,
             count(*)::int as signups
      from users where not is_test_user and created_at > now() - interval '30 days'
      group by 1 order by signups desc, source`),
    db.execute<AdminStats["utm"][number]>(sql`
      select coalesce(signup_source, '') as source, coalesce(signup_medium, '') as medium,
             coalesce(signup_campaign, '') as campaign, coalesce(signup_referrer, '') as referrer,
             count(*)::int as total,
             (count(*) filter (where created_at > now() - interval '30 days'))::int as "last30d"
      from users
      where not is_test_user and (signup_source is not null or signup_medium is not null
                                  or signup_campaign is not null or signup_referrer is not null)
      group by 1, 2, 3, 4 order by total desc, source, medium, campaign`),
    topCountries("VISITED"),
    topCountries("WANT_TO_VISIT"),
    db.execute<{
      username: string;
      name: string;
      created_at: Date;
      source: string;
      medium: string | null;
      campaign: string | null;
      verified: boolean;
    }>(sql`
      select username, first_name || ' ' || last_name as name, created_at, signup_medium as medium, signup_campaign as campaign,
             coalesce(signup_source, case when invited_by is not null then 'invite' end, signup_referrer, 'direct') as source,
             email_verified_at is not null as verified
      from users where not is_test_user
      order by created_at desc limit 100`),
  ]);

  return {
    users,
    active,
    content,
    funnel30d,
    signupsByDay: byDay.rows,
    sources30d: sources.rows,
    utm: utm.rows,
    topVisited,
    topWishlisted,
    recentSignups: recent.rows.map((r) => ({
      username: r.username,
      name: r.name,
      createdAt: new Date(r.created_at).toISOString(),
      source: r.source,
      medium: r.medium,
      campaign: r.campaign,
      verified: r.verified,
    })),
  };
}

async function topCountries(status: "VISITED" | "WANT_TO_VISIT") {
  const { rows } = await db.execute<{ name: string; code: string; users: number }>(sql`
    select c.name, c.iso_code as code, count(*)::int as users
    from user_countries uc join countries c on c.iso_code = uc.country_code
    where uc.status = ${status} and uc.user_id in ${REAL}
    group by c.name, c.iso_code order by users desc, c.name limit 5`);
  return rows;
}
