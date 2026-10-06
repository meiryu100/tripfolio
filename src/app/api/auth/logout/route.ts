import { destroySession } from "@/server/auth/session";
import { route } from "@/server/http/handler";

export const POST = route({ auth: false }, async () => {
  await destroySession();
});
