import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/button-class";
import { CookieSettingsButton } from "@/components/cookie-consent";
import { Logo } from "@/components/logo";

/** Header and footer around the public blog pages. */
export function BlogShell({ children }: { children: ReactNode }) {
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

      <main className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">{children}</main>

      <footer className="pb-10 text-center text-sm text-muted">
        Tripfolio ·{" "}
        <Link href="/blog" className="hover:text-fg hover:underline">
          Blog
        </Link>{" "}
        ·{" "}
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
