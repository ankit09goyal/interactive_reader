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
      reporter: ["text", "json", "html"],
      include: [
        "app/**/*.{js,jsx}",
        "components/**/*.{js,jsx}",
        "libs/**/*.js",
        "models/**/*.js",
      ],
      exclude: [
        "node_modules",
        ".next",
        "__tests__",
        "**/*.config.js",
        "app/**/layout.js", // Layouts are mostly wrappers
        "app/globals.css",
      ],
      // Start with lower thresholds and increase as coverage improves
      // Current coverage: ~12% - focus on critical paths first
      thresholds: {
        statements: 10,
        branches: 10,
        functions: 8,
        lines: 10,
      },
    },
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
