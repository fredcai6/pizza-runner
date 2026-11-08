"""Seam wrap views for the paper layers: python backgrounds/seams.py ASSETS_BACKGROUNDS CITY OUT_DIR
One PNG per area: far, mid, near (each alone on grey) and ground, each shown as the last 480 columns joined to the first 480, with a thin red
tick where the layer closes. This is what the player sees when the layer wraps."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

root, city, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
HALF = 480
for area in sorted(p.name for p in (root / city).iterdir() if p.is_dir()):
    d = root / city / area
    rows = []
    for layer in ("far", "mid", "near"):
        base = Image.new("RGBA", (2560, 720), (226, 226, 230, 255))
        base.alpha_composite(Image.open(d / f"{layer}.png").convert("RGBA"))
        rows.append(base)
    g = Image.open(d / "ground.png").convert("RGBA")
    ground = Image.new("RGBA", (2560, 120))
    for x in range(0, 2560, g.width):
        ground.paste(g, (x, 0))
    rows.append(ground)
    sheet = Image.new("RGB", (2 * HALF, sum(r.height for r in rows) // 2 + 8 * len(rows)), (255, 0, 255))
    y = 0
    for r in rows:
        v = Image.new("RGBA", (2 * HALF, r.height))
        v.paste(r.crop((2560 - HALF, 0, 2560, r.height)), (0, 0))
        v.paste(r.crop((0, 0, HALF, r.height)), (HALF, 0))
        v = v.resize((v.width, v.height // 2), Image.LANCZOS) if r.height > 200 else v
        ImageDraw.Draw(v).line([(HALF, 0), (HALF, v.height)], fill=(255, 0, 0, 255))
        sheet.paste(v.convert("RGB"), (0, y))
        y += v.height + 8
    sheet.save(out / f"{city}-{area}-seams.png")
    print("ok", area)
