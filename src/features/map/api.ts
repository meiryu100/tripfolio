"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CountryStatus, MapData } from "@/lib/types";

export const mapKey = (username: string) => ["map", username.toLowerCase()] as const;

export function useUserMap(username: string | undefined) {
  return useQuery({
    queryKey: mapKey(username ?? ""),
    queryFn: () => api.get<MapData>(`/api/users/${encodeURIComponent(username!)}/map`),
    enabled: Boolean(username),
  });
}

const toApi = (s: CountryStatus) => (s === "visited" ? "VISITED" : "WANT_TO_VISIT");

/**
 * Set or clear the viewer's status for a country. Optimistic: the map and
 * stats update instantly and roll back if the server refuses.
 */
export function useSetCountryStatus(myUsername: string) {
  const qc = useQueryClient();
  const key = mapKey(myUsername);
  return useMutation({
    mutationFn: ({ code, status }: { code: string; status: CountryStatus | null }) =>
      status ? api.post("/api/me/countries", { countryCode: code, status: toApi(status) }) : api.delete(`/api/me/countries/${code}`),
    onMutate: async ({ code, status }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<MapData>(key);
      if (prev) {
        const statuses = { ...prev.statuses };
        if (status) statuses[code] = status;
        else delete statuses[code];
        qc.setQueryData<MapData>(key, { ...prev, statuses });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: (_d, _e, { code }) => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["profile", myUsername.toLowerCase()] });
      qc.invalidateQueries({ queryKey: ["country", code.toUpperCase()] });
    },
  });
}

export const setStatuses = (countryCodes: string[], status: CountryStatus) =>
  api.put("/api/me/countries", { countryCodes, status: toApi(status) });
