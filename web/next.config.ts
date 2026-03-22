import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Monorepo: Vercel/npm workspace — node_modules može biti i iznad web/ */
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
