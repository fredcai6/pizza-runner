#!/usr/bin/env bash
# Fetches ACE-Step 1.5 into the shared ComfyUI weights folder (sprite-forge's container reads it). Resumes partials.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
MODELS_DIR=${MODELS_DIR:-/mnt/data/models/comfy}
grep -v '^#' "$here/models.txt" | while read -r dir url; do
  mkdir -p "$MODELS_DIR/$dir"
  curl -fL --retry 5 -C - -o "$MODELS_DIR/$dir/$(basename "$url")" "$url"
done
