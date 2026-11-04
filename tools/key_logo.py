import os
import sys

import numpy as np
from PIL import Image

src, outdir = sys.argv[1], sys.argv[2]
G = np.array([12.0, 9.0, 19.0])  # page ground #0c0913
os.makedirs(outdir, exist_ok=True)


def rs(img, size):
    # resize with premultiplied alpha so edges stay clean
    return img.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")


def over(img, ground):
    a = np.asarray(img.convert("RGBA")).astype(np.float64)
    al = a[..., 3:4] / 255.0
    return a[..., :3] * al + np.array(ground) * (1.0 - al)


def save_rgb(arr, path):
    Image.fromarray(np.clip(arr.round(), 0, 255).astype(np.uint8)).save(path)


im = Image.open(src)
print("mode", im.mode, "size", im.size)
rgb = np.asarray(im.convert("RGB")).astype(np.float64)
h, w, _ = rgb.shape

f = 28
frame = np.concatenate([
    rgb[:f].reshape(-1, 3), rgb[-f:].reshape(-1, 3),
    rgb[:, :f].reshape(-1, 3), rgb[:, -f:].reshape(-1, 3)])
bg = np.median(frame, axis=0)
print("bg median", bg.tolist(), "| frame min", frame.min(0).tolist(),
      "max", frame.max(0).tolist(), "std", frame.std(0).round(2).tolist())


def band(name, y0, y1, x0, x1):
    b = rgb[int(h * y0):int(h * y1), int(w * x0):int(w * x1)].reshape(-1, 3)
    print(name, "mean", b.mean(0).round(2).tolist(), "max", b.max(0).tolist())


band("left-mid", .35, .65, .05, .15)
band("top-center", .04, .10, .45, .55)
band("bottom-center", .90, .96, .45, .55)
band("right-mid", .35, .65, .86, .95)

# colour-to-alpha against the measured background
d = np.clip(rgb - bg, 0, None)
a_raw = (d / (255.0 - bg)).max(axis=2)
A0 = 0.018
alpha = np.clip((a_raw - A0) / (1.0 - A0), 0.0, 1.0)
safe = np.maximum(alpha, 1e-4)[..., None]
C = np.clip(bg + (rgb - bg) / safe, 0, 255)
C[alpha < 1e-4] = bg

# fidelity: over its own background it should match the original
rec = C * alpha[..., None] + bg * (1 - alpha[..., None])
err = np.abs(rec - rgb)
print("fidelity over own bg: mean err", err.mean().round(3),
      "p99.9", np.percentile(err, 99.9).round(2), "max", err.max().round(1))

ys, xs = np.where(alpha > 0.02)
pad = 18
x0 = max(int(xs.min()) - pad, 0)
x1 = min(int(xs.max()) + pad + 1, w)
y0 = max(int(ys.min()) - pad, 0)
y1 = min(int(ys.max()) + pad + 1, h)
print("bbox", (x0, y0, x1, y1), "->", x1 - x0, "x", y1 - y0)

rgba = np.dstack([C, alpha * 255.0])[y0:y1, x0:x1]
full = Image.fromarray(np.clip(rgba.round(), 0, 255).astype(np.uint8))
H = 256
W = round(full.width * H / full.height)
small = rs(full, (W, H))
png = os.path.join(outdir, "shine-logo.png")
small.save(png, optimize=True)
print("final", small.size, os.path.getsize(png), "bytes")
try:
    wp = os.path.join(outdir, "shine-logo.webp")
    small.save(wp, quality=92, method=6, alpha_quality=100)
    print("webp", os.path.getsize(wp), "bytes")
except Exception as e:
    print("webp skipped:", e)


def canvas(wd, ht):
    return np.tile(G, (ht, wd, 1))


def place(base, img, x, y):
    arr = np.asarray(img).astype(np.float64)
    al = arr[..., 3:4] / 255.0
    hh, ww = arr.shape[:2]
    base[y:y + hh, x:x + ww] = arr[..., :3] * al + base[y:y + hh, x:x + ww] * (1 - al)
    return base


# header at 3x (56px css) and 2x (46px css)
h3 = rs(small, (round(W * 168 / H), 168))
b = canvas(h3.width + 80, 168 + 60)
save_rgb(place(b, h3, 40, 30), os.path.join(outdir, "prev-header-3x.png"))
h2 = rs(small, (round(W * 92 / H), 92))
b = canvas(h2.width + 60, 92 + 40)
save_rgb(place(b, h2, 30, 20), os.path.join(outdir, "prev-header-2x.png"))
# footer at 2x (88px css)
f2 = rs(small, (round(W * 176 / H), 176))
b = canvas(f2.width + 80, 176 + 60)
save_rgb(place(b, f2, 40, 30), os.path.join(outdir, "prev-footer-2x.png"))
# halo check: trimmed full size on the ground, difference boosted x6
fullarr = over(full, G)
boost = np.clip((fullarr - G) * 6 + G, 0, 255)
bim = Image.fromarray(boost.round().astype(np.uint8))
bim.thumbnail((1200, 1200))
bim.save(os.path.join(outdir, "prev-halo-check.png"))
print("previews written")
