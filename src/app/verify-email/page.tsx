"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { buttonClass } from "@/components/ui";
import { useVerifyEmail } from "@/features/auth/api";
import { errorMessage } from "@/lib/api-client";

/** The link from the sign-up email: confirms the address, signs in and continues to onboarding. */
function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const verify = useVerifyEmail();
  // The link works once; don't send it twice (React runs effects twice in development).
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verify.mutate(token, { onSuccess: ({ me }) => router.replace(me.onboarded ? "/home" : "/onboarding") });
  }, [token, verify, router]);

  if (!token || verify.isError) {
    return (
      <AuthLayout
        keepSignedIn
        title="This link didn't work"
        subtitle={verify.isError ? errorMessage(verify.error) : "The link is missing its code."}
      >
        <p className="mb-4 text-sm text-muted">
          Links work once and for 24 hours. Log in with your email and password and we&apos;ll offer to send a new one.
        </p>
        <Link href="/login" className={buttonClass("primary", "lg", "w-full")}>
          Go to log in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout keepSignedIn title="Confirming your email…">
      <p className="text-sm text-muted">This only takes a second.</p>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
