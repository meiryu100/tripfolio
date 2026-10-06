import { createSession } from "@/server/auth/session";
import { parseBody, route } from "@/server/http/handler";
import { resetPassword } from "@/server/services/auth";
import { resetPasswordSchema } from "@/lib/validation";

export const POST = route({ auth: false, limit: "auth" }, async ({ req, ip }) => {
  const { token, password } = await parseBody(req, resetPasswordSchema);
  const userId = await resetPassword(token, password);
  await createSession(userId, { userAgent: req.headers.get("user-agent") ?? "", ip });
});
