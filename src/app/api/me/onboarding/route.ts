import { parseBody, route } from "@/server/http/handler";
import { completeOnboarding, saveAboutYou, toMe } from "@/server/services/users";
import { aboutYouSchema } from "@/lib/validation";

export const PATCH = route({}, async ({ req, session }) => {
  const input = await parseBody(req, aboutYouSchema);
  return { me: await toMe(await saveAboutYou(session.user.id, input)) };
});

export const POST = route({}, async ({ session }) => {
  await completeOnboarding(session.user.id);
});
