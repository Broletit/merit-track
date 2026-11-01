import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
  allowedDevOrigins: ["10.10.14.139", "*.trycloudflare.com", ...(process.env.MOBILE_DEV_ORIGIN ? [process.env.MOBILE_DEV_ORIGIN] : [])],
  experimental: {
    serverActions: {
      // Mỗi minh chứng tối đa 10 MB; chừa dung lượng cho biểu mẫu có nhiều tệp.
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
