#!/bin/bash
# Runs a paper tool with sprite-forge's venv from the game repo root:  art/paper/forge.sh art/paper/paperkit.py art/characters/NAME/anims/paper-idle.toml
export FORGE_PROJECT="$(cd "$(dirname "$0")/../.." && pwd)/art" PYTHONPATH="$HOME/projects/sprite-forge"
exec "$HOME/projects/sprite-forge/.venv/bin/python" "$@"
