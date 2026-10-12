import { route } from "@/server/http/handler";
import { listBlocked } from "@/server/services/messages";

export const GET = route({}, async ({ session }) => ({ users: await listBlocked(session.user.id) }));
