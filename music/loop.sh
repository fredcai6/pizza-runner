#!/usr/bin/env bash
# Runs music/loop.py (CPU) in sprite-forge's ComfyUI image, inside the ws job that launched it.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
round=$(realpath "$1")
exec docker run --rm --name "pizza-loop-$$" \
  ${WS_JOB_LABEL:+--label "$WS_JOB_LABEL"} \
  ${WS_JOB_CPUS:+--cpuset-cpus "$WS_JOB_CPUS"} \
  $( [ "${WS_JOB_MEM_MIB:-0}" -gt 0 ] && echo "--memory ${WS_JOB_MEM_MIB}m --memory-swap ${WS_JOB_MEM_MIB}m" ) \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e PYTHONUNBUFFERED=1 \
  -v /mnt/data/pizza-runner-music:/music -v "$here:/code:ro" -v "$round:/round.toml:ro" \
  --entrypoint python3 sprite-forge-comfy:latest /code/loop.py /round.toml
