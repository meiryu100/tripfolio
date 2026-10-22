import Image, { type StaticImageData } from "next/image";
import alon from "./team/alon.jpg";
import dana from "./team/dana.jpg";
import itay from "./team/itay.jpg";
import maya from "./team/maya.jpg";
import noa from "./team/noa.jpg";
import roni from "./team/roni.jpg";
import snir from "./team/snir.jpg";
import yogev from "./team/yogev.jpg";

/** The agent team that runs Tripfolio (~/tripfolio-agents): who reports to whom and when each one runs (Israel time). */
interface Member {
  name: string;
  role: string;
  when?: string;
  photo: StaticImageData;
}

const MANAGER: Member = { name: "🧭 אלון", role: "מנהל הצוות · מנתב עבודה, סיכום יומי", when: "כל יום 12:00", photo: alon };

const GROUPS: { title: string; members: Member[] }[] = [
  {
    title: "מוצאים עבודה",
    members: [
      { name: "🔍 שניר", role: "QA · באגים עוברים ישר לאיתי", when: "כל יום 10:00", photo: snir },
      { name: "🔒 יוגב", role: "אבטחה · ממצאים עוברים דרך אלון", when: "חמישי 10:00", photo: yogev },
      { name: "💡 דנה", role: "מוצר · רעיונות ל-backlog", when: "ראשון 10:00", photo: dana },
    ],
  },
  {
    title: "בונה",
    members: [{ name: "🛠️ איתי", role: "פיתוח · באגים ורעיונות → PR", when: "כל יום 12:00, אחרי אלון", photo: itay }],
  },
  {
    title: "תוכן, צמיחה ומספרים",
    members: [
      { name: "✍️ מאיה", role: "תוכן · מאמר SEO יומי ופוסטים", when: "בלוג כל יום 09:00 · פוסטים שני וחמישי", photo: maya },
      { name: "🚀 רוני", role: "צמיחה · ניסויים לגיוס משתמשים", when: "שלישי 10:00", photo: roni },
      { name: "📊 נועה", role: "אנליטיקה · דוח מספרים יומי", when: "כל יום 10:00", photo: noa },
    ],
  },
];

const CARD = "flex w-full max-w-xs items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-2.5";

function Card({ member, lead = false }: { member: Member; lead?: boolean }) {
  return (
    <div className={`${CARD} ${lead ? "border-2" : ""}`}>
      <Image src={member.photo} alt="" width={56} height={56} className="size-14 flex-none rounded-full object-cover" />
      <Text {...member} />
    </div>
  );
}

function Text({ name, role, when }: { name: string; role: string; when?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="font-bold">{name}</span>
      <span className="text-sm text-muted">{role}</span>
      {when && <span className="text-xs font-medium text-brand">{when}</span>}
    </div>
  );
}

const Line = () => <div className="h-5 w-0.5 bg-border" />;

export function TeamChart() {
  return (
    <section dir="rtl" className="mx-auto flex max-w-5xl flex-col items-center">
      <h2 className="text-center text-2xl font-bold tracking-tight">צוות Tripfolio</h2>
      <p className="mt-1 mb-6 text-center text-sm text-muted">מי עונה למי, מה כל אחד עושה ומתי הוא רץ (שעון ישראל)</p>

      <div className={`${CARD} border-2`}>
        <div aria-hidden className="flex size-14 flex-none items-center justify-center rounded-full bg-brand text-2xl font-bold text-brand-fg">
          מ
        </div>
        <Text name="מאיר" role="בעלים · ממזג כל PR ומאשר כל דבר שיוצא החוצה" />
      </div>
      <Line />
      <Card member={MANAGER} lead />
      <Line />

      <div className="grid w-full gap-6 md:grid-cols-3 md:gap-4 md:border-t-2 md:border-border md:pt-5">
        {GROUPS.map((g) => (
          <div key={g.title} className="flex min-w-0 flex-col items-center gap-2.5">
            <h3 className="text-xs font-medium tracking-wide text-muted">{g.title}</h3>
            {g.members.map((m) => (
              <Card key={m.name} member={m} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
