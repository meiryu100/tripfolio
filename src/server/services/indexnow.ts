import "server-only";
import sitemap from "@/app/sitemap";
import { INDEXNOW_KEY, INDEXNOW_KEY_PATH } from "@/lib/indexnow";
import { siteUrl } from "@/lib/site-url";

/**
 * Submit every URL in the sitemap to IndexNow in one request (the limit is 10,000 URLs).
 * Run from the admin SEO page after publishing or changing pages.
 */
export async function submitSitemapToIndexNow() {
  const urlList = (await sitemap()).map((entry) => entry.url);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(siteUrl).host, key: INDEXNOW_KEY, keyLocation: `${siteUrl}${INDEXNOW_KEY_PATH}`, urlList }),
    signal: AbortSignal.timeout(15_000),
  });
  // 200 = accepted, 202 = accepted and the key is still being checked; anything else is a problem.
  return { ok: res.status === 200 || res.status === 202, status: res.status, submitted: urlList.length };
}
