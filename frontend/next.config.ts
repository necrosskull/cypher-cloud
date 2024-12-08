import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  distDir: "../build",
  images: { unoptimized: true },
  trailingSlash: true,

};

export default nextConfig;
