import { route } from "@/server/http/handler";
import { acceptRequest } from "@/server/services/messages";

export const POST = route<{ username: string }>({}, async ({ params, session }) => {
  await acceptRequest(session.user.id, params.username);
});
