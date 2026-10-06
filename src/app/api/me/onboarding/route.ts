import { route } from "@/server/http/handler";
import { completeOnboarding } from "@/server/services/users";

export const POST = route({}, async ({ session }) => {
  await completeOnboarding(session.user.id);
});
