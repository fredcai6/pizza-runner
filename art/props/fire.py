# Pixel-art fire pickup (assets/backgrounds/props/fire*.png): a small flame with a plus badge, two flicker frames, spent embers.
# Usage: python3 art/props/fire.py assets/backgrounds/props
from PIL import Image
import sys
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
def render(rows, name, s=5, pad=2):
    w, h = len(rows[0]), len(rows)
    im = Image.new('RGBA', ((w + pad * 2) * s, (h + pad) * s), (0, 0, 0, 0))
    px = im.load()
    filled = {(x, y) for y, r in enumerate(rows) for x, c in enumerate(r) if c != '.'}
    def put(x, y, c):
        for i in range(s):
            for j in range(s): px[(x + pad) * s + i, (y + pad) * s + j] = c
    for y in range(-pad, h):
        for x in range(-pad, w + pad):
            if (x, y) not in filled and any((x + dx, y + dy) in filled for dx in (-1, 0, 1) for dy in (-1, 0, 1)): put(x, y, (255, 250, 238, 255))
    for (x, y) in filled: put(x, y, K[rows[y][x]] + (255,))
    im.save(f'{out}/{name}.png')
render(compose(F1), 'fire')
render(compose(F2), 'fire-2')
render(compose(OUT, False), 'fire-out')
