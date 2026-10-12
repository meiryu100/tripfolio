import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getSession } from "@/server/auth/session";
import { errorResponse } from "@/server/http/handler";
import { MAP_H, MAP_W, worldMapSvg } from "@/server/share/map-svg";
import { getProfileShare, shareSummary } from "@/server/share/profile-share";

/**
 * A 1200×630 share card: name, travel stats and the colored world map. It's the
 * link preview (Open Graph) for public profiles and the image behind "Share my map".
 * Respects privacy: what's hidden from the viewer is hidden on the card.
 */

const mark = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/brand/tripfolio-mark.png")).toString("base64")}`;

const WIDTH = 1200;
const HEIGHT = 630;
const MAP_WIDTH = 940;

export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await ctx.params;
    const viewer = await getSession();
    const { profile, map, regionStatuses, stats } = await getProfileShare(viewer?.user.id ?? null, decodeURIComponent(username));
    const showMap = profile.canView.visited || profile.canView.wishlist;
    const svg = worldMapSvg(showMap ? map.statuses : {}, showMap ? regionStatuses : {});
    const line = profile.canView.visited ? shareSummary(stats) : "Mapping the world on Tripfolio";

    return new ImageResponse(
      (
        <div style={{ width: WIDTH, height: HEIGHT, display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)", padding: "44px 56px 28px", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
              <div style={{ fontSize: 56, fontWeight: 700, color: "#0c4a6e", lineHeight: 1.1 }}>
                {`${profile.firstName} ${profile.lastName}`}
              </div>
              <div style={{ marginTop: 14, fontSize: 30, color: "#0369a1", fontWeight: 600 }}>{line}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- rendered by ImageResponse, not the browser */}
              <img src={mark} height={56} alt="" />
              {/* Satori leaves a gap between text runs; pull the second one back. */}
              <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#003180" }}>
                Trip<span style={{ color: "#06a6f2", marginLeft: -8 }}>folio</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered by ImageResponse, not the browser */}
            <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} width={MAP_WIDTH} height={Math.round((MAP_WIDTH * MAP_H) / MAP_W)} alt="" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#475569" }}>
            <span>{`@${profile.username}`}</span>
            <span>trip-folio.com</span>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        // Signed-in viewers may see more than the public card, so only cache the public one.
        headers: { "Cache-Control": viewer ? "private, no-store" : "public, max-age=600, s-maxage=600" },
      },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
