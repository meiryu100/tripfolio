"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { trackClick } from "@/components/analytics";
import { AuthLayout } from "@/components/auth-layout";
import { InviteCard } from "@/components/invite-card";
import { ResendVerification } from "@/components/resend-verification";
import { SocialButtons } from "@/components/social-buttons";
import { Button, FormError, Input } from "@/components/ui";
import { useRegister } from "@/features/auth/api";
import { ApiError, errorMessage } from "@/lib/api-client";
import { registerSchema } from "@/lib/validation";

const noSubscribe = () => () => {};
function readRef() {
  const r = new URLSearchParams(window.location.search).get("ref");
  return r && /^[a-z0-9._]{3,20}$/i.test(r) ? r.toLowerCase() : null;
}

export default function RegisterPage() {
  const register = useRegister();
  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Set once the confirmation link is sent: the form gives way to "check your email".
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Invite links send people to /register?ref=<username>.
  const ref = useSyncExternalStore(noSubscribe, readRef, () => null);
  // Unknown or misspelled invite username: drop the "Join @…" wording (sign-up still passes ref on).
  const [inviterMissing, setInviterMissing] = useState(false);
  const inviter = inviterMissing ? null : ref;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    trackClick("create_account");
    setFormError(null);
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});

    register.mutate({ ...parsed.data, ref: ref ?? undefined }, {
      onSuccess: () => setSentTo(parsed.data.email),
      onError: (err) => {
        if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
        else setFormError(errorMessage(err));
      },
    });
  };

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a link to ${sentTo}. Click it to open your account.`}>
        <div className="grid gap-3">
          <p className="text-sm text-muted">No email after a minute? Check your spam folder, or send it again.</p>
          <ResendVerification email={sentTo} />
          <Button variant="ghost" size="lg" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={inviter ? `Join @${inviter} on Tripfolio` : "Create your account"}
      subtitle={inviter ? "Color in the countries you've been to and compare maps. It's free." : "Start mapping your world."}
    >
      {ref && <InviteCard username={ref} onMissing={() => setInviterMissing(true)} />}
      <SocialButtons verb="Sign up" invite={ref} />
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
        <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} hint="At least 8 characters" />
        <Input label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
        <FormError message={formError} />
        <Button type="submit" size="lg" loading={register.isPending}>
          Create Account
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="font-semibold text-brand hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-semibold text-brand hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" onClick={() => trackClick("login_link")} className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
