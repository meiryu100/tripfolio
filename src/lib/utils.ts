export { clsx as cn } from "clsx";

export function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m: m - 1, d };
}

/** "Mar 12 – Mar 25, 2025" (short) or "March 12 – March 25, 2025" (long). */
export function formatDateRange(start: string | null, end: string | null, long = false) {
  const names = long ? MONTHS_LONG : MONTHS;
  const fmt = (p: ReturnType<typeof parts>, withYear: boolean) =>
    `${names[p.m]} ${p.d}${withYear ? `, ${p.y}` : ""}`;
  if (!start && !end) return null;
  if (start && !end) return fmt(parts(start), true);
  if (!start && end) return fmt(parts(end), true);
  const a = parts(start!);
  const b = parts(end!);
  if (start === end) return fmt(a, true);
  return `${fmt(a, a.y !== b.y)} – ${fmt(b, true)}`;
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const date = new Date(iso);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function dayBucket(iso: string): "Today" | "Yesterday" | "This week" | "Earlier" {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= startOfToday) return "Today";
  if (t >= startOfToday - 86400000) return "Yesterday";
  if (t >= startOfToday - 6 * 86400000) return "This week";
  return "Earlier";
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function plural(n: number, one: string, many = one + "s") {
  return `${n} ${n === 1 ? one : many}`;
}

/** Sort key for trips: most recent start date first, then most recently created. */
export function tripSortKey(t: { startDate: string | null; endDate: string | null; createdAt: string }) {
  return t.startDate ?? t.endDate ?? t.createdAt.slice(0, 10);
}

/** Resize an image file to a JPEG blob no larger than `max` on its longest side. */
export async function resizeImage(file: Blob, max: number, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", quality),
  );
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
