"""Circuitos del juego: uno por cada ciudad del calendario de Fórmula 1, simplificados y para jugarse en una pantalla vertical.
Cada uno: nombre, país (EN/ES), ancho de calle, punto de salida, tipo de entorno y polígono [x, y, radio] (en el sentido del orden de los puntos).
Las coordenadas están en el "mundo" del juego (640 x 1000); la línea central cabe en x 100..540, y 80..920.
Reglas: radio mínimo de la línea central >= ancho/2 + 14 y separación mínima entre tramos >= ancho + 34 (si no, la calle se "pellizca").
Uso: python3 circuits.py report   → tabla de medidas y avisos
     python3 circuits.py lab      → tools/lab3.png (laboratorio visual)
     python3 circuits.py game     → src/js/15-levels.js (el juego)
"""
import json, math, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))

def bottom(gap=0):  # agua / ciudad por debajo del circuito (se calcula con el recuadro del circuito)
    return ("bottom", gap)

C = [
 dict(name="Spielberg", sub=["Austria · Short and punchy", "Austria · Corto y directo"], roadW=96, start=[100,640], env="alpine",
      poly=[[100,880,90],[100,330,90],[250,120,80],[480,170,90],[400,400,80],[540,610,90],[330,900,80]]),
 dict(name="Monza", sub=["Italy · The temple of speed", "Italia · El templo de la velocidad"], roadW=96, start=[100,760], env="park",
      poly=[[100,920,120],[100,600,68],[175,525,68],[100,450,68],[100,170,80],[240,130,68],[330,185,68],[420,130,68],[540,170,80],[540,600,68],[470,675,68],[540,750,68],[540,920,120]]),
 dict(name="Las Vegas", sub=["USA · Neon straights", "EE. UU. · Rectas de neón"], roadW=92, start=[110,640], env="desert", cityEdge="right",
      poly=[[110,920,80],[110,150,80],[300,130,70],[300,290,64],[262,365,64],[262,520,64],[365,600,64],[540,600,70],[540,920,80]]),
 dict(name="Melbourne", sub=["Australia · Lakeside flow", "Australia · Fluido junto al lago"], roadW=92, start=[100,740], env="lake",
      lakes=[[320,300,100,50],[320,760,110,58]],
      poly=[[100,900,80],[100,540,62],[170,450,62],[100,360,62],[100,170,100],[540,110,100],[540,380,62],[470,480,62],[540,580,62],[540,900,80]]),
 dict(name="Montreal", sub=["Canada · Hairpin and the wall", "Canadá · Horquilla y el muro"], roadW=92, start=[130,700], env="park", waterEdge="bottom",
      poly=[[130,920,80],[130,240,80],[330,110,70],[540,240,70],[540,640,70],[430,730,64],[540,830,64],[460,920,70]]),
 dict(name="Sakhir", sub=["Bahrain · Heavy braking", "Baréin · Frenadas fuertes"], roadW=96, start=[110,640], env="desert",
      poly=[[110,920,90],[110,130,80],[330,130,70],[330,340,64],[540,340,70],[540,920,80],[430,920,64],[345,845,64],[260,920,64]]),
 dict(name="Barcelona", sub=["Spain · The test-track classic", "España · El clásico de pruebas"], roadW=92, start=[110,760], env="texas",
      poly=[[110,900,90],[110,330,80],[210,130,70],[390,100,70],[540,220,70],[490,380,64],[540,500,62],[420,590,62],[330,500,62],[240,610,62],[330,740,62],[540,760,70],[540,920,80]]),
 dict(name="Lusail", sub=["Qatar · Fast and flowing", "Catar · Rápido y fluido"], roadW=92, start=[100,700], env="desert",
      poly=[[100,920,90],[100,400,80],[250,130,80],[470,130,80],[540,400,70],[400,520,64],[540,650,64],[470,920,90]]),
 dict(name="Silverstone", sub=["Great Britain · Fast and flowing", "Gran Bretaña · Rápido y fluido"], roadW=94, start=[100,740], env="airfield",
      poly=[[100,920,90],[100,380,70],[180,170,70],[330,200,64],[410,100,64],[510,150,70],[540,380,70],[440,500,64],[540,640,64],[540,920,90]]),
 dict(name="Miami", sub=["USA · Stadium and chicanes", "EE. UU. · Estadio y chicanes"], roadW=92, start=[110,780], env="lake", boats=True,
      lakes=[[330,520,70,50]],
      poly=[[110,920,62],[110,470,72],[210,370,66],[110,250,64],[140,110,70],[400,100,70],[540,230,64],[430,340,64],[540,450,64],[540,720,70],[430,850,70],[310,780,66],[250,885,66]]),
 dict(name="Shanghai", sub=["China · The snail corner", "China · La curva caracol"], roadW=92, start=[110,780], env="park",
      lakes=[[400,740,90,60]],
      poly=[[110,920,90],[110,200,90],[290,100,70],[460,160,64],[540,300,64],[450,390,64],[330,330,64],[245,425,64],[330,530,64],[540,560,70],[540,920,90]]),
 dict(name="Yas Marina", sub=["Abu Dhabi · Marina hairpins", "Abu Dabi · Horquillas del puerto"], roadW=92, start=[110,780], env="harbor", waterEdge="bottom",
      poly=[[110,920,80],[110,240,70],[200,140,64],[330,140,64],[330,330,64],[210,410,64],[330,510,64],[540,470,70],[540,780,70],[440,890,64]]),
 dict(name="Austin", sub=["USA · Big hairpin, quick esses", "EE. UU. · Horquilla grande, eses rápidas"], roadW=92, start=[320,900], env="texas",
      poly=[[500,900,90],[500,150,64],[355,150,64],[355,270,64],[300,340,64],[300,440,64],[210,500,64],[130,570,64],[130,900,90]]),
 dict(name="Mexico City", sub=["Mexico · Through the stadium", "México · Por el estadio"], roadW=92, start=[110,780], env="tropical",
      poly=[[110,920,80],[110,260,70],[250,110,70],[470,150,70],[540,320,64],[400,420,64],[540,540,64],[500,750,70],[330,810,64],[290,920,70]]),
 dict(name="Interlagos", sub=["Brazil · Up and down, anticlockwise", "Brasil · Sube y baja, en sentido contrario"], roadW=94, start=[300,900], env="tropical",
      poly=[[100,900,70],[525,900,80],[530,640,70],[390,550,64],[480,440,64],[480,200,80],[260,130,64],[130,280,64],[270,420,64],[110,520,64]]),
 dict(name="Zandvoort", sub=["Netherlands · Banked dunes", "Países Bajos · Dunas peraltadas"], roadW=90, start=[160,700], env="desert", waterEdge="top",
      poly=[[160,880,80],[160,420,64],[250,330,64],[170,230,64],[300,130,70],[470,190,70],[500,380,64],[420,470,64],[510,600,64],[420,740,70],[500,880,80]]),
 dict(name="Jeddah", sub=["Saudi Arabia · Fast walls", "Arabia Saudita · Muros veloces"], roadW=90, start=[160,760], env="sea", waterEdge="bottom",
      poly=[[160,920,80],[160,500,62],[240,410,62],[160,320,62],[160,110,100],[400,110,100],[400,470,62],[330,560,62],[400,650,62],[400,920,80]]),
 dict(name="Baku", sub=["Azerbaijan · A very long straight", "Azerbaiyán · Una recta larguísima"], roadW=90, start=[500,320], env="sea", waterEdge="top",
      poly=[[505,140,70],[505,920,70],[360,920,62],[360,780,62],[230,780,62],[230,640,62],[105,640,62],[105,300,70],[300,140,70]]),
 dict(name="Madrid", sub=["Spain · The new urban circuit", "España · El nuevo circuito urbano"], roadW=92, start=[110,760], env="texas", cityEdge="top",
      poly=[[110,900,80],[110,260,70],[260,120,70],[400,200,64],[540,150,64],[540,500,64],[430,590,62],[540,690,62],[500,900,70]]),
 dict(name="Hungaroring", sub=["Hungary · Twisty and tight", "Hungría · Sinuoso y cerrado"], roadW=90, start=[130,740], env="sunflower",
      poly=[[130,900,80],[130,500,62],[250,400,62],[130,290,62],[300,130,70],[470,190,70],[510,400,62],[390,500,62],[490,610,62],[430,740,62],[510,900,70]]),
 dict(name="Suzuka", sub=["Japan · The figure-eight classic", "Japón · El clásico del ocho"], roadW=90, start=[120,740], env="forest",
      poly=[[120,900,90],[120,440,70],[225,340,62],[120,250,62],[215,140,64],[400,150,64],[400,300,62],[280,380,62],[430,450,62],[540,550,70],[540,900,90]]),
 dict(name="Singapore", sub=["Singapore · Night street circuit", "Singapur · Circuito nocturno"], roadW=88, start=[110,780], env="harbor", waterEdge="bottom", cityEdge="top",
      poly=[[110,920,70],[110,760,62],[250,760,62],[250,600,62],[110,600,62],[110,150,70],[265,110,64],[265,270,64],[405,270,64],[405,110,64],[545,110,70],[545,440,64],[400,440,64],[400,600,64],[545,600,64],[545,920,70]]),
 dict(name="Spa", sub=["Belgium · Legendary and long", "Bélgica · Legendario y largo"], roadW=90, start=[330,920], env="forest",
      poly=[[540,920,70],[190,920,70],[110,780,62],[190,690,62],[110,600,62],[110,480,70],[420,160,70],[540,290,70],[540,600,62],[470,680,62],[540,760,62]]),
 dict(name="Monaco", sub=["Monaco · Narrow streets", "Mónaco · Calles angostas"], roadW=88, start=[330,920], env="harbor", waterEdge="bottom", cityEdge="top",
      poly=[[540,920,60],[110,920,70],[130,640,62],[260,470,62],[200,240,70],[370,140,70],[500,260,62],[400,370,62],[500,490,62],[400,610,62],[530,740,70]]),
]
from circuits2 import C2, CC2
ALL = C + C2

def fillet(poly, step=3.0):
    n = len(poly); V = [(p[0], p[1]) for p in poly]; R = [p[2] for p in poly]; info = []
    for i in range(n):
        p, v, q = V[(i - 1) % n], V[i], V[(i + 1) % n]
        u = (v[0] - p[0], v[1] - p[1]); w = (q[0] - v[0], q[1] - v[1]); lu = math.hypot(*u); lw = math.hypot(*w)
        u = (u[0] / lu, u[1] / lu); w = (w[0] / lw, w[1] / lw)
        cr = u[0] * w[1] - u[1] * w[0]; th = math.acos(max(-1, min(1, u[0] * w[0] + u[1] * w[1])))
        info.append(dict(v=v, u=u, w=w, cr=cr, th=th, lu=lu, t=0 if th < 1e-3 else R[i] * math.tan(th / 2)))
    for _ in range(6):
        for i in range(n):
            a, b = info[i], info[(i + 1) % n]
            if a["t"] + b["t"] > b["lu"] * 0.98:
                f = b["lu"] * 0.98 / (a["t"] + b["t"]); a["t"] *= f; b["t"] *= f
    out = []
    for a in info:
        if a["t"] < 0.01: out.append(a["v"]); continue
        r = a["t"] / math.tan(a["th"] / 2); s = 1 if a["cr"] > 0 else -1
        A = (a["v"][0] - a["u"][0] * a["t"], a["v"][1] - a["u"][1] * a["t"]); Cc = (A[0] - a["u"][1] * s * r, A[1] + a["u"][0] * s * r)
        a0 = math.atan2(A[1] - Cc[1], A[0] - Cc[0]); steps = max(2, math.ceil(a["th"] * r / step))
        for k in range(steps + 1):
            ang = a0 + s * a["th"] * k / steps; out.append((Cc[0] + math.cos(ang) * r, Cc[1] + math.sin(ang) * r))
    return np.array(out)

def dense(P, step=3.0):
    """Remuestrea la línea central cada `step` unidades (las rectas largas solo tienen dos puntos y se saltaban las comprobaciones)."""
    Q = np.vstack([P, P[:1]]); seg = np.hypot(*np.diff(Q, axis=0).T); cum = np.concatenate([[0], np.cumsum(seg)])
    t = np.arange(0, cum[-1], step); return np.stack([np.interp(t, cum, Q[:, 0]), np.interp(t, cum, Q[:, 1])], axis=1)


def straights(c, step=3.0, tol=1.5):
    """Tramos rectos de la línea central: lista de (índice de inicio, largo en puntos) sobre dense(fillet), y la línea."""
    P = dense(fillet(c["poly"]), step); n = len(P)
    d = np.roll(P, -1, axis=0) - P; hh = np.arctan2(d[:, 1], d[:, 0]); w = int(30 / step)
    dif = lambda a, b: (a - b + math.pi) % (2 * math.pi) - math.pi
    ok = np.array([abs(dif(hh[(i + w) % n], hh[(i - w) % n])) < math.radians(tol) for i in range(n)])
    if ok.all(): return P, [(0, n)]
    s0 = int(np.argmin(ok)); runs = []; cur = None
    for k in range(n):
        if ok[(s0 + k) % n]:
            if cur is None: cur = [k, k]
            else: cur[1] = k
        elif cur: runs.append(((s0 + cur[0]) % n, cur[1] - cur[0] + 1)); cur = None
    if cur: runs.append(((s0 + cur[0]) % n, cur[1] - cur[0] + 1))
    return P, runs

def pick_start(c):
    """La salida va siempre en la recta más larga: con sitio para la parrilla detrás (unas 150 unidades) y para los boxes adelante."""
    P, runs = straights(c); step = 3.0; n = len(P)
    i0, ln = max(runs, key=lambda r: r[1]); L = ln * step
    k = int(i0 + (min(L - 90, max(150, L * 0.58))) / step) % n
    return [round(float(P[k][0]), 1), round(float(P[k][1]), 1)], L

def metrics(c):
    P = dense(fillet(c["poly"])); n = len(P)
    d = np.hypot(*(np.roll(P, -1, axis=0) - P).T); per = d.sum()
    st = 4; a, b, cc = np.roll(P, st, axis=0), P, np.roll(P, -st, axis=0)
    ab = np.hypot(*(a - b).T); bc = np.hypot(*(cc - b).T); ca = np.hypot(*(a - cc).T)
    area = np.abs((b[:, 0] - a[:, 0]) * (cc[:, 1] - a[:, 1]) - (cc[:, 0] - a[:, 0]) * (b[:, 1] - a[:, 1])) / 2
    with np.errstate(divide="ignore", invalid="ignore"): rad = np.where(area < 1e-6, 1e9, ab * bc * ca / (4 * area))
    Q = P[::2]; m = len(Q)
    D = np.hypot(Q[:, None, 0] - Q[None, :, 0], Q[:, None, 1] - Q[None, :, 1])
    idx = np.arange(m); gap = np.abs(idx[:, None] - idx[None, :]); gap = np.minimum(gap, m - gap) * 6.0
    D[gap < 190] = 1e9
    return dict(per=per, rmin=rad.min(), rat=int(rad.argmin()), sep=D.min(), bbox=(P[:, 0].min(), P[:, 1].min(), P[:, 0].max(), P[:, 1].max()), P=P)

def report():
    bad = 0
    for i, c in enumerate(ALL):
        m = metrics(c); hw = c["roadW"] / 2
        okr = m["rmin"] >= hw + 14; oks = m["sep"] >= c["roadW"] + 48
        st, Ls = pick_start(c)
        okst = Ls >= 210; nostr = "" if okst else " NO"
        bx = m["bbox"]; inbox = bx[0] >= 95 and bx[2] <= 545 and bx[1] >= 75 and bx[3] <= 925
        flag = "" if (okr and oks and inbox and okst) else "  <-- REVISAR"
        bad += bool(flag)
        print(f"{i + 1:2d} {c['name']:12s} perím {m['per']:5.0f}  Rmín {m['rmin']:4.0f} (≥{hw + 14:.0f}) {'ok' if okr else 'NO'}  sep {m['sep']:4.0f} (≥{c['roadW'] + 48}) {'ok' if oks else 'NO'}  caja {bx[0]:.0f},{bx[1]:.0f}-{bx[2]:.0f},{bx[3]:.0f}  recta {Ls:.0f}{nostr}{flag}")
    print("circuitos por revisar:", bad)

def lab():
    open(os.path.join(HERE, "_levels.js"), "w").write("const LEVELS_LAB = " + json.dumps(ALL) + ";\n")
    out = os.path.join(HERE, "lab3.png")
    subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless=new", "--hide-scrollbars", "--window-size=1530,3300",
                    "--screenshot=" + out, "--virtual-time-budget=4000", "file://" + HERE + "/track-lab3.html"], capture_output=True)
    print("ok", out)


def shore(P, side, hw, wave=14.0, W=640, H=1000):
    """Línea de costa que sigue al circuito por un lado (side: bottom/top/left/right). Devuelve puntos [x,y] en orden creciente del eje paralelo."""
    gap = hw + 66
    horiz = side in ("bottom", "top")
    ax = P[:, 0] if horiz else P[:, 1]          # eje paralelo
    ex = P[:, 1] if horiz else P[:, 0]          # eje perpendicular
    sgn = 1 if side in ("bottom", "right") else -1
    pts = []
    for t in range(-300, (W if horiz else H) + 300, 20):
        near = (np.abs(ax - t) < 150)
        e = (ex[near].max() if sgn > 0 else ex[near].min()) if near.any() else (ex.max() if sgn > 0 else ex.min())
        e += sgn * (gap + 8 * math.sin(t / 61.0) + wave * math.sin(t / 27.0 + 1.3))
        pts.append((t, e))
    es = np.array([p[1] for p in pts])
    for _ in range(6): es = np.convolve(np.pad(es, 6, mode="edge"), np.ones(13) / 13, mode="valid")  # suaviza
    # la costa no se acerca más que "gap" a la pista
    out = []
    for (t, _), e in zip(pts, es):
        near = (np.abs(ax - t) < 150)
        lim = (ex[near].max() + gap * 0.9 if sgn > 0 else ex[near].min() - gap * 0.9) if near.any() else e
        e = max(e, lim) if sgn > 0 else min(e, lim)
        out.append((t, e))
    return out

CC = {"Spielberg": "at", "Monza": "it", "Las Vegas": "us", "Melbourne": "au", "Montreal": "ca", "Sakhir": "bh", "Barcelona": "es", "Lusail": "qa",
      "Silverstone": "gb", "Miami": "us", "Shanghai": "cn", "Yas Marina": "ae", "Austin": "us", "Mexico City": "mx", "Interlagos": "br",
      "Zandvoort": "nl", "Jeddah": "sa", "Baku": "az", "Madrid": "es", "Hungaroring": "hu", "Suzuka": "jp", "Singapore": "sg", "Spa": "be", "Monaco": "mc"}

def make_level(i, c, grp, cc, W=640, H=1000):
    """Un nivel listo para el juego (agua, ciudad, costa) a partir de la definición de un circuito."""
    m = metrics(c); P = m["P"]; hw = c["roadW"] / 2
    water, city, lakes = [], [], [list(l) for l in c.get("lakes", [])]
    sh = None
    we = c.get("waterEdge")
    if we:
        pts = shore(P, we, hw, W=W, H=H); horiz = we in ("bottom", "top"); far = 3600 if we in ("bottom", "right") else -3600
        sh = {"side": we, "pts": [[round(a, 1), round(b, 1)] if horiz else [round(b, 1), round(a, 1)] for a, b in pts]}
        poly = [[a, b] if horiz else [b, a] for a, b in pts] + ([[pts[-1][0], far], [pts[0][0], far]] if horiz else [[far, pts[-1][0]], [far, pts[0][0]]])
        water.append([[round(x, 1), round(y, 1)] for x, y in poly])
    ce = c.get("cityEdge")
    if ce:
        pts = shore(P, ce, hw + 6, wave=0.0, W=W, H=H); horiz = ce in ("bottom", "top")
        for k in range(0, len(pts) - 1, 3):
            a0 = pts[k][0]; a1 = pts[min(k + 3, len(pts) - 1)][0]; e = pts[k][1]
            if ce == "bottom": city.append([a0, e + 8, a1, 3600])
            elif ce == "top": city.append([a0, -3600, a1, e - 8])
            elif ce == "right": city.append([e + 8, a0, 3600, a1])
            else: city.append([-3600, a0, e - 8, a1])
    return dict(id=i + 1, grp=grp, cc=cc, name=c["name"], sub=c["sub"], roadW=c["roadW"], start=pick_start(c)[0], poly=c["poly"], env=c["env"],
                water=water, lakes=lakes, city=city, shore=sh, boats=bool(c.get("boats")))

def write_levels(levels, name, fname, doc):
    txt = '"use strict";\n/* ' + doc + ' GENERADO por tools/circuits.py: no lo edites a mano. */\nconst ' + name + ' = [\n'
    txt += ",\n".join("  " + json.dumps(l, ensure_ascii=False, separators=(", ", ": ")) for l in levels) + "\n];\n"
    out = os.path.join(HERE, "..", "src", "js", fname)
    open(out, "w").write(txt)
    print("ok", os.path.abspath(out), len(levels), "niveles")

def game():
    ccs = dict(CC, **CC2)
    levels = [make_level(i, c, 1 if i < len(C) else 2, ccs[c["name"]]) for i, c in enumerate(ALL)]
    write_levels(levels, "LEVELS_P", "15-levels.js", "levels.js: los circuitos del celular (vertical, 640 x 1000).")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "report"
    if cmd == "report": report()
    elif cmd == "lab": lab()
    elif cmd == "game": game()
    elif cmd == "desktop":
        import desktop; desktop.run()
