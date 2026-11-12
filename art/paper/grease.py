"""Grease stains for the corkboard stickies: python art/paper/grease.py assets/paper   (sprite-forge venv)
Each is an irregular translucent blot, darker at its edge where the oil has wicked into the paper, with a couple of
small splashes beside it. Multiplied over a sticky in the CSS. Seeded, so a rebuild is byte-identical."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

OIL = (176, 112, 40)   # amber-brown, multiplied over yellow and orange paper


def blot(seed, size=160):
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:size, 0:size] / size
    field = np.zeros((size, size))
    cx, cy = 0.5 + rng.uniform(-0.05, 0.05), 0.5 + rng.uniform(-0.05, 0.05)
    for _ in range(9):                                   # the main blot: overlapping soft lobes
        ox, oy, r = cx + rng.normal(0, 0.09), cy + rng.normal(0, 0.09), rng.uniform(0.1, 0.2)
        field += np.exp(-((x - ox) ** 2 + (y - oy) ** 2) / (2 * r * r))
    for _ in range(rng.integers(2, 4)):                  # splashes
        ang, dist = rng.uniform(0, 2 * np.pi), rng.uniform(0.3, 0.42)
        ox, oy, r = cx + np.cos(ang) * dist, cy + np.sin(ang) * dist, rng.uniform(0.025, 0.045)
        field += 1.4 * np.exp(-((x - ox) ** 2 + (y - oy) ** 2) / (2 * r * r))
    field += ndimage.gaussian_filter(rng.standard_normal((size, size)), 3) * 0.35   # ragged edge
    inside = field > 1.0
    inside = ndimage.binary_opening(inside, iterations=1)
    d = ndimage.distance_transform_edt(inside)
    a = np.where(inside, 0.22 + 0.33 * np.exp(-d / 2.5), 0.0)   # body plus a darker wicked rim
    a += np.where(inside, ndimage.gaussian_filter(rng.standard_normal((size, size)), 2) * 0.04, 0)
    out = np.zeros((size, size, 4), np.uint8)
    out[..., :3] = OIL
    out[..., 3] = np.clip(a * 255, 0, 255).astype(np.uint8)
    return out


dest = Path(sys.argv[1])
dest.mkdir(parents=True, exist_ok=True)
for i, seed in enumerate((11, 23, 37), 1):
    Image.fromarray(blot(seed), "RGBA").save(dest / f"grease-{i}.png", optimize=True)
    print(f"grease-{i}.png")
