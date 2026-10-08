import { route } from "@/server/http/handler";
import { removeRegionStatus } from "@/server/services/regions";
import { regionStatusSchema } from "@/lib/validation";

export const DELETE = route<{ code: string }>({}, async ({ params, session }) => {
  const { regionCode } = regionStatusSchema.pick({ regionCode: true }).parse({ regionCode: params.code });
  await removeRegionStatus(session.user.id, regionCode);
});
