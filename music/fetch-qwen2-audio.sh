#!/usr/bin/env bash
# Fetches Qwen2-Audio-7B-Instruct (Apache-2.0), pinned to revision 0a095220c30b7b31434169c3086508ef3ea5bf0a: listens to clips and describes them.
set -euo pipefail
REV=0a095220c30b7b31434169c3086508ef3ea5bf0a
DEST=${DEST:-/mnt/data/models/qwen2-audio-7b-instruct/$REV}
mkdir -p "$DEST"
for f in config.json generation_config.json merges.txt preprocessor_config.json tokenizer.json tokenizer_config.json vocab.json \
         model.safetensors.index.json model-0000{1,2,3,4,5}-of-00005.safetensors; do
  curl -fL --retry 5 -C - -o "$DEST/$f" "https://huggingface.co/Qwen/Qwen2-Audio-7B-Instruct/resolve/$REV/$f"
done
