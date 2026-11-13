#!/bin/bash
# Masters for the teen cast (make_teen_cast.py): 3 seeds each, one ComfyUI session per teen.
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd $FORGE_PROJECT
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
n=0; for c in teen-b teen-c teen-d teen-e teen-f teen-g; do
  n=$((n+1)); echo "chunk $n/6 $c masters"; $PY -m forge.generate characters/$c/runs/paper_masters.toml qwen-edit
done
