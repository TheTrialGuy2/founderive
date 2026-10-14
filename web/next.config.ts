import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The dev badge covers the mobile tab bar during demos.
  devIndicators: false,
  experimental: {
    // Server actions default to a 1 MB body; setup's logo upload (up to 1 MB) needs headroom for the rest of the form.
    serverActions: { bodySizeLimit: "2mb" },
  },
  async redirects() {
    return [{ source: "/", destination: "/today", permanent: false }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
