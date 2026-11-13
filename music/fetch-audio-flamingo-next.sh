#!/usr/bin/env bash
# Fetches Audio Flamingo Next (NVIDIA OneWay Noncommercial licence), pinned to revision 5634886e2615c2f587dcf8b93c6edfe9907930ca:
# general audio listener (speech, sound effects, music; up to 30 min), chat/QA checkpoint.
set -euo pipefail
REV=5634886e2615c2f587dcf8b93c6edfe9907930ca
DEST=${DEST:-/mnt/data/models/audio-flamingo-next/$REV}
mkdir -p "$DEST"
for f in chat_template.jinja config.json generation_config.json model.safetensors processor_config.json tokenizer.json tokenizer_config.json; do
  mkdir -p "$DEST/$(dirname "$f")"
  curl -fL --retry 5 -C - -o "$DEST/$f" "https://huggingface.co/nvidia/audio-flamingo-next-hf/resolve/$REV/$f"
done
