#!/bin/bash
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/.claude/worktrees/agent-ae0f303c6ce6bd02f/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd $FORGE_PROJECT
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
for c in slice-deep slice-jumbo slice-naples ninja mutant alewife customer-chicago-loop customer-chicago-lincolnpark customer-chicago-wickerpark customer-dc-georgetown customer-dc-mall customer-dc-federal customer-naples-harbor customer-naples-center customer-naples-hillside customer-california-downtown customer-california-beach; do
  echo "chunk $c"; $PY -m forge.generate characters/$c/runs/paper_masters.toml qwen-edit
done
