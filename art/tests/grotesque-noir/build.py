"""Builds the grotesque-noir review page.

    /home/tommy/projects/sprite-forge/.venv/bin/python build.py

Reads the generated images from /mnt/data/sprite-forge/runs/grotesque-noir/run2/MODEL/SHOT/SEED.png,
the curation in review.json (verdict and notes per image), reduces each kept image to the game's
sprite height on the 1:1 stage grid with the sprite-forge functions, composites it onto the New York
Wall Street street, and writes index.html (self-contained) next to this script.
Records the repo revisions the page was built from.
"""
import base64, io, json, subprocess, sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).resolve().parent
GAME = HERE.parents[2]
FORGE = Path.home() / "projects/sprite-forge"
sys.path.insert(0, str(FORGE))
from forge.color import srgb_to_oklab  # noqa: E402
from forge.compose import thicken  # noqa: E402
from forge.pixelize import despeckle, to_sprite  # noqa: E402

RUN = Path("/mnt/data/sprite-forge/runs/grotesque-noir/run2")
REVIEW = json.loads((HERE / "review.json").read_text())
SUBJECTS = {
    "slice": dict(title="The New York slice: Vinny Two-Fold", h=124, frame=(140, 124), x=250,
                  cur=GAME / "assets/sprites/slice-ny/idle/sheet.png", cur_frame=(140, 124)),
    "cust": dict(title="The Wall Street stockbroker", h=130, frame=(120, 150), x=250,
                 cur=GAME / "assets/sprites/customer-newyork-wallstreet/idle/sheet.png", cur_frame=(120, 150)),
}
OUTLINE = 2
GROUND = 598          # y of the feet in the 1280x720 stage (the street's walkway line)
CROP = (400, 240)     # frame crop at 1:1 stage pixels


def rev(path):
    sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=path, capture_output=True, text=True).stdout.strip()
    dirty = bool(subprocess.run(["git", "status", "--porcelain"], cwd=path, capture_output=True, text=True).stdout.strip())
    return f"{sha or 'no-git'}{'+dirty' if dirty else ''}"


sys.path.insert(0, str(HERE))
from keying import fg_mask  # noqa: E402

DARK = np.array([0x2a, 0x18, 0x30], float)


def noir(sprite, level):
    """Code-added hard shadow: one light from the upper left, a straight terminator across the figure, the far side
    filled with a flat deep violet-black that keeps 20% of the painted colour so shapes still read. Level 3 adds a
    halftone band along the terminator. Deterministic, so it repeats on any character."""
    a = sprite[..., 3] > 0
    h, w = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    ys, xs = np.where(a)
    t = ((xx - xs.min()) / max(xs.max() - xs.min(), 1)) * 0.8 + ((yy - ys.min()) / max(ys.max() - ys.min(), 1)) * 0.5
    thr = {1: 0.95, 2: 0.8, 3: 0.64}[level]
    sh = a & (t > thr)
    if level >= 2:
        band = {2: 0.05, 3: 0.11}[level]
        near = a & (np.abs(t - thr) < band)
        dots = ((xx % 2 == 0) & (yy % 2 == 0)) if level == 2 else ((xx + yy) % 2 == 0)
        sh = (sh & ~near) | (near & (t > thr) & dots) | (near & (t <= thr) & (level == 3) & (xx % 2 == 1) & (yy % 2 == 1))
    out = sprite.copy()
    rgb = sprite[..., :3].astype(float)
    out[..., :3] = np.where(sh[..., None], DARK * 0.8 + rgb * 0.2 * np.array([0.8, 0.6, 1.0]), rgb).astype(np.uint8)
    return out


def to_game_sprite(path, h, noir_level=0):
    """Key out, crop, sample onto the stage grid with a 48-colour palette, add the 2 px outline."""
    rgb = np.asarray(Image.open(path).convert("RGB"))
    alpha = fg_mask(rgb)
    r_, g_, b_ = [rgb[..., i].astype(int) for i in range(3)]
    alpha &= ~((np.minimum(r_, b_) - g_ > 60) & (r_ > 140) & (b_ > 120) & (g_ < 120))
    ys, xs = np.where(alpha)
    top, bot, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    fig_h = h - 2 * OUTLINE
    cell = (bot - top) / fig_h
    w = int(np.ceil((right - left) / cell))
    pal_im = Image.fromarray(np.where(alpha[..., None], rgb, 0).astype(np.uint8)).quantize(48, method=Image.MEDIANCUT, dither=Image.NONE)
    pal = np.array(pal_im.getpalette()[:48 * 3], np.uint8).reshape(-1, 3)
    sprite = to_sprite(rgb, alpha, pal, srgb_to_oklab(pal), cell, (left, top), (w, fig_h), accent=1.3)
    if noir_level:
        sprite = noir(despeckle(sprite), noir_level)
    sprite = thicken(despeckle(sprite), OUTLINE, pal[np.argmin(srgb_to_oklab(pal)[:, 0])])
    return sprite, int(len(np.unique(sprite[sprite[..., 3] > 0][:, :3], axis=0)))


def bg_frame():
    bg = Image.new("RGBA", (1280, 720))
    for n in ("far", "mid", "near"):
        bg.alpha_composite(Image.open(GAME / f"assets/backgrounds/newyork/wallstreet/{n}.png").convert("RGBA").crop((0, 0, 1280, 720)))
    return bg


def in_frame(bg, sprite_rgba, cx):
    f = bg.copy()
    im = Image.fromarray(sprite_rgba, "RGBA")
    f.alpha_composite(im, (int(cx - im.width / 2), GROUND - im.height))
    x0 = int(cx - CROP[0] / 2)
    return f.crop((x0, GROUND - CROP[1] + 40, x0 + CROP[0], GROUND + 40)).convert("RGB")


def b64(im, fmt="PNG", **kw):
    b = io.BytesIO()
    im.save(b, fmt, **kw)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(b.getvalue()).decode()


def img_tag(im, cls="", fmt="PNG", alt="", **kw):
    return f'<img class="{cls}" src="{b64(im, fmt, **kw)}" width="{im.width}" height="{im.height}" alt="{alt}">'


def sprite_pair(sprite):
    im = Image.fromarray(sprite, "RGBA")
    s1 = img_tag(im, "px s1", alt="1x")
    s2 = img_tag(im.resize((im.width * 2, im.height * 2), Image.NEAREST), "px s2", alt="2x")
    return s1, s2


def current(sub, bg):
    s = SUBJECTS[sub]
    fw, fh = s["cur_frame"]
    sp = np.asarray(Image.open(s["cur"]).convert("RGBA").crop((0, 0, fw, fh))).copy()
    ys, xs = np.where(sp[..., 3] > 0)
    sp = sp[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return sp


def cards(sub, bg):
    s = SUBJECTS[sub]
    cur = current(sub, bg)
    cur_s1, cur_s2 = sprite_pair(cur)
    cur_frame = img_tag(in_frame(bg, cur, s["x"] + 240), "fr")
    out, dropped = [], []
    for key, v in REVIEW.items():
        if not key.startswith(sub + "_"):
            continue
        shot, model, seed = key.split("/")[0], key.split("/")[1], key.split("/")[2]
        if v["verdict"] != "keep":
            dropped.append((key, v))
            continue
        base = v.get("base", shot)
        path = RUN / model / base / f"{seed}.png"
        sprite, ncol = to_game_sprite(path, s["h"], v.get("noir", 0))
        full = Image.open(path).convert("RGB")
        full.thumbnail((640, 640))
        s1, s2 = sprite_pair(sprite)
        fr = img_tag(in_frame(bg, sprite, s["x"] + 240), "fr")
        out.append(f"""
<section class="card" id="{key.replace('/', '-')}">
 <h3>{v['label']} <span class="tag">{model} seed {seed}</span></h3>
 <p class="axes">{v['axes']}</p>
 <div class="row">
  <figure><figcaption>(a) full size</figcaption>{img_tag(full, 'full', 'WEBP', quality=88)}</figure>
  <figure><figcaption>(b) {s['h']} px, 1:1 stage pixels, {ncol} colours</figcaption><div class="pair"><div>{s1}<small>1x</small></div><div>{s2}<small>2x nearest</small></div></div>
   <figcaption class="cur">current art</figcaption><div class="pair"><div>{cur_s1}<small>1x</small></div><div>{cur_s2}<small>2x nearest</small></div></div></figure>
 </div>
 <div class="row frames"><figure><figcaption>(c) in the game frame</figcaption>{fr}</figure><figure><figcaption class="cur">current art, same street</figcaption>{cur_frame}</figure></div>
 <p class="read">{v['read']}</p>
</section>""")
    return "\n".join(out), dropped


def main():
    bg = bg_frame()
    html = [(HERE / "template_head.html").read_text()]
    html.append(f'<p class="rev">Built from sprite-forge {rev(FORGE)}, pizza-runner {rev(GAME)}. Model files: Qwen-Image-Edit 2511 (Lightning 4 step) and FLUX.2 Klein 4B in ComfyUI.</p>')
    for sub, s in SUBJECTS.items():
        body, dropped = cards(sub, bg)
        html.append(f"<h2>{s['title']}</h2>")
        html.append((HERE / f"read_{sub}.html").read_text())
        html.append(body)
        if dropped:
            html.append("<h3>Dropped</h3><ul class='drop'>" + "".join(f"<li><code>{k}</code>: {v['verdict']} - {v.get('note', '')}</li>" for k, v in dropped) + "</ul>")
    html.append((HERE / "template_foot.html").read_text())
    page = "\n".join(html)
    (HERE / "index.html").write_text(page)
    print(f"index.html {len(page) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
