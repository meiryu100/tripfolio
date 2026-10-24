/**
 * Removes the N demo travelers with the most visited countries (default 20), with everything they own:
 * trips, photos, avatars, map marks, follows, chats, notifications (all cascade from `users`), and their
 * stored files in R2. Real users are never selected and keep their own data.
 *
 * Only accounts that are ALL of these can be picked: `is_test_user = true`, role `user`, email ending in
 * `@example.com` (how every seeded demo traveler was created).
 *
 * Dry run by default: prints the accounts, what goes with them, and what real users would notice.
 *   npx tsx --conditions=react-server --env-file=.env.production.local scripts/remove-demo-travelers.ts
 * Delete (one transaction, then the files):
 *   npx tsx --conditions=react-server --env-file=.env.production.local scripts/remove-demo-travelers.ts --execute
 * Options: --count=20
 */
import { inArray, sql } from "drizzle-orm";
import { db, pool, schema } from "../src/server/db";
import { messagePhotoObjects } from "../src/server/services/messages";
import { avatarObjectKey } from "../src/server/services/users";
import { deleteObjects } from "../src/server/storage";

const execute = process.argv.includes("--execute");
const count = Number(process.argv.find((a) => a.startsWith("--count="))?.split("=")[1] ?? 20);

type Row = Record<string, unknown>;
const rows = async <T extends Row>(query: ReturnType<typeof sql>) => (await db.execute(query)).rows as T[];

async function main() {
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error("--count must be 1–100");

  const picked = await rows<{ id: string; username: string; email: string; avatar_key: string | null; visited: number }>(sql`
    select u.id, u.username, u.email, u.avatar_key,
           (select count(*)::int from user_countries c
             join countries k on k.iso_code = c.country_code
             where c.user_id = u.id and c.status = 'VISITED' and k.is_sovereign) as visited
    from users u
    where u.is_test_user and u.role = 'user' and lower(u.email) like '%@example.com'
    order by visited desc, u.created_at asc
    limit ${count}`);
  if (!picked.length) return console.log("No demo travelers match. Nothing to do.");
  const ids = picked.map((u) => u.id);
  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `);

  // Belt and braces: every picked row must still be a test user right before we delete.
  const notDemo = await rows<{ username: string }>(sql`select username from users where id in (${idList}) and not is_test_user`);
  if (notDemo.length) throw new Error(`Refusing: not demo accounts: ${notDemo.map((u) => u.username).join(", ")}`);

  const [own] = await rows<{ trips: number; photos: number; marks: number; regions: number }>(sql`
    select (select count(*)::int from trips where user_id in (${idList})) as trips,
           (select count(*)::int from trip_photos where user_id in (${idList})) as photos,
           (select count(*)::int from user_countries where user_id in (${idList})) as marks,
           (select count(*)::int from user_regions where user_id in (${idList})) as regions`);
  // What real users will notice disappearing.
  const [real] = await rows<{ followers: number; followed: number; chats: number; notifications: number; invited: number }>(sql`
    select (select count(*)::int from follows f join users r on r.id = f.follower_id
             where f.following_id in (${idList}) and not r.is_test_user) as followers,
           (select count(*)::int from follows f join users r on r.id = f.following_id
             where f.follower_id in (${idList}) and not r.is_test_user) as followed,
           (select count(*)::int from conversations c
             join users a on a.id = c.user_low_id join users b on b.id = c.user_high_id
             where (c.user_low_id in (${idList}) and not b.is_test_user) or (c.user_high_id in (${idList}) and not a.is_test_user)) as chats,
           (select count(*)::int from notifications n join users r on r.id = n.user_id
             where n.actor_user_id in (${idList}) and not r.is_test_user) as notifications,
           (select count(*)::int from users where invited_by in (${idList}) and not is_test_user) as invited`);

  const photoKeys = await rows<{ key: string }>(sql`select storage_key as key from trip_photos where user_id in (${idList}) and storage_key is not null`);
  const chatPhotoKeys = await rows<{ key: string }>(sql`
    select m.photo_key as key from messages m join conversations c on c.id = m.conversation_id
    where m.photo_key is not null and (c.user_low_id in (${idList}) or c.user_high_id in (${idList}))`);
  const files = [
    ...photoKeys.flatMap((p) => [`${p.key}/full.webp`, `${p.key}/thumb.webp`]),
    ...chatPhotoKeys.flatMap((p) => messagePhotoObjects(p.key)),
    ...picked.flatMap((u) => (u.avatar_key ? [avatarObjectKey(u.avatar_key)] : [])),
  ];

  console.log(`\n${execute ? "DELETING" : "DRY RUN — would delete"} ${picked.length} demo travelers:`);
  console.table(picked.map((u) => ({ username: u.username, email: u.email, visited: u.visited })));
  console.log(`Their data: ${own.trips} trips, ${own.photos} photos, ${own.marks} country marks, ${own.regions} region marks; ${files.length} files in storage.`);
  console.log(
    `Real users affected: lose ${real.followed} followers and ${real.followers} people they follow (demo side), ` +
      `${real.chats} chats, ${real.notifications} notifications; ${real.invited} real users' "invited by" is cleared. ` +
      "Real users' own trips, photos, maps and accounts are untouched.",
  );
  if (!execute) return console.log("\nNothing was changed. Run again with --execute to delete.");

  await db.transaction(async (tx) => {
    const deleted = await tx.delete(schema.users).where(inArray(schema.users.id, ids)).returning({ id: schema.users.id });
    if (deleted.length !== picked.length) throw new Error(`Expected ${picked.length} deletions, got ${deleted.length}; rolled back`);
  });
  console.log(`✓ Deleted ${picked.length} accounts and everything that cascades from them.`);
  await deleteObjects(files);
  console.log(`✓ Deleted ${files.length} files from storage.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
