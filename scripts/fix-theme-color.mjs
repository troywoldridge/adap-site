import fs from "node:fs";
import path from "node:path";

const files = [
  "src/app/layout.tsx",
  "src/app/account/onboarding/page.tsx",
  "src/app/checkout/complete/page.tsx",
];

function read(p) {
  return fs.readFileSync(p, "utf8");
}
function write(p, s) {
  fs.writeFileSync(p, s, "utf8");
}

// Remove themeColor inside `export const metadata = { ... }`
// Supports:
//   themeColor: "#0f172a",
//   themeColor: [...],
function stripThemeColorFromMetadata(src) {
  return src.replace(
    /(export\s+const\s+metadata\s*=\s*\{[\s\S]*?)(\n\s*themeColor\s*:\s*(\[[\s\S]*?\]|"[^"]*"|'[^']*'|[^,\n}]+)\s*,?)([\s\S]*?\n\};)/m,
    "$1$4"
  );
}

function hasViewport(src) {
  return /export\s+const\s+viewport\s*=/.test(src);
}

// Add viewport export with a standard light/dark themeColor if missing.
// (This aligns with what you already want across pages.)
function ensureViewportThemeColor(src) {
  if (hasViewport(src)) return src;

  const viewportBlock =
`export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

`;

  // Insert right after the metadata block if present, else top of file after imports.
  if (/export\s+const\s+metadata\s*=/.test(src)) {
    return src.replace(
      /(export\s+const\s+metadata\s*=\s*\{[\s\S]*?\n\};\s*)/m,
      `$1\n${viewportBlock}`
    );
  }

  // fallback: after last import
  const lastImportIdx = src.lastIndexOf("import ");
  if (lastImportIdx !== -1) {
    // find end of import section
    const afterImports = src.indexOf("\n\n", lastImportIdx);
    if (afterImports !== -1) {
      return src.slice(0, afterImports + 2) + viewportBlock + src.slice(afterImports + 2);
    }
  }

  return viewportBlock + src;
}

function main() {
  let changed = 0;

  for (const rel of files) {
    const p = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(p)) {
      console.warn(`SKIP (missing): ${rel}`);
      continue;
    }

    const before = read(p);
    let after = before;

    after = stripThemeColorFromMetadata(after);
    after = ensureViewportThemeColor(after);

    // If file already contains viewport themeColor AND also still contains metadata themeColor,
    // the strip will remove it. If file has duplicate viewport blocks, we DON'T attempt
    // to dedupe automatically here (we’ll see it via rg and fix manually if needed).
    if (after !== before) {
      write(p, after);
      console.log(`UPDATED: ${rel}`);
      changed++;
    } else {
      console.log(`OK: ${rel}`);
    }
  }

  console.log(`\nDone. Files updated: ${changed}/${files.length}`);
}

main();
