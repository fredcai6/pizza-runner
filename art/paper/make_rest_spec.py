"""Writes the master run files (characters/NAME/runs/paper_masters.toml) for the rest of the cast (everything after New York).

    python3 art/paper/make_rest_spec.py          then: gpu job runs  forge.generate characters/NAME/runs/paper_masters.toml qwen-edit

Each character gets two variants (A: completely flat fills, B: one soft shade per colour) at three seeds.
The prompts are the New York ones (teen m_A/m_B, brooklyn m_A/m_B, recruit rc_B) with the character swapped in.
Customers need a `references/current.png`: the old sprite's idle frame, enlarged onto magenta (made here).
"""
import json
from pathlib import Path

from PIL import Image

ART = Path(__file__).resolve().parents[1]
ASSETS = ART.parent / "assets/sprites"

TAIL = ("Images after the first show only the drawing style to borrow (material, border, face flatness); do not copy their characters or animals. "
        "The background is one perfectly flat, uniformly lit magenta fill: no spotlight, no gradient, no cast shadow, no floor shadow and no shadow shapes on the background. "
        "Absolutely no text, letters, numbers, logos, labels, signs or lettering anywhere in the image. Exactly two arms and two legs, no extra limbs or hands.")
PAPER = ("Paper Mario style papercraft cutout, a standee cut from card: simple bold shapes, clean flat colours{shade}, a clear white paper cut border about as thick as a finger "
         "around the entire silhouette, a faint paper grain texture. ")
FLAT = (" with one soft shade", "Completely flat fills with no shading at all. ")
SOFT = ("", "Gentle soft shading with a little highlight and a soft shade under each fold, still clean and flat. ")
DEADPAN = "The face is a Charlie the Unicorn style flat deadpan face: two small plain blank black dot eyes, no eyebrows, {mouth}, almost no detail. "
TALL = "paper/style_pm_tall.png"
SQ = "paper/style_pm_sq.png"

# name: (current-art reference, view, character text, face text or None, style ref, size)
PIZZA = {
    "slice-deep": ("characters/slice-deep/references/current.png",
                   "standing and facing slightly right, the whole figure visible head to boots",
                   "Big Stan, the Chicago deep dish pizza slice mascot from image 1: a tall, thick, heavy wedge with a thick golden-brown crust wall around the sides, "
                   "the top brimming with thick glossy red tomato sauce over melted cheese, red sauce running down the sides in long drips with a fat drop at the bottom, "
                   "three round pepperoni, burly thick arms with white gloves, heavy black boots",
                   "a flat heavy downturned line mouth, grumpy and stubborn"),
    "slice-jumbo": ("characters/slice-jumbo/references/master.png",
                    "standing and facing slightly right, the whole figure visible head to sneakers",
                    "Phil A. Buster, the absurdly big floppy pizza slice mascot from image 1: a huge long drooping triangle of a slice, the crust a big rolled tube along the top, "
                    "the pointed tip flopping and bending over to one side, thick melted yellow cheese dripping down, three round pepperoni, small thin arms with white gloves, "
                    "tiny thin legs and red sneakers that look far too small for the huge body",
                    "a small wobbly wavy line mouth, pompous and anxious"),
    "slice-naples": ("characters/slice-naples/references/master.png",
                     "standing and facing slightly right, the whole figure visible head to sneakers",
                     "La Contessa, the small, quick Neapolitan pizza slice mascot from image 1: a neat small triangle with a puffy charred thin crust with dark leopard spots along the top, "
                     "red tomato sauce, white mozzarella, three round slices of red tomato and three green basil leaves as toppings, thin arms with white gloves, brown sneakers",
                     "a small flat line mouth tilted into a proud knowing smirk"),
}
# plain cheese recruits are redrawn from the picked pizza masters (recruit run, job 2), not here.

CUSTOMER = {  # name: (view, text)
    "customer-chicago-loop": "a tough, loud Chicago woman in a huge puffy winter coat in navy blue and orange, a knit hat with a pom-pom, big teased hair, snow boots, a hot dog in one hand and a TV remote in the other, a scowl",
    "customer-chicago-lincolnpark": "a Lincoln Park jogging mom in a bright pink athletic top, purple leggings, a white visor and ponytail, running shoes, a clear water bottle in one hand, pushing a jogging stroller with a baby in it, mid-stride, smiling and distracted",
    "customer-chicago-wickerpark": "a Wicker Park hipster bartender woman in a black dress with a black apron, tattoo sleeves on one arm, a dark high ponytail, big hoop earrings, a bar towel over one shoulder, holding a pint glass of beer",
    "customer-dc-georgetown": "an elderly Georgetown university professor woman with a grey bun, round glasses, a tweed jacket with elbow patches, a long plum skirt, a string of pearls, holding a very thick plain book with a blank cover, haughty",
    "customer-dc-mall": "a sunburned Washington Mall tourist woman in a loud tropical Hawaiian shirt, a wide sun hat, blue shorts, white socks with sandals, a fanny pack, a big camera hanging round her neck, a folded paper map in one hand, delighted",
    "customer-dc-federal": "a Federal building secret agent woman in a plain black suit, black sunglasses, a coiled earpiece wire, her hair in a tight bun, one hand pressed to the earpiece, stone-faced",
    "customer-naples-harbor": "a Neapolitan fisherwoman in a navy and white striped shirt, a yellow rain apron, rubber boots, a knotted headscarf, a weathered tan face, holding up a big silver fish by the tail, proud",
    "customer-naples-center": "an old Neapolitan nonna in a long black dress and black headscarf, a flowered apron, thick stockings and slippers, holding a big wooden spoon like a weapon, an angry stern frown",
    "customer-naples-hillside": "a glamorous Neapolitan signora from the hillside villas in a flowing purple dress, a huge floppy sunhat, oversized sunglasses, gold jewellery, one hand raised in a grand gesture, the other holding a small coffee cup",
    "customer-california-downtown": "a California downtown roller skater girl in a yellow T-shirt, blue shorts, blue roller skates, round sunglasses, a high ponytail, one hand waving, smiling",
    "customer-california-beach": "a laid-back California surfer dude with long sun-bleached hair, bare chest under an open shirt, board shorts, barefoot, a surfboard standing upright beside him held by ONE hand, his other hand giving a shaka sign; he has exactly one arm on each side and no extra hands",
}

OTHER = {
    "ninja": ("characters/ninja/references/master.png", TALL, "standing in a side view facing right, the whole figure visible head to feet",
              "the ninja from image 1: a black hooded ninja suit with a black face mask leaving only a narrow strip of eyes, a grey sash belt, grey wraps on the wrists and ankles, black ninja shoes, hands in a ready stance",
              "The face is just a narrow strip of two small blank black dot eyes between mask and hood; no eyebrows. The suit is flat black with grey fold shades, bold and clean. "),
    "mutant": ("characters/mutant/references/master2.png", SQ, "standing hunched in a side view facing right, the whole figure visible head to boots",
               "a Futurama-style sewer mutant scavenger, a hunched, lumpy, long-armed creature with green-grey skin, a bulging bald head with two uneven eyes of different sizes and a drooping underbite, "
               "wearing a tattered patched brown vest, torn shorts and tall brown rubber boots, a rusty sewer-pipe wrench tucked in a belt and a scrap sack, as if it climbed out of a storm drain",
               "The face is simple and readable: two blank black dot eyes of slightly different size, a droopy flat line mouth with a bit of underbite, almost no detail. "),
    "alewife": ("characters/alewife/references/master.png", SQ, "standing, facing the viewer, the whole figure visible head to sneakers",
                "DJ Alewife from image 1: a cheerful woman with long wavy bright pink-red hair and a pale blue headband, tan skin, a big warm smile with one eye winking, a navy tank top, blue jeans, white high-top sneakers, holding a tall frothy mug of golden beer in one hand",
                "Her face is simple, friendly and kind, a little wink and a smile, almost no detail. Keep her likeness: the same hair, headband, smile and outfit. "),
}


def shots(name, refs, body_a, body_b, size, runs=None):
    w, h = size
    lines = ['models = ["qwen-edit"]', "seeds = [1, 2, 3]", f"width = {w}", f"height = {h}", 'comfy_args = ["--reserve-vram", "1.5"]', 'template = "{action}"', ""]
    for tag, body in (("A", body_a), ("B", body_b)):
        lines += [f"[shots.m_{tag}]", f"refs = {json.dumps(refs)}", f"prompt = {json.dumps(body)}", ""]
    return "\n".join(lines)


def pizzas():
    for name, (cur, view, text, mouth) in PIZZA.items():
        out = []
        for flat in (True, False):
            fs, extra = FLAT if flat else SOFT
            out.append(f"Full body character art for a 2D platformer, {view}. The character is {text}. "
                       + PAPER.format(shade=fs if flat else "") + DEADPAN.format(mouth=mouth) + extra + TAIL)
        (ART / "characters" / name / "runs").mkdir(parents=True, exist_ok=True)
        (ART / "characters" / name / "runs/paper_masters.toml").write_text(shots(name, [cur, SQ], out[0], out[1], (1024, 1024)))


VINNY = "characters/slice-ny/references/paper-master.png"


def pizzas2():
    """Second master round: the first (old pixel art as image 1) kept the old pixel faces and brows. Image 1 is now Vinny, the finished paper pizza."""
    for name, (cur, view, text, mouth) in PIZZA.items():
        out = []
        for flat in (True, False):
            body = ("Image 1 is Vinny, a finished paper standee pizza slice. Image 2 is a different pizza slice character in pixel-art. Redraw the character of image 2 as a new paper standee "
                    "that matches image 1 exactly in material, thick white paper cut border, clean flat vector shapes, matching flat colours" + (" with one soft shade" if not flat else "") +
                    ", and above all in FACE: " + DEADPAN.format(mouth=mouth).replace("The face is a Charlie the Unicorn style flat deadpan face: ", "") +
                    "No eyebrows at all, no white eyeballs, no pupils, no lashes, no pixel art. Keep the identity of image 2: " + text.replace("image 1", "image 2") + ". "
                    f"Pose: {view}. Image 3 shows only the paper material to borrow; do not copy its characters. " + TAIL.split("do not copy their characters or animals. ")[1])
            out.append(body)
        (ART / "characters" / name / "runs/paper_masters2.toml").write_text(shots(name, [VINNY, cur, SQ], out[0], out[1], (1024, 1024)))


SPIN3 = {
    "slice-deep": ("Big Stan, a heavy Chicago deep dish pizza slice: keep image 1's body plan but make the slice a tall, thick, heavy wedge with a thick golden-brown crust wall along the top and sides, "
                   "the top brimming with thick glossy red tomato sauce over the cheese, long red sauce drips running down the sides with a fat drop at the bottom, three round pepperoni, "
                   "burly thick arms, white gloves, and heavy black boots instead of sneakers. Stocky and wide",
                   "a flat heavy downturned line mouth, grumpy and stubborn"),
    "slice-jumbo": ("Phil A. Buster, an absurdly big, floppy pizza slice: keep image 1's body plan but make the slice far longer and larger than the legs, with a big rolled tube of crust along the top, "
                    "the long pointed tip drooping and bending over to one side, thick melted yellow cheese dripping down the sides, three round pepperoni, thin small arms and white gloves, "
                    "tiny thin legs and small red sneakers that look far too small for the huge slice",
                    "a small wobbly wavy line mouth, pompous and anxious"),
}


def pizzas3():
    """Third round, deep and jumbo: the pixel-art references kept dragging the old brows and big cartoon eyes in. Image 1 is Vinny alone."""
    for name, (text, mouth) in SPIN3.items():
        out = []
        for flat in (True, False):
            out.append("Image 1 is Vinny, a finished paper standee pizza slice mascot. Redraw it as a different character: " + text + ". "
                       "Keep exactly image 1's material, thick white paper cut border, clean flat colours" + ("" if flat else " with one soft shade") + ", simple bold shapes, and above all its face: "
                       "two small plain blank black dot eyes, no eyebrows, no white eyeballs, no pupils, " + mouth + ". Standing and facing slightly right, the whole figure visible head to feet. "
                       "Image 2 shows only the paper material to borrow; do not copy its characters. " + TAIL.split("do not copy their characters or animals. ")[1])
        (ART / "characters" / name / "runs/paper_masters3.toml").write_text(shots(name, [VINNY, SQ], out[0], out[1], (1024, 1024)))


def customers():
    for name, text in CUSTOMER.items():
        d = ART / "characters" / name
        ref = d / "references/current.png"
        if not ref.exists():
            sheet = Image.open(ASSETS / name / "idle/sheet.png").convert("RGBA")
            fr = sheet.crop((0, 0, 120, 150)).resize((840, 1050), Image.NEAREST)
            bg = Image.new("RGBA", (896, 1152), (255, 0, 255, 255))
            bg.alpha_composite(fr, (28, 80))
            ref.parent.mkdir(parents=True, exist_ok=True)
            bg.convert("RGB").save(ref)
        out = []
        for flat in (True, False):
            fs, extra = FLAT if flat else SOFT
            out.append("Full body character art for a 2D platformer, the whole figure visible head to feet, standing facing the viewer in three-quarter view. "
                       f"The character is {text}, redrawn from image 1 with the same clothes and props. "
                       + PAPER.format(shade=fs if flat else "") + "Her face is simple and readable: two small black dot eyes and a small simple mouth that shows her mood, almost no detail. "
                       + extra + TAIL)
        (d / "runs").mkdir(parents=True, exist_ok=True)
        (d / "runs/paper_masters.toml").write_text(shots(name, [f"characters/{name}/references/current.png", TALL], out[0], out[1], (896, 1152)))


def lincoln2():
    """Pink on the magenta key was keyed away with the backdrop (shirt and sneakers went white): redo her in turquoise."""
    d = ART / "characters/customer-chicago-lincolnpark"
    name = "customer-chicago-lincolnpark"
    t = CUSTOMER[name].replace("a bright pink athletic top", "a bright turquoise athletic top").replace("running shoes", "white running shoes")
    body = ("Full body character art for a 2D platformer, the whole figure visible head to feet, standing facing the viewer in three-quarter view. "
            f"The character is {t}, redrawn from image 1 with the same pose and props, but with the athletic top bright TURQUOISE (not pink) and white sneakers; there is no pink anywhere. "
            + PAPER.format(shade="") + "Her face is simple and readable: two small black dot eyes and a small simple smile, almost no detail. " + FLAT[1] + TAIL)
    (d / "runs/paper_masters2.toml").write_text(shots(name, [f"characters/{name}/references/current.png", TALL], body, body, (896, 1152)))


def others():
    for name, (cur, style, view, text, face) in OTHER.items():
        out = []
        for flat in (True, False):
            fs, extra = FLAT if flat else SOFT
            out.append(f"Full body character art for a 2D platformer, {view}. The character is {text}. " + PAPER.format(shade=fs if flat else "") + face + extra + TAIL)
        d = ART / "characters" / name / "runs"
        d.mkdir(parents=True, exist_ok=True)
        size = (896, 1152) if style == TALL else (1024, 1024)
        (d / "paper_masters.toml").write_text(shots(name, [cur, style], out[0], out[1], size))


POLAROID = {  # enemy: what it is doing when caught from the bushes
    "teen": "the teenager from image 1, walking along a sidewalk and filming the street with his glowing phone, not noticing the camera",
    "turtle": "the grumpy turtle from image 1, plodding across a sidewalk chewing a leaf, one eye turning toward the camera",
    "ninja": "the black-hooded ninja from image 1, crouched on a fire escape ledge, one hand raised holding a small throwing star, looking away",
    "mutant": "the sewer mutant from image 1, hunched beside an open storm drain with its scrap sack, peering around, caught mid-step",
}


def polaroids():
    """Candid, out-of-focus snapshots for the corkboard (js/board.js). Reads each character's finished paper master."""
    for name, what in POLAROID.items():
        body = (f"A blurry candid snapshot photo taken secretly from inside a bush: {what}. The whole image is a papercraft diorama made of cut card, flat bold shapes, "
                "a faint paper grain texture: a flat pastel paper street with paper buildings far behind. The subject keeps its white paper cut border and flat colours but is a little soft and "
                "out of focus with gentle motion blur, small in the middle of the frame. In the foreground, big out-of-focus dark green paper-cut leaves and twigs cover the corners and edges of the "
                "frame, as if shot through a hedge. Warm faded snapshot colours, a soft vignette. Image 2 shows only the paper material to borrow; do not copy its characters. "
                "Absolutely no text, letters, numbers, logos, date stamps, borders or frames anywhere in the image.")
        d = ART / "characters" / name / "runs"
        d.mkdir(parents=True, exist_ok=True)
        (d / "polaroid.toml").write_text(shots(name, [f"characters/{name}/references/paper-master.png", SQ], body, body.replace("a little soft and out of focus", "soft and badly out of focus"), (1024, 768)))
    body = ("A candid snapshot photo of DJ Alewife from image 1, the same cheerful woman with long wavy bright pink-red hair, pale blue headband, big warm smile and a wink, in a navy tank top, "
            "standing behind a DJ booth with two turntables and a laptop at a party, a mug of golden beer in one hand, caught mid-laugh. The whole image is a papercraft diorama made of cut card, "
            "flat bold shapes, a faint paper grain texture, a purple paper wall with paper string lights behind her. Warm snapshot colours, a soft vignette, square framing. Image 2 shows only the paper material "
            "to borrow; do not copy its characters. Absolutely no text, letters, numbers, logos or borders anywhere in the image.")
    d = ART / "characters/alewife/runs"
    (d / "polaroid.toml").write_text(shots("alewife", ["characters/alewife/references/paper-master.png", "characters/alewife/references/channel-avatar.png", SQ], body, body, (1024, 1024)))


if __name__ == "__main__":
    pizzas(); pizzas2(); pizzas3(); customers(); lincoln2(); others(); polaroids()
