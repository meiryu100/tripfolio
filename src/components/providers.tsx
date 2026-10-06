"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { meKey, useMeQuery } from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";
import type { Theme } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";

function makeClient() {
  // A 401 anywhere means the session ended (expired, or signed out on another device).
  const onError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) client.setQueryData(meKey, null);
  };
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
  return client;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}

export function applyTheme(theme: Theme) {
  try {
    localStorage.setItem("travora-theme", theme);
  } catch {}
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Keeps <html class="dark"> in sync with the signed-in user's preference and the OS. */
function ThemeSync() {
  const theme = useMeQuery().data?.settings.theme;
  useEffect(() => {
    const current = theme ?? (localStorage.getItem("travora-theme") as Theme | null) ?? "system";
    applyTheme(current);
    if (current !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);
  return null;
}

function Toaster() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cn(
            "animate-toast pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-float",
            t.tone === "error" ? "bg-danger text-white" : "glass border border-border text-fg",
          )}
        >
          {t.tone === "success" && <CheckCircle2 className="size-4.5 shrink-0 text-visited" />}
          {t.tone === "info" && <Info className="size-4.5 shrink-0 text-brand-bright" />}
          {t.tone === "error" && <AlertTriangle className="size-4.5 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
