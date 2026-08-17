import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/opengraph-image",
        destination: "/opengraph-image.png",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
