"""Tommy's corkboard layers (2026-11-08) to game assets: assets/cutscenes/board/*.webp. js/hq.js (paintedBoard) pins them on the
painted room live, from the campaign: receipts, suspects, notes, the final photo.

    ~/projects/sprite-forge/.venv/bin/python art/cutscenes/board/build.py

Cut-outs came with a soft glow in their alpha (the ninja and mutant Polaroids and the saluting Dayold came opaque, on a dark backdrop): keep alpha >= 200, trim 1 px (the tickets carry a yellow/red fringe there), feather.
room-front.webp is the four recruits seen from behind, cut from the room itself, drawn over Dayold so he sits behind them.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[2] / "assets/cutscenes/board"
ROOM_W = 1672                       # native: the board shots zoom in
CUTS = {"dayold": 900, "dayold-pointer": 900, "dayold-think": 900, "dayold-salute": 900, "polaroid-teen": 600, "polaroid-turtle": 600, "polaroid-ninja": 600, "polaroid-mutant": 600, "order-1": 300, "order-2": 300}   # longest side, px (close-ups zoom to ~3x)


def cut(name, size):
    src = Image.open(HERE / f"{name}.png")
    im = np.asarray(src.convert("RGBA")).copy()
    if src.mode == "RGB":
        # an opaque one (ninja, mutant) sits on dark brown: the backdrop is the dark joined to the edge
        dark = im[..., :3].max(-1) < 130
        lab, _ = ndimage.label(dark)
        edge = np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])
        im[..., 3] = np.where(np.isin(lab, edge[edge > 0]), 0, 255)
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


# Teen and turtle were lit brighter and cooler than ninja and mutant: shift them onto the pair's colour statistics (per channel mean and
# spread over the opaque pixels), most of the way, so all four read as one batch of photos.
MATCH = {"polaroid-teen": ["polaroid-ninja", "polaroid-mutant"], "polaroid-turtle": ["polaroid-ninja", "polaroid-mutant"]}
STRENGTH = 0.8


def stats(names):
    px = np.concatenate([(lambda a: a[a[..., 3] > 200][:, :3])(np.asarray(Image.open(OUT / f"{n}.webp").convert("RGBA")).astype(float))
                         for n in names])
    return px.mean(0), px.std(0)


def tone(name, refs):
    im = np.asarray(Image.open(OUT / f"{name}.webp").convert("RGBA")).astype(float)
    m, sd = stats([name])
    rm, rsd = stats(refs)
    moved = (im[..., :3] - m) / sd * rsd + rm
    im[..., :3] = np.clip(im[..., :3] + STRENGTH * (moved - im[..., :3]), 0, 255)
    Image.fromarray(im.astype(np.uint8), "RGBA").save(OUT / f"{name}.webp", quality=92, method=6)
    print(name, "toned to", ", ".join(refs))


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
    for k, refs in MATCH.items():
        tone(k, refs)
