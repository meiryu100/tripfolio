import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The share card reads the logo from disk; make sure it ships with that function.
  outputFileTracingIncludes: {
    "/api/users/[username]/share-image": ["./public/brand/tripfolio-mark.png"],
  },
};

export default nextConfig;
