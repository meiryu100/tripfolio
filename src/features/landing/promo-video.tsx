"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The 10-second promo video (no audio): plays muted on a loop, like a GIF. It's below the fold, so
 * nothing is downloaded until it scrolls near the screen. With reduced motion it stays on the
 * poster and shows controls instead.
 */
export function PromoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const apply = () => {
      setReduced(query.matches);
      if (query.matches || !visible) video.pause();
      else video.play().catch(() => {});
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        apply();
      },
      { rootMargin: "200px" },
    );
    observer.observe(video);
    query.addEventListener("change", apply);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", apply);
    };
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
      preload="none"
      controls={reduced}
      aria-label="Tripfolio in 10 seconds: a world map filling with visited and wishlist countries, travel stats, a trip with photos, and the US states map"
      className="aspect-video w-full rounded-3xl border border-border bg-surface shadow-card"
    />
  );
}
