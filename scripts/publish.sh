#!/usr/bin/env bash
# Publish the game to archerpeligo.club/pizza-runner/ (public, no login).
# Caddy bind-mounts /mnt/data/site/pizza-runner read-only. The mount is pinned to
# that directory itself, so update its contents in place: replacing the
# directory (mv/rm) leaves caddy serving the deleted one, and every URL 404s.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
dest=/mnt/data/site/pizza-runner
mkdir -p "$dest"
rsync -a --delete --exclude='.*' \
  "$root/index.html" "$root/style.css" "$root/js" "$root/assets" "$dest/"
echo "https://archerpeligo.club/pizza-runner/"
