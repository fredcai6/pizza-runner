"""Gives the thrown-topping sprites (props/shot-*.png) the street border (paper.STREET), from their unbordered originals:
    python backgrounds/shots_border.py ASSETS_BACKGROUNDS   (from art/)
The originals are read from git at REV (before the border), so a rerun never borders twice."""
import io
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from paper import STREET, sticker

REV = "4a00614"   # main before the 2026-11-11 border audit
TOPPINGS = ("basil", "garlic", "jalapeno", "mushroom", "pepperoni", "pineapple", "sausage")

for t in TOPPINGS:
    rel = f"assets/backgrounds/props/shot-{t}.png"
    raw = subprocess.run(["git", "show", f"{REV}:{rel}"], capture_output=True, check=True).stdout
    arr = np.asarray(Image.open(io.BytesIO(raw)).convert("RGBA")).copy()
    arr[..., 3] = np.where(arr[..., 3] > 127, 255, 0)
    out = sticker(arr, shadow=(0, 0), **STREET)
    Image.fromarray(out, "RGBA").save(Path(sys.argv[1]) / "props" / f"shot-{t}.png", optimize=True)
    print(t, arr.shape[1], arr.shape[0], "->", out.shape[1], out.shape[0])
