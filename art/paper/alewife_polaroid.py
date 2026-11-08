"""The ending Polaroid: DJ Alewife behind her booth, as a paper diorama built in code around her paper master.

    FORGE_PROJECT=art PYTHONPATH=~/projects/sprite-forge ~/projects/sprite-forge/.venv/bin/python art/paper/alewife_polaroid.py   (or art/paper/forge.sh art/paper/alewife_polaroid.py)

The model's candid shots (jobs #239, #242) came back as pixel art with a laptop logo on them, so the room is drawn here instead: flat cut-paper
shapes (wall, string lights, booth, two turntables) with grain, and her standee (art/characters/alewife/references/paper-master.png, border and all)
placed behind the booth. Output: assets/backgrounds/hq/alewife-polaroid.png, 300x300.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import paperkit as pk  # noqa: E402
from scipy import ndimage  # noqa: E402

GAME = HERE.parents[1]
S = 4          # draw at 4x, then reduce
W = H = 300


def px(v):
    return int(v * S)


def shadow_rect(d, box, fill, r=6):
    x0, y0, x1, y1 = [px(v) for v in box]
    d.rounded_rectangle([x0 + px(2), y0 + px(3), x1 + px(2), y1 + px(3)], radius=px(r), fill=(40, 20, 60, 255))
    d.rounded_rectangle([x0, y0, x1, y1], radius=px(r), fill=fill, outline=(251, 246, 234, 255), width=px(1.6))


def build():
    img = Image.new("RGB", (W * S, H * S), (112, 70, 140))
    d = ImageDraw.Draw(img, "RGBA")
    # wall: two flat paper tones with a cut edge
    d.rectangle([0, px(150), W * S, H * S], fill=(92, 56, 120))
    pts = [(0, px(150))] + [(px(x), px(150 + 3 * np.sin(x / 11.0))) for x in range(0, W + 1, 6)] + [(W * S, px(150))]
    d.polygon(pts + [(W * S, px(160)), (0, px(160))], fill=(92, 56, 120))
    # paper stars
    rng = np.random.default_rng(7)
    for _ in range(22):
        x, y = rng.uniform(8, 292), rng.uniform(70, 175)
        r = rng.uniform(1.6, 2.8)
        d.ellipse([px(x - r), px(y - r), px(x + r), px(y + r)], fill=(255, 215, 120, 150))
    # string lights: a sagging line with warm bulbs
    prev = None
    for i in range(0, W + 1, 4):
        y = 22 + 20 * np.sin(np.pi * i / W)
        if prev:
            d.line([prev, (px(i), px(y))], fill=(42, 24, 48, 255), width=px(1.2))
        prev = (px(i), px(y))
    for x in range(14, W, 38):
        y = 22 + 20 * np.sin(np.pi * x / W)
        d.ellipse([px(x - 9), px(y - 3), px(x + 9), px(y + 15)], fill=(255, 226, 150, 90))
        d.ellipse([px(x - 4.5), px(y), px(x + 4.5), px(y + 10)], fill=(255, 220, 110, 255), outline=(251, 246, 234, 255), width=px(1))
    return img


def figure(target_h):
    """Her standee, cut from the master with the paper border put back on, scaled to target_h."""
    master = GAME / "art/characters/alewife/references/paper-master.png"
    rgb, inner, _ = pk.key(master)
    ys, xs = np.where(inner)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    core = np.zeros(rgb.shape[:2] + (4,), np.uint8)
    core[..., :3] = rgb
    core[..., 3] = inner * 255
    core = core[box[1]:box[3], box[0]:box[2]]
    pic = Image.fromarray(core, "RGBA")
    k = target_h / pic.height
    pic = pic.resize((round(pic.width * k), round(pic.height * k)), Image.LANCZOS)
    a = np.asarray(pic)
    alpha = a[..., 3] > 128
    border = ndimage.binary_dilation(alpha, iterations=max(3, round(target_h / 60)))
    rim = ndimage.binary_dilation(border, iterations=1)
    out = np.zeros_like(a)
    out[rim] = (42, 24, 48, 255)
    out[border] = (251, 246, 234, 255)
    out[alpha] = a[alpha]
    out[..., 3] = np.where(rim, 255, 0)
    return Image.fromarray(out, "RGBA")


def main():
    img = build()
    fig = figure(250 * S)
    img.paste(fig, (px(150) - fig.width // 2 - px(6), px(36)), fig)
    d = ImageDraw.Draw(img, "RGBA")
    # the booth in front of her: table, laptop, two turntables, all flat paper
    shadow_rect(d, (-6, 214, 306, 310), (58, 42, 82, 255), r=4)
    shadow_rect(d, (14, 204, 148, 232), (176, 180, 194, 255), r=5)    # left deck
    shadow_rect(d, (166, 204, 288, 232), (176, 180, 194, 255), r=5)   # right deck
    for cx in (80, 226):
        d.ellipse([px(cx - 33), px(205), px(cx + 33), px(231)], fill=(40, 34, 56, 255), outline=(251, 246, 234, 255), width=px(1))
        d.ellipse([px(cx - 8), px(213), px(cx + 8), px(223)], fill=(255, 190, 90, 255))
    shadow_rect(d, (118, 188, 200, 212), (142, 150, 170, 255), r=3)    # a plain closed laptop, no logo
    for i, c in enumerate([(235, 90, 110), (255, 205, 80), (90, 190, 130), (120, 160, 235)]):
        x = 128 + i * 18
        d.ellipse([px(x), px(196), px(x + 8), px(204)], fill=c + (255,))
    img = img.resize((W, H), Image.LANCZOS)
    # grain, a soft focus and the snapshot vignette
    a = np.asarray(img).astype(float)
    rng = np.random.default_rng(3)
    a += rng.normal(0, 3.0, a.shape[:2])[..., None]
    yy, xx = np.mgrid[0:H, 0:W]
    dd = np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2))
    a *= (1 - 0.22 * np.clip(dd - 0.6, 0, 1) ** 1.4)[..., None]
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.5))
    img = img.quantize(192, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    img.save(GAME / "assets/backgrounds/hq/alewife-polaroid.png", optimize=True)
    print("ok")


if __name__ == "__main__":
    main()
