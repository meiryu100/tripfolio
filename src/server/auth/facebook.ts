import "server-only";
import { createHmac } from "node:crypto";
import { env } from "../env";
import { HttpError } from "../http/errors";

// Graph API versions live about two years; bump this when Meta deprecates it.
const GRAPH_VERSION = "v23.0";
const AUTH_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const redirectUri = () => `${env.appUrl}/api/auth/facebook/callback`;

export function authorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.facebook.appId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "email,public_profile",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

/** Exchange the code server-side and fetch the profile. `email` is null for phone-only accounts. */
export async function exchangeCode(code: string) {
  const tokenRes = await fetch(
    `${GRAPH_URL}/oauth/access_token?${new URLSearchParams({
      client_id: env.facebook.appId,
      client_secret: env.facebook.appSecret,
      redirect_uri: redirectUri(),
      code,
    })}`,
  );
  if (!tokenRes.ok) throw new HttpError("UNAUTHENTICATED", "Facebook sign-in failed.");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new HttpError("UNAUTHENTICATED", "Facebook sign-in failed.");

  // appsecret_proof ties the token to our app, so a stolen token can't be replayed elsewhere.
  const proof = createHmac("sha256", env.facebook.appSecret).update(access_token).digest("hex");
  const infoRes = await fetch(
    `${GRAPH_URL}/me?${new URLSearchParams({
      fields: "id,email,first_name,last_name",
      access_token,
      appsecret_proof: proof,
    })}`,
  );
  if (!infoRes.ok) throw new HttpError("UNAUTHENTICATED", "Facebook sign-in failed.");
  const info = (await infoRes.json()) as { id: string; email?: string; first_name?: string; last_name?: string };
  return {
    id: info.id,
    // Facebook only returns an email the user has confirmed.
    email: info.email?.trim() || null,
    firstName: info.first_name ?? "",
    lastName: info.last_name ?? "",
  };
}
