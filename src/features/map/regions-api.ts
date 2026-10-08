"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CountryStatus } from "@/lib/types";
import { mapKey } from "./api";

export interface RegionsData {
  country: string;
  statuses: Record<string, CountryStatus>;
}

export const regionsKey = (username: string, country: string) => ["regions", username.toLowerCase(), country] as const;

export function useUserRegions(username: string | undefined, country = "US") {
  return useQuery({
    queryKey: regionsKey(username ?? "", country),
    queryFn: () => api.get<RegionsData>(`/api/users/${encodeURIComponent(username!)}/regions?country=${country}`),
    enabled: Boolean(username),
  });
}

/** Set or clear a region's status, optimistically. Visiting a state also marks the USA visited. */
export function useSetRegionStatus(myUsername: string, country = "US") {
  const qc = useQueryClient();
  const key = regionsKey(myUsername, country);
  return useMutation({
    mutationFn: ({ code, status }: { code: string; status: CountryStatus | null }) =>
      status
        ? api.post("/api/me/regions", { regionCode: code, status: status === "visited" ? "VISITED" : "WANT_TO_VISIT" })
        : api.delete(`/api/me/regions/${code}`),
    onMutate: async ({ code, status }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<RegionsData>(key);
      if (prev) {
        const statuses = { ...prev.statuses };
        if (status) statuses[code] = status;
        else delete statuses[code];
        qc.setQueryData<RegionsData>(key, { ...prev, statuses });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: mapKey(myUsername) });
      qc.invalidateQueries({ queryKey: ["profile", myUsername.toLowerCase()] });
      qc.invalidateQueries({ queryKey: ["country", country] });
    },
  });
}
