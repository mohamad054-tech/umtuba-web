import type { NextConfig } from "next";
import { HIFZ_SHAMS_PERMANENT_REDIRECT } from "./lib/hifz/routes";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/opengraph-image",
        destination: "/opengraph-image.png",
        permanent: true,
      },
      {
        source: HIFZ_SHAMS_PERMANENT_REDIRECT.source,
        destination: HIFZ_SHAMS_PERMANENT_REDIRECT.destination,
        permanent: HIFZ_SHAMS_PERMANENT_REDIRECT.permanent,
      },
    ];
  },
};

export default nextConfig;
