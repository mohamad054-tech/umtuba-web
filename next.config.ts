import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Official brand rasters use quality={90}; default allow-list is [75] only.
    qualities: [75, 90],
  },
};

export default nextConfig;
