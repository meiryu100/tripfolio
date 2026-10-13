import { readUpload } from "@/server/http/upload";
import { route } from "@/server/http/handler";
import { sendPhoto } from "@/server/services/messages";

/** Send a photo (multipart "file"). */
export const POST = route<{ username: string }>({ limit: "upload" }, async ({ req, params, session }) => ({
  message: await sendPhoto(session.user.id, params.username, await readUpload(req)),
}));
