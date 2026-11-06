#!/usr/bin/env python3
"""Copy one finished animation into assets/ and list it in the manifest.

Usage: import-sprites.py FORGE_CHARACTER ANIM GAME_NAME GAME_ANIM
Example: import-sprites.py teen pg-run teen walk
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORGE = ROOT / "art/characters"
ASSETS = ROOT / "assets"


def main(character, anim, name, game_anim):
    source = FORGE / character / "sprites" / anim
    target = ASSETS / "sprites" / name / game_anim
    target.mkdir(parents=True, exist_ok=True)
    for file in ("sheet.png", "atlas.json"):
        shutil.copy(source / file, target / file)
    manifest_path = ASSETS / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    anims = manifest.setdefault(name, [])
    if game_anim not in anims:
        anims.append(game_anim)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"{name}/{game_anim} from {character}/{anim}")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
