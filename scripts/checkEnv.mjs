// scripts/checkEnv.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import * as dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env.local");

// Load .env.local (silent if missing)
dotenv.config({ path: envPath });

// Aliases: if any alias is present, we consider the canonical key satisfied
const REQUIRED = [
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
  "SINALITE_BASE_URL",            // canonical
  "SINALITE_CLIENT_ID",
  "SINALITE_CLIENT_SECRET",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
];

// Map canonical -> possible env var names you might be using
const ALIASES = {
  SINALITE_BASE_URL: ["SINALITE_BASE_URL", "SINALITE_API_BASE_URL"], // accept either
};

function getEnvValue(key) {
  const names = ALIASES[key] ?? [key];
  for (const name of names) {
    const val = process.env[name];
    if (val && String(val).trim() !== "") return { name, val };
  }
  return null;
}

const missing = [];
const satisfied = [];

for (const key of REQUIRED) {
  const hit = getEnvValue(key);
  if (hit) satisfied.push({ canonical: key, used: hit.name });
  else missing.push(key);
}

if (missing.length > 0) {
  console.log(
    "\n" + chalk.bgRed.white.bold("  MISSING ENVIRONMENT VARIABLES  ") + "\n"
  );
  for (const key of missing) {
    const alias = ALIASES[key];
    if (alias) {
      console.log(
        chalk.red("  ✗ ") +
          chalk.yellow(key) +
          chalk.gray(`  (accepted: ${alias.join(", ")})`)
      );
    } else {
      console.log(chalk.red("  ✗ ") + chalk.yellow(key));
    }
  }
  console.log(
    "\n" +
      chalk.red("Set them in ") +
      chalk.cyan(".env.local") +
      chalk.red(" before running the dev server.\n")
  );
  process.exit(1);
}

console.log(chalk.green.bold("✅ All required environment variables are set."));
console.log(
  chalk.gray(
    `Using ${envPath.includes(".env.local") ? ".env.local" : "process env"}`
  )
);
for (const s of satisfied) {
  const label =
    s.canonical === s.used
      ? s.canonical
      : `${s.canonical} (via ${s.used})`;
  console.log(chalk.green("  • ") + label);
}
