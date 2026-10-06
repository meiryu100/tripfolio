import { readUpload } from "@/server/http/upload";
import { route } from "@/server/http/handler";
import { removeAvatar, setAvatar, toMe } from "@/server/services/users";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";

async function freshMe(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  return { me: await toMe(user!) };
}

export const POST = route({ limit: "upload" }, async ({ req, session }) => {
  await setAvatar(session.user, await readUpload(req));
  return freshMe(session.user.id);
});

export const DELETE = route({}, async ({ session }) => {
  await removeAvatar(session.user);
  return freshMe(session.user.id);
});
