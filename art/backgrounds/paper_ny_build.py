"""Builds the New York paper art into ASSETS_BACKGROUNDS/newyork: the three areas' far/mid/near/ground/door, and the props.
    python backgrounds/paper_ny_build.py ASSETS_BACKGROUNDS        (from art/, with sprite-forge on PYTHONPATH)
Picks (which Qwen seed of which shot) live in PICKS; every pick is logged in each folder's sources.json.
Layers come from paper_edit.py runs: keyed off magenta, cut at the seam where the 256-column overhang closes, ground line
set to y 600, snapped to a small palette, then the paper grain goes on."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from paper_near import NEAR, near_layer
from paper import INK, SHADOW, add_grain, key_rgb, sticker
from forge.generate import DATA
from forge.layers import quantize, tile_seam, write_sources

W, H, GROUND = 2560, 720, 600
OUT = Path(sys.argv[1]) / "newyork"
RUN = DATA / "runs/paper"
# shot -> seed. Jobs: ny-1 = #229
JOBS = {"ny-1": 229, "ny-2": 232, "hq-1": 230}
PICKS = json.loads((Path(__file__).parent / "newyork/paper_picks.json").read_text())
# boxes (x0, y0, x1, y1) in final layer pixels
ERASE = {"wallstreet/mid": [[1076, 524, 1102, 552]]}   # a door number "9"
STYLE_REF = "art/paper/style_pm_sq.png"
COLORS = {"far": 28, "mid": 44, "near": 28}
# paper grain seeds per layer, so a rebuild is byte-identical
GRAIN = {"far": (11, 1.8), "mid": (12, 2.4), "near": (13, 2.4)}


def qwen(run, shot, seed):
    p = RUN / run / "qwen-edit" / shot / f"{seed}.png"
    meta = json.loads(p.with_suffix(".json").read_text())
    im = Image.open(p).convert("RGB")
    half = im.width < 2000 and shot.split("_")[-1] in ("far", "mid", "near")
    if half:   # run 2 works at half scale (see make_paper_spec.py); the flat paper shapes take a 2x Lanczos upscale well
        im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    return np.asarray(im), {"run": f"paper/{run}", "job": JOBS[run], "model": "qwen-edit", "shot": shot, "seed": seed,
                            "refs": meta["refs"], "secs": meta["secs"], "size": meta["size"], "upscaled_2x": half}


def fill_gaps(rgba, max_w=90, top=330):
    """A gap between two buildings that runs down to the street shows the far layer as a pale slot. Narrow gaps (under max_w) are
    closed below row `top` with the wall beside them, so the row of buildings reads as one row."""
    out = rgba.copy()
    a = out[..., 3] > 0
    col_open = (~a[top:GROUND - 6]).mean(0) > 0.3
    lbl, n = ndimage.label(col_open)
    for i in range(1, n + 1):
        xs = np.flatnonzero(lbl == i)
        x0, x1 = xs.min(), xs.max() + 1
        if x1 - x0 > max_w or x0 == 0 or x1 >= W:
            continue
        for y in range(top, GROUND + 1):
            for x in range(x0, x1):
                if not a[y, x]:
                    src = x0 - 1 if (x - x0) < (x1 - x) else x1
                    out[y, x] = out[y, src] if a[y, src] else out[y, x1 if src == x0 - 1 else x0 - 1]
    return out


def build_near(area):
    rgba = add_grain(near_layer(NEAR[area], 7), 13, 2.0)
    rgba[..., 3] = np.where(rgba[..., 3] > 127, 255, 0)
    rgba[..., :3] = np.where(rgba[..., 3:] > 0, rgba[..., :3], 0)
    return rgba, {"procedural": "paper_near.near_layer", "spec": NEAR[area], "seed": 7}


def build_layer(area, layer, run, seed):
    rgb, meta = qwen(run, f"{area}_{layer}", seed)
    if layer == "far":
        rgba = np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)])
    else:
        rgba = np.dstack([rgb, key_rgb(rgb) * 255]).astype(np.uint8)
        rgba[..., :3] = np.where(rgba[..., 3:] > 0, rgba[..., :3], 0)
    rgba = tile_seam(rgba, W, blend=40)
    meta["seam_start_x"] = int(tile_seam.last)
    if layer == "mid":
        # the street line: the lowest row that is mostly paper becomes y 600, and nothing hangs below it. Qwen leaves a band of
        # magenta-blended pixels where the lawn or kerb meets the key: rows whose median is still key-tinted are not paper.
        frac = (rgba[..., 3] > 0).mean(1)
        g = int(np.flatnonzero(frac > 0.45).max())
        while True:
            row = rgba[g][rgba[g, :, 3] > 0].astype(int)
            if len(row) == 0 or np.median(np.minimum(row[:, 0], row[:, 2]) - row[:, 1]) <= 40:
                break
            g -= 1
        rgba = np.roll(rgba, GROUND - g, axis=0)
        rgba[GROUND + 1:] = 0
        rgba[GROUND - 1:GROUND + 1] = rgba[GROUND - 2]   # the row the roll left half-blended
        rgba = fill_gaps(rgba)
        meta["shifted_by"] = GROUND - g
    rgba = quantize(rgba, n=COLORS[layer])
    seed_g, amp = GRAIN[layer]
    rgba = add_grain(rgba, seed_g, amp)
    rgba[..., 3] = np.where(rgba[..., 3] > 127, 255, 0)
    rgba[..., :3] = np.where(rgba[..., 3:] > 0, rgba[..., :3], 0)
    # model-drawn lettering found on inspection (art/characters/STYLE.md, no fake text): fill the box with its own row median
    for x0, y0, x1, y1 in ERASE.get(f"{area}/{layer}", []):
        reg = rgba[y0:y1, x0:x1, :3]
        rgba[y0:y1, x0:x1, :3] = np.median(reg, axis=1, keepdims=True).astype(np.uint8)
    meta["erased_text_boxes"] = ERASE.get(f"{area}/{layer}", [])
    return rgba, meta


def tiles_ground(tones, seams, seed):
    """256x120 paving of flat paper slabs, staggered, wrapping both ways: one tone per slab, a darker cut line between."""
    rng = np.random.default_rng(seed)
    t = np.zeros((120, 256, 3), float)
    sw, sh = 64, 40
    for row in range(3):
        off = 32 * (row % 2)
        for col in range(4):
            c = np.array(tones[rng.integers(len(tones))], float)
            x0 = (col * sw + off) % 256
            for dx in range(sw):
                t[row * sh:(row + 1) * sh, (x0 + dx) % 256] = c
    seam = np.zeros((120, 256), bool)
    for row in range(3):
        off = 32 * (row % 2)
        seam[row * sh, :] = True
        for col in range(4):
            seam[row * sh:(row + 1) * sh, (col * sw + off) % 256] = True
    t[seam] = np.array(seams, float)
    rgba = np.dstack([t.clip(0, 255).astype(np.uint8), np.full((120, 256), 255, np.uint8)])
    return add_grain(rgba, seed, 2.0)


GROUNDS = {  # slab tones, cut-line colour
    "wallstreet": ([(196, 190, 212), (188, 182, 206), (202, 196, 218)], (150, 142, 172)),
    "centralpark": ([(236, 220, 184), (230, 212, 174), (242, 228, 194)], (200, 180, 140)),
    "brooklyn": ([(226, 190, 164), (218, 182, 156), (232, 198, 172)], (184, 140, 120)),
}


def build_door(area, run, seed):
    rgb, meta = qwen(run, f"{area}_door", seed)
    a = key_rgb(rgb)
    # peel the white sticker border the model drew: near-white pixels connected to the outside go (our own border is added below)
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    light = (np.minimum(np.minimum(r, g), b) >= 222) & ((np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)) <= 40)
    outside = ndimage.binary_propagation(~a, mask=~a | light)
    a = ~outside
    a = ndimage.binary_fill_holes(a)
    lbl, n = ndimage.label(a)
    if n > 1:
        sz = ndimage.sum(a, lbl, range(1, n + 1)); a = np.isin(lbl, 1 + np.flatnonzero(sz >= 1500))
    ys, xs = np.where(a)
    d = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), "RGBA").crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    th = 294   # plus the border on top: 300 tall, so the game draws its sign over the blank panel at the top
    d = d.resize((max(1, round(d.width * th / d.height)), th), Image.LANCZOS)
    arr = np.asarray(d).copy()
    arr = quantize(arr, n=40)
    arr = add_grain(arr, 21, 2.0)
    arr[..., 3] = np.where(arr[..., 3] > 127, 255, 0)
    return sticker(arr, border=4, shadow=(6, 5)), meta


def split_props(rgb):
    a = key_rgb(rgb)
    lbl, n = ndimage.label(ndimage.binary_dilation(a, iterations=14))
    groups = []
    for i, sl in enumerate(ndimage.find_objects(lbl), 1):
        m = a & (lbl == i)
        if m.sum() < 800:
            continue
        ys, xs = np.where(m)
        groups.append((xs.min(), np.dstack([rgb, m * 255]).astype(np.uint8)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
    return [g for _, g in sorted(groups, key=lambda t: t[0])]


def clean_tape(crop):
    """The model's hazard tape reads as letters. Find the yellow band and redraw it as plain diagonal stripes."""
    r, g, b = [crop[..., i].astype(int) for i in range(3)]
    yel = (r > 200) & (g > 180) & (b < 120) & (crop[..., 3] > 0)
    if yel.sum() < 200:
        return crop
    ys, xs = np.where(yel)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    k = max(4, (y1 - y0) // 2)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    band = np.where(((xx + yy) // k) % 2 == 0, 0, 1)
    out = crop.copy()
    sel = (crop[y0:y1, x0:x1, 3] > 0)
    # only inside the tape's own rows: keep the crate's slat edges above and below
    for c, col in enumerate(((246, 214, 70), (52, 44, 96))):
        m = sel & (band == c)
        out[y0:y1, x0:x1][m, :3] = col
    return out


def fit_prop(crop, w, h, seed):
    """Quantize, add grain, then the sticker; the whole thing is w x h with feet on the bottom row."""
    inner_w, inner_h = w - 12, h - 7
    im = Image.fromarray(crop, "RGBA")
    s = min(inner_w / im.width, inner_h / im.height)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    arr = quantize(np.asarray(im).copy(), n=30)
    arr = add_grain(arr, 31, 1.8)
    arr[..., 3] = np.where(arr[..., 3] > 127, 255, 0)
    st = sticker(arr, border=3, shadow=(4, 3))
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    canvas.alpha_composite(Image.fromarray(st, "RGBA"), ((w - st.shape[1]) // 2, h - st.shape[0]))
    return np.asarray(canvas)


def platform_tile():
    """64x28 paper walkway that tiles: dark rim row, a white cut border (the walkable top), lilac card with plank cuts, white
    border below, rim, and a solid shadow. The top row is where feet stand."""
    t = np.zeros((28, 64, 4), np.uint8)
    white, ink, card, plank, edge = (255, 255, 255), INK, (196, 182, 226), (170, 154, 206), (214, 202, 238)
    t[0, :, :3] = ink
    t[1:4, :, :3] = white
    t[4:18, :, :3] = card
    t[4:6, :, :3] = edge
    for x in (0, 32):
        t[4:18, x, :3] = plank
    for x in range(8, 64, 16):          # small cut-card studs
        t[10:12, x:x + 2, :3] = plank
    t[18:21, :, :3] = white
    t[21, :, :3] = ink
    t[22:27, :, :3] = SHADOW
    t[:27, :, 3] = 255
    return add_grain(t, 41, 1.6)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for area in ("wallstreet", "centralpark", "brooklyn"):
        pk = PICKS[area]
        d = OUT / area
        d.mkdir(exist_ok=True)
        sources = {}
        for layer in ("far", "mid", "near"):
            rgba, meta = build_near(area) if layer == "near" else build_layer(area, layer, pk[layer]["run"], pk[layer]["seed"])
            Image.fromarray(rgba, "RGBA").save(d / f"{layer}.png", optimize=True)
            sources[layer] = meta
        tones, seam = GROUNDS[area]
        g = tiles_ground(tones, seam, 51)
        Image.fromarray(g, "RGBA").save(d / "ground.png", optimize=True)
        sources["ground"] = {"procedural": "tiles_ground in paper_ny_build.py", "tones": tones, "cut_line": seam}
        door, meta = build_door(area, pk["door"]["run"], pk["door"]["seed"])
        Image.fromarray(door, "RGBA").save(d / "door.png", optimize=True)
        sources["door"] = meta
        write_sources(d / "sources.json", sources)
        print("ok", area, door.shape[1], door.shape[0])
    pp = PICKS["props"]
    rgb, meta = qwen(pp["run"], "props", pp["seed"])
    crops = split_props(rgb)
    assert len(crops) == 3, len(crops)
    sizes = {"barrel": (60, 110), "barrel-out": (60, 110), "barricade": (80, 100)}
    for (name, (w, h)), crop in zip(sizes.items(), crops):
        if name == "barricade":
            crop = clean_tape(crop)
        Image.fromarray(fit_prop(crop, w, h, 0), "RGBA").save(OUT / f"{name}.png", optimize=True)
    Image.fromarray(platform_tile(), "RGBA").save(OUT / "platform.png", optimize=True)
    write_sources(OUT / "sources.json", {"props": meta, "platform": {"procedural": "platform_tile in paper_ny_build.py"}})


if __name__ == "__main__":
    main()
