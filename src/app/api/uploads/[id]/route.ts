import { z } from "zod";
import { route } from "@/server/http/handler";
import { discardPendingPhoto } from "@/server/services/trips";

export const DELETE = route<{ id: string }>({}, async ({ params, session }) => {
  await discardPendingPhoto(session.user.id, z.string().uuid().parse(params.id));
});
