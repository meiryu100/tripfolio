"use client";

import { Compass } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/button-class";
import { useMeQuery } from "@/features/auth/api";

export default function NotFound() {
  const me = useMeQuery().data;
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-8">
      <Logo />
      <div className="animate-rise flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <span className="bg-aurora flex size-16 items-center justify-center rounded-3xl text-white shadow-glow" aria-hidden>
          <Compass className="size-8" />
        </span>
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-brand uppercase">Error 404</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">
          Looks like you&apos;re <span className="text-gradient">off the map</span>
        </h1>
        <p className="mt-3 max-w-md text-lg text-muted">We couldn&apos;t find the page or traveler you were looking for. It may have moved, or the link might be mistyped.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {me ? (
            <Link href="/home" className={buttonClass("primary", "lg")}>
              Go to my map
            </Link>
          ) : (
            <>
              <Link href="/register" className={buttonClass("primary", "lg")}>
                Join free
              </Link>
              <Link href="/" className={buttonClass("secondary", "lg")}>
                Back to home
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
