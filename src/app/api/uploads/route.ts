import { readUpload } from "@/server/http/upload";
import { route } from "@/server/http/handler";
import { uploadPhoto } from "@/server/services/trips";

/** Upload one photo; attach it to a trip by including its id when saving the trip. */
export const POST = route({ limit: "upload" }, async ({ req, session }) => ({
  photo: await uploadPhoto(session.user.id, await readUpload(req)),
}));
