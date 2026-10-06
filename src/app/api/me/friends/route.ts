import { route } from "@/server/http/handler";
import { listFriends } from "@/server/services/social";

export const GET = route({}, async ({ session }) => ({ friends: await listFriends(session.user.id) }));
