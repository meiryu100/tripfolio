import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db, schema } from "../db";
import type { UserRow } from "../db/schema";
import { env } from "../env";
import { unauthenticated } from "../http/errors";

export const SESSION_COOKIE = "tv_session";
const SESSION_DAYS = 30;
/** Only bump last_seen / expiry once per this interval to avoid a write per request. */
const TOUCH_INTERVAL_MS = 15 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string, meta: { userAgent: string; ip: string }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({
    id: sha256(token),
    userId,
    userAgent: meta.userAgent.slice(0, 300),
    ip: meta.ip.slice(0, 64),
    expiresAt,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export interface Session {
  id: string;
  user: UserRow;
}

/** The current session (or null). Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = sha256(token);
  const row = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  if (!row[0]) return null;

  const { session, user } = row[0];
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db
      .update(schema.sessions)
      .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) })
      .where(eq(schema.sessions.id, id));
  }
  return { id, user };
});

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw unauthenticated();
  return s;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function listSessions(userId: string) {
  return db.query.sessions.findMany({
    where: and(eq(schema.sessions.userId, userId), gt(schema.sessions.expiresAt, new Date())),
    orderBy: (s, { desc }) => [desc(s.lastSeenAt)],
  });
}

export async function revokeSession(userId: string, sessionId: string) {
  await db
    .delete(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), eq(schema.sessions.id, sessionId)));
}

/** Sign out everywhere except the current device. */
export async function revokeOtherSessions(userId: string, keepId: string) {
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, userId), ne(schema.sessions.id, keepId)));
}

export async function revokeAllSessions(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export { sha256 };
