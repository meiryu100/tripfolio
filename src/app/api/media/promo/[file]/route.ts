import { NextResponse } from "next/server";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/handler";
import { signedGetUrl } from "@/server/storage";

/**
 * Marketing videos (e.g. 2026-10-19-promo.mp4) live in storage under `promo/`.
 * Public: redirect to a signed storage link that's stable for a day, so the
 * bytes never pass through our server.
 */
export const GET = route<{ file: string }>({ auth: false }, async ({ params }) => {
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.mp4$/.test(params.file)) throw notFound();
  const { url, validFor } = await signedGetUrl(`promo/${params.file}`, 86_400);
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": `public, max-age=${Math.max(0, Math.min(86_400, validFor - 300))}` },
  });
});
