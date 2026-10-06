"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Copy,
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  Monitor,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  UserPen,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Page } from "@/components/app-shell";
import { applyTheme } from "@/components/providers";
import { Button, FormError, Input, Sheet, SheetClose, Skeleton, Toggle } from "@/components/ui";
import { meKey, useLogout, useMe } from "@/features/auth/api";
import { changeEmail, changePassword, deleteAccount, useRevokeSessions, useSessions, useUpdateSettings } from "@/features/settings/api";
import { ApiError, errorMessage } from "@/lib/api-client";
import type { Me, Theme } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn, timeAgo } from "@/lib/utils";

const THEMES: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

type Dialog = "email" | "password" | "delete" | null;

export default function SettingsPage() {
  const me = useMe();
  const router = useRouter();
  const logout = useLogout();
  const settings = useUpdateSettings();
  const revoke = useRevokeSessions();
  const [dialog, setDialog] = useState<Dialog>(null);

  const set = (patch: Partial<Me["settings"]>, message?: string) =>
    settings.mutate(patch, {
      onSuccess: () => message && toast(message, "info"),
      onError: (e) => toast(errorMessage(e), "error"),
    });

  const signOut = () => logout.mutate(undefined, { onSettled: () => router.replace("/login") });

  return (
    <Page title="Settings">
      <div className="grid gap-8">
        <Group title="Account" id="account">
          <Row>
            <div className="flex-1">
              <p className="font-medium">Account ID</p>
              <p className="text-sm text-muted">Your permanent Travora ID. It never changes.</p>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(me.publicId).then(() => toast("Account ID copied", "info"))}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 font-mono text-sm font-semibold"
              aria-label={`Copy account ID ${me.publicId}`}
            >
              {me.publicId} <Copy className="size-4 text-muted" aria-hidden />
            </button>
          </Row>
          <RowLink href="/profile/edit" icon={<UserPen className="size-5" />} label="Edit Profile" />
          <RowButton icon={<Mail className="size-5" />} label="Change Email" hint={me.email} onClick={() => setDialog("email")} />
          <RowButton
            icon={<KeyRound className="size-5" />}
            label={me.hasPassword ? "Change Password" : "Set a Password"}
            hint={me.googleLinked ? "Signed in with Google" : undefined}
            onClick={() => setDialog("password")}
          />
          <RowButton icon={<Trash2 className="size-5" />} label="Delete Account" danger onClick={() => setDialog("delete")} />
        </Group>

        <Group title="Privacy">
          <Row>
            <div className="flex-1">
              <p className="font-medium">Profile visibility</p>
              <p className="text-sm text-muted">
                {me.settings.isPrivate
                  ? "Private — only followers you approve see your map and trips."
                  : "Public — anyone can see your map and trips."}
              </p>
            </div>
            <div role="radiogroup" aria-label="Profile visibility" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 shadow-pressed">
              {[
                { v: false, label: "Public" },
                { v: true, label: "Private" },
              ].map(({ v, label }) => (
                <button
                  key={label}
                  role="radio"
                  aria-checked={me.settings.isPrivate === v}
                  onClick={() => me.settings.isPrivate !== v && set({ isPrivate: v }, v ? "Your profile is now private" : "Your profile is now public")}
                  className={cn(
                    "min-h-10 rounded-lg px-3 text-sm font-semibold transition duration-200",
                    me.settings.isPrivate === v ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
          <ToggleRow label="Show my visited countries" checked={me.settings.showVisited} onChange={(v) => set({ showVisited: v })} />
          <ToggleRow label="Show my wishlist" checked={me.settings.showWishlist} onChange={(v) => set({ showWishlist: v })} />
          <ToggleRow label="Show my trips" checked={me.settings.showTrips} onChange={(v) => set({ showTrips: v })} />
          <ToggleRow
            label="Show my photos"
            hint={!me.settings.showTrips ? "Hidden while your trips are hidden." : undefined}
            checked={me.settings.showPhotos}
            onChange={(v) => set({ showPhotos: v })}
          />
        </Group>

        <Group title="Notifications">
          <ToggleRow label="Follow notifications" hint="When someone follows you or unfollows you." checked={me.settings.notifyFollows} onChange={(v) => set({ notifyFollows: v })} />
          <ToggleRow label="Trip notifications" hint="When people you follow add a trip." checked={me.settings.notifyTrips} onChange={(v) => set({ notifyTrips: v })} />
          <ToggleRow label="Email notifications" hint="A digest of activity, sent to your email." checked={me.settings.notifyEmail} onChange={(v) => set({ notifyEmail: v })} />
        </Group>

        <Group title="Appearance">
          <Row>
            <div role="radiogroup" aria-label="Theme" className="grid w-full grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-1 shadow-pressed">
              {THEMES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={me.settings.theme === id}
                  onClick={() => {
                    applyTheme(id);
                    set({ theme: id });
                  }}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition duration-200",
                    me.settings.theme === id ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg",
                  )}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>
          </Row>
        </Group>

        <Group title="Security">
          <RowButton icon={<KeyRound className="size-5" />} label={me.hasPassword ? "Change Password" : "Set a Password"} onClick={() => setDialog("password")} />
          <Sessions />
          <RowButton
            icon={<ShieldCheck className="size-5" />}
            label="Log out from all other devices"
            onClick={() =>
              revoke.mutate(undefined, {
                onSuccess: () => toast("Signed out of all other devices ✓"),
                onError: (e) => toast(errorMessage(e), "error"),
              })
            }
          />
          <RowButton icon={<LogOut className="size-5" />} label="Log out" onClick={signOut} />
        </Group>
      </div>

      <Sheet open={dialog === "email"} onClose={() => setDialog(null)} label="Change email">
        <ChangeEmailForm onDone={() => setDialog(null)} />
      </Sheet>
      <Sheet open={dialog === "password"} onClose={() => setDialog(null)} label="Change password">
        <ChangePasswordForm onDone={() => setDialog(null)} />
      </Sheet>
      <Sheet open={dialog === "delete"} onClose={() => setDialog(null)} label="Delete account">
        <DeleteAccountForm onCancel={() => setDialog(null)} />
      </Sheet>
    </Page>
  );
}

function Sessions() {
  const { data, isPending } = useSessions();
  const revoke = useRevokeSessions();
  return (
    <div className="px-4 py-3.5">
      <p className="mb-2 font-medium">Active sessions</p>
      {isPending ? (
        <Skeleton className="h-14" />
      ) : (
        <ul className="grid gap-2">
          {data?.map((s) => {
            const mobile = /iphone|android|mobile/i.test(s.userAgent);
            return (
              <li key={s.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                {mobile ? <Smartphone className="size-5 shrink-0 text-muted" aria-hidden /> : <Laptop className="size-5 shrink-0 text-muted" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {describeAgent(s.userAgent)}
                    {s.current && <span className="ml-2 rounded-md bg-visited-soft px-1.5 py-0.5 text-[11px] font-semibold text-visited">This device</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {s.ip && s.ip !== "local" ? `${s.ip} · ` : ""}Active {timeAgo(s.lastSeenAt)}
                  </p>
                </div>
                {!s.current && (
                  <Button size="sm" variant="ghost" onClick={() => revoke.mutate(s.id, { onSuccess: () => toast("Session signed out", "info") })}>
                    Sign out
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function describeAgent(ua: string) {
  const browser = /edg/i.test(ua) ? "Edge" : /chrome|crios/i.test(ua) ? "Chrome" : /firefox|fxios/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : /curl/i.test(ua) ? "API client" : "Browser";
  const os = /iphone|ipad/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /mac os/i.test(ua) ? "macOS" : /windows/i.test(ua) ? "Windows" : /linux/i.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

function ChangeEmailForm({ onDone }: { onDone: () => void }) {
  const me = useMe();
  const qc = useQueryClient();
  const [email, setEmail] = useState(me.email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await changeEmail(email, password);
      await qc.invalidateQueries({ queryKey: meKey });
      toast("Email updated ✓");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? { message: err.message, field: err.field } : { message: errorMessage(err) });
      setBusy(false);
    }
  };
  return (
    <DialogForm title="Change Email" onClose={onDone} onSubmit={submit}>
      <Input label="New email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error?.field === "email" ? error.message : undefined} />
      {me.hasPassword && (
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error?.field === "password" ? error.message : undefined} />
      )}
      {error && !error.field && <FormError message={error.message} />}
      <Button type="submit" size="lg" loading={busy} disabled={!email || (me.hasPassword && !password)}>
        Update email
      </Button>
    </DialogForm>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const me = useMe();
  const qc = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return setError({ message: "Passwords don't match.", field: "confirm" });
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      qc.invalidateQueries({ queryKey: meKey });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast("Password changed ✓ Other devices were signed out.");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? { message: err.message, field: err.field } : { message: errorMessage(err) });
      setBusy(false);
    }
  };

  return (
    <DialogForm title={me.hasPassword ? "Change Password" : "Set a Password"} onClose={onDone} onSubmit={submit}>
      {me.hasPassword && (
        <Input label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={error?.field === "current" ? error.message : undefined} />
      )}
      <Input label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="At least 8 characters" error={error?.field === "next" ? error.message : undefined} />
      <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={error?.field === "confirm" ? error.message : undefined} />
      {error && !error.field && <FormError message={error.message} />}
      <Button type="submit" size="lg" loading={busy} disabled={(me.hasPassword && !current) || !next || !confirm}>
        Update password
      </Button>
    </DialogForm>
  );
}

function DeleteAccountForm({ onCancel }: { onCancel: () => void }) {
  const me = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password, confirm);
      qc.clear();
      qc.setQueryData(meKey, null);
      toast("Your account was deleted", "info");
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? { message: err.message, field: err.field } : { message: errorMessage(err) });
      setBusy(false);
    }
  };

  return (
    <DialogForm title="Delete Account" danger onClose={onCancel} onSubmit={submit}>
      <p className="text-sm text-muted">This permanently deletes your profile, map, trips and photos. It can&apos;t be undone.</p>
      <Input
        label={`Type your username (${me.username}) to confirm`}
        autoComplete="off"
        autoCapitalize="none"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={error?.field === "confirm" ? error.message : undefined}
      />
      {me.hasPassword && (
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error?.field === "password" ? error.message : undefined} />
      )}
      {error && !error.field && <FormError message={error.message} />}
      <div className="flex gap-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" size="lg" className="flex-1" loading={busy} disabled={confirm.toLowerCase() !== me.username.toLowerCase() || (me.hasPassword && !password)}>
          Delete forever
        </Button>
      </div>
    </DialogForm>
  );
}

function DialogForm({
  title,
  danger,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 overflow-y-auto px-6 pt-4 pb-6" noValidate>
      <div className="flex items-center justify-between">
        <h2 className={cn("text-lg font-bold", danger && "text-danger")}>{title}</h2>
        <SheetClose onClick={onClose} className="-mr-2" />
      </div>
      {children}
    </form>
  );
}

function Group({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`settings-${title}`} className="scroll-mt-20">
      <h2 id={`settings-${title}`} className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">
        {title}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">{children}</div>
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-4 px-4 py-3.5">{children}</div>;
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </Row>
  );
}

const rowClass = "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition duration-200 hover:bg-surface-2";

function RowLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className={rowClass}>
      <span className="text-muted" aria-hidden>
        {icon}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight className="size-5 text-muted" aria-hidden />
    </Link>
  );
}

function RowButton({ icon, label, hint, onClick, danger }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn(rowClass, danger && "text-danger")}>
      <span className={danger ? "" : "text-muted"} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block truncate text-sm text-muted">{hint}</span>}
      </span>
      <ChevronRight className="size-5 text-muted" aria-hidden />
    </button>
  );
}
