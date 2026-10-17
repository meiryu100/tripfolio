import { parseBody, route } from "@/server/http/handler";
import { resendVerification } from "@/server/services/auth";
import { resendVerificationSchema } from "@/lib/validation";

/** Always 204, whether or not the email has an unconfirmed account. */
export const POST = route({ auth: false, limit: "auth" }, async ({ req }) => {
  const { email } = await parseBody(req, resendVerificationSchema);
  await resendVerification(email);
});
