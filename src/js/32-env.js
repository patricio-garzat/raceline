"use strict";
/* env.js: el entorno de cada circuito, estilo Fórmula 1 (pasto con franjas, desierto, agua, árboles, escapatorias de grava,
   muros con publicidad, tribunas, boxes y paddock). Se pinta una vez por tamaño, tema y circuito. */

const ENVS = {
  alpine:    { g1: "#86B466", g2: "#79A85A", stripes: true,  tree: "pine",  trees: 0.9, tc: ["#2E5B36", "#3F7545"], gravel: "#D9C9A3", hills: true },
  park:      { g1: "#80AA5E", g2: "#74A053", stripes: true,  tree: "round", trees: 1.7, tc: ["#2D5A33", "#3E7443"], gravel: "#D6C59E" },
  lake:      { g1: "#8CBC6B", g2: "#80B060", stripes: true,  tree: "round", trees: 0.8, tc: ["#3B7440", "#4F8E52"], gravel: "#DACBA6", water: "#5CA6C9" },
  desert:    { g1: "#E7CF9F", g2: "#E0C691", stripes: false, tree: "palm",  trees: 0.28, tc: ["#3F7B3A", "#5C9A48"], gravel: "#F1E0B8", dunes: true },
  airfield:  { g1: "#9CC376", g2: "#90B96A", stripes: true,  tree: "round", trees: 0.35, tc: ["#3C7440", "#559052"], gravel: "#D9CBA6", runway: true },
  tropical:  { g1: "#6CA854", g2: "#609C4A", stripes: true,  tree: "round", trees: 1.5, tc: ["#2A6A34", "#3F8A44"], gravel: "#D3BE97", soil: true },
  texas:     { g1: "#CDBB7C", g2: "#C1AF70", stripes: true,  tree: "scrub", trees: 0.5, tc: ["#7E8A48", "#98A55A"], gravel: "#E4D3A6", tower: true },
  harbor:    { g1: "#C3BDAE", g2: "#B9B3A3", stripes: false, tree: "round", trees: 0.3, tc: ["#43794A", "#5A9460"], gravel: "#D9D2C0", water: "#4F9FC9", yachts: true },
  sunflower: { g1: "#9AC272", g2: "#8EB766", stripes: true,  tree: "round", trees: 0.55, tc: ["#3D7642", "#56924F"], gravel: "#DBCCA6", fields: true },
  sea:       { g1: "#D3C29E", g2: "#C9B890", stripes: false, tree: "palm",  trees: 0.18, tc: ["#4A8044", "#639A52"], gravel: "#E7D8B2", water: "#3F98B8", ships: true },
  urban:     { g1: "#B7B3A5", g2: "#AFAB9D", stripes: false, tree: "round", trees: 0.55, tc: ["#3F7A4A", "#58946A"], gravel: "#D6D1C3" },
  forest:    { g1: "#527F48", g2: "#497540", stripes: true,  tree: "pine",  trees: 2.3, tc: ["#1F4A2A", "#2E6338"], gravel: "#CFBF99" },
};

/* ---------- utilidades ---------- */
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, h = (a, b) => hash2(a, b) / 4294967296, sm = (t) => t * t * (3 - 2 * t);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1), u = sm(xf), v = sm(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function blobPoly(cx, cy, rx, ry, seed, n = 44) {
  const r = mulberry(seed), ph = [r() * 6.28, r() * 6.28, r() * 6.28], pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, k = 1 + 0.1 * Math.sin(3 * a + ph[0]) + 0.07 * Math.sin(5 * a + ph[1]) + 0.04 * Math.sin(8 * a + ph[2]); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return pts;
}
function polyPath(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
function tileOf(base, light, dark, seed, size = 96, n = 520) { // baldosa de grano (pasto, grava, arena)
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"), r = mulberry(seed);
  for (let k = 0; k < n; k++) { g.fillStyle = r() < 0.5 ? light : dark; g.fillRect(r() * size, r() * size, 0.8 + r() * 1.6, 0.8 + r() * 1.6); }
  return c;
}
const _tiles = {};
const tile = (key, fn) => _tiles[key] || (_tiles[key] = fn());

/* ---------- árboles ---------- */
function drawTree(g, kind, x, y, r, tc, rnd) {
  g.fillStyle = "rgba(20,40,16,.28)"; g.beginPath(); g.ellipse(x + r * 0.55, y + r * 0.75, r * 1.05, r * 0.85, 0, 0, 6.3); g.fill();
  if (kind === "pine") {
    g.fillStyle = tc[0]; g.beginPath();
    for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.283, rr = k % 2 ? r * 0.62 : r * 1.05; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
    g.fillStyle = tc[1]; g.beginPath(); g.arc(x - r * 0.18, y - r * 0.18, r * 0.5, 0, 6.3); g.fill();
  } else if (kind === "palm") {
    g.fillStyle = tc[0];
    for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.283 + rnd() * 0.3; g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(r * 0.62, 0, r * 0.75, r * 0.2, 0, 0, 6.3); g.fill(); g.restore(); }
    g.fillStyle = tc[1]; g.beginPath(); g.arc(x, y, r * 0.28, 0, 6.3); g.fill();
  } else if (kind === "scrub") {
    g.fillStyle = tc[0]; g.beginPath(); g.arc(x, y, r * 0.8, 0, 6.3); g.fill();
    g.fillStyle = tc[1]; g.beginPath(); g.arc(x - r * 0.2, y - r * 0.2, r * 0.45, 0, 6.3); g.fill();
  } else {
    g.fillStyle = tc[0]; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill();
    g.fillStyle = tc[1]; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.65, 0, 6.3); g.fill();
    g.fillStyle = "rgba(255,255,255,.14)"; g.beginPath(); g.arc(x - r * 0.4, y - r * 0.4, r * 0.28, 0, 6.3); g.fill();
  }
}

/* ---------- agua, barcos ---------- */
function drawWater(g, pts, col, bounds, rnd) {
  g.save(); polyPath(g, pts); g.fillStyle = col; g.fill(); g.clip();
  g.lineJoin = "round";
  for (const [w, a] of [[110, 0.1], [70, 0.12], [38, 0.16], [18, 0.22]]) { polyPath(g, pts); g.lineWidth = w; g.strokeStyle = `rgba(190,236,246,${a})`; g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1.2; g.lineCap = "round";
  for (let k = 0; k < 220; k++) { const x = bounds[0] + rnd() * (bounds[2] - bounds[0]), y = bounds[1] + rnd() * (bounds[3] - bounds[1]), l = 6 + rnd() * 14; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 2.2, x + l, y); g.stroke(); }
  g.restore();
  polyPath(g, pts); g.lineWidth = 3; g.strokeStyle = "rgba(255,255,255,.75)"; g.stroke();
}
function drawYacht(g, x, y, len, rnd) {
  const w = len * 0.3;
  g.fillStyle = "rgba(10,40,60,.25)"; g.beginPath(); g.ellipse(x + 3, y + 4, len / 2, w / 2 + 1, 0, 0, 6.3); g.fill();
  g.fillStyle = "#F8F6F1"; g.beginPath(); g.moveTo(x - len / 2, y - w / 2); g.lineTo(x + len * 0.18, y - w / 2); g.quadraticCurveTo(x + len / 2 + 2, y, x + len * 0.18, y + w / 2); g.lineTo(x - len / 2, y + w / 2); g.closePath(); g.fill();
  g.fillStyle = "#C9A878"; g.fillRect(x - len * 0.42, y - w * 0.32, len * 0.5, w * 0.64);
  g.fillStyle = "#EDEAE3"; rrect(g, x - len * 0.18, y - w * 0.28, len * 0.34, w * 0.56, 2); g.fill();
  g.fillStyle = "#4C5A6B"; g.fillRect(x - len * 0.12, y - w * 0.2, len * 0.2, w * 0.4);
  g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - len / 2, y - 2); g.lineTo(x - len / 2 - 14, y - 4); g.moveTo(x - len / 2, y + 2); g.lineTo(x - len / 2 - 14, y + 4); g.stroke();
}

/* ---------- ciudad (solo en circuitos urbanos): edificios altos a un lado ---------- */
function drawCityBlocks(g, regions, bounds, minRoad, dark) {
  const CELL = 60, roofs = ["#D8CBB8", "#C9BFAE", "#BFB5A5", "#D9B9A0", "#B7C4C9", "#D2C4B2"];
  for (let cx = Math.floor(bounds[0] / CELL); cx <= Math.ceil(bounds[2] / CELL); cx++) for (let cy = Math.floor(bounds[1] / CELL); cy <= Math.ceil(bounds[3] / CELL); cy++) {
    const mx = cx * CELL + CELL / 2, my = cy * CELL + CELL / 2;
    if (!regions.some((r) => mx >= r[0] && mx <= r[2] && my >= r[1] && my <= r[3])) continue;
    if (distToRoad(mx, my) < minRoad) continue;
    const rnd = mulberry(hash2(cx, cy)), parts = rnd() < 0.5 ? [[5, 5, CELL - 10, CELL - 10]] : (rnd() < 0.5 ? [[5, 5, 28, CELL - 10], [37, 5, CELL - 42, 30], [37, 39, CELL - 42, CELL - 44]] : [[5, 5, CELL - 10, 26], [5, 35, 26, CELL - 40], [35, 35, CELL - 40, CELL - 40]]);
    for (const [ox, oy, w, h] of parts) {
      const x = cx * CELL + ox, y = cy * CELL + oy, col = roofs[Math.floor(rnd() * roofs.length)], sh = 6 + rnd() * 9;
      if (w >= 20 && h >= 20 && rnd() < 0.6) { g.fillStyle = "rgba(190,186,176,.9)"; g.fillRect(x - 2, y - 2, w + 4, h + 4); Scenery.tower(g, x + w / 2, y + h / 2, w - 6, h - 6, 14 + rnd() * 52, ["#9FB2C4", "#B7C3CE", "#8FA3B8", "#C8CFD6", "#D9CBB0"][Math.floor(rnd() * 5)]); continue; }
      g.fillStyle = "rgba(40,28,15,.32)"; rrect(g, x + sh, y + sh * 1.3, w, h, 2); g.fill();
      g.fillStyle = col; rrect(g, x, y, w, h, 2); g.fill();
      g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(x + 1, y + 1, w - 2, 1.4); g.fillRect(x + 1, y + 1, 1.4, h - 2);
      g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 0.8; for (let q = 5; q < w - 3; q += 6) { g.beginPath(); g.moveTo(x + q, y + 3); g.lineTo(x + q, y + h - 3); g.stroke(); }
      if (w > 18 && h > 18) { g.fillStyle = mix(col, -0.2); rrect(g, x + 4, y + 4, Math.min(11, w - 8), Math.min(8, h - 8), 1.5); g.fill(); }
    }
  }
}

/* ---------- el fondo completo ---------- */
function renderBackground() {
  if (!TR) return;
  const lv = TR.lv, env = ENVS[lv.env || "alpine"], P = pal(), dark = resolvedTheme() === "dark" || !!Scenery.def(lv).night, W = TR.roadW, HW = TR.hw;
  bg = document.createElement("canvas"); bg.width = cv.width; bg.height = cv.height;
  const g = bg.getContext("2d");
  setWorld(g);
  const C = TR.C, N = TR.N, Nm = TR.Nm, T = TR.T, ds = TR.ds, ci = curvatureInfo();
  const bounds = [-OX / SC - 40, -OY / SC - 40, (VW - OX) / SC + 40, (VH - OY) / SC + 40];
  const [x0, y0, x1, y1] = bounds, rnd = mulberry(hash2(lv.id, 1234));
  const pathVar = (idxs, side, offs) => idxs.map((i) => { const o = typeof offs === "function" ? offs(i) : offs; return [C[i][0] + Nm[i][0] * side * o, C[i][1] + Nm[i][1] * side * o]; });
  const pathAt = (idxs, off) => idxs.map((i) => [C[i][0] + Nm[i][0] * off, C[i][1] + Nm[i][1] * off]);
  const stroke = (pts, w, col, dash, dashOff) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.lineWidth = w; g.strokeStyle = col; g.setLineDash(dash || []); g.lineDashOffset = dashOff || 0; g.stroke(); g.setLineDash([]); };
  const circ = (a, b) => { const d = Math.abs(a - b); return Math.min(d, N - d); };
  const clearance = (px, py, i) => { let m = 1e9; for (let j = 0; j < N; j++) if (circ(i, j) > 70) { const d = hyp(px - C[j][0], py - C[j][1]); if (d < m) m = d; } return m; };
  const water = (lv.water || []), lakes = (lv.lakes || []).map((l, k) => blobPoly(l[0], l[1], l[2], l[3], hash2(lv.id, 50 + k)));
  const wet = (x, y) => water.some((p) => inPoly(x, y, p)) || lakes.some((p) => inPoly(x, y, p));

  /* 1 · suelo */
  g.fillStyle = env.g1; g.fillRect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100);
  if (env.stripes) { // franjas de corte del pasto
    g.save(); g.translate((x0 + x1) / 2, (y0 + y1) / 2); g.rotate(-0.62); g.fillStyle = env.g2;
    for (let k = -60; k < 60; k += 2) g.fillRect(-2600, k * 22, 5200, 22);
    g.restore();
  }
  const grass = tile("grass" + lv.env, () => tileOf(env.g1, "rgba(255,255,255,.10)", "rgba(0,0,0,.13)", hash2(lv.id, 5), 96, 620));
  g.save(); g.fillStyle = g.createPattern(grass, "repeat"); g.fillRect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100); g.restore();
  if (env.hills) for (let k = 0; k < 7; k++) { // lomas suaves
    const hx = x0 + rnd() * (x1 - x0), hy = y0 + rnd() * (y1 - y0), hr = 150 + rnd() * 180, rg = g.createRadialGradient(hx - hr * 0.2, hy - hr * 0.2, 10, hx, hy, hr);
    rg.addColorStop(0, "rgba(255,255,255,.10)"); rg.addColorStop(0.7, "rgba(0,0,0,.05)"); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
  }
  if (env.dunes) for (let k = 0; k < 26; k++) { // dunas
    const dx = x0 + rnd() * (x1 - x0), dy = y0 + rnd() * (y1 - y0), a = 0.35 + rnd() * 0.2, rx = 90 + rnd() * 140, ry = 22 + rnd() * 34;
    g.save(); g.translate(dx, dy); g.rotate(a); g.fillStyle = "rgba(255,244,214,.34)"; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 6.3); g.fill();
    g.strokeStyle = "rgba(170,125,70,.22)"; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0.2, 2.6); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.2)"; g.lineWidth = 1; for (let q = -2; q <= 2; q++) { g.beginPath(); g.moveTo(-rx * 0.6, q * 6); g.quadraticCurveTo(0, q * 6 - 4, rx * 0.6, q * 6); g.stroke(); } g.restore();
  }
  if (env.soil) for (let k = 0; k < 16; k++) { g.fillStyle = "rgba(150,88,62,.4)"; g.beginPath(); g.ellipse(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 40 + rnd() * 70, 18 + rnd() * 30, rnd() * 3, 0, 6.3); g.fill(); }
  if (env.runway) { // antiguas pistas de aterrizaje
    for (const [px, py, a, len] of [[WORLD.w / 2 - 20, 420, 0.5, 2600], [WORLD.w / 2 - 70, 560, -0.98, 2600]]) {
      g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = "#A4A9AF"; g.fillRect(-len / 2, -17, len, 34);
      g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(-len / 2, -17, len, 1.6); g.fillRect(-len / 2, 15.4, len, 1.6);
      g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 2; g.setLineDash([20, 18]); g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, 0); g.stroke(); g.restore();
    }
  }
  if (env.fields) for (let k = 0; k < 18; k++) { // campos de girasoles y trigo
    const fx = x0 + rnd() * (x1 - x0), fy = y0 + rnd() * (y1 - y0), fw = 90 + rnd() * 90, fh = 60 + rnd() * 70, fa = (rnd() - 0.5) * 0.5, sun = rnd() < 0.6;
    if (distToRoad(fx, fy) < HW + 90) continue;
    g.save(); g.translate(fx, fy); g.rotate(fa); g.fillStyle = sun ? "#EBC63A" : "#CFD16C"; g.fillRect(-fw / 2, -fh / 2, fw, fh);
    g.strokeStyle = sun ? "rgba(110,70,20,.4)" : "rgba(120,130,50,.45)"; g.lineWidth = 1.2; for (let q = -fh / 2 + 5; q < fh / 2; q += 7) { g.beginPath(); g.moveTo(-fw / 2, q); g.lineTo(fw / 2, q); g.stroke(); }
    if (sun) { g.fillStyle = "rgba(90,55,20,.55)"; for (let q = 0; q < 70; q++) { g.beginPath(); g.arc(-fw / 2 + rnd() * fw, -fh / 2 + rnd() * fh, 1.5, 0, 6.3); g.fill(); } }
    g.restore();
  }
  if (water.length || lakes.length) { water.forEach((p) => drawWater(g, p, env.water || "#5CA6C9", bounds, rnd)); lakes.forEach((p) => drawWater(g, p, env.water || "#5CA6C9", bounds, rnd)); }
  if (env.yachts || env.ships || lv.boats) { // puerto y mar: muelles sobre la costa y barcos en el agua
    const sh = lv.shore, sd = sh ? (sh.side === "bottom" ? 1 : sh.side === "top" ? -1 : 0) : 0, wetIn = (x, y, m) => wet(x, y) && wet(x + m, y) && wet(x - m, y) && wet(x, y + m) && wet(x, y - m);
    if (sd && env.yachts) for (let k = 1; k < sh.pts.length - 1; k += 7) {
      const px = sh.pts[k][0], py = sh.pts[k][1]; if (px < x0 - 20 || px > x1 + 20) continue;
      const py0 = sd > 0 ? py - 4 : py - 62; g.fillStyle = "rgba(10,30,45,.25)"; g.fillRect(px + 4, py0 + 3, 14, 66); g.fillStyle = "#C9B28A"; g.fillRect(px, py0, 14, 66); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(px, py0, 14, 2);
    }
    const want = lv.boats ? 8 : env.ships ? 5 : 22, rb = mulberry(hash2(lv.id, 321));
    for (let n = 0, put = 0; n < 900 && put < want; n++) {
      const len = env.ships ? 46 + rb() * 30 : 26 + rb() * 30, x = x0 + rb() * (x1 - x0), y = y0 + rb() * (y1 - y0);
      if (!wetIn(x, y, len / 2 + 12) || distToRoad(x, y) < HW + 50) continue;
      drawYacht(g, x, y, len, rb); put++;
    }
  }
  if (env.tower) { // torre de observación
    let tx = WORLD.w / 2, ty = 500, bd = -1; for (let gx = 130; gx <= WORLD.w - 130; gx += 20) for (let gy = 140; gy <= 880; gy += 20) { const d = distToRoad(gx, gy); if (d > bd) { bd = d; tx = gx; ty = gy; } } g.save(); g.fillStyle = "rgba(60,40,15,.28)"; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + 90, ty + 70); g.lineTo(tx + 75, ty + 85); g.lineTo(tx - 6, ty + 10); g.closePath(); g.fill();
    g.fillStyle = "#B8BCC2"; g.beginPath(); g.arc(tx, ty, 15, 0, 6.3); g.fill(); g.strokeStyle = "#7F848C"; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = "#E8EAEC"; g.beginPath(); g.arc(tx, ty, 9, 0, 6.3); g.fill(); g.fillStyle = "#FD1C22"; g.beginPath(); g.arc(tx, ty, 3.2, 0, 6.3); g.fill(); g.restore();
  }
  if (lv.city && lv.city.length) drawCityBlocks(g, lv.city, bounds, HW + 60, dark);
  const excl = [];                                   // círculos donde no hay árboles [x, y, r]
  const scn = Scenery.build({ g, lv, env, bounds, rnd: mulberry(hash2(lv.id, 4242)), wet, HW, excl, lakes, dark });   // paisaje propio del circuito

  /* 2 · ancho de la zona de escape: el muro se aleja en el exterior de las curvas (grava en medio) */
  const base = HW + 16, ow = {};
  for (const side of [-1, 1]) {
    let a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = side * ci.sg[i] < 0 && ci.k[i] > 1 / 230 ? 1 : 0;
    for (let pass = 0; pass < 3; pass++) { const b = new Float32Array(N); for (let i = 0; i < N; i++) { let s = 0; for (let d = -8; d <= 8; d++) s += a[(i + d + N) % N]; b[i] = s / 17; } a = b; }
    ow[side] = Float32Array.from(a, (v) => base + 22 * Math.min(1, v * 1.7));
  }

  /* 3 · franja de asfalto de escape, calle, línea de borde y línea central */
  g.lineJoin = "round"; g.lineCap = "round";
  roadPath(g, C); g.strokeStyle = "#A9ACB2"; g.lineWidth = W + 28; g.stroke();
  // grava
  const gravTile = tile("grav" + lv.env, () => tileOf(env.gravel, "rgba(255,255,255,.35)", "rgba(90,70,40,.35)", hash2(lv.id, 9), 64, 480));
  for (const side of [-1, 1]) runsOf(N, (i) => ow[side][i] - base > 2).forEach((run) => {
    const inner = pathAt(run, side * (HW + 13)), outer = pathVar(run, side, (i) => ow[side][i] - 1);
    g.beginPath(); inner.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = outer.length - 1; i >= 0; i--) g.lineTo(outer[i][0], outer[i][1]); g.closePath();
    g.fillStyle = env.gravel; g.fill(); g.fillStyle = g.createPattern(gravTile, "repeat"); g.fill();
  });
  g.lineCap = "round";
  roadPath(g, C); g.strokeStyle = "#E9E7E1"; g.lineWidth = W + 7; g.stroke();
  g.strokeStyle = P.asphalt; g.lineWidth = W; g.stroke();
  g.strokeStyle = P.edge; g.lineWidth = W - 6; g.stroke();
  g.strokeStyle = P.asphalt; g.lineWidth = W - 9; g.stroke();
  g.setLineDash([16, 20]); g.strokeStyle = P.dash; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
  const grainT = grainTile();
  g.save(); g.globalAlpha = 0.65; g.strokeStyle = g.createPattern(grainT, "repeat"); g.lineWidth = W - 9; roadPath(g, C); g.stroke(); g.restore();
  g.save(); g.globalAlpha = 0.1; g.strokeStyle = "#000"; g.lineWidth = 30; roadPath(g, C); g.stroke(); g.restore();
  runsOf(N, (i) => ci.k[i] > 1 / 170, (i) => ci.sg[i]).forEach((run) => { // marcas de frenada
    const i0 = run[0];
    for (const o of [-17, 9]) { const idxs = []; for (let d = -15; d <= 0; d++) idxs.push((i0 + d + N) % N); stroke(pathAt(idxs, o + Math.sin(i0) * 3), 2.3, "rgba(0,0,0,.13)"); }
  });
  g.lineCap = "butt";
  // pianos rojos y blancos
  runsOf(N, (i) => ci.k[i] > 1 / 170, (i) => ci.sg[i]).forEach((run) => {
    const side = ci.sg[run[Math.floor(run.length / 2)]] || 1, pts = pathAt(run, side * (HW - 3.2));
    stroke(pts, 6, "#FD1C22", [7, 7], 0); stroke(pts, 6, "#FAFAFA", [7, 7], 7);
  });
  // casillas de la parrilla
  for (let k = 0; k < 4; k++) {
    const idx = (((Math.round(-(10 + k * 40) / ds)) % N) + N) % N, off = k % 2 ? 9 : -9;
    g.save(); g.translate(C[idx][0] + Nm[idx][0] * off, C[idx][1] + Nm[idx][1] * off); g.rotate(Math.atan2(T[idx][1], T[idx][0]));
    g.strokeStyle = "rgba(243,235,221,.8)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-19, -11); g.lineTo(-19, 11); g.moveTo(-19, -11); g.lineTo(-13, -11); g.moveTo(-19, 11); g.lineTo(-13, 11); g.stroke(); g.restore();
  }

  /* 4 · boxes, paddock y tribunas (se elige el lado con espacio libre) */
  const sideFree = (side, off) => { let m = 1e9; for (let k = -30; k <= 30; k += 10) { const i = (k + N) % N; m = Math.min(m, clearance(C[i][0] + Nm[i][0] * side * off, C[i][1] + Nm[i][1] * side * off, i)); } return m; };
  const f1 = sideFree(1, HW + 55), fm = sideFree(-1, HW + 55);
  let cxm = 0, cym = 0; C.forEach((q) => { cxm += q[0]; cym += q[1]; }); cxm /= N; cym /= N;
  const dCen = (sd) => hyp(C[0][0] + Nm[0][0] * sd * 70 - cxm, C[0][1] + Nm[0][1] * sd * 70 - cym), inner = dCen(1) < dCen(-1) ? 1 : -1; // el boxes van hacia el interior, la tribuna afuera
  const fIn = inner === 1 ? f1 : fm, fOut = inner === 1 ? fm : f1;
  let pitSide = inner; const roomPit = (sd) => sideFree(sd, HW + 66) > HW + 22;
  if (!roomPit(inner) && roomPit(-inner)) pitSide = -inner;
  const pitOk = roomPit(pitSide), paddockOk = pitOk && sideFree(pitSide, HW + 106) > HW + 26, standSide = -pitSide;
  const win = Math.round(125 / ds), idxsStart = []; for (let d = -win; d <= win; d++) idxsStart.push((d + N) % N);
  if (pitOk) {
    stroke(pathAt(idxsStart, pitSide * (HW + 28)), 15, "#4A4E57"); stroke(pathAt(idxsStart, pitSide * (HW + 21)), 1.6, "rgba(255,255,255,.8)");
    const bld = pathAt(idxsStart, pitSide * (HW + 53));
    stroke(bld.map((p) => [p[0] + 4, p[1] + 5]), 27, "rgba(30,20,10,.3)"); stroke(bld, 27, "#CBCFD4"); stroke(bld, 24, "#B7BCC3"); stroke(pathAt(idxsStart, pitSide * (HW + 53)), 1.4, "rgba(0,0,0,.25)");
    const teams = ["#FD1C22", "#2F6FDB", "#F2B705", "#00A58E", "#FD1C22", "#2B3A55"];
    for (let k = -6; k <= 6; k++) { const i = (k * 5 + N) % N, a = Math.atan2(T[i][1], T[i][0]), p = [C[i][0] + Nm[i][0] * pitSide * (HW + 45), C[i][1] + Nm[i][1] * pitSide * (HW + 45)]; g.save(); g.translate(p[0], p[1]); g.rotate(a); g.fillStyle = teams[(k + 6) % teams.length]; g.fillRect(-7, -2.2, 14, 4.4); g.restore(); }
    if (paddockOk) { // paddock detrás
    const pad = pathAt(idxsStart, pitSide * (HW + 92)); stroke(pad, 44, "#8E9299");
    for (let k = -7; k <= 7; k++) for (const o of [80, 98]) { const i = (k * 6 + N) % N, a = Math.atan2(T[i][1], T[i][0]), p = [C[i][0] + Nm[i][0] * pitSide * (HW + o), C[i][1] + Nm[i][1] * pitSide * (HW + o)]; g.save(); g.translate(p[0] + 2, p[1] + 3); g.rotate(a); g.fillStyle = "rgba(20,12,4,.25)"; g.fillRect(-9, -4, 18, 8); g.restore(); g.save(); g.translate(p[0], p[1]); g.rotate(a); g.fillStyle = "#F4F2EE"; g.fillRect(-9, -4, 18, 8); g.fillStyle = teams[(k + 7) % teams.length]; g.fillRect(-9, -4, 4, 8); g.restore(); } }
    for (const i of idxsStart.filter((_, q) => q % 8 === 0)) { const q = [C[i][0] + Nm[i][0] * pitSide * (HW + 70), C[i][1] + Nm[i][1] * pitSide * (HW + 70)]; excl.push([q[0], q[1], paddockOk ? 62 : 34]); }
  }
  const stands = [];
  const standGeom = (idxs, side, wallOff, width, roof) => {
    const co = (i) => wallOff(i) + 7 + width / 2, mid = pathVar(idxs, side, co);
    stroke(mid.map((p) => [p[0] + 3, p[1] + 4]), width, "rgba(30,20,10,.3)"); stroke(mid, width, "#B8B6AE");
    const cols = ["#FD1C22", "#2F6FDB", "#F2B705", "#00A58E", "#FD1C22", "#FAFAFA"];
    for (let k = 0; k < 4; k++) stroke(pathVar(idxs, side, (i) => co(i) + (k - 1.5) * (width / 4.6)), width / 5.2, cols[(k * 2 + idxs[0]) % cols.length], [3.2, 1.6], k * 1.7);
    const rg = mulberry(idxs[0] + 11); g.fillStyle = "rgba(40,30,25,.55)";
    for (let q = 0; q < idxs.length; q += 1) { const i = idxs[q]; for (let k = 0; k < 3; k++) { const o = co(i) + (rg() - 0.5) * width * 0.85, x = C[i][0] + Nm[i][0] * side * o, y = C[i][1] + Nm[i][1] * side * o; g.fillStyle = cols[Math.floor(rg() * cols.length)]; g.globalAlpha = 0.9; g.beginPath(); g.arc(x, y, 1, 0, 6.3); g.fill(); } }
    g.globalAlpha = 1; stroke(pathVar(idxs, side, (i) => wallOff(i) + 7), 1.2, "rgba(255,255,255,.85)");
    if (roof) { const r2 = pathVar(idxs, side, (i) => co(i) + width * 0.15); stroke(r2.map((p) => [p[0] + 5, p[1] + 7]), width * 0.7, "rgba(30,20,10,.22)"); stroke(r2, width * 0.7, "rgba(238,238,242,.92)"); stroke(r2, 1.2, "rgba(0,0,0,.18)"); }
    idxs.forEach((i, q) => { if (q % 6 === 0) { const p = [C[i][0] + Nm[i][0] * side * co(i), C[i][1] + Nm[i][1] * side * co(i)]; excl.push([p[0], p[1], width * 0.9 + 12]); } });
  };
  if (sideFree(standSide, HW + 50) > HW + 24) standGeom(idxsStart, standSide, () => base, 32, true);
  // tribunas en el exterior de las curvas
  const cands = [];
  for (const side of [-1, 1]) runsOf(N, (i) => ow[side][i] - base > 12).forEach((run) => { if (run.length >= 18) cands.push({ side, run }); });
  cands.sort((a, b) => b.run.length - a.run.length);
  const used = [];
  for (const cnd of cands) {
    const mid = cnd.run[Math.floor(cnd.run.length / 2)];
    if (circ(mid, 0) < 60 || used.some((u) => circ(u, mid) < 55) || used.length >= 3) continue;
    const sub = cnd.run.slice(Math.max(0, Math.floor(cnd.run.length / 2) - 16), Math.floor(cnd.run.length / 2) + 16);
    if (clearance(C[mid][0] + Nm[mid][0] * cnd.side * (ow[cnd.side][mid] + 30), C[mid][1] + Nm[mid][1] * cnd.side * (ow[cnd.side][mid] + 30), mid) < HW + 26) continue;
    used.push(mid); standGeom(sub, cnd.side, (i) => ow[cnd.side][i], 30, used.length % 2 === 1);
  }

  { const poles = [], pSide = pitOk || sideFree(standSide, HW + 70) >= sideFree(-standSide, HW + 70) ? standSide : -standSide; [-96, -52, -8, 36, 80].forEach((d, q) => { const i = (Math.round(d / ds) + N) % N; for (const sd of [pSide, -pSide]) { const px = C[i][0] + Nm[i][0] * sd * (HW + 66), py = C[i][1] + Nm[i][1] * sd * (HW + 66); if (clearance(px, py, i) > HW + 38 && !wet(px, py)) { poles.push({ x: px, y: py, ph: q * 0.9 }); excl.push([px, py, 8]); break; } } }); Scenery.setPoles(poles); }

  /* 5 · árboles (agrupados, nunca sobre la pista, el agua ni las tribunas) */
  { const step = 26 / Math.sqrt(Math.max(1, env.trees * (scn.treeMul || 1))), list = [], rt = mulberry(hash2(lv.id, 77));
    for (let gx = x0; gx < x1; gx += step) for (let gy = y0; gy < y1; gy += step) {
      const x = gx + (rt() - 0.5) * step, y = gy + (rt() - 0.5) * step;
      const cl = vnoise(x / 130, y / 130) * 0.7 + vnoise(x / 41, y / 41) * 0.3, p = env.trees * (scn.treeMul || 1) * (0.15 + 1.1 * Math.max(0, cl - 0.3));
      if (rt() > p || wet(x, y) || distToRoad(x, y) < HW + 46 || excl.some((e) => hyp(x - e[0], y - e[1]) < e[2])) continue;
      if (lv.city && lv.city.some((r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3])) continue;
      list.push([x, y, 4.2 + rt() * 4.2]);
    }
    list.sort((a, b) => a[1] - b[1]); list.forEach((t) => drawTree(g, scn.treeKind || env.tree, t[0], t[1], t[2], scn.treeTc || env.tc, rt)); }

  /* 6 · muros con publicidad, llantas */
  const wall = "#D5D2C8", wallHi = "#F6F3EA";
  g.lineJoin = "round"; g.lineCap = "round";
  for (const side of [-1, 1]) {
    runsOf(N, (i) => !(side * ci.sg[i] > 0 && ci.k[i] * ow[side][i] > 0.85)).forEach((run) => {
      const pts = pathVar(run, side, (i) => ow[side][i]);
      stroke(pts.map((p) => [p[0] + 1.6, p[1] + 2.2]), 3.6, "rgba(40,28,15,.3)"); stroke(pts, 3.4, wall); stroke(pts, 1.1, wallHi);
      const boards = ["#FD1C22", "#2F6FDB", "#F2B705", "#00A58E", "#FAFAFA", "#2B3A55"];
      for (let a = 2, k = 0; a + 7 < pts.length; a += 11, k++) { const seg = pts.slice(a, a + 8), col = boards[(k + (run[0] >> 3)) % boards.length]; stroke(seg, 4.4, col); stroke(seg, 1, "rgba(255,255,255,.55)"); }
    });
    for (let i = 0; i < N; i += 2) {
      if (!(side * ci.sg[i] < 0 && ci.k[i] > 1 / 200)) continue;
      const o = ow[side][i] + 5, x = C[i][0] + Nm[i][0] * side * o, y = C[i][1] + Nm[i][1] * side * o, alt = (i / 2) % 2 < 1;
      g.fillStyle = "rgba(30,20,10,.3)"; g.beginPath(); g.arc(x + 1.6, y + 2, 3.7, 0, 6.3); g.fill();
      g.fillStyle = alt ? "#1d2024" : "#E8E2D6"; g.beginPath(); g.arc(x, y, 3.6, 0, 6.3); g.fill();
      g.fillStyle = alt ? "#3a3f47" : "#FD1C22"; g.beginPath(); g.arc(x, y, 1.7, 0, 6.3); g.fill();
    }
  }
  g.lineCap = "butt";

  /* 7 · línea de salida y pórtico */
  { const p = C[0], t = T[0], ang = Math.atan2(t[1], t[0]);
    g.save(); g.translate(p[0], p[1]); g.rotate(ang);
    const cs = 6, cols = Math.floor((W - 10) / cs);
    for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) { g.fillStyle = (r + c) % 2 ? "#FAFAFA" : "#1d2026"; g.fillRect(-cs + r * cs, -cols * cs / 2 + c * cs, cs, cs); }
    g.fillStyle = "rgba(40,28,15,.28)"; g.fillRect(10, -HW - 12, 7, W + 24);
    g.fillStyle = "#3A3F47"; g.fillRect(8, -HW - 14, 6, W + 28);
    g.fillStyle = "#FD1C22"; g.fillRect(8, -HW - 14, 6, 5); g.fillRect(8, HW + 9, 6, 5);
    g.restore(); }

  /* 8 · de noche: se oscurece todo y las farolas encienden charcos de luz */
  if (dark) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "multiply"; g.fillStyle = Scenery.def(lv).night && resolvedTheme() !== "dark" ? "#6A76A6" : "#41507C"; g.fillRect(0, 0, bg.width, bg.height); g.globalCompositeOperation = "source-over";
    setWorld(g); g.globalCompositeOperation = "lighter";
    for (let i = 6; i < N; i += 22) {
      for (const side of [-1, 1]) {
        const o = ow[side][i] + 4, lx = C[i][0] + Nm[i][0] * side * o, ly = C[i][1] + Nm[i][1] * side * o, rg = g.createRadialGradient(lx, ly, 0, lx, ly, 58);
        rg.addColorStop(0, "rgba(255,206,140,.26)"); rg.addColorStop(1, "rgba(255,206,140,0)"); g.fillStyle = rg; g.fillRect(lx - 58, ly - 58, 116, 116);
      }
    }
    Scenery.nightLights(g);
    g.globalCompositeOperation = "source-over";
    for (let i = 6; i < N; i += 22) for (const side of [-1, 1]) { const o = ow[side][i] + 4, lx = C[i][0] + Nm[i][0] * side * o, ly = C[i][1] + Nm[i][1] * side * o; g.fillStyle = "#FFE7BC"; g.beginPath(); g.arc(lx, ly, 1.8, 0, 6.3); g.fill(); }
  }

  /* 9 · viñeta suave */
  g.setTransform(1, 0, 0, 1, 0, 0);
  const vg = g.createRadialGradient(bg.width / 2, bg.height / 2, Math.min(bg.width, bg.height) * 0.35, bg.width / 2, bg.height / 2, Math.hypot(bg.width, bg.height) * 0.62);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(10,16,8,${dark ? 0.3 : 0.14})`); g.fillStyle = vg; g.fillRect(0, 0, bg.width, bg.height);
}
