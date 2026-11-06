#!/bin/bash
# Rebuilds the slices that wear their toppings at runtime, from the finished sheets in art/.
# Usage: scripts/dress-sprites.sh [style ...]     Registering a whole style takes several minutes.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
FORGE=${SPRITE_FORGE:-$HOME/projects/sprite-forge}
export FORGE_PROJECT=$ROOT/art
for style in "${@:-ny deep jumbo naples}"; do for s in $style; do
  (cd "$FORGE" && .venv/bin/python -m forge.decals "characters/slice-$s/decals.toml")
  "$ROOT/scripts/dress-import.sh" "$s"
done; done
