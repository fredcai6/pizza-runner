"""The paper `near` layer, drawn in code: a few coloured cut-out bushes, planters, grass tufts and flowers along the bottom edge.
Qwen redrew the old dark clutter as big white-bordered stickers at the wrong scale, so the foreground is composed instead:
flat shapes, one soft shade each, no border, never black. Positions come from a seeded rng, so a rebuild is identical.
    near_layer(spec, seed) -> RGBA 2560x720 (wraps: nothing crosses the seam)."""
import numpy as np
from PIL import Image, ImageDraw

W, H = 2560, 720
SS = 4   # supersample, then hard-threshold the alpha at 1:1

PAL = {
    "green": ((156, 204, 142), (118, 172, 124)),
    "mint": ((164, 214, 176), (124, 182, 146)),
    "sage": ((182, 206, 150), (146, 176, 120)),
    "rose": ((236, 156, 166), (206, 118, 138)),
    "lilac": ((196, 176, 224), (162, 142, 200)),
    "cream": ((246, 232, 204), (216, 198, 166)),
    "terracotta": ((226, 154, 124), (194, 120, 100)),
    "butter": ((248, 220, 130), (222, 190, 100)),
    "peach": ((250, 190, 150), (222, 156, 122)),
    "sand": ((240, 224, 186), (212, 190, 150)),
    "coral": ((240, 150, 130), (208, 116, 104)),
    "pink": ((244, 176, 200), (212, 140, 170)),
    "teal": ((150, 208, 200), (112, 176, 172)),
    "slate": ((176, 190, 214), (142, 156, 186)),
}


def _canvas(w, h):
    return Image.new("L", (w * SS, h * SS), 0)


def _layer(mask, base, shade, dx, dy):
    """Flat base colour with one soft shade crescent: the mask in shade, the mask shifted up-left in base."""
    m = np.asarray(mask) > 127
    up = np.zeros_like(m)
    up[:m.shape[0] - dy * SS, :m.shape[1] - dx * SS] = m[dy * SS:, dx * SS:]
    up &= m
    up[m.shape[0] - SS:] = m[m.shape[0] - SS:]   # the base row stays lit
    rgba = np.zeros(m.shape + (4,), np.uint8)
    rgba[m] = (*shade, 255)
    rgba[up] = (*base, 255)
    return Image.fromarray(rgba, "RGBA").resize((m.shape[1] // SS, m.shape[0] // SS), Image.BOX)


def bush(w, h, color, rng):
    base, shade = PAL[color]
    m = _canvas(w, h)
    d = ImageDraw.Draw(m)
    n = max(4, w // 14)
    for i in range(n):
        t = i / (n - 1)
        r = h * (0.32 + 0.2 * np.sin(np.pi * t)) * rng.uniform(0.85, 1.1)
        cx = r * 0.9 + t * (w - r * 1.8)
        r = min(r, h * 0.5)
        cy = max(r, h - r * rng.uniform(0.5, 0.75))
        d.ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], fill=255)
    return _layer(m, base, shade, max(4, h // 7), max(5, h // 6))


def tuft(w, h, color, rng):
    base, shade = PAL[color]
    m = _canvas(w, h)
    d = ImageDraw.Draw(m)
    n = 5
    for i in range(n):
        x0 = (i + 0.5) / n * w
        tip = x0 + rng.uniform(-0.18, 0.18) * w
        top = h * rng.uniform(0.1, 0.5) if i % 2 == 0 else h * rng.uniform(0.35, 0.7)
        d.polygon([((x0 - w * 0.08) * SS, h * SS), (tip * SS, top * SS), ((x0 + w * 0.08) * SS, h * SS)], fill=255)
    return _layer(m, base, shade, 2, 0)


def planter(w, h, box, plant, rng):
    """A trapezoid card box with a bush sitting in it."""
    bh = int(h * 0.42)
    bw_top, bw_bot = w, int(w * 0.82)
    m = _canvas(w, bh)
    d = ImageDraw.Draw(m)
    d.polygon([(0, 0), (bw_top * SS, 0), (((w + bw_bot) / 2) * SS, bh * SS), (((w - bw_bot) / 2) * SS, bh * SS)], fill=255)
    box_im = _layer(m, *PAL[box], 3, 2)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.alpha_composite(bush(int(w * 0.92), h - bh + 6, plant, rng), (int(w * 0.04), 0))
    out.alpha_composite(box_im, (0, h - bh))
    return out


def flower(h, color, rng):
    base, shade = PAL[color]
    w = 22
    m = _canvas(w, h)
    d = ImageDraw.Draw(m)
    d.rectangle([(w / 2 - 1.5) * SS, 12 * SS, (w / 2 + 1.5) * SS, h * SS], fill=255)
    stem = _layer(m, *PAL["green"], 1, 0)
    head = _canvas(w, h)
    dh = ImageDraw.Draw(head)
    for k in range(5):
        a = k * 2 * np.pi / 5
        cx, cy = w / 2 + 5.5 * np.cos(a), 8 + 5.5 * np.sin(a)
        dh.ellipse([(cx - 4.2) * SS, (cy - 4.2) * SS, (cx + 4.2) * SS, (cy + 4.2) * SS], fill=255)
    out = stem
    out.alpha_composite(_layer(head, base, shade, 1, 1))
    ctr = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(ctr).ellipse([w / 2 - 3, 5, w / 2 + 3, 11], fill=(*PAL["butter"][0], 255))
    out.alpha_composite(ctr)
    return out


def near_layer(spec, seed):
    """spec: list of (kind, count, args) e.g. ("bush", 5, dict(colors=[...], w=(80, 150), h=(34, 60)))."""
    rng = np.random.default_rng(seed)
    items = []
    for kind, count, a in spec:
        for _ in range(count):
            c = a["colors"][rng.integers(len(a["colors"]))]
            if kind == "bush":
                w, h = int(rng.integers(*a["w"])), int(rng.integers(*a["h"]))
                items.append((bush(w, h, c, rng), w))
            elif kind == "tuft":
                w, h = int(rng.integers(*a["w"])), int(rng.integers(*a["h"]))
                items.append((tuft(w, h, c, rng), w))
            elif kind == "planter":
                w, h = int(rng.integers(*a["w"])), int(rng.integers(*a["h"]))
                items.append((planter(w, h, a["box"], c, rng), w))
            elif kind == "flower":
                h = int(rng.integers(*a["h"]))
                items.append((flower(h, c, rng), 22))
    order = rng.permutation(len(items))
    total = sum(items[i][1] for i in order)
    margin = 120
    gap = (W - 2 * margin - total) / max(1, len(items) - 1)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    x = margin
    for i in order:
        im, w = items[i]
        jitter = rng.uniform(-0.25, 0.25) * gap
        layer.alpha_composite(im, (int(x + jitter), int(712 - im.height + rng.integers(-4, 5))))
        x += w + gap
    arr = np.asarray(layer).copy()
    arr[..., 3] = np.where(arr[..., 3] > 127, 255, 0)
    arr[..., :3] = np.where(arr[..., 3:] > 0, arr[..., :3], 0)
    return arr


NEAR = {
    "wallstreet": [("planter", 3, dict(colors=["green", "mint"], box="cream", w=(70, 100), h=(72, 96))),
                   ("bush", 4, dict(colors=["mint", "lilac", "green"], w=(110, 200), h=(54, 84))),
                   ("tuft", 6, dict(colors=["sage", "green"], w=(40, 70), h=(26, 44)))],
    "centralpark": [("bush", 6, dict(colors=["green", "sage", "rose", "mint"], w=(120, 220), h=(54, 90))),
                    ("tuft", 8, dict(colors=["sage", "green", "mint"], w=(40, 72), h=(26, 46))),
                    ("flower", 7, dict(colors=["rose", "butter", "lilac", "peach"], h=(34, 58)))],
    "brooklyn": [("planter", 3, dict(colors=["green", "rose"], box="terracotta", w=(70, 100), h=(72, 96))),
                 ("bush", 4, dict(colors=["sage", "green", "peach"], w=(110, 200), h=(54, 84))),
                 ("tuft", 5, dict(colors=["sage", "green"], w=(40, 70), h=(26, 44))),
                 ("flower", 4, dict(colors=["butter", "rose"], h=(34, 56)))],
    # the rest of the cities (paper_build.py)
    "loop": [("planter", 3, dict(colors=["green", "mint"], box="slate", w=(70, 100), h=(72, 96))),
             ("bush", 3, dict(colors=["mint", "lilac", "green"], w=(110, 190), h=(54, 84))),
             ("tuft", 5, dict(colors=["sage", "green"], w=(40, 70), h=(26, 44)))],
    "lincolnpark": [("bush", 6, dict(colors=["green", "sage", "rose", "mint"], w=(120, 220), h=(54, 90))),
                    ("tuft", 7, dict(colors=["sage", "green", "mint"], w=(40, 72), h=(26, 46))),
                    ("flower", 7, dict(colors=["rose", "butter", "lilac", "peach"], h=(34, 58)))],
    "wickerpark": [("planter", 3, dict(colors=["green", "rose"], box="terracotta", w=(70, 100), h=(72, 96))),
                   ("bush", 4, dict(colors=["sage", "green", "lilac"], w=(110, 200), h=(54, 84))),
                   ("tuft", 5, dict(colors=["sage", "green"], w=(40, 70), h=(26, 44))),
                   ("flower", 4, dict(colors=["butter", "rose"], h=(34, 56)))],
    "georgetown": [("planter", 3, dict(colors=["green", "rose"], box="terracotta", w=(70, 100), h=(72, 96))),
                   ("bush", 3, dict(colors=["sage", "green"], w=(110, 190), h=(54, 84))),
                   ("tuft", 4, dict(colors=["sage", "green"], w=(40, 70), h=(26, 44))),
                   ("flower", 4, dict(colors=["butter", "rose", "lilac"], h=(34, 56)))],
    "mall": [("bush", 3, dict(colors=["green", "sage", "mint"], w=(120, 210), h=(54, 84))),
             ("tuft", 8, dict(colors=["sage", "green", "mint"], w=(40, 72), h=(26, 46))),
             ("flower", 4, dict(colors=["butter", "lilac", "peach"], h=(34, 56)))],
    "federal": [("planter", 4, dict(colors=["green", "sage"], box="cream", w=(70, 100), h=(72, 96))),
                ("bush", 3, dict(colors=["sage", "mint"], w=(110, 190), h=(54, 80))),
                ("tuft", 4, dict(colors=["sage", "green"], w=(40, 70), h=(26, 44)))],
    "harbor": [("tuft", 6, dict(colors=["sage", "sand"], w=(40, 72), h=(26, 46))),
               ("bush", 2, dict(colors=["sage", "mint"], w=(110, 180), h=(54, 80))),
               ("flower", 4, dict(colors=["coral", "butter"], h=(34, 56)))],
    "center": [("planter", 3, dict(colors=["green", "rose"], box="terracotta", w=(70, 100), h=(72, 96))),
               ("tuft", 5, dict(colors=["sage", "green"], w=(40, 70), h=(26, 44))),
               ("flower", 4, dict(colors=["coral", "butter", "pink"], h=(34, 56)))],
    "hillside": [("bush", 4, dict(colors=["sage", "green", "mint"], w=(110, 200), h=(54, 84))),
                 ("tuft", 5, dict(colors=["sage", "green"], w=(40, 70), h=(26, 44))),
                 ("flower", 5, dict(colors=["pink", "butter", "coral", "lilac"], h=(34, 58)))],
    "downtown": [("planter", 3, dict(colors=["green", "coral"], box="sand", w=(70, 100), h=(72, 96))),
                 ("bush", 2, dict(colors=["green", "mint"], w=(110, 180), h=(54, 80))),
                 ("tuft", 5, dict(colors=["sage", "green"], w=(40, 70), h=(26, 44)))],
    "beach": [("tuft", 8, dict(colors=["sage", "sand", "green"], w=(40, 72), h=(26, 46))),
              ("bush", 3, dict(colors=["sage", "green"], w=(110, 190), h=(54, 80))),
              ("flower", 5, dict(colors=["coral", "butter", "pink"], h=(34, 56)))],
    "bungalows": [("bush", 5, dict(colors=["green", "sage", "lilac"], w=(120, 210), h=(54, 88))),
                  ("tuft", 5, dict(colors=["sage", "green"], w=(40, 70), h=(26, 44))),
                  ("flower", 6, dict(colors=["pink", "butter", "lilac"], h=(34, 58)))],
}


def elevated_line():
    """The Loop's elevated railway as cut paper, RGBA 2560x720, to sit BEHIND the mid buildings: a lattice girder deck with
    triangular cut-outs, a flat pillar every 640 px, and a two-car train. Every period divides 2560, so it wraps."""
    deck_top, deck_bot = 62, 114
    card, shade, pale = (200, 188, 228), (170, 156, 206), (244, 238, 250)
    mask = _canvas(W, H)
    d = ImageDraw.Draw(mask)
    d.rectangle([0, deck_top * SS, W * SS, deck_bot * SS], fill=255)
    for k in range(0, W, 640):
        x = k + 330
        d.polygon([((x - 22) * SS, deck_bot * SS), ((x + 22) * SS, deck_bot * SS), ((x + 30) * SS, 600 * SS), ((x - 30) * SS, 600 * SS)], fill=255)
    cut = _canvas(W, H)
    dc = ImageDraw.Draw(cut)
    for x in range(0, W, 40):   # triangular lattice cut-outs along the girder, alternating up and down
        dc.polygon([((x + 3) * SS, (deck_top + 14) * SS), ((x + 37) * SS, (deck_top + 14) * SS), ((x + 20) * SS, (deck_bot - 6) * SS)], fill=255)
    for k in range(0, W, 640):   # a window cut through each pillar between its cross-ties
        x = k + 330
        for y0 in (190, 300, 410, 520):
            dc.rectangle([(x - 10) * SS, y0 * SS, (x + 10) * SS, (y0 + 70) * SS], fill=255)
    art = np.asarray(_layer(mask, card, shade, 3, 3)).copy()
    art[np.asarray(cut.resize((W, H), Image.BOX)) > 127, 3] = 0
    art[deck_top:deck_top + 6, :, :3] = pale   # a pale cap rail along the top of the girder
    train = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(train)
    for x0 in (1010, 1390):   # cream cards with a row of blue-grey windows and a lilac stripe
        td.rounded_rectangle([x0, 24, x0 + 360, deck_top], radius=10, fill=(246, 238, 226, 255))
        td.rectangle([x0, deck_top - 12, x0 + 360, deck_top - 6], fill=(*shade, 255))
        for wx in range(x0 + 20, x0 + 340, 52):
            td.rounded_rectangle([wx, 34, wx + 34, 52], radius=3, fill=(176, 192, 216, 255))
    out = np.asarray(Image.alpha_composite(Image.fromarray(art, "RGBA"), train)).copy()
    out[..., 3] = np.where(out[..., 3] > 127, 255, 0)
    out[..., :3] = np.where(out[..., 3:] > 0, out[..., :3], 0)
    return out
