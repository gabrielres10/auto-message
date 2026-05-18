import type { NextConfig } from "next";
import { resolve } from "path";

// Next.js looks for .env files in the app directory (apps/web/), not the
// monorepo root. Load the root .env explicitly so NEXTAUTH_SECRET and
// DATABASE_URL are in process.env before any request handler runs.
// `dotenv` is always available — Next.js ships it via @next/env.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({
  path: resolve(process.cwd(), "../../.env"),
  override: false, // never overwrite vars already set by the shell
});

const nextConfig: NextConfig = {
  transpilePackages: ["@auto-message/shared"],
};

export default nextConfig;
