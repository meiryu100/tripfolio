"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { AvatarPicker } from "@/components/avatar-picker";
import { GoogleButton } from "@/components/google-button";
import { Button, FormError, Input } from "@/components/ui";
import { useRegister } from "@/features/auth/api";
import { useUploadAvatar } from "@/features/settings/api";
import { ApiError, errorMessage } from "@/lib/api-client";
import { toast } from "@/lib/ui";
import { registerSchema } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const uploadAvatar = useUploadAvatar();
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", email: "", password: "", confirm: "" });
  const [avatar, setAvatar] = useState<{ file: File; url: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = registerSchema.safeParse(form);
    const next: Record<string, string> = parsed.success
      ? {}
      : Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    if (form.password !== form.confirm) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (!parsed.success || next.confirm) return;

    register.mutate(parsed.data, {
      onSuccess: async () => {
        // The avatar is optional: upload it after the account exists, never block sign-up on it.
        if (avatar) await uploadAvatar.mutateAsync(avatar.file).catch(() => toast("Couldn't upload your photo — add it later in Edit Profile.", "error"));
        router.replace("/onboarding");
      },
      onError: (err) => {
        if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
        else setFormError(errorMessage(err));
      },
    });
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start mapping your world.">
      <GoogleButton label="Sign up with Google" />
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <AvatarPicker
          url={avatar?.url ?? null}
          name={form}
          onPick={(file) => {
            if (avatar) URL.revokeObjectURL(avatar.url);
            setAvatar({ file, url: URL.createObjectURL(file) });
          }}
          onRemove={() => setAvatar(null)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} error={errors.firstName} />
          <Input label="Last name" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} error={errors.lastName} />
        </div>
        <Input
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") }))}
          error={errors.username}
          hint="Lowercase letters, numbers, dots and underscores"
        />
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
        <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} hint="At least 8 characters" />
        <Input label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
        <FormError message={formError} />
        <Button type="submit" size="lg" loading={register.isPending || uploadAvatar.isPending}>
          Create Account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
