import { parseBody, route } from "@/server/http/handler";
import { changeEmail } from "@/server/services/users";
import { changeEmailSchema } from "@/lib/validation";

export const PATCH = route({ limit: "auth" }, async ({ req, session }) => {
  const { email, password } = await parseBody(req, changeEmailSchema);
  await changeEmail(session.user, email, password);
});
