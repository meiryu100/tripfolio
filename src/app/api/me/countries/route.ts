import { parseBody, route } from "@/server/http/handler";
import { setStatus, setStatuses } from "@/server/services/countries";
import { bulkStatusSchema, countryStatusSchema } from "@/lib/validation";

/** Mark one country visited / want-to-visit. */
export const POST = route({}, async ({ req, session }) => {
  const { countryCode, status } = await parseBody(req, countryStatusSchema);
  await setStatus(session.user.id, countryCode, status);
});

/** Bulk set (onboarding). */
export const PUT = route({}, async ({ req, session }) => {
  const { countryCodes, status } = await parseBody(req, bulkStatusSchema);
  await setStatuses(session.user.id, countryCodes, status);
});
