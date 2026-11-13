#!/usr/bin/env bash
# Fetches MusicGen stereo-melody-large (Meta, CC BY-NC 4.0: credit Meta in the game) in Transformers format,
# pinned to revision eea14861e6c29c47aea1055982a217468cd1634d. Resumes partial downloads.
set -euo pipefail
REV=eea14861e6c29c47aea1055982a217468cd1634d
DEST=${DEST:-/mnt/data/models/musicgen-stereo-melody-large/$REV}
mkdir -p "$DEST"
for f in config.json generation_config.json preprocessor_config.json special_tokens_map.json spiece.model \
         tokenizer.json tokenizer_config.json model.safetensors.index.json \
         model-00001-of-00003.safetensors model-00002-of-00003.safetensors model-00003-of-00003.safetensors; do
  curl -fL --retry 5 -C - -o "$DEST/$f" "https://huggingface.co/facebook/musicgen-stereo-melody-large/resolve/$REV/$f"
done
