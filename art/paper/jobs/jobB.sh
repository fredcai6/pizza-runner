#!/bin/bash
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/.claude/worktrees/agent-ae0f303c6ce6bd02f/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd $FORGE_PROJECT
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
for c in slice-deep slice-jumbo slice-naples; do
  echo "chunk $c masters2"; $PY -m forge.generate characters/$c/runs/paper_masters2.toml qwen-edit
done
for c in teen turtle; do
  echo "chunk $c polaroid"; $PY -m forge.generate characters/$c/runs/polaroid.toml qwen-edit
done
echo "chunk lincolnpark redo"; $PY -m forge.generate characters/customer-chicago-lincolnpark/runs/paper_masters2.toml qwen-edit
