"use strict";
/* render.js: vista, fondo de ciudad en miniatura (claro y oscuro), carros y líneas */

const cv = $("c"), ctx = cv.getContext("2d");
let DPR = 1, VW = 0, VH = 0, SC = 1, OX = 0, OY = 0, bg = null, SAFE = { t: 0, b: 0 };

const PAL = {
  light: {
    ground: "#DDD5C3", sidewalk: "#F4EDE0", curb: "#D6CAB4", asphalt: "#2B2F36", edge: "#EDE5D4", dash: "rgba(243,235,221,.7)",
    roofs: ["#D9A58B", "#A9C1A0", "#C9C4BA", "#CFB59A", "#DDB8AA", "#B9B2A6", "#C4B49A"],
    park: "#9DB88C", parkLine: "rgba(255,255,255,.28)", trees: ["#6F9468", "#86AA7B"], treeShadow: "rgba(50,70,40,.22)",
    shadow: "rgba(70,50,30,.2)", hi: "rgba(255,255,255,.22)", lo: "rgba(60,40,25,.2)", lamps: false, plate: "#F2EBDC", streetLine: "rgba(255,255,255,.55)", vignette: 0.1,
  },
  dark: {
    ground: "#16191D", sidewalk: "#353B44", curb: "#2A2F37", asphalt: "#121519", edge: "#4A505B", dash: "rgba(205,210,220,.4)",
    roofs: ["#6A5547", "#56695A", "#5F6269", "#6B5F52", "#6D5B5B", "#50555C", "#5C5446"],
    park: "#33503B", parkLine: "rgba(255,255,255,.07)", trees: ["#2A4531", "#385B41"], treeShadow: "rgba(0,0,0,.3)",
    shadow: "rgba(0,0,0,.38)", hi: "rgba(255,255,255,.10)", lo: "rgba(0,0,0,.25)", lamps: true, plate: "#262B33", streetLine: "rgba(255,255,255,.14)", vignette: 0.28,
  },
};
const pal = () => PAL[resolvedTheme()];

function measureSafe() {
  const p = $("probe"), cs = getComputedStyle(p);
  SAFE = { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0 };
}
function layout() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  measureSafe();
  const topPad = SAFE.t + 112, botPad = SAFE.b + 92;
  SC = Math.min(VW / (WORLD.w - 40), (VH - topPad - botPad) / (WORLD.h - 40), 1.7);
  OX = (VW - WORLD.w * SC) / 2;
  OY = topPad + ((VH - topPad - botPad) - (WORLD.h - 40) * SC) / 2 - 20 * SC;
  if (TR) renderBackground();
}
function setWorld(g) { g.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * OX, DPR * OY); }
const toWorld = (e) => [(e.clientX - OX) / SC, (e.clientY - OY) / SC];

/* ---------- Utilidades de dibujo ---------- */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function mix(hex, t) { // t > 0 hacia blanco, t < 0 hacia negro
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function roadPath(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
function distToRoad(x, y) { const c = TR.C[TR.nearest(x, y)]; return hyp(x - c[0], y - c[1]); }

/* ---------- Fondo: ciudad en miniatura con un circuito urbano (se pinta una vez por tamaño, tema y nivel) ---------- */
// Curvatura (1/radio) y lado interior de cada punto de la pista
function curvatureInfo() {
  const { T, N } = TR, w = 4, k = new Float32Array(N), sg = new Int8Array(N);
  for (let i = 0; i < N; i++) {
    const a = T[(i - w + N) % N], b = T[(i + w) % N];
    const ang = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
    k[i] = Math.abs(ang) / (2 * w * TR.ds); sg[i] = Math.sign(ang);
  }
  return { k, sg };
}
// Tramos consecutivos (con vuelta al inicio) donde se cumple pred(i); un tramo se corta si key(i) cambia
function runsOf(N, pred, key = () => 0) {
  let s0 = -1;
  for (let i = 0; i < N; i++) if (!pred(i)) { s0 = i; break; }
  if (s0 < 0) return [Array.from({ length: N }, (_, i) => i)];
  const out = []; let cur = null;
  for (let j = 1; j <= N; j++) {
    const i = (s0 + j) % N;
    if (pred(i) && (!cur || key(i) === key(cur[cur.length - 1]))) { (cur || (cur = [])).push(i); }
    else { if (cur) { out.push(cur); cur = null; } if (pred(i)) cur = [i]; }
  }
  if (cur) out.push(cur);
  return out.filter((r) => r.length > 2);
}

let _grain = null;
function grainTile() { // baldosa de grano de asfalto (se reutiliza)
  if (_grain) return _grain;
  const c = document.createElement("canvas"); c.width = c.height = 96;
  const g = c.getContext("2d"), r = mulberry(99);
  for (let k = 0; k < 900; k++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,.13)" : "rgba(0,0,0,.28)"; g.fillRect(r() * 96, r() * 96, 0.8 + r() * 1.5, 0.8 + r() * 1.5); }
  for (let k = 0; k < 7; k++) { g.fillStyle = "rgba(0,0,0,.06)"; g.beginPath(); g.ellipse(r() * 96, r() * 96, 6 + r() * 10, 3 + r() * 6, r() * 3, 0, 6.3); g.fill(); }
  _grain = c;
  return c;
}
/* ---------- Líneas y flechas ---------- */
function drawChevrons(g, alpha) {
  const { C, N } = TR;
  g.save(); g.strokeStyle = `rgba(243,235,221,${alpha})`; g.lineWidth = 2.4; g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 30; i < N - 10; i += 38) {
    const p = C[i], t = TR.T[i], n = TR.Nm[i];
    g.beginPath();
    g.moveTo(p[0] - t[0] * 5 + n[0] * 8, p[1] - t[1] * 5 + n[1] * 8); g.lineTo(p[0] + t[0] * 4, p[1] + t[1] * 4); g.lineTo(p[0] - t[0] * 5 - n[0] * 8, p[1] - t[1] * 5 - n[1] * 8);
    g.stroke();
  }
  g.restore();
}
function drawLinePath(g, line, from, to, w, color, glow) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = color; g.lineWidth = w;
  if (glow) { g.shadowColor = "rgba(253,28,34,.55)"; g.shadowBlur = 8; }
  g.beginPath();
  for (let k = from; k <= to; k++) { const p = line.P[k % line.n]; k === from ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); }
  g.stroke(); g.restore();
}

/* ---------- Carros: monoplazas vistos desde arriba, pintados una vez en un "sprite" nítido y luego dibujados girados ---------- */
let carShadowImg = null;
function carShadow() { // silueta borrosa (se dibuja con el desplazamiento de la luz en el mundo, no girada con el carro)
  if (carShadowImg) return carShadowImg;
  const S = 4, PAD = 8, w = CAR_L + 2 * PAD, h = CAR_W + 2 * PAD, c = document.createElement("canvas");
  c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
  const g = c.getContext("2d"); g.scale(S, S); g.translate(w / 2, h / 2);
  const OFF = 400; // la figura se dibuja fuera del lienzo y solo se ve su sombra borrosa (funciona en todos los navegadores)
  g.shadowColor = "rgba(20,12,4,.6)"; g.shadowBlur = 1.7 * S; g.shadowOffsetX = OFF * S; g.shadowOffsetY = 0;
  g.translate(-OFF, 0); g.fillStyle = "#000";
  rrect(g, -16, -6.2, 30, 12.4, 5); g.fill();
  for (const [x, y, l, wd] of [[-8.6, -7.5, 8.6, 4.6], [-8.6, 7.5, 8.6, 4.6], [9.8, -7.6, 7.4, 4], [9.8, 7.6, 7.4, 4]]) { rrect(g, x - l / 2, y - wd / 2, l, wd, 1.5); g.fill(); }
  g.fillRect(-18.2, -8, 4.6, 16); g.fillRect(13.4, -8.8, 4.4, 17.6);
  carShadowImg = { img: c, w, h };
  return carShadowImg;
}
const CAR_VIS = 1.2; // los carros se dibujan un poco más grandes que su tamaño de pista, para que se vean bien los diseños
function drawCar(g, x, y, ang, col, braking, isPlayer) {
  if (isPlayer) {
    const rg = g.createRadialGradient(x, y, 6, x, y, 30); rg.addColorStop(0, "rgba(253,28,34,.30)"); rg.addColorStop(1, "rgba(253,28,34,0)");
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, 34, 0, 6.3); g.fill();
    g.strokeStyle = "rgba(253,28,34,.95)"; g.lineWidth = 1.8; g.beginPath(); g.arc(x, y, 26, 0, 6.3); g.stroke();
  }
  const sh = carShadow();
  g.save(); g.translate(x + 3, y + 4.2); g.rotate(ang); g.scale(CAR_VIS, CAR_VIS); g.drawImage(sh.img, -sh.w / 2, -sh.h / 2, sh.w, sh.h); g.restore();
  const sp = carSprite(col, braking);
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(CAR_VIS, CAR_VIS); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
  g.restore();
}
