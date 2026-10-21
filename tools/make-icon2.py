"""Ícono de la app a partir del logo nuevo: la "R" del logo en blanco con la curva roja, sobre negro.
Genera brand/source/logo-1024.png (el que usa app/tools/make-icons.py).
Uso (desde tools/): python3 make-icon2.py [variante: 1|2|3]"""
import os, sys
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "brand", "source", "logo-wordmark.webp")
OUT = os.path.join(HERE, "..", "brand", "source", "logo-1024.png")
variant = int(sys.argv[1]) if len(sys.argv) > 1 else 3

im = cv2.imread(SRC); S = 4
big = cv2.resize(im, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC).astype(np.float32)
b, g, r = big[..., 0], big[..., 1], big[..., 2]
lum = 0.3 * r + 0.59 * g + 0.11 * b; redness = r - np.maximum(g, b)
red_a = cv2.GaussianBlur(np.clip((redness - 55) / 90.0, 0, 1), (0, 0), S * 0.5)
blk_a = cv2.GaussianBlur(np.clip((150 - lum) / 70.0, 0, 1) * (redness < 55), (0, 0), S * 0.5)

# la curva roja = el componente rojo más grande
rm = (red_a > 0.5).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(rm, connectivity=8)
sw_id = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
swoosh = np.where(lab == sw_id, red_a, 0).astype(np.float32)

# la "R": del componente negro más a la izquierda ("RA" pegados) se separa con una erosión y se reparte por cercanía
bm = (blk_a > 0.5).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(bm, connectivity=8)
ids = sorted(range(1, n), key=lambda i: st[i, cv2.CC_STAT_LEFT]); ra = (lab == ids[0]).astype(np.uint8)
core = ra.copy(); parts = 1
for it in range(1, 40):
    core = cv2.erode(core, np.ones((3, 3), np.uint8)); k, cl = cv2.connectedComponents(core, connectivity=8)
    if k - 1 >= 2: parts = k - 1; break
print("erosiones", it, "partes", parts)
k, cl = cv2.connectedComponents(core, connectivity=8)
comps = sorted(range(1, k), key=lambda i: np.where(cl == i)[1].mean())
dist = [cv2.distanceTransform((cl != i).astype(np.uint8), cv2.DIST_L2, 3) for i in comps[:2]]
Rmask = ((ra > 0) & (dist[0] <= dist[1])).astype(np.float32)
R = blk_a * Rmask
R = cv2.morphologyEx(R, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))   # quita la rebaba que deja la pata de la A
ys, xs = np.where(R > 0.5); rx0, rx1, ry0, ry1 = xs.min(), xs.max(), ys.min(), ys.max()
print("R caja", rx0 // S, rx1 // S, ry0 // S, ry1 // S)

def crop(a, pad=0): ys, xs = np.where(a > 0.02); return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], xs.min(), ys.min()
Rc, _, _ = crop(R); Sc, sx0, sy0 = crop(swoosh)

N = 1024; SS = 2; M = N * SS
def layer(a, w, color, x, y, rot=0, grad=None):
    h = int(a.shape[0] * w / a.shape[1]); al = cv2.resize(a, (int(w), h), interpolation=cv2.INTER_AREA)
    img = np.zeros((h, int(w), 4), np.float32)
    if grad:
        t = np.linspace(0, 1, h)[:, None]; c0 = np.array(grad[0], np.float32) / 255; c1 = np.array(grad[1], np.float32) / 255
        img[..., :3] = (c0 * (1 - t[..., None]) + c1 * t[..., None]) if False else np.tile((c0[None, None, :] * (1 - t[:, :, None]) + c1[None, None, :] * t[:, :, None]), (1, int(w), 1))
    else: img[..., :3] = np.array(color, np.float32) / 255
    img[..., 3] = al
    pil = Image.fromarray((img * 255).astype(np.uint8))
    if rot: pil = pil.rotate(rot, resample=Image.BICUBIC, expand=True)
    return pil

bg = Image.new("RGBA", (M, M), (10, 10, 11, 255)); bd = ImageDraw.Draw(bg)
# fondo: negro con una luz suave arriba a la izquierda
lg = Image.new("L", (M, M), 0); ImageDraw.Draw(lg).ellipse([-M * 0.1, -M * 0.15, M * 0.75, M * 0.7], fill=60); lg = lg.filter(ImageFilter.GaussianBlur(M * 0.12))
bg = Image.composite(Image.new("RGBA", (M, M), (44, 44, 48, 255)), bg, lg)

def paste(base, lay, cx, cy):
    base.alpha_composite(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)))

if variant == 1:     # R grande, curva roja rodeándola
    sw = layer(Sc, M * 1.18, (253, 28, 34), 0, 0, rot=0); paste(bg, sw, M * 0.54, M * 0.56)
    rl = layer(Rc, M * 0.66, None, 0, 0, grad=[(255, 255, 255), (206, 208, 214)]); paste(bg, rl, M * 0.47, M * 0.47)
elif variant == 2:   # R centrada y curva grande abajo
    sw = layer(Sc, M * 1.05, (253, 28, 34), 0, 0, rot=-8); paste(bg, sw, M * 0.5, M * 0.64)
    rl = layer(Rc, M * 0.72, None, 0, 0, grad=[(255, 255, 255), (206, 208, 214)]); paste(bg, rl, M * 0.5, M * 0.44)
else:                # R muy grande, la curva pasa por detrás
    sw = layer(Sc, M * 1.3, (253, 28, 34), 0, 0, rot=12); paste(bg, sw, M * 0.5, M * 0.5)
    rl = layer(Rc, M * 0.8, None, 0, 0, grad=[(255, 255, 255), (206, 208, 214)]); paste(bg, rl, M * 0.5, M * 0.485)
bg = bg.convert("RGB").resize((N, N), Image.LANCZOS)
bg.save(OUT); bg.save(OUT.replace("logo-1024.png", "icon-v%d.png" % variant))
print("ok", OUT)
