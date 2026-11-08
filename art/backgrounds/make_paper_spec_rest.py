"""Writes one Qwen spec per city for the paper layers, doors and props of Chicago, DC, Naples and Long Beach (the New York pilot's
recipe, art/paper/STYLE.md). One spec = one GPU job: far, mid (both half scale, 1408x360 with overhang), a door per area, props.
    python backgrounds/make_paper_spec_rest.py   (from art/; inputs come from paper_prep.py and paper_prep_props.py into IN)
Writes backgrounds/CITY/runs/paper_CITY.toml (CITY = chicago, dc, naples, california). The prompts are the work: they live here."""
from pathlib import Path

IN = "/mnt/data/sprite-forge/paper-rest/in/"
NOTXT = " No text, letters, numbers, logos, signs or lettering anywhere; signs and flags are blank."
PAPER = "in the material of image 2"
BOLD = " Make every shape bold, simple and chunky like scissor cuts from card, with few large plain windows and no fine detail."
FLAT_PLANTS = " Trees and plants are flat pale-green paper blobs in one flat tone, with no trunk shading, no dark shadow shapes and nothing in pots."


def far(desc, view="a hazy distant city view"):
    return (f"Image 1 is {view}. Rebuild only the far background as pale layered cut paper " + PAPER + ": " + desc +
            " Flat shapes in only two or three very pale tones, no windows, no outlines, a faint paper grain. Remove everything near the camera: no trees with trunks, no billboards, no signs, no cars, no street lamps, no shop fronts, no roads, no railway, no small houses in front. A plain pale paper sky fills the top of the image." + NOTXT)


def mid(desc):
    return ("Image 1 is a strip of street buildings on flat magenta. Rebuild it as cut paper art " + PAPER + ": every building is one flat piece of coloured card, windows and doors are plain flat rectangles of a darker tone of the same card, shaded with just one soft tone. " + desc +
            " Faint paper grain, gently cut edges. No pen outlines, no line art, no brick or stone texture, no black, no white border, no cast shadows, no silhouettes. No bicycles, scooters, cars, barrels, crates, hydrants, flower pots or other small props. Keep the same layout, building positions and skyline shape. The flat magenta background stays perfectly flat magenta, including the strip along the bottom." + NOTXT + BOLD)


def door(desc):
    return ("Image 1 is a building entrance on flat magenta. Rebuild it as a paper cut-out standee " + PAPER + ": flat pieces of card in soft pastel colours with one soft shade each, a faint paper grain, gently cut edges, no outlines, no white border, no shadow. " + desc +
            " Across the top is a plain blank panel with no lettering at all. Front-on, standing on the ground at the bottom of the image. The background stays flat magenta." + NOTXT)


def props(barrel, crate):
    return ("Image 1 shows a burning barrel, an unlit barrel with charred sticks, and a barricade crate with hazard tape, on flat magenta. Rebuild each as a flat paper cut-out " + PAPER +
            f", in the same places and at the same size: flat pieces of card in soft pastel colours with one soft shade each and a faint paper grain, gently cut edges, no outlines, no white border, no shadow. The barrels are flat {barrel} card with two darker bands, the flame is a flat orange and yellow paper flame, the charred sticks are flat dark brown strips, the crate is flat {crate} card with slats and yellow and dark hazard tape stripes. The background stays flat magenta." + NOTXT)


CITIES = {
    "chicago": dict(props=props("teal-blue", "orange"), areas={
        "loop": dict(
            far="a distant downtown skyline of tall skyscraper towers: one very tall black-and-pale tower with two antennas, a tapering tower, and stepped Art Deco towers, in lavender, blue-grey and a touch of peach.",
            mid="Soft pastel lavender, dusty rose, cream and blue-grey colours. Tall narrow brick and stone office and loft buildings in a row with plain awnings. Keep the elevated railway: a pale lilac flat card girder deck across the top on slim card pillars, with a flat train car.",
            door="A 1920s downtown apartment building entrance: a pale limestone arch around a pair of dark wooden-and-glass doors, a flat metal canopy and two brass lamps, a stone step."),
        "lincolnpark": dict(
            far="a distant lakefront skyline of pale towers across a band of pale blue lake, with a low line of soft rounded pale-green treetops in front of it, in pale blue, grey-blue and pale sage.",
            mid="Soft pastel sage green, mint, cream, pale brick and dusty rose colours. Keep the big glass conservatory greenhouse with its pale-teal glass roof, the brick townhouses, and round trees as flat green paper blobs.",
            door="A Lincoln Park red-brick townhouse entrance: five stone steps up to a green wooden door with an arched window, a stone lintel, black iron railings either side and a lantern."),
        "wickerpark": dict(
            far="a hazy distant skyline of downtown towers and a few water towers, over low rooftops, in dusty rose, warm grey and pale peach.",
            mid="Soft pastel terracotta, dusty rose, sand and cream colours. Keep the red-brick two-flats with their outdoor wooden fire-escape staircases, rooftop water tanks, shop awnings and round trees as flat green paper blobs.",
            door="The back door of a corner tavern: a wooden porch with a short flight of plank stairs and railings up to a plain back door, a brick wall, a bare bulb lantern."),
    }),
    "dc": dict(props=props("navy-blue", "orange"), areas={
        "georgetown": dict(
            far="a distant hazy skyline of church spires, a university tower with a pointed roof, and the low arches of a stone bridge over pale river water, in pale peach, dusty rose and warm grey.",
            mid="Soft pastel brick red, terracotta, butter yellow, cream and dusty blue colours. Keep the narrow row houses and storefronts in a row with awnings and steep roofs; round trees as flat green paper blobs.",
            door="A Federal-style brick row house entrance: a black front door with a half-round fanlight window, white stone steps with black iron railings, a brass knocker and two lanterns, a red brick wall."),
        "mall": dict(
            far="the National Mall's distant landmarks: the tall pointed obelisk of the Washington Monument, the Capitol dome, and a low columned memorial temple, in pale blue, cream and warm grey, over a low line of pale treetops.",
            mid="Soft pastel green, sage, cream and pale blue colours. Keep the wide open lawn and the long rectangular reflecting pool, with rows of round trees as flat green paper blobs, and the low pale museum buildings.",
            door="A white marble museum entrance: wide steps up to tall bronze double doors framed by four tall fluted columns and a plain pediment."),
        "federal": dict(
            far="a distant skyline of formal government buildings: a pale dome, an obelisk and long flat-roofed blocks with rows of columns, in pale warm grey, cream and pale blue.",
            mid="Soft pastel cream, pale grey, warm white and pale blue colours. Keep the imposing government buildings in a row with their tall columns, pediments and repeated arched windows.",
            door="A grand government building entrance: wide stone steps up to tall bronze double doors between two huge fluted columns under a pediment, no flags."),
    }),
    "naples": dict(props=props("terracotta-orange", "teal"), areas={
        "harbor": dict(
            far="Mount Vesuvius, a gentle volcano cone with a flat top, over a pale sea with a low pale coastline and a small distant island, in pale blue, peach and soft lavender.",
            mid="Soft pastel yellow, peach, coral and cream colours with turquoise water at the bottom. Keep the harbour: the round-towered stone castle gate, the row of arcaded shop-front buildings, and a few small flat fishing boats on the water." + FLAT_PLANTS,
            door="A harbour-side fisherman's house entrance: a yellow plaster wall with an arched blue wooden door, a stone step, a striped awning and a coil of rope."),
        "center": dict(
            far="a distant skyline of pale church domes with patterned tile roofs and slim bell towers, and a faint pale Vesuvius, in pale peach, dusty pink and soft blue.",
            mid="Soft pastel ochre, terracotta, coral and cream colours. Keep the tall narrow buildings pressed together with arched ground floors, wrought-iron balconies, shutters and tiled eaves, and a hanging washing line of plain flat cloths." + FLAT_PLANTS,
            door="A Neapolitan palazzo entrance: a big arched wooden double door in an ochre stone portal with a carved stone surround, a small iron balcony above and an iron lantern."),
        "hillside": dict(
            far="the Bay of Naples seen from a hill: a pale blue bay, the cone of Vesuvius and the long pale coast of Sorrento, in pale blue, peach and soft pink.",
            mid="Soft pastel pink, mint, butter yellow, sky blue and coral colours. Keep the stepped hillside houses with terracotta tiled roofs, little balconies and outdoor stone stairs climbing between them." + FLAT_PLANTS,
            door="A hillside house entrance: a pink plaster wall with a green wooden door, three stone steps, a terracotta-tile roof edge above and a small iron balcony."),
    }),
    "california": dict(props=props("turquoise", "coral-orange"), areas={
        "downtown": dict(
            far="Long Beach seen from afar: the ocean liner Queen Mary with three tall funnels, a few mid-rise towers, and a few very tall thin palm trees as pale shapes, in pale peach, pink and soft turquoise. No clock tower and no clocks anywhere.",
            mid="Soft pastel butter yellow, coral, peach, turquoise and cream colours. Low stucco shop buildings with plain striped awnings in a row, and a few tall palm trees as flat paper cut-outs with a flat card trunk and flat fan-shaped fronds. No clock tower and no clocks anywhere.",
            door="A bright downtown corner shop entrance: a glass-and-wood door under a pastel striped awning, a small bench beside it, stucco walls."),
        "beach": dict(
            far="a pale seaside horizon: the Queen Mary ocean liner with three tall funnels on pale sea, a long pier with a small Ferris wheel, and a low pale headland, in pale turquoise, peach and cream.",
            mid="Soft pastel sand, turquoise, coral, butter yellow and cream colours. Flat low beach cafes and shops, two lifeguard towers on stilts as flat card cut-outs, tall palm trees as flat paper cut-outs with flat card trunks and flat fan-shaped fronds, and a low boardwalk rail." + FLAT_PLANTS,
            door="A beach surf shack entrance: weathered turquoise plank walls, a plank door, a palm-thatch awning and two flat surfboards leaning beside it."),
        "bungalows": dict(
            far="a dusk skyline: low soft hills, a few very tall thin palm trees as pale shapes and a faint far-off pier, in soft lavender, dusty pink and peach, under a dusk sky that fades from lavender to pink. No clock tower.",
            mid="Soft pastel sage green, warm tan, cream, dusty teal and butter yellow colours, a warm evening. A row of Craftsman bungalows: low wide gable roofs with deep eaves, deep front porches with tapered columns on stone piers, and tall palm trees as flat paper cut-outs with flat card trunks. Windows glow warm yellow." + FLAT_PLANTS,
            door="A warm generic California Craftsman bungalow, front-on: a single storey with a wide low-pitched gable roof with deep eaves and exposed rafters, a deep front porch with tapered columns on stone piers, a wooden front door with small window panes in the middle, three wooden steps, tan wood and sage-green siding, warm yellow glowing windows, and strings of coloured party lights in pink, cyan, yellow and purple along the porch roof and around the windows."),
    }),
}


def spec(city, d):
    out = f'run = "paper/{city}-1"\nseeds = [1, 2, 3]\nrefs = ["paper/style_pm_sq.png"]\n'
    n = 0
    for a, t in d["areas"].items():
        out += f'\n[shots.{a}_far]\ninput = "{IN}{a}-far-flat-ov-half.png"\nprompt = "{far(t["far"])}"\n'
        out += f'\n[shots.{a}_mid]\ninput = "{IN}{a}-mid-flat-ov-half.png"\nprompt = "{mid(t["mid"])}"\n'
        out += f'\n[shots.{a}_door]\ninput = "{IN}{a}-door.png"\nprompt = "{door(t["door"])}"\n'
        n += 3
    out += f'\n[shots.props]\ninput = "{IN}{city}-props.png"\nprompt = "{d["props"]}"\n'
    return out, n + 1


if __name__ == "__main__":
    for city, d in CITIES.items():
        text, n = spec(city, d)
        p = Path(__file__).parent / city / "runs"
        p.mkdir(exist_ok=True)
        (p / f"paper_{city}.toml").write_text(text)
        print(city, n, "shots")
