"""Recorta el pitido de las luces de salida (F1 Starting light sound.mp3) y lo incrusta en src/js/12-startbeep.js (AAC).
Uso (desde tools/): python3 make-startbeep.py <wav decodificado del mp3> <carpeta temporal>"""
import base64, os, subprocess, sys, wave
import numpy as np
src, tmp = sys.argv[1], sys.argv[2]
w = wave.open(src); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels()
d = np.frombuffer(w.readframes(n), dtype=np.int16).reshape(-1, ch).astype(np.float32)
on = int(np.argmax(np.abs(d).max(axis=1) > 0.01 * 32768)); a = max(0, on - int(sr * 0.012)); b = a + int(sr * 0.5)
clip = d[a:b].copy(); fade = int(sr * 0.06); clip[-fade:] *= np.linspace(1, 0, fade)[:, None]
wav = os.path.join(tmp, "beep.wav"); o = wave.open(wav, "wb"); o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr); o.writeframes(clip.astype(np.int16).tobytes()); o.close()
m4a = os.path.join(tmp, "beep.m4a"); subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "128000", wav, m4a], check=True)
b64 = base64.b64encode(open(m4a, "rb").read()).decode()
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "js", "12-startbeep.js")
open(out, "w").write('"use strict";\n/* startbeep.js: el pitido de las luces de salida de la Fórmula 1 (recortado de "F1 Starting light sound.mp3"). GENERADO por tools/make-startbeep.py */\nconst START_BEEP = "' + b64 + '";\n')
print("ok", len(b64) // 1024, "KB base64")
