import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/button-class";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

/** Header and footer around the public blog pages. */
export function BlogShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="glass sticky top-0 z-30 border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1">
            <Link href="/login" className={buttonClass("ghost", "md")}>
              Log In
            </Link>
            <Link href="/register" className={buttonClass("primary", "md", "hidden sm:inline-flex")}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">{children}</main>

      <SiteFooter />
    </div>
  );
}
