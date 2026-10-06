import { destroySession } from "@/server/auth/session";
import { parseBody, route } from "@/server/http/handler";
import { deleteAccount, toMe, updateProfile } from "@/server/services/users";
import { deleteAccountSchema, profileSchema } from "@/lib/validation";

export const PATCH = route({}, async ({ req, session }) => {
  const input = await parseBody(req, profileSchema);
  return { me: await toMe(await updateProfile(session.user.id, input)) };
});

export const DELETE = route({ limit: "auth" }, async ({ req, session }) => {
  const { password, confirm } = await parseBody(req, deleteAccountSchema);
  await deleteAccount(session.user, password, confirm);
  await destroySession();
});
