"""Junta las banderas (brand/flags/*.png, de flagcdn.com, 640 px de ancho) en src/js/12-flags.js, con sus colores principales.
Uso (desde tools/): python3 make-flags.py"""
import base64, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
COLORS = {  # colores de la bandera, de izquierda a derecha o de arriba abajo (sirven para las franjas de la interfaz)
 "at": ["#ED2939", "#FFFFFF", "#ED2939"], "it": ["#009246", "#FFFFFF", "#CE2B37"], "us": ["#B22234", "#FFFFFF", "#3C3B6E"],
 "au": ["#012169", "#FFFFFF", "#E4002B"], "ca": ["#D80621", "#FFFFFF", "#D80621"], "bh": ["#FFFFFF", "#CE1126"],
 "es": ["#AA151B", "#F1BF00", "#AA151B"], "qa": ["#FFFFFF", "#8A1538"], "gb": ["#012169", "#FFFFFF", "#C8102E"],
 "cn": ["#DE2910", "#FFDE00"], "ae": ["#FF0000", "#00732F", "#FFFFFF", "#000000"], "mx": ["#006847", "#FFFFFF", "#CE1126"],
 "br": ["#009C3B", "#FFDF00", "#002776"], "nl": ["#AE1C28", "#FFFFFF", "#21468B"], "sa": ["#006C35", "#FFFFFF"],
 "az": ["#00B5E2", "#EF3340", "#509E2F"], "hu": ["#CD2A3E", "#FFFFFF", "#436F4D"], "jp": ["#FFFFFF", "#BC002D"],
 "fr": ["#0055A4", "#FFFFFF", "#EF4135"], "de": ["#000000", "#DD0000", "#FFCE00"], "pt": ["#006600", "#FF0000"], "ar": ["#74ACDF", "#FFFFFF", "#74ACDF"], "tr": ["#E30A17", "#FFFFFF"], "eg": ["#CE1126", "#FFFFFF", "#000000"], "za": ["#007A4D", "#FFB612", "#DE3831", "#002395"],
 "sg": ["#EF3340", "#FFFFFF"], "be": ["#000000", "#FDDA24", "#EF3340"], "mc": ["#CE1126", "#FFFFFF"],
}
out = {}
for cc, cols in COLORS.items():
    with open(os.path.join(HERE, "..", "brand", "flags", cc + ".png"), "rb") as f:
        out[cc] = {"src": "data:image/png;base64," + base64.b64encode(f.read()).decode(), "c": cols}
with open(os.path.join(HERE, "..", "src", "js", "12-flags.js"), "w") as f:
    f.write('"use strict";\n/* flags.js: banderas de los países (flagcdn.com) y sus colores. GENERADO por tools/make-flags.py: no lo edites a mano. */\nconst FLAGS = ' + json.dumps(out, separators=(",", ":")) + ";\n")
print("ok", len(out), "banderas")
