"use client";

import { useProviders } from "@/features/auth/api";

/** Shown only when Google OAuth is configured on the server. */
export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const { data } = useProviders();
  if (!data?.google) return null;
  return (
    <>
      <a
        href="/api/auth/google"
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface text-[15px] font-semibold shadow-soft transition duration-200 hover:bg-surface-2 active:shadow-pressed"
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.2s2.69-6.2 6-6.2c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.66 0 9.4-3.98 9.4-9.58 0-.64-.07-1.13-.16-1.62H12z" />
        </svg>
        {label}
      </a>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
