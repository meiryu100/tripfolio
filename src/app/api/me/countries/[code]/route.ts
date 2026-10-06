import { route } from "@/server/http/handler";
import { removeStatus } from "@/server/services/countries";
import { countryCodeSchema } from "@/lib/validation";

export const DELETE = route<{ code: string }>({}, async ({ params, session }) => {
  await removeStatus(session.user.id, countryCodeSchema.parse(params.code));
});
