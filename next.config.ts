import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/create", destination: "/create/image", permanent: false },
    ];
  },
};

export default nextConfig;
