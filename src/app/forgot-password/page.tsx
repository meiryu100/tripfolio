"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button, FormError, Input, buttonClass } from "@/components/ui";
import { requestPasswordReset } from "@/features/auth/api";
import { errorMessage } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand" aria-hidden>
            <MailCheck className="size-7" />
          </span>
          <p className="text-muted">
            If an account exists for <strong className="text-fg">{email}</strong>, we&apos;ve sent a link to reset your password. It expires in an hour.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">Development: the email is printed in the server terminal.</p>
          )}
          <Link href="/login" className={buttonClass("secondary", "lg", "mt-6 w-full")}>
            Back to log in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={submit} className="grid gap-4">
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <FormError message={error} />
        <Button type="submit" size="lg" loading={busy} disabled={!email}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
