"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { GoogleButton } from "@/components/google-button";
import { Button, FormError, Input } from "@/components/ui";
import { useLogin } from "@/features/auth/api";
import { errorMessage } from "@/lib/api-client";

const OAUTH_ERRORS: Record<string, string> = {
  google_failed: "Google sign-in didn't complete. Please try again.",
  google_unavailable: "Google sign-in isn't set up on this server yet.",
};

/** Only allow redirects back into the app (never to another site). */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const oauthError = OAUTH_ERRORS[params.get("error") ?? ""];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: ({ me }) => router.replace(me.onboarded ? (safeNext(params.get("next")) ?? "/home") : "/onboarding") },
    );
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your world.">
      <GoogleButton />
      <form onSubmit={submit} className="grid gap-4">
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div>
          <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Link href="/forgot-password" className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        <FormError message={login.error ? errorMessage(login.error) : oauthError} />
        <Button type="submit" size="lg" loading={login.isPending}>
          Log In
        </Button>
      </form>

      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          className="mt-4 w-full rounded-xl border border-dashed border-border px-4 py-3 text-left text-sm text-muted transition hover:border-brand/50 hover:text-fg"
          onClick={() => {
            setEmail("demo@tripfolio.app");
            setPassword("tripfolio123");
          }}
        >
          <span className="font-semibold text-fg">Just looking?</span> Fill in the demo account (Meir, 27 countries).
        </button>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
