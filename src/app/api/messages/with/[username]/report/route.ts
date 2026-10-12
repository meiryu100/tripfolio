import { parseBody, route } from "@/server/http/handler";
import { report } from "@/server/services/messages";
import { reportSchema } from "@/lib/validation";

export const POST = route<{ username: string }>({}, async ({ req, params, session }) => {
  await report(session.user.id, params.username, await parseBody(req, reportSchema));
});
