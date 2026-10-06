import { parseQuery, route } from "@/server/http/handler";
import { listFollows } from "@/server/services/social";
import { cursorQuerySchema } from "@/lib/validation";

export const GET = route<{ username: string }>({ auth: false }, async ({ req, params, session }) =>
  listFollows(session?.user.id ?? null, params.username, "followers", parseQuery(req, cursorQuerySchema)),
);
