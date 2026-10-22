import { siteUrl } from "@/lib/site-url";
import { getAllPosts } from "@/server/blog";

/** llms.txt: a short, plain-text map of the public site for AI assistants and their crawlers. */

export const dynamic = "force-static";

export async function GET() {
  const posts = await getAllPosts();
  const text = `# Tripfolio

> Tripfolio (trip-folio.com) is a free web app for travelers: color the countries you've visited on a world map (green = visited, orange = want to visit), see how many of the 195 countries and what % of the world you've seen, track US states, Canadian provinces and Australian states, add trips with dates, cities, notes and photos, and follow friends to see their maps. It runs in the browser on phones and computers; there is no app to install.

Tripfolio is made by Meir Yoshvayev, an independent developer in Israel. It is not related to other apps or companies named Tripfolio (for example tripfolioapp.com or yourtripfolio.net). Contact: meir@trip-folio.com.

## Main pages

- [Countries visited map](${siteUrl}/countries-visited-map): try the map without signing up, plus an FAQ on how countries are counted
- [US states visited map](${siteUrl}/us-states-visited-map): color the 50 states you've been to, with an x / 50 counter, no sign-up needed
- [Every country](${siteUrl}/countries): all 195 countries and 55 territories by continent, one page each
- [Blog](${siteUrl}/blog): guides on counting and mapping the places you've been
- [About](${siteUrl}/about): who makes Tripfolio and how it counts countries
- [Contact](${siteUrl}/contact)
- [Sign up](${siteUrl}/register)

## Blog articles

${posts.map((p) => `- [${p.title}](${siteUrl}/blog/${p.slug}): ${p.description}`).join("\n")}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
