"""Build a teen's pose-guided walk or flee from both generated seeds and keep the steadier one.

    art/paper/forge.sh art/paper/teen_motion.py teen-b walk [SEEDS]      (CPU; run inside a ws job; SEEDS default 1,2)
Steadier = the figure's size (area) changes least from frame to frame (a frame the model drew larger pops in play).
The pick and every frame's height go in sprites/ANIM/pick.json; the sheet is still checked by eye before import.
"""
import json, shutil, subprocess, sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ART = HERE.parent
MOTION = {"walk": ("walk-texting", "112,118"), "flee": ("flee", "150,118")}


def heights(sheet, w):
    """The figure's area in each frame, in pixels (frames are scaled to the canvas height, so a frame drawn too big
    shows as extra width and bulk, not extra height)."""
    a = np.array(Image.open(sheet).convert("RGBA"))[..., 3] > 0
    return [int(a[:, i * w:(i + 1) * w].sum()) for i in range(a.shape[1] // w)]


def main(teen, anim, seeds="1,2"):
    seeds = [int(x) for x in seeds.split(",")]
    motion, canvas = MOTION[anim]
    w = int(canvas.split(",")[0])
    sprites = ART / "characters" / teen / "sprites"
    best = None
    for seed in seeds:
        out = f"{anim}-s{seed}"
        subprocess.run([sys.executable, str(HERE / "paperpose.py"), "sprite", teen, motion, "--seed", str(seed), "--canvas", canvas, "--out", out], check=True)
        h = heights(sprites / out / "sheet.png", w)
        jump = round(max(abs(x - y) / min(x, y) for x, y in zip(h, h[1:] + h[:1])), 3)   # largest frame-to-frame change, as a share
        print(f"{teen} {anim} seed {seed}: areas {h}, biggest jump {jump}")
        if best is None or jump < best[0]:
            best = (jump, seed, h)
    jump, seed, h = best
    if (sprites / anim).exists():
        shutil.rmtree(sprites / anim)
    shutil.move(str(sprites / f"{anim}-s{seed}"), str(sprites / anim))
    for s in seeds:
        shutil.rmtree(sprites / f"{anim}-s{s}", ignore_errors=True)
    (sprites / anim / "pick.json").write_text(json.dumps({"seed": seed, "areas": h, "biggest_jump": jump}, indent=1))
    print(f"{teen} {anim}: kept seed {seed}")


if __name__ == "__main__":
    main(*sys.argv[1:])
