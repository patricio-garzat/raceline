"""Circuitos para pantallas grandes (compu): los mismos 44, estirados a lo ancho (mundo de 1600 x 1000) y con chicanes extra
en sus rectas largas, para que sean más largos y más complejos. La recta más larga se queda intacta para la salida.
Uso (desde tools/): python3 circuits.py desktop"""
import math
import numpy as np
import circuits as cc

W, H = 1600, 1000


def lerp(a, b, t): return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]


def good(c):
    m = cc.metrics(c); hw = c["roadW"] / 2; bx = m["bbox"]
    st, Ls = cc.pick_start(c)
    return m["rmin"] >= hw + 14 and m["sep"] >= c["roadW"] + 48 and bx[0] >= 95 and bx[2] <= W - 95 and bx[1] >= 75 and bx[3] <= 925 and Ls >= 210


def stretch(c, kx, rf):
    xs = [p[0] for p in c["poly"]]; cx = (min(xs) + max(xs)) / 2
    poly = [[round(W / 2 + (p[0] - cx) * kx, 1), p[1], round(p[2] * rf, 1)] for p in c["poly"]]
    d = dict(c); d["poly"] = poly
    d["lakes"] = [[round(W / 2 + (l[0] - cx) * kx, 1), l[1], round(l[2] * min(kx, 2.2), 1), l[3]] for l in c.get("lakes", [])]
    return d


def chicanes(c, minL=520):
    """Mete una chicane en cada recta larga (menos la más larga, que es la de la salida); si rompe las reglas, no se mete."""
    poly = c["poly"]; n = len(poly)
    L = [math.hypot(poly[(i + 1) % n][0] - poly[i][0], poly[(i + 1) % n][1] - poly[i][1]) for i in range(n)]
    longest = int(np.argmax(L)); sign = 1; added = 0
    order = [i for i in sorted(range(n), key=lambda i: -L[i]) if i != longest and L[i] > minL]
    new = {i: [] for i in range(n)}
    cur = dict(c)
    for i in order:
        A, B = poly[i], poly[(i + 1) % n]; ux, uy = (B[0] - A[0]) / L[i], (B[1] - A[1]) / L[i]; nx, ny = -uy, ux
        ok = False
        for off in (78, 60):
            for kk in range(2 if L[i] > 800 else 1):
                u0 = 0.5 if (L[i] <= 800) else (0.3 + 0.4 * kk)
                p1 = lerp(A, B, u0 - 0.1); p2 = lerp(A, B, u0 + 0.1)
                add = [[round(p1[0] + nx * off * sign, 1), round(p1[1] + ny * off * sign, 1), 72], [round(p2[0] - nx * off * sign, 1), round(p2[1] - ny * off * sign, 1), 72]]
                trial = {k: list(v) for k, v in new.items()}; trial[i] = trial[i] + add
                tp = []
                for j in range(n):
                    tp.append(poly[j]); tp.extend(trial[j])
                t = dict(c); t["poly"] = tp
                if good(t): new = trial; ok = True; added += 1; sign = -sign
                else: ok = ok
            if ok: break
    tp = []
    for j in range(n):
        tp.append(poly[j]); tp.extend(new[j])
    out = dict(c); out["poly"] = tp
    return out, added


EDGE_T = {"top": "left", "bottom": "right", "left": "top", "right": "bottom"}

def transpose(c, sc, rf):
    """Gira el circuito (x<->y) y lo agranda: los circuitos altos y angostos aprovechan mejor la pantalla ancha."""
    xs = [p[0] for p in c["poly"]]; cx = (min(xs) + max(xs)) / 2
    poly = [[round(W / 2 + (p[1] - 500) * sc, 1), round(500 + (p[0] - cx) * sc, 1), round(p[2] * sc * rf, 1)] for p in c["poly"]]
    d = dict(c); d["poly"] = poly
    d["lakes"] = [[round(W / 2 + (l[1] - 500) * sc, 1), round(500 + (l[0] - cx) * sc, 1), round(l[3] * sc, 1), round(l[2] * sc, 1)] for l in c.get("lakes", [])]
    for k in ("waterEdge", "cityEdge"):
        if c.get(k): d[k] = EDGE_T[c[k]]
    return d


def rotated(c):
    xs = [p[0] for p in c["poly"]]; ys = [p[1] for p in c["poly"]]
    s0 = min(850.0 / max(max(xs) - min(xs), 1), 1400.0 / max(max(ys) - min(ys), 1), 2.6)
    k = s0
    while k > 1.0:
        for rf in (1.0, 1.1, 0.95):
            t = transpose(c, k, rf)
            if good(t):
                t2, a = chicanes(t)
                return t2, a, round(k, 2)
        k *= 0.95
    return None, 0, 0


def desktopize(c):
    xs = [p[0] for p in c["poly"]]; width = max(xs) - min(xs)
    k0 = min(3.4, 1400.0 / max(width, 1))
    ks = []; k = k0
    while k > 1.0: ks.append(k); k *= 0.93
    ks.append(1.0)
    for kx in ks:
        for rf in (1.1, 1.0, 1.25, 1.4, 0.95):
            d = stretch(c, kx, rf)
            if good(d):
                d2, added = chicanes(d)
                if cc.metrics(d2)["per"] < 3300:   # circuitos que casi no se estiran: más chicanes en tramos medianos
                    d3, a3 = chicanes(d2, 300)
                    d2, added = d3, added + a3
                best = (d2, added, round(kx, 2))
                if cc.metrics(d2)["per"] < 3300:
                    r, ra, rk = rotated(c)
                    if r is not None and cc.metrics(r)["per"] > cc.metrics(d2)["per"] * 1.15: best = (r, ra, -rk)   # kx negativo = girado
                return best
    return None, 0, 0


def run():
    ccs = dict(cc.CC, **cc.CC2); levels = []; bad = []
    for i, c in enumerate(cc.ALL):
        d, added, kx = desktopize(c)
        if d is None:
            bad.append(c["name"]); d = stretch(c, 2.0, 1.0)
        m = cc.metrics(d)
        print(f"{i + 1:2d} {c['name']:15s} kx {kx:4.2f}  chicanes {added}  perím {m['per']:5.0f}  Rmín {m['rmin']:3.0f}  sep {m['sep']:3.0f}  {'' if d is not None and good(d) else '<-- REVISAR'}")
        levels.append(cc.make_level(i, d, 1 if i < len(cc.C) else 2, ccs[c["name"]], W=W, H=H))
    cc.write_levels(levels, "LEVELS_D", "15-levels-d.js", "levels-d.js: los circuitos de la compu (horizontal, 1600 x 1000, más largos y con chicanes extra).")
    print("sin ajustar:", bad)
