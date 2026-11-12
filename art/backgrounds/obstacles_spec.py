"""Writes the Qwen spec for the pizza-kitchen obstacles every city shares (the solid blocks you jump), and the flour-puff sheet.
    python backgrounds/obstacles_spec.py   (from art/)  ->  runs/paper_obstacles.toml and /mnt/data/sprite-forge/paper-obstacles/in/
Then, through the queue:
    ws submit --priority 10 --vram 30G --mem 34G --cores 2 --expect 10m --name pr-obstacles -- \\
      env PYTHONPATH=~/projects/sprite-forge ~/projects/sprite-forge/.venv/bin/python backgrounds/paper_edit.py runs/paper_obstacles.toml
Guides are plain shapes on magenta that set layout and size; the prompts set what you see."""
from pathlib import Path

from PIL import Image, ImageDraw

IN = Path("/mnt/data/sprite-forge/paper-obstacles/in")
MAG = (255, 0, 255)
NOTXT = " No text, letters, numbers, logos or lettering anywhere: every label is a picture only."
PAPER = "in the material of image 2"
LOOK = (", flat paper cut-out art " + PAPER + ", seen from the front at eye level, standing on the ground at the bottom of the image, in the same place"
        " and at the same size as the shape in image 1. Flat pieces of card with one soft shade each, a faint paper grain, gently cut edges,"
        " no pen outlines, no white border, no cast shadow. The top is flat and wide enough to stand on. The background stays perfectly flat magenta." + NOTXT)


def guide(draw):
    im = Image.new("RGB", (768, 768), MAG)
    draw(ImageDraw.Draw(im))
    return im


def sacks(d):
    for x, y in ((150, 470), (390, 470), (270, 230)):
        d.rounded_rectangle([x, y, x + 230, y + 260], 50, fill=(240, 236, 226))


def cans(d):
    for c in range(2):
        for r in range(3):
            x, y = 170 + c * 220, 520 - r * 220
            d.rectangle([x, y, x + 200, y + 210], fill=(210, 60, 50))


def parm(d):
    d.rectangle([110, 640, 660, 730], fill=(170, 130, 90))
    d.rounded_rectangle([140, 470, 630, 640], 40, fill=(240, 200, 110))
    d.rounded_rectangle([160, 310, 610, 470], 40, fill=(240, 200, 110))


def salami_pile(d):
    for r, (n, y) in enumerate(((4, 600), (3, 470), (2, 340))):
        for i in range(n):
            x = 140 + r * 60 + i * 130
            d.rounded_rectangle([x, y, x + 120, y + 130], 55, fill=(150, 60, 60))


def salami_rack(d):
    d.rectangle([110, 260, 660, 300], fill=(150, 110, 70))
    for x in (120, 620):
        d.rectangle([x, 260, x + 30, 730], fill=(150, 110, 70))
    for i in range(4):
        x = 190 + i * 110
        d.rounded_rectangle([x, 300, x + 80, 640 - (i % 2) * 60], 40, fill=(150, 60, 60))


def puffs(d):
    for r in range(2):
        for c in range(4):
            cx, cy, s = 128 + c * 256, 256 + r * 512, 50 + c * 22
            for dx, dy, k in ((0, 0, 1), (-0.7, 0.2, 0.7), (0.7, 0.25, 0.75), (0.1, -0.6, 0.65)):
                rr = s * k
                d.ellipse([cx + dx * s - rr, cy + dy * s - rr, cx + dx * s + rr, cy + dy * s + rr], fill=(246, 242, 232))


SHOTS = {
    "flour": (sacks, "Image 1 is three rough pale shapes on flat magenta. Rebuild them as three big fat cloth flour sacks for a pizzeria, two side by side with one on top, plump and a little slumped, tied at the top with string, off-white cloth with a pale blue stripe and a printed picture of a wheat ear, a dusting of white flour on them" + LOOK),
    "cans": (cans, "Image 1 is six rough red blocks on flat magenta. Rebuild them as a neat block of six giant tomato cans for a pizzeria, two across and three high: shiny silver tin rims and ridges, red and green labels with a printed picture of a ripe red plum tomato with green leaves, one can slightly dented" + LOOK),
    "parm": (parm, "Image 1 is two rough golden drums on a brown slab, on flat magenta. Rebuild them as two giant wheels of parmesan cheese lying flat, one stacked on the other, on a low wooden pallet: thick golden-tan rind with a dotted pattern pressed into it, a wedge cut out of the top wheel showing the pale crumbly inside" + LOOK),
    "salami_pile": (salami_pile, "Image 1 is rough dark red shapes on flat magenta. Rebuild them as a heap of big fat whole Italian salamis and sausages, each wrapped in white string netting, piled up like logs, dark red with pale flecks of fat, tied ends of string" + LOOK),
    "salami_rack": (salami_rack, "Image 1 is a rough wooden frame with dark red shapes on flat magenta. Rebuild it as a low, sturdy wooden curing rack for a pizzeria with a thick flat plank across the top, and big fat whole Italian salamis and sausages hanging from it, each wrapped in white string netting, dark red with pale flecks of fat" + LOOK),
    "puffs": (puffs, "Image 1 is eight rough pale cloud shapes on flat magenta. Rebuild each, in the same place and at the same size, as a separate flat paper cut-out " + PAPER + " of a puff of white baking flour bursting in the air: soft lumpy cloud shapes, off-white with one soft pale grey-beige shade, a few tiny specks of flour around each, faint paper grain, no pen outlines, no white border, no shadow. Every puff is separate, with magenta between them. The background stays perfectly flat magenta." + NOTXT),
}


def main():
    IN.mkdir(parents=True, exist_ok=True)
    out = 'run = "paper/obstacles-1"\nseeds = [1, 2, 3]\nrefs = ["paper/style_pm_sq.png"]\n'
    for name, (draw, prompt) in SHOTS.items():
        im = guide(draw) if name != "puffs" else Image.new("RGB", (1024, 1024), MAG)
        if name == "puffs":
            draw(ImageDraw.Draw(im))
        im.save(IN / f"{name}.png")
        out += f'\n[shots.{name}]\ninput = "{IN}/{name}.png"\nprompt = "{prompt}"\n'
    Path("runs/paper_obstacles.toml").write_text(out)
    print(len(SHOTS), "shots")


if __name__ == "__main__":
    main()
