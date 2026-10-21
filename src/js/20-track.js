"use strict";
/* track.js: pistas (niveles), líneas de carrera, perfil de velocidad y simulación de la carrera */

const DT = 1 / 120;
const BOOST_DUR = 2.3, BOOST_V = 0.11, BOOST_A = 1.1;   // mini boost: +11 % de velocidad en rectas y más empuje al salir de las curvas, durante 2.3 s
const VMAX = 340, A_LAT = 700, A_ACC = 380, A_BRK = 650;   // unidades/s y unidades/s²
// Modelo del carro: agarre lateral con carga aerodinámica (más rápido = más agarre), elipse de fricción (no se puede frenar ni
// acelerar a fondo mientras se está al límite en la curva) y resistencia del aire (la aceleración cae al acercarse a la punta).
const AERO_Q = 0.45;
const PHYS = { vmax: VMAX, alat: A_LAT, aacc: A_ACC, abrk: A_BRK, q: AERO_Q };
const CAR_L = 36, CAR_W = 18;
const COLORS = { player: "#F4F4F4", r1: "#2F6FDB", r2: "#F2B705", r3: "#00A58E" };


/* ---------- Geometría ---------- */
function resampleClosed(P, ds) {
  const n = P.length, cum = [0];
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; cum.push(cum[i] + hyp(b[0] - a[0], b[1] - a[1])); }
  const L = cum[n], N = Math.max(8, Math.round(L / ds)), step = L / N, out = [];
  let j = 0;
  for (let k = 0; k < N; k++) {
    const d = k * step;
    while (cum[j + 1] < d) j++;
    const a = P[j], b = P[(j + 1) % n], f = (d - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}
function resampleOpen(P, ds) {
  const out = [P[0]]; let acc = 0;
  for (let i = 1; i < P.length; i++) {
    let a = P[i - 1], b = P[i], d = hyp(b[0] - a[0], b[1] - a[1]);
    while (acc + d >= ds && d > 0) { const f = (ds - acc) / d; a = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; out.push(a); d = hyp(b[0] - a[0], b[1] - a[1]); acc = 0; }
    acc += d;
  }
  out.push(P[P.length - 1]);
  return out;
}
// Suavizado de Taubin (no encoge las curvas)
function taubin(P, iters, lam = 0.5, mu = -0.53) {
  const n = P.length;
  for (let it = 0; it < iters; it++) for (const f of [lam, mu]) {
    P = P.map((p, i) => { const a = P[(i - 1 + n) % n], b = P[(i + 1) % n]; return [p[0] + f * ((a[0] + b[0]) / 2 - p[0]), p[1] + f * ((a[1] + b[1]) / 2 - p[1])]; });
  }
  return P;
}
// Suavizado gaussiano por longitud de arco (sigma en unidades del mundo). Quita los temblores del dedo y deja las curvas reales.
function gaussWeights(sigma, ds) {
  const R = Math.ceil((3 * sigma) / ds), w = [];
  for (let k = -R; k <= R; k++) w.push(Math.exp(-((k * ds) * (k * ds)) / (2 * sigma * sigma)));
  return { R, w };
}
function gaussClosed(P, sigma) {
  const n = P.length; let len = 0;
  for (let i = 0; i < n; i++) len += hyp(P[(i + 1) % n][0] - P[i][0], P[(i + 1) % n][1] - P[i][1]);
  const { R, w } = gaussWeights(sigma, len / n), sw = w.reduce((a, b) => a + b, 0);
  return P.map((p, i) => { let x = 0, y = 0; for (let k = -R; k <= R; k++) { const q = P[(((i + k) % n) + n) % n], v = w[k + R] / sw; x += q[0] * v; y += q[1] * v; } return [x, y]; });
}
// Igual pero para un trazo abierto (la vista previa mientras se dibuja): los extremos quedan fijos (se refleja el trazo por cada punta),
// así la línea llega exactamente al dedo y se puede continuar desde ahí sin saltos.
function gaussOpen(P, sigma) {
  const n = P.length; if (n < 3) return P;
  const { R, w } = gaussWeights(sigma, 5), sw = w.reduce((a, b) => a + b, 0);
  const at = (j) => {
    if (j < 0) { const m = Math.min(-j, n - 1); return [2 * P[0][0] - P[m][0], 2 * P[0][1] - P[m][1]]; }
    if (j >= n) { const m = Math.max(2 * (n - 1) - j, 0); return [2 * P[n - 1][0] - P[m][0], 2 * P[n - 1][1] - P[m][1]]; }
    return P[j];
  };
  return P.map((p, i) => { let x = 0, y = 0; for (let k = -R; k <= R; k++) { const q = at(i + k), v = w[k + R] / sw; x += q[0] * v; y += q[1] * v; } return [x, y]; });
}
const SMOOTH = 20;
const PLAYER_SMOOTH = 26;   // la línea del jugador se suaviza un poco más que la de los rivales
// "Estabilizador" del trazo: la punta del lápiz persigue al dedo con un retraso suave (como si la línea fuera detrás de él), así los temblores no entran.
const PEN_TAU = 55;   // ms
function penFollow(tip, p, dtMs, tau = PEN_TAU) { const k = 1 - Math.exp(-Math.min(40, Math.max(4, dtMs)) / tau); tip[0] += (p[0] - tip[0]) * k; tip[1] += (p[1] - tip[1]) * k; }

// Circuito a partir de un polígono con radios [x, y, radio]: rectas y arcos de radio constante (como una pista de verdad)
function filletPoly(poly, step = 3) {
  const n = poly.length, V = poly.map((p) => [p[0], p[1]]), R = poly.map((p) => p[2] || 0);
  const info = V.map((v, i) => {
    const p = V[(i - 1 + n) % n], q = V[(i + 1) % n];
    const u = [v[0] - p[0], v[1] - p[1]], w = [q[0] - v[0], q[1] - v[1]], lu = hyp(u[0], u[1]), lw = hyp(w[0], w[1]);
    u[0] /= lu; u[1] /= lu; w[0] /= lw; w[1] /= lw;
    const cr = u[0] * w[1] - u[1] * w[0], th = Math.acos(clamp(u[0] * w[0] + u[1] * w[1], -1, 1));
    return { v, u, w, cr, th, lu, t: th < 1e-3 ? 0 : R[i] * Math.tan(th / 2) };
  });
  for (let k = 0; k < 6; k++) info.forEach((a, i) => { const b = info[(i + 1) % n]; if (a.t + b.t > b.lu * 0.98) { const f = (b.lu * 0.98) / (a.t + b.t); a.t *= f; b.t *= f; } });
  const out = [];
  info.forEach((a) => {
    if (a.t < 0.01) { out.push(a.v); return; }
    const r = a.t / Math.tan(a.th / 2), sg = Math.sign(a.cr);
    const A = [a.v[0] - a.u[0] * a.t, a.v[1] - a.u[1] * a.t];
    const C = [A[0] - a.u[1] * sg * r, A[1] + a.u[0] * sg * r];
    const a0 = Math.atan2(A[1] - C[1], A[0] - C[0]), steps = Math.max(2, Math.ceil((a.th * r) / step));
    for (let k = 0; k <= steps; k++) { const ang = a0 + (sg * a.th * k) / steps; out.push([C[0] + Math.cos(ang) * r, C[1] + Math.sin(ang) * r]); }
  });
  return out;
}

/* ---------- La pista activa (TR) ---------- */
let TR = null;
function centerlineOf(lv) {
  let C = resampleClosed(filletPoly(lv.poly), 4);
  let b = 0, bd = 1e9;
  C.forEach((p, i) => { const d = hyp(p[0] - lv.start[0], p[1] - lv.start[1]); if (d < bd) { bd = d; b = i; } });
  return C.slice(b).concat(C.slice(0, b));
}
function useTrack(lv) {
  if (!lv._tr) {
    const C = centerlineOf(lv), N = C.length, hw = lv.roadW / 2;
    const T = C.map((p, i) => { const a = C[(i - 1 + N) % N], c = C[(i + 1) % N], dx = c[0] - a[0], dy = c[1] - a[1], l = hyp(dx, dy); return [dx / l, dy / l]; });
    const Nm = T.map((t) => [-t[1], t[0]]);
    const tr = { lv, roadW: lv.roadW, hw, edge: hw - 8, C, N, T, Nm, ds: 4, ideal: null, center: null };
    tr.nearest = (x, y) => {
      let bi = 0, bd = 1e12;
      for (let i = 0; i < N; i++) { const dx = C[i][0] - x, dy = C[i][1] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
      return bi;
    };
    lv._tr = tr;
  }
  TR = lv._tr;
  if (!TR.ideal) {
    TR.ideal = buildIdeal();
    TR.center = buildLine(resampleClosed(TR.C, 5));
  }
  if (!lv.rivals) lv.rivals = calibrateRivals(lv);
  return TR;
}

/* ---------- Líneas de carrera ---------- */
// Construye una línea (posiciones, tangentes, longitud acumulada y perfil de velocidad) a partir de una polilínea cerrada y suave.
function buildLine(P, { clamp: doClamp = true, phys = PHYS } = {}) {
  const n = P.length, off = new Float32Array(n);
  if (doClamp) {
    P = P.map((p, i) => {
      const j = TR.nearest(p[0], p[1]), c = TR.C[j], nm = TR.Nm[j];
      const d = (p[0] - c[0]) * nm[0] + (p[1] - c[1]) * nm[1], ad = Math.abs(d);
      if (ad > TR.edge) { off[i] = Math.min(1, (ad - TR.edge) / 16); const s = Math.sign(d) * TR.edge; return [c[0] + nm[0] * s, c[1] + nm[1] * s]; }
      return p;
    });
  }
  const S = new Float32Array(n + 1), seg = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; seg[i] = hyp(b[0] - a[0], b[1] - a[1]); S[i + 1] = S[i] + seg[i]; }
  const L = S[n];
  const Tg = P.map((p, i) => { const a = P[(i - 1 + n) % n], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = hyp(dx, dy) || 1; return [dx / l, dy / l]; });
  let kap = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Tg[(i - 1 + n) % n], b = Tg[(i + 1) % n];
    const ang = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
    kap[i] = Math.abs(ang) / (seg[(i - 1 + n) % n] + seg[i] || 1);
  }
  for (let r = 0; r < 3; r++) { const k2 = new Float32Array(n); for (let i = 0; i < n; i++) k2[i] = (kap[(i - 1 + n) % n] + 2 * kap[i] + kap[(i + 1) % n]) / 4; kap = k2; }
  const V = phys.vmax, A = phys.alat, q = phys.q, aq = (A * q) / (V * V);
  const v = new Float32Array(n);
  // velocidad máxima en cada punto: κ·v² = A·(1 + q·v²/V²)  →  v = sqrt(A / (κ − A·q/V²))
  for (let i = 0; i < n; i++) { const ke = kap[i] - aq, vl = ke <= 1e-6 ? V : Math.sqrt(A / ke); v[i] = Math.min(V * (1 - 0.55 * off[i]), vl); }
  const fe = (vi, k) => { const ratio = Math.min(1, (vi * vi * k) / (A * (1 + (q * vi * vi) / (V * V)))); return Math.max(0.12, Math.sqrt(1 - ratio * ratio)); };
  for (let it = 0; it < 2 * n; it++) { // aceleración: elipse de fricción y resistencia del aire
    const i = it % n, j = (i + 1) % n, vi = v[i], drag = Math.max(0.05, 1 - (vi / (1.12 * V)) * (vi / (1.12 * V)));
    v[j] = Math.min(v[j], Math.sqrt(vi * vi + 2 * phys.aacc * fe(vi, kap[i]) * drag * seg[i]));
  }
  for (let it = 0; it < 2 * n; it++) { // frenado: igual, pero el aire también ayuda a frenar
    const i = (2 * n - it) % n, j = (i - 1 + n) % n, vi = v[i], vj = v[j];
    v[j] = Math.min(v[j], Math.sqrt(vi * vi + 2 * (phys.abrk * fe(vj, kap[j]) + 0.5 * (vi / V) * (vi / V) * phys.abrk * 0.25) * seg[j]));
  }
  let lapT = 0;
  for (let i = 0; i < n; i++) lapT += seg[i] / (0.5 * (v[i] + v[(i + 1) % n]));
  return { P, n, S, seg, L, Tg, v, off, kap, lapT, phys };
}
function idxAt(line, s) {
  let lo = 0, hi = line.n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (line.S[m] <= s) lo = m; else hi = m; }
  return lo;
}
function speedAt(line, s) {
  s = ((s % line.L) + line.L) % line.L;
  const i = idxAt(line, s), f = (s - line.S[i]) / (line.seg[i] || 1);
  return line.v[i] + (line.v[(i + 1) % line.n] - line.v[i]) * f;
}
function poseAt(line, s) {
  s = ((s % line.L) + line.L) % line.L;
  const i = idxAt(line, s), j = (i + 1) % line.n, f = (s - line.S[i]) / (line.seg[i] || 1);
  const a = line.P[i], b = line.P[j], ta = line.Tg[i], tb = line.Tg[j];
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, tx: ta[0] + (tb[0] - ta[0]) * f, ty: ta[1] + (tb[1] - ta[1]) * f };
}

// Línea ideal: el camino más corto dentro de la calle, suavizado. Sirve para los rivales y para "tu línea vs la mejor".
function buildIdeal() {
  const { C, Nm, N } = TR, lim = TR.edge - 3, X = new Float32Array(N), Y = new Float32Array(N);
  const clampv = (m) => (m > lim ? lim : m < -lim ? -lim : m);
  // 1) camino más corto dentro de la calle (relajación iterativa)
  const dS = new Float32Array(N);
  for (let i = 0; i < N; i++) { X[i] = C[i][0]; Y[i] = C[i][1]; }
  for (let it = 0; it < 3500; it++) for (let i = 0; i < N; i++) {
    const a = i ? i - 1 : N - 1, b = i === N - 1 ? 0 : i + 1;
    const v = clampv(((X[a] + X[b]) / 2 - C[i][0]) * Nm[i][0] + ((Y[a] + Y[b]) / 2 - C[i][1]) * Nm[i][1]);
    dS[i] = v; X[i] = C[i][0] + Nm[i][0] * v; Y[i] = C[i][1] + Nm[i][1] * v;
  }
  // 2) camino de curvatura mínima: partiendo del anterior, se aplana la curvatura (operador biarmónico) sin salirse de la calle
  const dM = Float32Array.from(dS), px = new Float32Array(N), py = new Float32Array(N);
  for (let it = 0; it < 1800; it++) {
    for (let i = 0; i < N; i++) { px[i] = C[i][0] + Nm[i][0] * dM[i]; py[i] = C[i][1] + Nm[i][1] * dM[i]; }
    for (let i = 0; i < N; i++) {
      const a = (i - 2 + N) % N, b = (i - 1 + N) % N, c = (i + 1) % N, d = (i + 2) % N;
      const gx = px[a] - 4 * px[b] + 6 * px[i] - 4 * px[c] + px[d], gy = py[a] - 4 * py[b] + 6 * py[i] - 4 * py[c] + py[d];
      dM[i] = clampv(dM[i] - 0.05 * (gx * Nm[i][0] + gy * Nm[i][1]));
    }
  }
  // 3) se prueban mezclas de los dos caminos y se elige la que da la vuelta más rápida
  let best = null;
  for (const mixv of [0, 0.35, 0.7, 1]) for (const sc of [0.85, 1]) {
    const d = Float32Array.from(dS, (v, i) => clampv(sc * (v * (1 - mixv) + dM[i] * mixv)));
    const line = buildLine(gaussClosed(resampleClosed(C.map((c, i) => [c[0] + Nm[i][0] * d[i], c[1] + Nm[i][1] * d[i]]), 5), SMOOTH));
    if (!best || line.lapT < best.line.lapT) best = { d, line };
  }
  return best;
}
/* ---------- Pilotos rivales: cada uno tiene su estilo (valores respecto al carro base) ---------- */
const RIVAL_TRAITS = [
  { name: "ace",    vmax: 1.000, alat: 1.000, aacc: 1.000, abrk: 1.030, err: 0.035, jit: 0.004, react: [0.04, 0.14] },  // regular y limpio
  { name: "braker", vmax: 0.990, alat: 1.020, aacc: 0.950, abrk: 1.150, err: 0.085, jit: 0.007, react: [0.05, 0.22] },  // frena tarde: fuerte entrando, flojo saliendo
  { name: "power",  vmax: 1.040, alat: 0.960, aacc: 1.080, abrk: 0.930, err: 0.115, jit: 0.009, react: [0.05, 0.26] },  // gana en las rectas, sufre en las curvas
];
// s = nivel de ritmo (1 = base); la velocidad escala con s y las aceleraciones con s²
const physFor = (trait, s) => { const t = RIVAL_TRAITS[trait]; return { vmax: VMAX * t.vmax * s, alat: A_LAT * t.alat * s * s, aacc: A_ACC * t.aacc * s * s, abrk: A_BRK * t.abrk * s * s, q: AERO_Q }; };
const randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * v); };

// Rivales de un nivel: cada uno tiene una meta de tiempo por vuelta entre la línea ideal y la del centro; la meta baja de nivel en nivel.
// Se busca cuánto de la línea ideal usa (k); si aun con k = 0 es más rápido (o con k = 1 más lento) se ajusta su ritmo s.
function calibrateRivals(lv) {
  const grp = LEVELS.filter((l) => l.grp === lv.grp), t = lv.custom ? [0.12, 0.5, 0.92][lv.diff == null ? 1 : lv.diff] : grp.indexOf(lv) / Math.max(1, grp.length - 1);   // cada grupo de circuitos sube de dificultad por su cuenta
  const fr = [FRAC[0] - FRAC[3] * t, FRAC[1] - FRAC[4] * t, FRAC[2] - FRAC[5] * t], W = [4, 6, 8], cols = [COLORS.r1, COLORS.r2, COLORS.r3];
  const Ti = TR.ideal.line.lapT, Tc = buildLine(gaussClosed(resampleClosed(TR.C, 5), SMOOTH)).lapT; // línea ideal y línea por el centro de la calle
  lv.noise = Math.min(1, Math.max(0.4, (Tc / Ti - 1) / 0.12)); // en pistas donde casi no importa la línea, el azar de los rivales es menor
  return fr.map((f, i) => {
    const T = Ti + f * Math.max(Tc - Ti, 0.035 * Ti), meanT = (k, s) => { let a = 0; for (let r = 0; r < 2; r++) a += rivalLine({ k, s, wob: W[i], trait: i }).lapT; return a / 2; };
    let k = 0, s = 1;
    if (meanT(0, 1) < T) s = meanT(0, 1) / T;
    else if (meanT(1, 1) > T) { k = 1; s = meanT(1, 1) / T; }
    else { let lo = 0, hi = 1; for (let it = 0; it < 7; it++) { const m = (lo + hi) / 2; if (meanT(m, 1) > T) lo = m; else hi = m; } k = (lo + hi) / 2; }
    return { color: cols[i], k, s, wob: W[i], trait: i };
  });
}
// Meta de cada rival: 0 = línea ideal, 1 = trazar por el centro de la calle. Valores del primer nivel y cuánto bajan hasta el último.
const FRAC = [1.45, 1.90, 2.35, 1.08, 1.35, 1.45];
function rivalLine(cfg) {
  const { C, Nm } = TR, lim = TR.edge - 3, ideal = TR.ideal.d;
  const ph = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
  const pts = C.map((c, i) => {
    const wob = cfg.wob * (Math.sin(i * 0.045 + ph[0]) * 0.6 + Math.sin(i * 0.11 + ph[1]) * 0.3 + Math.sin(i * 0.23 + ph[2]) * 0.1);
    const o = Math.max(-lim, Math.min(lim, ideal[i] * cfg.k + wob));
    return [c[0] + Nm[i][0] * o, c[1] + Nm[i][1] * o];
  });
  return buildLine(gaussClosed(resampleClosed(pts, 5), SMOOTH), { phys: physFor(cfg.trait, cfg.s) });
}
// Cómo corre cada piloto en una carrera: ritmo del día, variación por vuelta, errores en curvas (se pasa de largo o bloquea)
// y reacción en la salida. El jugador no se equivoca: su "piloto" es perfecto y solo depende de su línea.
function makeDriver(trait, line, noise = 1) {
  if (trait == null) return { pace: 1, lapJ: [1, 1, 1], events: [], react: 0.12 };
  const t = RIVAL_TRAITS[trait], events = [];
  const runs = []; let cur = null;
  for (let i = 0; i < line.n; i++) { const hi = line.kap[i] > 1 / 150; if (hi && !cur) cur = i; else if (!hi && cur != null) { runs.push(cur); cur = null; } }
  for (let lap = 0; lap < LAPS; lap++) for (const i0 of runs) if (Math.random() < t.err) events.push({ lap, s0: Math.max(0, line.S[i0] - 25), len: 70 + Math.random() * 50, f: 0.5 + Math.random() * 0.22 });
  return { pace: 1 + randn() * 0.010 * noise, lapJ: Array.from({ length: LAPS }, () => 1 + randn() * t.jit * noise), events, react: t.react[0] + Math.random() * (t.react[1] - t.react[0]) };
}

/* ---------- Del trazo del jugador a una línea ---------- */
function validateStroke(raw) {
  if (raw.length < 12) return { err: "err_full" };
  const { C, N } = TR;
  if (hyp(raw[0][0] - C[0][0], raw[0][1] - C[0][1]) > 80) return { err: "err_start" };
  let prev = TR.nearest(raw[0][0], raw[0][1]), prog = 0, cut = -1;
  for (let k = 1; k < raw.length; k++) {
    const j = TR.nearest(raw[k][0], raw[k][1]);
    let dj = j - prev; if (dj > N / 2) dj -= N; if (dj < -N / 2) dj += N;
    prog += dj; prev = j;
    const c = C[j];
    if (hyp(raw[k][0] - c[0], raw[k][1] - c[1]) > TR.hw + 60) return { err: "err_road" };
    if (prog >= 0.985 * N) { cut = k; break; }
  }
  if (cut < 0) cut = raw.length - 1;
  if (prog < 0.9 * N) return { err: prog < -0.2 * N ? "err_dir" : "err_full" };
  return { pts: raw.slice(0, cut + 1) };
}
function strokeToLine(pts) {
  let P = gaussClosed(resampleClosed(pts, 5), PLAYER_SMOOTH);
  let bi = 0, bd = 1e9;
  P.forEach((p, i) => { const d = hyp(p[0] - TR.C[0][0], p[1] - TR.C[0][1]); if (d < bd) { bd = d; bi = i; } });
  P = P.slice(bi).concat(P.slice(0, bi));
  return buildLine(P);
}

/* ---------- Simulación de la carrera (se calcula completa y luego se reproduce) ---------- */
function simulate(cars) {
  const maxSteps = Math.floor(240 / DT);
  const out = cars.map(() => ({ s: new Float32Array(maxSteps), fin: null }));
  const s = cars.map((c) => c.s0), v = cars.map(() => 0);
  let step = 0, lastFin = null;
  // estela: seguir de cerca a otro carro (6 a 44 unidades detrás y casi en su línea) da hasta +4.5 % de velocidad
  const draft = (i) => {
    const L = cars[i].line.L; let best = 0;
    for (let j = 0; j < cars.length; j++) {
      if (j === i) continue;
      const d = (s[j] / cars[j].line.L - s[i] / L) * L;
      if (d < 6 || d > 44) continue;
      const pi = poseAt(cars[i].line, s[i]), pj = poseAt(cars[j].line, s[j]), lat = Math.sqrt(Math.max(0, (pj.x - pi.x) ** 2 + (pj.y - pi.y) ** 2 - d * d));
      best = Math.max(best, 0.045 * (1 - (d - 6) / 38) * Math.max(0, 1 - lat / 18));
    }
    return best;
  };
  for (; step < maxSteps; step++) {
    let allFin = true;
    const t = step * DT;
    cars.forEach((c, i) => {
      out[i].s[step] = s[i];
      const L = c.line.L, ph = c.line.phys, d = c.drv, lap = Math.max(0, Math.min(LAPS - 1, Math.floor(s[i] / L)));
      const sp0 = speedAt(c.line, s[i]);
      let target = c.vs * d.pace * d.lapJ[lap] * sp0, bw = 0;
      if (c.boost) { const x = (t - c.boost.t0) / BOOST_DUR; if (x > 0 && x < 1) bw = Math.min(1, x / 0.1, (1 - x) / 0.2); } // sube rápido y se apaga suave
      if (bw) target *= 1 + BOOST_V * bw * clamp((sp0 / ph.vmax - 0.5) / 0.35, 0, 1); // en curvas manda el agarre: casi no ayuda
      for (const e of d.events) if (e.lap === lap) { const x = (s[i] - lap * L - e.s0) / e.len; if (x > 0 && x < 1) target *= 1 - (1 - e.f) * Math.pow(Math.sin(Math.PI * x), 2); }
      target *= 1 + draft(i);
      if (t < d.react) target = 0;
      if (out[i].fin != null) target *= Math.max(0.3, 1 - (t - out[i].fin) * 1.1); // tras la meta, baja la velocidad
      v[i] = v[i] < target ? Math.min(target, v[i] + ph.aacc * (1 + BOOST_A * bw) * DT) : Math.max(target, v[i] - ph.abrk * DT);
      const ns = s[i] + v[i] * DT;
      if (out[i].fin == null) { if (ns >= LAPS * L) out[i].fin = (step + (LAPS * L - s[i]) / (ns - s[i])) * DT; else allFin = false; }
      s[i] = ns;
    });
    if (allFin) { if (lastFin == null) lastFin = step; if (step - lastFin > 3 / DT) { step++; break; } }
  }
  out.forEach((o) => { o.steps = step; if (o.fin == null) o.fin = 240; });
  return out;
}
