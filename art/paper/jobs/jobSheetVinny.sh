#!/bin/bash
# Vinny's sheet: pepperoni-free poses, cold, and the plain recruit (art/paper/make_sheet_runs.py).
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd $FORGE_PROJECT
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
echo "chunk slice-ny sheet_plain"; $PY -m forge.generate characters/slice-ny/runs/sheet_plain.toml qwen-edit
echo "chunk slice-ny sheet_keys"; $PY -m forge.generate characters/slice-ny/runs/sheet_keys.toml qwen-edit
echo "chunk recruit-ny sheet_keys"; $PY -m forge.generate characters/recruit-ny/runs/sheet_keys.toml qwen-edit
