#!/bin/bash
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/.claude/worktrees/agent-ae0f303c6ce6bd02f/art PYTHONPATH=/home/tommy/projects/sprite-forge
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/.claude/worktrees/agent-ae0f303c6ce6bd02f/art
cd $FORGE_PROJECT
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
for c in slice-deep slice-jumbo; do
  echo "chunk $c masters3"; $PY -m forge.generate characters/$c/runs/paper_masters3.toml qwen-edit
done
# the card is held for at most 25 minutes while the masters are picked
echo "chunk waiting for picks"
for i in $(seq 150); do [ -f /tmp/prs/goE.sh ] && break; sleep 10; done
[ -f /tmp/prs/goE.sh ] && bash /tmp/prs/goE.sh
