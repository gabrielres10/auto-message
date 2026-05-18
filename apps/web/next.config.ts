import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the local shared package so Next.js can consume its TypeScript
  transpilePackages: ["@auto-message/shared"],
};

export default nextConfig;
