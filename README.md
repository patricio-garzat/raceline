# RaceLine · BluBer Games

Un juego de carreras tranquilo y muy cuidado para iPhone y la web: dibuja la línea de carrera antes de arrancar y mira cómo corre tu carro contra tres rivales. 44 circuitos (24 de Gran Premio y 20 de ciudades del mundo), editor de carro, creador de circuitos propios y versión para compu.

**Beta en la web:** https://patricio-garzat.github.io/raceline/ (también desde https://blubergames.com)

## Probarlo
```bash
python3 -m http.server 8801
```
Abre `http://localhost:8801/`.

## Estructura
| Ruta | Qué es |
|---|---|
| `index.html` | El juego completo en un solo archivo. **Se genera**: no se edita a mano |
| `src/` | El código (`js/`, `css/`, `html/`) |
| `tools/build.py` | Arma `index.html`: `python3 tools/build.py` |
| `tools/circuits.py`, `circuits2.py`, `desktop.py` | Generan y validan los circuitos (celular y compu) |
| `brand/` | Favicons, banderas y arte de origen |
| `app/` | La app de iPhone (Capacitor) |
