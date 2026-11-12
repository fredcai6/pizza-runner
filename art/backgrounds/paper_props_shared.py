"""The shared props as paper, drawn in code: python backgrounds/paper_props_shared.py ASSETS_BACKGROUNDS/props   (from art/)
box, box-pile, box-broken, drain, sign, ledge, star and the seven topping pickups (pickup-*.png, which are also the topping-screen icons).
Flat card shapes, one soft shade each, faint grain after palette reduction. Touchable things (box, box-pile, ledge, star) get the white
cut border, rim and solid shadow; scenery on the street (drain, sign, broken box) gets none. Everything is seeded, so a rebuild is
byte-identical. Pickups are drawn at 1:1 and are never resized by the game."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from paper import STREET, add_grain, sticker
from paper_near import SS, _canvas, _layer
import paper_ny_build as nb
from forge.layers import quantize, write_sources

C = dict(
    crate=((236, 190, 124), (206, 158, 98)), lid=((246, 214, 156), (222, 184, 124)), strap=((196, 146, 92), (170, 122, 76)),
    plank=((230, 184, 120), (200, 152, 94)), cream=((255, 243, 212), (238, 214, 170)),
    pepperoni=((228, 86, 72), (190, 58, 62)), pdot=((174, 50, 58), (174, 50, 58)),
    capc=((226, 176, 136), (194, 142, 106)), stem=((252, 236, 210), (224, 202, 172)),
    leaf=((112, 192, 100), (78, 158, 86)), vein=((176, 226, 144), (176, 226, 144)),
    garlic=((253, 248, 238), (224, 214, 224)), clove=((190, 176, 204), (190, 176, 204)),
    pepper=((96, 184, 86), (66, 150, 72)), calyx=((70, 140, 70), (54, 118, 60)),
    pine=((252, 208, 84), (230, 174, 62)), hatch=((220, 158, 52), (220, 158, 52)), crown=((106, 186, 94), (78, 156, 84)),
    saus=((178, 100, 68), (142, 72, 54)), sface=((214, 140, 104), (190, 112, 84)), sspeck=((120, 60, 46), (120, 60, 46)),
    board=((255, 238, 204), (234, 206, 164)), post=((178, 160, 214), (146, 128, 188)), base=((196, 180, 226), (160, 144, 200)),
    drain=((124, 108, 156), (98, 84, 130)), slot=((66, 52, 92), (66, 52, 92)),
    star=((196, 176, 232), (160, 140, 204)),
)


def fin(rgba, seed, colors=30, amp=1.8):
    arr = quantize(np.asarray(rgba).copy(), n=colors)
    arr = add_grain(arr, seed, amp)
    arr[..., 3] = np.where(arr[..., 3] > 127, 255, 0)
    arr[..., :3] = np.where(arr[..., 3:] > 0, arr[..., :3], 0)
    return arr


class Art:
    """A w x h canvas drawn in 1x units at SS x supersampling; each shape is one flat colour with one soft shade."""

    def __init__(self, w, h, k=1.0):
        self.w, self.h, self.k = w, h, k   # k scales every coordinate about the canvas centre
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    def p(self, x, y):
        return ((self.w / 2 + (x - self.w / 2) * self.k) * SS, (self.h / 2 + (y - self.h / 2) * self.k) * SS)

    def shape(self, draw, col, dx=2, dy=2, shade=True):
        m = _canvas(self.w, self.h)
        draw(ImageDraw.Draw(m))
        base, sh = C[col]
        part = _layer(m, base, sh if shade else base, dx, dy)
        self.im.alpha_composite(part)

    def poly(self, pts, col, **k):
        self.shape(lambda d: d.polygon([self.p(x, y) for x, y in pts], fill=255), col, **k)

    def ell(self, cx, cy, rx, ry, col, **k):
        self.shape(lambda d: d.ellipse([*self.p(cx - rx, cy - ry), *self.p(cx + rx, cy + ry)], fill=255), col, **k)

    def rect(self, x0, y0, x1, y1, col, r=0, **k):
        self.shape(lambda d: d.rounded_rectangle([*self.p(x0, y0), *self.p(x1, y1)], radius=r * SS * self.k, fill=255), col, **k)

    def line(self, pts, col, width, **k):
        self.shape(lambda d: d.line([self.p(x, y) for x, y in pts], fill=255, width=int(width * SS * self.k), joint="curve"), col, shade=False, **k)

    def rgba(self):
        return np.asarray(self.im).copy()


def rot(pts, cx, cy, deg):
    a = np.radians(deg)
    c, s = np.cos(a), np.sin(a)
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for x, y in pts]


# ---------------------------------------------------------------- crates
def crate(a, x0, y0, x1, y1):
    """A card crate: slatted front, a lighter lid band that overhangs a little, a darker diagonal brace."""
    a.rect(x0, y0, x1, y1, "crate", r=2)
    n = max(3, int((x1 - x0) / 14))
    for i in range(1, n):
        x = x0 + (x1 - x0) * i / n
        a.line([(x, y0 + 6), (x, y1 - 1)], "plank", 1.2)
    lid = max(6, (y1 - y0) * 0.16)
    a.rect(x0 - 2, y0, x1 + 2, y0 + lid, "lid", r=2)
    a.line([(x0 + 4, y1 - 4), (x1 - 4, y0 + lid + 4)], "strap", 3)


def draw_box():
    a = Art(72, 77)
    crate(a, 0, 0, 72, 77)
    return nb.fit_prop(a.rgba(), 84, 84, 0)


def draw_pile():
    a = Art(164, 114)
    crate(a, 0, 62, 66, 114)
    crate(a, 70, 62, 132, 114)
    crate(a, 100, 62, 164, 114)
    crate(a, 22, 12, 88, 64)
    return nb.fit_prop(a.rgba(), 180, 120, 0)


def draw_broken():
    """A low heap of loose planks, no border: it is debris on the street, not something to touch."""
    rng = np.random.default_rng(3)
    a = Art(90, 24)
    for i in range(9):
        cx, cy = 14 + i * 8.5 + rng.uniform(-3, 3), 17 - 4 * np.sin(i / 8 * np.pi) + rng.uniform(-2, 2)
        pts = rot([(cx - 17, cy - 2.2), (cx + 17, cy - 2.2), (cx + 17, cy + 2.2), (cx - 17, cy + 2.2)], cx, cy, rng.uniform(-22, 22))
        a.poly(pts, "plank" if i % 2 else "crate")
    out = np.zeros((24, 90, 4), np.uint8)
    out[:] = fin(a.rgba(), 5)
    return out


# ---------------------------------------------------------------- street furniture
def draw_drain():
    """A flat violet grate on the street, seen a little from above, in the same 120x26 canvas the old one used."""
    a = Art(120, 26)
    a.poly([(30, 5), (90, 5), (104, 21), (16, 21)], "drain", dx=1, dy=1)
    for i in range(7):
        t = i / 6
        a.poly([(35 + t * 50, 8), (38 + t * 50, 8), (33 + t * 56, 18), (30 + t * 58, 18)], "slot", shade=False)
    return fin(a.rgba(), 7, 24)


def draw_sign():
    """A blank paper signboard on a lilac post, in the old 110x200 canvas (the game lays its street-name cards beside it)."""
    a = Art(110, 200)
    a.rect(0, 27, 110, 88, "board", r=3)
    a.rect(0, 27, 110, 33, "cream", r=3, shade=False)
    a.rect(47, 88, 63, 190, "post")
    a.rect(36, 188, 74, 200, "base", r=2)
    return fin(a.rgba(), 9, 24)


def draw_ledge():
    return nb.platform_tile((206, 200, 196), (178, 172, 170), (228, 224, 220))


def draw_star():
    """A four-point paper throwing star with a round hub, sticker-bordered: it hurts, so it reads as touchable."""
    a = Art(18, 18)
    pts = []
    for i in range(8):
        r = 9 if i % 2 == 0 else 3.4
        ang = np.radians(i * 45 - 90)
        pts.append((9 + r * np.cos(ang), 9 + r * np.sin(ang)))
    a.poly(pts, "star")
    a.ell(9, 9, 2, 2, "cream", shade=False)
    art = fin(a.rgba(), 11, 16, 1.2)
    st = sticker(art, shadow=(2, 2), **STREET)
    out = np.zeros((32, 32, 4), np.uint8)
    y0, x0 = (32 - st.shape[0]) // 2, (32 - st.shape[1]) // 2
    out[y0:y0 + st.shape[0], x0:x0 + st.shape[1]] = st
    return out


# ---------------------------------------------------------------- toppings
DISC = {"basil": (250, 204, 192), "garlic": (208, 192, 238), "jalapeno": (252, 232, 156), "mushroom": (180, 216, 242),
        "pepperoni": (180, 228, 200), "pineapple": (242, 190, 214), "sausage": (252, 224, 168)}


def topping(name, a):
    if name == "pepperoni":
        a.ell(20, 20, 13, 13, "pepperoni")
        for x, y in ((14, 14), (24, 13), (27, 22), (19, 26), (12, 23), (21, 19)):
            a.ell(x, y, 2.3, 2.3, "pdot", shade=False)
    elif name == "mushroom":
        a.rect(15.5, 19, 24.5, 32, "stem", r=3)
        a.shape(lambda d: d.pieslice([*a.p(6, 5), *a.p(34, 33)], 180, 360, fill=255), "capc")
        a.rect(6, 19, 34, 22, "capc", r=1)
        for x, y in ((14, 14), (22, 11), (26, 16)):
            a.ell(x, y, 2, 2, "stem", shade=False)
    elif name == "basil":
        lens = [(8 + 24 * t, 32 - 24 * t - 9 * np.sin(np.pi * t)) for t in np.linspace(0, 1, 14)]
        lens += [(8 + 24 * t, 32 - 24 * t + 9 * np.sin(np.pi * t)) for t in np.linspace(1, 0, 14)]
        a.poly(lens, "leaf")
        a.line([(9, 31), (28, 12)], "vein", 1.6)
        a.line([(14, 26), (10, 22)], "vein", 1.2)
        a.line([(19, 21), (17, 15)], "vein", 1.2)
        a.line([(21, 19), (27, 21)], "vein", 1.2)
    elif name == "garlic":
        a.poly([(15, 15), (20, 5), (25, 15)], "garlic")
        a.ell(20, 23, 12, 10, "garlic")
        a.line([(20, 13), (20, 32)], "clove", 1.5)
        a.line([(14, 16), (11, 26), (15, 31)], "clove", 1.5)
        a.line([(26, 16), (29, 26), (25, 31)], "clove", 1.5)
        a.rect(18, 31, 22, 34, "strap", shade=False)
    elif name == "jalapeno":
        ts = np.linspace(0, 1, 24)
        pts = [(27 - 15 * t, 13 + 17 * t) for t in ts]
        rad = [6.6 - 4.4 * t for t in ts]
        a.shape(lambda d: [d.ellipse([*a.p(x - r, y - r), *a.p(x + r, y + r)], fill=255) for (x, y), r in zip(pts, rad)], "pepper")
        a.ell(28, 12, 5.2, 4.2, "calyx", shade=False)
        a.poly([(27, 9), (31, 3), (33, 4), (30, 11)], "calyx", shade=False)
    elif name == "pineapple":
        a.ell(20, 24, 10, 11.5, "pine")
        hatch = Art(a.w, a.h, a.k)
        for k in range(-3, 4):
            hatch.line([(20 + k * 5 - 9, 15), (20 + k * 5 + 9, 33)], "hatch", 1.0)
            hatch.line([(20 + k * 5 + 9, 15), (20 + k * 5 - 9, 33)], "hatch", 1.0)
        body = np.asarray(a.im)[..., 3] > 0
        h = np.asarray(hatch.im).copy()
        h[..., 3] = np.where(body, h[..., 3], 0)
        a.im.alpha_composite(Image.fromarray(h, "RGBA"))
        a.poly([(12, 15), (14, 6), (17, 12), (20, 3), (23, 12), (26, 6), (28, 15)], "crown")
    elif name == "sausage":
        a.ell(20, 20, 13, 13, "saus")
        a.ell(19, 19, 9.6, 9.6, "sface")
        for x, y in ((15, 16), (23, 15), (20, 21), (14, 24), (25, 24)):
            a.ell(x, y, 1.7, 1.7, "sspeck", shade=False)


def draw_pickup(name, seed):
    """A pastel sticker disc with the topping in flat card on it, drawn a little large: 52x52, border all the way round,
    readable at 26 px. 56x56 with the street border."""
    a = Art(40, 40)
    r, g, b = DISC[name]
    C["disc"] = ((r, g, b), (r - 22, g - 24, b - 22))
    a.ell(20, 20, 20, 20, "disc", dx=2, dy=3)
    t = Art(40, 40, 1.22)
    topping(name, t)
    a.im.alpha_composite(t.im)
    art = fin(a.rgba(), seed, 28, 1.4)
    st = sticker(art, shadow=(3, 3), **STREET)
    out = np.zeros((56, 56, 4), np.uint8)
    y0, x0 = (56 - st.shape[0]) // 2, (56 - st.shape[1]) // 2
    out[y0:y0 + st.shape[0], x0:x0 + st.shape[1]] = st
    return out


def main():
    dest = Path(sys.argv[1])
    dest.mkdir(parents=True, exist_ok=True)
    made = {"box": draw_box(), "box-pile": draw_pile(), "box-broken": draw_broken(), "drain": draw_drain(), "sign": draw_sign(),
            "ledge": draw_ledge(), "star": draw_star()}
    for i, t in enumerate(("basil", "garlic", "jalapeno", "mushroom", "pepperoni", "pineapple", "sausage")):
        made[f"pickup-{t}"] = draw_pickup(t, 100 + i)
    for name, arr in made.items():
        Image.fromarray(arr, "RGBA").save(dest / f"{name}.png", optimize=True)
        print(name, arr.shape[1], arr.shape[0])
    write_sources(dest / "sources.json", {
        "paper": {"procedural": "art/backgrounds/paper_props_shared.py", "files": sorted(made),
                  "note": "drawn in code, seeded; box, box-pile, ledge, star and the pickups carry the sticker border, drain/sign/box-broken do not"},
        "unchanged": {"files": ["shot-*.png", "piece-*.png"], "note": "topping shots and pieces are still the earlier art; see pieces-sources.json"}})


if __name__ == "__main__":
    main()
