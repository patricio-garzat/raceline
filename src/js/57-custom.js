"use strict";
/* custom.js: "Mis circuitos". El jugador dibuja su propia pista de un solo trazo; el juego la cierra, la suaviza, la ajusta al mundo, la valida
   (curvas, separación entre tramos, recta de salida) y la guarda en Save.custom. Cada circuito tiene nombre, ancho de calle, paisaje y rivales. */
const Custom = (() => {
  FLAGS.cu = {   // banderita de cuadros para todos los circuitos propios
    src: "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" shape-rendering="crispEdges"><rect width="60" height="40" fill="#F4F5F8"/>' +
      Array.from({ length: 24 }, (_, i) => { const x = i % 6, y = (i / 6) | 0; return (x + y) % 2 ? `<rect x="${x * 10}" y="${y * 10}" width="10" height="10" fill="#1E2430"/>` : ""; }).join("") + "</svg>"),
    c: ["#1E2430", "#E9ECF2", "#1E2430", "#E9ECF2"],
  };

  /* ---------- Paisajes ---------- */
  const THEMES = [
    { key: "meadow", env: "park" }, { key: "alpine", env: "alpine" }, { key: "forest", env: "forest" }, { key: "desert", env: "desert" },
    { key: "fields", env: "sunflower" }, { key: "tropic", env: "tropical" }, { key: "city", env: "urban", city: true }, { key: "night", env: "urban", city: true, night: true },
    { key: "coast", env: "sea", coast: true }, { key: "air", env: "airfield" },
  ];
  const NAMES = { meadow: "t_meadow", alpine: "t_alpine", forest: "t_forest", desert: "t_desert", fields: "t_fields", tropic: "t_tropic", city: "t_city", night: "t_night", coast: "t_coast", air: "t_air" };
  const hwf = () => Scenery.HW(), ap = (o) => Scenery.push(o);
  const sv = (S, cols) => S.serviceRoad(hwf() + 40, cols);
  Scenery.addScenes({
    __meadow: { clouds: 0.8, build(S) { S.patch(["grass", "grass", "wheat"], { fill: 0.5 }); S.houses(4, "red", { cnt: 9 }); S.pond({ rx: 44, ry: 28 }); S.hay(14); S.cows(18); S.lot({}); sv(S, "#CDBE9A"); S.speckle(["#F4F2EC", "#F2D24A"], 400); ap({ t: "birds", n: 6, col: "#2B2B30", sp: 20 }); } },
    __alpine: { clouds: 1.1, build(S) { S.hills(12, { r: 140, light: 0.16, dark: 0.2 }); S.patch(["grass", "grass", "hay"], { fill: 0.45 }); S.houses(4, "alp", { cnt: 9 }); S.cows(22); S.tents(3, ["#F27A21", "#2E86C1", "#E8E2D2"]); sv(S, "#A8A08C"); S.speckle(["#F4F2EC", "#8FA070"], 500); ap({ t: "birds", n: 6, col: "#2B2B30", sp: 20 }); } },
    __forest: { clouds: 0.9, fog: 0.6, leaves: ["#C9922E", "#B5651D", "#A64B2A"], build(S) { S.hills(8, { r: 130, light: 0.18, dark: 0.12 }); S.houses(2, "alp", { cnt: 5 }); S.rocks(6, { r: 14, col: "#8E8A80" }); sv(S, "#B9AE92"); S.speckle(["#F4F2EC", "#C9922E"], 300); } },
    __desert: { clouds: 0.3, wind: true, build(S) { S.rocks(10, { r: 16, col: "#A58F73" }); S.tents(4, ["#C25A3C", "#E8E2D2", "#2E86C1"]); S.palms(5, { cnt: 4 }); S.tanks(2); S.lot({}); sv(S, "#C9B48A"); S.speckle(["#B5A074", "#8E7A52"], 400); ap({ t: "birds", n: 5, col: "#6B7077", sp: 20 }); } },
    __fields: { clouds: 0.7, build(S) { S.patch(["sun", "sun", "wheat", "grass", "lavender"], { fill: 0.88 }); S.windmill(3, { len: 20 }); S.hay(20); S.houses(3, "red", { cnt: 7 }); S.pond({ rx: 40, ry: 26 }); sv(S, "#CDBE9A"); S.speckle(["#F4F2EC", "#F2D24A"], 500); ap({ t: "balloon" }); ap({ t: "birds", n: 6, col: "#2B2B30", sp: 20 }); } },
    __tropic: { clouds: 0.8, build(S) { S.patch(["grass"], { fill: 0.35 }); S.houses(8, "tropic", { cnt: 14, w: 16 }); S.palms(8, { cnt: 5 }); S.pond({ rx: 44, ry: 28 }); S.lot({}); sv(S, "#B5651D"); S.speckle(["#F2D24A", "#E052A0", "#F4F2EC"], 500); ap({ t: "birds", n: 7, col: "#2FAE5A", sp: 18 }); } },
    __city: { clouds: 0.5, neon: ["#FFD27A", "#4FD8E6"], build(S) { S.towers(28, { hgt: 46, w: 28, cols: ["#9FB2C4", "#B7C3CE", "#8FA3B8", "#C8CFD6"], city: true }); S.fountain({}); S.lot({}); sv(S, "#8E8A82"); ap({ t: "birds", n: 7, col: "#6B7077", sp: 20 }); } },
    __night: { night: true, clouds: 0, neon: ["#FF5CC8", "#35E0FF", "#FFD25C", "#6CFFB5"], build(S) { S.towers(30, { hgt: 60, w: 28, neon: ["#FF5CC8", "#35E0FF", "#FFD25C", "#6CFFB5"], cols: ["#9FB2C4", "#B7C3CE", "#8FA3B8"], city: true }); S.fountain({}); S.lot({}); sv(S, "#9A9486"); } },
    __coast: { clouds: 0.6, build(S) { S.umbrellas(30); S.palms(6, { cnt: 4 }); S.houses(4, "med", { cnt: 10 }); S.lot({}); sv(S, "#E3D6B8"); S.speckle(["#F4F2EC", "#8FA070"], 400); ap({ t: "boats", kind: "sail", n: 4 }); ap({ t: "birds", n: 8, col: "#F4F2EC", sp: 22 }); } },
    __air: { clouds: 0.7, build(S) { S.hangars(3); S.lot({ w: 100, h: 60 }); S.tanks(2); sv(S, "#CDBE9A"); S.speckle(["#F4F2EC", "#F2D24A"], 300); ap({ t: "birds", n: 5, col: "#2B2B30", sp: 20 }); } },
  });

  /* ---------- Geometría: del trazo a la pista ---------- */
  const R6 = 6;   // separación de los puntos de la pista (unidades del mundo)
  const bboxOf = (P) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return [x0, y0, x1, y1]; };
  function fitToWorld(P, k = 1) {   // se centra y se agranda para llenar el mundo (sin deformar); k < 1 deja holgura para que el ajuste pueda crecer
    const [x0, y0, x1, y1] = bboxOf(P), bw = Math.max(x1 - x0, 1), bh = Math.max(y1 - y0, 1);
    const s = Math.min((WORLD.w - 190) / bw, 850 / bh, 3) * k, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return resampleClosed(P.map((p) => [WORLD.w / 2 + (p[0] - cx) * s, 500 + (p[1] - cy) * s]), R6);
  }
  function radii(S, k = 3) {
    const n = S.length, out = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = S[(i - k + n) % n], b = S[i], c = S[(i + k) % n], ab = hyp(a[0] - b[0], a[1] - b[1]), bc = hyp(c[0] - b[0], c[1] - b[1]), ca = hyp(a[0] - c[0], a[1] - c[1]);
      const cr = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
      out[i] = cr > 1e-6 ? (ab * bc * ca) / (2 * cr) : 1e9;
    }
    return out;
  }
  const rminOf = (S) => Math.min(...radii(S));
  function minSep(S, gapUnits = 220) {   // distancia mínima entre tramos que no son vecinos (si se cruzan o se tocan, sale casi 0)
    const n = S.length, g = Math.round(gapUnits / R6); let m = 1e12;
    for (let i = 0; i < n; i++) for (let j = i + g; j < n; j++) {
      if (i + n - j < g) continue;
      const dx = S[i][0] - S[j][0], dy = S[i][1] - S[j][1], d = dx * dx + dy * dy; if (d < m) m = d;
    }
    return Math.sqrt(m);
  }
  // Arregla solo lo que no sirve: abre las curvas muy cerradas y separa los tramos que quedan muy juntos (sin que el jugador tenga que redibujar)
  function relax(S, roadW) {
    const hw = roadW / 2, Rmin = hw * 0.58, Dmin = roadW + 40, g = Math.round(220 / R6), D2 = Dmin * Dmin;
    for (let it = 0; it < 90; it++) {
      const n = S.length, R = radii(S), bad = new Array(n).fill(false); let nb = 0, np = 0;
      for (let i = 0; i < n; i++) if (R[i] < Rmin) { nb++; for (let d = -7; d <= 7; d++) bad[(i + d + n) % n] = true; }
      const pu = S.map(() => [0, 0, 0]);
      for (let i = 0; i < n; i++) for (let j = i + g; j < n; j++) {
        if (i + n - j < g) continue;
        const dx = S[i][0] - S[j][0], dy = S[i][1] - S[j][1], d2 = dx * dx + dy * dy;
        if (d2 >= D2 || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), df = (Dmin - d) / 2 + 0.5, ux = dx / d, uy = dy / d; np++;
        pu[i][0] += ux * df; pu[i][1] += uy * df; pu[i][2]++; pu[j][0] -= ux * df; pu[j][1] -= uy * df; pu[j][2]++;
      }
      if (!nb && !np) break;
      const T = S.map((p, i) => {   // empuje promedio, repartido por los vecinos para que la pista no se quiebre
        let x = 0, y = 0, w = 0;
        for (let d = -5; d <= 5; d++) { const q = pu[(i + d + n) % n], c = q[2]; if (c) { const wt = 1 - Math.abs(d) / 6; x += (q[0] / c) * wt; y += (q[1] / c) * wt; w += wt; } }
        return w ? [x / 5, y / 5] : [0, 0];
      });
      S = S.map((p, i) => {
        let x = p[0] + T[i][0] * 0.8, y = p[1] + T[i][1] * 0.8;
        if (bad[i]) { const a = S[(i - 2 + n) % n], c = S[(i + 2) % n]; x += ((a[0] + c[0]) / 2 - p[0]) * 0.55; y += ((a[1] + c[1]) / 2 - p[1]) * 0.55; }
        return [x, y];
      });
      S = gaussClosed(S, 4);
    }
    return S;
  }
  function findStart(S) {   // la ventana de ~200 unidades que menos gira es la recta de salida
    const n = S.length, th = S.map((p, i) => { const q = S[(i + 1) % n]; return Math.atan2(q[1] - p[1], q[0] - p[0]); });
    const d = th.map((t, i) => { let x = th[(i + 1) % n] - t; while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return Math.abs(x); });
    const win = 34; let best = 1e9, bi = 0, sum = 0;
    for (let k = 0; k < win; k++) sum += d[k];
    for (let i = 0; i < n; i++) { if (sum < best) { best = sum; bi = i; } sum += d[(i + win) % n] - d[i]; }
    return { turn: best, win: bi, idx: (bi + 22) % n };
  }
  function flatten(S, i0, win = 34, taper = 12) {   // convierte la parte más recta en una recta de verdad para la salida
    const n = S.length, A = S[i0], B = S[(i0 + win) % n], out = S.map((p) => p.slice());
    for (let k = -taper; k <= win + taper; k++) {
      const i = (i0 + k + n) % n, t = Math.min(1, Math.max(0, k / win)), tx = A[0] + (B[0] - A[0]) * t, ty = A[1] + (B[1] - A[1]) * t;
      let w = 1; if (k < 0) w = 1 + k / taper; else if (k > win) w = 1 - (k - win) / taper; w = w * w * (3 - 2 * w);
      out[i] = [S[i][0] + (tx - S[i][0]) * w, S[i][1] + (ty - S[i][1]) * w];
    }
    return out;
  }
  // raw: puntos del trazo (o de una pista ya guardada). Devuelve { pts, start } o { err: clave de texto }.
  function process(raw, roadW) {
    const hw = roadW / 2;
    let P = resampleOpen(raw, R6);
    const [bx0, by0, bx1, by1] = bboxOf(P);
    if (P.length < 12 || hyp(bx1 - bx0, by1 - by0) < 220) return { err: "c_err_small" };
    let L = 0; for (let i = 1; i < P.length; i++) L += hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    const last = P[P.length - 1], gx = P[0][0] - last[0], gy = P[0][1] - last[1], gap = hyp(gx, gy);
    if (gap > Math.max(260, L * 0.4)) return { err: "c_err_open" };
    const n0 = P.length; P = P.map((p, i) => [p[0] + (gx * i) / (n0 - 1), p[1] + (gy * i) / (n0 - 1)]); P.pop();   // el hueco se reparte a lo largo del trazo
    let S = resampleClosed(P, R6);
    S = gaussClosed(S, 6);   // quita el temblor del dedo (suave: las esquinas que dibujó se respetan)
    S = relax(fitToWorld(S, 0.93), roadW);     // arregla curvas cerradas y tramos pegados
    let st = findStart(S);
    if (st.turn > 0.18) { S = gaussClosed(flatten(S, st.win), 6); st = findStart(S); }   // la salida siempre en recta
    S = gaussClosed(S, 4);
    S = fitToWorld(S);   // al final se agranda para llenar el mundo (agrandar solo ayuda: las curvas se abren y los tramos se separan)
    st = findStart(S);
    if (minSep(S) < roadW + 32) return { err: "c_err_close" };
    if (rminOf(S) < hw * 0.42) return { err: "c_err_tight" };
    if (st.turn > 0.8) return { err: "c_err_straight" };
    return { pts: S.map((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]), start: S[st.idx].map((v) => Math.round(v * 10) / 10) };
  }

  /* ---------- Costa (agua por el lado con más espacio) ---------- */
  function shoreLine(P, side, hw, wave) {
    const gap = hw + 42, horiz = side === "bottom" || side === "top", sg = side === "bottom" || side === "right" ? 1 : -1, span = horiz ? WORLD.w : WORLD.h;
    const ax = P.map((p) => (horiz ? p[0] : p[1])), ex = P.map((p) => (horiz ? p[1] : p[0]));
    const near = (t) => { let e = null; for (let i = 0; i < ax.length; i++) if (Math.abs(ax[i] - t) < 150) e = e == null ? ex[i] : sg > 0 ? Math.max(e, ex[i]) : Math.min(e, ex[i]); return e; };
    const gl = sg > 0 ? Math.max(...ex) : Math.min(...ex), ts = [], es = [];
    for (let t = -300; t < span + 300; t += 20) { const e = near(t); ts.push(t); es.push((e == null ? gl : e) + sg * (gap + 8 * Math.sin(t / 61) + wave * Math.sin(t / 27 + 1.3))); }
    let cur = es;
    for (let k = 0; k < 6; k++) { const n = cur.length, nx = []; for (let i = 0; i < n; i++) { let a = 0; for (let j = -6; j <= 6; j++) a += cur[Math.min(n - 1, Math.max(0, i + j))]; nx.push(a / 13); } cur = nx; }
    return ts.map((t, i) => { const e0 = near(t); let e = cur[i]; if (e0 != null) { const lim = sg > 0 ? e0 + gap * 0.9 : e0 - gap * 0.9; e = sg > 0 ? Math.max(e, lim) : Math.min(e, lim); } return [t, e]; });
  }
  const coastSide = (pts) => { const [x0, y0, x1, y1] = bboxOf(pts), bias = WORLD.w < 700 ? 110 : 0, m = { left: x0, right: WORLD.w - x1, top: y0 + bias, bottom: WORLD.h - y1 + bias }; return Object.keys(m).reduce((a, b) => (m[b] > m[a] ? b : a)); };
  function addCoast(lv, pts) {
    const side = coastSide(pts), horiz = side === "bottom" || side === "top", far = side === "bottom" || side === "right" ? 3600 : -3600;
    const line = shoreLine(pts, side, lv.roadW / 2, 14), pp = line.map(([a, b]) => (horiz ? [a, b] : [b, a]));
    lv.shore = { side, pts: pp.map((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]) };
    lv.water = [pp.concat(horiz ? [[line[line.length - 1][0], far], [line[0][0], far]] : [[far, line[line.length - 1][0]], [far, line[0][0]]])];
  }

  /* ---------- Los circuitos guardados ---------- */
  const built = new WeakMap();
  function buildLv(e) {
    const th = THEMES.find((t) => t.key === e.theme) || THEMES[0];
    const lv = { id: e.id, grp: 3, cc: "cu", custom: true, diff: e.diff, name: e.name, sub: [STR.c_my_sub[0], STR.c_my_sub[1]], roadW: e.roadW, start: e.start, poly: e.pts.map((p) => [p[0], p[1], 0]),
      env: th.env, water: [], lakes: [], city: th.city ? [[-3600, -3600, 3600, 3600]] : [], shore: null, boats: false, scene: "__" + th.key };
    if (th.coast) addCoast(lv, e.pts);
    return lv;
  }
  const MODE = DESKTOP ? "d" : "p";   // los circuitos se dibujan para el tamaño de pantalla donde se crearon (compu o celular)
  function list() { return (Save.custom || []).filter((e) => (e.mode || "p") === MODE).map((e) => { let lv = built.get(e); if (!lv) { lv = buildLv(e); built.set(e, lv); } return lv; }); }
  const entryOf = (lv) => (Save.custom || []).find((e) => e.id === lv.id);

  /* ---------- El editor ---------- */
  const scr = $("scr-editor"), cv = $("ed-cv"), g = cv.getContext("2d"), stage = $("ed-stage"), hintEl = $("ed-hint"), panel = $("ed-panel"), nameEl = $("ed-name");
  const st = { open: false, phase: "draw", raw: [], pts: null, start: null, roadW: 92, theme: "meadow", diff: 1, editId: null, drawing: false, flash: 0 };
  let K = 1, OX0 = 0, OY0 = 0, DPR = 1, hintT = 0;

  function layout() {
    const r = stage.getBoundingClientRect(); DPR = Math.min(2.5, window.devicePixelRatio || 1);
    cv.width = Math.max(2, Math.round(r.width * DPR)); cv.height = Math.max(2, Math.round(r.height * DPR));
    K = Math.min((r.width - 20) / WORLD.w, (r.height - 20) / WORLD.h); OX0 = (r.width - WORLD.w * K) / 2; OY0 = DESKTOP ? 6 : (r.height - WORLD.h * K) / 2;
    draw();
  }
  const toW = (e) => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left - OX0) / K, (e.clientY - r.top - OY0) / K]; };
  function say(key, err, hold) {
    clearTimeout(hintT); hintEl.classList.toggle("err", !!err); hintEl.textContent = key ? T(key) : ""; hintEl.style.opacity = key ? 1 : 0;
    if (hold) hintT = setTimeout(() => say(st.phase === "draw" ? "c_draw_hint" : "c_ok"), hold);
  }
  const theme = () => THEMES.find((t) => t.key === st.theme) || THEMES[0];

  function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function path(P, close) { g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); if (close) g.closePath(); }
  function draw() {
    const w = cv.width / DPR, h = cv.height / DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, w, h);
    const env = ENVS[theme().env];
    g.save(); g.translate(OX0, OY0); g.scale(K, K);
    roundRect(0, 0, WORLD.w, WORLD.h, 22 / K); g.save(); g.clip();
    g.fillStyle = env.g1; g.fillRect(0, 0, WORLD.w, WORLD.h);
    g.fillStyle = "rgba(255,255,255,.07)"; for (let y = 0; y < WORLD.h; y += 100) g.fillRect(0, y, WORLD.w, 50);
    if (st.phase === "setup" && st.pts && theme().coast) {
      const sd = coastSide(st.pts), horiz = sd === "bottom" || sd === "top", far = sd === "bottom" || sd === "right" ? 3600 : -3600, ln = shoreLine(st.pts, sd, st.roadW / 2, 14), pp = ln.map(([a, b]) => (horiz ? [a, b] : [b, a]));
      path(pp.concat(horiz ? [[ln[ln.length - 1][0], far], [ln[0][0], far]] : [[far, ln[ln.length - 1][0]], [far, ln[0][0]]]), true); g.fillStyle = env.water || "#3F98B8"; g.fill();
    }
    if (st.phase === "setup" && theme().city) { g.fillStyle = "rgba(60,70,90,.16)"; for (let x = 0; x < WORLD.w; x += 80) for (let y = 0; y < WORLD.h; y += 80) if (((x + y) / 80) % 2 === 0) g.fillRect(x + 6, y + 6, 68, 68); }
    g.restore();
    g.lineWidth = 2 / K; g.strokeStyle = "rgba(255,255,255,.55)"; g.setLineDash([10 / K, 8 / K]); roundRect(0, 0, WORLD.w, WORLD.h, 22 / K); g.stroke(); g.setLineDash([]);
    g.lineCap = "round"; g.lineJoin = "round";
    if (st.phase === "setup" && st.pts) {
      const P = st.pts;
      path(P, true); g.lineWidth = st.roadW + 12; g.strokeStyle = "#ECE8DC"; g.stroke();
      path(P, true); g.lineWidth = st.roadW; g.strokeStyle = "#3A3D45"; g.stroke();
      path(P, true); g.lineWidth = 2.4; g.strokeStyle = "rgba(255,255,255,.55)"; g.setLineDash([16, 14]); g.stroke(); g.setLineDash([]);
      // línea de salida (cuadros) y flecha del sentido
      const i0 = P.findIndex((p) => p[0] === st.start[0] && p[1] === st.start[1]), n = P.length, a = P[(i0 - 1 + n) % n], b = P[(i0 + 1) % n], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      g.save(); g.translate(st.start[0], st.start[1]); g.rotate(ang);
      const hw = st.roadW / 2, cs = 9, cols = Math.ceil(st.roadW / cs);
      for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) { g.fillStyle = (r + c) % 2 ? "#14171C" : "#F4F5F8"; g.fillRect(-cs + r * cs, -hw + c * cs, cs, Math.min(cs, hw - (-hw + c * cs))); }
      g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.moveTo(54, 0); g.lineTo(34, -12); g.lineTo(34, 12); g.closePath(); g.fill();
      g.restore();
    } else if (st.raw.length > 1) {
      const sm = gaussOpen(resampleOpen(st.raw, 5), 13);   // igual que al dibujar la línea de carrera: suave y pegada al dedo (el extremo queda fijo)
      path(sm, false); g.lineWidth = 7; g.strokeStyle = "rgba(0,0,0,.18)"; g.stroke();
      path(sm, false); g.lineWidth = 4.5; g.strokeStyle = "#FFFFFF"; g.stroke();
      const f = st.raw[0]; g.beginPath(); g.arc(f[0], f[1], 9, 0, 6.3); g.fillStyle = "#FD1C22"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke();
    }
    g.restore();
  }

  /* trazo */
  cv.addEventListener("pointerdown", (e) => {
    if (!st.open || st.phase !== "draw" || st.drawing) return;
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    st.drawing = true; st.raw = [toW(e)]; st.pen = { tip: st.raw[0].slice(), fing: st.raw[0], t: e.timeStamp }; say("c_draw_hint"); Sound.penStart(); draw();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!st.drawing) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e], last = () => st.raw[st.raw.length - 1];
    for (const ev of evs.length ? evs : [e]) { const p = toW(ev); penFollow(st.pen.tip, p, ev.timeStamp - st.pen.t, 22); st.pen.t = ev.timeStamp; st.pen.fing = p; const q = st.pen.tip; if (hyp(q[0] - last()[0], q[1] - last()[1]) > 3) st.raw.push(q.slice()); }
    draw();
  });
  function endStroke() {
    if (!st.drawing) return;
    if (st.pen) { const q = st.pen.tip; for (let i = 0; i < 40 && hyp(st.pen.fing[0] - q[0], st.pen.fing[1] - q[1]) > 2.5; i++) { penFollow(q, st.pen.fing, 14, 22); st.raw.push(q.slice()); } }   // al soltar, la línea alcanza al dedo
    st.drawing = false; Sound.penEnd();
    if (st.raw.length < 8) { st.raw = []; draw(); return; }
    const res = process(st.raw, st.roadW);
    if (res.err) { say(res.err, true, 3200); Haptics.soft(); setTimeout(() => { if (st.phase === "draw" && !st.drawing) { st.raw = []; draw(); } }, 900); return; }
    st.pts = res.pts; st.start = res.start; setPhase("setup"); Haptics.tap();
  }
  cv.addEventListener("pointerup", endStroke); cv.addEventListener("pointercancel", endStroke);

  function setPhase(ph) {
    st.phase = ph; scr.classList.toggle("setup", ph === "setup"); say(ph === "draw" ? "c_draw_hint" : "c_ok");
    syncPanel(); requestAnimationFrame(layout);
  }
  function syncPanel() {
    document.querySelectorAll("#ed-w button").forEach((b) => b.classList.toggle("on", +b.dataset.v === st.roadW));
    document.querySelectorAll("#ed-d button").forEach((b) => b.classList.toggle("on", +b.dataset.v === st.diff));
    document.querySelectorAll("#ed-themes button").forEach((b) => b.classList.toggle("on", b.dataset.v === st.theme));
    $("ed-title").textContent = T(st.editId ? "c_edit_title" : "c_new");
    document.querySelectorAll("#ed-themes b").forEach((b) => { b.textContent = T(NAMES[b.parentNode.dataset.v]); });
  }
  // los chips de paisaje
  $("ed-themes").innerHTML = THEMES.map((t) => `<button data-v="${t.key}"><i style="background:${ENVS[t.env].g1}"></i><b></b></button>`).join("");
  document.querySelectorAll("#ed-themes button").forEach((b) => { b.onclick = () => { st.theme = b.dataset.v; syncPanel(); draw(); }; });
  document.querySelectorAll("#ed-d button").forEach((b) => { b.onclick = () => { st.diff = +b.dataset.v; syncPanel(); }; });
  document.querySelectorAll("#ed-w button").forEach((b) => {
    b.onclick = () => {
      const w = +b.dataset.v; if (w === st.roadW || !st.pts) return;
      const res = process(st.pts, w);
      if (res.err) { say("c_err_width", true, 2600); Haptics.soft(); return; }
      st.roadW = w; st.pts = res.pts; st.start = res.start; syncPanel(); draw();
    };
  });
  $("ed-redraw").onclick = () => { st.raw = []; st.pts = null; st.start = null; setPhase("draw"); };
  $("ed-back").onclick = () => close();
  function close() { st.open = false; scr.classList.remove("show", "setup"); Sound.nav(); }
  addEventListener("resize", () => { if (st.open) layout(); });

  $("ed-save").onclick = () => {
    if (!st.pts) return;
    const name = (nameEl.value || "").replace(/[<>&"'`]/g, "").trim().slice(0, 18) || T("c_default");
    const old = st.editId ? (Save.custom || []).findIndex((e) => e.id === st.editId) : -1;
    Save.customNext = Math.max(1001, Save.customNext | 0);
    const entry = { id: st.editId || Save.customNext++, name, theme: st.theme, roadW: st.roadW, diff: st.diff, start: st.start, pts: st.pts, mode: MODE };
    if (!Save.custom) Save.custom = [];
    if (old >= 0) { Save.custom[old] = entry; delete Save.levels[entry.id]; } else Save.custom.push(entry);
    persist(); close();
    enterLevel(list().find((l) => l.id === entry.id));
  };

  function open(lv) {
    const e = lv && entryOf(lv);
    Object.assign(st, { open: true, raw: [], drawing: false, editId: e ? e.id : null, roadW: e ? e.roadW : 92, theme: e ? e.theme : "meadow", diff: e ? e.diff : 1, pts: e ? e.pts : null, start: e ? e.start : null });
    nameEl.value = e ? e.name : ""; nameEl.placeholder = T("c_default");
    scr.classList.add("show"); setPhase(e ? "setup" : "draw");
  }

  /* ---------- Hoja de opciones de un circuito propio ---------- */
  const sheetEl = $("sheet");
  function sheet(lv) {
    $("sh-name").textContent = lv.name; sheetEl.classList.add("show");
    const done = () => sheetEl.classList.remove("show");
    sheetEl.onclick = (e) => { if (e.target === sheetEl) done(); };
    $("sh-race").onclick = () => { done(); enterLevel(lv); };
    $("sh-edit").onclick = () => { done(); open(lv); };
    $("sh-del").onclick = async () => {
      done();
      if (await UI.ask(T("c_del_q"), T("c_delete"))) { Save.custom = (Save.custom || []).filter((e) => e.id !== lv.id); delete Save.levels[lv.id]; persist(); UI.buildLevels(); }
    };
  }

  return { open, list, sheet, process };
})();
