import { parseBody, route } from "@/server/http/handler";
import { register } from "@/server/services/auth";
import { registerSchema } from "@/lib/validation";

/** Always 204: we email a link to confirm the address (or tell an existing owner), nobody is signed in yet. */
export const POST = route({ auth: false, limit: "auth" }, async ({ req }) => {
  await register(await parseBody(req, registerSchema));
});
