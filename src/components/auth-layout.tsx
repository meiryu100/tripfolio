"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useMeQuery } from "@/features/auth/api";
import { safeNext } from "@/lib/safe-next";
import { Logo } from "./logo";
import { appHome } from "@/lib/app-home";

/**
 * Card layout for login/register. Signed-in visitors are sent into the app, unless the page
 * signs someone in itself (`keepSignedIn`, e.g. confirming an email while another account is open).
 */
export function AuthLayout({
  title,
  subtitle,
  keepSignedIn = false,
  children,
}: {
  title: string;
  subtitle?: string;
  keepSignedIn?: boolean;
  children: ReactNode;
}) {
  const me = useMeQuery().data;
  const router = useRouter();
  useEffect(() => {
    if (!me || keepSignedIn) return;
    // Honour ?next= (only same-site paths) so login returns to the page you came from.
    const next = new URLSearchParams(window.location.search).get("next");
    const safe = safeNext(next, window.location.origin) ?? appHome();
    router.replace(me.onboarded ? safe : "/onboarding");
  }, [me, router, keepSignedIn]);

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
