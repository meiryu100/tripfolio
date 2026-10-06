"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import type { Photo as PhotoType } from "@/lib/types";
import { cn } from "@/lib/utils";

const isSeed = (src: string) => src.startsWith("seed:");

/** A trip photo from storage, or an illustrated cover for seeded demo data. */
export function Photo({
  photo,
  size = "thumb",
  className,
  emojiSize = "text-5xl",
  alt = "",
  eager,
}: {
  photo: PhotoType | null | undefined;
  size?: "thumb" | "full";
  className?: string;
  emojiSize?: string;
  alt?: string;
  eager?: boolean;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const src = photo ? (size === "full" ? photo.src : photo.thumb) : null;

  if (src && isSeed(src)) {
    const [, emoji, hueStr] = src.split(":");
    const hue = Number(hueStr) || 200;
    return (
      <div
        role="img"
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={cn("flex items-center justify-center overflow-hidden", className)}
        style={{
          background: `radial-gradient(120% 90% at 20% 10%, hsl(${hue} 85% 78%), transparent 60%), linear-gradient(135deg, hsl(${hue} 60% 58%), hsl(${(hue + 40) % 360} 55% 40%))`,
        }}
      >
        <span className={cn("drop-shadow-lg", emojiSize)}>{emoji}</span>
      </div>
    );
  }

  if (!src || state === "error") {
    return (
      <div className={cn("flex items-center justify-center bg-surface-2 text-muted", className)}>
        {state === "error" && <ImageOff className="size-6" aria-label="Photo unavailable" />}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-surface-2", state === "loading" && "animate-pulse", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- served by our authorized photo route */}
      <img
        src={src}
        alt={alt}
        width={photo?.width ?? undefined}
        height={photo?.height ?? undefined}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className={cn(
          "size-full object-cover transition-opacity duration-300",
          state === "loaded" ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

/** Cover for a trip; falls back to a soft gradient with the country flag. */
export function TripCover({
  photo,
  flag,
  className,
  size = "thumb",
  eager,
}: {
  photo: PhotoType | null | undefined;
  flag: string;
  className?: string;
  size?: "thumb" | "full";
  eager?: boolean;
}) {
  if (photo) return <Photo photo={photo} size={size} className={className} eager={eager} />;
  return (
    <div className={cn("flex items-center justify-center bg-gradient-to-br from-brand-soft to-ai-soft", className)}>
      <span className="text-5xl" aria-hidden>
        {flag}
      </span>
    </div>
  );
}

/** An illustrated cover (for marketing/demo surfaces). */
export const illustration = (emoji: string, hue: number): PhotoType => {
  const src = `seed:${emoji}:${hue}`;
  return { id: src, src, thumb: src, isCover: true, width: null, height: null };
};
