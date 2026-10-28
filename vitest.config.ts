import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // The full historical media/reader preservation chain can take over 30s
    // under parallel CI load. Keep every assertion and allow the audit to finish.
    testTimeout: 45_000,
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
