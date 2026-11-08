"""Reduces the soft-pizza options with paperkit and builds the self-contained pick page.

    FORGE_PROJECT=art PYTHONPATH=~/projects/sprite-forge ~/projects/sprite-forge/.venv/bin/python \
        art/tests/soft-pizzas/build_page.py contact|page [OUT.html]

contact: writes /tmp/soft-pizzas/contact-NAME.png (every candidate, reduced) for the by-eye screen.
page:    builds the pick page from the surviving options in options.json (DROP and READS live there).
Reduction is paperkit's own: Geometry from the option itself, one 48-colour palette, canvas height = the game height
(Stan 170, Phil 240, Contessa 104, Vinny 124), 4 px white border and 1 px #2a1830 rim added by paperkit.paper().
"""
import base64, io, json, sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[2]
sys.path.insert(0, str(GAME / "art/paper"))
import paperkit  # noqa: E402

RUNS = Path("/mnt/data/sprite-forge/runs")
TMP = Path("/tmp/soft-pizzas")
CHARS = {  # name: (label, canvas, city/area, variants)
    "slice-deep": ("Stan", (230, 170), "chicago/loop", "abcde"),
    "slice-jumbo": ("Phil", (330, 240), "dc/mall", "abcde"),
    "slice-naples": ("Contessa", (130, 104), "naples/center", "abcde"),
    "slice-ny": ("Vinny", (140, 124), "newyork/wallstreet", "ab"),
}


def gfile(name, tag):
    """The guide image a round 3/4 tag was painted from (round 4's i1/i2 are guides g3/g4)."""
    return f"{name}-g{int(tag[1]) + (2 if tag[0] == 'i' else 0)}.png"


def src(name, tag, seed):
    if tag[0] == "i":  # round 4 (Stan, Phil): guide + style only, guides halfway between the master and round 3
        return RUNS / name / "soft4_masters/qwen-edit" / f"i_{tag[1]}" / f"{seed}.png"
    if tag[0] in "gh":  # round 3: g1/g2 = guide + Vinny's master + style; h1/h2 (3b) = guide + style only
        return RUNS / name / ("soft3_masters" if tag[0] == "g" else "soft3b_masters") / "qwen-edit" / f"{tag[0]}_{tag[1]}" / f"{seed}.png"
    return RUNS / name / ("soft_masters2" if tag in "de" else "soft_masters") / "qwen-edit" / f"s_{tag}" / f"{seed}.png"


def master(name):
    return GAME / "art/characters" / name / "references/paper-master.png"


def reduce(path, canvas):
    """The figure on the stage grid with border and rim: an RGBA array canvas-sized."""
    border = 4 if canvas[1] >= 110 else 3
    g = paperkit.Geometry(path, canvas, border)
    return paperkit.paper(g.core(path), border)


def checker_bg(w, h, c=(150, 164, 190, 255)):
    return Image.new("RGBA", (w, h), c)


def contact():
    TMP.mkdir(exist_ok=True)
    for name, (label, canvas, _, variants) in CHARS.items():
        tags = ["i1", "i2"] if "r4" in sys.argv else (["h1", "h2"] if name in ("slice-deep", "slice-jumbo", "slice-ny") else ["g1", "g2"]) if "r3" in sys.argv else list(variants)  # `contact r3` screens round 3
        items = [("current", master(name))] + [(f"{t}{s}", src(name, t, s)) for t in tags for s in (1, 2, 3)]
        W, H = canvas
        cols = 4
        rows = (len(items) + cols - 1) // cols
        sheet = Image.new("RGBA", (cols * (W * 2 + 8), rows * (H * 2 + 22)), (150, 164, 190, 255))
        d = ImageDraw.Draw(sheet)
        for i, (tag, p) in enumerate(items):
            if not p.exists():
                continue
            try:
                a = reduce(p, canvas)
            except Exception as e:  # noqa: BLE001
                print(name, tag, "reduce failed", e)
                continue
            x, y = (i % cols) * (W * 2 + 8) + 4, (i // cols) * (H * 2 + 22) + 18
            d.text((x, y - 14), f"{label} {tag}", fill=(20, 10, 30, 255))
            sheet.alpha_composite(Image.fromarray(a, "RGBA").resize((W * 2, H * 2), Image.NEAREST), (x, y))
        sheet.convert("RGB").save(TMP / f"contact-{name}.png")
        print(TMP / f"contact-{name}.png")


def b64(im, fmt="PNG", **kw):
    buf = io.BytesIO()
    im.save(buf, fmt, **kw)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(buf.getvalue()).decode()


def street(area, sprite, x=1020, win=(480, 300)):
    """The sprite standing on its city's street at 1:1: far, mid, ground, sprite (feet at y 608), near."""
    base = GAME / "assets/backgrounds" / area
    W, H = 2560, 720
    im = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    for l in ("far", "mid"):
        im.alpha_composite(Image.open(base / f"{l}.png").convert("RGBA"))
    gr = Image.open(base / "ground.png").convert("RGBA")
    for gx in range(0, W, gr.width):
        im.alpha_composite(gr, (gx, 600))
    h, w = sprite.shape[:2]
    im.alpha_composite(Image.fromarray(sprite, "RGBA"), (x - w // 2, 608 - h))
    im.alpha_composite(Image.open(base / "near.png").convert("RGBA"))
    top = 608 - win[1] + 40
    return im.crop((x - win[0] // 2, top, x + win[0] // 2, top + win[1])).convert("RGB")


CSS = """
body{font:15px/1.4 system-ui,sans-serif;background:#2b2638;color:#f3ecdc;margin:0;padding:24px 28px;max-width:1500px}
h1{margin:0 0 4px}h2{margin:38px 0 6px;border-top:2px solid #6a5a8a;padding-top:14px}
.note{color:#bdb3d4;margin:0 0 12px}
.row{display:flex;flex-wrap:wrap;gap:18px}
.card{background:#3a3450;border-radius:10px;padding:12px;width:max-content;max-width:100%}
.card.cur{background:#454052;outline:2px dashed #8d84a8}
.card h3{margin:0 0 2px;font-size:20px}.read{color:#e8d9a8;margin:0 0 8px;max-width:520px}
.card img{display:block}.px{image-rendering:pixelated}
.big{max-height:460px;max-width:460px;background:#9aa4be;border-radius:6px}
.game{display:flex;gap:14px;align-items:flex-end;margin:8px 0;background:#9aa4be;padding:8px;border-radius:6px;width:max-content}
.game span{font-size:11px;color:#2b2638;display:block}
.street{width:960px;max-width:100%;border-radius:6px;margin-top:4px}
.top{color:#ffd86a}
"""


def page(out):
    opts = json.loads((HERE / "options.json").read_text())
    parts = [f"<!doctype html><html><head><meta charset=utf-8><title>Pizza Runner: soft pizzas, pick page</title><style>{CSS}</style></head><body>",
             "<h1>Soft pizzas: pick your masters</h1>",
             "<p class=note>Tommy's note: too stiff and triangular, soften. Each section shows the current paper version, then every surviving option "
             "as the full model art, at game size (1x and 2x, border and rim included), and standing on its street (shown 2x, pixel for pixel) next to the current one. "
             "Reply with picks like &ldquo;Stan 3, Phil 2, Contessa 1, Vinny current&rdquo;. Nothing is animated or imported yet.</p>"]
    for name, (label, canvas, area, _) in CHARS.items():
        o = opts[name]
        cur = reduce(master(name), canvas)
        cur_street = street(area, cur)
        parts.append(f"<h2>{label} <small>({canvas[1]} px tall in game, {area.split('/')[0]})</small></h2>")
        if name == "slice-ny":
            parts.append("<p class=note>Optional: Vinny was your original pick, so he stays as he is unless you want the softening here too.</p>")
        parts.append("<div class=row>")
        cards = [("Current", "cur", master(name), cur, cur_street, o.get("current_read", "The paper master in the game today."))]
        for k, v in o["options"].items():
            p = src(name, v["tag"], v["seed"])
            a = reduce(p, canvas)
            cards.append((f"{label} {k}", "", p, a, street(area, a), v["read"] + (" <b class=top>Top pick.</b>" if o.get("top") == k else "")))
        for title, cls, p, a, st, read in cards:
            full = Image.open(p).convert("RGB").resize((640, 640), Image.LANCZOS)
            sp = Image.fromarray(a, "RGBA")
            sp2 = sp.resize((sp.width * 2, sp.height * 2), Image.NEAREST)
            parts.append(f"<div class='card {cls}'><h3>{title}</h3><p class=read>{read}</p>"
                         f"<img class=big src='{b64(full, 'JPEG', quality=84)}' alt='{title} full size'>"
                         f"<div class=game><div><span>1x</span><img class=px src='{b64(sp)}'></div><div><span>2x</span><img class=px src='{b64(sp2)}'></div></div>"
                         f"<img class='street px' src='{b64(st)}' alt='{title} in street'></div>")
        parts.append("</div>")
        for rkey, rnum, gids, sub in (("round3", 3, ("g1", "g2"), "painted from a hand-built soft silhouette"),
                                      ("round4", 4, ("g3", "g4"), "guides halfway between the current master and round 3")):
          r3 = o.get(rkey)
          if r3:
            parts.append(f"<h2 style='border:0;margin-top:22px'>{label}: Round {rnum} <small>{sub}</small></h2>"
                         f"<p class=note>{r3['intent']} The guides are what Qwen was asked to paint; each result sits beside its guide.</p><div class=row>")
            for g in gids:
                gim = Image.open(HERE / "guides" / f"{name}-{g}.png").convert("RGB").resize((360, 360), Image.LANCZOS)
                parts.append(f"<div class=card><h3>Guide {g[1]}</h3><img src='{b64(gim, 'JPEG', quality=80)}' alt='guide {g[1]}'></div>")
            parts.append("</div><div class=row>")
            for k, v in r3["options"].items():
                p = src(name, v["tag"], v["seed"])
                a = reduce(p, canvas)
                full = Image.open(p).convert("RGB").resize((640, 640), Image.LANCZOS)
                sp = Image.fromarray(a, "RGBA")
                sp2 = sp.resize((sp.width * 2, sp.height * 2), Image.NEAREST)
                gim = Image.open(HERE / "guides" / gfile(name, v["tag"])).convert("RGB").resize((240, 240), Image.LANCZOS)
                top = " <b class=top>Top pick.</b>" if r3.get("top") == k else ""
                parts.append(f"<div class=card><h3>{label} {k}</h3><p class=read>{v['read']}{top}</p>"
                             f"<div style='display:flex;gap:10px;align-items:flex-start'><img src='{b64(gim, 'JPEG', quality=80)}' alt='guide' style='width:200px;border-radius:6px'>"
                             f"<img class=big src='{b64(full, 'JPEG', quality=84)}' alt='{label} {k} full size' style='max-width:380px'></div>"
                             f"<div class=game><div><span>1x</span><img class=px src='{b64(sp)}'></div><div><span>2x</span><img class=px src='{b64(sp2)}'></div></div>"
                             f"<img class='street px' src='{b64(street(area, a))}' alt='{label} {k} in street'></div>")
            parts.append("</div>")
    parts.append("</body></html>")
    Path(out).write_text("".join(parts))
    print(out, round(Path(out).stat().st_size / 1e6, 1), "MB")


if __name__ == "__main__":
    {"contact": lambda: contact(), "page": lambda: page(sys.argv[2] if len(sys.argv) > 2 else "/tmp/soft-pizzas/index.html")}[sys.argv[1]]()
