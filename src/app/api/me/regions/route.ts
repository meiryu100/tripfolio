import { parseBody, route } from "@/server/http/handler";
import { setRegionStatus } from "@/server/services/regions";
import { regionStatusSchema } from "@/lib/validation";

/** Mark a region (e.g. a US state) visited / want-to-visit. */
export const POST = route({}, async ({ req, session }) => {
  const { regionCode, status } = await parseBody(req, regionStatusSchema);
  await setRegionStatus(session.user.id, regionCode, status);
});
