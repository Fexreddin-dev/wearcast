import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi open the local dev server. Has no effect in production.
  allowedDevOrigins: ["192.168.100.189"],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // A studio page visited in the last 30 s opens instantly from the browser. Every change made in the
    // app (dressing, saving, deleting, adding) calls router.refresh(), which clears this cache.
    staleTimes: { dynamic: 30 },
  },
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
