#!/usr/bin/env bash
# One ws job for a song round: ACE-Step songs, then their game loops.
#   ws submit --cores 2 --mem 24G --vram 16G --expect 15m --priority 10 --name pizza-music -- music/song-round.sh music/rounds/04.toml
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
python3 "$here/generate.py" "$1"
"$here/loop.sh" "$1"
