import type { ReactNode } from "react";
import { DEVICE_LABEL, type Device } from "@/lib/device";
import type { AdminStats } from "@/server/services/admin-stats";

/**
 * The admin stats page: headline numbers as tiles, then single-series bar charts
 * (one brand hue, no legend needed). Daily bars show a tooltip on hover or tap, and every chart
 * has its numbers printed next to it, so nothing depends on color or hover alone.
 */

export const fmt = new Intl.NumberFormat("he-IL");
const date = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "Asia/Jerusalem" });
export const dateTime = new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });

function bytes(n: number) {
  if (n < 1024 ** 2) return `${fmt.format(Math.round(n / 1024))} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function Panel({ title, note, children, className = "" }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-surface p-5 ${className}`}>
      <h2 className="font-bold">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{typeof value === "number" ? fmt.format(value) : value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Horizontal bars for a ranked list: label, bar, value. */
export function BarList({ rows, empty = "אין עדיין נתונים" }: { rows: { label: string; value: number; hint?: string }[]; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,7rem)_minmax(4rem,1fr)_2rem] items-center gap-3 text-sm" title={r.hint ?? `${r.label}: ${r.value}`}>
          <span className="truncate text-start" dir="auto">
            {r.label}
          </span>
          <span className="h-2.5 rounded-full bg-border/40">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 4 : 0 }} />
          </span>
          <span className="text-end tabular-nums text-muted">{fmt.format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function SignupsChart({ days }: { days: AdminStats["signupsByDay"] }) {
  const peak = Math.max(0, ...days.map((d) => d.signups));
  const max = Math.max(1, peak);
  const total = days.reduce((s, d) => s + d.signups, 0);
  return (
    <div>
      <div className="mt-10 flex h-36 items-end gap-0.5 border-b border-border" dir="ltr">
        {days.map((d, i) => {
          const label = `${date.format(new Date(d.day))}: ${d.signups === 1 ? "הרשמה אחת" : `${fmt.format(d.signups)} הרשמות`}`;
          // Keep the bubble inside the chart at both ends.
          const align = i < 3 ? "left-0" : i > days.length - 4 ? "right-0" : "left-1/2 -translate-x-1/2";
          return (
            <div
              key={d.day}
              tabIndex={0}
              aria-label={label}
              className="group relative flex h-full flex-1 items-end rounded-t-[4px] outline-none hover:bg-surface-2 focus-visible:bg-surface-2"
            >
              <div
                className="w-full rounded-t-[4px] bg-brand group-hover:bg-brand-bright group-focus:bg-brand-bright"
                style={{ height: `${(d.signups / max) * 100}%`, minHeight: d.signups ? 4 : 0 }}
              />
              <div
                role="tooltip"
                dir="rtl"
                className={`pointer-events-none absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-lg bg-fg px-2.5 py-1.5 text-xs font-medium text-bg opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus:opacity-100 ${align}`}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted" dir="ltr">
        <span>{days[0] && date.format(new Date(days[0].day))}</span>
        <span>היום</span>
      </div>
      <p className="mt-2 text-sm text-muted">
        סה״כ {fmt.format(total)} הרשמות ב-30 הימים · שיא יומי {fmt.format(peak)}
      </p>
    </div>
  );
}

/** Sign-ups per unique utm_campaign (summed over every source / medium it came with), most first. */
function campaignTotals(utm: AdminStats["utm"]) {
  const byCampaign = new Map<string, { campaign: string; total: number; last30d: number }>();
  for (const u of utm) {
    if (!u.campaign) continue;
    const row = byCampaign.get(u.campaign) ?? { campaign: u.campaign, total: 0, last30d: 0 };
    row.total += u.total;
    row.last30d += u.last30d;
    byCampaign.set(u.campaign, row);
  }
  return [...byCampaign.values()].sort((a, b) => b.total - a.total || a.campaign.localeCompare(b.campaign));
}

/** Fixed colors per device (validated for light and dark surfaces); "unknown" is a neutral gray. */
const DEVICE_COLOR: Record<Device | "unknown", string> = {
  mobile: "fill-[#0369a1] bg-[#0369a1] dark:fill-[#0891d1] dark:bg-[#0891d1]",
  desktop: "fill-[#c2410c] bg-[#c2410c] dark:fill-[#ea580c] dark:bg-[#ea580c]",
  tablet: "fill-[#7c3aed] bg-[#7c3aed] dark:fill-[#8b5cf6] dark:bg-[#8b5cf6]",
  unknown: "fill-[#94a3b8] bg-[#94a3b8] dark:fill-[#64748b] dark:bg-[#64748b]",
};
const DEVICE_ORDER = ["mobile", "desktop", "tablet", "unknown"] as const;

/** Ring segments for a donut (outer radius 60, inner 38, centered in a 140×140 box), clockwise from 12 o'clock. */
function donutPaths<T extends { value: number }>(slices: T[], total: number) {
  const R = 60;
  const r = 38;
  const at = (a: number, rad: number) => `${70 + rad * Math.cos(a)} ${70 + rad * Math.sin(a)}`;
  const starts = slices.map((_, i) => -Math.PI / 2 + (slices.slice(0, i).reduce((sum, x) => sum + x.value, 0) / total) * Math.PI * 2);
  return slices.map((s, i) => {
    const start = starts[i];
    const sweep = (s.value / total) * Math.PI * 2;
    const end = start + sweep;
    if (sweep >= Math.PI * 2 - 1e-6) {
      // One slice is the whole ring: draw it as two halves, since an SVG arc can't start and end at the same point.
      const mid = start + Math.PI;
      return { ...s, d: `M ${at(start, R)} A ${R} ${R} 0 1 1 ${at(mid, R)} A ${R} ${R} 0 1 1 ${at(start, R)} M ${at(start, r)} A ${r} ${r} 0 1 0 ${at(mid, r)} A ${r} ${r} 0 1 0 ${at(start, r)} Z` };
    }
    const large = sweep > Math.PI ? 1 : 0;
    return { ...s, d: `M ${at(start, R)} A ${R} ${R} 0 ${large} 1 ${at(end, R)} L ${at(end, r)} A ${r} ${r} 0 ${large} 0 ${at(start, r)} Z` };
  });
}

/** A donut of sign-ups per device, with a legend that carries every number (so nothing relies on color). */
function DevicePie({ devices, period }: { devices: AdminStats["devices"]; period: "total" | "last30d" }) {
  const slices = DEVICE_ORDER.map((key) => ({
    key,
    value: devices.filter((d) => (d.device ?? "unknown") === key).reduce((s, d) => s + d[period], 0),
  })).filter((s) => s.value > 0);
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="text-sm text-muted">אין עדיין נתונים</p>;

  const paths = donutPaths(slices, total);
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="size-36 flex-none" role="img" aria-label="הרשמות לפי מכשיר">
        {paths.map((p) => (
          <path key={p.key} d={p.d} fillRule="evenodd" className={`${DEVICE_COLOR[p.key]} stroke-surface stroke-2 hover:opacity-80`}>
            <title>{`${DEVICE_LABEL[p.key]}: ${p.value} (${pct(p.value)})`}</title>
          </path>
        ))}
        <text x="70" y="68" textAnchor="middle" className="fill-fg text-[20px] font-bold">
          {fmt.format(total)}
        </text>
        <text x="70" y="86" textAnchor="middle" className="fill-muted text-[10px]">
          נרשמו
        </text>
      </svg>
      <ul className="grid gap-2 text-sm">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className={`size-3 flex-none rounded-sm ${DEVICE_COLOR[s.key]}`} />
            <span>{DEVICE_LABEL[s.key]}</span>
            <span className="tabular-nums text-muted">
              {fmt.format(s.value)} · {pct(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatsDashboard({ stats, generatedAt }: { stats: AdminStats; generatedAt: string }) {
  const { users, active, content, funnel30d: f } = stats;
  const campaigns = campaignTotals(stats.utm);
  return (
    <div dir="rtl" className="mx-auto grid max-w-6xl gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">סטטיסטיקות</h1>
        <p className="mt-1 text-sm text-muted">
          משתמשים אמיתיים בלבד (בלי {fmt.format(users.test)} חשבונות דמו), כולל החשבון שלך · עודכן {dateTime.format(new Date(generatedAt))}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="משתמשים רשומים" value={users.real} sub={`${fmt.format(users.verified)} אימתו מייל · ${fmt.format(users.onboarded)} סיימו הרשמה`} />
        <Tile label="נרשמו השבוע" value={users.new7d} sub={`${fmt.format(users.new24h)} ב-24 שעות · ${fmt.format(users.new30d)} ב-30 יום`} />
        <Tile label="פעילים היום" value={active.dau} sub={`${fmt.format(active.wau)} השבוע · ${fmt.format(active.mau)} החודש`} />
        <Tile label="הגיעו מהזמנה" value={users.invited} sub={`${fmt.format(users.private)} פרופילים פרטיים`} />
        <Tile label="טיולים" value={content.trips} sub={`${fmt.format(content.trips7d)} השבוע`} />
        <Tile label="תמונות" value={content.photos} sub={`${fmt.format(content.photos7d)} השבוע · ${bytes(content.storageBytes)} באחסון`} />
        <Tile label="מדינות שסומנו" value={content.visited} sub={`${fmt.format(content.wishlisted)} ברשימת משאלות`} />
        <Tile label="מעקבים" value={content.follows} sub={`${fmt.format(content.pendingFollows)} בקשות ממתינות · ${fmt.format(content.messages)} הודעות`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="הרשמות ליום" note="30 הימים האחרונים">
          <SignupsChart days={stats.signupsByDay} />
        </Panel>
        <Panel title="משפך ההרשמה" note="מי שנרשם ב-30 הימים האחרונים, עד איפה הגיע">
          <BarList
            rows={[
              { label: "נרשמו", value: f.signedUp },
              { label: "סיימו הרשמה", value: f.onboarded },
              { label: "סימנו מדינה", value: f.markedCountry },
              { label: "הוסיפו טיול", value: f.addedTrip },
              { label: "עקבו אחרי מישהו", value: f.followed },
            ]}
          />
        </Panel>
        <Panel title="מאיפה הגיעו" note="מקור ההרשמה, 30 הימים האחרונים">
          <BarList rows={stats.sources30d.map((s) => ({ label: s.source, value: s.signups }))} />
        </Panel>
        <Panel title="נרשמו מטלפון או ממחשב" note="כל המשתמשים האמיתיים, לפי המכשיר שממנו נרשמו">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted">מאז ומעולם</h3>
              <DevicePie devices={stats.devices} period="total" />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted">30 הימים האחרונים</h3>
              <DevicePie devices={stats.devices} period="last30d" />
            </div>
          </div>
        </Panel>
        <Panel title="המדינות הכי מסומנות">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted">ביקרו</h3>
              <BarList rows={stats.topVisited.map((c) => ({ label: c.name, value: c.users, hint: `${c.name}: ${c.users} משתמשים` }))} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted">רוצים לבקר</h3>
              <BarList rows={stats.topWishlisted.map((c) => ({ label: c.name, value: c.users, hint: `${c.name}: ${c.users} משתמשים` }))} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="UTM" note="כל צירופי ה-UTM שמשתמשים אמיתיים נרשמו איתם (הנגיעה הראשונה), לפי כמות">
        {stats.utm.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-2 pe-4 text-start font-medium">utm_source</th>
                  <th className="pb-2 pe-4 text-start font-medium">utm_medium</th>
                  <th className="pb-2 pe-4 text-start font-medium">utm_campaign</th>
                  <th className="pb-2 pe-4 text-start font-medium">אתר מפנה</th>
                  <th className="pb-2 pe-4 text-end font-medium">סה״כ</th>
                  <th className="pb-2 text-end font-medium">30 יום</th>
                </tr>
              </thead>
              <tbody>
                {stats.utm.map((u) => (
                  <tr key={`${u.source}|${u.medium}|${u.campaign}|${u.referrer}`} className="border-t border-border">
                    <td className="py-2 pe-4"><bdi dir="ltr">{u.source || "—"}</bdi></td>
                    <td className="py-2 pe-4 text-muted"><bdi dir="ltr">{u.medium || "—"}</bdi></td>
                    <td className="py-2 pe-4 text-muted"><bdi dir="ltr">{u.campaign || "—"}</bdi></td>
                    <td className="py-2 pe-4 text-muted"><bdi dir="ltr">{u.referrer || "—"}</bdi></td>
                    <td className="py-2 pe-4 text-end tabular-nums">{fmt.format(u.total)}</td>
                    <td className="py-2 text-end tabular-nums text-muted">{fmt.format(u.last30d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">עדיין אף משתמש אמיתי לא נרשם עם UTM או מאתר מפנה (כולם direct)</p>
        )}
      </Panel>

      <Panel title="קמפיינים" note="כל utm_campaign שמשתמשים אמיתיים נרשמו איתו, וכמה נרשמו ממנו בסך הכול">
        {campaigns.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-2 pe-4 text-start font-medium">utm_campaign</th>
                  <th className="pb-2 pe-4 text-end font-medium">נרשמו (סה״כ)</th>
                  <th className="pb-2 text-end font-medium">30 יום</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.campaign} className="border-t border-border">
                    <td className="py-2 pe-4"><bdi dir="ltr">{c.campaign}</bdi></td>
                    <td className="py-2 pe-4 text-end tabular-nums">{fmt.format(c.total)}</td>
                    <td className="py-2 text-end tabular-nums text-muted">{fmt.format(c.last30d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">עדיין אף משתמש אמיתי לא נרשם עם utm_campaign</p>
        )}
      </Panel>

      <Panel title="נרשמו לאחרונה" note={`100 המשתמשים האמיתיים האחרונים · מוצגים ${stats.recentSignups.length}`}>
        {stats.recentSignups.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs text-muted">
                <tr>
                  <th className="pb-2 pe-3 text-start font-medium">#</th>
                  <th className="pb-2 text-start font-medium">שם</th>
                  <th className="pb-2 text-start font-medium">משתמש</th>
                  <th className="pb-2 text-start font-medium">נרשם</th>
                  <th className="pb-2 text-start font-medium">מכשיר</th>
                  <th className="pb-2 text-start font-medium">מקור</th>
                  <th className="pb-2 text-start font-medium">medium / campaign</th>
                  <th className="pb-2 text-start font-medium">מייל מאומת</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSignups.map((u, i) => (
                  <tr key={u.username} className="border-t border-border">
                    <td className="py-2 pe-3 text-muted tabular-nums">{i + 1}</td>
                    <td className="py-2">{u.name}</td>
                    <td className="py-2 pe-4">
                      <a href={`/u/${u.username}`} dir="ltr" className="text-brand hover:underline">
                        @{u.username}
                      </a>
                    </td>
                    <td className="py-2 pe-4 whitespace-nowrap text-muted">{dateTime.format(new Date(u.createdAt))}</td>
                    <td className="py-2 pe-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`size-2.5 rounded-sm ${DEVICE_COLOR[u.device ?? "unknown"]}`} />
                        {DEVICE_LABEL[u.device ?? "unknown"]}
                      </span>
                    </td>
                    <td className="py-2 pe-4 text-muted">{u.source}</td>
                    <td className="py-2 pe-4 text-muted"><bdi dir="ltr">{[u.medium, u.campaign].filter(Boolean).join(" / ") || "—"}</bdi></td>
                    <td className="py-2">{u.verified ? "מאומת" : "לא מאומת"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">אין עדיין משתמשים אמיתיים</p>
        )}
      </Panel>
    </div>
  );
}
