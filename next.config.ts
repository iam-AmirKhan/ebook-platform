import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
