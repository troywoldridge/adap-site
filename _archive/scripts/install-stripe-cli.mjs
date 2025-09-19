#!/usr/bin/env node
// Minimal, Node 18+ friendly. Only installs Stripe CLI if STRIPE_INSTALL=1.
// This avoids breaking `pnpm i` on machines that don't need the CLI.

/* eslint-disable no-console */
import process from "node:process";

const shouldInstall =
  process.env.STRIPE_INSTALL === "1" ||
  process.env.STRIPE_CLI_INSTALL === "1";

if (!shouldInstall) {
  console.log("[install-stripe-cli] Skipping (set STRIPE_INSTALL=1 to enable).");
  process.exit(0);
}

// If you really want auto-install here, implement your downloader.
// For now, just print a helpful message (keeps postinstall green).
console.log("[install-stripe-cli] Opt-in requested, but auto-download is not implemented in this script.");
console.log("Please install manually: https://github.com/stripe/stripe-cli#installation");
process.exit(0);
