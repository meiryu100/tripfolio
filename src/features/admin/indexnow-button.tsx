"use client";

import { useState } from "react";
import { buttonClass } from "@/components/button-class";
import { api, errorMessage } from "@/lib/api-client";

/** Sends the whole sitemap to IndexNow (Bing, Yandex and friends) via /api/admin/indexnow. */
export function IndexNowButton() {
  const [state, setState] = useState<{ busy: boolean; message?: string; ok?: boolean }>({ busy: false });

  async function submit() {
    setState({ busy: true });
    try {
      const r = await api.post<{ ok: boolean; status: number; submitted: number }>("/api/admin/indexnow");
      setState({
        busy: false,
        ok: r.ok,
        message: r.ok ? `נשלחו ${r.submitted} כתובות (תשובה ${r.status}).` : `IndexNow החזיר ${r.status}. נסה שוב מאוחר יותר.`,
      });
    } catch (e) {
      setState({ busy: false, ok: false, message: errorMessage(e) });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={submit} disabled={state.busy} className={buttonClass("primary", "md")}>
        {state.busy ? "שולח…" : "שלח את כל האתר ל-IndexNow"}
      </button>
      {state.message && (
        <span role="status" className={`text-sm ${state.ok ? "text-muted" : "text-danger"}`}>
          {state.message}
        </span>
      )}
    </div>
  );
}
