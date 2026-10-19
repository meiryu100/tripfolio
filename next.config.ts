import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Signed photo links point at the storage host (Cloudflare R2 in production, MinIO locally).
const storageOrigin = (() => {
  const endpoint = process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT;
  try {
    return endpoint ? new URL(endpoint).origin : "";
  } catch {
    return "";
  }
})();

// Only our own scripts, styles, fonts and API, plus photos from the storage host. Checked in
// Report-Only mode on production first. Next.js and the theme script in layout.tsx use inline
// scripts, hence 'unsafe-inline' until we move to nonces; eval only in development (React refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storageOrigin}`.trim(),
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The share cards read the logo from disk; make sure it ships with those functions.
  outputFileTracingIncludes: {
    "/api/users/[username]/share-image": ["./public/brand/tripfolio-mark.png"],
    "/countries-visited-map/opengraph-image": ["./public/brand/tripfolio-mark.png"],
    // The blog posts are Markdown files read at runtime.
    "/blog": ["./content/blog/**/*"],
    "/blog/[slug]": ["./content/blog/**/*"],
    "/sitemap.xml": ["./content/blog/**/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
