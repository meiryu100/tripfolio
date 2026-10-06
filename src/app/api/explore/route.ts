import { route } from "@/server/http/handler";
import { getExplore } from "@/server/services/discovery";

export const GET = route({ auth: false }, async ({ session }) => getExplore(session?.user.id ?? null));
