import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/handler";
import { getObject } from "@/server/storage";
import { avatarObjectKey } from "@/server/services/users";

/** Avatars are public. The key changes on every upload, so they're cached forever. */
export const GET = route<{ key: string }>({ auth: false }, async ({ params }) => {
  if (!/^[0-9a-f-]{36}_[0-9a-f-]{36}$/.test(params.key)) throw notFound();
  const obj = await getObject(avatarObjectKey(params.key));
  if (!obj?.Body) throw notFound();
  return new Response(obj.Body.transformToWebStream(), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
