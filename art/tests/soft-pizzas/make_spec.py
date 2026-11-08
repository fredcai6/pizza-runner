"""Writes characters/NAME/runs/soft_masters.toml for the softened-pizza round (Tommy: too stiff and triangular).

    python3 art/tests/soft-pizzas/make_spec.py      then: job.sh (one GPU job, 4 pizzas x 2-3 variants x 3 seeds)
Image 1 is the character's current paper master, image 2 is style_pm_sq.png, as in the earlier master rounds.
"""
import json
from pathlib import Path

ART = Path(__file__).resolve().parents[2]
SQ = "paper/style_pm_sq.png"

TAIL = ("Image 2 shows only the paper material to borrow; do not copy its characters. "
        "The background is one perfectly flat, uniformly lit magenta fill: no spotlight, no gradient, no cast shadow, no floor shadow and no shadow shapes on the background. "
        "Absolutely no text, letters, numbers, logos, labels, signs or lettering anywhere in the image. Exactly two arms and two legs, no extra limbs or hands.")
KEEP = ("Keep exactly image 1's material, thick white paper cut border, clean flat colours with one soft shade, and above all its face: "
        "two small plain blank black dot eyes, no eyebrows, no white eyeballs, no pupils, {mouth}. ")
SOFT = {
    "a": "Soften the shapes: round every corner, give every edge a soft bulge and curve, bend the whole body gently, and use soft, rounder, curvier limbs. No rigid flat triangle, no straight stiff edges. ",
    "b": "Make the whole body soft and pillowy like a squishy cloth toy: very rounded corners, plump bulging edges, a gentle S-curve bend in the body, noodle-soft arms and legs, and a rounded tip instead of a sharp point. It must still read instantly as a pizza slice. ",
    "c": "Make the slice limp and drooping: it sags and bows under its own weight, the edges wave in soft curves, the corners are rounded, the tip hangs a little to one side, and the arms and legs are soft and rounded. It must still read instantly as a pizza slice, never a rigid flat triangle. ",
}
POSE = "Standing and facing slightly right, the whole figure visible head to feet. "
NAMES = {"slice-deep": "Big Stan", "slice-jumbo": "Phil A. Buster", "slice-naples": "La Contessa", "slice-ny": "Vinny"}

# name: (mouth, {variant: character text})
CHARS = {
    "slice-deep": ("a flat heavy downturned line mouth, grumpy and stubborn", {
        "a": "Redraw Big Stan, the deep dish pizza slice, softer. He stays saucy: a thick glossy red tomato sauce layer on top over the cheese, and long red sauce drips running down his sides with a fat drop at the bottom, three round pepperoni. He reads as thick, deep and pan-baked: a tall chunky body with a thick, puffy golden crust wall all around, rounded not sharp. Burly rounded arms with white gloves, heavy black boots. ",
        "b": "Redraw Big Stan, the deep dish pizza slice, as a plump, heavy, pan-baked wedge: a thick rounded golden crust wall bulging around him like a pie pan, soft rounded corners, the top brimming with glossy red tomato sauce that spills over the rim and runs down his sides in fat drips, three round pepperoni, thick rounded arms with white gloves, heavy black boots. ",
        "c": "Redraw Big Stan, the Chicago deep dish pizza slice, soft and slumped: a deep, thick, bulging body that slouches a little, a puffy rounded crust wall, a lake of red sauce on top spilling over and dripping down him in long drips with a fat drop at the bottom, three round pepperoni, thick soft arms with white gloves, heavy black boots. ",
    }),
    "slice-jumbo": ("a small wobbly wavy line mouth, pompous and anxious", {
        "a": "Redraw Phil A. Buster, a huge jumbo New York style slice, softer and floppier. The crust edge is a thin, plain, flat crust, NOT rolled and NOT stuffed and not a tube. The slice is huge and thin, and the tip sags and droops over to one side under its own size, the way a jumbo slice folds when you hold it. Melted yellow cheese, three round pepperoni, small thin soft arms with white gloves, tiny thin legs and small red sneakers that look far too small for the huge slice. ",
        "b": "Redraw Phil A. Buster, an enormous thin floppy jumbo pizza slice. A thin, plain, slightly wavy crust edge, no roll and no tube and no stuffed crust. The long slice folds and bends in the middle and the whole tip flops down in a big droop, like a real jumbo slice held by the crust. Melted yellow cheese, three round pepperoni, thin soft noodle arms with white gloves, tiny thin legs and small red sneakers far too small for the huge body. ",
        "c": "Redraw Phil A. Buster, a gigantic wilting jumbo pizza slice: wide, thin and limp, the thin plain crust edge sags in a soft curve and the pointed tip hangs down and flops over to the side. Plain thin crust, not rolled, not stuffed. Melted yellow cheese, three round pepperoni, small thin soft arms with white gloves, tiny legs and small red sneakers. ",
    }),
    "slice-naples": ("a small flat line mouth tilted into a proud knowing smirk", {
        "a": "Redraw La Contessa, the small quick Neapolitan margherita pizza slice, softer. Keep her puffy charred crust with dark leopard spots, but make it rounder and plumper, and make the whole slice a soft rounded wedge with a gently bulging, curved outline and a rounded tip. Red tomato sauce, white mozzarella, three round slices of red tomato and three green basil leaves, thin soft arms with white gloves, brown sneakers. Smooth clean vector shapes, not pixel art. ",
        "b": "Redraw La Contessa, the Neapolitan margherita slice, as a soft, bendy, droopy slice: a big puffy leopard-spotted cornicione crust, a soft sagging body with bulging curved sides and a rounded drooping tip, red sauce, white mozzarella, three round tomato slices and three green basil leaves, noodle-soft arms with white gloves, brown sneakers. Smooth clean vector shapes, not pixel art. ",
        "c": "Redraw La Contessa, the Neapolitan margherita pizza slice, as a plump rounded little slice with a pillowy puffy blistered crust with dark leopard spots, soft curved edges, a gentle bend in the body and a rounded tip, red sauce, white mozzarella, three round tomato slices, three green basil leaves, soft rounded arms with white gloves, brown sneakers. Smooth clean vector shapes, not pixel art. ",
    }),
    "slice-ny": ("a flat or very slightly bent line mouth, deadpan", {
        "a": "Redraw Vinny, the New York cheese pizza slice, softer. Keep him recognisably the same Vinny: same crust, cheese, two pepperoni, white gloves and red sneakers. ",
        "b": "Redraw Vinny, the New York slice, as a soft, pillowy, slightly drooping slice, recognisably the same Vinny with the same crust, cheese, two pepperoni, white gloves and red sneakers. ",
    }),
}


# Round 2 (job 2): round 1 barely moved the silhouette (image 1 anchors the model), so these name the new shape outright.
SOFT2 = {
    "d": "The silhouette must NOT be a sharp straight-edged triangle: draw it as a soft rounded blob-like wedge, like a squishy plush toy, with both long sides bulging outward in curves, every corner fully rounded, and the bottom tip rounded like a fingertip. The body tilts and bends sideways a little. Limbs are thick soft rounded tubes. It must still read instantly as a pizza slice. ",
    "e": "The slice is made of soft bendable dough: the body curves in a gentle banana bend, the long sides are wavy and bulging, the crust end sags and the lower tip droops over to one side, all corners are rounded off, nothing is straight or rigid. Arms and legs are soft curvy noodles. It must still read instantly as a pizza slice. ",
}
TEXT2 = {
    "slice-deep": {
        "d": "Redraw Big Stan, the Chicago deep dish pizza slice, as a thick deep pan pizza: a plump, chunky, deep body with tall thick walls of golden crust all around it, the top full of glossy red tomato sauce that overflows the rim and runs down the front and sides in long fat drips with a drop at the bottom, three round pepperoni, thick round arms with white gloves, heavy black boots. ",
        "e": "Redraw Big Stan, the Chicago deep dish pizza slice: a heavy, thick, bulging slab-like body like a slice cut from a deep pan pie, slumping a little, crust walls puffed up like a pillow, sauce piled on top and dripping down him in long drips with a fat drop at the bottom, three round pepperoni, thick soft arms with white gloves, heavy black boots. ",
    },
    "slice-jumbo": {
        "d": "Redraw Phil A. Buster, a gigantic jumbo pizza slice with a thin plain crust edge: the crust is just a thin flat strip with a slightly wavy edge, absolutely NOT a rolled tube, NOT puffy, NOT stuffed. The huge thin slice is folded: the top part stands up, then the whole lower half folds over and flops down to one side in a big droop, like a real jumbo slice folding in a hand. Melted yellow cheese, three round pepperoni, thin soft arms with white gloves, tiny thin legs and small red sneakers far too small for the body. ",
        "e": "Redraw Phil A. Buster, a gigantic floppy jumbo pizza slice, thin as paper: a very thin flat plain crust strip along the top, no roll, no tube, no puffiness. The slice is so big and thin that it sags under its own weight and the pointed end curls and hangs down limply. Melted yellow cheese, three round pepperoni, thin soft arms with white gloves, tiny thin legs and small red sneakers far too small for the body. ",
    },
    "slice-naples": {
        "d": "Redraw La Contessa, the Neapolitan margherita pizza slice, with a very puffy, plump, blistered cornicione crust with dark leopard spots, red tomato sauce, white mozzarella, three round tomato slices and three green basil leaves, soft thin arms with white gloves, brown sneakers. Smooth clean vector shapes, not pixel art. ",
        "e": "Redraw La Contessa, the Neapolitan margherita slice, as a soft limp slice: a big pillowy leopard-spotted puffy crust, red sauce, white mozzarella, three round tomato slices and three green basil leaves, thin soft arms with white gloves, brown sneakers. Smooth clean vector shapes, not pixel art. ",
    },
}


def round2():
    for name in TEXT2:
        mouth = CHARS[name][0]
        lines = ['models = ["qwen-edit"]', "seeds = [1, 2, 3]", "width = 1024", "height = 1024",
                 'comfy_args = ["--reserve-vram", "1.5"]', 'template = "{action}"', ""]
        for tag, text in TEXT2[name].items():
            prompt = (f"Image 1 is {NAMES[name]}, a finished paper standee pizza slice mascot. " + text + SOFT2[tag]
                      + KEEP.format(mouth=mouth) + POSE + TAIL)
            refs = [f"characters/{name}/references/paper-master.png", SQ]
            lines += [f"[shots.s_{tag}]", f"refs = {json.dumps(refs)}", f"prompt = {json.dumps(prompt)}", ""]
        (ART / "characters" / name / "runs/soft_masters2.toml").write_text("\n".join(lines))


def main():
    for name, (mouth, variants) in CHARS.items():
        lines = ['models = ["qwen-edit"]', "seeds = [1, 2, 3]", "width = 1024", "height = 1024",
                 'comfy_args = ["--reserve-vram", "1.5"]', 'template = "{action}"', ""]
        for tag, text in variants.items():
            prompt = (f"Image 1 is {NAMES[name]}, a finished paper standee pizza slice mascot. " + text + SOFT[tag]
                      + KEEP.format(mouth=mouth) + POSE + TAIL)
            refs = [f"characters/{name}/references/paper-master.png", SQ]
            lines += [f"[shots.s_{tag}]", f"refs = {json.dumps(refs)}", f"prompt = {json.dumps(prompt)}", ""]
        (ART / "characters" / name / "runs/soft_masters.toml").write_text("\n".join(lines))
        print(name, len(variants), "variants")


if __name__ == "__main__":
    main()
    round2()
