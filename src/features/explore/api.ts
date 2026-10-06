"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { CountryDetail, ExploreData, SearchResults } from "@/lib/types";

export function useExplore() {
  return useQuery({ queryKey: ["explore"], queryFn: () => api.get<ExploreData>("/api/explore"), staleTime: 60_000 });
}

export function useCountryDetail(code: string | undefined) {
  return useQuery({
    queryKey: ["country", (code ?? "").toUpperCase()],
    queryFn: () => api.get<CountryDetail>(`/api/countries/${code}`),
    enabled: Boolean(code),
  });
}

export function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Global search, debounced so we don't fire a request per keystroke. */
export function useSearch(query: string) {
  const q = useDebounced(query.trim(), 250);
  const result = useQuery({
    queryKey: ["search", q.toLowerCase()],
    queryFn: () => api.get<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  return { ...result, debouncedQuery: q, isDebouncing: q !== query.trim() };
}
