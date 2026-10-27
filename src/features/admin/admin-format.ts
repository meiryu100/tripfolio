import type { Device } from "@/lib/device";

/** Number/date formats and device colors shared by the admin pages. */
export const fmt = new Intl.NumberFormat("he-IL");
export const dateTime = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });

/** Fixed colors per device (validated for light and dark surfaces); "unknown" is a neutral gray. */
export const DEVICE_COLOR: Record<Device | "unknown", string> = {
  mobile: "fill-[#0369a1] bg-[#0369a1] dark:fill-[#0891d1] dark:bg-[#0891d1]",
  desktop: "fill-[#c2410c] bg-[#c2410c] dark:fill-[#ea580c] dark:bg-[#ea580c]",
  tablet: "fill-[#7c3aed] bg-[#7c3aed] dark:fill-[#8b5cf6] dark:bg-[#8b5cf6]",
  unknown: "fill-[#94a3b8] bg-[#94a3b8] dark:fill-[#64748b] dark:bg-[#64748b]",
};
export const DEVICE_ORDER = ["mobile", "desktop", "tablet", "unknown"] as const;
