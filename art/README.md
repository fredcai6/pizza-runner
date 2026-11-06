# Pizza Runner art

Everything the art is made from: characters, backgrounds, style rules (`characters/STYLE.md`) and build scripts.
Finished files land in `../assets/`. The tools are in sprite-forge, which stays generic.

    cd art
    export PYTHONPATH=~/projects/sprite-forge
    PY=~/projects/sprite-forge/.venv/bin/python
    $PY -m forge.runrig characters/slice-ny/rig/run.toml          # code-drawn runs, for the pizzas
    ~/projects/gpu-manager/gpu submit --vram 30G --name pg-teen -- $PY -m forge.poseguide make teen run qwen-pose-run --seeds 1,2 --name teen/flee
    ../scripts/import-sprites.py slice-ny run slice-ny run

`tools/` holds sheets and checks specific to this game.
