"""Cuts the picked Qwen images from runs/paper_obstacles.toml into game art:  python backgrounds/obstacles_build.py ASSETS_BACKGROUNDS   (from art/)
Picks are in backgrounds/obstacles_picks.json. Writes props/obstacle-{flour,cans,parm,salami}.png (80x100 like the old barricades,
so collision widths hold; touchable, so sticker-bordered) and props/flour-puff-1..8.png (thin border, they float)."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import paper_ny_build as nb
from forge.generate import DATA
from forge.layers import write_sources
from paper import sticker
from pizza_boxes_build import biggest, crop, finish, keyed

RUN = DATA / "runs" / "paper" / "obstacles-1" / "qwen-edit"
PICKS = json.loads((Path(__file__).resolve().parent / "obstacles_picks.json").read_text())
PUFF_SCALE = 0.3


def load(shot, seed, peel=False):
    rgb = np.asarray(Image.open(RUN / shot / f"{seed}.png").convert("RGB"))
    from paper import key_rgb, peel_halo
    keep = key_rgb(rgb)
    return rgb, (peel_halo(rgb, keep) if peel else keep)


def body_only(keep):
    """Swatches from the style reference sometimes fuse to the object's foot: keep only the columns its middle rows span."""
    ys = np.where(keep.any(1))[0]
    y0, y1 = ys.min(), ys.max()
    mid = keep[int(y0 + 0.25 * (y1 - y0)):int(y0 + 0.75 * (y1 - y0))]
    xs = np.where(mid.any(0))[0]
    out = keep.copy()
    out[:, :max(0, xs.min() - 4)] = False
    out[:, xs.max() + 5:] = False
    return biggest(out, 0.999)


def trim_light_foot(rgb, keep):
    """Cuts the paper swatch the cans stand on: everything more than a can rim below the last row of green label goes."""
    r, g, b = [rgb[..., k].astype(int) for k in range(3)]
    green = keep & (g > r + 30) & (g > b + 30)
    rows = np.where(green.sum(1) > 5)[0]
    ys = np.where(keep.any(1))[0]
    cut = rows.max() + int(0.035 * (ys.max() - ys.min()))
    out = keep.copy()
    out[cut + 1:] = False
    return out


def flour_white(rgba):
    """Flour is white: every pixel is set to its lightness on a warm cream, so no key tint survives in the edges."""
    out = rgba.copy()
    lum = rgba[..., :3].astype(float) @ [0.3, 0.55, 0.15]
    lum = 205 + (np.clip(lum, 150, 255) - 150) * 0.48
    for i, k in enumerate((1.0, 0.985, 0.93)):
        out[..., i] = np.clip(lum * k, 0, 255).astype(np.uint8)
    return out


def puffs(seed):
    rgb, keep = load("puffs", seed)
    keep = biggest(ndimage.binary_opening(keep, iterations=1), 0.01)
    made = {}
    for r in range(2):
        for c in range(4):
            x0, y0 = c * 256, r * 512
            cell = keep[y0:y0 + 512, x0:x0 + 256]
            lbl, n = ndimage.label(cell)
            if not n:
                continue
            sz = ndimage.sum(cell, lbl, range(1, n + 1))
            part = lbl == 1 + int(np.argmax(sz))
            im = Image.fromarray(crop(rgb[y0:y0 + 512, x0:x0 + 256], part), "RGBA")
            im = im.resize((max(4, round(im.width * PUFF_SCALE)), max(4, round(im.height * PUFF_SCALE))), Image.LANCZOS)
            made[f"flour-puff-{len(made) + 1}"] = sticker(finish(flour_white(np.asarray(im)), 300 + len(made), 12), border=2, shadow=(0, 0), floor=False)
    return made


def main():
    dest = Path(sys.argv[1]) / "props"
    made = {}
    for kind, (shot, seed) in PICKS["obstacles"].items():
        rgb, keep = load(shot, seed)
        if kind == "cans":
            keep = trim_light_foot(rgb, keep)
        made[f"obstacle-{kind}"] = nb.fit_prop(crop(rgb, body_only(biggest(ndimage.binary_opening(keep, iterations=1), 0.999))), 80, 100, 0)
    made.update(puffs(PICKS["puffs"]))
    for name, arr in made.items():
        Image.fromarray(arr, "RGBA").save(dest / f"{name}.png", optimize=True)
        print(name, arr.shape[1], arr.shape[0])
    write_sources(dest / "obstacles-sources.json", {"qwen-edit": {"run": "paper/obstacles-1", "spec": "art/runs/paper_obstacles.toml",
                  "build": "art/backgrounds/obstacles_build.py", "picks": PICKS, "files": sorted(made)}})


if __name__ == "__main__":
    main()
