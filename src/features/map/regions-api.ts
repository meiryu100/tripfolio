"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CountryStatus } from "@/lib/types";
import { mapKey } from "./api";

export interface RegionsData {
  country: string | null;
  statuses: Record<string, CountryStatus>;
}

export const regionsKey = (username: string) => ["regions", username.toLowerCase()] as const;

/** A user's regions in every country that has a regions map (US, Canada, Australia), keyed by ISO 3166-2 code. */
export function useUserRegions(username: string | undefined) {
  return useQuery({
    queryKey: regionsKey(username ?? ""),
    queryFn: () => api.get<RegionsData>(`/api/users/${encodeURIComponent(username!)}/regions`),
    enabled: Boolean(username),
  });
}

/** Set or clear a region's status, optimistically. Visiting a region also marks its country visited. */
export function useSetRegionStatus(myUsername: string) {
  const qc = useQueryClient();
  const key = regionsKey(myUsername);
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
    onSettled: (_d, _e, { code }) => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: mapKey(myUsername) });
      qc.invalidateQueries({ queryKey: ["profile", myUsername.toLowerCase()] });
      qc.invalidateQueries({ queryKey: ["country", code.slice(0, 2)] });
    },
  });
}
