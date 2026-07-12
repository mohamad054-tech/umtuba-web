import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["app/lib/motion/**/*.test.ts", "app/components/journey-transition/**/*.test.ts"],
  },
});
