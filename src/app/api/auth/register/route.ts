import { createSession } from "@/server/auth/session";
import { parseBody, route } from "@/server/http/handler";
import { register } from "@/server/services/auth";
import { toMe } from "@/server/services/users";
import { registerSchema } from "@/lib/validation";

export const POST = route({ auth: false, limit: "auth" }, async ({ req, ip }) => {
  const input = await parseBody(req, registerSchema);
  const user = await register(input); // gender is required by registerSchema
  await createSession(user.id, { userAgent: req.headers.get("user-agent") ?? "", ip });
  return { me: await toMe(user) };
});
