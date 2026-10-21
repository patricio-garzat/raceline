"""Prepara el monoplaza del juego a partir de la imagen que dio el usuario (brand/source/car-photo.png, vista desde arriba, fondo transparente).
Genera src/js/27-carimg.js con dos imágenes incrustadas (nariz hacia +x, 1152 px de largo):
  base: el carro blanco con sus sombras (se tiñe por multiplicación)
  mask: RGB opaco; R = carrocería, G = alerones, B = casco (qué partes se pueden pintar)
Uso (desde tools/): python3 make-car-asset.py [ruta de la imagen]"""
import base64, os, sys
import cv2, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "brand", "source", "car-photo.png")
im = cv2.imread(src, cv2.IMREAD_UNCHANGED)
assert im is not None and im.shape[2] == 4, "se necesita un PNG con transparencia"
B, G, R, A = [im[:, :, i].astype(np.float32) for i in range(4)]
A = np.where(A < 40, 0, A)                       # fuera el halo tenue
ys, xs = np.where(A > 128); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
print("caja del carro", x0, x1, y0, y1)

lum = np.minimum(np.minimum(B, G), R)
white = np.clip((lum - 140) / 45.0, 0, 1) * (A / 255.0)
yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
rel = (yy - y0) / float(y1 - y0)                 # 0 = atrás, 1 = frente
wing = ((rel < 0.115) | ((rel > 0.80) & ((np.abs(xx - 512) > 50) | (yy > 1425)))).astype(np.float32)
helm = (((xx - 510) / 54.0) ** 2 + ((yy - 690) / 68.0) ** 2 <= 1).astype(np.float32)
helm = cv2.GaussianBlur(helm, (0, 0), 1.2)
m_wing = white * wing
m_helm = white * (1 - wing) * helm + (1 - wing) * helm * (A / 255.0) * (1 - white) * 0   # el visor oscuro se queda oscuro
m_body = white * (1 - wing) * (1 - helm)

def prep(arr, interp=cv2.INTER_AREA):
    c = arr[y0:y1, x0:x1]
    c = cv2.rotate(c, cv2.ROTATE_90_COUNTERCLOCKWISE)   # la nariz queda a la derecha
    L = 1152; h = int(round(c.shape[0] * L / c.shape[1]))
    return cv2.resize(c, (L, h), interpolation=interp)

base = prep(np.dstack([B, G, R, A]).astype(np.uint8))
mask = prep(np.dstack([m_helm * 255, m_wing * 255, m_body * 255]).astype(np.uint8))   # BGR: B=casco, G=alerones, R=carrocería
mask = np.dstack([mask, np.full(mask.shape[:2], 255, np.uint8)])
b64 = lambda a: base64.b64encode(cv2.imencode(".png", a, [cv2.IMWRITE_PNG_COMPRESSION, 9])[1].tobytes()).decode()
bb, mm = b64(base), b64(mask)
print("tamaño", base.shape[1], base.shape[0], "base KB", len(bb) // 1024, "mask KB", len(mm) // 1024)
out = os.path.join(HERE, "..", "src", "js", "27-carimg.js")
with open(out, "w") as f:
    f.write('"use strict";\n/* carimg.js: el monoplaza (foto vista desde arriba) incrustado. GENERADO por tools/make-car-asset.py: no lo edites a mano. */\n')
    f.write('const CARIMG_SRC = { w: %d, h: %d, base: "data:image/png;base64,%s", mask: "data:image/png;base64,%s" };\n' % (base.shape[1], base.shape[0], bb, mm))
cv2.imwrite(os.path.join(HERE, "_car-base.png"), base); cv2.imwrite(os.path.join(HERE, "_car-mask.png"), mask)
print("ok", out)
