import { z } from "zod";
import { route } from "@/server/http/handler";
import { unsendMessage } from "@/server/services/messages";

/** Unsend one of my messages (removed for both people). */
export const DELETE = route<{ id: string }>({}, async ({ params, session }) => {
  await unsendMessage(session.user.id, z.string().uuid().parse(params.id));
});
