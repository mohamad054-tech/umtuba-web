import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "app/lib/motion/**/*.test.ts",
      "app/lib/city/**/*.test.ts",
      "app/components/journey-transition/**/*.test.ts",
      "app/components/journey/**/*.test.ts",
      "app/components/globe-to-city/**/*.test.ts",
      "app/live/hooks/**/*.test.ts",
      "app/notifications/**/*.test.ts",
      "lib/rewards/**/*.test.ts",
      "lib/referral/**/*.test.ts",
      "lib/recommendations/**/*.test.ts",
      "lib/live/**/*.test.ts",
      "lib/env/**/*.test.ts",
      "lib/site/**/*.test.ts",
      "lib/geo/**/*.test.ts",
      "lib/wallet/**/*.test.ts",
      "lib/activity-tiers/**/*.test.ts",
      "lib/media/**/*.test.ts",
      "lib/supabase/**/*.test.ts",
      "app/watch/**/*.test.ts",
      "app/messages/**/*.test.ts",
      "app/lib/video/**/*.test.ts",
      "app/lib/nav/**/*.test.ts",
      "app/lib/product/**/*.test.ts",
    ],
  },
});
