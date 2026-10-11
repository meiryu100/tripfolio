import { NextResponse } from "next/server";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/handler";
import { signedGetUrl } from "@/server/storage";
import { avatarObjectKey } from "@/server/services/users";

/** Avatars are public: redirect to a signed storage link that's stable for a day. */
export const GET = route<{ key: string }>({ auth: false }, async ({ params }) => {
  if (!/^[0-9a-f-]{36}_[0-9a-f-]{36}$/.test(params.key)) throw notFound();
  const { url, validFor } = await signedGetUrl(avatarObjectKey(params.key), 86_400);
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": `public, max-age=${Math.max(0, Math.min(86_400, validFor - 300))}` },
  });
});
