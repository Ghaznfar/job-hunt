import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
    },
  },
  // Prevent Vite from picking up the Tailwind v4 postcss config during tests.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    hookTimeout: 30_000,
    testTimeout: 20_000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/services/**"],
      exclude: ["src/lib/ai/mock.ts", "**/*.d.ts"],
    },
  },
});
