"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button, FormError, Input, buttonClass } from "@/components/ui";
import { meKey, resetPassword } from "@/features/auth/api";
import { errorMessage } from "@/lib/api-client";
import { toast } from "@/lib/ui";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const qc = useQueryClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This password reset link is missing its token.">
        <Link href="/forgot-password" className={buttonClass("primary", "lg", "w-full")}>
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password);
      await qc.invalidateQueries({ queryKey: meKey });
      toast("Password updated — you're signed in ✓");
      router.replace("/home");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="You'll be signed out of every other device.">
      <form onSubmit={submit} className="grid gap-4">
        <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters" />
        <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <FormError message={error} />
        <Button type="submit" size="lg" loading={busy} disabled={!password || !confirm}>
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
