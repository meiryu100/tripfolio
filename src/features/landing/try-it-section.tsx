import Link from "next/link";
import { DemoMap } from "./demo-map";
import { PromoVideo } from "./promo-video";

/**
 * The home page's try-it map, what kind of app Tripfolio is, and the promo video. The copy is the
 * home page's own ("travel map app"), so it doesn't compete with /countries-visited-map.
 * Headings start at h2 because the home page has its own h1.
 */
export function TryItSection() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="try-it">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="try-it" className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
            Try the <span className="text-gradient">travel map</span> now
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
            Tap a few places you&apos;ve been. Your count and your share of the world update as you go, and you can save the map
            when you sign up.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-5xl">
          <DemoMap />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6" aria-labelledby="app">
        <h2 id="app" className="text-3xl font-bold tracking-tight">
          A travel map app without the app store
        </h2>
        <div className="mt-4 grid gap-4 text-[17px] leading-relaxed text-muted">
          <p>
            Tripfolio runs in your browser, on a phone or a computer, so there&apos;s nothing to install and your map is the same
            everywhere you sign in. It counts the 195 countries of the world, splits the USA into its 50 states, and also maps
            Canadian provinces and Australian states.
          </p>
          <p>
            A pin on a map only tells half the story, so each country can hold trips: the dates, the cities, a few lines about what
            happened and your best photos, with the location data removed from every photo. Follow friends to see their maps, and
            make your own profile private whenever you like.
          </p>
          <p>
            Just want the number?{" "}
            <Link href="/countries-visited-map" className="font-medium text-brand hover:underline">
              Count the countries you&apos;ve visited
            </Link>{" "}
            or read{" "}
            <Link href="/blog/how-many-countries-are-there-in-the-world" className="font-medium text-brand hover:underline">
              how many countries there are in the world
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6" aria-labelledby="in-action">
        <h2 id="in-action" className="text-center text-3xl font-bold tracking-tight">
          See it in action
        </h2>
        <div className="mt-8">
          <PromoVideo version="long" />
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Photos: Ayanadak123 (CC BY-SA 4.0), Vyacheslav Argenberg (CC BY 4.0), Marek Gehrmann (CC BY-SA 3.0), kallerna (CC BY-SA 4.0), Stjepko Krehula (CC BY 4.0), Emrahuygun (CC BY-SA 4.0), MurielBendel (CC BY-SA 4.0), Basile Morin (CC BY-SA 4.0), Martin Falbisoner (CC BY-SA 4.0), via Wikimedia Commons.
        </p>
      </section>
    </>
  );
}
