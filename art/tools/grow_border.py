"""Widens a character sheet's paper border by one pixel, to match paper.STREET and the other characters (audit 2026-11-11):
    python tools/grow_border.py ../assets/sprites/slice-naples/idle ...
Per frame, a new 1 px rim goes just outside the old one and the old rim turns cream, so the art inside is untouched. A sheet
already at the street width is left alone (its rim is followed by five cream rings), so a rerun does nothing."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backgrounds"))
from paper import CREAM, INK, STREET

CROSS = ndimage.generate_binary_structure(2, 1)


def width(fr):
    a = fr[..., 3] > 127
    d = ndimage.distance_transform_cdt(a, metric="taxicab")
    n = 0
    for k in range(2, 12):
        px = fr[d == k][:, :3].astype(int)
        if len(px) and (np.abs(px - CREAM).max(1) <= 6).mean() >= 0.5:
            n += 1
        else:
            break
    return n


def pad_frames(im, w, h, n, mode):
    """Every frame gets one empty pixel all round: frames are w+2 by h+2. The game draws these characters at their frame
    height, so their heights in js go up by two to keep them at 1:1 (content.js STYLES.naples, play.js SIZE.turtle)."""
    ch = im.shape[2] if im.ndim == 3 else 1
    out = np.zeros((h + 2, n * (w + 2)) + ((ch,) if im.ndim == 3 else ()), im.dtype)
    for i in range(n):
        out[1:h + 1, i * (w + 2) + 1:i * (w + 2) + 1 + w] = im[:, i * w:(i + 1) * w]
    return out


def grow(fr):
    a = fr[..., 3] > 127
    ring = ndimage.binary_dilation(a, CROSS) & ~a
    old_rim = a & ~ndimage.binary_erosion(a, CROSS) & (np.abs(fr[..., :3].astype(int) - INK).max(-1) <= 12)
    out = fr.copy()
    out[old_rim, :3] = CREAM
    out[ring] = (*INK, 255)
    return out


for d in map(Path, sys.argv[1:]):
    at = json.loads((d / "atlas.json").read_text())
    im = np.asarray(Image.open(d / "sheet.png").convert("RGBA")).copy()
    w, h = at["frame"]["w"], at["frame"]["h"]
    if width(im[:, :w]) >= STREET["border"]:
        print(d, "already at the street width")
        continue
    n = im.shape[1] // w
    tight = any(((im[:, i * w:(i + 1) * w, 3] > 127)[[0, -1]].any() or (im[:, i * w:(i + 1) * w, 3] > 127)[:, [0, -1]].any()) for i in range(n))
    if tight:
        im = pad_frames(im, w, h, n, "RGBA")
        if (d / "mask.png").exists():
            m = Image.open(d / "mask.png")
            mode = m.mode
            Image.fromarray(pad_frames(np.asarray(m), w, h, n, mode), mode).save(d / "mask.png", optimize=True)
        if at.get("seats"):
            at["seats"] = [[[x + 1, y + 1] for x, y in fr] for fr in at["seats"]]
        w, h = w + 2, h + 2
        at["frame"] = {"w": w, "h": h}
        at["border_padded"] = True
        (d / "atlas.json").write_text(json.dumps(at, indent=1) + "\n")
    for i in range(im.shape[1] // w):
        im[:, i * w:(i + 1) * w] = grow(im[:, i * w:(i + 1) * w])
    Image.fromarray(im, "RGBA").save(d / "sheet.png", optimize=True)
    print(d, "grown", im.shape[1] // w, "frames ->", width(im[:, :w]))
