import { route } from "@/server/http/handler";
import { removeFollower } from "@/server/services/social";

export const DELETE = route<{ username: string }>({}, async ({ params, session }) => {
  await removeFollower(session.user.id, params.username);
});
