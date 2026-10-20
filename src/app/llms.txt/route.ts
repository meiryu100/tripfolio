import { siteUrl } from "@/lib/site-url";
import { getAllPosts } from "@/server/blog";

/** llms.txt: a short, plain-text map of the public site for AI assistants and their crawlers. */

export const dynamic = "force-static";

export async function GET() {
  const posts = await getAllPosts();
  const text = `# Tripfolio

> Tripfolio is a free web app for travelers: color the countries you've visited on a world map (green = visited, orange = want to visit), see how many of the 195 countries and what % of the world you've seen, track US states, Canadian provinces and Australian states, add trips with dates, cities, notes and photos, and follow friends to see their maps. It runs in the browser on phones and computers; there is no app to install.

## Main pages

- [Countries visited map](${siteUrl}/countries-visited-map): try the map without signing up, plus an FAQ on how countries are counted
- [Every country](${siteUrl}/countries): all 195 countries and 55 territories by continent, one page each
- [Blog](${siteUrl}/blog): guides on counting and mapping the places you've been
- [Sign up](${siteUrl}/register)

## Blog articles

${posts.map((p) => `- [${p.title}](${siteUrl}/blog/${p.slug}): ${p.description}`).join("\n")}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
