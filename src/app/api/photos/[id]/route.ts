import { NextResponse } from "next/server";
import { z } from "zod";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/handler";
import { signedGetUrl } from "@/server/storage";
import { authorizePhoto } from "@/server/services/trips";

/**
 * Checks the viewer may see the photo, then redirects to a short-lived signed
 * link so the image is served straight from storage (no bytes through us).
 */
export const GET = route<{ id: string }>({ auth: false }, async ({ req, params, session }) => {
  const id = z.string().uuid().safeParse(params.id);
  if (!id.success) throw notFound("Photo not found.");
  const key = await authorizePhoto(session?.user.id ?? null, id.data);
  const size = req.nextUrl.searchParams.get("size") === "thumb" ? "thumb" : "full";
  const { url, validFor } = await signedGetUrl(`${key}/${size}.webp`, 3600);
  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      // Private (depends on who's asking) and never longer than the link lives.
      "Cache-Control": `private, max-age=${Math.max(0, Math.min(3600, validFor - 60))}`,
      Vary: "Cookie",
    },
  });
});
