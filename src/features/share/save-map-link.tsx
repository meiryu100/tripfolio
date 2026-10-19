"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { saveDemoPicks } from "@/features/landing/demo-picks";
import type { CountryStatus } from "@/lib/types";

/** Sign-up link that keeps a shared map's picks in this browser, so onboarding starts from them. */
export function SaveMapLink({ statuses, regionStatuses, className, children }: { statuses: Record<string, CountryStatus>; regionStatuses: Record<string, CountryStatus>; className?: string; children: ReactNode }) {
  return (
    <Link href="/register" onClick={() => saveDemoPicks({ ...statuses, ...regionStatuses })} className={className}>
      {children}
    </Link>
  );
}
