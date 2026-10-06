import "server-only";

/** Keyset cursor over (createdAt, id) — stable under inserts, unlike offsets. */
export function encodeCursor(at: Date, id: string) {
  return Buffer.from(`${at.toISOString()}|${id}`).toString("base64url");
}

export function decodeCursor(cursor: string | undefined): { at: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const [iso, id] = Buffer.from(cursor, "base64url").toString().split("|");
    const at = new Date(iso);
    if (Number.isNaN(at.getTime()) || !id) return null;
    return { at, id };
  } catch {
    return null;
  }
}

/** Offset cursor for lists ordered by non-unique keys (e.g. trip dates). */
export const encodeOffset = (n: number) => Buffer.from(String(n)).toString("base64url");
export function decodeOffset(cursor: string | undefined) {
  if (!cursor) return 0;
  const n = Number(Buffer.from(cursor, "base64url").toString());
  return Number.isInteger(n) && n >= 0 ? n : 0;
}
