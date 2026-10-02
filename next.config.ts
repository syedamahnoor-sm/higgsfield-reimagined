import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/create/image", permanent: false },
      { source: "/create", destination: "/create/image", permanent: false },
    ];
  },
};

export default nextConfig;
