"""Writes the Qwen spec for each city's pizza boxes and the cheese and sauce sprite sheets, and the rough guide images it edits.
    python backgrounds/pizza_boxes_spec.py   (from art/)  ->  runs/paper_boxes.toml and /mnt/data/sprite-forge/paper-boxes/in/
Then, through the queue:
    ws submit --priority 10 --vram 30G --mem 34G --cores 2 --expect 20m --name pr-boxes -- \\
      env PYTHONPATH=~/projects/sprite-forge ~/projects/sprite-forge/.venv/bin/python backgrounds/paper_edit.py runs/paper_boxes.toml
The guides are plain shapes on magenta: they set the layout and size; the prompt sets everything you see."""
from pathlib import Path

from PIL import Image, ImageDraw

IN = Path("/mnt/data/sprite-forge/paper-boxes/in")
MAG = (255, 0, 255)
TAN, TAN2, TAN3 = (222, 188, 140), (196, 160, 112), (236, 210, 168)
NOTXT = " No text, letters, numbers, logos or lettering anywhere: every printed design is pictures and shapes only."
PAPER = "in the material of image 2"


def box3q(d, x, y, w, h, depth):
    """One closed pizza box in three-quarter view, front-bottom-left corner at (x, y)."""
    dx, dy = depth * 0.55, depth * 0.45
    d.polygon([(x, y - h), (x + w, y - h), (x + w + dx, y - h - dy), (x + dx, y - h - dy)], fill=TAN3)   # lid
    d.rectangle([x, y - h, x + w, y], fill=TAN)                                                              # front
    d.polygon([(x + w, y), (x + w, y - h), (x + w + dx, y - h - dy), (x + w + dx, y - dy)], fill=TAN2)   # side


def stack(d, x, y, w, h, depth, n, jitter=(0, 6, -5, 4, -3, 5, -6, 3)):
    for i in range(n):
        box3q(d, x + jitter[i % len(jitter)], y - i * h, w, h, depth)


def guide_box():
    im = Image.new("RGB", (768, 768), MAG); d = ImageDraw.Draw(im)
    stack(d, 140, 730, 420, 72, 230, 6)
    return im


def guide_pile():
    im = Image.new("RGB", (1152, 768), MAG); d = ImageDraw.Draw(im)
    stack(d, 40, 740, 300, 58, 170, 6)
    stack(d, 420, 740, 300, 58, 170, 9)
    stack(d, 790, 740, 300, 58, 170, 5)
    return im


def guide_broken():
    im = Image.new("RGB", (1024, 384), MAG); d = ImageDraw.Draw(im)
    d.polygon([(90, 330), (520, 300), (560, 250), (140, 262)], fill=TAN3)
    d.polygon([(470, 340), (930, 335), (900, 270), (500, 276)], fill=TAN)
    d.ellipse([280, 270, 380, 300], fill=TAN2)
    return im


def guide_sheet(color, shade):
    """Twelve separate blobs on a grid: round drops, long drips, stretched strings and flat splats."""
    im = Image.new("RGB", (1024, 1024), MAG); d = ImageDraw.Draw(im)
    for r in range(3):
        for c in range(4):
            cx, cy = 128 + c * 256, 150 + r * 340
            if r == 0:   # drops of different sizes
                s = 40 + c * 18
                d.ellipse([cx - s, cy - s, cx + s, cy + s], fill=color)
            elif r == 1:   # drips and strings
                if c < 2:
                    d.ellipse([cx - 45, cy - 30, cx + 45, cy + 40], fill=color); d.polygon([(cx - 20, cy), (cx + 20, cy), (cx, cy - 110)], fill=color)
                else:
                    d.line([(cx - 100, cy + 30), (cx - 20, cy - 10), (cx + 100, cy - 40)], fill=color, width=26)
            else:   # flat splats
                d.ellipse([cx - 110, cy - 30, cx + 110, cy + 30], fill=color)
                d.ellipse([cx - 70, cy - 50, cx + 30, cy + 10], fill=shade)
    return im


CITIES = {
    "newyork": "classic New York pizzeria boxes: bright white card printed in red, the lid of the top box shows a big printed red cartoon pizza with a few slices and three wavy steam lines, a red border stripe round the lid edge, the front edges have small red pepperoni dots",
    "chicago": "Chicago deep-dish boxes, taller than usual: red-and-white checkered tablecloth pattern all over, the lid of the top box shows a big printed round deep-dish pie with a thick golden crust and red sauce on top",
    "dc": "Washington boxes: deep navy-blue card with a band of red and white stripes along the front edges and small white stars, the lid of the top box shows a big printed round pizza with red pepperoni inside a ring of white stars",
    "naples": "Neapolitan boxes: plain brown kraft cardboard, a green, white and red stripe along the front edges, the lid of the top box shows a printed simple volcano with a little puff of smoke and a round margherita pizza with green basil leaves",
    "california": "Long Beach boxes: pale turquoise card, the lid of the top box shows a printed orange and pink sunset over a blue wave with a palm tree and a round pizza as the sun, a wavy coral stripe along the front edges",
}
BOX = ("Image 1 is a rough stack of plain flat boxes on flat magenta. Rebuild it as a stack of six closed square cardboard pizza boxes, flat paper cut-out art " + PAPER +
       ", seen at the same three-quarter angle from slightly above so the lid of the top box shows, in the same place and at the same size. They are unmistakably pizza boxes: square and very flat, a thin wavy corrugated edge showing on the sides, small folded corner tabs, an air vent cut in the front, a little round grease stain. They are {desc}. Flat pieces of card with one soft shade each, a faint paper grain, gently cut edges, no pen outlines, no white border, no cast shadow. The background stays perfectly flat magenta." + NOTXT)
PILE = ("Image 1 is three rough stacks of plain flat boxes on flat magenta. Rebuild them as three stacks of closed square cardboard pizza boxes, flat paper cut-out art " + PAPER +
        ", same three-quarter angle, same places, same heights. They are unmistakably pizza boxes: square and very flat, a thin wavy corrugated edge on the sides, small folded corner tabs, air vents, a few grease stains. They are {desc}. Flat card with one soft shade each, a faint paper grain, no pen outlines, no white border, no cast shadow. The background stays perfectly flat magenta." + NOTXT)
BROKEN = ("Image 1 is two rough flat shapes on flat magenta. Rebuild them as two crushed, squashed open pizza boxes lying flat on the ground, torn and folded, flat paper cut-out art " + PAPER +
          ", seen from the front and slightly above, a few crumbs of crust and an orange grease stain inside. They are {desc}. Flat card with one soft shade each, faint paper grain, no outlines, no white border, no shadow. The background stays perfectly flat magenta." + NOTXT)
CHEESE = ("Image 1 is twelve rough yellow shapes on flat magenta. Rebuild each, in the same place and at the same size, as a separate flat paper cut-out " + PAPER +
          " of hot melted mozzarella cheese flying through the air: top row round gooey cheese blobs of different sizes, middle row two cheese drips with a pointed tail and two long stretchy pulled cheese strings, bottom row flat splatted cheese puddles. Warm golden-yellow card with one soft paler highlight and one soft orange-yellow shade, a few tiny bubbles, a faint paper grain, gently cut edges, no pen outlines, no white border, no shadow. Every piece is separate, with magenta between them. The background stays perfectly flat magenta." + NOTXT)
SAUCE = ("Image 1 is twelve rough red shapes on flat magenta. Rebuild each, in the same place and at the same size, as a separate flat paper cut-out " + PAPER +
         " of thick tomato pizza sauce: top row round sauce drops of different sizes, middle row two sauce drips with a pointed tail and two long smears, bottom row flat splatted sauce puddles. Rich tomato-red card with one soft lighter highlight and one soft dark-red shade, a few tiny flecks of green herbs, a faint paper grain, gently cut edges, no pen outlines, no white border, no shadow. Every piece is separate, with magenta between them. The background stays perfectly flat magenta." + NOTXT)


def main():
    IN.mkdir(parents=True, exist_ok=True)
    guides = {"box": guide_box(), "pile": guide_pile(), "broken": guide_broken(),
              "cheese": guide_sheet((255, 204, 51), (240, 170, 40)), "sauce": guide_sheet((196, 40, 32), (150, 24, 24))}
    for name, im in guides.items():
        im.save(IN / f"{name}.png")
    out = 'run = "paper/boxes-1"\nseeds = [1, 2, 3]\nrefs = ["paper/style_pm_sq.png"]\n'

    def shot(name, inp, prompt, seeds=None):
        nonlocal out
        out += f'\n[shots.{name}]\ninput = "{IN}/{inp}.png"\nprompt = "{prompt}"\n' + (f"seeds = {seeds}\n" if seeds else "")

    for city, desc in CITIES.items():
        shot(f"{city}_box", "box", BOX.format(desc=desc))
        shot(f"{city}_pile", "pile", PILE.format(desc=desc), [1, 2])
        shot(f"{city}_broken", "broken", BROKEN.format(desc=desc), [1, 2])
    shot("cheese", "cheese", CHEESE, [1, 2, 3, 4])
    shot("sauce", "sauce", SAUCE, [1, 2, 3, 4])
    Path("runs").mkdir(exist_ok=True)
    Path("runs/paper_boxes.toml").write_text(out)
    print(out.count("[shots."), "shots")


if __name__ == "__main__":
    main()
