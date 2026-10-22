/** Questions about the app itself (the countries questions live on /countries-visited-map). */
export const HOME_FAQ = [
  {
    q: "What is Tripfolio?",
    a: "Tripfolio (trip-folio.com) is a free travel map app. You color the countries and US states you've visited, keep each trip with its dates, cities, story and photos, and follow friends to see where they've been.",
  },
  {
    q: "Is there an app to download?",
    a: "No. Tripfolio works in the browser on iPhone, Android, tablets and computers. Open trip-folio.com and sign up with your email or Google account.",
  },
  {
    q: "How much does it cost?",
    a: "Nothing. Making your map, adding trips and photos, and following friends is free, with no ads.",
  },
  {
    q: "Who can see my map?",
    a: "Your profile is public by default so friends can find you. You can make it private, or hide your visited list, wishlist, trips or photos one by one in Settings.",
  },
];

export const homeFaqJsonLd = {
  "@type": "FAQPage",
  mainEntity: HOME_FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

export function HomeFaq() {
  return (
    <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6" aria-labelledby="faq">
      <h2 id="faq" className="text-3xl font-bold tracking-tight">
        Questions about Tripfolio
      </h2>
      <div className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface/85 shadow-card backdrop-blur">
        {HOME_FAQ.map(({ q, a }) => (
          <details key={q} className="group px-5 py-4 open:bg-surface">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {q}
              <span className="text-xl text-muted transition group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="mt-2 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
