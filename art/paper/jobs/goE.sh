#!/bin/bash
set -e
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
for c in slice-deep slice-jumbo; do
  echo "chunk $c keys"; $PY -m forge.generate characters/$c/runs/paper.toml qwen-edit
done
for c in recruit-deep recruit-jumbo recruit-naples; do
  echo "chunk $c master"; $PY -m forge.generate characters/$c/runs/paper_masters.toml qwen-edit
done
echo "chunk alewife polaroid2"; $PY -m forge.generate characters/alewife/runs/polaroid2.toml qwen-edit
