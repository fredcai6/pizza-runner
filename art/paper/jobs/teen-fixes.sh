#!/bin/bash
# Teen cast re-rolls: motions where the model dropped a defining feature (teen-e's braid in the flee).
set -e
export FORGE_PROJECT=/home/tommy/projects/pizza-runner/art PYTHONPATH=/home/tommy/projects/sprite-forge
cd $FORGE_PROJECT
PY=/home/tommy/projects/sprite-forge/.venv/bin/python
echo "chunk 1/1 teen-e flee braid"
$PY paper/paperpose.py gen teen-e flee --seeds 3,4 --note "Her one long thick black braid hangs down her back and swings out behind her head in every frame; it is never missing."
