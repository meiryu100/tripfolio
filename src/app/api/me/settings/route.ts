import { parseBody, route } from "@/server/http/handler";
import { toMe, updateSettings } from "@/server/services/users";
import { settingsSchema } from "@/lib/validation";

export const PATCH = route({}, async ({ req, session }) => {
  const input = await parseBody(req, settingsSchema);
  return { me: await toMe(await updateSettings(session.user.id, input)) };
});
