"""Builds the Paper Theatre review page (Paper Mario material, Charlie the Unicorn faces).

    /home/tommy/projects/sprite-forge/.venv/bin/python build.py

Reads /mnt/data/sprite-forge/runs/paper-theatre/run/MODEL/SHOT/SEED.png and the picks in CARDS below,
reduces each to the game's sprite height on the 1:1 stage grid with the sprite-forge functions,
composites it onto the New York Wall Street street, and writes a self-contained index.html.
P1 to P3 add the paper look in code to a clean flat generation (shot Z).
"""
import base64, io, subprocess, sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[2]
FORGE = Path.home() / "projects/sprite-forge"
sys.path.insert(0, str(FORGE))
sys.path.insert(0, str(HERE))
from forge.color import srgb_to_oklab  # noqa: E402
from forge.compose import thicken  # noqa: E402
from forge.pixelize import despeckle, to_sprite  # noqa: E402
from keying import fg_mask  # noqa: E402

RUN = Path("/mnt/data/sprite-forge/runs/paper-theatre/run")
GROUND, CROP = 598, (400, 260)
RIM = np.array([0x2a, 0x18, 0x30], np.uint8)
PAPER = np.array([0xfb, 0xf6, 0xea], np.uint8)
SUBJECTS = {
    "slice": dict(title="The New York slice: Vinny Two-Fold", h=124,
                  cur=GAME / "assets/sprites/slice-ny/idle/sheet.png", cur_frame=(140, 124)),
    "cust": dict(title="The Wall Street stockbroker", h=146,
                 cur=GAME / "assets/sprites/customer-newyork-wallstreet/idle/sheet.png", cur_frame=(120, 150)),
}

# (subject, label, shot, model, seed, paper pass or None, read)
CARDS = [
    ("slice", "A: papery 1 / deadpan 0 / shade 2", "slice_A", "klein", 1, None,
     "The safe baseline: the current Vinny as a sticker with a thin white border. Klein kept his goofy face and the "
     "paper border survives at 124 px as a light rim. Papercraft, not yet Charlie."),
    ("slice", "B: papery 2 / deadpan 2 / shade 1", "slice_B", "klein", 2, None,
     "At full size this is exactly the brief: a printed card cut-out with two dot eyes and a flat line mouth. But Klein "
     "photographed it on a pink table, and at 124 px the photo lighting washes it out: pale, low-contrast, weak against the street."),
    ("slice", "C: papery 2 / deadpan 3 / shade 0", "slice_C", "qwen-edit", 1, None,
     "Qwen's version: clean sticker border, flat fills, Charlie's small blank eyes and a slight frown. Bright and very "
     "readable on the street; the best of the set at game size, with D."),
    ("slice", "D: papery 3 / deadpan 2 / shade 1, Paper Mario ref", "slice_D", "qwen-edit", 1, None,
     "With the Paper Mario reference: thick white border, softly shaded cheese, tiny eyes and a flat mouth. "
     "Probably the strongest standee of the set; the border reads clearly against the street."),
    ("slice", "E: papery 3 / deadpan 3 / shade 1, both refs", "slice_E", "klein", 2, None,
     "Klein with both references: crumpled card and deadpan dots. Lovely at full size; at 124 px it is pale and the key "
     "left a pink shadow down its left side (a keying miss, fixable)."),
    ("slice", "F: crude, torn, taped (bolder than safe)", "slice_F", "klein", 2, None,
     "The bold one: torn and taped paper with creases. Funny at full size; at game size it is washed out, the creases "
     "read as damage, and the key left a pink edge. Too much for the default look."),
    ("slice", "F (Qwen): crude deadpan", "slice_F", "qwen-edit", 1, None,
     "Qwen's crude take stays clean: flat fills, white border, a slightly worried deadpan. Close to C."),
]
CARDS += [
    ("cust", "A: papery 1 / deadpan 0 / shade 2", "cust_A", "klein", 1, None,
     "Sticker-bordered and flat-shaded, still the angry stockbroker. At game size her grey suit and white border fade "
     "into the grey-blue street: she needs stronger colour to hold up."),
    ("cust", "B: papery 2 / deadpan 2 / shade 1", "cust_B", "klein", 1, None,
     "Paper on a table, mild grain. The model did not make her deadpan: the face stays an angry shout. Pale at game size."),
    ("cust", "C: papery 2 / deadpan 3, Charlie ref", "cust_C", "klein", 1, None,
     "With the Charlie reference: simpler eyes, flatter shapes, still yelling. Closest to the target of the customer set, "
     "though her face is less blank than Vinny's."),
    ("cust", "E: papery 3 / both refs", "cust_E", "klein", 1, None,
     "Thick card border and a crease across the legs. Same face as C. Reads as a standee."),
    ("cust", "C (Qwen)", "cust_C", "qwen-edit", 1, None,
     "Qwen keeps her saturated purple pinstripes with a white sticker border: by far the strongest customer on the street, "
     "and it matches Qwen's slice C/D. Still not deadpan: angry brows and a shouting mouth."),
]
for sub, base in (("slice", "slice_Z"), ("cust", "cust_Z")):
    CARDS += [
        (sub, "P1: code paper, thin border", base, "klein", 1, 1,
         "A clean flat generation with the paper look added in code: a 2 px white cut border and a 1 px dark rim. "
         "Identical on every character, so the whole cast matches."),
        (sub, "P2: code paper, thick border + drop shadow", base, "klein", 1, 2,
         "A 4 px white border and a solid drop shadow behind the standee: reads as a card cut-out stood a little in front "
         "of the street, which also fixes the 'background object shaded like foreground' problem by rule."),
        (sub, "P3: code paper, border + shadow + grain", base, "klein", 1, 3,
         "P2 plus a faint paper grain on the fills. The grain is visible at 2x and adds a little warmth at 1x."),
    ]


def rev(path):
    sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=path, capture_output=True, text=True).stdout.strip()
    dirty = bool(subprocess.run(["git", "status", "--porcelain"], cwd=path, capture_output=True, text=True).stdout.strip())
    return f"{sha or 'no-git'}{'+dirty' if dirty else ''}"


def paper(sprite, level):
    """The paper standee in code: white cut border, dark rim, then (level 2+) a solid drop shadow and (3) grain."""
    s = despeckle(sprite)
    if level == 3:
        a = s[..., 3] > 0
        yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
        grain = (((xx * 7 + yy * 13) ^ (xx * yy)) % 5 == 0)
        rgb = s[..., :3].astype(int)
        s[..., :3] = np.where((a & grain)[..., None], np.clip(rgb - 10, 0, 255), rgb).astype(np.uint8)
    s = thicken(s, 2 if level == 1 else 4, PAPER)
    s = thicken(s, 1, RIM)
    if level >= 2:
        dx, dy = 4, 3
        h, w = s.shape[:2]
        out = np.zeros((h + dy, w + dx, 4), np.uint8)
        a = s[..., 3] > 0
        out[dy:, dx:][a] = (*RIM, 255)
        top = out[:h, :w]
        top[a] = s[a]
        s = out
    return s


def to_game_sprite(path, h, level):
    rgb = np.asarray(Image.open(path).convert("RGB"))
    alpha = fg_mask(rgb)
    ys, xs = np.where(alpha)
    top, bot, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    border = 0 if not level else (3 if level == 1 else 5)
    fig_h = h - 2 - 2 * border
    cell = (bot - top) / fig_h
    w = int(np.ceil((right - left) / cell))
    pal_im = Image.fromarray(np.where(alpha[..., None], rgb, 0).astype(np.uint8)).quantize(48, method=Image.MEDIANCUT, dither=Image.NONE)
    pal = np.array(pal_im.getpalette()[:48 * 3], np.uint8).reshape(-1, 3)
    sprite = to_sprite(rgb, alpha, pal, srgb_to_oklab(pal), cell, (left, top), (w, fig_h), accent=1.3)
    sprite = paper(sprite, level) if level else thicken(despeckle(sprite), 1, RIM)
    return sprite, int(len(np.unique(sprite[sprite[..., 3] > 0][:, :3], axis=0)))


def bg_frame():
    bg = Image.new("RGBA", (1280, 720))
    for n in ("far", "mid", "near"):
        bg.alpha_composite(Image.open(GAME / f"assets/backgrounds/newyork/wallstreet/{n}.png").convert("RGBA").crop((0, 0, 1280, 720)))
    return bg


def in_frame(bg, sp, cx=490):
    f = bg.copy()
    im = Image.fromarray(sp, "RGBA")
    f.alpha_composite(im, (int(cx - im.width / 2), GROUND - im.height))
    x0 = int(cx - CROP[0] / 2)
    return f.crop((x0, GROUND - CROP[1] + 40, x0 + CROP[0], GROUND + 40)).convert("RGB")


def b64(im, fmt="PNG", **kw):
    b = io.BytesIO()
    im.save(b, fmt, **kw)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(b.getvalue()).decode()


def tag(im, cls="", fmt="PNG", **kw):
    return f'<img class="{cls}" src="{b64(im, fmt, **kw)}" width="{im.width}" height="{im.height}" alt="">'


def pair(sp):
    im = Image.fromarray(sp, "RGBA")
    return (tag(im, "px"), tag(im.resize((im.width * 2, im.height * 2), Image.NEAREST), "px"))


def _thumb(p):
    im = Image.open(p).convert("RGB")
    im.thumbnail((260, 200))
    return im


def current(sub):
    s = SUBJECTS[sub]
    sp = np.asarray(Image.open(s["cur"]).convert("RGBA").crop((0, 0, *s["cur_frame"]))).copy()
    ys, xs = np.where(sp[..., 3] > 0)
    return sp[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def main():
    bg = bg_frame()
    refs = "".join(f'<figure>{tag(_thumb(p), "full", "WEBP", quality=85)}<figcaption>{p.stem}</figcaption></figure>'
                   for p in sorted((HERE / "docs_refs").glob("*.png")))
    html = [(HERE / "template_head.html").read_text().replace("__REFS__", f'<h2>References</h2><div class="row">{refs}</div>'),
            f'<p class="rev">Built from sprite-forge {rev(FORGE)}, pizza-runner {rev(GAME)}. Models: Qwen-Image-Edit 2511 '
            '(Lightning 4 step) and FLUX.2 Klein 4B in ComfyUI.</p>']
    for sub, s in SUBJECTS.items():
        cur = current(sub)
        c1, c2 = pair(cur)
        cur_fr = tag(in_frame(bg, cur), "fr")
        html.append(f"<h2>{s['title']}</h2>")
        html.append((HERE / f"read_{sub}.html").read_text())
        for csub, label, shot, model, seed, level, read in CARDS:
            if csub != sub:
                continue
            path = RUN / model / shot / f"{seed}.png"
            sp, ncol = to_game_sprite(path, s["h"], level)
            full = Image.open(path).convert("RGB")
            full.thumbnail((560, 560))
            s1, s2 = pair(sp)
            html.append(f"""
<section class="card"><h3>{label} <span class="tag">{model} seed {seed}</span></h3>
 <div class="row">
  <figure><figcaption>(a) full size{' (the clean base the code pass starts from)' if level else ''}</figcaption>{tag(full, 'full', 'WEBP', quality=88)}</figure>
  <figure><figcaption>(b) {sp.shape[0]} px tall, 1:1 stage pixels, {ncol} colours</figcaption><div class="pair"><div>{s1}<small>1x</small></div><div>{s2}<small>2x nearest</small></div></div>
   <figcaption class="cur">current art</figcaption><div class="pair"><div>{c1}<small>1x</small></div><div>{c2}<small>2x nearest</small></div></div></figure>
 </div>
 <div class="row frames"><figure><figcaption>(c) in the game frame</figcaption>{tag(in_frame(bg, sp), 'fr')}</figure>
  <figure><figcaption class="cur">current art, same street</figcaption>{cur_fr}</figure></div>
 <p class="read">{read}</p></section>""")
    html.append("</body></html>")
    page = "\n".join(html)
    (HERE / "index.html").write_text(page)
    print(f"index.html {len(page) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
