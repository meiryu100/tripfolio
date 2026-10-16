"use client";

import { useProviders } from "@/features/auth/api";

const buttonClass =
  "flex h-12 w-full items-center justify-center gap-3 rounded-xl text-[15px] font-semibold shadow-soft transition duration-200 active:shadow-pressed";

/**
 * "Continue with Google / Facebook", each shown only when that provider is configured on the
 * server, then an "or" divider before the email form. `invite` (a username) keeps an invite through sign-in.
 */
export function SocialButtons({ verb = "Continue", invite }: { verb?: string; invite?: string | null }) {
  const { data } = useProviders();
  if (!data?.google && !data?.facebook) return null;
  const query = invite ? `?ref=${encodeURIComponent(invite)}` : "";
  return (
    <>
      <div className="grid gap-3">
        {data.google && (
          <a href={`/api/auth/google${query}`} className={`${buttonClass} border border-border bg-surface hover:bg-surface-2`}>
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.2s2.69-6.2 6-6.2c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.66 0 9.4-3.98 9.4-9.58 0-.64-.07-1.13-.16-1.62H12z" />
            </svg>
            {verb} with Google
          </a>
        )}
        {data.facebook && (
          <a href={`/api/auth/facebook${query}`} className={`${buttonClass} bg-[#1877F2] text-white hover:bg-[#166FE5]`}>
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="currentColor" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
            </svg>
            {verb} with Facebook
          </a>
        )}
      </div>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
