"use client";

import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { useState } from "react";
import { DEVICE_LABEL, type Device } from "@/lib/device";
import type { AdminStats } from "@/server/services/admin-stats";
import { DEVICE_COLOR, DEVICE_ORDER, dateTime, fmt } from "./admin-format";

/**
 * Who's active, by sign-up device: a summary per device (how many in each group finished sign-up,
 * marked a country, added a trip...) and every real user underneath, sortable by any column.
 */
type Row = AdminStats["userActivity"][number];
type Key = "name" | "username" | "createdAt" | "device" | "onboarded" | "countries" | "trips" | "active7d" | "over10" | "hasAvatar";

const deviceKey = (d: Device | null) => d ?? "unknown";
const deviceRank = (d: Device | null) => DEVICE_ORDER.indexOf(deviceKey(d));
// Same count as the "countries marked" column (visited + wishlist).
const over10 = (r: Row) => r.countries > 10;

const COLUMNS: { key: Key; label: string; numeric?: boolean }[] = [
  { key: "name", label: "שם" },
  { key: "username", label: "משתמש" },
  { key: "createdAt", label: "נרשם" },
  { key: "device", label: "מכשיר" },
  { key: "onboarded", label: "סיים הרשמה", numeric: true },
  { key: "countries", label: "מדינות שסומנו", numeric: true },
  { key: "trips", label: "טיולים", numeric: true },
  { key: "active7d", label: "פעיל ב-7 ימים", numeric: true },
  { key: "over10", label: "מעל 10 מדינות", numeric: true },
  { key: "hasAvatar", label: "תמונת פרופיל", numeric: true },
];

function value(r: Row, key: Key): string | number {
  switch (key) {
    case "device":
      return deviceRank(r.device);
    case "over10":
      return over10(r) ? 1 : 0;
    case "onboarded":
    case "active7d":
    case "hasAvatar":
      return r[key] ? 1 : 0;
    default:
      return r[key];
  }
}

const SUMMARY: { label: string; test: (r: Row) => boolean }[] = [
  { label: "סיימו הרשמה", test: (r) => r.onboarded },
  { label: "סימנו לפחות מדינה", test: (r) => r.countries > 0 },
  { label: "הוסיפו טיול", test: (r) => r.trips > 0 },
  { label: "פעילים ב-7 ימים", test: (r) => r.active7d },
  { label: "מעל 10 מדינות", test: over10 },
  { label: "תמונת פרופיל", test: (r) => r.hasAvatar },
];

function DeviceChip({ device }: { device: Device | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`size-2.5 rounded-sm ${DEVICE_COLOR[deviceKey(device)]}`} />
      {DEVICE_LABEL[deviceKey(device)]}
    </span>
  );
}

const Yes = ({ on }: { on: boolean }) =>
  on ? <Check className="mx-auto size-4 text-visited" aria-label="כן" /> : <span className="text-muted/60" aria-label="לא">—</span>;

export function UserActivity({ rows }: { rows: Row[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "device", dir: 1 });
  const devices = DEVICE_ORDER.filter((d) => rows.some((r) => deviceKey(r.device) === d));

  const sorted = [...rows].sort((a, b) => {
    const x = value(a, sort.key);
    const y = value(b, sort.key);
    const c = typeof x === "string" && typeof y === "string" ? x.localeCompare(y) : Number(x) - Number(y);
    // Ties keep the newest sign-up first.
    return c * sort.dir || b.createdAt.localeCompare(a.createdAt);
  });

  const toggle = (key: Key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "device" || key === "name" || key === "username" ? 1 : -1 }));

  return (
    <div className="grid gap-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="pb-2 pe-4 text-start font-medium">מכשיר</th>
              <th className="pb-2 pe-4 text-end font-medium">משתמשים</th>
              {SUMMARY.map((s) => (
                <th key={s.label} className="pb-2 pe-4 text-end font-medium">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => {
              const group = rows.filter((r) => deviceKey(r.device) === d);
              return (
                <tr key={d} className="border-t border-border">
                  <td className="py-2 pe-4">
                    <DeviceChip device={d === "unknown" ? null : d} />
                  </td>
                  <td className="py-2 pe-4 text-end font-semibold tabular-nums">{fmt.format(group.length)}</td>
                  {SUMMARY.map((s) => {
                    const n = group.filter(s.test).length;
                    return (
                      <td key={s.label} className="py-2 pe-4 text-end tabular-nums whitespace-nowrap">
                        {fmt.format(n)} <span className="text-muted">· {Math.round((n / group.length) * 100)}%</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="max-h-[36rem] overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface text-xs text-muted shadow-[0_1px_0_var(--color-border)]">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-medium ${c.numeric ? "text-center" : "text-start"}`} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                  <button type="button" onClick={() => toggle(c.key)} className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-fg ${sort.key === c.key ? "text-fg" : ""}`}>
                    {c.label}
                    {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.username} className="border-t border-border">
                <td className="px-3 py-2 whitespace-nowrap">{r.name}</td>
                <td className="px-3 py-2">
                  <a href={`/u/${r.username}`} dir="ltr" className="text-brand hover:underline">
                    @{r.username}
                  </a>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-muted">{dateTime.format(new Date(r.createdAt))}</td>
                <td className="px-3 py-2">
                  <DeviceChip device={r.device} />
                </td>
                <td className="px-3 py-2 text-center">
                  <Yes on={r.onboarded} />
                </td>
                <td className="px-3 py-2 text-center tabular-nums">{r.countries ? fmt.format(r.countries) : <span className="text-muted/60">0</span>}</td>
                <td className="px-3 py-2 text-center tabular-nums">{r.trips ? fmt.format(r.trips) : <span className="text-muted/60">0</span>}</td>
                <td className="px-3 py-2 text-center">
                  <Yes on={r.active7d} />
                </td>
                <td className="px-3 py-2 text-center">
                  <Yes on={over10(r)} />
                </td>
                <td className="px-3 py-2 text-center">
                  <Yes on={r.hasAvatar} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
