import type { NextConfig } from "next";

/**
 * `NEXT_PUBLIC_API_URL` is inlined automatically at build time, so it is not
 * repeated here. It must be present in the build environment (Railway service
 * variables, or `.env.local` when developing) — it is never hard-coded.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint is a development/CI concern (`npm run lint`); a style warning should
    // not be able to fail a production deploy. Type checking still runs.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
