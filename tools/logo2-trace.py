"""Vectoriza el logo nuevo (brand/source/logo-wordmark.webp: RACE negro, LINE rojo y la curva roja) en piezas separadas
y las guarda en src/js/05-logo.js como LOGO2 (trazados SVG), para animarlas y dibujarlas nítidas a cualquier tamaño.
Uso (desde tools/): python3 logo2-trace.py [ruta de la imagen]"""
import json, os, sys
import cv2, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "brand", "source", "logo-wordmark.webp")
im = cv2.imread(src)
H0, W0 = im.shape[:2]
S = 4
big = cv2.resize(im, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC).astype(np.float32)
b, g, r = big[..., 0], big[..., 1], big[..., 2]
lum = 0.3 * r + 0.59 * g + 0.11 * b
redness = r - np.maximum(g, b)
red_a = np.clip((redness - 55) / 90.0, 0, 1)
blk_a = np.clip((150 - lum) / 70.0, 0, 1) * (redness < 55)
def binarize(a):
    a = cv2.GaussianBlur(a, (0, 0), S * 0.55)
    return (a > 0.5).astype(np.uint8)
masks = {"red": binarize(red_a), "black": binarize(blk_a)}

def path_of(mask):
    cs, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    parts = []
    for c in cs:
        if cv2.contourArea(c) < 40 * S * S: continue
        c = cv2.approxPolyDP(c, 0.45, True)[:, 0, :] / S
        parts.append("M" + "L".join("%.1f %.1f" % (x, y) for x, y in c) + "Z")
    return "".join(parts)

out = {"w": W0, "h": H0}
for name, m in masks.items():
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m, connectivity=8)
    comps = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < 300 * S * S / 4: continue
        comps.append({"id": i, "x": x / S, "y": y / S, "w": w / S, "h": h / S, "area": int(area / S / S)})
    comps.sort(key=lambda c: c["x"])
    print(name, [(round(c["x"]), round(c["y"]), round(c["w"]), round(c["h"]), c["area"]) for c in comps])
    for c in comps:
        c["d"] = path_of((lab == c["id"]).astype(np.uint8))
        del c["id"]
    out[name] = comps
sw = max(out["red"], key=lambda c: c["w"] * c["h"]); sw["role"] = "swoosh"
for c in out["red"]:
    c.setdefault("role", "line")
for c in out["black"]: c["role"] = "race"
dst = os.path.join(HERE, "..", "src", "js", "05-logo2.js")
with open(dst, "w") as f:
    f.write('"use strict";\n/* logo2.js: el logo RACELINE vectorizado (GENERADO por tools/logo2-trace.py). Piezas: black = RACE, red = LINE y la curva ("swoosh"). */\nconst LOGO2 = ' + json.dumps(out, separators=(",", ":")) + ";\n")
print("ok", dst, os.path.getsize(dst) // 1024, "KB")
