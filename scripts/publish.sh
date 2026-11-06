#!/usr/bin/env bash
# Publish the game to archerpeligo.club/analysis/pizza-runner/ from a stable local copy.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$root/dist/pizza-runner"
mkdir -p "$root/dist/pizza-runner"
cp -r "$root/index.html" "$root/style.css" "$root/js" "$root/assets" "$root/dist/pizza-runner/"
cd ~/projects/archerpeligo
./scripts/publish-analysis.py "$root/dist/pizza-runner"
