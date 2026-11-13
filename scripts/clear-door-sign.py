"""Erase a door painting's blank signboard when a straight crop would also cut the doorway (Central Park's arch rises into it).

Floods out the board from its top rows through every non-leaf colour, stopping at row LIMIT, drops leftover specks,
then redraws the paper sticker edge (cream border, ink shadow) along the newly exposed top.
    python3 scripts/clear-door-sign.py IN.png OUT.png
"""
import sys
from collections import deque
from PIL import Image, ImageFilter, ImageChops
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); W, H = im.size; px = im.load()
LIMIT = 80  # nothing below this row is touched by the flood
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
top = Image.new('L', im.size, 0); top.paste(255, (0, 0, W, LIMIT + 6))
ring = ImageChops.multiply(ring, top); shad = ImageChops.multiply(shad, top)
cream = Image.new('RGBA', im.size, (251, 246, 234, 255)); ink = Image.new('RGBA', im.size, (74, 52, 92, 255))
outimg = Image.new('RGBA', im.size, (0, 0, 0, 0))
outimg.paste(ink, (0, 0), shad); outimg.paste(cream, (0, 0), ring)
outimg.alpha_composite(im)
outimg.save(out)
print('removed', len(gone))
