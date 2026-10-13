import { NextResponse } from "next/server";
import { z } from "zod";
import { notFound } from "@/server/http/errors";
import { route } from "@/server/http/handler";
import { signedGetUrl } from "@/server/storage";
import { authorizeMessagePhoto } from "@/server/services/messages";

/** A photo in a chat: only the two people in it get a short-lived signed link. */
export const GET = route<{ id: string }>({}, async ({ req, params, session }) => {
  const id = z.string().uuid().safeParse(params.id);
  if (!id.success) throw notFound("Photo not found.");
  const key = await authorizeMessagePhoto(session.user.id, id.data);
  const size = req.nextUrl.searchParams.get("size") === "thumb" ? "thumb" : "full";
  const { url, validFor } = await signedGetUrl(`${key}/${size}.webp`, 3600);
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": `private, max-age=${Math.max(0, Math.min(3600, validFor - 60))}`, Vary: "Cookie" },
  });
});
