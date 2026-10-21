"""Arma ../index.html (un solo archivo) a partir de src/: plantilla HTML, CSS y los JS en orden.

- src/html/template.html: marcadores <!--CSS-->  (en <style>), <!--STUDIO--> (logo de BluBer) y <!--JS-->.
- src/css/style.css y src/js/*.js (en orden alfabético: 00-core, 10-audio, 20-track, 30-render, 40-game, 50-ui, 60-intro).
- src/html/studio.html: el bloque <div id="studio"> con el logo oficial (lo genera tools/extract-logo.py).
Uso: python3 tools/build.py
"""
import glob
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
SRC = os.path.join(ROOT, "src")


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


html = read(os.path.join(SRC, "html", "template.html"))
css = read(os.path.join(SRC, "css", "style.css"))
js = "\n".join(read(p) for p in sorted(glob.glob(os.path.join(SRC, "js", "*.js"))))
studio_path = os.path.join(SRC, "html", "studio.html")
studio = read(studio_path) if os.path.exists(studio_path) else ""
if not studio:
    print("AVISO: falta src/html/studio.html (intro de BluBer). Corre: python3 tools/extract-logo.py")

assert "/*CSS*/" in html and "/*JS*/" in html and "<!--STUDIO-->" in html
html = html.replace("/*CSS*/", css).replace("<!--STUDIO-->", studio).replace("/*JS*/", js.replace("</script>", "<\\/script>"))
out = os.path.join(ROOT, "index.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print("index.html listo:", len(html) // 1024, "KB")
