"""Builds the paper art for Chicago, DC, Naples and Long Beach (the New York recipe, art/paper/STYLE.md; steps shared with
paper_ny_build.py). Per area: far, mid, near, ground, door and sources.json; per city: barrel, barrel-out, barricade, platform.
    python backgrounds/paper_build.py CITY ASSETS_BACKGROUNDS        (from art/, sprite-forge on PYTHONPATH)
CITY is chicago, dc, naples or california. Picks (which Qwen seed of which shot) live in paper_picks_rest.json; every pick is
logged in each folder's sources.json. Jobs: chicago-1 = #234, dc-1 = #235, naples-1 = #236, california-1 = #237."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paper_ny_build as nb
from paper import add_grain
from paper_near import elevated_line
from forge.layers import write_sources

nb.LIFT_DARK = True
nb.JOBS.update({"chicago-1": 234, "dc-1": 235, "naples-1": 236, "california-1": 237})
PICKS = json.loads((Path(__file__).parent / "paper_picks_rest.json").read_text())
# boxes (x0, y0, x1, y1) in final layer pixels: model-drawn lettering found on inspection (see report)
nb.ERASE.update(PICKS.get("erase", {}))

AREAS = {
    "chicago": ["loop", "lincolnpark", "wickerpark"],
    "dc": ["georgetown", "mall", "federal"],
    "naples": ["harbor", "center", "hillside"],
    "california": ["downtown", "beach", "bungalows"],
}

BEHIND = {"loop": elevated_line}   # per area: a code-drawn piece that sits behind the picked mid layer

# platform card colours (card, plank cut, top edge) per city
PLATFORMS = {
    "chicago": ((176, 190, 214), (146, 160, 192), (200, 212, 232)),
    "dc": ((226, 216, 196), (198, 186, 164), (240, 232, 214)),
    "naples": ((232, 178, 148), (204, 146, 118), (246, 202, 176)),
    "california": ((150, 214, 208), (118, 186, 182), (186, 232, 226)),
}


def running_bond(sw, sh, tones, seams, seed, stagger=True):
    """256x120 paving that wraps both ways: rows of slabs sh tall and sw wide, staggered, one flat tone per slab, a darker cut line
    between. The top row is a cut line, so the street reads as starting at the ground line."""
    rng = np.random.default_rng(seed)
    t = np.zeros((120, 256, 3), float)
    seam = np.zeros((120, 256), bool)
    for row in range(120 // sh):
        off = (sw // 2) * (row % 2) if stagger else 0
        seam[row * sh, :] = True
        for col in range(256 // sw):
            c = np.array(tones[rng.integers(len(tones))], float)
            x0 = (col * sw + off) % 256
            xs = [(x0 + dx) % 256 for dx in range(sw)]
            t[row * sh:(row + 1) * sh, xs] = c
            seam[row * sh:(row + 1) * sh, x0] = True
    t[seam] = np.array(seams, float)
    rgba = np.dstack([t.clip(0, 255).astype(np.uint8), np.full((120, 256), 255, np.uint8)])
    return add_grain(rgba, seed, 2.0)


def sand(tones, seams, seed):
    """Low-contrast sand: big soft patches and short darker ripple dashes, wrapping both ways."""
    g = running_bond(128, 60, tones, seams, seed)
    rng = np.random.default_rng(seed + 1)
    for _ in range(26):
        x, y, w = rng.integers(0, 256), rng.integers(8, 116), rng.integers(10, 24)
        for dx in range(w):
            g[y, (x + dx) % 256, :3] = np.clip(g[y, (x + dx) % 256, :3].astype(int) - 14, 0, 255)
    return g


# kind, slab w, slab h, tones, cut-line colour
GROUNDS = {
    "loop": ("slabs", 64, 40, [(172, 180, 198), (164, 172, 192), (180, 188, 206)], (128, 136, 160)),
    "lincolnpark": ("slabs", 64, 40, [(222, 212, 184), (214, 204, 174), (228, 218, 192)], (186, 172, 140)),
    "wickerpark": ("bricks", 32, 20, [(214, 168, 150), (206, 160, 142), (220, 176, 158)], (170, 124, 112)),
    "georgetown": ("bricks", 32, 20, [(212, 160, 140), (204, 152, 134), (220, 170, 150)], (166, 116, 102)),
    "mall": ("slabs", 128, 60, [(226, 222, 196), (220, 216, 190), (232, 228, 204)], (194, 188, 160)),
    "federal": ("slabs", 64, 40, [(214, 210, 200), (206, 202, 192), (220, 216, 206)], (170, 166, 156)),
    "harbor": ("bricks", 16, 20, [(176, 170, 190), (168, 162, 184), (184, 178, 198)], (136, 130, 156)),
    "center": ("bricks", 16, 20, [(170, 160, 178), (162, 152, 172), (178, 168, 186)], (132, 120, 142)),
    "hillside": ("bricks", 32, 20, [(228, 190, 170), (220, 182, 162), (234, 198, 178)], (190, 146, 130)),
    "downtown": ("slabs", 64, 40, [(222, 210, 190), (214, 202, 182), (228, 216, 196)], (184, 170, 148)),
    "beach": ("sand", 0, 0, [(244, 228, 186), (240, 222, 178), (248, 234, 194)], (222, 202, 150)),
    "bungalows": ("slabs", 64, 40, [(196, 190, 196), (188, 182, 190), (202, 196, 202)], (150, 142, 154)),
}


def ground_for(area):
    kind, sw, sh, tones, seams = GROUNDS[area]
    if kind == "sand":
        return sand(tones, seams, 51), {"procedural": "sand in paper_build.py", "tones": tones, "cut_line": seams}
    return running_bond(sw, sh, tones, seams, 51), {"procedural": f"running_bond in paper_build.py ({kind})", "slab": [sw, sh], "tones": tones, "cut_line": seams}


def main():
    city, root = sys.argv[1], Path(sys.argv[2])
    out = root / city
    out.mkdir(parents=True, exist_ok=True)
    nb.OUT = out
    for area in AREAS[city]:
        pk = PICKS[area]
        d = out / area
        d.mkdir(exist_ok=True)
        sources = {}
        for layer in ("far", "mid", "near"):
            rgba, meta = nb.build_near(area) if layer == "near" else nb.build_layer(area, layer, pk[layer]["run"], pk[layer]["seed"])
            if layer == "mid" and area in BEHIND:   # drawn in code, behind the buildings
                back = add_grain(BEHIND[area](), 14, 2.0)
                back[..., 3] = np.where(back[..., 3] > 127, 255, 0)
                rgba = np.asarray(Image.alpha_composite(Image.fromarray(back, "RGBA"), Image.fromarray(rgba, "RGBA"))).copy()
                meta["behind"] = f"paper_near.{BEHIND[area].__name__}"
            Image.fromarray(rgba, "RGBA").save(d / f"{layer}.png", optimize=True)
            sources[layer] = meta
        g, meta = ground_for(area)
        Image.fromarray(g, "RGBA").save(d / "ground.png", optimize=True)
        sources["ground"] = meta
        door, meta = nb.build_door(area, pk["door"]["run"], pk["door"]["seed"])
        Image.fromarray(door, "RGBA").save(d / "door.png", optimize=True)
        sources["door"] = meta
        write_sources(d / "sources.json", sources)
        print("ok", area, door.shape[1], door.shape[0])
    pp = PICKS[city]["props"]
    rgb, meta = nb.qwen(pp["run"], "props", pp["seed"])
    crops = nb.split_props(rgb)
    assert len(crops) == 3, len(crops)
    sizes = {"barrel": (60, 110), "barrel-out": (60, 110), "barricade": (80, 100)}
    for (name, (w, h)), crop in zip(sizes.items(), crops):
        if name == "barricade":
            crop = nb.clean_tape(crop)
        Image.fromarray(nb.fit_prop(crop, w, h, 0), "RGBA").save(out / f"{name}.png", optimize=True)
    card, plank, edge = PLATFORMS[city]
    Image.fromarray(nb.platform_tile(card, plank, edge), "RGBA").save(out / "platform.png", optimize=True)
    write_sources(out / "sources.json", {"props": meta, "platform": {"procedural": "platform_tile in paper_ny_build.py", "card": card}})


if __name__ == "__main__":
    main()
