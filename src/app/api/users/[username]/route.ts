import { route } from "@/server/http/handler";
import { getProfile } from "@/server/services/users";

export const GET = route<{ username: string }>({ auth: false }, async ({ params, session }) => ({
  profile: await getProfile(session?.user.id ?? null, params.username),
}));
