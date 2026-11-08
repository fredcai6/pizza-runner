#!/bin/bash
# Adds the blink to one style's plain idle and imports its plain sheets. Usage: scripts/dress-import.sh STYLE
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
FORGE=${SPRITE_FORGE:-$HOME/projects/sprite-forge}
export FORGE_PROJECT=$ROOT/art
declare -A EYES=(
  [ny]="64,52,5,5 80,48,5,5"
  [deep]="107,73,4,8 123,73,4,8"
  [jumbo]="167,90,4,10 186,90,4,10"
  [naples]="57,45,6,5 75,45,6,5"
)
s=$1
(cd "$FORGE" && .venv/bin/python -m forge.blink "characters/slice-$s/sprites/idle-plain" ${EYES[$s]})
for dir in "$ROOT/art/characters/slice-$s/sprites/"*-plain; do
  anim=$(basename "$dir" -plain)
  python3 "$ROOT/scripts/import-sprites.py" "slice-$s" "$anim-plain" "slice-$s" "$anim"
done
