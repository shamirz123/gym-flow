import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker image ke liye chhota, self-contained build
  output: "standalone",
  // Root folder mein bhi package-lock hai — Next ko batao ke frontend hi project root hai
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  // Dev mein gym subdomains (ironpulse.localhost:3000) se bhi hot-reload chale
  allowedDevOrigins: ["*.localhost"],
};

export default nextConfig;
