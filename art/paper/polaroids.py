"""Corkboard Polaroids: a picked candid generation in, the game's photo out.

    python3 art/paper/polaroids.py enemy CHARACTER SHOT SEED JOB     -> assets/polaroids/TYPE.png (244x176; no longer shown: since 2026-11-11 the corkboard uses Tommy's painted Polaroids in assets/cutscenes/board/)
    python3 art/paper/polaroids.py alewife SHOT SEED JOB [RUN]      -> assets/backgrounds/hq/alewife-polaroid.png (300x300, the final shot)

The generated image is kept as art/characters/CHARACTER/references/polaroid-source.png (+ .json record). The photo is softened (it was snapped from
the bushes), given a faint warm cast and vignette, and cut to 112 colours without dithering so it sits with the sprites.
"""
import json, shutil, sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ART = Path(__file__).resolve().parents[1]
GAME = ART.parent
DATA = Path("/mnt/data/sprite-forge/runs")


def keep(char, run, shot, seed, job):
    src = DATA / char / run / "qwen-edit" / shot / f"{seed}"
    out = ART / f"characters/{char}/references/polaroid-source.png"
    shutil.copy(f"{src}.png", out)
    rec = json.loads(Path(f"{src}.json").read_text())
    rec["job"] = int(job)
    out.with_suffix(".json").write_text(json.dumps(rec, indent=1))
    return Image.open(out).convert("RGB")


def develop(im, size, blur, vignette=0.28):
    w, h = size
    # cover-crop to the target ratio
    r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    im = im.crop(((im.width - w) // 2, (im.height - h) // 2, (im.width - w) // 2 + w, (im.height - h) // 2 + h))
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(im).astype(float)
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
    a *= (1 - vignette * np.clip(d - 0.55, 0, 1) ** 1.5)[..., None]
    a = a * np.array([1.03, 1.0, 0.94]) + np.array([6, 3, 0])   # faint warm snapshot cast
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return im.quantize(112, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")


if __name__ == "__main__":
    what = sys.argv[1]
    if what == "enemy":
        char, shot, seed, job = sys.argv[2:6]
        out = GAME / "assets/polaroids"
        out.mkdir(parents=True, exist_ok=True)
        develop(keep(char, "polaroid", shot, seed, job), (244, 176), 0.9).save(out / f"{char}.png", optimize=True)
    else:
        shot, seed, job = sys.argv[2:5]
        develop(keep("alewife", sys.argv[5] if len(sys.argv) > 5 else "polaroid", shot, seed, job), (300, 300), 0.5, 0.2).save(GAME / "assets/backgrounds/hq/alewife-polaroid.png", optimize=True)
    print("ok", sys.argv[1:])
