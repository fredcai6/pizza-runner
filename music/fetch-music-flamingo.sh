#!/usr/bin/env bash
# Fetches Music Flamingo 2601 (NVIDIA OneWay Noncommercial licence), pinned to revision 6b5be086d52f65a1e204cb0faf70bf54e2741ecd:
# a music-specialist listening model (genre, tempo, key, chords, instruments, structure, mood).
set -euo pipefail
REV=6b5be086d52f65a1e204cb0faf70bf54e2741ecd
DEST=${DEST:-/mnt/data/models/music-flamingo-2601/$REV}
mkdir -p "$DEST"
for f in chat_template.jinja config.json generation_config.json model.safetensors processor_config.json tokenizer.json tokenizer_config.json; do
  mkdir -p "$DEST/$(dirname "$f")"
  curl -fL --retry 5 -C - -o "$DEST/$f" "https://huggingface.co/nvidia/music-flamingo-2601-hf/resolve/$REV/$f"
done
