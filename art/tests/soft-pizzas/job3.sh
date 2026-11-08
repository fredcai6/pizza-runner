#!/bin/bash
# one GPU job, from the repo root:
#   ws submit --priority 10 --vram 30G --mem 8G --cores 2 --name soft-pizzas-3 -- art/tests/soft-pizzas/job3.sh
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
export FORGE_PROJECT=$ROOT/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd "$FORGE_PROJECT"
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
for c in slice-deep slice-jumbo slice-naples slice-ny; do
  echo "chunk $c"
  $PY -m forge.generate characters/$c/runs/soft3_masters.toml qwen-edit
done
