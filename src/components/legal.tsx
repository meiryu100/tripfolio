import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/button-class";
import { CookieSettingsButton } from "@/components/cookie-consent";
import { Logo } from "@/components/logo";

export const LEGAL_UPDATED = "October 22, 2026";
export const CONTACT_EMAIL = "meir@trip-folio.com";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Shared layout for the public Privacy Policy and Terms of Service pages. */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="glass sticky top-0 z-30 border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1">
            <Link href="/login" className={buttonClass("ghost", "sm")}>
              Log In
            </Link>
            <Link href="/register" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
        <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">Last updated: {LEGAL_UPDATED}</p>
        <div className="mt-6 grid gap-4 text-[17px] leading-relaxed text-muted [overflow-wrap:anywhere]">{intro}</div>

        <nav aria-label="Contents" className="mt-8 rounded-3xl border border-border bg-surface/85 p-5 shadow-card">
          <p className="font-semibold">Contents</p>
          <ol className="mt-2 grid list-inside list-decimal gap-1 text-muted">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="font-medium text-brand hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 grid gap-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24">
              <h2 id={`${s.id}-title`} className="text-2xl font-bold tracking-tight">
                {s.title}
              </h2>
              <div className="mt-3 grid gap-3 text-[17px] leading-relaxed text-muted [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:text-brand [&_a:hover]:underline [&_li]:pl-1 [&_strong]:text-fg [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-6">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="pb-10 text-center text-sm text-muted">
        Tripfolio ·{" "}
        <Link href="/privacy" className="hover:text-fg hover:underline">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="hover:text-fg hover:underline">
          Terms
        </Link>{" "}
        · <CookieSettingsButton className="hover:text-fg hover:underline" />
      </footer>
    </div>
  );
}
