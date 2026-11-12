"""Shared steps for the paper diorama art (art/paper/STYLE.md): key the magenta Qwen leaves behind, cut seams, paper grain,
and the white cut border + solid drop shadow that only touchable things get."""
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forge.color import srgb_to_oklab

INK = (42, 24, 48)       # #2a1830, the rim outside the white border
CREAM = (251, 246, 234)  # the paper border every character sheet carries; street props match it (audit 2026-11-11)
# The one border for everything on the street: 5 px of cream card (as measured on most character sheets) and a 1 px rim, all the way round (feet included,
# as on the characters; the game sinks grounded things into the pavement so the bottom border sits in it).
STREET = dict(border=5, white=CREAM, floor=False)
SHADOW = (74, 52, 92)    # solid drop shadow, a violet one step lighter than the rim


def key_rgb(rgb, tol=0.13):
    """True where opaque. Qwen returns the magenta key a little off-hue (and darker), so the key colour is measured from the
    pixels that are clearly key, then everything within `tol` (OKLab) of it goes: border-connected and enclosed alike, plus
    a two-pixel magenta-tinted fringe. Pale pastels stay far from it."""
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    sure = (np.minimum(r, b) - g > 90) & (r > 120) & (b > 120)
    key = np.median(rgb[sure], axis=0)
    lab = srgb_to_oklab(rgb)
    d = np.linalg.norm(lab - srgb_to_oklab(key.reshape(1, 1, 3).astype(np.uint8)), axis=-1)
    bg = d < tol
    # the key bleeds into a darker magenta halo around cut-outs: eat magenta-tinted pixels up to 6 px from the key
    bg |= ndimage.binary_dilation(bg, iterations=6) & (np.minimum(r, b) - g > 55)
    bg |= ndimage.binary_dilation(bg, iterations=2) & (np.minimum(r, b) - g > 28)
    bg |= (np.minimum(r, b) - g > 75) & (r > 100) & (b > 100)   # enclosed pockets of darker key, e.g. between table legs
    keep = ~bg
    keep = ndimage.binary_opening(keep, iterations=1)
    lbl, n = ndimage.label(keep)
    if n > 1:
        sz = ndimage.sum(keep, lbl, range(1, n + 1))
        keep = np.isin(lbl, 1 + np.flatnonzero(sz >= 60))
    # gentle cut edges: round the mask a little
    keep = ndimage.median_filter(keep.astype(np.uint8), size=3).astype(bool)
    return keep


def peel_halo(rgb, keep, rounds=1):
    """Qwen draws a white sticker border on cut-outs whatever the prompt says. Near-white pixels connected to the outside are
    removed, so scenery carries no border and touchable things get exactly the one the build adds."""
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    lo, hi = np.minimum(np.minimum(r, g), b), np.maximum(np.maximum(r, g), b)
    light = (lo >= 222) & (hi - lo <= 40)
    outside = ndimage.binary_propagation(~keep, mask=~keep | light)
    return ~outside


def grain(shape, seed, amp=2.4):
    """Paper grain in RGB levels: fine speckle plus short horizontal fibres. White noise, so it wraps at any width."""
    rng = np.random.default_rng(seed)
    fine = rng.standard_normal(shape)
    fibre = ndimage.gaussian_filter(rng.standard_normal(shape), (0.7, 2.4), mode="wrap")
    fibre /= fibre.std()
    return (fine * 0.55 + fibre * 0.9) * amp / 1.05


def add_grain(rgba, seed, amp=2.4):
    out = rgba.copy()
    g = grain(rgba.shape[:2], seed, amp)[..., None]
    out[..., :3] = np.clip(rgba[..., :3].astype(float) + g, 0, 255).astype(np.uint8)
    return out


def disk(r):
    y, x = np.mgrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r + r * 0.5


def sticker(rgba, border=4, shadow=(5, 4), pad=None, floor=True, white=(255, 255, 255)):
    """White paper border (then a 1 px #2a1830 rim) around the art and a solid drop shadow, for touchable things.
    The art keeps its feet on the bottom row: the border and shadow stop there, so nothing sinks into the ground.
    floor=False is for things that float (pickups, throwing stars): border and shadow go all the way round."""
    pad = pad or border + 1 + max(shadow) + 1
    h, w = rgba.shape[:2]
    big = np.zeros((h + 2 * pad, w + 2 * pad, 4), np.uint8)
    big[pad:pad + h, pad:pad + w] = rgba
    art0 = big[..., 3] > 127
    art = ndimage.binary_erosion(art0, iterations=1)   # drop the keyed fringe pixel, but keep the feet row
    if floor:
        art[pad + h - 1] = art0[pad + h - 1]
    big[..., 3] = np.where(art, 255, 0)
    paper = white
    white = ndimage.binary_dilation(art, structure=disk(border))
    rim = ndimage.binary_dilation(white, structure=disk(1)) & ~white
    body = white | rim
    sh = np.roll(np.roll(body, shadow[1], 0), shadow[0], 1) & ~body
    feet = pad + h
    if floor:
        for m in (white, rim, sh):
            m[feet:] = False
    out = np.zeros_like(big)
    out[sh] = (*SHADOW, 255)
    out[rim] = (*INK, 255)
    out[white] = (*paper, 255)
    out[art] = big[art]
    ys, xs = np.where(out[..., 3] > 0)
    return out[ys.min():(feet if floor else ys.max() + 1), xs.min():xs.max() + 1]
