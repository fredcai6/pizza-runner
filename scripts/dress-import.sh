#!/bin/bash
# Adds the blink to one style's plain idle and imports its plain sheets. Usage: scripts/dress-import.sh STYLE
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
FORGE=${SPRITE_FORGE:-$HOME/projects/sprite-forge}
export FORGE_PROJECT=$ROOT/art
declare -A EYES=(
  [ny]="76,40,9,11 89,39,6,10"
  [deep]="120,78,7,6 136,77,6,5"
  [jumbo]="173,88,16,19 192,87,11,16"
  [naples]="70,38,6,9 79,38,5,9"
)
s=$1
(cd "$FORGE" && .venv/bin/python -m forge.blink "characters/slice-$s/sprites/idle-plain" ${EYES[$s]})
for dir in "$ROOT/art/characters/slice-$s/sprites/"*-plain; do
  anim=$(basename "$dir" -plain)
  python3 "$ROOT/scripts/import-sprites.py" "slice-$s" "$anim-plain" "slice-$s" "$anim"
done
