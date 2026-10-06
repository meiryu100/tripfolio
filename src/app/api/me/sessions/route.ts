import { listSessions, revokeOtherSessions } from "@/server/auth/session";
import { route } from "@/server/http/handler";
import type { SessionInfo } from "@/lib/types";

export const GET = route({}, async ({ session }) => {
  const rows = await listSessions(session.user.id);
  return {
    sessions: rows.map<SessionInfo>((s) => ({
      // Expose a short fingerprint, never the session hash itself.
      id: s.id.slice(0, 16),
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
      current: s.id === session.id,
    })),
  };
});

/** Log out of all other devices. */
export const DELETE = route({}, async ({ session }) => {
  await revokeOtherSessions(session.user.id, session.id);
});
