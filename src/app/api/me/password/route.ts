import { parseBody, route } from "@/server/http/handler";
import { changePassword } from "@/server/services/users";
import { changePasswordSchema } from "@/lib/validation";

export const PATCH = route({ limit: "auth" }, async ({ req, session }) => {
  const { current, next } = await parseBody(req, changePasswordSchema);
  await changePassword(session.user, session.id, current, next);
});
