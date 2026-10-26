"use client";

import { useEffect, useRef, useState } from "react";

const VIDEOS = {
  short: {
    src: "/media/promo.mp4",
    poster: "/media/promo-poster.jpg",
    label: "Tripfolio in 10 seconds: a world map filling with visited and wishlist countries, travel stats, a trip with photos, and the US states map",
  },
  long: {
    src: "/media/promo-25s.mp4",
    poster: "/media/promo-25s-poster.jpg",
    label: "Tripfolio in 25 seconds: travel photos, the home page, a world map filling with visited and wishlist countries, a trip with photos, travel stats and the US states map",
  },
};

/**
 * A promo video without sound: the 10-second one, or the 25-second one with its soundtrack removed.
 * Plays muted on a loop, like a GIF. It's below the fold, so nothing is downloaded until it scrolls
 * near the screen. With reduced motion it stays on the
 * poster and shows controls instead.
 */
export function PromoVideo({ version = "short" }: { version?: keyof typeof VIDEOS }) {
  const promo = VIDEOS[version];
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
      src={promo.src}
      poster={promo.poster}
      width={1280}
      height={720}
      muted
      loop
      playsInline
      preload="none"
      controls={reduced}
      aria-label={promo.label}
      className="aspect-video w-full rounded-3xl border border-border bg-surface shadow-card"
    />
  );
}
