import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import facts from "@/data/country-facts.json";
import { COUNTRIES, countrySlug, getCountryBySlug, nameInSentence } from "@/lib/countries";
import { MAP_H, MAP_W, worldMapSvg } from "@/server/share/map-svg";

/**
 * Link preview for a country page, also shown on the page as its locator map: the world with
 * the country colored in and circled, so even a tiny island can be found.
 */

export const alt = "Where the country is on the world map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MAP_WIDTH = 1000;

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ slug: countrySlug(c) }));
}

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const country = getCountryBySlug((await params).slug);
  const latlng = country ? ((facts as Record<string, { latlng: number[] }>)[country.code]?.latlng as [number, number] | undefined) : undefined;
  const svg = worldMapSvg(country ? { [country.code]: "visited" } : {}, {}, latlng);
  const mark = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/brand/tripfolio-mark.png")).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: "linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%)", padding: "40px 56px 24px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
            <div style={{ fontSize: 54, fontWeight: 700, color: "#0c4a6e", lineHeight: 1.1 }}>
              {country ? `Where is ${nameInSentence(country)}?` : "Every country in the world"}
            </div>
            {country && <div style={{ marginTop: 10, fontSize: 28, color: "#0369a1", fontWeight: 600 }}>{country.subregion || country.continent}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={mark} height={52} alt="" />
            <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: "#003180" }}>
              Trip<span style={{ color: "#06a6f2", marginLeft: -8 }}>folio</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} width={MAP_WIDTH} height={Math.round((MAP_WIDTH * MAP_H) / MAP_W)} alt="" />
        </div>
      </div>
    ),
    size,
  );
}
