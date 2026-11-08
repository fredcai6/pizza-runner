"""Paper Theatre sprite builder: generated key poses in, finished sheets out.

    FORGE_PROJECT=art PYTHONPATH=~/projects/sprite-forge ~/projects/sprite-forge/.venv/bin/python art/paper/paperkit.py \
        art/characters/NAME/anims/paper-X.toml

The recipe (the reduction Tommy approved in art/tests/paper-theatre, plus a border that is the same on every frame):
  1. key the figure off the flat backdrop (keying.fg_mask);
  2. peel the model's white paper border back off (white pixels connected to the outside, within the border's own width),
     so every frame gets the identical border and a mid-pose frame cannot lose or thicken it;
  3. reduce onto the 1:1 stage grid with ONE 48-colour palette cut from the character's master and one scale for every
     frame of the character, so frames agree with each other;
  4. add the paper border (white, `border` px) and a 1 px #2a1830 rim outside it.
The "core" (steps 1-3, no border) is also written as sprites/ANIM-core, which is what the code rig cuts its parts from.

An anim file:
    character = "old-timer"     # defaults to the folder
    master = "characters/old-timer/references/paper-master.png"   # sets palette, scale and placement
    run = "paper"               # /mnt/data/sprite-forge/runs/NAME/RUN/qwen-edit/SHOT/SEED.png
    canvas = [136, 130]
    border = 4                  # white border width in px (default 4 for canvas heights >= 110, else 3)
    frame_ms = 110
    loop = true
    [[frames]]
    pose = "talk_open/1"        # SHOT/SEED, or "master"
    hold = 2                    # repeat the frame
    dx = 0
    dy = 0
    scale = 1.0                 # 0.97 shrinks the figure about its feet-centre when a pose came out larger
"""
import json, os, subprocess, sys, tomllib
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[1]
FORGE = Path.home() / "projects/sprite-forge"
sys.path.insert(0, str(FORGE))
sys.path.insert(0, str(HERE))
from forge.color import srgb_to_oklab  # noqa: E402
from forge.compose import thicken  # noqa: E402
from forge.pixelize import despeckle, to_sprite  # noqa: E402
from keying import fg_mask  # noqa: E402

DATA = Path(os.environ.get("FORGE_DATA", "/mnt/data/sprite-forge"))
RIM = np.array([0x2a, 0x18, 0x30], np.uint8)
PAPER = np.array([0xfb, 0xf6, 0xea], np.uint8)
NCOL = 48


def rev(path):
    sha = subprocess.run(["git", "rev-parse", "HEAD"], cwd=path, capture_output=True, text=True).stdout.strip()
    dirty = bool(subprocess.run(["git", "status", "--porcelain", "--", "."], cwd=path, capture_output=True, text=True).stdout.strip())
    return {"sha": sha or None, "dirty": dirty}


def border_band(rgb, outer):
    """The model's white paper border: near-white pixels reached from outside, no deeper than the border is wide."""
    lab = srgb_to_oklab(rgb)
    chroma = np.hypot(lab[..., 1], lab[..., 2])
    white = outer & (lab[..., 0] > 0.9) & (chroma < 0.05)
    lab_, n = ndimage.label(white)
    outside = ndimage.binary_dilation(~outer, iterations=2)
    touch = np.unique(lab_[outside & white])
    ring = np.isin(lab_, touch[touch > 0])
    d = ndimage.distance_transform_edt(np.pad(outer, 1))[1:-1, 1:-1]
    if ring.any():
        # a paper border covers every distance up to its own width about equally; the width is where that count falls away
        hist = np.bincount(np.round(d[ring]).astype(int))
        width = max(i for i in range(1, len(hist)) if hist[i] >= 0.3 * hist[1:6].mean())
    else:
        width = 0
    return ring & (d <= 2 * width + 2), width


def backdrop(rgb, thr=0.12):
    """Backdrop-coloured regions of real size, enclosed gaps (between an arm and the body) included.
    keying.fg_mask fills those gaps, which leaves cast-shadow streaks and a second border inside them."""
    lab = srgb_to_oklab(rgb)
    border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bgc = np.median(border, axis=0)
    r, g, b = [rgb[..., i].astype(int) for i in range(3)]
    cand = (np.linalg.norm(lab - bgc, axis=-1) < thr) | ((np.minimum(r, b) - g > 75) & (r > 150) & (b > 85))
    # the backdrop's own cast shadow: crimson-violet (blue well above green, red above blue, green low)
    cand |= (b - g > 40) & (r - b > 20) & (g < 70) & (r > 100) & (b > 60)
    l, n = ndimage.label(cand)
    sizes = np.bincount(l.ravel())
    big = np.flatnonzero(sizes >= max(60, 0.0003 * cand.size))
    return np.isin(l, big[big > 0])


def key(path, clip=None):
    """clip: fraction of the image height; everything below it is painted over with the backdrop (a ledge the pose rests on)."""
    rgb = np.asarray(Image.open(path).convert("RGB"))
    if clip:
        rgb = rgb.copy()
        rgb[int(clip * rgb.shape[0]):] = rgb[0, 0]
    outer = fg_mask(rgb) & ~backdrop(rgb)
    outer = ndimage.binary_opening(outer, iterations=2)
    band, width = border_band(rgb, outer)
    inner = ndimage.binary_opening(outer & ~band, iterations=1)
    lab, n = ndimage.label(inner)
    if n > 1:  # keep the figure, drop crumbs the peel left on the border
        sizes = ndimage.sum(inner, lab, range(1, n + 1))
        inner = np.isin(lab, 1 + np.flatnonzero(sizes >= 0.012 * inner.sum()))
    return rgb, inner, width


def palette(rgb, alpha):
    im = Image.fromarray(np.where(alpha[..., None], rgb, 0).astype(np.uint8)).quantize(NCOL, method=Image.MEDIANCUT, dither=Image.NONE)
    pal = np.array(im.getpalette()[:NCOL * 3], np.uint8).reshape(-1, 3)
    return pal


def paper(core, border):
    """White cut border, then the 1 px rim, outside the silhouette."""
    s = thicken(core, border, PAPER)
    return thicken(s, 1, RIM)


class Geometry:
    """One scale and placement for every frame of a character, taken from its master."""
    def __init__(self, master, canvas, border, rig_ground=None):
        self.W, self.H = canvas
        self.border = border
        rgb, inner, self.border_px = key(master)
        ys, xs = np.where(inner)
        self.top, self.bot = ys.min(), ys.max() + 1
        self.left, self.right = xs.min(), xs.max() + 1
        self.fig_h = self.H - 2 * (border + 1)
        self.cell = (self.bot - self.top) / self.fig_h
        self.cx = (self.left + self.right) / 2
        self.pal = palette(rgb, inner)
        self.lab = srgb_to_oklab(self.pal)

    def core(self, path, dx=0, dy=0, scale=1.0, clip=None):
        """One frame on the stage grid. scale 1 keeps the model's placement (the master's); another scale resizes the figure
        about this frame's own feet-centre, which then stands where the master's does."""
        rgb, inner, _ = key(path, clip)
        if scale == 1.0:
            cell = self.cell
            origin = (self.cx - self.W / 2 * cell, self.bot - (self.H - (self.border + 1)) * cell)
        else:
            ys, xs = np.where(inner)
            fx, fy = (xs.min() + xs.max()) / 2, ys.max() + 1
            cell = self.cell / scale
            origin = (fx - self.W / 2 * cell, fy - (self.H - (self.border + 1)) * cell)
        origin = (origin[0] - dx * cell, origin[1] - dy * cell)
        sp = to_sprite(rgb, inner, self.pal, self.lab, cell, origin, (self.W, self.H), accent=1.3)
        return despeckle(sp)


def build(anim_path):
    anim_path = Path(anim_path).resolve()
    spec = tomllib.loads(anim_path.read_text())
    char_dir = anim_path.parent.parent
    name = spec.get("character", char_dir.name)
    art = GAME / "art"
    canvas = spec["canvas"]
    border = spec.get("border", 4 if canvas[1] >= 110 else 3)
    master = art / spec["master"]
    g = Geometry(master, canvas, border)
    run_dir = DATA / "runs" / name / spec.get("run", "paper") / "qwen-edit"
    cores, poses = [], []
    for f in spec["frames"]:
        pose = f["pose"]
        path = master if pose == "master" else run_dir / pose.split("/")[0] / f"{pose.split('/')[1]}.png"
        c = g.core(path, f.get("dx", 0), f.get("dy", 0), f.get("scale", 1.0), f.get("clip"))
        if f.get("sink"):
            # a settle: everything above `split` of the canvas height drops `sink` px into the torso
            c = c.copy()
            n, cut = f["sink"], int(canvas[1] * f.get("split", 0.55))
            c[n:cut] = c[:cut - n]
            c[:n] = 0
        for _ in range(f.get("hold", 1)):
            cores.append(c)
            poses.append(pose)
    anim = anim_path.stem.removeprefix("paper-")
    frames = [paper(c, border) for c in cores]
    out = char_dir / "sprites" / anim
    write(out, frames, spec, name, spec["master"], poses, g, border)
    write(char_dir / "sprites" / f"{anim}-core", cores, spec, name, spec["master"], poses, g, border)
    colours = len(np.unique(np.concatenate([f[f[..., 3] > 0][:, :3] for f in frames]), axis=0))
    print(f"{name}/{anim}: {len(frames)} frames {canvas[0]}x{canvas[1]}, {colours} colours, border {border}, cell {g.cell:.2f}")


def write(out, frames, spec, name, master, poses, g, border):
    out.mkdir(parents=True, exist_ok=True)
    sheet = np.concatenate(frames, axis=1)
    assert set(np.unique(sheet[..., 3])) <= {0, 255}
    Image.fromarray(sheet, "RGBA").save(out / "sheet.png", optimize=True)
    w, h = spec["canvas"]
    atlas = {"frame": {"w": w, "h": h}, "count": len(frames), "frame_ms": spec.get("frame_ms", 140), "loop": spec.get("loop", True),
             "rev": {**rev(FORGE), "comfy": (FORGE / "comfy/COMFY_REF").read_text().strip()},
             "game_rev": rev(GAME),
             "source": {"run": spec.get("run", "paper"), "model": "qwen-edit", "job": spec.get("job"), "master": master,
                        "cell": round(float(g.cell), 3), "border": border, "palette": NCOL, "poses": poses}}
    (out / "atlas.json").write_text(json.dumps(atlas, indent=1))
    z = 3
    pics = []
    for f in frames:
        bg = Image.new("RGBA", (w * z, h * z), (60, 56, 78, 255))
        bg.alpha_composite(Image.fromarray(f, "RGBA").resize((w * z, h * z), Image.NEAREST))
        pics.append(bg.convert("RGB"))
    pics[0].save(out / "preview.gif", save_all=True, append_images=pics[1:], duration=spec.get("frame_ms", 140), loop=0)


if __name__ == "__main__":
    for p in sys.argv[1:]:
        build(p)
