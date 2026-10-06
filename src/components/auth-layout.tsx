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
    if (me) router.replace(me.onboarded ? "/home" : "/onboarding");
  }, [me, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8">
      <Logo />
      <div className="mt-8 w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
