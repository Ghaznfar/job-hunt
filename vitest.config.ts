import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Load `.env.test` explicitly. Vitest does not reliably layer `.env.test` over
 * `.env`, and `.env` points at the *dev* database — running deleteMany() against
 * it would wipe local data. Parsing here guarantees the test DB is used.
 */
function loadTestEnv(): Record<string, string> {
  const file = r("./.env.test");
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      "server-only": r("./tests/stubs/server-only.ts"),
    },
  },
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    env: loadTestEnv(),
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
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
