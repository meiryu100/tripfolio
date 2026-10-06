import "server-only";
import type { NextRequest } from "next/server";
import { MAX_UPLOAD_BYTES } from "../storage/images";
import { HttpError } from "./errors";

/** Read a single multipart "file" field, enforcing the size limit before buffering. */
export async function readUpload(req: NextRequest): Promise<Buffer> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) throw new HttpError("PAYLOAD_TOO_LARGE", "Images must be 15 MB or smaller.");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError("BAD_REQUEST", "Expected a multipart upload.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError("BAD_REQUEST", "No file was uploaded.");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError("PAYLOAD_TOO_LARGE", "Images must be 15 MB or smaller.");
  if (file.size === 0) throw new HttpError("BAD_REQUEST", "That file is empty.");
  return Buffer.from(await file.arrayBuffer());
}
