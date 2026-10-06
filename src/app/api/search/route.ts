import { parseQuery, route } from "@/server/http/handler";
import { search } from "@/server/services/discovery";
import { searchQuerySchema } from "@/lib/validation";

export const GET = route({ auth: false }, async ({ req, session }) => {
  const { q } = parseQuery(req, searchQuerySchema);
  return search(session?.user.id ?? null, q);
});
