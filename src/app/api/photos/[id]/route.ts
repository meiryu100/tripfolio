import { z } from "zod";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/handler";
import { getObject } from "@/server/storage";
import { authorizePhoto } from "@/server/services/trips";

/** Streams a photo after checking the viewer may see it. */
export const GET = route<{ id: string }>({ auth: false }, async ({ req, params, session }) => {
  const id = z.string().uuid().safeParse(params.id);
  if (!id.success) throw notFound("Photo not found.");
  const key = await authorizePhoto(session?.user.id ?? null, id.data);
  const size = req.nextUrl.searchParams.get("size") === "thumb" ? "thumb" : "full";
  const obj = await getObject(`${key}/${size}.webp`);
  if (!obj?.Body) throw notFound("Photo not found.");
  return new Response(obj.Body.transformToWebStream(), {
    headers: {
      "Content-Type": "image/webp",
      // Private: the browser may cache, shared caches/CDNs may not.
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
});
