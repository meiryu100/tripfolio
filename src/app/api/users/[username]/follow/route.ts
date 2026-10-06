import { route } from "@/server/http/handler";
import { follow, unfollow } from "@/server/services/social";

export const POST = route<{ username: string }>({}, async ({ params, session }) => ({
  relationship: await follow(session.user.id, params.username),
}));

export const DELETE = route<{ username: string }>({}, async ({ params, session }) => ({
  relationship: await unfollow(session.user.id, params.username),
}));
