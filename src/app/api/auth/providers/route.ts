import { googleEnabled } from "@/server/env";
import { route } from "@/server/http/handler";

export const GET = route({ auth: false }, async () => ({ google: googleEnabled }));
