"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meKey } from "@/features/auth/api";
import { api } from "@/lib/api-client";
import type { Me, SessionInfo } from "@/lib/types";
import { resizeImage } from "@/lib/utils";

function useMeMutation<V>(fn: (v: V) => Promise<{ me: Me }>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: ({ me }) => {
      qc.setQueryData(meKey, me);
      qc.invalidateQueries({ queryKey: ["profile", me.username.toLowerCase()] });
    },
  });
}

export const useUpdateProfile = () =>
  useMeMutation((input: { firstName: string; lastName: string; gender: "male" | "female"; username: string; bio: string; location: string; website: string }) =>
    api.patch<{ me: Me }>("/api/me", input),
  );

/** Settings toggles apply optimistically. */
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Me["settings"]>) => api.patch<{ me: Me }>("/api/me/settings", patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: meKey });
      const prev = qc.getQueryData<Me>(meKey);
      if (prev) qc.setQueryData<Me>(meKey, { ...prev, settings: { ...prev.settings, ...patch } });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(meKey, ctx.prev),
    onSuccess: ({ me }) => {
      qc.setQueryData(meKey, me);
      qc.invalidateQueries({ queryKey: ["profile", me.username.toLowerCase()] });
    },
  });
}

export const useUploadAvatar = () =>
  useMeMutation(async (file: File) => {
    const blob = await resizeImage(file, 800, 0.9).catch(() => file);
    return api.upload<{ me: Me }>("/api/me/avatar", blob, "avatar.jpg");
  });

export const useRemoveAvatar = () => useMeMutation(() => api.delete<{ me: Me }>("/api/me/avatar"));

export const changeEmail = (email: string, password: string) => api.patch("/api/me/email", { email, password });
export const changePassword = (current: string, next: string) => api.patch("/api/me/password", { current, next });
export const deleteAccount = (password: string, confirm: string) => api.delete("/api/me", { password, confirm });
export const completeOnboarding = () => api.post("/api/me/onboarding");

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<{ sessions: SessionInfo[] }>("/api/me/sessions").then((r) => r.sessions),
  });
}

export function useRevokeSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id?: string) => (id ? api.delete(`/api/me/sessions/${id}`) : api.delete("/api/me/sessions")),
    onSettled: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}
