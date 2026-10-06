import { route } from "@/server/http/handler";
import { getMap } from "@/server/services/countries";

export const GET = route<{ username: string }>({ auth: false }, async ({ params, session }) =>
  getMap(session?.user.id ?? null, params.username),
);
