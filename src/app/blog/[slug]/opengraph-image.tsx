import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getAllPosts, getPost } from "@/server/blog";

/** Link preview for a blog post: its title on the brand background. */

export const alt = "Tripfolio blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  return (await getAllPosts()).map((post) => ({ slug: post.slug }));
}

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  const mark = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/brand/tripfolio-mark.png")).toString("base64")}`;
  const title = post?.title ?? "Tripfolio blog";
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)", padding: "56px 64px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={mark} height={56} alt="" />
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#003180" }}>
            Trip<span style={{ color: "#06a6f2", marginLeft: -8 }}>folio</span>
          </div>
          <div style={{ display: "flex", marginLeft: 16, fontSize: 26, color: "#0369a1", fontWeight: 600 }}>Blog</div>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 60 ? 54 : 64, fontWeight: 700, color: "#0c4a6e", lineHeight: 1.12 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 24, color: "#475569" }}>trip-folio.com/blog</div>
      </div>
    ),
    size,
  );
}
