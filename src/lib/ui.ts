"use client";

import { create } from "zustand";
import { uid } from "./utils";

export interface Toast {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
}

interface UIState {
  /** Country sheet: which country, on whose map. */
  countrySheet: { code: string; username: string } | null;
  /** Trip editor: edit an existing trip, or create one (optionally for a preset country). */
  tripEditor: { tripId?: string; country?: string } | null;
  /** Which map is showing: the world, or the USA states map. */
  mapView: "world" | "US";
  /** Region (e.g. US state) sheet: which region, on whose map. */
  regionSheet: { code: string; username: string } | null;
  /** Owner of the trip currently open on /trips/[id] (for nav highlighting). */
  viewingTripOwner: string | null;
  /** Countries that just changed colour — the map plays a short highlight on them. */
  pulse: { code: string; at: number } | null;
  toasts: Toast[];
}

export const useUI = create<UIState>(() => ({
  countrySheet: null,
  tripEditor: null,
  mapView: "world",
  regionSheet: null,
  viewingTripOwner: null,
  pulse: null,
  toasts: [],
}));

export const openCountry = (code: string, username: string) => useUI.setState({ countrySheet: { code, username } });
export const closeCountry = () => useUI.setState({ countrySheet: null });
export const openTripEditor = (opts: { tripId?: string; country?: string } = {}) => useUI.setState({ tripEditor: opts });
export const closeTripEditor = () => useUI.setState({ tripEditor: null });
export const pulseCountry = (code: string) => useUI.setState({ pulse: { code, at: Date.now() } });
export const setMapView = (mapView: "world" | "US") => useUI.setState({ mapView });
export const openRegion = (code: string, username: string) => useUI.setState({ regionSheet: { code, username } });
export const closeRegion = () => useUI.setState({ regionSheet: null });

export function toast(message: string, tone: Toast["tone"] = "success") {
  const id = uid();
  useUI.setState((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, tone }] }));
  setTimeout(() => useUI.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3600);
}
