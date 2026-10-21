import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { env } from "../env";

type Provider = "google";

const STATE_COOKIE = "tv_oauth_state";
const REF_COOKIE = "tv_oauth_ref";
const cookieOptions = (provider: Provider) => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: "lax" as const,
  path: `/api/auth/${provider}`,
  maxAge: 600,
});

/** Start sign-in: remember a random state (and the invite, if any) and return it for the provider's URL. */
export async function beginOAuth(provider: Provider, req: NextRequest) {
  const jar = await cookies();
  const state = randomBytes(24).toString("base64url");
  jar.set(STATE_COOKIE, state, cookieOptions(provider));
  // Invite links (/register?ref=<username>) pass the inviter through sign-in.
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && /^[a-z0-9._]{3,20}$/i.test(ref)) jar.set(REF_COOKIE, ref.toLowerCase(), cookieOptions(provider));
  else jar.delete({ name: REF_COOKIE, path: `/api/auth/${provider}` });
  return state;
}

/** Finish sign-in: the authorization code, or null for a forged callback (OAuth CSRF). */
export async function completeOAuth(provider: Provider, req: NextRequest) {
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value ?? "";
  const ref = jar.get(REF_COOKIE)?.value;
  // One-time values: clear them on the same path they were set on.
  jar.delete({ name: STATE_COOKIE, path: `/api/auth/${provider}` });
  jar.delete({ name: REF_COOKIE, path: `/api/auth/${provider}` });
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const code = req.nextUrl.searchParams.get("code");
  if (!code || !expected || state.length !== expected.length || !timingSafeEqual(Buffer.from(state), Buffer.from(expected)))
    return null;
  return { code, ref };
}
