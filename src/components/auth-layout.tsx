"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useMeQuery } from "@/features/auth/api";
import { Logo } from "./logo";

/** Card layout for login/register. Signed-in visitors are sent into the app. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const me = useMeQuery().data;
  const router = useRouter();
  useEffect(() => {
    if (!me) return;
    // Honour ?next= (only same-site paths) so login returns to the page you came from.
    const next = new URLSearchParams(window.location.search).get("next");
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
    router.replace(me.onboarded ? safe : "/onboarding");
  }, [me, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8">
      <Logo />
      <div className="aurora-border animate-rise mt-8 w-full max-w-md rounded-3xl bg-surface/90 p-6 shadow-float backdrop-blur sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
