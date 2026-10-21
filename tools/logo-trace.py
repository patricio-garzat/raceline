"""Vectoriza el logo de RaceLine (brand/source/logo-original.png, el que dio el usuario) en capas para animarlo.
Capas: kerbTL y kerbBR (esquinas con pianos), ribUp y ribLow (la cinta roja, en dos tramos) y car (el monoplaza).
Las esquinas y la cinta se cortan en "rebanadas" ordenadas por distancia a lo largo de la forma, para poder dibujarlas con una barrida.
Salida: src/js/05-logo.js, brand/source/logo-1024.png (ícono a sangre) y brand/logo-ui.png (cuadrado redondeado con transparencia).
Uso: python3 tools/logo-trace.py
"""
import cv2, numpy as np, json, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "brand", "source", "logo-original.png")
full = np.array(Image.open(SRC).convert("RGB")).astype(np.int32)
dark = full.max(axis=2) < 40
ys, xs = np.where(dark)
x0, y0 = xs.min(), ys.min(); side = max(xs.max() - x0, ys.max() - y0) + 1
crop = full[y0:y0 + side, x0:x0 + side]; n = side
R = 275
yy, xx = np.mgrid[0:n, 0:n]; cx_ = np.clip(xx, R, n - 1 - R); cy_ = np.clip(yy, R, n - 1 - R)
inside = ((xx - cx_) ** 2 + (yy - cy_) ** 2) <= R * R

# ---- ícono a sangre y versión para la interfaz
img = Image.fromarray(crop.astype(np.uint8))
m = Image.fromarray((inside * 255).astype(np.uint8)).convert("L")
black = Image.new("RGB", img.size, (14, 14, 15))
bleed = Image.composite(img, black, m).resize((1024, 1024), Image.LANCZOS)
bleed.save(os.path.join(HERE, "..", "brand", "source", "logo-1024.png"))
S4 = 4 * 512; mk = Image.new("L", (S4, S4), 0); ImageDraw.Draw(mk).rounded_rectangle([0, 0, S4 - 1, S4 - 1], radius=int(S4 * R / n), fill=255)
ui = img.resize((512, 512), Image.LANCZOS).convert("RGBA"); ui.putalpha(mk.resize((512, 512), Image.LANCZOS))
ui.save(os.path.join(HERE, "..", "brand", "logo-ui.png"))

# ---- clasificación por color
pal = {"black": (14, 14, 15), "red": (253, 28, 34), "white": (250, 250, 250), "gray": (44, 44, 46), "dred": (150, 12, 16), "lgray": (150, 150, 152)}
names = list(pal); P = np.array([pal[k] for k in names])
cls = ((crop[:, :, None, :] - P[None, None, :, :]) ** 2).sum(axis=3).argmin(axis=2)
cls[~inside] = 0; cls[:2, :] = 0; cls[-2:, :] = 0; cls[:, :2] = 0; cls[:, -2:] = 0
def smooth(mm):
    b = cv2.GaussianBlur(mm.astype(np.float32), (0, 0), 1.1) > 0.5
    num, lab, st, _ = cv2.connectedComponentsWithStats(b.astype(np.uint8), connectivity=8)
    for j in range(1, num):
        if st[j, 4] < 25: b[lab == j] = False
    return b
red = smooth(np.isin(cls, [1, 4])); white = smooth(np.isin(cls, [2, 5])); gray = smooth(cls == 3)
union = red | white | gray

# ---- grupos
rnum, rlab = cv2.connectedComponents(red.astype(np.uint8), connectivity=8)
areas = sorted([(int((rlab == j).sum()), j) for j in range(1, rnum)], reverse=True)
ribLow = rlab == areas[0][1]; ribUp = rlab == areas[1][1]       # las dos cintas rojas grandes: la de abajo (la mayor) y la de arriba
ys_u, xs_u = np.where(ribUp); assert ys_u.mean() < 300, ys_u.mean()
print("cintas", areas[:4])
rest = union & ~ribLow & ~ribUp
num, lab, st, cen = cv2.connectedComponentsWithStats(rest.astype(np.uint8), connectivity=8)
groups = {"kerbTL": np.zeros_like(rest), "kerbBR": np.zeros_like(rest), "car": np.zeros_like(rest)}
for j in range(1, num):
    if st[j, 4] < 30: continue
    cx, cy = cen[j]
    if 500 < cx < 960 and 330 < cy < 880: g = "car"
    elif cx < 640 and cy < 500: g = "kerbTL"
    elif cx > 700 and cy > 700: g = "kerbBR"
    else: print("componente sin grupo", j, st[j], cen[j]); continue
    groups[g] |= lab == j
groups["ribUp"] = ribUp; groups["ribLow"] = ribLow
for k, v in groups.items(): print(k, int(v.sum()))

def contours_path(mask, eps=1.0, minarea=6):
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None: return ""
    hier = hier[0]
    for i, c in enumerate(cs):
        if hier[i][3] != -1 or cv2.contourArea(c) < minarea: continue
        parts = [c]; j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cs[j]) >= minarea: parts.append(cs[j])
            j = hier[j][0]
        for pc in parts:
            a = cv2.approxPolyDP(pc, eps, True).reshape(-1, 2)
            if len(a) < 3: continue
            out.append("M" + "L".join(f"{int(x)} {int(y)}" for x, y in a) + "Z")
    return "".join(out)

def geodesic(mask, seed):
    mm = mask.astype(np.uint8)
    ys_, xs_ = np.where(mm); k = ((xs_ - seed[0]) ** 2 + (ys_ - seed[1]) ** 2).argmin(); sx, sy = xs_[k], ys_[k]
    dist = np.full(mm.shape, -1, np.int32); dist[sy, sx] = 0
    cur = np.zeros_like(mm); cur[sy, sx] = 1; vis = cur.copy(); kern = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3)); step = 0
    while cur.any():
        nxt = cv2.dilate(cur, kern) & mm & (1 - vis); step += 1
        if not nxt.any(): break
        dist[nxt > 0] = step; vis |= nxt; cur = nxt
    return dist, (sx, sy)
def endpoints(mask):
    ys_, xs_ = np.where(mask); d1, _ = geodesic(mask, (xs_[0], ys_[0])); b = np.unravel_index(d1.argmax(), d1.shape)
    d2, _ = geodesic(mask, (b[1], b[0])); c = np.unravel_index(d2.argmax(), d2.shape)
    return (b[1], b[0]), (c[1], c[0])

classes = {"r": red, "w": white, "g": gray}
car_c = np.array([729.0, 593.0])
def slices_for(gname, pick, K):
    gm = groups[gname]; ea, eb = endpoints(gm); seed = pick(ea, eb)
    dist, sd = geodesic(gm, seed); mx = dist.max(); dist[(dist < 0) & gm] = mx
    out = []; step = mx / K; cent = []
    for i in range(K):
        lo, hi = i * step - 2.5, (i + 1) * step + (0.5 if i < K - 1 else 3)
        sl = gm & (dist >= lo) & (dist <= hi); d = {}
        yy2, xx2 = np.where(sl & (dist >= i * step) & (dist <= (i + 1) * step))
        if len(xx2): cent.append([int(xx2.mean()), int(yy2.mean())])
        elif cent: cent.append(cent[-1])
        else: cent.append([int(sd[0]), int(sd[1])])
        for ck, cm in classes.items():
            p = contours_path(sl & cm, eps=0.9)
            if p: d[ck] = p
        out.append(d)
    return {"slices": out, "seed": [int(sd[0]), int(sd[1])], "len": int(mx), "c": cent}
pick_min = lambda f: (lambda a, b: a if f(a) <= f(b) else b)
data = {"n": int(n), "R": R, "red": "#FD1C22", "white": "#FAFAFA", "gray": "#2C2C2E", "black": "#0E0E0F"}
data["kerbTL"] = slices_for("kerbTL", pick_min(lambda p: p[0]), 44)      # entra por el borde izquierdo
data["kerbBR"] = slices_for("kerbBR", lambda a, b: a if a[0] >= b[0] else b, 44)   # entra por el borde derecho
data["ribUp"] = slices_for("ribUp", pick_min(lambda p: p[1]), 52)       # desde la cola de arriba hacia el carro
data["ribLow"] = slices_for("ribLow", pick_min(lambda p: (p[0] - car_c[0]) ** 2 + (p[1] - car_c[1]) ** 2), 60)   # desde el carro hacia abajo
car = groups["car"]
data["car"] = {k: contours_path(car & cm, eps=0.8) for k, cm in classes.items()}
ys_, xs_ = np.where(car); data["carBox"] = [int(xs_.min()), int(ys_.min()), int(xs_.max()), int(ys_.max())]
# rumbo del carro: de las ruedas traseras a las delanteras
gnum, glab, gst, gcen = cv2.connectedComponentsWithStats((car & gray).astype(np.uint8), connectivity=8)
wheels = sorted([(gst[j, 4], tuple(gcen[j])) for j in range(1, gnum) if gst[j, 4] > 2500], reverse=True)[:4]
print('ruedas', wheels)
wc = np.array([w[1] for w in wheels]); wc = wc[np.argsort(wc[:, 1])]
rear, front = wc[:2].mean(axis=0), wc[2:].mean(axis=0); hv = front - rear; hv /= np.linalg.norm(hv)
data["carHeading"] = [round(float(hv[0]), 4), round(float(hv[1]), 4)]
data["carCenter"] = [round(float((rear[0] + front[0]) / 2), 1), round(float((rear[1] + front[1]) / 2), 1)]
print("ruedas", wheels, "rumbo", data["carHeading"], "centro", data["carCenter"], "semillas", data["ribUp"]["seed"], data["ribLow"]["seed"], data["kerbTL"]["seed"], data["kerbBR"]["seed"])
js = '"use strict";\n/* logo.js: el logo de RaceLine vectorizado en capas (GENERADO por tools/logo-trace.py; no se edita a mano). Coordenadas en un cuadrado de ' + str(n) + ' unidades. */\nconst LOGO = ' + json.dumps(data, separators=(",", ":")) + ";\n"
out = os.path.join(HERE, "..", "src", "js", "05-logo.js"); open(out, "w").write(js); print("05-logo.js", len(js) // 1024, "KB")
