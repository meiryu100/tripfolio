import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { MAP_H, MAP_W, worldMapSvg } from "@/server/share/map-svg";
import type { CountryStatus } from "@/lib/types";

/** Default link preview for every page without its own: a sample colored map and what Tripfolio is. */

export const alt = "Tripfolio — free travel map app: color the countries you've visited";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SAMPLE: Record<string, CountryStatus> = Object.fromEntries([
  ...["US", "CA", "MX", "PE", "GB", "FR", "ES", "IT", "DE", "GR", "TR", "EG", "JP", "TH", "VN", "AU", "IS", "PT", "MA"].map((c) => [c, "visited"]),
  ...["AR", "NZ", "ZA", "IN", "NO", "ID", "KE"].map((c) => [c, "wishlist"]),
]);

const MAP_WIDTH = 900;

export default function OpengraphImage() {
  const mark = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/brand/tripfolio-mark.png")).toString("base64")}`;
  const svg = worldMapSvg(SAMPLE, {});
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)", padding: "44px 56px 28px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 800 }}>
            <div style={{ fontSize: 58, fontWeight: 700, color: "#0c4a6e", lineHeight: 1.1 }}>Your free travel map</div>
            <div style={{ marginTop: 14, fontSize: 28, color: "#0369a1", fontWeight: 600 }}>Countries, US states, trips and photos</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={mark} height={56} alt="" />
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#003180" }}>
              Trip<span style={{ color: "#06a6f2", marginLeft: -8 }}>folio</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} width={MAP_WIDTH} height={Math.round((MAP_WIDTH * MAP_H) / MAP_W)} alt="" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 22, color: "#475569" }}>trip-folio.com</div>
      </div>
    ),
    size,
  );
}
