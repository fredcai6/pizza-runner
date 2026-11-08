"""Round 3: flat-colour silhouette guides drawn in code (soft curves throughout), plus the run tomls that have Qwen paint them.

    python3 art/tests/soft-pizzas/guides.py
Writes art/tests/soft-pizzas/guides/NAME-gK.png (1024x1024 on magenta) and characters/NAME/runs/soft3_masters.toml
(shots g_1, g_2; image 1 the guide, image 2 Vinny's paper master for material and face, image 3 style_pm_sq.png).
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ART = HERE.parents[1]
S = 2          # supersample
N = 1024
BG = (236, 24, 172)
CRUST, CRUST_D = (232, 163, 92), (196, 124, 58)
CHEESE, CHEESE_D = (252, 214, 52), (240, 178, 36)
SAUCE = (214, 36, 36)
PEP = (196, 40, 36)
TAN = (240, 184, 130)
WHITE = (250, 250, 250)
BLACK = (24, 16, 28)


def cr(pts, closed=True, n=14):
    """Catmull-Rom spline through pts: a smooth outline, no straight long edges."""
    out = []
    m = len(pts)
    rng = range(m) if closed else range(m - 1)
    for i in rng:
        p0, p1, p2, p3 = (pts[(i + d) % m] if closed else pts[max(0, min(m - 1, i + d))] for d in (-1, 0, 1, 2))
        for k in range(n):
            t = k / n
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) * S for j in (0, 1)))
    return out


class Canvas:
    def __init__(self):
        self.im = Image.new("RGB", (N * S, N * S), BG)
        self.d = ImageDraw.Draw(self.im)

    def blob(self, pts, fill):
        self.d.polygon(cr(pts), fill=fill)

    def disc(self, cx, cy, rx, ry=None, fill=PEP):
        ry = ry or rx
        self.d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill)

    def tube(self, pts, w, fill=TAN):
        line = cr(pts, closed=False)
        self.d.line(line, fill=fill, width=int(w * S), joint="curve")
        for x, y in (line[0], line[-1]):
            self.d.ellipse([x - w * S / 2, y - w * S / 2, x + w * S / 2, y + w * S / 2], fill=fill)

    def face(self, cx, cy, gap=52, mouth=("flat", 0)):
        self.disc(cx - gap / 2, cy, 11, 19, BLACK)
        self.disc(cx + gap / 2, cy, 11, 19, BLACK)
        kind, bend = mouth
        self.tube([(cx - 34, cy + 56 + bend), (cx, cy + 62), (cx + 34, cy + 56 + bend)], 8, BLACK)

    def glove(self, cx, cy, s=1.0):
        self.blob([(cx - 48 * s, cy), (cx - 30 * s, cy - 44 * s), (cx + 14 * s, cy - 50 * s), (cx + 48 * s, cy - 8 * s),
                   (cx + 36 * s, cy + 38 * s), (cx - 4 * s, cy + 52 * s), (cx - 38 * s, cy + 34 * s)], WHITE)

    def shoe(self, cx, cy, color, sole=WHITE, s=1.0):
        self.blob([(cx - 80 * s, cy), (cx - 70 * s, cy - 60 * s), (cx - 10 * s, cy - 78 * s), (cx + 40 * s, cy - 40 * s),
                   (cx + 100 * s, cy - 6 * s), (cx + 96 * s, cy + 30 * s), (cx + 20 * s, cy + 40 * s), (cx - 70 * s, cy + 36 * s)], color)
        if sole:
            self.d.polygon(cr([(cx - 76 * s, cy + 18 * s), (cx + 20 * s, cy + 26 * s), (cx + 98 * s, cy + 14 * s),
                               (cx + 98 * s, cy + 34 * s), (cx + 10 * s, cy + 46 * s), (cx - 74 * s, cy + 40 * s)]), fill=sole)

    def save(self, path):
        self.im.resize((N, N), Image.LANCZOS).save(path)


def limbs(c, arm_l, arm_r, leg_l, leg_r, body_color=TAN, wlimb=34):
    for pts in (leg_l, leg_r, arm_l, arm_r):
        c.tube(pts, wlimb if pts in (arm_l, arm_r) else wlimb - 6, body_color)


def stan(k):
    """Stubby plump wedge, tall thick pan-crust wall with its side visible, sauce piled on top and dripping down the front."""
    c = Canvas()
    wall = 150 + 110 * k                       # wall height: k=0 tall, k=1 taller
    c.tube([(330, 640), (340, 760), (350, 840)], 38); c.tube([(650, 640), (670, 760), (690, 840)], 38)
    c.shoe(335, 870, BLACK, None, 1.15); c.shoe(690, 870, BLACK, None, 1.15)
    c.tube([(250, 380), (190, 480), (210, 600)], 44); c.tube([(790, 380), (840, 480), (820, 600)], 44)
    c.glove(205, 650, 1.35); c.glove(820, 650, 1.35)
    # cheese body: plump, bulging sides, round tip
    c.blob([(250, 250), (530, 235), (800, 250), (790, 420), (730, 560), (600, 680), (520, 720), (440, 680), (310, 560), (255, 420)], CHEESE)
    # crust wall: a thick rounded slab, its outer side face darker
    c.blob([(215, 215), (300, 120), (520, 95), (760, 120), (830, 210), (830, 215 + wall * 0.35), (760, 215 + wall * 0.45),
            (520, 225 + wall * 0.5), (290, 215 + wall * 0.45), (215, 215 + wall * 0.35)], CRUST_D)
    c.blob([(235, 190), (310, 125), (520, 105), (750, 125), (810, 190), (780, 215), (520, 225), (270, 215)], CRUST)
    # sauce piled on top, spilling over the wall's lower edge, drips down the front
    c.blob([(240, 330), (330, 270), (520, 300), (720, 270), (800, 330), (770, 400), (520, 380), (270, 400)], SAUCE)
    for x, ln in ((300, 110), (410, 170), (610, 140), (720, 100)):
        c.blob([(x - 26, 380), (x + 26, 380), (x + 30, 380 + ln * 0.7), (x + 18, 380 + ln), (x - 18, 380 + ln), (x - 30, 380 + ln * 0.7)], SAUCE)
    c.disc(340, 520, 46, 42); c.disc(600, 650, 40, 36); c.disc(700, 440, 40, 36)
    c.face(520, 540, 130, ("flat", 6))
    c.save(HERE / "guides" / f"slice-deep-g{k + 1}.png")


def phil(k):
    """Very long, wide, thin slice; a plain flat crust strip; the front third folds down and the tip droops and curls."""
    c = Canvas()
    fold = 420 + 130 * k
    c.tube([(430, 700), (440, 790), (440, 850)], 22); c.tube([(560, 700), (580, 790), (590, 850)], 22)
    c.shoe(420, 880, (214, 30, 30), WHITE, 0.8); c.shoe(610, 880, (214, 30, 30), WHITE, 0.8)
    c.tube([(230, 330), (170, 420), (190, 520)], 26); c.tube([(840, 330), (890, 420), (870, 520)], 26)
    c.glove(190, 560, 1.05); c.glove(870, 560, 1.05)
    # upper body: long and wide, thin, slightly bowed sides
    c.blob([(170, 160), (520, 140), (870, 160), (850, 300), (810, fold - 40), (760, fold), (520, fold + 24), (270, fold), (215, fold - 40), (190, 300)], CHEESE)
    # fold: the front third rolls down and away toward the right, darker underside, tip curling
    c.blob([(250, fold - 10), (520, fold + 14), (790, fold - 10), (770, fold + 70), (740, fold + 170), (700, fold + 240),
            (730, fold + 290), (680, fold + 320), (610, fold + 280), (590, fold + 180), (440, fold + 110), (300, fold + 60)], CHEESE_D)
    c.blob([(300, fold + 40), (520, fold + 60), (700, fold + 30), (690, fold + 120), (650, fold + 200), (640, fold + 255),
            (600, fold + 230), (580, fold + 140), (440, fold + 100)], CHEESE)
    # plain thin flat crust strip along the top, gently bowed, no tube
    c.blob([(160, 125), (520, 100), (880, 125), (884, 168), (520, 148), (156, 170)], CRUST)
    for x, ln in ((260, 70), (420, 100), (700, 90), (810, 60)):
        c.blob([(x - 16, 168), (x + 16, 168), (x + 18, 168 + ln), (x, 168 + ln + 14), (x - 18, 168 + ln)], CHEESE_D)
    c.disc(320, 300, 46, 40); c.disc(690, 380, 44, 38); c.disc(520, fold + 120, 38, 30)
    c.face(520, 270, 150, ("wave", 6))
    c.save(HERE / "guides" / f"slice-jumbo-g{k + 1}.png")


def contessa(k):
    """Smaller rounded wedge, puffy bubbly leopard-spotted rim, mozzarella and basil blobs, soft belly curve."""
    c = Canvas()
    belly = 0 + 70 * k
    c.tube([(430, 690), (440, 780), (435, 850)], 24); c.tube([(580, 690), (600, 780), (610, 850)], 24)
    c.shoe(425, 880, (170, 96, 52), WHITE, 0.95); c.shoe(620, 880, (170, 96, 52), WHITE, 0.95)
    c.tube([(290, 380), (230, 470), (250, 560)], 30); c.tube([(740, 380), (790, 470), (770, 560)], 30)
    c.glove(245, 600, 1.15); c.glove(780, 600, 1.15)
    c.blob([(260, 250), (520, 230), (780, 250), (770, 400), (710, 540 + belly), (610, 650), (520, 700), (430, 650), (330, 540 + belly), (270, 400)], (214, 40, 40))
    c.blob([(420, 330), (520, 300), (640, 340), (660, 440), (590, 560), (520, 640), (450, 560), (390, 440)], (250, 240, 214))
    # puffy bubbly rim: overlapping discs along the top, leopard-spotted
    for i in range(7):
        x = 250 + i * 90
        c.disc(x + 15, 205 + (i % 2) * 8, 62, 56, (232, 170, 96))
    c.blob([(215, 215), (520, 150), (830, 215), (830, 270), (520, 250), (215, 270)], (232, 170, 96))
    for x, y, r in ((300, 190, 20), (410, 215, 17), (520, 190, 22), (640, 215, 17), (740, 190, 20), (460, 170, 11), (590, 170, 11), (350, 235, 11), (700, 235, 12)):
        c.disc(x, y, r, r * 0.8, (74, 40, 30))
    c.disc(330, 330, 32, 28, (250, 250, 244)); c.disc(700, 340, 30, 26, (250, 250, 244)); c.disc(430, 610, 30, 26, (250, 250, 244))
    c.disc(340, 470, 32, 30, (220, 40, 40)); c.disc(700, 480, 32, 30, (220, 40, 40))
    for x, y in ((340, 330), (690, 345), (440, 600)):
        c.blob([(x - 30, y), (x, y - 36), (x + 36, y - 6), (x + 6, y + 30)], (52, 150, 62))
    c.face(520, 380, 100, ("smirk", -6))
    c.save(HERE / "guides" / f"slice-naples-g{k + 1}.png")


def vinny(k):
    """His current proportions with rounded corners and a slight soft bulge only."""
    c = Canvas()
    b = 0 + 55 * k
    c.tube([(380, 650), (385, 740), (390, 820)], 30); c.tube([(620, 650), (640, 740), (650, 820)], 30)
    c.shoe(385, 860, (220, 30, 30), WHITE, 1.05); c.shoe(655, 860, (220, 30, 30), WHITE, 1.05)
    c.tube([(280, 400), (220, 500), (230, 590)], 34); c.tube([(750, 400), (800, 500), (790, 590)], 34)
    c.glove(235, 630, 1.2); c.glove(790, 630, 1.2)
    c.blob([(250, 250), (520, 235), (790, 250), (780, 380 + b), (700, 530 + b), (590, 660), (520, 700), (450, 660), (340, 530 + b), (260, 380 + b)], CHEESE)
    c.blob([(215, 215), (300, 150), (520, 130), (760, 150), (830, 215), (810, 270), (520, 255), (230, 270)], CRUST)
    c.disc(350, 330, 40, 36); c.disc(560, 580, 40, 36)
    c.face(560, 400, 120, ("flat", 0))
    c.save(HERE / "guides" / f"slice-ny-g{k + 1}.png")


TAIL = ("Image 2 shows only the paper material and the face to borrow; do not copy its character's shape or its crust. Image 3 shows only the paper material. "
        "The background is one perfectly flat, uniformly lit magenta fill: no spotlight, no gradient, no cast shadow, no floor shadow and no shadow shapes on the background. "
        "Absolutely no text, letters, numbers, logos, labels, signs or lettering anywhere in the image. Exactly two arms and two legs, no extra limbs or hands.")
LEAD = ("Image 1 is a flat-colour silhouette guide for a pizza slice mascot. Repaint it as a paper standee in the exact style of image 2: its thick white paper cut border, clean flat colours "
        "with one soft shade, and above all its face: two small plain blank black dot eyes, no eyebrows, no white eyeballs, no pupils, {mouth}. "
        "KEEP image 1's exact silhouette, proportions and pose: every soft rounded curve, bulge, bend and droop must stay as drawn, never straightened into a rigid triangle. ")
CHARS = {
    "slice-deep": ("a flat heavy downturned line mouth, grumpy and stubborn",
                   "The character is Big Stan, a Chicago deep dish slice: a stubby plump wedge with a tall thick golden pan-crust wall whose side you can see, thick glossy red tomato sauce piled on top "
                   "and long red sauce drips running down the front, three round pepperoni, thick arms with white gloves, heavy black boots. "),
    "slice-jumbo": ("a small wobbly wavy line mouth, pompous and anxious",
                    "The character is Phil A. Buster, a gigantic floppy New York jumbo slice: very long, wide and thin, with a plain thin flat crust edge (not a rolled tube, not stuffed), "
                    "the front of the slice folding down and the tip drooping and curling under its own weight, melted yellow cheese, three round pepperoni, thin arms with white gloves, tiny legs and small red sneakers. "),
    "slice-naples": ("a small flat line mouth tilted into a proud knowing smirk",
                     "The character is La Contessa, a small Neapolitan margherita slice: a rounded wedge with a puffy bubbly blistered crust rim with dark leopard spots, red tomato sauce, white mozzarella blobs, "
                     "three round tomato slices, green basil leaves, thin arms with white gloves, brown sneakers. Smooth clean vector shapes, not pixel art. "),
    "slice-ny": ("a flat or very slightly bent line mouth, deadpan",
                 "The character is Vinny, a New York cheese slice with a plain crust, two pepperoni, white gloves and red sneakers, with rounded corners and a soft bulge. "),
}
VINNY = "characters/slice-ny/references/paper-master.png"


def tomls():
    for name, (mouth, text) in CHARS.items():
        lines = ['models = ["qwen-edit"]', "seeds = [1, 2, 3]", "width = 1024", "height = 1024",
                 'comfy_args = ["--reserve-vram", "1.5"]', 'template = "{action}"', ""]
        for k in (1, 2):
            refs = [f"tests/soft-pizzas/guides/{name}-g{k}.png", VINNY, "paper/style_pm_sq.png"]
            prompt = LEAD.format(mouth=mouth) + text + "Standing, the whole figure visible head to feet. " + TAIL
            lines += [f"[shots.g_{k}]", f"refs = {json.dumps(refs)}", f"prompt = {json.dumps(prompt)}", ""]
        (ART / "characters" / name / "runs/soft3_masters.toml").write_text("\n".join(lines))


def tomls_b():
    """Round 3b: image 2 (Vinny) pulled every character back to his shape, so Phil/Stan/Vinny are painted from the guide plus only the style reference."""
    tail = TAIL.replace("Image 2 shows only the paper material and the face to borrow; do not copy its character's shape or its crust. Image 3 shows only the paper material. ",
                        "Image 2 shows only the paper material to borrow; do not copy its characters. ")
    lead = LEAD.replace("in the exact style of image 2: its thick white paper cut border, clean flat colours with one soft shade, and above all its face:",
                        "as a paper standee: Paper Mario style papercraft cutout, a thick white paper cut border all around, clean flat colours with one soft shade, a faint paper grain, and a Charlie the Unicorn style flat deadpan face:")
    for name in ("slice-deep", "slice-jumbo", "slice-ny"):
        mouth, text = CHARS[name]
        lines = ['models = ["qwen-edit"]', "seeds = [1, 2, 3]", "width = 1024", "height = 1024",
                 'comfy_args = ["--reserve-vram", "1.5"]', 'template = "{action}"', ""]
        for k in (1, 2):
            refs = [f"tests/soft-pizzas/guides/{name}-g{k}.png", "paper/style_pm_sq.png"]
            prompt = lead.format(mouth=mouth) + text + "Draw the face once only, on the clean cheese. Standing, the whole figure visible head to feet. " + tail
            lines += [f"[shots.h_{k}]", f"refs = {json.dumps(refs)}", f"prompt = {json.dumps(prompt)}", ""]
        (ART / "characters" / name / "runs/soft3b_masters.toml").write_text("\n".join(lines))


if __name__ == "__main__":
    (HERE / "guides").mkdir(exist_ok=True)
    for k in (0, 1):
        stan(k); phil(k); contessa(k); vinny(k)
    tomls()
    tomls_b()
