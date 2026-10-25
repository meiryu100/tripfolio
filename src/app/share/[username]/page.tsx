import { Lock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { Photo } from "@/components/photo";
import { buttonClass } from "@/components/button-class";
import { Avatar } from "@/components/ui";
import { PublicMap } from "@/features/share/public-map";
import { ContinentChecklist, Milestones, WorldProgress } from "@/features/stats/stats-panel";
import { getCountry } from "@/lib/countries";
import { HttpError } from "@/server/http/errors";
import { listUserTrips } from "@/server/services/trips";
import { isIndexableProfile } from "@/lib/seo";
import { getProfileShare, shareSummary } from "@/server/share/profile-share";

/**
 * The public face of a profile: what signed-out visitors (and link previews) see at
 * /u/<username> — the proxy rewrites that URL here when there's no session. It shows
 * only what the owner's privacy settings allow everyone to see, and invites the
 * visitor to join (sign-ups from here count as invited by this user).
 */

type Props = { params: Promise<{ username: string }> };

async function load(raw: string) {
  try {
    return await getProfileShare(null, decodeURIComponent(raw));
  } catch (err) {
    if (err instanceof HttpError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const { profile, stats } = await load(username);
  const name = `${profile.firstName} ${profile.lastName}`;
  const description = profile.canView.visited
    ? `${shareSummary(stats)}. See ${profile.firstName}'s travel map on Tripfolio.`
    : `${profile.firstName} is mapping the world on Tripfolio.`;
  const image = `/api/users/${profile.username}/share-image`;
  return {
    title: `${name} (@${profile.username}) · Tripfolio`,
    description,
    alternates: { canonical: `/u/${profile.username}` },
    // Only maps with something to show go to search engines (the same rule as the sitemap).
    ...(!isIndexableProfile(profile.counts.visited) && { robots: { index: false, follow: true } }),
    openGraph: { type: "profile", url: `/u/${profile.username}`, title: `${name}'s travel map`, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: `${name}'s travel map`, description, images: [image] },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const { profile: p, map, regionStatuses, stats } = await load(username);
  const trips = p.canView.trips ? (await listUserTrips(null, p.username, { limit: 6 })).items : [];
  const showMap = p.canView.visited || p.canView.wishlist;
  const join = `/register?ref=${encodeURIComponent(p.username)}`;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href={`/login?next=${encodeURIComponent(`/u/${p.username}`)}`} className={buttonClass("ghost", "md")}>
            Sign in
          </Link>
          <Link href={join} className={buttonClass("primary", "md")}>
            Join free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <section className="flex flex-col items-center pt-6 text-center">
          <span className="bg-aurora rounded-full p-1 shadow-glow">
            <Avatar user={p} size={104} className="ring-4 ring-surface" />
          </span>
          <h1 className="mt-4 max-w-full text-3xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
            {p.firstName} {p.lastName}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-muted">
            @{p.username}
            {p.isPrivate && <Lock className="size-3.5" aria-label="Private profile" />}
          </p>
          {p.bio && <p className="mt-3 max-w-md text-[17px]">{p.bio}</p>}
          {p.location && (
            <p className="mt-2 flex items-center gap-1 text-sm text-muted">
              <MapPin className="size-3.5" aria-hidden /> {p.location}
            </p>
          )}
          {p.canView.visited && <p className="mt-4 font-semibold text-brand">{shareSummary(stats)}</p>}
        </section>

        {showMap ? (
          <div className="mt-8 grid gap-6">
            <PublicMap statuses={map.statuses} regionStatuses={regionStatuses} />
            {p.canView.visited && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <WorldProgress stats={stats} own={false} />
                <Milestones stats={stats} />
                <ContinentChecklist stats={stats} className="md:col-span-2 lg:col-span-1" />
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
            <Lock className="mx-auto size-8 text-muted" aria-hidden />
            <h2 className="mt-3 text-xl font-bold">{p.isPrivate ? "This account is private" : `${p.firstName} keeps their map to themselves`}</h2>
            <p className="mt-1 text-muted">Join Tripfolio to follow {p.firstName} and see where they&apos;ve been.</p>
          </div>
        )}

        {trips.length > 0 && (
          <section aria-labelledby="public-trips" className="mt-10">
            <h2 id="public-trips" className="mb-3 text-xl font-bold">
              Recent trips
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {trips.map((t) => {
                const c = getCountry(t.countryCode);
                return (
                  <li key={t.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                    {t.cover ? (
                      <Photo photo={t.cover} className="aspect-[4/3] w-full" emojiSize="text-4xl" />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-brand-soft text-5xl" aria-hidden>
                        {c?.flag}
                      </div>
                    )}
                    <div className="p-3">
                      <p className="truncate font-semibold">
                        {c?.flag} {c?.name}
                      </p>
                      {t.title && <p className="truncate text-sm text-muted">{t.title}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="bg-aurora mt-12 rounded-3xl p-8 text-center text-white shadow-glow sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Map your own world</h2>
          <p className="mx-auto mt-2 max-w-lg text-white/90">
            Mark the countries you&apos;ve been to and dream of, keep your trips and photos, and follow {p.firstName} on Tripfolio. It&apos;s free.
          </p>
          <Link href={join} className={buttonClass("secondary", "lg", "mt-6 min-w-48")}>
            Join {p.firstName} on Tripfolio
          </Link>
        </section>
      </main>
    </div>
  );
}
