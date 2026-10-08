import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { env } from "../env";

/**
 * S3-compatible object storage (RustFS locally, S3/R2/MinIO in production).
 * The bucket is private: files are only served through authorized API routes.
 */
const globalForS3 = globalThis as unknown as { tripfolioS3?: S3Client };

const s3 =
  globalForS3.tripfolioS3 ??
  new S3Client({
    endpoint: env.s3.endpoint,
    region: env.s3.region,
    forcePathStyle: env.s3.forcePathStyle,
    credentials:
      env.s3.accessKeyId && env.s3.secretAccessKey
        ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
        : undefined,
  });
if (!env.isProd) globalForS3.tripfolioS3 = s3;

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

export async function getObject(key: string): Promise<GetObjectCommandOutput | null> {
  try {
    return await s3.send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }));
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
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
