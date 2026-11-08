"""Contact sheet of imported animations at 2x, every frame, one row per animation.

    python3 art/paper/contact.py OUT.png [CHARACTER/ANIM ...]     (default: the New York cast)
"""
import json, sys
from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parents[2] / "assets/sprites"
CAST = ["slice-ny/idle", "slice-ny/run", "slice-ny/jump", "slice-ny/fall", "slice-ny/cold",
        "old-timer/idle", "old-timer/talk", "old-timer/squint", "recruit-ny/idle",
        "teen/idle", "teen/walk", "teen/film", "teen/flee",
        "turtle/idle", "turtle/walk", "turtle/munch", "turtle/stun",
        "customer-newyork-wallstreet/idle", "customer-newyork-centralpark/idle", "customer-newyork-brooklyn/idle"]
Z, COLS, BG = 2, 8, (150, 164, 190, 255)


def main(out, names):
    rows = []
    for n in names:
        d = ASSETS / n
        a = json.loads((d / "atlas.json").read_text())
        w, h = a["frame"]["w"], a["frame"]["h"]
        sheet = Image.open(d / "sheet.png").convert("RGBA")
        frames = [sheet.crop((i * w, 0, (i + 1) * w, h)) for i in range(sheet.width // w)]
        rows.append((n, w, h, frames))
    cw = max(w for _, w, _, _ in rows) * Z + 6
    pic = []
    for n, w, h, frames in rows:
        k = (len(frames) + COLS - 1) // COLS
        im = Image.new("RGBA", (COLS * cw, k * (h * Z + 6) + 14), BG)
        ImageDraw.Draw(im).text((4, 1), f"{n}  {len(frames)} frames {w}x{h}", fill=(20, 10, 30, 255))
        for i, f in enumerate(frames):
            tile = f.resize((w * Z, h * Z), Image.NEAREST)
            im.alpha_composite(tile, ((i % COLS) * cw + 3, 14 + (i // COLS) * (h * Z + 6)))
        pic.append(im)
    H = sum(p.height for p in pic)
    sheet = Image.new("RGBA", (COLS * cw, H), BG)
    y = 0
    for p in pic:
        sheet.alpha_composite(p, (0, y))
        y += p.height
    sheet.convert("RGB").save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:] or CAST)
