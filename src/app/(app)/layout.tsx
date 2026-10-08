"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, Spinner } from "@/components/ui";
import { useMeQuery } from "@/features/auth/api";
import { CountrySheet } from "@/features/map/country-sheet";
import { RegionSheet } from "@/features/map/region-sheet";
import { TripEditor } from "@/features/trips/trip-editor";
import { api } from "@/lib/api-client";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const { data: me, isPending, isError, refetch } = useMeQuery();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (me === null) {
      // Stale or expired cookie: clear it so the route guard doesn't bounce us back.
      api.post("/api/auth/logout").finally(() => router.replace(`/login?next=${encodeURIComponent(pathname)}`));
    } else if (me && !me.onboarded) router.replace("/onboarding");
  }, [me, router, pathname]);

  if (isError && !me) {
    return (
      <main className="mx-auto max-w-md px-4 py-24">
        <ErrorState title="We couldn't reach Tripfolio." body="Check your connection and try again." onRetry={() => refetch()} />
      </main>
    );
  }

  if (isPending || !me || !me.onboarded) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="scale-125" />
      </div>
    );
  }

  return (
    <AppShell>
      {children}
      <CountrySheet />
      <RegionSheet />
      <TripEditor />
    </AppShell>
  );
}
