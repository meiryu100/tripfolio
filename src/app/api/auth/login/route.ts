import { createSession } from "@/server/auth/session";
import { parseBody, route } from "@/server/http/handler";
import { login } from "@/server/services/auth";
import { toMe } from "@/server/services/users";
import { loginSchema } from "@/lib/validation";

export const POST = route({ auth: false, limit: "auth" }, async ({ req, ip }) => {
  const { email, password } = await parseBody(req, loginSchema);
  const user = await login(email, password);
  await createSession(user.id, { userAgent: req.headers.get("user-agent") ?? "", ip });
  return { me: await toMe(user) };
});
