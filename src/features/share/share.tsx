"use client";

import { Copy, Download, MessageCircle, Share2, UserPlus } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Button, Sheet, SheetClose, buttonClass } from "@/components/ui";
import { toast } from "@/lib/ui";
import { cn } from "@/lib/utils";

/**
 * Sharing and inviting. Both point at the public profile (/u/<username>): its link
 * preview is the share card, and its "Join" button signs people up as invited by
 * this user (they start out following them).
 */

const imageUrl = (username: string) => `/api/users/${username}/share-image`;

const noSubscribe = () => () => {};

/** The public profile link and whether the device has a share sheet (browser-only values). */
function useShareTarget(username: string) {
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const canNativeShare = useSyncExternalStore(noSubscribe, () => "share" in navigator, () => false);
  return { url: `${origin}/u/${username}`, canNativeShare };
}

function whatsappHref(text: string, url: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied");
  } catch {
    toast("Couldn't copy — select the link and copy it yourself.", "error");
  }
}

/** Native share sheet (phones): with the card image when the device supports files. */
async function nativeShare({ text, url, image, filename }: { text: string; url: string; image?: string; filename?: string }) {
  try {
    if (image && navigator.canShare) {
      const blob = await fetch(image).then((r) => r.blob());
      const file = new File([blob], filename ?? "tripfolio.png", { type: blob.type || "image/png" });
      if (navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], text: `${text} ${url}` });
    }
    await navigator.share({ text, url });
  } catch (err) {
    // Closing the share sheet isn't an error.
    if ((err as Error)?.name !== "AbortError") toast("Couldn't open sharing on this device.", "error");
  }
}

function ActionButton({ onClick, href, download, icon, children }: { onClick?: () => void; href?: string; download?: string; icon: ReactNode; children: ReactNode }) {
  const cls = buttonClass("secondary", "md", "w-full justify-start gap-3");
  return href ? (
    <a href={href} download={download} target={download ? undefined : "_blank"} rel="noopener noreferrer" className={cls}>
      {icon}
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      {children}
    </button>
  );
}

/** "Share my map": preview of the card plus WhatsApp, copy link, download and the device's share sheet. */
export function ShareProfileButton({ username, className }: { username: string; className?: string }) {
  const [open, setOpen] = useState(false);
  // Bust the cache each time the sheet opens so the card shows the latest map.
  const [version, setVersion] = useState(0);
  const image = `${imageUrl(username)}?v=${version}`;
  const text = "My travel map on Tripfolio 🌍";
  const { url, canNativeShare } = useShareTarget(username);

  return (
    <>
      <Button
        variant="secondary"
        className={className}
        onClick={() => {
          setVersion(Date.now());
          setOpen(true);
        }}
      >
        <Share2 className="size-4" /> Share
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Share your map">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Share your map</h2>
            <p className="text-sm text-muted">Friends who open the link see your map and can join you.</p>
          </div>
          <SheetClose onClick={() => setOpen(false)} className="-mt-1 -mr-2" />
        </div>
        <div className="grid gap-4 px-6 pb-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated on the fly, not a static asset */}
          <img src={image} alt="Your share card: your name, travel stats and world map" width={1200} height={630} className="aspect-[1200/630] w-full rounded-xl border border-border bg-surface-2" />
          <div className="grid gap-2 sm:grid-cols-2">
            {canNativeShare && (
              <ActionButton onClick={() => nativeShare({ text, url, image, filename: `tripfolio-${username}.png` })} icon={<Share2 className="size-4.5" />}>
                Share…
              </ActionButton>
            )}
            <ActionButton href={whatsappHref(text, url)} icon={<MessageCircle className="size-4.5" />}>
              WhatsApp
            </ActionButton>
            <ActionButton onClick={() => copyLink(url)} icon={<Copy className="size-4.5" />}>
              Copy link
            </ActionButton>
            <ActionButton href={image} download={`tripfolio-${username}.png`} icon={<Download className="size-4.5" />}>
              Download image
            </ActionButton>
          </div>
        </div>
      </Sheet>
    </>
  );
}

/** Invite friends who aren't on Tripfolio yet. */
export function InviteCard({ username, className }: { username: string; className?: string }) {
  const text = "Join me on Tripfolio — map the countries you've been to and want to visit 🌍";
  const { url, canNativeShare } = useShareTarget(username);
  return (
    <section className={cn("rounded-2xl border border-border bg-surface p-5 shadow-card", className)} aria-labelledby="invite-title">
      <div className="flex items-start gap-3">
        <span className="bg-aurora flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-glow" aria-hidden>
          <UserPlus className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="invite-title" className="font-bold">
            Invite friends
          </h2>
          <p className="text-sm text-muted">Tripfolio is better with friends. Anyone who joins from your link follows you automatically.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={whatsappHref(text, url)} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
          <MessageCircle className="size-4" /> WhatsApp
        </a>
        <Button variant="secondary" onClick={() => copyLink(url)}>
          <Copy className="size-4" /> Copy link
        </Button>
        {canNativeShare && (
          <Button variant="secondary" onClick={() => nativeShare({ text, url })}>
            <Share2 className="size-4" /> More
          </Button>
        )}
      </div>
    </section>
  );
}
