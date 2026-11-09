import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  agentRules: false,
  transpilePackages: ["@storeassist/shared"],
};

export default nextConfig;
