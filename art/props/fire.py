# Pixel-art fire pickup (assets/backgrounds/props/fire*.png): a small flame with a plus badge, two flicker frames, spent embers.
# Usage (sprite-forge venv, PYTHONPATH=~/projects/sprite-forge): python art/props/fire.py assets/backgrounds/props
from PIL import Image
import sys
from pathlib import Path
out = sys.argv[1]
K = {'r': (214, 58, 40), 'o': (247, 128, 34), 'y': (255, 204, 51), 'w': (255, 244, 196),
     'b': (124, 76, 50), 'B': (84, 50, 34), 'g': (150, 140, 136), 'e': (190, 60, 36), 'P': (255, 255, 255), 'G': (52, 160, 76)}
PLUS = ["..GGG..", "..GPG..", "GGGPGGG", "GPPPPPG", "GGGPGGG", "..GPG..", "..GGG.."]
F1 = [
"....r.......",
"....rr......",
"...ror...r..",
"...roor..r..",
"..roooor.or.",
"..rooyoorror",
".rooyyyoooor",
".royyyyyooor",
"roywwyyyyoor",
"roywwwwyyyor",
"royywwwwyyor",
".oyywwwwyyo.",
"BbbbBbbbbBbB",
".BbbbbBbbbB.",
]
F2 = [
"........r...",
".......rr...",
"..r...ror...",
"..r..roor...",
".ro.roooor..",
"rorroyoooor.",
"roooyyyoooor",
"rooyyyyyyoor",
"rooywwyyyyor",
"royywwwwyyor",
"royywwwwyyor",
".oyywwwwyyo.",
"BbbbBbbbbBbB",
".BbbbbBbbbB.",
]
OUT = ["............"] * 9 + [
"....g...g...",
"...g...g....",
"..e.r.e..r..",
".reereereer.",
".oyereeyreo.",
"BbbbBbbbbBbB",
".BbbbbBbbbB.",
][-5:] 
OUT = ["............"] * 9 + [
"....g...g...",
"...g...g....",
"..e.r.e..r..",
".reereereer.",
"BbbbBbbbbBbB",
".BbbbbBbbbB.",
][:14]
def compose(flame, plus=True):
    W, H = 20, 16
    grid = [['.'] * W for _ in range(H)]
    for y, r in enumerate(flame):
        for x, c in enumerate(r): grid[H - len(flame) + y][x] = c
    if plus:
        for y, r in enumerate(PLUS):
            for x, c in enumerate(r):
                if c != '.': grid[y][12 + x] = c
    return [''.join(r) for r in grid]
def render(rows, name, s=5):
    """The pixel art at 5x, then the street sticker (paper.STREET: 4 px cream border and the rim, under the base too) and the
    props' solid shadow to the right, cut under the feet as fit_prop does."""
    import numpy as np
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backgrounds'))
    from paper import STREET, sticker
    w, h = len(rows[0]), len(rows)
    im = Image.new('RGBA', (w * s, h * s), (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == '.': continue
            for i in range(s):
                for j in range(s): px[x * s + i, y * s + j] = K[c] + (255,)
    st = sticker(np.asarray(im), shadow=(4, 3), **STREET)
    Image.fromarray(st[:st.shape[0] - 3], 'RGBA').save(f'{out}/{name}.png')
render(compose(F1), 'fire')
render(compose(F2), 'fire-2')
render(compose(OUT, False), 'fire-out')
