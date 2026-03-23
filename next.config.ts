import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  serverExternalPackages: ["firebase-admin"],
  allowedDevOrigins: ["100.115.37.31"],
};

export default nextConfig;
