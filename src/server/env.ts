import "server-only";

function optional(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  databaseUrl: optional("DATABASE_URL", "postgres://tripfolio:tripfolio@localhost:5432/tripfolio"),
  appUrl: optional("APP_URL", "http://localhost:3000").replace(/\/$/, ""),
  isProd: process.env.NODE_ENV === "production",
  s3: {
    endpoint: optional("S3_ENDPOINT") || undefined,
    /** Endpoint browsers use for signed photo links (defaults to S3_ENDPOINT). */
    publicEndpoint: optional("S3_PUBLIC_ENDPOINT") || optional("S3_ENDPOINT") || undefined,
    region: optional("S3_REGION", "us-east-1"),
    bucket: optional("S3_BUCKET", "tripfolio-photos"),
    accessKeyId: optional("S3_ACCESS_KEY_ID"),
    secretAccessKey: optional("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: optional("S3_FORCE_PATH_STYLE", "true") === "true",
  },
  mail: {
    resendApiKey: optional("RESEND_API_KEY"),
    /** Sender address; "onboarding@resend.dev" works before you verify a domain. */
    from: optional("MAIL_FROM", "Tripfolio <onboarding@resend.dev>"),
  },
  /** Vercel Cron sends it as "Authorization: Bearer <CRON_SECRET>"; cron routes refuse requests without it. */
  cronSecret: optional("CRON_SECRET"),
  google: {
    clientId: optional("GOOGLE_CLIENT_ID"),
    clientSecret: optional("GOOGLE_CLIENT_SECRET"),
  },
};

export const googleEnabled = Boolean(env.google.clientId && env.google.clientSecret);
