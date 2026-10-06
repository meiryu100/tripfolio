export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA: 415,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/** An error that is safe to show to the client. */
export class HttpError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public field?: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
  get status() {
    return STATUS[this.code];
  }
}

export const notFound = (what = "Not found") => new HttpError("NOT_FOUND", what);
export const forbidden = (msg = "You don't have access to this.") => new HttpError("FORBIDDEN", msg);
export const unauthenticated = () => new HttpError("UNAUTHENTICATED", "You need to be logged in.");
export const conflict = (msg: string, field?: string) => new HttpError("CONFLICT", msg, field);
export const badRequest = (msg: string, field?: string) => new HttpError("BAD_REQUEST", msg, field);
