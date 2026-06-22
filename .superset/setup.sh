#!/bin/bash
# .superset/setup.sh
# Runs in each new Superset workspace (git worktree) right after creation.
# Worktrees only contain git-tracked files, so gitignored config like .env
# must be copied from the main repo. See https://docs.superset.sh/setup-teardown-scripts
set -euo pipefail

# Resolve the main repo working tree (where the canonical .env lives).
# git rev-parse --git-common-dir points at <main-repo>/.git for worktrees.
GIT_COMMON_DIR="$(git rev-parse --git-common-dir)"
MAIN_REPO="$(cd "$GIT_COMMON_DIR/.." && pwd)"

# Copy gitignored env files from the main repo if they aren't already present.
for envfile in .env .env.local .env.development .env.production; do
  if [ -f "$MAIN_REPO/$envfile" ] && [ ! -f "./$envfile" ]; then
    cp "$MAIN_REPO/$envfile" "./$envfile"
    echo "Copied $envfile from main repo"
  fi
done

# Install dependencies (worktrees start without node_modules).
if [ ! -d node_modules ]; then
  npm install
fi

echo "Workspace ready!"
