#!/usr/bin/env bash
set -euo pipefail

# === CONFIGURE THESE ===
GIT_NAME="Troy Woldridge"
GIT_EMAIL="you@yourdomain.com"
# ======================

echo "==> 1. Setting up Git user identity"
git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"
git config --global init.defaultBranch main

echo "==> 2. Installing nvm (if missing) and latest LTS Node"
if [ -z "${NVM_DIR-}" ] || [ ! -s "$HOME/.nvm/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install --lts
nvm alias default 'lts/*'
echo "Using node $(node -v)"

echo "==> 3. Installing git-flow AVH edition"
if ! command -v git-flow >/dev/null 2>&1; then
  # try apt first
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y git-flow
  fi

  # fallback to AVH installer if not present
  if ! command -v git-flow >/dev/null 2>&1; then
    echo "Installing git-flow AVH manually"
    curl -sLo /tmp/git-flow-installer.sh https://raw.githubusercontent.com/petervanderdoes/gitflow-avh/develop/contrib/gitflow-installer.sh
    bash /tmp/git-flow-installer.sh
    rm /tmp/git-flow-installer.sh
  fi
fi
echo "git-flow version: $(git flow version || true)"

echo "==> 4. Adding helpers to ~/.bashrc (won't duplicate if already present)"
helpers_marker="# ---- troy git/git-flow helpers ----"
if ! grep -qF "$helpers_marker" "$HOME/.bashrc"; then
  cat <<'EOF' >> "$HOME/.bashrc"

# ---- troy git/git-flow helpers ----
_gitflow_ensure_initialized() {
  if ! git config --get-regexp '^gitflow\.' >/dev/null 2>&1; then
    echo "⚠️  git-flow not initialized in this repo. Run: git flow init"
  fi
}

gcommit() {
  local prefix="$1"
  shift
  local message="$*"
  if [ -z "$message" ]; then
    echo "Usage: gcommit <prefix> <message>"
    return 1
  fi
  git add .
  git commit -m "${prefix} ${message}"
  git push -u origin "$(git branch --show-current)"
}

gfstart() {
  local feature_name="$1"
  shift
  local commit_msg="${*:-feat: start ${feature_name}}"
  if [ -z "$feature_name" ]; then
    echo "Usage: gfstart <feature-name> [commit message]"
    return 1
  fi
  _gitflow_ensure_initialized
  current_branch=$(git branch --show-current)
  if [ "$current_branch" != "develop" ]; then
    echo "⚠️  Recommended to start features from 'develop' but you're on '$current_branch'."
    read -p "Continue anyway? (y/N) " yn
    case "$yn" in
      [Yy]*) ;;
      *) echo "Aborted."; return 1 ;;
    esac
  fi
  git add .
  git commit -m "$commit_msg"
  git push -u origin "$(git branch --show-current)"
  git flow feature start "$feature_name"
}

gffinish() {
  local feature_name="$1"
  if [ -z "$feature_name" ]; then
    echo "Usage: gffinish <feature-name>"
    return 1
  fi
  _gitflow_ensure_initialized
  git flow feature finish "$feature_name"
  git push origin develop
  git push origin main
}

grstart() {
  local version="$1"
  if [ -z "$version" ]; then
    echo "Usage: grstart <version>"
    return 1
  fi
  _gitflow_ensure_initialized
  git flow release start "$version"
}

grfinish() {
  local version="$1"
  if [ -z "$version" ]; then
    echo "Usage: grfinish <version>"
    return 1
  fi
  _gitflow_ensure_initialized
  git flow release finish "$version"
  git push origin main
  git push origin develop
  git push --tags
}

ghstart() {
  local name="$1"
  if [ -z "$name" ]; then
    echo "Usage: ghstart <hotfix-name>"
    return 1
  fi
  _gitflow_ensure_initialized
  git flow hotfix start "$name"
}

ghfinish() {
  local name="$1"
  if [ -z "$name" ]; then
    echo "Usage: ghfinish <hotfix-name>"
    return 1
  fi
  _gitflow_ensure_initialized
  git flow hotfix finish "$name"
  git push origin main
  git push origin develop
  git push --tags
}

gst() {
  echo "Branch: $(git branch --show-current)"
  git status -sb
}

gpull() {
  local branch="${1:-develop}"
  git fetch origin
  git checkout "$branch"
  git pull origin "$branch"
}

gpush() {
  git push -u origin "$(git branch --show-current)"
}

gprune() {
  git fetch -p
  git branch --merged develop | grep -vE '(^\*|develop|main)' | xargs -r git branch -d
  git remote prune origin
}
# ---- end helpers ----
EOF
  echo "Appended helpers to ~/.bashrc"
else
  echo "Helpers already present in ~/.bashrc, skipping append."
fi

echo "==> 5. Create .nvmrc with LTS if missing"
echo "lts/*" > .nvmrc

echo "==> 6. Setup optional commit template"
if [ ! -f .git/commit-template.txt ]; then
  mkdir -p .git
  cat <<'EOF' > .git/commit-template.txt
<type>(<scope>): <short summary>

<body> (optional, more detail)

BREAKING CHANGE: <description> (if applicable)
Refs: #
EOF
  git config commit.template .git/commit-template.txt
  echo "Commit template created and configured."
else
  echo "Commit template already exists, skipping."
fi

echo "==> Bootstrap complete. Reload your shell or run: source ~/.bashrc"

