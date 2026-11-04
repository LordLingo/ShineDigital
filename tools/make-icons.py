#!/usr/bin/env python3
"""
Makes the favicon and the phone home-screen icon from the logo.

    python3 tools/make-icons.py        (needs Pillow, numpy, scipy)

Takes assets/shine-logo.png (transparent), keeps only the S ribbon with its sparkle
(drops the "HINE" and "DIGITAL" lettering) and sets it on the page's dark background.
Writes into public/:  favicon-32.png  favicon.ico  apple-touch-icon.png
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = (12, 9, 19)

im = Image.open(os.path.join(ROOT, "assets", "shine-logo.png")).convert("RGBA")
a = np.array(im)
labels, n = ndimage.label(a[..., 3] > 40, structure=np.ones((3, 3)))
sizes = ndimage.sum(np.ones_like(labels), labels, index=range(1, n + 1))
a[labels != 1 + int(np.argmax(sizes)), 3] = 0  # the biggest piece is the S with its sparkle
mark = Image.fromarray(a)
mark = mark.crop(mark.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox())


def icon(size, pad):
    canvas = Image.new("RGBA", (size, size), BG + (255,))
    inner = int(size * (1 - 2 * pad))
    s = min(inner / mark.width, inner / mark.height)
    m = mark.resize((max(1, round(mark.width * s)), max(1, round(mark.height * s))), Image.LANCZOS)
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return canvas.convert("RGB")


pub = os.path.join(ROOT, "public")
big = icon(180, 0.15)
big.save(os.path.join(pub, "apple-touch-icon.png"), optimize=True)
icon(32, 0.05).save(os.path.join(pub, "favicon-32.png"), optimize=True)
big.save(os.path.join(pub, "favicon.ico"), sizes=[(48, 48), (32, 32), (16, 16)])
print("wrote public/apple-touch-icon.png, favicon-32.png, favicon.ico")
