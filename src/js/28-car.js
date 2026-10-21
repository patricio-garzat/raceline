"use strict";
/* car.js: el diseño del monoplaza del jugador (partes, colores, franjas, número y pintura propia) y el pintado de los sprites.
   Un diseño es { body, accent, wing, helmet, tyre, stripe, num }; la pintura propia se guarda aparte como imagen (Save.car.paint). */

const CAR_SPR = { w: CAR_L + 14, h: CAR_W + 14 };       // tamaño del sprite en unidades del mundo
const PAINT_PX = 24, PAINT_W = 40 * PAINT_PX, PAINT_H = 20 * PAINT_PX; // la pintura cubre x -20..20, y -10..10
const CAR_DEFAULT = { body: "#FFFFFF", accent: "#FD1C22", wing: "#FFFFFF", helmet: "#FFFFFF", stripe: "none", num: 0 }; // el carro blanco de fábrica
const CAR_PRESETS = [
  { n: ["White", "Blanco"], d: CAR_DEFAULT },
  { n: ["RaceLine", "RaceLine"], d: { body: "#FFFFFF", accent: "#FD1C22", wing: "#FD1C22", helmet: "#FD1C22", stripe: "center", num: 7 } },
  { n: ["Midnight", "Medianoche"], d: { body: "#23262E", accent: "#C9CDD3", wing: "#C9CDD3", helmet: "#C9CDD3", stripe: "twin", num: 44 } },
  { n: ["Silver", "Plata"], d: { body: "#C4C9D1", accent: "#2B2B30", wing: "#2B2B30", helmet: "#2B2B30", stripe: "center", num: 5 } },
  { n: ["Papaya", "Papaya"], d: { body: "#FF8000", accent: "#1B3A8C", wing: "#1B3A8C", helmet: "#1B3A8C", stripe: "side", num: 4 } },
  { n: ["British green", "Verde inglés"], d: { body: "#0B6B4F", accent: "#E9D8A6", wing: "#E9D8A6", helmet: "#E9D8A6", stripe: "twin", num: 22 } },
  { n: ["Azure", "Azul"], d: { body: "#2F6FDB", accent: "#F4F4F4", wing: "#1B3A8C", helmet: "#F4F4F4", stripe: "chevron", num: 33 } },
  { n: ["Sunset", "Atardecer"], d: { body: "#E8505B", accent: "#FFC857", wing: "#FFC857", helmet: "#FFC857", stripe: "chevron", num: 16 } },
  { n: ["Carbon", "Carbono"], d: { body: "#3A3A40", accent: "#FD1C22", wing: "#FD1C22", helmet: "#FD1C22", stripe: "side", num: 77 } },
  { n: ["Checker", "Cuadros"], d: { body: "#F4F4F4", accent: "#1B1B1D", wing: "#1B1B1D", helmet: "#1B1B1D", stripe: "checker", num: 11 } },
  { n: ["Gulf", "Gulf"], d: { body: "#7FB6E8", accent: "#FF8000", wing: "#FF8000", helmet: "#FF8000", stripe: "center", num: 2 } },
  { n: ["Blank canvas", "Lienzo en blanco"], d: { body: "#F4F4F4", accent: "#C9CDD3", wing: "#F4F4F4", helmet: "#2B2B30", stripe: "none", num: 1 } },
];
const CAR_STRIPES = ["none", "center", "twin", "side", "chevron", "band", "checker"];
const CAR_PALETTE = ["#F4F4F4", "#C4C9D1", "#8A8F98", "#2B2B30", "#0E0E0F", "#FD1C22", "#E8505B", "#FF8000", "#F2B705", "#E9D8A6", "#00A58E", "#0B6B4F", "#2F6FDB", "#1B3A8C", "#7A4CE0", "#E052A0"];
const TYRE_PALETTE = ["#2D3138", "#FD1C22", "#F2B705", "#F4F4F4", "#2F6FDB", "#00A58E"];

// los rivales no se editan: cada uno tiene su diseño
const RIVAL_DESIGN = {
  "#2F6FDB": { body: "#2F6FDB", accent: "#F4F4F4", wing: "#1B3A8C", helmet: "#F4F4F4", stripe: "chevron", num: 27 },
  "#F2B705": { body: "#F2B705", accent: "#16161A", wing: "#16161A", helmet: "#16161A", stripe: "twin", num: 9 },
  "#00A58E": { body: "#00A58E", accent: "#F4F4F4", wing: "#0B5F52", helmet: "#F4F4F4", stripe: "side", num: 55 },
};

const PAINT = { img: null, ver: 0 }; // pintura propia del jugador (imagen ya cargada)
const playerDesign = () => Object.assign({}, CAR_DEFAULT, Save.car || {});
function loadPaint() {
  const u = Save.car && Save.car.paint;
  if (!u) { PAINT.img = null; PAINT.ver++; carCache.clear(); return; }
  const im = new Image(); im.onload = () => { PAINT.img = im; PAINT.ver++; carCache.clear(); }; im.src = u;
}

const carCache = new Map();
function carSprite(col, braking) {
  const player = col === COLORS.player;
  const d = player ? playerDesign() : (RIVAL_DESIGN[col] || Object.assign({}, CAR_DEFAULT, { body: col, wing: col }));
  const key = (player ? "P" : "R") + (braking ? "b" : "") + d.body + d.accent + d.wing + d.helmet + d.stripe + d.num + [d.nc, d.ns, d.nx, d.ny, d.nr, d.no].join(",") + (player ? "v" + PAINT.ver : "") + (CARIMG.ok ? "i" : "");
  let sp = carCache.get(key);
  if (!sp) { if (carCache.size > 60) carCache.clear(); sp = paintCar(d, braking, 6, player ? PAINT.img : null); carCache.set(key, sp); }
  return sp;
}

/* ---------- La foto del monoplaza: se tiñe por partes (multiplicando el color sobre el blanco, así se conservan las sombras) ---------- */
const CARIMG = { ok: false, w: 0, h: 0, base: null, mask: null, levels: {} };
(function () {
  const a = new Image(), b = new Image(); let n = 0;
  const done = () => {
    if (++n < 2) return;
    CARIMG.w = a.width; CARIMG.h = a.height;
    const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    CARIMG.base = cv(a.width, a.height); CARIMG.base.getContext("2d").drawImage(a, 0, 0);
    const mc = cv(a.width, a.height), mg = mc.getContext("2d"); mg.drawImage(b, 0, 0);
    const px = mg.getImageData(0, 0, a.width, a.height).data, parts = [0, 1, 2].map(() => cv(a.width, a.height));
    const ds = parts.map((c) => c.getContext("2d").createImageData(a.width, a.height));
    for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) { const o = ds[k].data; o[i + 3] = px[i + k]; }
    parts.forEach((c, k) => c.getContext("2d").putImageData(ds[k], 0, 0));
    CARIMG.mask = { body: parts[0], wing: parts[1], helm: parts[2] };
    CARIMG.ok = true; carCache.clear(); if (typeof Garage !== "undefined" && Garage.redraw) Garage.redraw();
  };
  a.onload = b.onload = done; a.src = CARIMG_SRC.base; b.src = CARIMG_SRC.mask;
})();
// versión de las capas a la resolución que hace falta (la mitad, un cuarto...), para no pintar de más
function carLayers(need) {
  let w = CARIMG.w; while (w / 2 >= need && w > 180) w = Math.round(w / 2);
  if (CARIMG.levels[w]) return CARIMG.levels[w];
  const h = Math.round(CARIMG.h * w / CARIMG.w);
  const sc = (src) => { let c = src; while (c.width / 2 >= w) { const t = document.createElement("canvas"); t.width = Math.round(c.width / 2); t.height = Math.round(c.height / 2); const g = t.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(c, 0, 0, t.width, t.height); c = t; } if (c.width !== w) { const t = document.createElement("canvas"); t.width = w; t.height = h; const g = t.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(c, 0, 0, w, h); c = t; } return c; };
  return (CARIMG.levels[w] = { w, h, base: sc(CARIMG.base), body: sc(CARIMG.mask.body), wing: sc(CARIMG.mask.wing), helm: sc(CARIMG.mask.helm) });
}
const lumOf = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; };

const baseCache = new Map();
const carKey = (d) => [d.body, d.accent, d.wing, d.helmet, d.stripe].join("|");
// la carrocería teñida con sus franjas (sin pintura propia ni número), a la resolución de las capas; se guarda para no recalcular
function carBase(d, L) {
  const key = L.w + "/" + carKey(d); let hit = baseCache.get(key); if (hit) return hit;
  const IW = L.w, IH = L.h, U = IW / 36, mk = () => { const t = document.createElement("canvas"); t.width = IW; t.height = IH; return t; };
  const out = mk(), og = out.getContext("2d"); og.drawImage(L.base, 0, 0);
  const tint = (mask, color) => { const t = mk(), g = t.getContext("2d"); g.drawImage(L.base, 0, 0); g.globalCompositeOperation = "multiply"; g.fillStyle = color; g.fillRect(0, 0, IW, IH); g.globalCompositeOperation = "destination-in"; g.drawImage(mask, 0, 0); og.drawImage(t, 0, 0); };
  tint(L.body, d.body); tint(L.wing, d.wing || d.body); tint(L.helm, d.helmet || d.accent);
  const deco = mk(), dg = deco.getContext("2d"); let any = true;
  dg.setTransform(U, 0, 0, U, IW / 2 + 0.2 * U, IH / 2); dg.fillStyle = d.accent; dg.strokeStyle = d.accent; dg.lineCap = "butt"; dg.lineJoin = "miter";
  switch (d.stripe) {
    case "center": dg.fillRect(-19, -0.9, 38, 1.8); break;
    case "twin": dg.fillRect(-19, -2.3, 38, 0.8); dg.fillRect(-19, 1.5, 38, 0.8); break;
    case "side": dg.fillRect(-9, -5.2, 12, 0.9); dg.fillRect(-9, 4.3, 12, 0.9); dg.fillRect(-19, -0.45, 38, 0.9); break;
    case "chevron": dg.lineWidth = 1.1; for (let k = 0; k < 4; k++) { const x0 = -9 + k * 3.3; dg.beginPath(); dg.moveTo(x0, -7); dg.lineTo(x0 + 3.2, 0); dg.lineTo(x0, 7); dg.stroke(); } break;
    case "band": dg.fillRect(-7.6, -9, 3, 18); dg.fillRect(-3.8, -9, 0.7, 18); break;
    case "checker": for (let i = 0; i < 38; i++) for (let r = 0; r < 2; r++) { dg.fillStyle = (i + r) % 2 ? d.accent : "#FFFFFF"; dg.fillRect(-19 + i, -1 + r, 1, 1); } break;
    default: any = false;
  }
  if (any) overlayShaded(og, deco, L, IW, IH);
  if (baseCache.size > 14) baseCache.clear();
  baseCache.set(key, out); return out;
}
// pone una capa plana de color sobre la carrocería conservando las luces y sombras de la foto
function overlayShaded(og, flat, L, IW, IH) {
  const mk = () => { const t = document.createElement("canvas"); t.width = IW; t.height = IH; return t; };
  const f = mk(), fg = f.getContext("2d"); fg.drawImage(flat, 0, 0); fg.globalCompositeOperation = "destination-in"; fg.drawImage(L.body, 0, 0);
  const sh = mk(), sg = sh.getContext("2d"); sg.drawImage(f, 0, 0); sg.globalCompositeOperation = "multiply"; sg.drawImage(L.base, 0, 0); sg.globalCompositeOperation = "destination-in"; sg.drawImage(f, 0, 0);
  og.drawImage(sh, 0, 0);
}
const NUM_DEFAULT = { nx: -15.9, ny: 0, nr: 90, ns: 1, no: false };
const numDesign = (d) => Object.assign({}, NUM_DEFAULT, { nc: lumOf(d.wing || d.body) > 0.55 ? "#14161A" : "#FFFFFF" }, d.nx != null ? { nx: d.nx } : {}, d.ny != null ? { ny: d.ny } : {}, d.nr != null ? { nr: d.nr } : {}, d.ns != null ? { ns: d.ns } : {}, d.nc ? { nc: d.nc } : {}, d.no != null ? { no: d.no } : {});
function drawNumber(g, d) { // g ya está en unidades del mundo (centro del carro en 0,0)
  if (!d.num) return; const n = numDesign(d);
  g.save(); g.translate(n.nx, n.ny); g.rotate(n.nr * Math.PI / 180); g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `800 ${(d.num > 9 ? 2.9 : 3.5) * n.ns}px Montserrat, Figtree, sans-serif`;
  if (n.no) { g.lineJoin = "round"; g.lineWidth = 0.55 * n.ns; g.strokeStyle = lumOf(n.nc) > 0.55 ? "rgba(0,0,0,.75)" : "rgba(255,255,255,.9)"; g.strokeText(String(d.num), 0, 0.1 * n.ns); }
  g.fillStyle = n.nc; g.fillText(String(d.num), 0, 0.1 * n.ns); g.restore();
}
// o.crop = [largo, ancho] en unidades para dibujar solo la zona del carro (editor); o.paint = pintura propia
function paintCar(d, braking, S, paint, o = {}) {
  if (!CARIMG.ok) return paintCarVec(d, braking, S, paint);
  const w = o.crop ? o.crop[0] : CAR_SPR.w, h = o.crop ? o.crop[1] : CAR_SPR.h, c = document.createElement("canvas");
  c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
  const L = carLayers(36 * S * 1.15), IW = L.w, IH = L.h, U = IW / 36, base = carBase(d, L);
  let out = base;
  if (paint) { // la pintura propia se multiplica sobre la foto, solo dentro de la carrocería
    out = document.createElement("canvas"); out.width = IW; out.height = IH; const og = out.getContext("2d"); og.drawImage(base, 0, 0);
    const deco = document.createElement("canvas"); deco.width = IW; deco.height = IH; const dg = deco.getContext("2d"); dg.imageSmoothingQuality = "high";
    dg.setTransform(U, 0, 0, U, IW / 2 + 0.2 * U, IH / 2); dg.drawImage(paint, -20, -10, 40, 20); overlayShaded(og, deco, L, IW, IH);
  }
  const g = c.getContext("2d"); g.scale(S, S); g.translate(w / 2, h / 2); g.imageSmoothingQuality = "high";
  g.drawImage(out, -18.2, -IH / U / 2, 36, IH / U);
  drawNumber(g, d);
  if (braking) { g.save(); g.globalCompositeOperation = "lighter"; const rg = g.createRadialGradient(-17.6, 0, 0, -17.6, 0, 3.2); rg.addColorStop(0, "rgba(255,70,50,.95)"); rg.addColorStop(1, "rgba(255,70,50,0)"); g.fillStyle = rg; g.fillRect(-21, -4, 7, 8); g.restore(); }
  return { img: c, w, h };
}

function paintCarVec(d, braking, S, paint) {
  const w = CAR_SPR.w, h = CAR_SPR.h, c = document.createElement("canvas");
  c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
  const g = c.getContext("2d"); g.scale(S, S); g.translate(w / 2, h / 2);
  const col = d.body, acc = d.accent, wingC = d.wing || col, helm = d.helmet || acc, tyre = d.tyre || "#2D3138";
  const wheel = (x, y, l, wd) => {
    rrect(g, x - l / 2, y - wd / 2, l, wd, 1.5); g.fillStyle = "#14161A"; g.fill();
    g.fillStyle = tyre; g.fillRect(x - l / 2 + 0.9, y - wd / 2 + 0.55, l - 1.8, 0.7); g.fillRect(x - l / 2 + 0.9, y + wd / 2 - 1.25, l - 1.8, 0.7);
    g.fillStyle = "#6B7280"; g.beginPath(); g.arc(x, y, 0.7, 0, 6.3); g.fill();
  };
  // ejes y ruedas
  g.strokeStyle = "#2B2F36"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-8.6, -5.2); g.lineTo(-8.6, 5.2); g.moveTo(9.8, -5.6); g.lineTo(9.8, 5.6); g.stroke();
  wheel(-8.6, -7.5, 8.6, 4.6); wheel(-8.6, 7.5, 8.6, 4.6); wheel(9.8, -7.6, 7.4, 4); wheel(9.8, 7.6, 7.4, 4);
  // alerón trasero
  g.fillStyle = "#23272E"; rrect(g, -18.2, -8, 4.6, 16, 1.1); g.fill();
  g.fillStyle = acc; g.fillRect(-16.9, -7.6, 0.55, 15.2);
  g.fillStyle = wingC; g.fillRect(-18.2, -8.2, 4.6, 1.1); g.fillRect(-18.2, 7.1, 4.6, 1.1);
  if (braking) { g.save(); g.shadowColor = "#FF4B3A"; g.shadowBlur = 4; g.fillStyle = "#FF5A4A"; g.fillRect(-18.6, -1.3, 0.9, 2.6); g.restore(); } else { g.fillStyle = "#8F2B25"; g.fillRect(-18.6, -1.3, 0.9, 2.6); }
  // carrocería
  const gr = g.createLinearGradient(0, -7, 0, 7); gr.addColorStop(0, mix(col, 0.28)); gr.addColorStop(0.45, col); gr.addColorStop(1, mix(col, -0.28));
  g.beginPath();
  g.moveTo(-14.5, -2); g.quadraticCurveTo(-8, -3.6, -6, -5.6); g.quadraticCurveTo(-3.5, -7, 0.5, -6.2); g.quadraticCurveTo(3.8, -5.4, 5, -3); g.lineTo(14.8, -1.4);
  g.quadraticCurveTo(16.4, 0, 14.8, 1.4); g.lineTo(5, 3); g.quadraticCurveTo(3.8, 5.4, 0.5, 6.2); g.quadraticCurveTo(-3.5, 7, -6, 5.6); g.quadraticCurveTo(-8, 3.6, -14.5, 2); g.closePath();
  g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 0.55; g.stroke();
  g.save(); g.clip();
  // franjas
  g.fillStyle = acc; g.strokeStyle = acc; g.lineCap = "butt"; g.lineJoin = "miter";
  switch (d.stripe) {
    case "center": g.fillRect(-15, -0.95, 31, 1.9); break;
    case "twin": g.fillRect(-15, -2.2, 31, 0.8); g.fillRect(-15, 1.4, 31, 0.8); break;
    case "side": g.fillRect(-13, -4.4, 20, 1); g.fillRect(-13, 3.4, 20, 1); g.fillRect(-15, -0.5, 31, 1); break;
    case "chevron": g.lineWidth = 1.15; for (let k = 0; k < 3; k++) { const x0 = -11 + k * 4.2; g.beginPath(); g.moveTo(x0, -7); g.lineTo(x0 + 3.6, 0); g.lineTo(x0, 7); g.stroke(); } break;
    case "band": g.fillRect(-15, -7.5, 5.5, 15); g.fillRect(-8.6, -7.5, 0.9, 15); break;
    case "checker": for (let i = 0; i < 31; i++) for (let r = 0; r < 2; r++) { g.fillStyle = (i + r) % 2 ? acc : "rgba(255,255,255,.88)"; g.fillRect(-15 + i, -1 + r, 1, 1); } break;
  }
  if (paint) g.drawImage(paint, -20, -10, 40, 20);
  g.strokeStyle = mix(col, -0.4); g.lineWidth = 0.5; g.beginPath(); g.moveTo(-6.5, -3.9); g.lineTo(3.2, -4.2); g.moveTo(-6.5, 3.9); g.lineTo(3.2, 4.2); g.stroke();
  g.fillStyle = "rgba(255,255,255,.22)"; g.beginPath(); g.moveTo(-6, -5.4); g.quadraticCurveTo(-2, -6.4, 2.4, -5.6); g.lineTo(2.2, -4.9); g.quadraticCurveTo(-2, -5.6, -5.8, -4.6); g.fill();
  g.restore();
  // toma de aire, cabina, casco y halo
  g.fillStyle = "#14171B"; g.beginPath(); g.ellipse(-5.6, 0, 1.7, 1.5, 0, 0, 6.3); g.fill();
  g.fillStyle = "#101317"; g.beginPath(); g.ellipse(0.4, 0, 4.1, 2.8, 0, 0, 6.3); g.fill();
  g.fillStyle = helm; g.beginPath(); g.arc(0.7, 0, 1.95, 0, 6.3); g.fill(); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 0.3; g.stroke();
  g.fillStyle = "#171B21"; g.fillRect(1.6, -1.2, 1, 2.4);
  g.strokeStyle = "#232830"; g.lineWidth = 0.85; g.lineCap = "round"; g.beginPath(); g.moveTo(-1.4, -3.1); g.quadraticCurveTo(4.4, -2.3, 4.8, 0); g.quadraticCurveTo(4.4, 2.3, -1.4, 3.1); g.moveTo(4.8, 0); g.lineTo(6.4, 0); g.stroke();
  // número en la nariz
  if (d.num) {
    g.fillStyle = "rgba(255,255,255,.96)"; g.beginPath(); g.arc(10, 0, 2.5, 0, 6.3); g.fill(); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.25; g.stroke();
    g.fillStyle = "#14161A"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `800 ${d.num > 9 ? 2.9 : 3.5}px Montserrat, Figtree, sans-serif`; g.fillText(String(d.num), 10.05, 0.15);
  } else { g.fillStyle = "rgba(255,255,255,.92)"; g.beginPath(); g.arc(10, 0, 1.9, 0, 6.3); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(10, 0, 0.85, 0, 6.3); g.fill(); }
  // alerón delantero
  g.fillStyle = "#23272E"; rrect(g, 13.4, -8.8, 4.4, 17.6, 1.1); g.fill();
  g.fillStyle = acc; g.fillRect(14.9, -8.3, 0.55, 16.6);
  g.fillStyle = wingC; g.fillRect(13.4, -9, 4.4, 1.1); g.fillRect(13.4, 7.9, 4.4, 1.1);
  g.fillStyle = "#23272E"; g.fillRect(12.2, -0.8, 1.6, 1.6);
  return { img: c, w, h };
}

loadPaint();
