import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The share cards read the logo from disk; make sure it ships with those functions.
  outputFileTracingIncludes: {
    "/api/users/[username]/share-image": ["./public/brand/tripfolio-mark.png"],
    "/countries-visited-map/opengraph-image": ["./public/brand/tripfolio-mark.png"],
  },
};

export default nextConfig;
