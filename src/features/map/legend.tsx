"use client";

import { cn } from "@/lib/utils";

export function MapLegend({
  className,
  photos,
  onTogglePhotos,
  compact,
}: {
  className?: string;
  /** Phones: one small row, without "Not visited" (the plain land color speaks for itself). */
  compact?: boolean;
  photos?: boolean;
  onTogglePhotos?: () => void;
}) {
  const items = [
    { label: "Visited", color: "var(--visited-fill)" },
    { label: "Want to visit", color: "var(--wishlist-fill)" },
    { label: "Not visited", color: "var(--land)", hideCompact: true },
  ];
  return (
    <div
      className={cn(
        "glass flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border px-3 py-2 text-xs text-muted shadow-card",
        compact && "max-md:gap-x-2 max-md:px-2.5 max-md:py-1.5 max-md:text-[11px]",
        className,
      )}
    >
      {items.map((i) => (
        <span key={i.label} className={cn("flex items-center gap-1.5", compact && i.hideCompact && "max-md:hidden")}>
          <span className="size-2.5 rounded-full ring-1 ring-black/5" style={{ background: i.color }} aria-hidden />
          {i.label}
        </span>
      ))}
      {onTogglePhotos && (
        <button
          onClick={onTogglePhotos}
          aria-pressed={photos}
          className={cn(
            "-my-1 flex min-h-8 items-center gap-1.5 rounded-lg px-1.5 transition duration-200",
            compact && "max-md:-mx-1",
            photos ? "bg-brand-soft text-brand" : "hover:text-fg",
          )}
        >
          <span className="size-2.5 rounded-full border-2" style={{ borderColor: "var(--photo-stroke)" }} aria-hidden />
          With photos
        </button>
      )}
    </div>
  );
}
