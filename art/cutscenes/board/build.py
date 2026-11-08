"""Tommy's corkboard layers (2026-11-08) to game assets: assets/cutscenes/board/*.webp. js/hq.js (paintedBoard) pins them on the
painted room live, from the campaign: receipts, suspects, notes, the final photo.

    ~/projects/sprite-forge/.venv/bin/python art/cutscenes/board/build.py

Cut-outs came with a soft glow in their alpha: keep alpha >= 200, trim 1 px (the tickets carry a yellow/red fringe there), feather.
room-front.webp is the four recruits seen from behind, cut from the room itself, drawn over Dayold so he sits behind them.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[2] / "assets/cutscenes/board"
ROOM_W = 1672                       # native: the board shots zoom in
CUTS = {"dayold": 900, "polaroid-teen": 600, "polaroid-turtle": 600, "order-1": 300, "order-2": 300}   # longest side, px (close-ups zoom to ~3x)


def cut(name, size):
    im = np.asarray(Image.open(HERE / f"{name}.png").convert("RGBA")).copy()
    solid = im[..., 3] >= 200
    lab, n = ndimage.label(solid)
    solid = lab == 1 + int(np.argmax(ndimage.sum(solid, lab, range(1, n + 1))))
    solid = ndimage.binary_erosion(ndimage.binary_fill_holes(solid), iterations=1)
    a = Image.fromarray((solid * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    im[..., 3] = np.asarray(a)
    ys, xs = np.where(solid)
    pic = Image.fromarray(im).crop((xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3))
    k = size / max(pic.size)
    pic = pic.resize((round(pic.width * k), round(pic.height * k)), Image.LANCZOS)
    pic.save(OUT / f"{name}.webp", quality=92, method=6)
    print(name, pic.size)


def room():
    im = Image.open(HERE / "room.png").convert("RGB")
    im = im.resize((ROOM_W, round(im.height * ROOM_W / im.width)), Image.LANCZOS)
    im.save(OUT / "room.webp", quality=90, method=6)
    # the recruits from behind: very dark shapes along the bottom, grown out over their rims
    rgb = np.asarray(im).astype(int)
    dark = rgb.max(-1) < 118
    dark[: int(im.height * 0.6)] = False
    lab, n = ndimage.label(dark)
    sizes = ndimage.sum(dark, lab, range(1, n + 1))
    # only shapes that run off the bottom edge: the recruits do, his chair (dark too) does not
    bottom = np.unique(lab[-1])
    keep = np.isin(lab, [k for k in bottom if k and sizes[k - 1] > 4000])
    keep = ndimage.binary_dilation(ndimage.binary_fill_holes(keep), iterations=12)
    front = np.dstack([rgb.astype(np.uint8), (keep * 255).astype(np.uint8)])
    Image.fromarray(front, "RGBA").save(OUT / "room-front.webp", quality=90, method=6)
    print("room", im.size, "front px", int(keep.sum()))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    room()
    for k, v in CUTS.items():
        cut(k, v)
