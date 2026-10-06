"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, qs } from "@/lib/api-client";
import type { Page, Photo, Trip } from "@/lib/types";
import { resizeImage } from "@/lib/utils";

export const tripsKey = (username: string, country?: string) =>
  ["trips", username.toLowerCase(), country ?? "all"] as const;
export const tripKey = (id: string) => ["trip", id] as const;

export function useUserTrips(username: string | undefined, opts: { country?: string; limit?: number } = {}) {
  return useInfiniteQuery({
    queryKey: tripsKey(username ?? "", opts.country),
    queryFn: ({ pageParam }) =>
      api.get<Page<Trip>>(
        `/api/users/${encodeURIComponent(username!)}/trips${qs({ cursor: pageParam, country: opts.country, limit: opts.limit })}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(username),
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKey(id),
    queryFn: () => api.get<{ trip: Trip }>(`/api/trips/${id}`).then((r) => r.trip),
  });
}

export interface TripInput {
  countryCode: string;
  title: string;
  description: string;
  cities: string[];
  startDate: string | null;
  endDate: string | null;
  photoIds: string[];
}

function useInvalidateTrips(username: string) {
  const qc = useQueryClient();
  return (country?: string) => {
    qc.invalidateQueries({ queryKey: ["trips", username.toLowerCase()] });
    qc.invalidateQueries({ queryKey: ["map", username.toLowerCase()] });
    qc.invalidateQueries({ queryKey: ["profile", username.toLowerCase()] });
    if (country) qc.invalidateQueries({ queryKey: ["country", country] });
  };
}

export function useSaveTrip(username: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateTrips(username);
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TripInput }) =>
      (id ? api.patch<{ trip: Trip }>(`/api/trips/${id}`, input) : api.post<{ trip: Trip }>("/api/trips", input)).then(
        (r) => r.trip,
      ),
    onSuccess: (trip) => {
      qc.setQueryData(tripKey(trip.id), trip);
      invalidate(trip.countryCode);
    },
  });
}

export function useDeleteTrip(username: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateTrips(username);
  return useMutation({
    mutationFn: (trip: Trip) => api.delete(`/api/trips/${trip.id}`),
    onSuccess: (_d, trip) => {
      qc.removeQueries({ queryKey: tripKey(trip.id) });
      invalidate(trip.countryCode);
    },
  });
}

/** Resize in the browser (faster uploads), then upload. The server re-validates and re-encodes. */
export async function uploadPhoto(file: File): Promise<Photo> {
  const blob = file.size > 1.5 * 1024 * 1024 ? await resizeImage(file, 2400, 0.88).catch(() => file) : file;
  const { photo } = await api.upload<{ photo: Photo }>("/api/uploads", blob, file.name);
  return photo;
}

export const discardPhoto = (id: string) => api.delete(`/api/uploads/${id}`);

export interface UserPhoto {
  photo: Photo;
  trip: { id: string; title: string; countryCode: string };
}

export function useUserPhotos(username: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["photos", username.toLowerCase()],
    queryFn: ({ pageParam }) => api.get<Page<UserPhoto>>(`/api/users/${encodeURIComponent(username)}/photos${qs({ cursor: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}
