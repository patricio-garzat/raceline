"""Genera los íconos de RaceLine a partir de ../../brand/source/icon-1024.png (render de icon-art.html con Chrome sin ventana).

- AppIcon: el original, a sangre y sin transparencia (iOS le pone su máscara redondeada).
- AppIcon-Dev: igual, con una franja ámbar "DEV" abajo (para "RaceLine Dev", la de dev-install.sh).
- brand/favicon.png, favicon-32.png y apple-touch-icon.png para la web.
Uso: python3 -I tools/make-icons.py
"""
import json
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, "..")
BRAND = os.path.abspath(os.path.join(APP, "..", "brand"))
ART = None
MASTER = os.path.join(BRAND, "source", "logo-1024.png")   # lo genera tools/logo-trace.py a partir del logo del usuario
ASSETS = os.path.join(APP, "ios", "App", "App", "Assets.xcassets")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

im = Image.open(MASTER).convert("RGB")
assert im.size == (1024, 1024), im.size
im.save(MASTER)

CONTENTS = {"images": [{"filename": "AppIcon-512@2x.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}],
            "info": {"author": "xcode", "version": 1}}

def write_set(name, img):
    d = os.path.join(ASSETS, name + ".appiconset")
    os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, "AppIcon-512@2x.png"))
    json.dump(CONTENTS, open(os.path.join(d, "Contents.json"), "w"), indent=2)

write_set("AppIcon", im)

dev = im.copy()
dr = ImageDraw.Draw(dev)
dr.rectangle([0, 819, 1024, 1024], fill=(253, 28, 34))
font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 128, index=1)
w = dr.textlength("DEV", font=font)
dr.text(((1024 - w) / 2, 842), "DEV", font=font, fill=(255, 255, 255))
write_set("AppIcon-Dev", dev)

os.makedirs(BRAND, exist_ok=True)
im.resize((180, 180), Image.LANCZOS).save(os.path.join(BRAND, "apple-touch-icon.png"))
fav = im.resize((64, 64), Image.LANCZOS)
fav.save(os.path.join(BRAND, "favicon.png"))
fav.resize((32, 32), Image.LANCZOS).save(os.path.join(BRAND, "favicon-32.png"))
print("íconos listos")
