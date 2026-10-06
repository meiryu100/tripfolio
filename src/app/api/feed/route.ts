import { parseQuery, route } from "@/server/http/handler";
import { getFeed } from "@/server/services/discovery";
import { cursorQuerySchema } from "@/lib/validation";

export const GET = route({}, async ({ req, session }) => {
  const { cursor, limit } = parseQuery(req, cursorQuerySchema);
  return getFeed(session.user.id, cursor, limit);
});
