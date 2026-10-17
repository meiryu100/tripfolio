import { createSession } from "@/server/auth/session";
import { parseBody, route } from "@/server/http/handler";
import { verifyEmail } from "@/server/services/auth";
import { toMe } from "@/server/services/users";
import { verifyEmailSchema } from "@/lib/validation";

/** The link from the sign-up email: confirms the address and signs the user in. */
export const POST = route({ auth: false, limit: "auth" }, async ({ req, ip }) => {
  const { token } = await parseBody(req, verifyEmailSchema);
  const user = await verifyEmail(token);
  await createSession(user.id, { userAgent: req.headers.get("user-agent") ?? "", ip });
  return { me: await toMe(user) };
});
