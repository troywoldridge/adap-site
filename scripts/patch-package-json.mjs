import fs from "node:fs";

const path = new URL("../package.json", import.meta.url);
const raw = fs.readFileSync(path, "utf8");
const pkg = JSON.parse(raw);

pkg.scripts ??= {};
pkg.scripts.dev = pkg.scripts.dev || "next dev";

// ✅ Workers build must be OpenNext
pkg.scripts.build = "opennext build";

// ✅ Convenient deploy command
pkg.scripts.deploy = "wrangler deploy";

fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n", "utf8");

console.log("✅ Updated package.json scripts:");
console.log(JSON.stringify(pkg.scripts, null, 2));
