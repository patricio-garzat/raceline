"""Convierte el logo oficial nuevo (logo.svg: R + RACELINE + BY BLUBER GAMES) en src/js/05-logo3.js (LOGO3), listo para animarse en el canvas.
Sin el recuadro negro del ícono (eso es solo para favicon / ícono de la app): queda la R en blanco, la franja roja, los cuadros de meta (como huecos
transparentes), RACE y LINE letra por letra, y la frase. Uso: python3 tools/logo3-build.py [ruta/a/logo.svg]"""
import re, sys, os, json, math

SRC = sys.argv[1] if len(sys.argv) > 1 else "/Users/patogtp/Desktop/Logo Design/RaceLine/logos/export/logo.svg"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "js", "05-logo3.js")
svg = open(SRC).read()

TOK = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")

def parse(d):
    """-> lista de subtrazos; cada uno es una lista de (cmd, [x,y,...]) en coordenadas absolutas (M, L, C, Q, Z)."""
    toks = TOK.findall(d); i = 0; cmd = None; x = y = sx = sy = 0.0; subs = []; cur = None; lastc = None
    def num():
        nonlocal i; v = float(toks[i]); i += 1; return v
    while i < len(toks):
        if re.match(r"[A-Za-z]", toks[i]): cmd = toks[i]; i += 1
        elif cmd in ("M", "m"): cmd = "L" if cmd == "M" else "l"
        if cmd in ("Z", "z"):
            if cur is not None: cur.append(("Z", [])); x, y = sx, sy
            continue
        rel = cmd.islower(); c = cmd.upper()
        if c == "M":
            nx, ny = num(), num()
            if rel: nx += x; ny += y
            x, y = nx, ny; sx, sy = x, y; cur = [("M", [x, y])]; subs.append(cur)
        elif c == "L":
            nx, ny = num(), num()
            if rel: nx += x; ny += y
            x, y = nx, ny; cur.append(("L", [x, y]))
        elif c == "H":
            nx = num(); x = nx + x if rel else nx; cur.append(("L", [x, y]))
        elif c == "V":
            ny = num(); y = ny + y if rel else ny; cur.append(("L", [x, y]))
        elif c == "C":
            p = [num() for _ in range(6)]
            if rel: p = [p[k] + (x if k % 2 == 0 else y) for k in range(6)]
            cur.append(("C", p)); x, y = p[4], p[5]
        elif c == "Q":
            p = [num() for _ in range(4)]
            if rel: p = [p[k] + (x if k % 2 == 0 else y) for k in range(4)]
            cur.append(("Q", p)); x, y = p[2], p[3]
        else:
            raise SystemExit("comando no soportado: " + cmd)
    return subs

def xform(subs, k=1.0, tx=0.0, ty=0.0):
    return [[(c, [(v * k + (tx if j % 2 == 0 else ty)) for j, v in enumerate(p)]) for c, p in sub] for sub in subs]

def bbox(sub):
    xs = []; ys = []
    for c, p in sub:
        xs += p[0::2]; ys += p[1::2]
    return [min(xs), min(ys), max(xs), max(ys)]

def ser(subs):
    out = []
    for sub in subs:
        for c, p in sub:
            out.append(c + " ".join(("%.1f" % v).rstrip("0").rstrip(".") for v in p))
    return "".join(out)

def attr(tag, name):
    m = re.search(r'(?<![\w-])' + name + r'="([^"]*)"', tag); return m.group(1) if m else None

# --- partes del SVG ---
icon = re.search(r'<g id="icon" transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)">(.*?)</g>', svg, re.S)
tx, ty, k = float(icon.group(1)), float(icon.group(2)), float(icon.group(3)); inner = icon.group(4)
paths = [(attr(t, "fill"), attr(t, "d"), t) for t in re.findall(r"<path[^>]*>", inner)]
R = next(d for f, d, t in paths if f == "#FAFAFA"); ACC = next(d for f, d, t in paths if 'id="accent"' in t); CHK = next(d for f, d, t in paths if f == "#0E0E0F")
word = re.search(r'<g id="wordmark">(.*?)</g>', svg, re.S).group(1); wp = [(attr(t, "fill"), attr(t, "d")) for t in re.findall(r"<path[^>]*>", word)]
RACE = next(d for f, d in wp if f == "#0E0E0F"); LINE = next(d for f, d in wp if f == "#FD1C22")
tag = re.search(r'<g id="tagline">(.*?)</g>', svg, re.S).group(1); TAG = re.findall(r'd="([^"]*)"', tag)[0]

mark = {"r": xform(parse(R), k, tx, ty), "acc": xform(parse(ACC), k, tx, ty), "chk": xform(parse(CHK), k, tx, ty)}

def letters(d):
    subs = parse(d); boxes = [bbox(s) for s in subs]; area = lambda b: (b[2] - b[0]) * (b[3] - b[1])
    parent = list(range(len(subs)))
    for i, b in enumerate(boxes):
        for j, c in enumerate(boxes):
            if i != j and area(c) > area(b) and c[0] - 0.5 <= b[0] and c[1] - 0.5 <= b[1] and c[2] + 0.5 >= b[2] and c[3] + 0.5 >= b[3]:
                if area(c) < area(boxes[parent[i]]) or parent[i] == i: parent[i] = j
    groups = {}
    for i in range(len(subs)):
        r = i
        while parent[r] != r: r = parent[r]
        groups.setdefault(r, []).append(i)
    res = []
    for r, idx in groups.items():
        ss = [subs[i] for i in idx]; bb = [bbox(s) for s in ss]
        res.append({"d": ser(ss), "box": [min(b[0] for b in bb), min(b[1] for b in bb), max(b[2] for b in bb), max(b[3] for b in bb)]})
    return sorted(res, key=lambda l: l["box"][0])

race, line = letters(RACE), letters(LINE); tagp = parse(TAG); tb = [bbox(s) for s in tagp]
tagbox = [min(b[0] for b in tb), min(b[1] for b in tb), max(b[2] for b in tb), max(b[3] for b in tb)]
allb = [bbox(s) for key in ("r", "acc", "chk") for s in mark[key]] + [l["box"] for l in race + line] + [tagbox]
pad = 8; x0 = min(b[0] for b in allb) - pad; y0 = min(b[1] for b in allb) - pad; x1 = max(b[2] for b in allb) + pad; y1 = max(b[3] for b in allb) + pad
LOGO = {"vb": [round(x0, 1), round(y0, 1), round(x1 - x0, 1), round(y1 - y0, 1)], "r": ser(mark["r"]), "acc": ser(mark["acc"]), "chk": ser(mark["chk"]),
        "race": race, "line": line, "tag": {"d": ser(tagp), "box": [round(v, 1) for v in tagbox]}}
for l in LOGO["race"] + LOGO["line"]: l["box"] = [round(v, 1) for v in l["box"]]
with open(OUT, "w") as f:
    f.write('"use strict";\n/* logo3.js: el logo RACELINE (R + palabra + frase, sin el recuadro del ícono). GENERADO por tools/logo3-build.py: no lo edites a mano. */\nconst LOGO3 = ')
    json.dump(LOGO, f, separators=(",", ":")); f.write(";\n")
print("ok", os.path.abspath(OUT), "vb", LOGO["vb"], "RACE", len(race), "letras; LINE", len(line), "letras")
