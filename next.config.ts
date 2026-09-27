import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Mỗi minh chứng tối đa 10 MB; chừa dung lượng cho biểu mẫu có nhiều tệp.
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
