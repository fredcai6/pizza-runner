#!/bin/bash
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/.claude/worktrees/agent-ae0f303c6ce6bd02f/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd $FORGE_PROJECT
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
for c in slice-naples ninja mutant alewife; do
  echo "chunk $c keys"; $PY -m forge.generate characters/$c/runs/paper.toml qwen-edit
done
echo "chunk ninja walk"; $PY paper/paperpose.py gen ninja walk --seeds 1,2 --hands "Both arms swing freely in a stealthy walking arm swing, the hands empty."
echo "chunk mutant run"; $PY paper/paperpose.py gen mutant run --seeds 1,2 --hands "Both long arms swing loosely, the hands big and low." --note "Hunched forward, head low, keep the vest exactly."
for c in ninja mutant alewife; do
  echo "chunk $c polaroid"; $PY -m forge.generate characters/$c/runs/polaroid.toml qwen-edit
done
