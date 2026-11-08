"""The code rig for a paper pizza: cuts the body out of the new idle core, runs forge.runrig, adds the paper border.

    FORGE_PROJECT=art PYTHONPATH=~/projects/sprite-forge ~/projects/sprite-forge/.venv/bin/python art/paper/pizzarig.py \
        art/characters/slice-ny/rig/run.toml

How the rig takes its parts from the master: paperkit reduces the master to `sprites/idle-core` (the figure on the stage grid, no
paper border). This script keeps only what is inside the rig file's [body] keep polygon (the slice and its crust: no arms, legs, gloves
or shoes), writes it as `sprites/idle-body`, and hands that to forge.runrig as the body. The sneaker and the glove are cropped from the
same core frame by the [foot] and [hand] boxes. forge.runrig then peels the master's outline off the body and re-draws the same outline
round every layer, so the run keeps the master's line weight; the paper border and rim go on afterwards in code, exactly as for a
generated frame (paperkit.paper). Extra rig-file keys (all optional):
    [body] keep = [[x,y],...]   polygon on idle-core frame 0
    [paper] border = 4          white border width
[body] cut_from = the idle-core sheet the keep polygon is applied to; src = where the cut body is written (what the rig reads).
"""
import json, sys, tomllib
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import paperkit  # noqa: E402  (puts sprite-forge on the path)
from forge import runrig  # noqa: E402
from forge.generate import ROOT  # noqa: E402


def cut_body(cfg, char_dir):
    b = cfg["body"]
    src = ROOT / b["cut_from"]
    sheet = np.asarray(Image.open(src).convert("RGBA"))
    fw = b["frame_w"]
    f = sheet[:, b["frame"] * fw:(b["frame"] + 1) * fw].copy()
    m = Image.new("L", (f.shape[1], f.shape[0]), 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in b["keep"]], fill=255)
    f[np.asarray(m) == 0] = 0
    out = (ROOT / b["src"]).parent
    out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(f, "RGBA").save(out / "sheet.png")
    return f


def main(path):
    path = Path(path).resolve()
    cfg = tomllib.loads(path.read_text())
    char_dir = path.parent.parent
    cut_body(cfg, char_dir)
    ease = cfg.get("paper", {}).get("far_light", 0.5)    # the far limbs darken less than the code rig's violet default: flat paper
    plain = runrig.darken
    runrig.darken = lambda rgb, f, tint=(42, 24, 48): plain(rgb, 1 - (1 - f) * (1 - ease), tint)
    rig = runrig.Rig(path)
    cores = rig.build()
    border = cfg.get("paper", {}).get("border", 4)
    frames = [paperkit.paper(c, border) for c in cores]
    w, h = cfg["canvas"]
    spec = {"canvas": [w, h], "frame_ms": cfg["frame_ms"], "loop": True, "run": "code rig"}

    class G:
        cell = 0.0
    anim = cfg["anim"]
    master = cfg["body"]["src"]
    paperkit.write(char_dir / "sprites" / anim, frames, spec, char_dir.name, master, [f"rig/{cfg['gait']['kind']}/{i}" for i in range(len(frames))], G, border)
    atlas_path = char_dir / "sprites" / anim / "atlas.json"
    atlas = json.loads(atlas_path.read_text())
    atlas["source"] = {"rig": str(path.relative_to(ROOT)), "body": cfg["body"]["src"], "gait": cfg["gait"]["kind"], "border": border, "palette": "master"}
    atlas_path.write_text(json.dumps(atlas, indent=1))
    print(f"{char_dir.name}/{anim}: {len(frames)} frames {w}x{h}")


if __name__ == "__main__":
    main(sys.argv[1])
