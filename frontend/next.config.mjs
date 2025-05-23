const nextConfig = {
  output: 'export',
  distDir: "build", // ✅ Valid path
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
