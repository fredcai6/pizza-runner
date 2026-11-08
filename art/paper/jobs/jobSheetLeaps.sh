#!/bin/bash
# Phil's and Vinny's jump and land poses with the pepperoni edited off (art/paper/make_sheet_runs.py, EDIT).
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd $FORGE_PROJECT
for c in slice-jumbo slice-ny; do
  echo "chunk $c edits"; /home/tommy/projects/sprite-forge/.venv/bin/python -m forge.generate characters/$c/runs/sheet_plain.toml qwen-edit
done
