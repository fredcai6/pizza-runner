"""Qwen inputs for the paper props: python backgrounds/paper_prep_props.py CITY OUTDIR
One 1280x720 sheet of the city's barrel, barrel-out and barricade (upscaled 4x onto magenta), and one 896x1152 card per
area door, each old door upscaled onto magenta."""
import sys
from pathlib import Path

from PIL import Image

ART = Path(__file__).resolve().parents[1]
KEY = (255, 0, 255, 255)
city, out = sys.argv[1], Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
src = ART.parent / "assets/backgrounds" / city

sheet = Image.new("RGBA", (1280, 720), KEY)
x = 60
for name in ("barrel", "barrel-out", "barricade"):
    im = Image.open(src / f"{name}.png").convert("RGBA")
    im = im.resize((im.width * 5, im.height * 5), Image.LANCZOS)
    sheet.alpha_composite(im, (x, 640 - im.height))
    x += im.width + 70
sheet.convert("RGB").save(out / f"{city}-props.png")

for area in sorted(p.name for p in src.iterdir() if p.is_dir()):
    d = Image.open(src / area / "door.png").convert("RGBA")
    s = 800 / d.height
    d = d.resize((round(d.width * s), 800), Image.LANCZOS)
    card = Image.new("RGBA", (896, 1152), KEY)
    card.alpha_composite(d, ((896 - d.width) // 2, 1020 - 800))
    card.convert("RGB").save(out / f"{area}-door.png")
print("ok", out)
