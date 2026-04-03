import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node.js module — must be server-only
  serverExternalPackages: ["better-sqlite3"],

  turbopack: {
    resolveAlias: {
      // Prevent client-side bundle from trying to resolve fs/path
      fs: { browser: './lib/empty.ts' },
      path: { browser: './lib/empty.ts' },
    },
  },
};

export default nextConfig;
