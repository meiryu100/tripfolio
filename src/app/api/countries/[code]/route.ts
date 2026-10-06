import { route } from "@/server/http/handler";
import { getCountryDetail } from "@/server/services/discovery";

export const GET = route<{ code: string }>({ auth: false }, async ({ params, session }) =>
  getCountryDetail(session?.user.id ?? null, params.code),
);
