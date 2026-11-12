"""Cuts the picked Qwen images from runs/paper_boxes.toml into game art:  python backgrounds/pizza_boxes_build.py ASSETS_BACKGROUNDS   (from art/)
Picks are in backgrounds/pizza_boxes_picks.json. Writes CITY/box.png (84x84), CITY/box-pile.png (180x120) and CITY/box-broken.png
(90x24) for each city, and props/{cheese,sauce}-{drop,drip,string,splat}-N.png, the pieces the game throws about.
Boxes are touchable, so they get the sticker border; the squashed box is debris and gets none. The cheese and sauce
pieces get a thin white border so they hold against any street."""
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
from forge.layers import quantize, write_sources
from paper import add_grain, key_rgb, peel_halo, sticker

RUN = DATA / "runs" / "paper" / "boxes-1" / "qwen-edit"
PICKS = json.loads((Path(__file__).resolve().parent / "pizza_boxes_picks.json").read_text())
FX_SCALE = 0.22   # sheet pixels to stage pixels: a big drop ends up about 30 px across


def keyed(shot, seed, peel=False):
    """peel strips a white halo Qwen sometimes adds; off for boxes, since New York's and Chicago's are white card."""
    rgb = np.asarray(Image.open(RUN / shot / f"{seed}.png").convert("RGB"))
    keep = key_rgb(rgb)
    if peel:
        keep = peel_halo(rgb, keep)
    keep = ndimage.binary_opening(keep, iterations=1)
    return rgb, keep


def crop(rgb, keep):
    ys, xs = np.where(keep)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return np.dstack([rgb[y0:y1, x0:x1], keep[y0:y1, x0:x1] * 255]).astype(np.uint8)


def biggest(keep, frac=0.03):
    """Drops specks: keeps every piece at least frac of the biggest one."""
    lbl, n = ndimage.label(keep)
    if n <= 1:
        return keep
    sz = ndimage.sum(keep, lbl, range(1, n + 1))
    return np.isin(lbl, 1 + np.flatnonzero(sz >= frac * sz.max()))


def finish(rgba, seed, colors=30):
    arr = quantize(rgba.copy(), n=colors)
    arr = add_grain(arr, seed, 1.6)
    arr[..., 3] = np.where(arr[..., 3] > 127, 255, 0)
    arr[..., :3] = np.where(arr[..., 3:] > 0, arr[..., :3], 0)
    return arr


def broken(rgb, keep, w=90, h=24):
    im = Image.fromarray(crop(rgb, biggest(keep)), "RGBA")
    s = min(w / im.width, h / im.height)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.alpha_composite(Image.fromarray(finish(np.asarray(im), 5), "RGBA"), ((w - im.width) // 2, h - im.height))
    return np.asarray(out)


# The sheet guide is a 4x3 grid of 256x340 cells: row 0 drops, row 1 two drips then two strings, row 2 splats.
CELLS = [("drop", c, 0) for c in range(4)] + [("drip", c, 1) for c in range(2)] + [("string", c, 1) for c in range(2, 4)] + [("splat", c, 2) for c in range(4)]


def pieces(what, seed):
    rgb, keep = keyed(what, seed, peel=True)
    keep = biggest(keep, 0.01)
    count, made = {}, {}
    for kind, c, r in CELLS:
        x0, y0 = c * 256, max(0, r * 340 - 20)
        cell = keep[y0:y0 + 340 + 20, x0:x0 + 256]
        lbl, n = ndimage.label(cell)
        if not n:
            continue
        sz = ndimage.sum(cell, lbl, range(1, n + 1))
        part = lbl == 1 + int(np.argmax(sz))
        if kind == "string":   # the drip hanging off it goes, so only the string itself stretches
            core = ndimage.binary_opening(part, iterations=4)
            lb, m = ndimage.label(core)
            if m > 1:
                core = lb == 1 + int(np.argmax(ndimage.sum(core, lb, range(1, m + 1))))
            part = ndimage.binary_dilation(core, iterations=4) & part
        rgba = crop(rgb[y0:y0 + 360, x0:x0 + 256], part)
        im = Image.fromarray(rgba, "RGBA")
        if kind == "string":   # laid flat, so the game can turn it to point anywhere
            ys, xs = np.nonzero(np.asarray(im)[..., 3] > 127)
            ang = np.degrees(np.arctan2(*np.polyfit(xs, ys, 1)[:1], 1))
            im = im.rotate(ang, resample=Image.BICUBIC, expand=True)
            a = np.asarray(im)
            ys, xs = np.nonzero(a[..., 3] > 127)
            im = Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(), "RGBA")
        im = im.resize((max(3, round(im.width * FX_SCALE)), max(3, round(im.height * FX_SCALE))), Image.LANCZOS)
        art = finish(np.asarray(im), 200 + len(made), 16)
        count[kind] = count.get(kind, 0) + 1
        made[f"{what}-{kind}-{count[kind]}"] = sticker(art, border=2, shadow=(0, 0), floor=False)
    return made


def main():
    dest = Path(sys.argv[1])
    for city, p in PICKS["cities"].items():
        (dest / city).mkdir(parents=True, exist_ok=True)
        rgb, keep = keyed(f"{city}_box", p["box"])
        made = {"box": nb.fit_prop(crop(rgb, biggest(keep)), 84, 84, 0)}
        rgb, keep = keyed(f"{city}_pile", p["pile"])
        made["box-pile"] = nb.fit_prop(crop(rgb, biggest(keep)), 180, 120, 0)
        made["box-broken"] = broken(*keyed(f"{city}_broken", p["broken"]))
        for name, arr in made.items():
            Image.fromarray(arr, "RGBA").save(dest / city / f"{name}.png", optimize=True)
        write_sources(dest / city / "box-sources.json", {"qwen-edit": {"run": "paper/boxes-1", "spec": "art/runs/paper_boxes.toml",
                      "build": "art/backgrounds/pizza_boxes_build.py", "picks": p}})
        print(city, {k: v.shape[:2] for k, v in made.items()})
    fx = {}
    for what in ("cheese", "sauce"):
        fx.update(pieces(what, PICKS[what]))
    for name, arr in fx.items():
        Image.fromarray(arr, "RGBA").save(dest / "props" / f"{name}.png", optimize=True)
    write_sources(dest / "props" / "fx-sources.json", {"qwen-edit": {"run": "paper/boxes-1", "build": "art/backgrounds/pizza_boxes_build.py",
                  "cheese": PICKS["cheese"], "sauce": PICKS["sauce"], "files": sorted(fx)}})
    print(sorted((k, v.shape[:2]) for k, v in fx.items()))


if __name__ == "__main__":
    main()
