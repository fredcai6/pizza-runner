#!/usr/bin/env bash
# Publish the game to archerpeligo.club/pizza-runner/ (public, no login).
# Caddy serves /mnt/data/site/pizza-runner read-only; this swaps in a fresh copy.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
dest=/mnt/data/site/pizza-runner
next="$dest.next"
rm -rf "$next"
mkdir -p "$next"
cp -r "$root/index.html" "$root/style.css" "$root/js" "$root/assets" "$next/"
rm -rf "$dest.old"
if [ -d "$dest" ]; then mv "$dest" "$dest.old"; fi
mv "$next" "$dest"
rm -rf "$dest.old"
echo "https://archerpeligo.club/pizza-runner/"
