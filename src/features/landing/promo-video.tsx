"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The 10-second promo video (no audio): plays muted on a loop, like a GIF. With reduced motion
 * it stays on the poster and shows controls instead.
 */
export function PromoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(query.matches);
      const video = ref.current;
      if (!video) return;
      if (query.matches) video.pause();
      else video.play().catch(() => {});
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    <video
      ref={ref}
      src="/media/promo.mp4"
      poster="/media/promo-poster.jpg"
      width={1280}
      height={720}
      muted
      loop
      playsInline
      preload="metadata"
      controls={reduced}
      aria-label="Tripfolio in 10 seconds: a world map filling with visited and wishlist countries, travel stats, a trip with photos, and the US states map"
      className="aspect-video w-full rounded-3xl border border-border bg-surface shadow-card"
    />
  );
}
