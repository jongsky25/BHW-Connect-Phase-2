import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Full historical media-view/hash checks exceed 5s on shared CI runners.
    // Keep every assertion; give these synchronous audits time to finish.
    testTimeout: 20_000,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next bundles this marker instead of installing it as a dependency.
      // Route tests explicitly mock it; production keeps Next's boundary.
      "server-only": path.resolve(__dirname, "./node_modules/next/dist/compiled/server-only/index.js"),
    },
  },
});
