import { parseBody, route } from "@/server/http/handler";
import { requestPasswordReset } from "@/server/services/auth";
import { forgotPasswordSchema } from "@/lib/validation";

/** Always 204, whether or not the email exists. */
export const POST = route({ auth: false, limit: "auth" }, async ({ req }) => {
  const { email } = await parseBody(req, forgotPasswordSchema);
  await requestPasswordReset(email);
});
