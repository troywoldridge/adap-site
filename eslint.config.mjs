// eslint.config.ts (or .js)
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
// (optional but safer) import the TS plugin for flat config:
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // keep Next’s presets
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 👇 add this block
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      // ensure the TS plugin is available under this name in flat config
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // <— downgrade globally
    },
  },

  // (optional) keep it strict in a few critical areas:
  {
    files: [
      "src/app/**/route.ts",
      "src/app/**/route.tsx",
      "src/lib/**",
      "src/db/**",
    ],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default eslintConfig;
