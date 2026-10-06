import { parseQuery, route } from "@/server/http/handler";
import { listNotifications, markAllRead } from "@/server/services/notifications";
import { cursorQuerySchema } from "@/lib/validation";

export const GET = route({}, async ({ req, session }) => {
  const { cursor, limit } = parseQuery(req, cursorQuerySchema);
  return listNotifications(session.user.id, cursor, limit);
});

/** Mark everything read. */
export const POST = route({}, async ({ session }) => {
  await markAllRead(session.user.id);
});
