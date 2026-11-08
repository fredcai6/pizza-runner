"""Inputs and Qwen spec for the HQ paper back room.   python backgrounds/hq/make_paper_spec.py   (from art/)
Writes /mnt/data/sprite-forge/paper-ny/in/hq-*.png and runs/paper_hq.toml. mid, front and table go onto magenta;
the back keeps the old corkboard where it is (the build repaints the board exactly at HQ_BOARD afterwards)."""
from pathlib import Path

from PIL import Image, ImageFilter

HERE = Path(__file__).parent
ART = HERE.parents[1]
IN = Path("/mnt/data/sprite-forge/paper-ny/in")
SRC = ART.parent / "assets/backgrounds/hq"
IN.mkdir(parents=True, exist_ok=True)
KEY = (255, 0, 255, 255)
for n in ("back", "mid", "front", "table"):
    im = Image.open(SRC / f"{n}.png").convert("RGBA")
    base = Image.new("RGBA", im.size, KEY)
    base.alpha_composite(im)
    base = base.convert("RGB")
    base.filter(ImageFilter.MedianFilter(5)).quantize(colors=24, method=Image.Quantize.MEDIANCUT).convert("RGB").save(IN / f"hq-{n}-flat.png")

NOTXT = " No text, letters, numbers, logos, labels or lettering anywhere."
PAPER = "in the material of image 2"
back = ("Image 1 is the back room of a pizzeria: a brick wall with a hanging bulb, a pipe, a shelf of flour sacks and tins on the left, a big corkboard on the right wall and a concrete floor. Rebuild it as a paper diorama back room " + PAPER +
        ": flat cut pieces of soft pastel card, a warm terracotta-pink brick wall as flat card with a few simple lighter brick lines, a pale grey-lilac floor card, a cream baseboard, one soft shade per colour, a faint paper grain, gently cut edges. Keep everything in the same places and the same size, above all the big corkboard on the right: a flat tan cork card in a cream card frame, empty. The bulb is a flat cream paper circle with a soft glow. No outlines heavier than a hairline, no white border." + NOTXT)
mid = ("Image 1 is a set of pizzeria props standing on the floor on flat magenta: a stack of pizza boxes, a bucket with a mop, a flour sack, a table with a box and a rolling pin, a mixer and a stool. Rebuild each as a flat paper cut-out " + PAPER +
       ": flat pieces of soft pastel card with one soft shade, a faint paper grain, gently cut edges, no outlines, no white border, no shadow. Same places, same size. The background stays flat magenta." + NOTXT)
front = ("Image 1 is dark foreground framing on flat magenta: a tall shelf at the left edge, a stack of boxes at the bottom right, a ceiling pipe along the top with brackets and a dangling cable with a bulb. Rebuild each as a flat paper cut-out " + PAPER +
         ": a mid-brown card shelf with flat card boxes on it, flat kraft-card boxes, a dusty-blue card pipe, soft muted colours, one soft shade each, a faint paper grain, no black, no white border, no shadow. Same places, same size. The background stays flat magenta." + NOTXT)
table = ("Image 1 is a long wooden prep table on flat magenta. Rebuild it as a flat paper cut-out " + PAPER +
         ": flat pieces of warm tan and brown card with one soft shade, a faint paper grain, gently cut edges, no outlines, no white border, no shadow. Same place, same size. The background stays flat magenta." + NOTXT)
out = 'run = "paper/hq-1"\nseeds = [1, 2, 3]\nrefs = ["paper/style_pm_sq.png"]\n'
for name, p in (("back", back), ("mid", mid), ("front", front), ("table", table)):
    out += f'\n[shots.{name}]\ninput = "{IN}/hq-{name}-flat.png"\nprompt = "{p}"\n'
(HERE / "runs/paper_hq.toml").write_text(out)
print("ok")
