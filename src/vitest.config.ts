// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    // 🔒 limit discovery to our tests only
    include: ["src/lib/price/**/*.test.ts"],
    // 🧹 over-explicit excludes so nothing leaks in
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
      "**/__tests__/**",
      "**/tests/**",
      "**/test/**",
      "**/*.snap",
    ],
    // ✅ no worker pool = no 'process.send' surprises
    pool: "threads",
    poolOptions: { threads: { singleThread: true } },
    // 📴 keep it simple
    coverage: { enabled: false },
  },
});
