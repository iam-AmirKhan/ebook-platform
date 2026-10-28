import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/categories",
        destination: "/books",
        permanent: false,
      },
      {
        source: "/categories/:slug",
        destination: "/books?category=:slug",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
