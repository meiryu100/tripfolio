import type { ReactNode } from "react";
import type { AdminStats } from "@/server/services/admin-stats";

/**
 * The admin stats page: headline numbers as tiles, then single-series bar charts
 * (one brand hue, no legend needed). Each bar has a native tooltip and every chart
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
      <div className="flex h-36 items-end gap-0.5 border-b border-border" dir="ltr">
        {days.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${date.format(new Date(d.day))}: ${d.signups} הרשמות`}>
            <div
              className="w-full rounded-t-[4px] bg-brand group-hover:bg-brand-bright"
              style={{ height: `${(d.signups / max) * 100}%`, minHeight: d.signups ? 4 : 0 }}
            />
          </div>
        ))}
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

export function StatsDashboard({ stats, generatedAt }: { stats: AdminStats; generatedAt: string }) {
  const { users, active, content, funnel30d: f } = stats;
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

      <Panel title="נרשמו לאחרונה" note="10 המשתמשים האמיתיים האחרונים">
        {stats.recentSignups.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs text-muted">
                <tr>
                  <th className="pb-2 text-start font-medium">שם</th>
                  <th className="pb-2 text-start font-medium">משתמש</th>
                  <th className="pb-2 text-start font-medium">נרשם</th>
                  <th className="pb-2 text-start font-medium">מקור</th>
                  <th className="pb-2 text-start font-medium">medium / campaign</th>
                  <th className="pb-2 text-start font-medium">מייל מאומת</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSignups.map((u) => (
                  <tr key={u.username} className="border-t border-border">
                    <td className="py-2">{u.name}</td>
                    <td className="py-2 pe-4">
                      <a href={`/u/${u.username}`} dir="ltr" className="text-brand hover:underline">
                        @{u.username}
                      </a>
                    </td>
                    <td className="py-2 pe-4 whitespace-nowrap text-muted">{dateTime.format(new Date(u.createdAt))}</td>
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
