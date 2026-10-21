import { DemoMap } from "./demo-map";
import { PromoVideo } from "./promo-video";

/**
 * The try-it map, the "how many countries" text and the promo video from /countries-visited-map,
 * for the home page. Headings start at h2 because the home page has its own h1.
 */
export function TryItSection() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="try-it">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="try-it" className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
            Your <span className="text-gradient">countries visited</span> map
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
            Color in every country you&apos;ve been to and see how much of the world you&apos;ve explored. Try it right here — no sign-up
            needed to start.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-5xl">
          <DemoMap />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6" aria-labelledby="how-many">
        <h2 id="how-many" className="text-3xl font-bold tracking-tight">
          How many countries have I been to?
        </h2>
        <div className="mt-4 grid gap-4 text-[17px] leading-relaxed text-muted">
          <p>
            It&apos;s a surprisingly hard question to answer from memory. A map makes it easy: go continent by continent, tap each
            country you&apos;ve visited, and the count, the share of the world and the continents add up as you go.
          </p>
          <p>
            On Tripfolio, visited countries turn green and the places you dream about turn orange, so your map shows both where
            you&apos;ve been and where you&apos;re going next. Add a trip to a country and it stays marked as visited.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6" aria-labelledby="in-action">
        <h2 id="in-action" className="text-center text-3xl font-bold tracking-tight">
          See it in action
        </h2>
        <div className="mt-8">
          <PromoVideo />
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Trip photos: Basile Morin (CC BY-SA 4.0), Stjepko Krehula (CC BY 4.0), Martin Falbisoner (CC BY-SA 4.0), via Wikimedia Commons.
        </p>
      </section>
    </>
  );
}
