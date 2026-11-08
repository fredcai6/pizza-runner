"""Builds the HQ paper back room into ASSETS_BACKGROUNDS/hq: back, mid, front and table.
    python backgrounds/hq/paper_build.py ASSETS_BACKGROUNDS        (from art/, sprite-forge on PYTHONPATH)
back is a Qwen edit of the old room (hq/runs/paper_hq.toml, job 230); the corkboard is then repainted in code at exactly the
rectangle HQ_BOARD (js/content.js) names, so the game's live evidence lands on it. mid, front and table are keyed cut-outs.
recruit-spots.json is untouched: it places topping art on the recruit sprites and does not depend on the room."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from paper import SHADOW, add_grain, key_rgb, peel_halo
from forge.generate import DATA
from forge.layers import quantize, write_sources

OUT = Path(sys.argv[1]) / "hq"
PICKS = json.loads((Path(__file__).parent / "paper_picks.json").read_text())
RUN = DATA / "runs/paper/hq-1/qwen-edit"
BOARD = (700, 70, 520, 350)   # outer frame x, y, w, h; the inner cork is HQ_BOARD = 712, 82, 496, 326
FRAME = 12
JOB = 230


def qwen(shot, seed):
    p = RUN / shot / f"{seed}.png"
    meta = json.loads(p.with_suffix(".json").read_text())
    return np.asarray(Image.open(p).convert("RGB")), {"run": "paper/hq-1", "job": JOB, "model": "qwen-edit", "shot": shot, "seed": seed,
                                                       "refs": meta["refs"], "secs": meta["secs"]}


def board(back):
    """A flat tan cork card in a cream card frame with a soft shade on the lower edge and a solid paper shadow."""
    bx, by, bw, bh = BOARD
    rng = np.random.default_rng(5)
    shadow = np.zeros((720, 1280), bool)
    shadow[by + 6:by + bh + 6, bx + 6:bx + bw + 6] = True
    back[shadow] = (back[shadow] * 0.62).astype(np.uint8)
    back[by:by + bh + 10, bx:bx + bw + 14] = (212, 196, 164)             # the card's thick shaded edge, right and below
    back[by:by + bh, bx:bx + bw] = (240, 226, 196)                       # frame card
    ix, iy, iw, ih = bx + FRAME, by + FRAME, bw - 2 * FRAME, bh - 2 * FRAME
    back[iy:iy + ih, ix:ix + iw] = (214, 170, 118)                       # cork card
    back[iy:iy + 5, ix:ix + iw] = (196, 150, 100)                        # inner shade where the frame overlaps it
    back[iy:iy + ih, ix:ix + 5] = (196, 150, 100)
    # a few darker cork flecks, cut-paper style: small flat rectangles
    for _ in range(260):
        x, y = rng.integers(ix + 6, ix + iw - 8), rng.integers(iy + 6, iy + ih - 6)
        w, h = rng.integers(2, 6), rng.integers(1, 3)
        back[y:y + h, x:x + w] = (192, 146, 98)
    for tx, ty in [(bx + 6, by + 6), (bx + bw - 7, by + 6), (bx + 6, by + bh - 7), (bx + bw - 7, by + bh - 7)]:
        back[ty - 2:ty + 2, tx - 2:tx + 2] = (222, 96, 96)               # card tacks
    return back


def cutout(shot, seed, n, grain_seed, peel=True):
    rgb, meta = qwen(shot, seed)
    a = key_rgb(rgb)
    if peel:
        a = ndimage.binary_opening(peel_halo(rgb, a), iterations=1)
    rgba = np.dstack([rgb, a * 255]).astype(np.uint8)
    rgba[..., :3] = np.where(rgba[..., 3:] > 0, rgba[..., :3], 0)
    rgba = quantize(rgba, n=n)
    rgba = add_grain(rgba, grain_seed, 2.0)
    rgba[..., 3] = np.where(rgba[..., 3] > 127, 255, 0)
    rgba[..., :3] = np.where(rgba[..., 3:] > 0, rgba[..., :3], 0)
    return rgba, meta


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    src = {}
    rgb, meta = qwen("back", PICKS["back"])
    rgba = quantize(np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)]), n=44)
    rgb = rgba[..., :3].copy()
    # the model scatters white highlight bricks that read as letters (an "L" at x 265, y 280): fill every near-white speck on the
    # wall with its nearest non-white neighbour. The bulb and the cord's bulb stay.
    white = (rgb.min(2) >= 215) & (np.arange(1280)[None, :] > 240) & (np.arange(1280)[None, :] < 700) & (np.arange(720)[:, None] < 440)
    yy, xx = np.mgrid[:720, :1280]
    white &= ((xx - 640) ** 2 + (yy - 95) ** 2 > 75 ** 2) & ((xx - 645) ** 2 + (yy - 190) ** 2 > 30 ** 2)
    white = ndimage.binary_dilation(white, iterations=1)
    idx = ndimage.distance_transform_edt(white, return_distances=False, return_indices=True)
    rgb[white] = rgb[idx[0][white], idx[1][white]]
    near = ndimage.binary_dilation(white, iterations=5)
    rgb[near] = ndimage.median_filter(rgb, size=(9, 9, 1))[near]
    meta["white_specks_filled"] = int(white.sum())
    rgb = board(rgb)
    rgba = add_grain(np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)]), 61, 2.0)
    Image.fromarray(rgba[..., :3], "RGB").save(OUT / "back.png", optimize=True)
    src["back"] = {**meta, "board": {"outer_rect": BOARD, "frame": FRAME, "inner_rect": [BOARD[0] + FRAME, BOARD[1] + FRAME, BOARD[2] - 2 * FRAME, BOARD[3] - 2 * FRAME], "painted_in_code": "paper_build.board"}}
    for name, n, gs in (("mid", 36, 62), ("front", 24, 63), ("table", 30, 64)):
        arr, meta = cutout(name, PICKS[name], n, gs, peel=name != "front")
        Image.fromarray(arr, "RGBA").save(OUT / f"{name}.png", optimize=True)
        src[name] = meta
    write_sources(OUT / "sources.json", src)
    print("ok")


if __name__ == "__main__":
    main()
