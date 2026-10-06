import "server-only";
import type { PhotoRow, TripRow, UserRow } from "../db/schema";
import type { CountryStatus, Photo, Trip, UserSummary } from "@/lib/types";

export function toUserSummary(u: Pick<UserRow, "id" | "username" | "firstName" | "lastName" | "avatarKey">): UserSummary {
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    // The key changes on every upload, so it doubles as a cache-buster.
    avatarUrl: u.avatarKey ? `/api/media/avatar/${u.avatarKey}` : null,
  };
}

export function toPhoto(p: PhotoRow): Photo {
  if (p.seedRef) {
    return { id: p.id, src: p.seedRef, thumb: p.seedRef, isCover: p.isCover, width: null, height: null };
  }
  return {
    id: p.id,
    src: `/api/photos/${p.id}`,
    thumb: `/api/photos/${p.id}?size=thumb`,
    isCover: p.isCover,
    width: p.width,
    height: p.height,
  };
}

export function toTrip(
  t: TripRow,
  extra: { cover?: PhotoRow | null; photoCount?: number; photos?: PhotoRow[]; author?: UserSummary; showPhotos?: boolean },
): Trip {
  const showPhotos = extra.showPhotos ?? true;
  return {
    id: t.id,
    userId: t.userId,
    countryCode: t.countryCode,
    title: t.title,
    description: t.description,
    cities: t.cities,
    startDate: t.startDate,
    endDate: t.endDate,
    cover: showPhotos && extra.cover ? toPhoto(extra.cover) : null,
    photoCount: showPhotos ? (extra.photoCount ?? extra.photos?.length ?? 0) : 0,
    photos: extra.photos ? (showPhotos ? extra.photos.map(toPhoto) : []) : undefined,
    author: extra.author,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export const toStatus = (s: "VISITED" | "WANT_TO_VISIT"): CountryStatus => (s === "VISITED" ? "visited" : "wishlist");
