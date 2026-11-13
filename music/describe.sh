#!/usr/bin/env bash
# Runs music/describe.py in sprite-forge's ComfyUI image on the GPU, inside the ws job that launched it.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
MODEL=${DESCRIBE_MODEL:-/mnt/data/models/music-flamingo-2601/6b5be086d52f65a1e204cb0faf70bf54e2741ecd}
round=$(realpath "$1")
exec docker run --rm --name "pizza-describe-$$" \
  ${WS_JOB_LABEL:+--label "$WS_JOB_LABEL"} \
  ${WS_JOB_CPUS:+--cpuset-cpus "$WS_JOB_CPUS"} \
  $( [ "${WS_JOB_MEM_MIB:-0}" -gt 0 ] && echo "--memory ${WS_JOB_MEM_MIB}m --memory-swap ${WS_JOB_MEM_MIB}m" ) \
  --device /dev/kfd --device /dev/dri --group-add 44 --group-add 992 \
  --security-opt seccomp=unconfined --ipc host --user "$(id -u):$(id -g)" \
  -e ROCR_VISIBLE_DEVICES=0 -e HOME=/tmp -e HF_HUB_OFFLINE=1 -e PYTHONUNBUFFERED=1 \
  -v "$MODEL:/model:ro" -v /mnt/data/pizza-runner-music:/music -v "$here:/code:ro" -v "$round:/round.toml:ro" \
  --entrypoint python3 sprite-forge-comfy:latest /code/describe.py /round.toml
