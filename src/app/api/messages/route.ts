import { z } from "zod";
import { parseQuery, route } from "@/server/http/handler";
import { listConversations } from "@/server/services/messages";

const query = z.object({ folder: z.enum(["inbox", "requests"]).default("inbox") });

export const GET = route({}, async ({ req, session }) => ({
  conversations: await listConversations(session.user.id, parseQuery(req, query).folder),
}));
