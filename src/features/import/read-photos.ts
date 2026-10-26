import exifr from "exifr";
import { locate } from "./locate";

export interface Found {
  /** Photos placed in this country / region. */
  count: number;
  /** Earliest and latest photo date (ms since epoch). */
  first: number;
  last: number;
}

export interface PhotoScan {
  total: number;
  noLocation: number;
  countries: Record<string, Found>;
  regions: Record<string, Found>;
}

const PARALLEL = 6;

function add(into: Record<string, Found>, code: string, at: number) {
  const f = into[code];
  if (f) {
    f.count += 1;
    f.first = Math.min(f.first, at);
    f.last = Math.max(f.last, at);
  } else into[code] = { count: 1, first: at, last: at };
}

/**
 * Read where and when each photo was taken, on this device. Only the location and the date are
 * read (exifr fetches just the parts of the file it needs, which also works for iPhone HEIC);
 * nothing is uploaded.
 */
export async function scanPhotos(files: File[], onProgress: (scan: PhotoScan, done: number) => void): Promise<PhotoScan> {
  const scan: PhotoScan = { total: files.length, noLocation: 0, countries: {}, regions: {} };
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < files.length) {
      const file = files[next++];
      try {
        const tags = await exifr.parse(file, { gps: true, exif: { pick: ["DateTimeOriginal", "CreateDate"] }, tiff: false, ifd1: false });
        const lat = tags?.latitude;
        const lon = tags?.longitude;
        if (typeof lat !== "number" || typeof lon !== "number") {
          scan.noLocation += 1;
        } else {
          const taken = tags.DateTimeOriginal ?? tags.CreateDate;
          const at = taken instanceof Date && !Number.isNaN(taken.getTime()) ? taken.getTime() : file.lastModified;
          const { country, region } = locate(lat, lon);
          if (!country) scan.noLocation += 1;
          else {
            add(scan.countries, country, at);
            if (region) add(scan.regions, region, at);
          }
        }
      } catch {
        // A file we can't read counts as "no location".
        scan.noLocation += 1;
      }
      done += 1;
      if (done % 10 === 0 || done === files.length) onProgress(scan, done);
    }
  };

  await Promise.all(Array.from({ length: Math.min(PARALLEL, files.length) }, worker));
  return scan;
}
