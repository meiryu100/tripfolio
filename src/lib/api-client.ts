/** Thin fetch wrapper for the Tripfolio API. Throws ApiError with the server's message. */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public field?: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(
      e?.message ?? (res.status >= 500 ? "Something went wrong. Try again." : "Request failed."),
      res.status,
      e?.code ?? "UNKNOWN",
      e?.field,
      e?.fields,
    );
  }
  return body as T;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0, "NETWORK");
  }
  return handle<T>(res);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
  async upload<T>(path: string, file: Blob, filename = "upload.jpg"): Promise<T> {
    const form = new FormData();
    form.append("file", file, filename);
    let res: Response;
    try {
      res = await fetch(path, { method: "POST", credentials: "same-origin", body: form });
    } catch {
      throw new ApiError("Upload failed — check your connection.", 0, "NETWORK");
    }
    return handle<T>(res);
  },
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

export function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : "";
}
