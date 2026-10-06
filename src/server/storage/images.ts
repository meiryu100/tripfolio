import "server-only";
import sharp, { type Metadata } from "sharp";
import { HttpError } from "../http/errors";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif", "gif", "tiff"]);

export interface ProcessedImage {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Validates an upload by decoding it (not by trusting the extension or the
 * declared MIME type), then re-encodes to WebP. Re-encoding strips EXIF —
 * including GPS location — and neutralizes polyglot files.
 */
export async function processPhoto(input: Buffer, opts: { full: number; thumb: number }): Promise<ProcessedImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new HttpError("PAYLOAD_TOO_LARGE", "Images must be 15 MB or smaller.");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new HttpError("UNSUPPORTED_MEDIA", "That file isn't a supported image.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format))
    throw new HttpError("UNSUPPORTED_MEDIA", "Use a JPEG, PNG, WebP, AVIF or HEIC image.");

  const base = sharp(input, { limitInputPixels: 50_000_000 }).rotate(); // honour EXIF orientation, then drop EXIF
  const fullPipeline = base.clone().resize({ width: opts.full, height: opts.full, fit: "inside", withoutEnlargement: true });
  const [full, fullInfo] = await fullPipeline
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
    .then((r) => [r.data, r.info] as const);
  const thumb = await base
    .clone()
    .resize({ width: opts.thumb, height: opts.thumb, fit: "cover", position: "attention" })
    .webp({ quality: 76 })
    .toBuffer();

  return { full, thumb, width: fullInfo.width, height: fullInfo.height, bytes: full.byteLength };
}
