import { route } from "@/server/http/handler";
import { notFound } from "@/server/http/errors";
import { submitSitemapToIndexNow } from "@/server/services/indexnow";

/** Admin only: send the whole sitemap to IndexNow. Anyone else gets a 404, like the admin pages. */
export const POST = route({}, async ({ session }) => {
  if (session.user.role !== "admin") throw notFound();
  return submitSitemapToIndexNow();
});
