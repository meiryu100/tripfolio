import { parseBody, parseQuery, route } from "@/server/http/handler";
import { deleteChat, getChat, sendMessage } from "@/server/services/messages";
import { chatQuerySchema, sendMessageSchema } from "@/lib/validation";

/** The chat with one person (also marks it read). ?before=<messageId> loads earlier messages. */
export const GET = route<{ username: string }>({}, async ({ req, params, session }) => ({
  chat: await getChat(session.user.id, params.username, parseQuery(req, chatQuerySchema).before),
}));

export const POST = route<{ username: string }>({}, async ({ req, params, session }) => {
  const { body } = await parseBody(req, sendMessageSchema);
  return { message: await sendMessage(session.user.id, params.username, body) };
});

/** Delete the chat for me only. */
export const DELETE = route<{ username: string }>({}, async ({ params, session }) => {
  await deleteChat(session.user.id, params.username);
});
