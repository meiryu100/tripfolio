import { z } from "zod";
import { parseQuery, route } from "@/server/http/handler";
import { getRegions } from "@/server/services/regions";

// Without `country`: every country that has a regions map.
const query = z.object({ country: z.string().trim().length(2).optional() });

export const GET = route<{ username: string }>({ auth: false }, async ({ req, params, session }) =>
  getRegions(session?.user.id ?? null, params.username, parseQuery(req, query).country),
);
