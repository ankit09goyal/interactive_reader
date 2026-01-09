import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: "jsx",
    include: /\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.jsx"],
    include: ["__tests__/**/*.test.{js,jsx}"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "app/**/*.{js,jsx}",
        "components/**/*.{js,jsx}",
        "libs/**/*.js",
        "models/**/*.js",
      ],
      exclude: [
        "node_modules/**",
        ".next/**",
        "__tests__/**",
        "**/*.config.js",
        "**/*.config.*.js",
        "app/**/layout.js", // Layouts are mostly wrappers
        "app/**/error.js", // Error boundaries
        "app/**/not-found.js", // Not found pages
        "app/**/loading.js", // Loading components
        "app/globals.css",
        "**/*.test.{js,jsx}",
        "**/*.spec.{js,jsx}",
        "**/mocks/**",
        "**/__mocks__/**",
        "coverage/**",
        "public/**",
      ],
      // Coverage thresholds - increase these as coverage improves
      // Current coverage: ~12% - focus on critical paths first
      thresholds: {
        statements: 10,
        branches: 10,
        functions: 8,
        lines: 10,
        // Per-file thresholds for critical paths
        "libs/**/*.js": {
          statements: 15,
          branches: 12,
          functions: 12,
          lines: 15,
        },
        "models/**/*.js": {
          statements: 15,
          branches: 12,
          functions: 12,
          lines: 15,
        },
      },
      // Show all files, even those with 0% coverage
      all: true,
      // Skip full coverage for files that don't have tests yet
      skipFull: false,
    },
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
