"use client";

import { ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CountrySearch } from "@/components/country-search";
import { Photo } from "@/components/photo";
import { Button, FormError, Input, Sheet, SheetClose, Skeleton, Textarea } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useUserMap } from "@/features/map/api";
import { ApiError, errorMessage } from "@/lib/api-client";
import { getCountry } from "@/lib/countries";
import type { Photo as PhotoType, Trip } from "@/lib/types";
import { closeTripEditor, pulseCountry, toast, useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { discardPhoto, uploadPhoto, useDeleteTrip, useSaveTrip, useTrip } from "./api";

const MAX_PHOTOS = 30;
const UPLOAD_CONCURRENCY = 3;

// The open form registers its cancel handler so Escape / backdrop clicks go through it.
let requestCancel: () => void = closeTripEditor;

export function TripEditor() {
  const editor = useUI((s) => s.tripEditor);
  const key = editor ? (editor.tripId ?? `new-${editor.country ?? ""}`) : "closed";
  return (
    <Sheet open={Boolean(editor)} onClose={() => requestCancel()} label="Trip editor" z={60} className="sm:max-w-xl">
      {editor && (editor.tripId ? <EditExisting key={key} tripId={editor.tripId} /> : <TripForm key={key} presetCountry={editor.country} />)}
    </Sheet>
  );
}

function EditExisting({ tripId }: { tripId: string }) {
  const { data, isPending, isError, refetch } = useTrip(tripId);
  if (isPending)
    return (
      <div className="grid gap-4 p-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-28" />
      </div>
    );
  if (isError)
    return (
      <div className="p-6 text-center">
        <p className="mb-4 text-danger">Couldn&apos;t load this trip.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  return <TripForm trip={data} />;
}

/** A photo slot: an uploaded photo, or an upload in flight (kept in selection order). */
interface Slot {
  key: string;
  name: string;
  photo?: PhotoType;
}

function TripForm({ trip, presetCountry }: { trip?: Trip; presetCountry?: string }) {
  const router = useRouter();
  const me = useMe();
  const statuses = useUserMap(me.username).data?.statuses;
  const save = useSaveTrip(me.username);
  const del = useDeleteTrip(me.username);

  const [country, setCountry] = useState(trip?.countryCode ?? presetCountry ?? "");
  const [title, setTitle] = useState(trip?.title ?? "");
  const [startDate, setStartDate] = useState(trip?.startDate ?? "");
  const [endDate, setEndDate] = useState(trip?.endDate ?? "");
  const [cities, setCities] = useState(trip?.cities.join(", ") ?? "");
  const [notes, setNotes] = useState(trip?.description ?? "");
  const [slots, setSlots] = useState<Slot[]>(() => (trip?.photos ?? []).map((p) => ({ key: p.id, name: "", photo: p })));
  const photos = slots.flatMap((s) => (s.photo ? [s.photo] : []));
  const uploading = slots.filter((s) => !s.photo);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Uploaded in this session but not saved yet — discarded on cancel.
  const fresh = useRef<string[]>([]);

  const c = getCountry(country);
  const canChangeCountry = !presetCountry || Boolean(trip);

  const isDirty = () =>
    fresh.current.length > 0 ||
    title !== (trip?.title ?? "") ||
    notes !== (trip?.description ?? "") ||
    startDate !== (trip?.startDate ?? "") ||
    endDate !== (trip?.endDate ?? "") ||
    photos.map((p) => p.id).join() !== (trip?.photos ?? []).map((p) => p.id).join();

  const cancel = () => {
    if (isDirty() && !window.confirm("Discard your changes to this trip?")) return;
    fresh.current.forEach((id) => discardPhoto(id).catch(() => {}));
    closeTripEditor();
  };
  useEffect(() => {
    requestCancel = cancel;
  });

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const room = MAX_PHOTOS - slots.length;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (files.length > room) toast(`Up to ${MAX_PHOTOS} photos per trip`, "info");
    const queue = files.slice(0, Math.max(0, room)).map((file) => ({ file, key: crypto.randomUUID() }));
    // Reserve slots now so photos keep the order they were picked in, whatever finishes first.
    setSlots((s) => [...s, ...queue.map(({ key, file }) => ({ key, name: file.name }))]);

    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { file, key } = next;
        try {
          const photo = await uploadPhoto(file);
          fresh.current.push(photo.id);
          setSlots((s) => s.map((x) => (x.key === key ? { ...x, photo } : x)));
        } catch (e) {
          setSlots((s) => s.filter((x) => x.key !== key));
          toast(`${file.name}: ${errorMessage(e)}`, "error");
        }
      }
    };
    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));
  };

  const removePhoto = (id: string) => {
    setSlots((s) => s.filter((x) => x.photo?.id !== id));
    if (fresh.current.includes(id)) {
      fresh.current = fresh.current.filter((x) => x !== id);
      discardPhoto(id).catch(() => {});
    }
  };
  const makeCover = (id: string) =>
    setSlots((s) => [...s.filter((x) => x.photo?.id === id), ...s.filter((x) => x.photo?.id !== id)]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!country) return setError({ message: "Choose a country for this trip.", field: "countryCode" });
    const year = (startDate || endDate).slice(0, 4);
    save.mutate(
      {
        id: trip?.id,
        input: {
          countryCode: country,
          title: title.trim() || `${c?.name ?? country}${year ? ` ${year}` : ""}`,
          description: notes,
          cities: cities
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          startDate: startDate || null,
          endDate: endDate || null,
          photoIds: photos.map((p) => p.id),
        },
      },
      {
        onSuccess: (saved) => {
          fresh.current = [];
          closeTripEditor();
          pulseCountry(saved.countryCode);
          toast(trip ? "Trip updated ✓" : `Trip added to ${c?.name ?? "your world"} ✓`);
          if (!trip && !presetCountry) router.push(`/trips/${saved.id}`);
        },
        onError: (err) =>
          setError(err instanceof ApiError ? { message: err.message, field: err.field } : { message: errorMessage(err) }),
      },
    );
  };

  const remove = () => {
    if (!trip) return;
    del.mutate(trip, {
      onSuccess: () => {
        closeTripEditor();
        toast("Trip deleted", "info");
        router.replace("/trips");
      },
      onError: (err) => setError({ message: errorMessage(err) }),
    });
  };

  const fieldError = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex items-center justify-between px-6 pt-4 pb-3">
        <h2 className="text-lg font-bold">{trip ? "Edit Trip" : "Add Trip"}</h2>
        <SheetClose onClick={cancel} className="-mr-2" />
      </div>

      <div className="grid gap-5 overflow-y-auto px-6 pb-6">
        <div>
          <p className="mb-1.5 text-sm font-medium">Country</p>
          {c && !canChangeCountry ? (
            <div className="flex h-12 items-center gap-2.5 rounded-xl bg-surface-2 px-3.5 font-semibold">
              <span className="text-xl" aria-hidden>
                {c.flag}
              </span>{" "}
              {c.name}
            </div>
          ) : c ? (
            <div className="flex h-12 items-center gap-2.5 rounded-xl border border-border px-3.5 font-semibold">
              <span className="text-xl" aria-hidden>
                {c.flag}
              </span>
              <span className="flex-1">{c.name}</span>
              <button type="button" className="min-h-11 px-2 text-sm text-brand hover:underline" onClick={() => setCountry("")}>
                Change
              </button>
            </div>
          ) : (
            <>
              <CountrySearch autoFocus onPick={(p) => setCountry(p.code)} statuses={statuses} placeholder="Where did you go?" />
              {fieldError("countryCode") && <p className="mt-1.5 text-sm text-danger">{fieldError("countryCode")}</p>}
            </>
          )}
        </div>

        <Input
          label="Trip title"
          optional
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={c ? `${c.name} Adventure` : "My adventure"}
          maxLength={80}
          error={fieldError("title")}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date" optional type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} error={fieldError("startDate")} />
          <Input
            label="End date"
            optional
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            error={fieldError("endDate")}
          />
        </div>

        <Input
          label="Cities"
          optional
          value={cities}
          onChange={(e) => setCities(e.target.value)}
          placeholder={c?.capital ? `${c.capital}, …` : "Tokyo, Kyoto, Osaka"}
          hint="Separate with commas"
        />

        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
            Photos
            <span className="text-xs font-normal text-muted">
              {photos.length > 0 ? `${photos.length} · first is the cover` : "Optional"}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {slots.map((slot, i) =>
              !slot.photo ? (
                <div key={slot.key} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-surface-2 px-1" role="status" aria-label={`Uploading ${slot.name}`}>
                  <Loader2 className="size-5 animate-spin text-brand-bright" />
                  <span className="w-full truncate text-center text-[10px] text-muted">{slot.name}</span>
                </div>
              ) : (
              <PhotoSlot key={slot.key} photo={slot.photo} index={i} onCover={makeCover} onRemove={removePhoto} />
              ),
            )}
            {slots.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted transition duration-200 hover:border-brand hover:text-brand",
                  slots.length === 0 ? "col-span-full h-24" : "aspect-square",
                )}
              >
                <ImagePlus className="size-5" aria-hidden />
                <span className="text-xs font-semibold">Add Photos</span>
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <Textarea
          label="Notes"
          optional
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tell us about your trip…"
          maxLength={4000}
          error={fieldError("description")}
        />

        {error && !["countryCode", "endDate", "startDate", "title", "description"].includes(error.field ?? "") && (
          <FormError message={error.message} />
        )}

        {trip && (
          <div className="rounded-2xl border border-border p-4">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">Delete this trip and its photos? This can&apos;t be undone.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </Button>
                  <Button size="sm" variant="danger" onClick={remove} loading={del.isPending}>
                    Delete trip
                  </Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-danger">
                <Trash2 className="size-4" aria-hidden /> Delete trip
              </button>
            )}
          </div>
        )}
      </div>

      <div className="pb-safe flex gap-3 border-t border-border bg-surface px-6 py-4">
        <Button variant="secondary" size="lg" className="flex-1" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" className="flex-1" loading={save.isPending} disabled={uploading.length > 0}>
          {uploading.length > 0 ? "Uploading…" : "Save Trip"}
        </Button>
      </div>
    </form>
  );
}

function PhotoSlot({
  photo,
  index,
  onCover,
  onRemove,
}: {
  photo: PhotoType;
  index: number;
  onCover: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl">
      <Photo photo={photo} className="size-full" emojiSize="text-2xl" />
      {index === 0 && (
        <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">Cover</span>
      )}
      <div className="absolute top-1 right-1 flex gap-1 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {index > 0 && (
          <button
            type="button"
            aria-label="Make cover photo"
            title="Make cover"
            onClick={() => onCover(photo.id)}
            className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <Star className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          aria-label="Remove photo"
          onClick={() => onRemove(photo.id)}
          className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
