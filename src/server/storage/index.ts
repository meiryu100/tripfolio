import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

/**
 * S3-compatible object storage (RustFS locally, S3/R2/MinIO in production).
 * The bucket is private: files are only served through authorized API routes.
 */
const globalForS3 = globalThis as unknown as { tripfolioS3?: S3Client; tripfolioS3Public?: S3Client };

const makeClient = (endpoint: string | undefined) =>
  new S3Client({
    endpoint,
    region: env.s3.region,
    forcePathStyle: env.s3.forcePathStyle,
    credentials:
      env.s3.accessKeyId && env.s3.secretAccessKey
        ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
        : undefined,
  });

const s3 = globalForS3.tripfolioS3 ?? makeClient(env.s3.endpoint);
// Signed links must point at an address the browser can reach.
const s3Public = globalForS3.tripfolioS3Public ?? makeClient(env.s3.publicEndpoint);
if (!env.isProd) {
  globalForS3.tripfolioS3 = s3;
  globalForS3.tripfolioS3Public = s3Public;
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "private, max-age=31536000, immutable",
    }),
  );
}

export async function deleteObjects(keys: string[]) {
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    if (!chunk.length) continue;
    await s3.send(
      new DeleteObjectsCommand({ Bucket: env.s3.bucket, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }),
    );
  }
}

/**
 * A temporary link that lets the browser download one object straight from
 * storage (no bytes pass through our server).
 *
 * The signature is computed as of the start of the current `windowSeconds`
 * window, so every request in that window gets the *same* URL and the browser
 * can cache the image. Links stay valid for two windows, so a URL handed out at
 * the very end of a window still has at least one full window left.
 */
export async function signedGetUrl(key: string, windowSeconds = 3600) {
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const url = await getSignedUrl(s3Public, new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }), {
    expiresIn: windowSeconds * 2,
    signingDate: new Date(windowStart),
  });
  // Seconds this URL is still guaranteed to work, for the redirect's own cache lifetime.
  const validFor = Math.floor((windowStart + windowMs * 2 - Date.now()) / 1000);
  return { url, validFor };
}
