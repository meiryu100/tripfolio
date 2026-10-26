"use client";

import { Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui";

/**
 * A one-time card on phones: "Add Tripfolio to your home screen". Android/Chrome gets the
 * browser's own install prompt (beforeinstallprompt); iPhone has no prompt, so it shows the
 * Share → "Add to Home Screen" steps. Hidden once installed, on desktop, or after "Not now".
 */
export const INSTALL_HINT_KEY = "tripfolio-install-hint";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Chrome can fire the event before React mounts the card, so catch it as soon as this module loads.
let deferred: InstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
  });
}

function shouldShow() {
  try {
    if (localStorage.getItem(INSTALL_HINT_KEY)) return false;
  } catch {
    return false;
  }
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  const phone = matchMedia("(max-width: 767px) and (pointer: coarse)").matches;
  return phone && !standalone;
}

export function InstallHint() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    // Give the page a moment first, so the card doesn't land on top of a first impression.
    const t = setTimeout(() => {
      setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
      setShow(shouldShow());
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  function close() {
    try {
      localStorage.setItem(INSTALL_HINT_KEY, "dismissed");
    } catch {}
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    close();
  }

  if (!show) return null;
  return (
    <div role="dialog" aria-label="Add Tripfolio to your home screen" className="animate-rise fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-float">
        <SquarePlus className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">Add Tripfolio to your home screen</p>
          {ios ? (
            <p className="mt-1 text-muted">
              Tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> in Safari, then &ldquo;Add to Home Screen&rdquo;. It opens like an app.
            </p>
          ) : deferred ? (
            <p className="mt-1 text-muted">One tap and it opens like an app, full screen.</p>
          ) : (
            <p className="mt-1 text-muted">Open your browser menu (⋮), then &ldquo;Add to Home screen&rdquo;. It opens like an app.</p>
          )}
          <div className="mt-3 flex gap-2">
            {!ios && deferred && (
              <Button size="sm" onClick={install}>
                Add to home screen
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={close}>
              Not now
            </Button>
          </div>
        </div>
        <button type="button" onClick={close} aria-label="Close" className="-m-1 rounded-full p-1 text-muted hover:text-fg">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
