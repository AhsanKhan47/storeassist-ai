import { defineConfig } from "vitest/config";

// Unit tests for the pure logic: chunking, scoring, prompt building, provider fallback, history.
// Tests sit next to the code as *.test.ts. Run with `pnpm test`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/**/*.test.ts", "apps/*/src/**/*.test.ts", "packages/*/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/out/**", "**/dist/**"],
  },
});
