// Node 18+/20+ only (uses global fetch). Supports macOS & Linux.
// For Windows, see note at bottom.

import { execSync } from "node:child_process";
import { createWriteStream, mkdirSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:stream";
const pipe = promisify(pipeline);

const PLAT = process.platform;   // 'darwin' | 'linux' | 'win32'
const ARCH = process.arch;       // 'x64' | 'arm64' | etc.

const outDir = "tools/stripe";
mkdirSync(outDir, { recursive: true });

function detectAssetName(version, platform, arch) {
  // Stripe’s naming convention
  // linux:  stripe_${ver}_linux_x86_64.tar.gz | linux_arm64.tar.gz
  // macOS:  stripe_${ver}_macOS_x86_64.tar.gz | macOS_arm64.tar.gz
  // win:    stripe_${ver}_windows_x86_64.zip  (not extracted here)
  const verPrefix = `stripe_${version}`;
  if (platform === "linux") {
    const archSuffix = arch === "arm64" ? "arm64" : "x86_64";
    return `${verPrefix}_linux_${archSuffix}.tar.gz`;
  }
  if (platform === "darwin") {
    const archSuffix = arch === "arm64" ? "arm64" : "x86_64";
    return `${verPrefix}_macOS_${archSuffix}.tar.gz`;
  }
  if (platform === "win32") {
    return `${verPrefix}_windows_x86_64.zip`;
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

async function main() {
  // Get latest release metadata from GitHub
  const rel = await fetch("https://api.github.com/repos/stripe/stripe-cli/releases/latest", {
    headers: { "User-Agent": "stripe-cli-installer" },
  }).then(r => {
    if (!r.ok) throw new Error(`Failed to resolve latest stripe-cli release: ${r.status}`);
    return r.json();
  });

  const version = rel.tag_name?.replace(/^v/, "");
  if (!version) throw new Error("Could not detect stripe-cli version");

  const assetName = detectAssetName(version, PLAT, ARCH);
  const asset = rel.assets?.find(a => a.name === assetName);
  if (!asset?.browser_download_url) {
    throw new Error(`No matching asset for ${assetName}`);
  }

  const tgzPath = join(tmpdir(), assetName);
  console.log(`Downloading ${asset.name} …`);
  const res = await fetch(asset.browser_download_url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  await pipe(res.body, createWriteStream(tgzPath));

  if (assetName.endsWith(".tar.gz")) {
    console.log("Extracting …");
    // requires system `tar` (present on mac/linux)
    execSync(`tar -xzf "${tgzPath}" -C "${outDir}"`);
    // The extracted folder contains a `stripe` binary at top-level
    chmodSync(`${outDir}/stripe`, 0o755);
    console.log("Stripe CLI installed to tools/stripe/stripe");
  } else {
    console.log("Windows zip downloaded. Please unzip manually to tools/stripe and ensure tools/stripe/stripe.exe is present.");
  }
}

main().catch(err => {
  console.error("Install stripe-cli failed:", err?.message || err);
  process.exit(0); // don’t fail the whole install; just warn
});
