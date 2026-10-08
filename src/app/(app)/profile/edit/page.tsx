"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Page } from "@/components/app-shell";
import { AvatarPicker } from "@/components/avatar-picker";
import { GenderPicker } from "@/components/gender-picker";
import { BackLink } from "@/components/cards";
import { Button, FormError, Input, Textarea } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useRemoveAvatar, useUpdateProfile, useUploadAvatar } from "@/features/settings/api";
import { ApiError, errorMessage } from "@/lib/api-client";
import type { Gender } from "@/lib/types";
import { toast } from "@/lib/ui";
import { profileSchema } from "@/lib/validation";

export default function EditProfilePage() {
  const me = useMe();
  const router = useRouter();
  const update = useUpdateProfile();
  const upload = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const [form, setForm] = useState({
    firstName: me.firstName,
    lastName: me.lastName,
    gender: me.gender as Gender | null, // always set for existing accounts
    username: me.username,
    bio: me.bio,
    location: me.location,
    website: me.website,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    // Instant client-side check with the same rules the API enforces.
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    update.mutate(parsed.data, {
      onSuccess: () => {
        toast("Profile updated ✓");
        router.push("/profile");
      },
      onError: (err) => {
        if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
        else setFormError(errorMessage(err));
      },
    });
  };

  return (
    <Page back={<BackLink fallback="/profile" label="Profile" />} title="Edit Profile">
      <form onSubmit={submit} className="grid max-w-xl gap-5" noValidate>
        <AvatarPicker
          url={me.avatarUrl}
          name={me}
          busy={upload.isPending || removeAvatar.isPending}
          onPick={(file) =>
            upload.mutate(file, {
              onSuccess: () => toast("Profile photo updated ✓"),
              onError: (e) => toast(errorMessage(e), "error"),
            })
          }
          onRemove={() => removeAvatar.mutate(undefined, { onError: (e) => toast(errorMessage(e), "error") })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" value={form.firstName} onChange={set("firstName")} error={errors.firstName} autoComplete="given-name" />
          <Input label="Last name" value={form.lastName} onChange={set("lastName")} error={errors.lastName} autoComplete="family-name" />
        </div>
        <Input label="Username" value={form.username} onChange={set("username")} error={errors.username} autoCapitalize="none" autoComplete="username" />
        <Input
          label="Email"
          type="email"
          value={me.email}
          readOnly
          className="[&_input]:bg-surface-2 [&_input]:text-muted"
          hint={
            <>
              Change it in{" "}
              <Link href="/settings#account" className="font-semibold text-brand hover:underline">
                Settings
              </Link>
            </>
          }
        />
        <GenderPicker
          value={form.gender}
          onChange={(gender) => {
            setForm((f) => ({ ...f, gender }));
            setErrors((e) => ({ ...e, gender: "" }));
          }}
          error={errors.gender}
        />
        <Textarea label="Bio" optional value={form.bio} onChange={set("bio")} maxLength={160} placeholder="Exploring the world" error={errors.bio} />
        <Input label="Location" optional value={form.location} onChange={set("location")} placeholder="Tel Aviv, Israel" error={errors.location} />
        <Input label="Website" optional type="url" value={form.website} onChange={set("website")} placeholder="https://" error={errors.website} />
        <FormError message={formError} />
        <Button type="submit" size="lg" loading={update.isPending}>
          Save Changes
        </Button>
      </form>
    </Page>
  );
}
