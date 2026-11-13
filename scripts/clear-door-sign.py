"""Erase a door painting's blank signboard when a straight crop would also cut the doorway (Central Park's arch rises into it).

Floods out the board from its top rows through every non-leaf colour, stopping at row LIMIT, drops leftover specks,
then redraws the paper sticker edge (cream border, ink shadow) along the newly exposed top.
    python3 scripts/clear-door-sign.py IN.png OUT.png             # flood mode (Central Park's arch of leaves)
    python3 scripts/clear-door-sign.py IN.png OUT.png --roof      # roof mode: the board sits on a gable roof of the
        same colours as the board's frame, so instead of flooding, the roof's two top edges are fitted from the columns
        either side of the board and everything above them goes (the Bungalows).
"""
import sys
from collections import deque
from PIL import Image, ImageFilter, ImageChops
src, out = sys.argv[1], sys.argv[2]
ROOF = '--roof' in sys.argv
im = Image.open(src).convert('RGBA'); W, H = im.size; px = im.load()
LIMIT = 80  # nothing below this row is touched by the flood
def roof_cut():
    """The board and everything it left on the gable. Two lines are fitted (least squares) to each side of the roof,
    from the columns clear of the board and its border and shadow: the top of the roof's sticker border (kept as is
    outside the board) and the top of the wood itself (the cut under the board, where the border was hidden; the
    border is redrawn there afterwards). The board is the run of columns whose first opaque row is near the top."""
    pale = lambda c: c[3] > 0 and min(c[:3]) > 200            # the cream sticker border and the board's paper
    first = [next((y for y in range(H) if px[x, y][3] > 0), H) for x in range(W)]
    wood = [next((y for y in range(H) if px[x, y][3] > 0 and not pale(px[x, y]) and sum(px[x, y][:3]) > 200), H) for x in range(W)]
    board = [x for x in range(W) if first[x] < 8]
    lo, hi = min(board) - 16, max(board) + 16                 # the board, its border and its shadow
    def fit(xs, top):
        xs = [x for x in xs if top[x] < H]
        n = len(xs); mx = sum(xs) / n; my = sum(top[x] for x in xs) / n
        k = sum((x - mx) * (top[x] - my) for x in xs) / sum((x - mx) ** 2 for x in xs)
        return lambda x: my + k * (x - mx)
    L, R = range(max(0, lo - 60), lo), range(hi + 1, min(W, hi + 61))
    woodtop = lambda x: max(fit(L, wood)(x), fit(R, wood)(x))
    # The whole gable is cut to the wood and its border redrawn, so the outline has no step where the board was.
    cut = woodtop
    return {(x, y) for x in range(W) for y in range(min(H, int(cut(x)) + 1)) if px[x, y][3] > 0 and y < cut(x)}


if ROOF:
    gone = roof_cut()
else:
    leafy = lambda r, g, b: g > r + 10 and g > b + 10
    gone = set(); q = deque((x, y) for y in range(56) for x in range(W) if px[x, y][3] > 0)
    gone.update(q)
    while q:
        x, y = q.popleft()
        for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
            if 0 <= nx < W and 0 <= ny < LIMIT and (nx, ny) not in gone:
                r, g, b, a = px[nx, ny]
                if a > 0 and not leafy(r, g, b):
                    gone.add((nx, ny)); q.append((nx, ny))
for x, y in gone: px[x, y] = (0, 0, 0, 0)
# Strays: small opaque islands left above the arch once the sign is gone.
seen = set()
for y0 in range(LIMIT):
    for x0 in range(W):
        if px[x0, y0][3] == 0 or (x0, y0) in seen: continue
        comp, q = [(x0, y0)], deque([(x0, y0)]); seen.add((x0, y0))
        while q:
            x, y = q.popleft()
            for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1), (x+1, y+1), (x-1, y-1), (x+1, y-1), (x-1, y+1)):
                if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and px[nx, ny][3] > 0:
                    seen.add((nx, ny)); comp.append((nx, ny)); q.append((nx, ny))
        if len(comp) < 60:
            for x, y in comp: px[x, y] = (0, 0, 0, 0)
            print('stray', len(comp), x0, y0)
# Strays: tiny opaque specks left above the arch.
a = im.getchannel('A')
# Redraw the sticker edge along the cleared top: cream border, then the ink shadow offset down-right.
body = a.point(lambda v: 255 if v > 0 else 0)
border = body.filter(ImageFilter.MaxFilter(9))          # 4 px ring
shadow = Image.new('L', im.size, 0); shadow.paste(border, (3, 4))   # shifted, no wrap-around
ring = ImageChops.subtract(border, body)
shad = ImageChops.subtract(ImageChops.subtract(shadow, border), Image.new('L', im.size, 0))
top = Image.new('L', im.size, 0)
if ROOF:   # redraw the edge only next to what was cut away
    cleared = Image.new('L', im.size, 0); cleared.putdata([255 if (i % W, i // W) in gone else 0 for i in range(W * H)])
    top = cleared.filter(ImageFilter.MaxFilter(15))
else:
    top.paste(255, (0, 0, W, LIMIT + 6))
ring = ImageChops.multiply(ring, top); shad = ImageChops.multiply(shad, top)
cream = Image.new('RGBA', im.size, (251, 246, 234, 255)); ink = Image.new('RGBA', im.size, (74, 52, 92, 255))
outimg = Image.new('RGBA', im.size, (0, 0, 0, 0))
outimg.paste(ink, (0, 0), shad); outimg.paste(cream, (0, 0), ring)
outimg.alpha_composite(im)
outimg.save(out)
print('removed', len(gone))
