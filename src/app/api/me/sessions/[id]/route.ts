import { listSessions, revokeSession } from "@/server/auth/session";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/handler";

export const DELETE = route<{ id: string }>({}, async ({ params, session }) => {
  const match = (await listSessions(session.user.id)).find((s) => s.id.startsWith(params.id) && params.id.length === 16);
  if (!match) throw notFound("Session not found.");
  await revokeSession(session.user.id, match.id);
});
