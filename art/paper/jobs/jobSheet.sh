#!/bin/bash
# Qwen runs for what the 2026-11-08 character sheets leave out (art/paper/make_sheet_runs.py).
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd $FORGE_PROJECT
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
for c in slice-jumbo slice-deep slice-naples old-timer recruit-jumbo recruit-deep recruit-naples; do
  echo "chunk $c sheet_keys"; $PY -m forge.generate characters/$c/runs/sheet_keys.toml qwen-edit
done
echo "chunk slice-ny sheet_look"; $PY -m forge.generate characters/slice-ny/runs/sheet_look.toml qwen-edit
