import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The dev badge covers the mobile tab bar during demos.
  devIndicators: false,
  async redirects() {
    return [{ source: "/", destination: "/founder/today", permanent: false }];
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
