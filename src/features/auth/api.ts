"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Me } from "@/lib/types";

export const meKey = ["me"] as const;

export function useMeQuery() {
  return useQuery({
    queryKey: meKey,
    queryFn: () => api.get<{ me: Me | null }>("/api/auth/me").then((r) => r.me),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** The signed-in user. Only use inside the authenticated area (the layout guarantees it). */
export function useMe(): Me {
  const { data } = useMeQuery();
  if (!data) throw new Error("useMe() used outside the authenticated area");
  return data;
}

export function useSetMe() {
  const qc = useQueryClient();
  return (me: Me | null) => qc.setQueryData(meKey, me);
}

export function useLogin() {
  const setMe = useSetMe();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) => api.post<{ me: Me }>("/api/auth/login", input),
    onSuccess: ({ me }) => {
      qc.clear();
      setMe(me);
    },
  });
}

export function useRegister() {
  const setMe = useSetMe();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { firstName: string; lastName: string; gender: "male" | "female"; username: string; email: string; password: string }) =>
      api.post<{ me: Me }>("/api/auth/register", input),
    onSuccess: ({ me }) => {
      qc.clear();
      setMe(me);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(meKey, null);
    },
  });
}

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => api.get<{ google: boolean }>("/api/auth/providers"),
    staleTime: Infinity,
  });
}

export const requestPasswordReset = (email: string) => api.post("/api/auth/forgot-password", { email });
export const resetPassword = (token: string, password: string) => api.post("/api/auth/reset-password", { token, password });
