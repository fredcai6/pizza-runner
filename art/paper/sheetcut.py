"""Cuts the poses out of Tommy's character sheets (references/sheet.png) so paperkit can build sprites from them.

    ~/projects/sprite-forge/.venv/bin/python art/paper/sheetcut.py art/characters/NAME/sheet.toml

The sheets are drawn on textured beige paper with every figure already a white-bordered sticker. A pixel is backdrop
when it is beige-like (the paper's hue and chroma, at its lightness or darker, so the cast shadows go too): beige
regions joined to the sheet's edge, plus enclosed beige gaps (between an arm and the body). Each pose is the sticker
under its seed point, with motion marks and stray specks dropped. Every pose is written on a flat magenta backdrop to
/mnt/data/sprite-forge/runs/NAME/sheet/qwen-edit/POSE/1.png (where paperkit reads a "run"), feet-centre at one fixed
spot, sized so all poses share one drawing scale: the sheet draws its pose row smaller than its turnaround row, and
`row_scale` says by how much. `master = "front"` also writes that pose to references/paper-master.png
(`write_master = false` when the master is a redrawn version of it, as for Phil without his pepperoni).

    seeds.front = [600, 200]     # [x, y] on the sheet, inside the figure
    row = { idle = "pose", run = "pose" }   # poses in the smaller pose row (others are in the turnaround row)
    row_scale = 1.6              # the pose row is drawn this much smaller
    scale = { hero = 0.85 }      # optional per-pose factor on top (a pose too big for the canvas)
    below.land = 955             # optional: drop everything below this sheet row (a label a splash touches)
"""
import json, os, sys, tomllib
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path.home() / "projects/sprite-forge"))
from forge.color import srgb_to_oklab  # noqa: E402

GAME = Path(__file__).resolve().parents[2]
DATA = Path(os.environ.get("FORGE_DATA", "/mnt/data/sprite-forge"))
MAGENTA = (255, 0, 255)
SIZE, FEET, BASE = 1024, 990, 2.0   # output canvas, feet row, turnaround-row upscale


def stickers(rgb):
    lab = srgb_to_oklab(rgb)
    bg = np.median(np.concatenate([lab[:4].reshape(-1, 3), lab[-4:].reshape(-1, 3)]), axis=0)
    beige = ((np.abs(lab[..., 1] - bg[1]) < 0.03) & (np.abs(lab[..., 2] - bg[2]) < 0.04)
             & (lab[..., 0] > 0.5) & (lab[..., 0] < bg[0] + 0.04))
    lab_, _ = ndimage.label(beige)
    sizes = np.bincount(lab_.ravel())
    edge = np.unique(np.r_[lab_[0], lab_[-1], lab_[:, 0], lab_[:, -1]])
    back = np.isin(lab_, edge[edge > 0]) | np.isin(lab_, np.flatnonzero(sizes >= 1200)[1:])
    return ~back


def cut(rgb, fig, seed, below=None):
    if below:
        fig = fig.copy()
        fig[below:] = False
    lab, _ = ndimage.label(fig)
    k = lab[seed[1], seed[0]]
    assert k, f"seed {seed} is on the backdrop"
    m = ndimage.binary_opening(lab == k, iterations=1)
    l2, n = ndimage.label(m)
    m = l2 == 1 + int(np.argmax(ndimage.sum(m, l2, range(1, n + 1))))
    m = ndimage.binary_fill_holes(m) & fig
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return rgb[y0:y1, x0:x1], m[y0:y1, x0:x1]


def place(crop, mask, scale, cap=None):
    h, w = mask.shape
    if cap and h * scale > cap:   # a leap drawn taller than the standing master would be cut off by the frame
        scale = cap / h
    W, H = round(w * scale), round(h * scale)
    im = Image.fromarray(crop).resize((W, H), Image.LANCZOS)
    a = Image.fromarray((mask * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS).point(lambda v: 255 if v >= 128 else 0)
    out = Image.new("RGB", (SIZE, SIZE), MAGENTA)
    # centred on its own box: a feet-centre would follow a motion streak drawn under a leap
    xs = np.where(np.asarray(a).any(0))[0]
    fx = (xs.min() + xs.max()) / 2
    out.paste(im, (round(SIZE / 2 - fx), FEET - H), a)
    return out


def main(path):
    path = Path(path).resolve()
    cfg = tomllib.loads(path.read_text())
    char = path.parent
    rgb = np.asarray(Image.open(char / "references/sheet.png").convert("RGB"))
    fig = stickers(rgb)
    run = DATA / "runs" / char.name / "sheet" / "qwen-edit"
    # the sheet's paper grain survives the 48-colour cut as a dot grid: smooth it away (paperkit's own grain goes on later)
    rgb = np.stack([ndimage.median_filter(rgb[..., c], size=3) for c in range(3)], -1)
    cap = None
    order = sorted(cfg["seeds"], key=lambda p: p != cfg.get("master"))
    for pose in order:
        seed = cfg["seeds"][pose]
        crop, mask = cut(rgb, fig, seed, cfg.get("below", {}).get(pose))
        scale = BASE * (cfg["row_scale"] if pose in cfg.get("row", []) else 1.0) * cfg.get("scale", {}).get(pose, 1.0)
        out = place(crop, mask, scale, cap if pose != "hero" else None)
        if pose == cfg.get("master"):
            cap = mask.shape[0] * scale
        (run / pose).mkdir(parents=True, exist_ok=True)
        out.save(run / pose / "1.png")
        if pose == cfg.get("master") and cfg.get("write_master", True):
            out.save(char / "references/paper-master.png")
            (char / "references/paper-master.json").write_text(json.dumps({"from": "references/sheet.png", "pose": pose, "seed": seed,
                                                                           "tool": "art/paper/sheetcut.py"}, indent=1) + "\n")
        print(f"{char.name}/{pose}: {mask.shape[1]}x{mask.shape[0]} on the sheet, x{scale:.2f}")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        main(p)
