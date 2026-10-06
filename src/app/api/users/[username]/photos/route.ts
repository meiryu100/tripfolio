import { z } from "zod";
import { parseQuery, route } from "@/server/http/handler";
import { listUserPhotos } from "@/server/services/trips";
import { cursorQuerySchema } from "@/lib/validation";

const query = cursorQuerySchema.extend({ limit: z.coerce.number().int().min(1).max(60).default(30) });

export const GET = route<{ username: string }>({ auth: false }, async ({ req, params, session }) =>
  listUserPhotos(session?.user.id ?? null, params.username, parseQuery(req, query)),
);
