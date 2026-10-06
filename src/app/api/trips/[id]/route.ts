import { z } from "zod";
import { notFound } from "@/server/http/errors";
import { parseBody, route } from "@/server/http/handler";
import { deleteTrip, getTrip, updateTrip } from "@/server/services/trips";
import { tripSchema } from "@/lib/validation";

const id = (raw: string) => {
  const parsed = z.string().uuid().safeParse(raw);
  if (!parsed.success) throw notFound("Trip not found.");
  return parsed.data;
};

export const GET = route<{ id: string }>({ auth: false }, async ({ params, session }) => ({
  trip: await getTrip(session?.user.id ?? null, id(params.id)),
}));

export const PATCH = route<{ id: string }>({}, async ({ req, params, session }) => ({
  trip: await updateTrip(session.user.id, id(params.id), await parseBody(req, tripSchema)),
}));

export const DELETE = route<{ id: string }>({}, async ({ params, session }) => {
  await deleteTrip(session.user.id, id(params.id));
});
