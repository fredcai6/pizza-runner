"""Makes the Qwen inputs for the paper art from the current layers: python backgrounds/paper_prep.py CITY/AREA OUTDIR
Writes each layer <area>-<layer>-flat-ov.png: median-filtered, 20 colours, 256 columns of wrap overhang. Opaque layers stay as they are; cut-out layers (mid, near) go onto flat magenta, the key every build removes again."""
import sys
from pathlib import Path

from PIL import Image, ImageFilter

ART = Path(__file__).resolve().parents[1]
KEY = (255, 0, 255)
OV = 256
city, area = sys.argv[1].split("/")
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
src = ART.parent / "assets/backgrounds" / city / area
for name in ("far", "mid", "near"):
    im = Image.open(src / f"{name}.png").convert("RGBA")
    base = Image.new("RGBA", im.size, KEY + (255,))
    base.alpha_composite(im)
    base = base.convert("RGB")
    # flat: line art and fine detail gone, so the model rebuilds shapes as card instead of copying pen lines
    flat = base.filter(ImageFilter.MedianFilter(5)).quantize(colors=20, method=Image.Quantize.MEDIANCUT).convert("RGB")
    # overhang: the first OV columns repeated on the right, so the edit can be cut where its seam closes (forge.layers.tile_seam)
    wide = Image.new("RGB", (flat.width + OV, flat.height))
    wide.paste(flat, (0, 0)); wide.paste(flat.crop((0, 0, OV, flat.height)), (flat.width, 0))
    wide.save(out / f"{area}-{name}-flat-ov.png")
    # half scale: at 1408x360 the model draws bold, simple shapes instead of re-inking every window; the build upscales 2x
    wide.resize((wide.width // 2, wide.height // 2), Image.LANCZOS).save(out / f"{area}-{name}-flat-ov-half.png")
print("ok", out)
