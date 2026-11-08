"""Writes runs/paper_ny.toml, the Qwen spec for the New York paper layers, doors and props (the prompts live here).
    python backgrounds/newyork/make_paper_spec.py   (from art/; inputs come from paper_prep.py and paper_prep_props.py)"""
from pathlib import Path

IN = "/mnt/data/sprite-forge/paper-ny/in/"
NOTXT = " No text, letters, numbers, logos, signs or lettering anywhere; signs and flags are blank."
PAPER = "in the material of image 2"


def far(desc):
    return ("Image 1 is a hazy distant city view. Rebuild only the far background as pale layered cut paper " + PAPER + ": " + desc +
            " Flat shapes in only two or three very pale tones, no windows, no outlines, a faint paper grain. Remove everything near the camera: no trees with trunks, no billboards, no signs, no cars, no street lamps, no shop fronts, no roads, no small houses in front. A plain pale paper sky fills the top of the image." + NOTXT)


def mid(desc):
    return ("Image 1 is a strip of street buildings on flat magenta. Rebuild it as cut paper art " + PAPER + ": every building is one flat piece of coloured card, windows and doors are plain flat rectangles of a darker tone of the same card, shaded with just one soft tone. " + desc +
            " Faint paper grain, gently cut edges. No pen outlines, no line art, no brick or stone texture, no black, no white border, no cast shadows. No bicycles, cars, barrels, crates, hydrants or other small props. Keep the same layout, building positions and skyline shape. The flat magenta background stays perfectly flat magenta, including the strip along the bottom." + NOTXT)


def near(desc):
    return ("Image 1 is sparse foreground clutter on flat magenta. Rebuild it as a few flat coloured paper cut-outs " + PAPER + ": " + desc +
            " Each is one flat colour with one soft shade and a faint paper grain, no black, no outline, no white border. Keep them along the bottom edge in the same places; everything else stays perfectly flat magenta." + NOTXT)


def door(desc):
    return ("Image 1 is a building entrance on flat magenta. Rebuild it as a paper cut-out standee " + PAPER + ": flat pieces of card in soft pastel colours with one soft shade each, a faint paper grain, gently cut edges, no outlines, no white border, no shadow. " + desc +
            " Across the top is a plain blank panel with no lettering at all. Front-on, standing on the ground at the bottom of the image. The background stays flat magenta." + NOTXT)


AREAS = {
    "wallstreet": dict(
        far="a distant skyline of tall skyscraper towers and pale stone bank buildings with tall columns and pediments, in lavender, blue-grey and a touch of peach.",
        mid="Soft pastel cream, lavender, peach and blue-grey colours. Keep the stone bank fronts with rows of tall columns and pediments, and the pizza shop with a striped awning.",
        near="a lilac bin, an orange fire hydrant, a green bush and a lamp post.",
        door="A grand bank entrance: two tall fluted stone columns either side of a pair of heavy double doors with brass handles, a stone pediment above them and wide steps up."),
    "centralpark": dict(
        far="a distant skyline of pale skyscrapers, one with an Art Deco spire, behind a low line of soft rounded pale-green treetops, in pale blue, grey-blue and pale sage.",
        mid="Soft pastel sage green, cream, pale brick and dusty rose colours. Keep the park: rows of round trees as flat green paper blobs on short trunks, a flat green lawn, the stone arch bridge, and add a round tiered stone fountain on the lawn.",
        near="a green bush, a cream park bench, a rose bush and a lamp post.",
        door="A park gatehouse entrance: a rustic stone archway covered in ivy with a wooden double door under a hanging lantern, flowering bushes either side."),
    "brooklyn": dict(
        far="the Brooklyn Bridge: two stone towers with pointed arches, the sagging cables and the deck, over pale water with a low pale shore, in pale peach, dusty rose and warm grey.",
        mid="Soft pastel terracotta, dusty rose, sand and cream colours. Keep the brownstones in a row with stoops, cornices, fire escapes and water tanks on the roofs; round trees as flat green paper blobs.",
        near="a green bush, a rose bin, a tipped cream crate and a lamp post.",
        door="A brownstone entrance: a brown stone stoop of six steps leading up to an arched wooden double door with a stone lintel, black iron railings either side and a lantern."),
}
PROPS = ("Image 1 shows a burning barrel, an unlit barrel with charred sticks, and a barricade crate with hazard tape, on flat magenta. Rebuild each as a flat paper cut-out " + PAPER +
         ", in the same places and at the same size: flat pieces of card in soft pastel colours with one soft shade each and a faint paper grain, gently cut edges, no outlines, no white border, no shadow. The barrels are flat blue-violet card with two darker bands, the flame is a flat orange and yellow paper flame, the charred sticks are flat dark brown strips, the crate is flat orange card with slats and yellow and dark hazard tape stripes. The background stays flat magenta." + NOTXT)

out = 'run = "paper/ny-1"\nseeds = [1, 2]\nrefs = ["paper/style_pm_sq.png"]\n'


def shot(name, inp, prompt, seeds=None):
    global out
    out += f'\n[shots.{name}]\ninput = "{IN}{inp}"\nprompt = "{prompt}"\n' + (f"seeds = {seeds}\n" if seeds else "")


for a, d in AREAS.items():
    for layer, f in (("far", far), ("mid", mid), ("near", near)):
        shot(f"{a}_{layer}", f"{a}-{layer}-flat-ov.png", f(d[layer]))
for a, d in AREAS.items():
    shot(f"{a}_door", f"{a}-door.png", door(d["door"]), [1, 2, 3])
shot("props", "newyork-props.png", PROPS, [1, 2, 3, 4])
(Path(__file__).parent / "runs/paper_ny.toml").write_text(out)
print(out.count("[shots."), "shots")


# ---- run 2: half-scale layers (1408x360 including the 128-column overhang); the build upscales them 2x
BOLD = " Make every shape bold, simple and chunky like scissor cuts from card, with few large plain windows and no fine detail."
out = 'run = "paper/ny-2"\nseeds = [1, 2, 3]\nrefs = ["paper/style_pm_sq.png"]\n'
shot("wallstreet_far", "wallstreet-far-skyline-half.png", far(AREAS["wallstreet"]["far"] + " Below the towers, plain pale flat buildings continue to the bottom edge.").replace("Image 1 is a hazy distant city view.", "Image 1 is a hazy distant skyline whose lower part is smeared flat."), [1, 2, 3, 4])
for a, d in AREAS.items():
    shot(f"{a}_mid", f"{a}-mid-flat-ov-half.png", mid(d["mid"]) + BOLD)
(Path(__file__).parent / "runs/paper_ny2.toml").write_text(out)
print(out.count("[shots."), "shots in run 2")
