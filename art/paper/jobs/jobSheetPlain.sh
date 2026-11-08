#!/bin/bash
# Phil's sheet poses with the pepperoni taken off (art/paper/make_sheet_runs.py).
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd $FORGE_PROJECT
echo "chunk slice-jumbo sheet_plain"; /home/tommy/projects/sprite-forge/.venv/bin/python -m forge.generate characters/slice-jumbo/runs/sheet_plain.toml qwen-edit
