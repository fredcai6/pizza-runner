#!/bin/bash
# Teen cast, step 2: re-roll teen-f's master, then key poses and pose-guided walk/flee for every picked teen.
# Each forge call skips images that already exist, so a stopped job resumes where it was.
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd $FORGE_PROJECT
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
TEENS="${TEENS:-teen-b teen-c teen-d teen-e teen-g}"
n=0; total=$(( $(echo $TEENS | wc -w) * 3 + 1 ))
n=$((n+1)); echo "chunk $n/$total teen-f masters"; $PY -m forge.generate characters/teen-f/runs/paper_masters.toml qwen-edit
for c in $TEENS; do
  n=$((n+1)); echo "chunk $n/$total $c keys"; $PY -m forge.generate characters/$c/runs/paper.toml qwen-edit
  n=$((n+1)); echo "chunk $n/$total $c walk"; $PY paper/paperpose.py gen $c walk-texting --seeds 1,2 --hands phone
  n=$((n+1)); echo "chunk $n/$total $c flee"; $PY paper/paperpose.py gen $c flee --seeds 1,2
done
