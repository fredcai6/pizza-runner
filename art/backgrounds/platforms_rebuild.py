"""Rebuilds each city's platform tile with the street border (paper.STREET), keeping its card colours:
    python backgrounds/platforms_rebuild.py ASSETS_BACKGROUNDS   (from art/)
The colours are read back from the tile as it was (old layout: edge rows 4-5, card from row 4, plank at x 0 and 32), so this
only needs the old tile, not the runs that chose its colours. Rerunning it on a rebuilt tile reads the new layout instead."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import paper_ny_build as nb

CITIES = ("newyork", "chicago", "dc", "naples", "california")


def colours(t):
    top = {28: 4, 29: 5, 31: 6}[t.shape[0]]          # the card's first row, by tile layout (old 28-row tile: row 4)
    med = lambda block: tuple(int(v) for v in np.median(block.reshape(-1, 4)[:, :3], axis=0))
    return med(t[top + 6:top + 8, 34:62]), med(t[top + 3:top + 12, 32:33]), med(t[top:top + 2, 2:30])


for city in CITIES:
    p = Path(sys.argv[1]) / city / "platform.png"
    card, plank, edge = colours(np.asarray(Image.open(p).convert("RGBA")))
    Image.fromarray(nb.platform_tile(card, plank, edge), "RGBA").save(p, optimize=True)
    print(city, card, plank, edge)
