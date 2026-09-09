import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.COOKIE_STATIC === "1" ? {
    output: "export" as const,
    typescript: { tsconfigPath: "tsconfig.static.json" },
  } : {}),
};

export default nextConfig;
