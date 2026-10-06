import { z } from "zod";
import { parseQuery, route } from "@/server/http/handler";
import { listUserTrips } from "@/server/services/trips";
import { countryCodeSchema, cursorQuerySchema } from "@/lib/validation";

const query = cursorQuerySchema.extend({ country: countryCodeSchema.optional(), limit: z.coerce.number().int().min(1).max(60).default(24) });

export const GET = route<{ username: string }>({ auth: false }, async ({ req, params, session }) =>
  listUserTrips(session?.user.id ?? null, params.username, parseQuery(req, query)),
);
