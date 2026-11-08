"""Pose-guided paper humans: forge.poseguide draws the skeleton and Qwen paints the paper master onto it; paperkit reduces the result.

    paperpose.py gen    CHARACTER MOTION [--seeds 1,2] [--hands phone]        (GPU: submit through the queue)
    paperpose.py sprite CHARACTER MOTION --seed N --canvas W,H --out ANIM     (CPU: key, peel, palette, border, sheet)

characters/CHARACTER/pose.toml names the master (`master = "references/paper-master.png"`) and the body plan; the motion table is
forge/motions/MOTION.toml. The track here differs from forge's qwen-pose-run only in its prompt: it asks for the paper standee, not
the pixel mascot. The sprite step is paperkit's recipe with poseguide's placement (the skeleton's own ground row, one scale for all
frames), so the walk and the flee keep the leg phases the skeleton drew.
"""
import argparse, json, sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import paperkit as pk  # noqa: E402
from forge import poseguide as pg  # noqa: E402
from forge.generate import ROOT  # noqa: E402
from forge.pixelize import despeckle, to_sprite  # noqa: E402
from forge.posekit import Figure  # noqa: E402

TRACK = "qwen-pose-paper"
pg.TRACKS[TRACK] = dict(pose="openpose", stages=[dict(model="qwen-edit", refs=["master", "pose"], prompt=(
    "Image 1 is the character, a flat paper standee. Image 2 is a pose skeleton for a side view. Redraw the exact same character from image 1, "
    "same clothes, same flat colours, same simple face, same thick white paper sticker border all around the silhouette, {verb} in the pose of the "
    "skeleton in image 2: head, arms and legs exactly where the skeleton's limbs go. {hands} Both legs from the same hip, crossing and bending as the "
    "skeleton shows. {note} Exactly two arms and two legs, side view facing right, full body visible from head to feet, no text, letters, numbers or logos. "
    "The background is one perfectly flat magenta fill, no ground shadow, no cast shadow."))])


def ns(**kw):
    d = dict(char=None, motion=None, track=TRACK, seed=1, seeds=None, frames=None, hands="free", note="", canvas=None, place="skel", src=None)
    d.update(kw)
    return argparse.Namespace(**d)


def sprite(char, motion, seed, canvas, anim, border=None):
    cfg = pg.pose_cfg(char)
    fig = Figure(char, motion)
    pw, ph = cfg["canvas"]
    W, H = canvas
    border = border or (4 if H >= 110 else 3)
    d = pg.paths(char, motion, TRACK)
    s = min(0.9 * pg.SIZE / pw, 0.9 * pg.SIZE / ph)
    infl = 1 + 2 * (border + 1) / (H * 0.95)
    cell = s * infl
    mrgb, minner, _ = pk.key(pg.master_path(char))
    from forge.color import srgb_to_oklab
    pal = pk.palette(mrgb, minner)
    lab = srgb_to_oklab(pal)
    imgs = {}
    for t in range(fig.n):
        f = d / f"s0_{t}_{seed}.png"
        if f.exists():
            rgb, inner, _ = pk.key(f)
            imgs[t] = (rgb, inner)
    ground_src = float(np.percentile([np.nonzero(a.any(1))[0].max() + 1 for _, a in imgs.values()], 97))
    cores = []
    for t, (rgb, inner) in imgs.items():
        ys, xs = np.nonzero(inner)
        origin = (xs.mean() - W / 2 * cell, ground_src - (H - (border + 1)) * cell)
        cores.append(despeckle(to_sprite(rgb, inner, pal, lab, cell, origin, (W, H), accent=1.3)))
    frames = [pk.paper(c, border) for c in cores]
    char_dir = ROOT / "characters" / char
    spec = {"canvas": [W, H], "frame_ms": fig.motion.get("frame_ms", 70), "loop": True, "run": f"pose-options/{motion}/{TRACK}"}

    class G:
        pass
    G.cell = cell
    out = char_dir / "sprites" / anim
    pk.write(out, frames, spec, char, str(pg.master_path(char).relative_to(ROOT)), [f"{motion}/{TRACK}/seed{seed}/frame{t}" for t in imgs], G, border)
    a = json.loads((out / "atlas.json").read_text())
    a["source"] = {"poseguide": TRACK, "motion": motion, "seed": seed, "place": "skel", "frames": list(imgs), "master": str(pg.master_path(char).relative_to(ROOT)), "border": border, "palette": pk.NCOL}
    (out / "atlas.json").write_text(json.dumps(a, indent=1))
    print(f"{char}/{anim}: {len(frames)} frames {W}x{H}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["gen", "sprite"])
    ap.add_argument("char")
    ap.add_argument("motion")
    ap.add_argument("--seeds")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--frames")
    ap.add_argument("--hands", default="free")
    ap.add_argument("--note", default="")
    ap.add_argument("--canvas")
    ap.add_argument("--out")
    a = ap.parse_args()
    if a.cmd == "gen":
        pg.gen(ns(char=a.char, motion=a.motion, seeds=a.seeds, seed=a.seed, frames=a.frames, hands=a.hands, note=a.note))
    else:
        sprite(a.char, a.motion, a.seed, [int(x) for x in a.canvas.split(",")], a.out)
