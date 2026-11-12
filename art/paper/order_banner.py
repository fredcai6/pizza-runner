"""Cuts the WHO IS THE ORDER? banner out of Tommy's painted board room for the corkboard's theory page:
    python art/paper/order_banner.py   (sprite-forge venv, from the repo root) -> assets/paper/order-banner.png
The paper is told from the cork by its green channel (paper above 128, cork well under); the lettering inside is filled in."""
import numpy as np
from PIL import Image
from scipy import ndimage

BOX = (800, 0, 1505, 170)   # the banner's corner of assets/cutscenes/board/room.webp (1672x941)

c = np.asarray(Image.open("assets/cutscenes/board/room.webp").convert("RGB").crop(BOX)).astype(int)
paper = ndimage.binary_opening(c[..., 1] > 128, iterations=1)
lbl, n = ndimage.label(paper)
paper = ndimage.binary_fill_holes(lbl == 1 + int(np.argmax(ndimage.sum(paper, lbl, range(1, n + 1)))))
ys, xs = np.where(paper)
out = np.dstack([c, paper * 255]).astype(np.uint8)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
Image.fromarray(out, "RGBA").save("assets/paper/order-banner.png", optimize=True)
print(out.shape[1], out.shape[0])
