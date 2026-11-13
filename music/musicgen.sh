#!/usr/bin/env bash
# Runs music/musicgen.py in sprite-forge's ComfyUI image on the GPU, inside the ws job that launched it.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
MODEL=${MUSICGEN_MODEL:-/mnt/data/models/musicgen-stereo-melody-large/eea14861e6c29c47aea1055982a217468cd1634d}
round=$(realpath "$1")
exec docker run --rm --name "pizza-musicgen-$$" \
  ${WS_JOB_LABEL:+--label "$WS_JOB_LABEL"} \
  ${WS_JOB_CPUS:+--cpuset-cpus "$WS_JOB_CPUS"} \
  $( [ "${WS_JOB_MEM_MIB:-0}" -gt 0 ] && echo "--memory ${WS_JOB_MEM_MIB}m --memory-swap ${WS_JOB_MEM_MIB}m" ) \
  --device /dev/kfd --device /dev/dri --group-add 44 --group-add 992 \
  --security-opt seccomp=unconfined --ipc host --user "$(id -u):$(id -g)" \
  -e ROCR_VISIBLE_DEVICES=0 -e HOME=/tmp -e HF_HUB_OFFLINE=1 -e PYTHONUNBUFFERED=1 \
  -v "$MODEL:/model:ro" -v /mnt/data/pizza-runner-music:/music -v "$here:/code:ro" -v "$round:/round.toml:ro" \
  --entrypoint python3 sprite-forge-comfy:latest /code/musicgen.py /round.toml
