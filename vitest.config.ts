import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      include: ["scripts/**/*.ts"],
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
    },
  },
});
