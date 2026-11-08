"""Key a generated figure off its flat backdrop. The models paint the backdrop magenta or violet and add cast shadows
beside the figure, so forge.compose.keyout (magenta only) is joined by a border-colour distance key."""
import sys
from pathlib import Path
import numpy as np
from scipy import ndimage
sys.path.insert(0, str(Path.home() / "projects/sprite-forge"))
from forge.color import srgb_to_oklab
from forge.compose import keyout


def fg_mask(rgb, thr=0.085):
    lab = srgb_to_oklab(rgb)
    border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bgc = np.median(border, axis=0)
    near = np.linalg.norm(lab - bgc, axis=-1) < thr
    # cast and floor shadows: dark, violet/magenta hue, low chroma drop from the backdrop
    hue = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    chroma = np.hypot(lab[..., 1], lab[..., 2])
    shadow = (hue > 300) & (hue < 352) & (chroma > 0.05) & (lab[..., 0] < 0.55) & (lab[..., 0] > 0.12)
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    strict = (np.minimum(r, b) - g > 75) & (r > 150) & (b > 85)
    cand = near | shadow | strict
    l, _ = ndimage.label(cand)
    edge = np.unique(np.r_[l[0], l[-1], l[:, 0], l[:, -1]])
    bg = np.isin(l, edge[edge > 0])
    fg = ndimage.binary_opening(~bg & ~strict, iterations=2)
    l, n = ndimage.label(fg)
    if n == 0:
        return fg
    sizes = ndimage.sum(fg, l, range(1, n + 1))
    fg = l == 1 + int(np.argmax(sizes))
    # fill enclosed holes
    fg = ndimage.binary_fill_holes(fg) & ~(np.linalg.norm(lab - bgc, axis=-1) < thr * 0.7)
    fg = ndimage.binary_opening(fg, iterations=1)
    l, n = ndimage.label(fg)
    sizes = ndimage.sum(fg, l, range(1, n + 1))
    return l == 1 + int(np.argmax(sizes))
