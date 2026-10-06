import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError, type ZodType } from "zod";
import { getSession, type Session } from "../auth/session";
import { HttpError, unauthenticated } from "./errors";
import { LIMITS, rateLimit, type Limit } from "./rate-limit";

interface Options {
  /** Require a signed-in user (default true). */
  auth?: boolean;
  /** Rate-limit bucket; defaults to "read" for GET and "write" otherwise. */
  limit?: keyof typeof LIMITS | Limit;
}

export interface Ctx<P> {
  req: NextRequest;
  params: P;
  session: Session | null;
  ip: string;
}

type AuthedCtx<P> = Ctx<P> & { session: Session };

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/**
 * CSRF defense for cookie auth: state-changing requests must come from our
 * own origin (cookies are also SameSite=Lax).
 */
function checkOrigin(req: NextRequest) {
  if (!MUTATING.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) throw new HttpError("FORBIDDEN", "Missing origin.");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw new HttpError("FORBIDDEN", "Cross-site request blocked.");
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, field: err.field, fields: err.fields } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".");
      if (key && !fields[key]) fields[key] = issue.message;
    }
    const [field, message] = Object.entries(fields)[0] ?? [undefined, "Invalid input."];
    return NextResponse.json({ error: { code: "VALIDATION", message, field, fields } }, { status: 422 });
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong. Try again." } }, { status: 500 });
}

export function route<P = Record<string, never>>(
  opts: Options & { auth: false },
  fn: (ctx: Ctx<P>) => Promise<unknown>,
): (req: NextRequest, rc: { params: Promise<P> }) => Promise<Response>;
export function route<P = Record<string, never>>(
  opts: Options,
  fn: (ctx: AuthedCtx<P>) => Promise<unknown>,
): (req: NextRequest, rc: { params: Promise<P> }) => Promise<Response>;
export function route<P>(opts: Options, fn: (ctx: AuthedCtx<P>) => Promise<unknown>) {
  return async (req: NextRequest, rc: { params: Promise<P> }) => {
    try {
      checkOrigin(req);
      const ip = clientIp(req);
      const limitName = opts.limit ?? (req.method === "GET" ? "read" : "write");
      const limit = typeof limitName === "string" ? LIMITS[limitName] : limitName;
      rateLimit(`${typeof limitName === "string" ? limitName : "custom"}:${ip}`, limit);

      const session = await getSession();
      if (opts.auth !== false && !session) throw unauthenticated();
      const params = rc?.params ? await rc.params : ({} as P);

      const result = await fn({ req, params, session: session as Session, ip });
      if (result instanceof Response) return result;
      if (result === undefined) return new NextResponse(null, { status: 204 });
      return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function parseBody<T extends ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError("BAD_REQUEST", "Request body must be JSON.");
  }
  return schema.parse(json);
}

export function parseQuery<T extends ZodType>(req: NextRequest, schema: T): z.infer<T> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
