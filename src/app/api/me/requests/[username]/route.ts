import { route } from "@/server/http/handler";
import { acceptRequest, declineRequest } from "@/server/services/social";

export const POST = route<{ username: string }>({}, async ({ params, session }) => {
  await acceptRequest(session.user.id, params.username);
});

export const DELETE = route<{ username: string }>({}, async ({ params, session }) => {
  await declineRequest(session.user.id, params.username);
});
