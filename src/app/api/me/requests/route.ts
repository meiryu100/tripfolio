import { route } from "@/server/http/handler";
import { listRequests } from "@/server/services/social";

export const GET = route({}, async ({ session }) => ({ requests: await listRequests(session.user.id) }));
