import "server-only";
import { notFound } from "next/navigation";
import { getSession, type Session } from "./session";

/**
 * The admin area is only for users with role "admin". Everyone else, signed in or not,
 * gets a plain 404 so the area doesn't reveal that it exists. Call it in the render path.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (session?.user.role !== "admin") notFound();
  return session;
}
