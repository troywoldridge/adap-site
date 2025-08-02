#!/usr/bin/env bash
set -euo pipefail

# === CONFIG ===
BRANCH=${1:-develop}                     # default branch to push from
REMOTE=${2:-origin}                      # git remote
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
HERO_SLIDES="data/hero-slides.json"
ANALYTICS_LOG="data/hero-analytics.log"
PLACEHOLDER_OUTPUT="data/blur-placeholders.json" # cache of tiny base64 images
PLACEHOLDER_WIDTH=20                     # very small for blur
PLACEHOLDER_QUALITY=30

# === FUNCTIONS ===

info(){ echo -e "\033[1;34m[INFO]\033[0m $*"; }
warn(){ echo -e "\033[1;33m[WARN]\033[0m $*"; }
err(){ echo -e "\033[1;31m[ERROR]\033[0m $*"; }

# ensure clean working tree
if ! git diff --quiet || ! git diff --staged --quiet; then
  warn "You have uncommitted changes. Stash/commit before deploying."
  git status
  exit 1
fi

info "Switching to branch '$BRANCH'"
git checkout "$BRANCH"
git pull "$REMOTE" "$BRANCH"

# install / verify
info "Installing dependencies"
pnpm install

# --- generate blurred placeholders if HeroSlide images exist ---
info "Generating blur placeholders (small, base64) for hero slides"
node <<'JS'
import fs from "fs";
import sharp from "sharp";
const SLIDES_PATH = "data/hero-slides.json";
const OUT_PATH = "data/blur-placeholders.json";

if (!fs.existsSync(SLIDES_PATH)) {
  console.warn("No hero slides file, skipping placeholder generation.");
  process.exit(0);
}

const slides = JSON.parse(fs.readFileSync(SLIDES_PATH, "utf-8"));
const results = {};

async function makePlaceholder(url, id) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch failed ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const small = await sharp(buffer)
      .resize({ width: 20 })
      .blur()
      .jpeg({ quality: 30 })
      .toBuffer();
    const base64 = `data:image/jpeg;base64,${small.toString("base64")}`;
    results[id] = base64;
  } catch (e) {
    console.warn("Placeholder generation failed for", id, e.message);
  }
}

(async () => {
  for (const slide of slides) {
    if (slide.imageUrl && slide.id) {
      await makePlaceholder(slide.imageUrl, slide.id);
    }
  }
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log("Wrote placeholders to", OUT_PATH);
})();
JS

# merge generated placeholder into slides (non-destructive)
if [ -f "$PLACEHOLDER_OUTPUT" ]; then
  info "Merging placeholder data into hero slides for quick client use"
  node <<'JS'
import fs from "fs";
const slidesPath = "data/hero-slides.json";
const placeholderPath = "data/blur-placeholders.json";
if (!fs.existsSync(slidesPath)) process.exit(0);
const slides = JSON.parse(fs.readFileSync(slidesPath, "utf-8"));
let placeholders = {};
if (fs.existsSync(placeholderPath)) {
  placeholders = JSON.parse(fs.readFileSync(placeholderPath, "utf-8"));
}
const merged = slides.map((s) => ({
  ...s,
  blurDataURL: placeholders[s.id] || s.blurDataURL || null,
}));
fs.writeFileSync(slidesPath, JSON.stringify(merged, null, 2));
console.log("Merged blurDataURL into slides.");
JS
fi

# backup current critical data
info "Backing up current hero slides and analytics log to $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -v "$HERO_SLIDES" "$BACKUP_DIR/" || warn "Hero slides missing, skipping"
if [ -f "$ANALYTICS_LOG" ]; then
  cp -v "$ANALYTICS_LOG" "$BACKUP_DIR/"
fi

# optional lint/build
info "Running lint"
pnpm run lint || warn "Lint had issues (continue anyway)"

info "Running build"
pnpm run build

# commit any auto-generated changes (blur placeholders merged)
git add data/hero-slides.json data/blur-placeholders.json || true
if git diff --cached --quiet; then
  info "No generated changes to commit."
else
  git commit -m "chore: update hero slides with generated blur placeholders"
fi

# push
info "Pushing branch to remote"
git push "$REMOTE" "$BRANCH"

# optionally tag/release if using git-flow or semantic versioning
# echo "Tagging release"
# git tag -a "v$(date +%Y%m%d%H%M)" -m "Auto deploy $(date)"
# git push "$REMOTE" --tags

info "✅ Deploy script complete. Now merge to main or trigger your hosting deploy."
