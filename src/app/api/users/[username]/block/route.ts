import { route } from "@/server/http/handler";
import { block, unblock } from "@/server/services/messages";

export const POST = route<{ username: string }>({}, async ({ params, session }) => {
  await block(session.user.id, params.username);
});

export const DELETE = route<{ username: string }>({}, async ({ params, session }) => {
  await unblock(session.user.id, params.username);
});
