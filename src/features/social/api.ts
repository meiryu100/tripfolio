"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { meKey } from "@/features/auth/api";
import { api, qs } from "@/lib/api-client";
import type { Activity, AppNotification, FollowRequest, Me, Page, Profile, Relationship, UserSummary } from "@/lib/types";

export const profileKey = (username: string) => ["profile", username.toLowerCase()] as const;

export function useProfile(username: string) {
  return useQuery({
    queryKey: profileKey(username),
    queryFn: () => api.get<{ profile: Profile }>(`/api/users/${encodeURIComponent(username)}`).then((r) => r.profile),
    retry: (n, e) => (e as { status?: number }).status !== 404 && n < 2,
  });
}

/** Follow / unfollow (or cancel a request), with the button flipping instantly. */
export function useFollow(target: { username: string }) {
  const qc = useQueryClient();
  const key = profileKey(target.username);
  return useMutation({
    mutationFn: (follow: boolean) =>
      (follow ? api.post<{ relationship: Relationship }>(`/api/users/${target.username}/follow`) : api.delete<{ relationship: Relationship }>(`/api/users/${target.username}/follow`)).then(
        (r) => r.relationship,
      ),
    onMutate: async (follow) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Profile>(key);
      if (prev) {
        const relationship = follow
          ? { ...prev.relationship, following: !prev.isPrivate, requested: prev.isPrivate }
          : { ...prev.relationship, following: false, requested: false, friends: false };
        const delta = Number(relationship.following) - Number(prev.relationship.following);
        qc.setQueryData<Profile>(key, {
          ...prev,
          relationship,
          counts: { ...prev.counts, followers: prev.counts.followers + delta },
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["follows"] });
      qc.invalidateQueries({ queryKey: ["explore"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["map", target.username.toLowerCase()] });
      qc.invalidateQueries({ queryKey: ["trips", target.username.toLowerCase()] });
    },
  });
}

export function useFollowList(username: string, kind: "followers" | "following") {
  return useInfiniteQuery({
    queryKey: ["follows", username.toLowerCase(), kind],
    queryFn: ({ pageParam }) =>
      api.get<Page<UserSummary & { relationship: Relationship }>>(
        `/api/users/${encodeURIComponent(username)}/${kind}${qs({ cursor: pageParam })}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useFriends() {
  return useQuery({
    queryKey: ["friends"],
    queryFn: () => api.get<{ friends: UserSummary[] }>("/api/me/friends").then((r) => r.friends),
  });
}

export function useRequests() {
  return useQuery({
    queryKey: ["requests"],
    queryFn: () => api.get<{ requests: FollowRequest[] }>("/api/me/requests").then((r) => r.requests),
  });
}

export function useAnswerRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ username, accept }: { username: string; accept: boolean }) =>
      accept ? api.post(`/api/me/requests/${username}`) : api.delete(`/api/me/requests/${username}`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: meKey });
      qc.invalidateQueries({ queryKey: ["follows"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => api.get<Page<Activity>>(`/api/feed${qs({ cursor: pageParam, limit: 15 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) => api.get<Page<AppNotification>>(`/api/notifications${qs({ cursor: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/notifications"),
    onSuccess: () => {
      qc.setQueryData<Me | null>(meKey, (me) => (me ? { ...me, unreadNotifications: 0 } : me));
      qc.setQueryData<InfiniteData<Page<AppNotification>>>(["notifications"], (d) =>
        d ? { ...d, pages: d.pages.map((p) => ({ ...p, items: p.items.map((n) => ({ ...n, read: true })) })) } : d,
      );
    },
  });
}

export const flatten = <T,>(d: InfiniteData<Page<T>> | undefined) => d?.pages.flatMap((p) => p.items) ?? [];
