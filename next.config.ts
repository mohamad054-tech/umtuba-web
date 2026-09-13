import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
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
