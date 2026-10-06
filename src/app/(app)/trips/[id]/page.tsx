"use client";

import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Page } from "@/components/app-shell";
import { BackLink } from "@/components/cards";
import { Photo, TripCover } from "@/components/photo";
import { Avatar, Button, ErrorState, NotFound, Skeleton } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useTrip } from "@/features/trips/api";
import { ApiError } from "@/lib/api-client";
import { getCountry } from "@/lib/countries";
import type { Photo as PhotoType } from "@/lib/types";
import { openTripEditor } from "@/lib/ui";
import { formatDateRange, plural } from "@/lib/utils";

export default function TripDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const { data: trip, isPending, isError, error, refetch } = useTrip(id);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (isPending) {
    return (
      <Page>
        <Skeleton className="mb-4 h-6 w-24" />
        <Skeleton className="aspect-[16/9] w-full rounded-3xl" />
        <Skeleton className="mt-6 h-9 w-2/3" />
        <Skeleton className="mt-3 h-5 w-1/2" />
      </Page>
    );
  }
  if (isError) {
    return (
      <Page>
        {error instanceof ApiError && error.status === 404 ? (
          <NotFound title="Trip not found" body="It may have been deleted, or it belongs to a private profile." />
        ) : (
          <ErrorState body="We couldn't load this trip." onRetry={() => refetch()} />
        )}
      </Page>
    );
  }

  const c = getCountry(trip.countryCode);
  const isMine = trip.userId === me.id;
  const dates = formatDateRange(trip.startDate, trip.endDate, true);
  const photos = trip.photos ?? [];

  return (
    <Page back={<BackLink fallback={isMine ? "/trips" : `/u/${trip.author?.username ?? ""}`} label={c?.name ?? "Back"} />}>
      <div className="overflow-hidden rounded-3xl border border-border shadow-card">
        <button
          className="block w-full"
          onClick={() => photos.length && setLightbox(0)}
          aria-label={photos.length ? "Open cover photo" : undefined}
          disabled={!photos.length}
        >
          <TripCover photo={trip.cover} size="full" eager flag={c?.flag ?? "🌍"} className="aspect-[16/9] w-full [&>span]:text-8xl" />
        </button>
      </div>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/explore/${trip.countryCode.toLowerCase()}`} className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
            <span className="text-lg leading-none" aria-hidden>
              {c?.flag}
            </span>{" "}
            {c?.name}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{trip.title || c?.name}</h1>
          {dates && (
            <p className="mt-2 flex items-center gap-1.5 text-muted">
              <CalendarDays className="size-4" aria-hidden /> {dates}
            </p>
          )}
          {trip.cities.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-muted">
              <MapPin className="size-4" aria-hidden /> {trip.cities.join(" → ")}
            </p>
          )}
        </div>
        {isMine && (
          <Button variant="secondary" onClick={() => openTripEditor({ tripId: trip.id })} className="hidden sm:inline-flex">
            <Pencil className="size-4" /> Edit Trip
          </Button>
        )}
      </div>

      {!isMine && trip.author && (
        <Link href={`/u/${trip.author.username}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 py-1 pr-4 pl-1 text-sm font-medium">
          <Avatar user={trip.author} size={32} /> {trip.author.firstName} {trip.author.lastName}
        </Link>
      )}

      {trip.description && (
        <blockquote className="context-card mt-6 rounded-r-2xl px-5 py-4 text-lg leading-relaxed whitespace-pre-line">
          “{trip.description}”
        </blockquote>
      )}

      <section className="mt-8" aria-labelledby="gallery">
        <h2 id="gallery" className="mb-3 text-xl font-bold">
          Photos <span className="text-sm font-normal text-muted">· {plural(photos.length, "photo")}</span>
        </h2>
        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted">
            No photos yet.
            {isMine && (
              <button className="ml-1 font-semibold text-brand hover:underline" onClick={() => openTripEditor({ tripId: trip.id })}>
                Add some
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((p, i) => (
              <button key={p.id} onClick={() => setLightbox(i)} className="overflow-hidden rounded-xl" aria-label={`Open photo ${i + 1} of ${photos.length}`}>
                <Photo photo={p} className="aspect-square w-full transition duration-300 hover:scale-[1.03]" />
              </button>
            ))}
          </div>
        )}
      </section>

      {isMine && (
        <Button variant="secondary" size="lg" className="mt-8 w-full sm:hidden" onClick={() => openTripEditor({ tripId: trip.id })}>
          <Pencil className="size-4" /> Edit Trip
        </Button>
      )}

      {lightbox !== null && <Lightbox photos={photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />}
    </Page>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: PhotoType[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const n = photos.length;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndex((index - 1 + n) % n);
      if (e.key === "ArrowRight") onIndex((index + 1) % n);
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, n, onClose, onIndex]);

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="animate-fade fixed inset-0 z-[70] flex items-center justify-center bg-black/90" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <Photo key={photos[index].id} photo={photos[index]} size="full" eager className="h-[78dvh] w-[92vw] max-w-5xl rounded-xl bg-transparent [&_img]:object-contain" emojiSize="text-9xl" />
      </div>
      <button aria-label="Close" autoFocus className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white" onClick={onClose}>
        <X className="size-6" />
      </button>
      {n > 1 && (
        <>
          <button aria-label="Previous photo" className="absolute left-3 flex size-12 items-center justify-center rounded-full bg-white/10 text-white" onClick={stop(() => onIndex((index - 1 + n) % n))}>
            <ChevronLeft className="size-7" />
          </button>
          <button aria-label="Next photo" className="absolute right-3 flex size-12 items-center justify-center rounded-full bg-white/10 text-white" onClick={stop(() => onIndex((index + 1) % n))}>
            <ChevronRight className="size-7" />
          </button>
          <p className="absolute bottom-5 text-sm text-white/70" aria-live="polite">
            {index + 1} / {n}
          </p>
        </>
      )}
    </div>,
    document.body,
  );
}
