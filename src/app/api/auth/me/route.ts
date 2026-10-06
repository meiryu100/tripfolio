import { route } from "@/server/http/handler";
import { toMe } from "@/server/services/users";

/** The signed-in user, or null. */
export const GET = route({ auth: false }, async ({ session }) => ({ me: session ? await toMe(session.user) : null }));
