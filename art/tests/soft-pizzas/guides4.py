"""Round 4, Stan and Phil: guides halfway between the current master's silhouette and the round 3 guide.

    python3 art/tests/soft-pizzas/guides4.py
Each outline is the 50/50 blend of the master's body outline (control points read off its keyed silhouette, wedge tapering to the
tip, top corners and crust line) and round 3's guide outline, then tweaked by eye. Writes guides/NAME-g{3,4}.png and
characters/NAME/runs/soft4_masters.toml (shots i_1, i_2; image 1 the guide, image 2 style_pm_sq.png, the face in words, as in 3b).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import guides as G  # noqa: E402
from guides import BLACK, CHEESE, CHEESE_D, CRUST, CRUST_D, SAUCE, Canvas  # noqa: E402

HERE, ART = G.HERE, G.ART


def stan4(k):
    """A wedge tapering to a rounded point, plumper than the master, slightly convex sides, wider at the top than the bottom;
    a tall deep-dish crust band across the top (a band with a slight lip, not a bun); sauce piled on and dripping down the front."""
    c = Canvas()
    h = 150 + 40 * k                                              # band height
    c.tube([(380, 650), (385, 760), (385, 840)], 36); c.tube([(650, 650), (665, 760), (685, 840)], 36)
    c.shoe(380, 870, BLACK, None, 1.15); c.shoe(690, 870, BLACK, None, 1.15)
    c.tube([(262, 380), (200, 480), (215, 610)], 42); c.tube([(790, 370), (845, 470), (830, 610)], 42)
    c.glove(212, 655, 1.3); c.glove(830, 655, 1.3)
    # wedge body: top corners near the master's width, convex sides, rounded point
    c.blob([(228, 250), (520, 238), (806, 250), (780, 390), (700, 540), (600, 680), (522, 745), (445, 680), (350, 540), (262, 390)], CHEESE)
    # crust band: tall, flat-topped, square-ish rounded corners, a thin darker lip under it
    c.blob([(206, 255), (212, 130), (520, 108), (822, 130), (830, 255), (830 - 10, 258 + 14), (520, 270 + 14), (216, 272)], CRUST_D)
    c.blob([(222, 235), (226, 135), (520, 118), (806, 135), (812, 235), (790, 140 + h * 0.7), (520, 150 + h * 0.8), (244, 140 + h * 0.7)], CRUST)
    # sauce along the band's lower edge, drips down the front (short, so the face stays clear)
    c.blob([(236, 320), (330, 270), (520, 290), (710, 270), (800, 320), (770, 375), (520, 360), (268, 375)], SAUCE)
    for x, ln in ((310, 100), (420, 150), (620, 120), (715, 85)):
        c.blob([(x - 24, 365), (x + 24, 365), (x + 28, 365 + ln * 0.7), (x + 16, 365 + ln), (x - 16, 365 + ln), (x - 28, 365 + ln * 0.7)], SAUCE)
    c.disc(640, 470, 40, 36); c.disc(405, 640, 38, 34); c.disc(700, 600, 30, 27)
    c.face(525, 560, 110, ("flat", 6))
    c.save(HERE / "guides" / f"slice-deep-g{k + 3}.png")


def phil4(k):
    """A long, clearly tapering wedge with a thin plain crust edge; the bottom third bends forward and down into a drooping, curling tip.
    Top width about the master's; legs come out below the middle and are long enough to stand on; no cup."""
    c = Canvas()
    d = 40 * k                                                    # extra droop
    c.tube([(465, 600), (462, 730), (458, 850)], 22); c.tube([(560, 610), (570, 735), (578, 850)], 22)
    c.shoe(448, 880, (214, 30, 30), G.WHITE, 0.8); c.shoe(600, 880, (214, 30, 30), G.WHITE, 0.8)
    c.tube([(250, 300), (190, 400), (200, 520)], 26); c.tube([(820, 300), (868, 400), (856, 505)], 26)
    c.glove(198, 560, 1.05); c.glove(858, 545, 1.05)
    # upper body: tapers like a slice, gently convex sides
    c.blob([(195, 160), (520, 142), (845, 160), (815, 290), (760, 410), (700, 515), (560, 565), (440, 560), (350, 470), (270, 330), (215, 230)], CHEESE)
    # bottom third: bends forward and down (darker underside), tapering to a drooping, curling tip on the right
    c.blob([(405, 545), (560, 548), (705, 505), (738, 600), (752, 690 + d), (725, 770 + d), (672, 800 + d), (632, 765 + d),
            (632, 700 + d), (570, 625), (470, 600)], CHEESE_D)
    c.blob([(590, 580), (700, 535), (722, 620), (712, 700 + d), (676, 770 + d), (648, 740 + d), (650, 670), (620, 610)], CHEESE)
    c.blob([(160, 126), (520, 102), (880, 126), (872, 168), (520, 148), (168, 170)], CRUST)
    for x, ln in ((260, 60), (420, 90), (700, 80)):
        c.blob([(x - 16, 168), (x + 16, 168), (x + 18, 168 + ln), (x, 168 + ln + 14), (x - 18, 168 + ln)], CHEESE_D)
    c.disc(335, 330, 44, 40); c.disc(680, 370, 42, 38); c.disc(470, 470, 32, 28)
    c.face(515, 290, 140, ("wave", 6))
    c.save(HERE / "guides" / f"slice-jumbo-g{k + 3}.png")


def tomls():
    mid = "Draw the face once only, on the clean cheese. Standing, the whole figure visible head to feet. "
    tail = G.TAIL.replace("Image 2 shows only the paper material and the face to borrow; do not copy its character's shape or its crust. Image 3 shows only the paper material. ",
                          "Image 2 shows only the paper material to borrow; do not copy its characters. ")
    lead = G.LEAD.replace("in the exact style of image 2: its thick white paper cut border, clean flat colours with one soft shade, and above all its face:",
                          "as a paper standee: Paper Mario style papercraft cutout, a thick white paper cut border all around, clean flat colours with one soft shade, a faint paper grain, and a Charlie the Unicorn style flat deadpan face:")
    text = {
        "slice-deep": ("a flat heavy downturned line mouth, grumpy and stubborn",
                       "The character is Big Stan, a Chicago deep dish slice: a clear pizza wedge tapering to a rounded point, wider at the top than the bottom, with a tall thick golden pan-crust band "
                       "across the top like the wall of a deep dish seen from the front, thick glossy red tomato sauce piled on top and long red sauce drips running down the front, "
                       "two or three round pepperoni, thick arms with white gloves, heavy black boots. "),
        "slice-jumbo": ("a small wobbly wavy line mouth, pompous and anxious",
                        "The character is Phil A. Buster, a gigantic floppy New York jumbo slice: a long pizza wedge clearly tapering toward the bottom, with a thin plain flat crust edge along the top "
                        "(not a rolled tube, not stuffed), the bottom third bending forward and down into a drooping, curling tip, melted yellow cheese, three round pepperoni, thin arms with white gloves, "
                        "long thin legs and small red sneakers. "),
    }
    for name, (mouth, desc) in text.items():
        lines = ['models = ["qwen-edit"]', "seeds = [1, 2, 3]", "width = 1024", "height = 1024",
                 'comfy_args = ["--reserve-vram", "1.5"]', 'template = "{action}"', ""]
        for k in (1, 2):
            refs = [f"tests/soft-pizzas/guides/{name}-g{k + 2}.png", "paper/style_pm_sq.png"]
            prompt = lead.format(mouth=mouth) + desc + mid + tail
            lines += [f"[shots.i_{k}]", f"refs = {json.dumps(refs)}", f"prompt = {json.dumps(prompt)}", ""]
        (ART / "characters" / name / "runs/soft4_masters.toml").write_text("\n".join(lines))


if __name__ == "__main__":
    for k in (0, 1):
        stan4(k); phil4(k)
    tomls()
