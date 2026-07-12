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
    ],
  },
});
