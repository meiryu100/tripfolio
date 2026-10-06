import "server-only";
import { env } from "../env";
import { HttpError } from "../http/errors";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const redirectUri = () => `${env.appUrl}/api/auth/google/callback`;

export function authorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params}`;
}

/** Exchange the code server-side and fetch the verified profile. */
export async function exchangeCode(code: string) {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new HttpError("UNAUTHENTICATED", "Google sign-in failed.");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new HttpError("UNAUTHENTICATED", "Google sign-in failed.");

  const infoRes = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) throw new HttpError("UNAUTHENTICATED", "Google sign-in failed.");
  const info = (await infoRes.json()) as {
    sub: string;
    email: string;
    email_verified: boolean;
    given_name?: string;
    family_name?: string;
  };
  return {
    sub: info.sub,
    email: info.email,
    emailVerified: info.email_verified,
    givenName: info.given_name ?? "",
    familyName: info.family_name ?? "",
  };
}
