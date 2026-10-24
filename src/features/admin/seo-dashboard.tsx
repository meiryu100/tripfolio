import { BOT_KIND_LABEL } from "@/lib/bots";
import { KEY_BOTS, type SeoStats } from "@/server/services/admin-seo";
import { IndexNowButton } from "./indexnow-button";
import { BarList, dateTime, fmt, Panel, Tile } from "./stats-dashboard";

/** The admin "Bots & SEO" page: which crawlers read which pages, plus SEO tools and next steps. */

const when = (iso: string | null) => (iso ? dateTime.format(new Date(iso)) : "—");

function DailyHits({ days }: { days: SeoStats["byDay"] }) {
  const peak = Math.max(0, ...days.map((d) => d.hits));
  const max = Math.max(1, peak);
  return (
    <div>
      <div className="flex h-28 items-end gap-0.5 border-b border-border" dir="ltr">
        {days.map((d) => (
          <div key={d.day} className="group flex h-full flex-1 items-end" title={`${d.day}: ${d.hits} ביקורי רובוטים`}>
            <div
              className="w-full rounded-t-[4px] bg-brand group-hover:bg-brand-bright"
              style={{ height: `${(d.hits / max) * 100}%`, minHeight: d.hits ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">שיא יומי {fmt.format(peak)} ביקורים · 30 הימים האחרונים</p>
    </div>
  );
}

const CHECKLIST: { title: string; body: string; href?: string }[] = [
  {
    title: "Google Search Console",
    body: "הכי חשוב: לאמת את trip-folio.com (DNS, או משתנה GOOGLE_SITE_VERIFICATION ב-Vercel), להגיש את sitemap.xml ולבקש אינדוקס לכל פוסט חדש.",
    href: "https://search.google.com/search-console",
  },
  {
    title: "Bing Webmaster Tools",
    body: "אפשר לייבא מ-Search Console בלחיצה (או BING_SITE_VERIFICATION). בינג מזין גם את החיפוש של ChatGPT ו-Copilot.",
    href: "https://www.bing.com/webmasters",
  },
  {
    title: "IndexNow אחרי כל פוסט",
    body: "הכפתור למעלה שולח את כל האתר לבינג, Yandex ושותפים, כך שפוסט חדש נסרק תוך שעות ולא שבועות.",
  },
  {
    title: "אזכורים מחוץ לאתר",
    body: "דמו ביוטיוב, תשובות כנות ברדיט שמציינות שאתה יוצר הכלי, Product Hunt ו-AlternativeTo. זה מה שחסר הכי הרבה לפי האודיט.",
  },
];

export function SeoDashboard({ stats }: { stats: SeoStats }) {
  const googlebot = stats.byBot.find((b) => b.bot === "Googlebot");
  const aiBots = stats.byBot.filter((b) => b.kind === "ai-search" || b.kind === "ai-training");
  return (
    <div dir="rtl" className="mx-auto grid max-w-6xl gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">רובוטים ו-SEO</h1>
        <p className="mt-1 text-sm text-muted">
          ביקורים של מנועי חיפוש ורובוטי AI ב-30 הימים האחרונים, לפי ה-User-Agent. אפשר לזייף אותו, אז זה סימן ולא ספירה מאומתת.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="ביקורי רובוטים" value={stats.hits30d} sub={`${fmt.format(stats.byBot.length)} רובוטים שונים`} />
        <Tile label="Googlebot" value={googlebot?.hits ?? 0} sub={googlebot ? `אחרון: ${when(googlebot.lastSeen)}` : "עוד לא ביקר"} />
        <Tile label="רובוטי AI" value={aiBots.reduce((s, b) => s + b.hits, 0)} sub={aiBots.map((b) => b.bot).join(", ") || "עוד לא ביקרו"} />
        <Tile
          label="פוסטים שנסרקו"
          value={`${stats.blog.filter((b) => b.path !== "/blog" && b.total > 0).length} מתוך ${stats.blog.length - 1}`}
          sub="פוסטים שרובוט כלשהו קרא"
        />
      </div>

      <Panel title="ביקורי רובוטים בבלוג" note="כמה פעמים כל רובוט קרא כל פוסט ב-30 הימים האחרונים">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="pb-2 pe-4 text-start font-medium">פוסט</th>
                {KEY_BOTS.map((b) => (
                  <th key={b} className="pb-2 pe-3 text-end font-medium">
                    {b}
                  </th>
                ))}
                <th className="pb-2 pe-3 text-end font-medium">אחרים</th>
                <th className="pb-2 text-start font-medium">Googlebot אחרון</th>
              </tr>
            </thead>
            <tbody>
              {stats.blog.map((row) => (
                <tr key={row.path} className="border-t border-border">
                  <td className="max-w-72 py-2 pe-4">
                    <a href={row.path} className="line-clamp-2 text-brand hover:underline" dir="auto">
                      {row.title}
                    </a>
                  </td>
                  {KEY_BOTS.map((b) => (
                    <td key={b} className={`py-2 pe-3 text-end tabular-nums ${row.hits[b] ? "" : "text-muted/60"}`}>
                      {fmt.format(row.hits[b])}
                    </td>
                  ))}
                  <td className={`py-2 pe-3 text-end tabular-nums ${row.other ? "" : "text-muted/60"}`}>{fmt.format(row.other)}</td>
                  <td className="py-2 whitespace-nowrap text-muted">{when(row.lastGoogle)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="ביקורים ליום" note="כל הרובוטים, כל הדפים">
          <DailyHits days={stats.byDay} />
        </Panel>
        <Panel title="לפי רובוט" note="30 הימים האחרונים">
          <BarList
            empty="עוד לא נרשם אף ביקור של רובוט"
            rows={stats.byBot.map((b) => ({
              label: b.bot,
              value: b.hits,
              hint: `${b.bot} (${b.kind ? BOT_KIND_LABEL[b.kind] : "אחר"}): ${b.hits} ביקורים ב-${b.pages} דפים · אחרון ${when(b.lastSeen)}`,
            }))}
          />
        </Panel>
        <Panel title="קבצים לרובוטים" note="מתי רובוטים קראו את קבצי ההכוונה">
          <ul className="grid gap-3 text-sm">
            {stats.files.map((f) => (
              <li key={f.path} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <a href={f.path} className="font-medium text-brand hover:underline" dir="ltr">
                  {f.path}
                </a>
                <span className="text-muted">
                  {f.hits ? `${fmt.format(f.hits)} פעמים · אחרון ${when(f.lastSeen)} · ${f.bots.join(", ")}` : "עוד לא נקרא"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="הדפים הכי נסרקים" note="15 הדפים עם הכי הרבה ביקורי רובוטים">
          <BarList
            empty="עוד לא נרשם אף ביקור של רובוט"
            rows={stats.topPages.map((p) => ({ label: p.path, value: p.hits, hint: `${p.path}: ${p.hits} ביקורים מ-${p.bots} רובוטים · אחרון ${when(p.lastSeen)}` }))}
          />
        </Panel>
      </div>

      <Panel title="IndexNow" note="מודיע לבינג, Yandex ומנועים נוספים על כל הדפים שב-sitemap, כדי שיסרקו אותם מהר">
        <IndexNowButton />
      </Panel>

      <Panel title="מה עוד מקדם SEO" note="דברים שלא נעשים בקוד">
        <ul className="grid gap-4 sm:grid-cols-2">
          {CHECKLIST.map((c) => (
            <li key={c.title} className="rounded-xl border border-border p-4">
              <div className="font-bold">
                {c.href ? (
                  <a href={c.href} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    {c.title}
                  </a>
                ) : (
                  c.title
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{c.body}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
