"""Copia la intro de BluBer (logo oficial animable) de Cube Swipe a src/html/studio.html.

Toma el bloque <div id="studio"> de ../../CubeSwipe/index.html (el #bb-logo con los trazos oficiales) y comprueba que todos los
trazos del logo oficial (blubergames-site/brand/bluber-logo.svg) estén dentro. No se redibuja nada.
Uso: python3 tools/extract-logo.py
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SRC = os.path.join(STUDIO_ROOT, "CubeSwipe", "index.html")
OFFICIAL = os.path.join(STUDIO_ROOT, "blubergames-site", "brand", "bluber-logo.svg")
OUT = os.path.join(HERE, "..", "src", "html", "studio.html")

html = open(SRC, encoding="utf-8").read()
m = re.search(r'<div id="studio".*?</svg>\s*</div>', html, re.S)
assert m, "no encontré el bloque #studio en Cube Swipe"
block = m.group(0)

def paths(s):
    return [re.sub(r"\s+", " ", d).strip() for d in re.findall(r'\sd="([^"]+)"', s)]

mine = set(paths(block))
if os.path.exists(OFFICIAL):
    off = paths(open(OFFICIAL, encoding="utf-8").read())
    missing = [d for d in off if d not in mine]
    print(f"trazos oficiales: {len(off)} · en la intro: {len(off) - len(missing)}")
    if missing:
        sys.exit(f"Faltan {len(missing)} trazos del logo oficial en la intro: revísalo antes de seguir")
block = re.sub(r"\n\s*\n", "\n", block)
open(OUT, "w", encoding="utf-8").write(block + "\n")
print("src/html/studio.html listo:", len(block) // 1024, "KB")
