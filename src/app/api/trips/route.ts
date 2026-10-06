import { parseBody, route } from "@/server/http/handler";
import { createTrip } from "@/server/services/trips";
import { tripSchema } from "@/lib/validation";

export const POST = route({}, async ({ req, session }) => ({
  trip: await createTrip(session.user.id, await parseBody(req, tripSchema)),
}));
