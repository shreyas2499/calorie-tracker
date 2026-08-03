import type { NextConfig } from "next";

/**
 * `NEXT_PUBLIC_API_URL` is inlined automatically at build time, so it is not
 * repeated here. It must be present in the build environment (Railway service
 * variables, or `.env.local` when developing) — it is never hard-coded.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
