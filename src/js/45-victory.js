"use strict";
/* victory.js: la toma de victoria, montada como una secuencia de cine con cuatro tomas:
     1. Persecución abierta: la cámara sigue al carro por la recta de meta con los rivales detrás (a las distancias reales de la carrera).
     2. Corte con zoom rápido a la toma cerrada: la nariz cruza la línea en cámara lenta bajo el arco de meta (el arco está "alto": se mueve
        con paralaje y tapa al carro al pasar), con destello, sacudida, chispas, humo de llantas y las ráfagas de las cámaras de los aficionados.
     3. La cámara sube y se aleja: el carro festeja zigzagueando, cruzan los rivales con sus diferencias reales de tiempo, cae confeti
        y estallan fuegos artificiales.
     4. Toma final: "GANADOR" con el nombre, tercio inferior estilo F1 (posición, nombre, diferencia con el segundo) y entra la clasificación.
   Todo se dibuja en 2D como una recta de cerca (no es el mapa ampliado), con postproceso: brillo (bloom), gradación de color, viñeta, grano y barras de cine. */

const Victory = (() => {
  const CUTS = [2.25, 4.95], TAU = Math.PI * 2, TC = 3.05, END = 9.7, LEAD = 1.05;   // TC: segundo en que la nariz toca la meta; LEAD: cuánto antes de la meta (en la carrera) arranca la toma
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1), ease = (x) => x * x * (3 - 2 * x), eoc = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3), eoq = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 4);
  const rnd = (a, b) => a + Math.random() * (b - a), cvs = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(2, w | 0); c.height = Math.max(2, h | 0); return c; };
  const kf = (t, P) => { if (t <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * ease((t - a[0]) / (b[0] - a[0])); } return P[P.length - 1][1]; };
  let A = null, tail = null, tiles = null, sprites = {}, post = null;

  /* ---------- Texturas (se hacen una vez) ---------- */
  function wrapDraw(w, h, fn) { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(dx, dy); }
  function makeTiles() {
    if (tiles) return;
    const asphalt = cvs(256, 256), ag = asphalt.getContext("2d");
    ag.fillStyle = "#2D3037"; ag.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18; i++) { const x = rnd(0, 256), y = rnd(0, 256), r = rnd(28, 80), c = i % 2 ? "74,78,88" : "12,14,18"; wrapDraw(256, 256, (dx, dy) => { const rg = ag.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); rg.addColorStop(0, `rgba(${c},.2)`); rg.addColorStop(1, `rgba(${c},0)`); ag.fillStyle = rg; ag.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); }); }
    for (let i = 0; i < 2200; i++) { const s = rnd(0.7, 2.3), x = rnd(0, 256), y = rnd(0, 256); ag.fillStyle = Math.random() < 0.5 ? `rgba(8,10,14,${rnd(0.12, 0.34)})` : `rgba(${150 + (Math.random() * 90) | 0},${150 + (Math.random() * 90) | 0},${156 + (Math.random() * 90) | 0},${rnd(0.08, 0.38)})`; ag.fillRect(x, y, s, s); }
    const crowd = cvs(256, 256), cg = crowd.getContext("2d"), pal = ["#E5322D", "#F4F4F4", "#2F6FDB", "#F2B705", "#00A58E", "#E052A0", "#FF8A2B", "#F4F4F4", "#7A4CE0"];
    cg.fillStyle = "#14151A"; cg.fillRect(0, 0, 256, 256);
    for (let y = 3; y < 256; y += 8) for (let x = 3 + ((y / 8) % 2) * 4; x < 256; x += 8) { const c = pal[(Math.random() * pal.length) | 0]; cg.fillStyle = "rgba(0,0,0,.5)"; cg.beginPath(); cg.arc(x + 1.2, y + 1.8, 3.4, 0, TAU); cg.fill(); cg.fillStyle = c; cg.beginPath(); cg.arc(x, y, 3, 0, TAU); cg.fill(); cg.fillStyle = "rgba(255,255,255,.3)"; cg.beginPath(); cg.arc(x - 0.9, y - 1, 1.1, 0, TAU); cg.fill(); }
    const grain = cvs(160, 160), gg = grain.getContext("2d"), id = gg.createImageData(160, 160); for (let i = 0; i < id.data.length; i += 4) { const v = (Math.random() * 255) | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gg.putImageData(id, 0, 0);
    tiles = { asphalt, crowd, grain };
  }
  function grassTile(env) {
    const key = env.g1 + env.g2; if (tiles.gkey === key) return tiles.grass;
    const c = cvs(256, 256), g = c.getContext("2d");
    for (let i = 0; i < 1700; i++) { const x = rnd(0, 256), y = rnd(0, 256), l = rnd(2, 6), a = rnd(0, TAU); g.strokeStyle = Math.random() < 0.5 ? `rgba(255,255,230,${rnd(0.05, 0.16)})` : `rgba(10,30,10,${rnd(0.06, 0.2)})`; g.lineWidth = rnd(0.6, 1.3); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    tiles.grass = c; tiles.gkey = key; return c;
  }

  /* ---------- Medidas y monoplazas en alta resolución ---------- */
  function metrics() {
    const W = VW, H = VH, portrait = H >= W * 0.95, F = portrait ? H : W, X = portrait ? W : H;
    const Lcar = portrait ? Math.min(0.40 * H, 1.1 * W) : Math.min(0.34 * W, 0.95 * H), Ps = Lcar / 36;
    return { W, H, portrait, F, X, Lcar, Ps, Rh: 30 * Ps, kerb: 3.6 * Ps };
  }
  function spriteOf(kind, m) {   // kind: "me" o el color del rival
    const me = kind === "me", d = me ? playerDesign() : (RIVAL_DESIGN[kind] || Object.assign({}, CAR_DEFAULT, { body: kind, wing: kind })), S = clamp(m.Ps * DPR * 1.05, 6, me ? 26 : 18);
    const key = kind + "|" + S.toFixed(1) + "|" + [d.body, d.accent, d.wing, d.helmet, d.stripe, d.num, d.nc, d.ns, d.nx, d.ny, d.nr, d.no].join(",") + "|" + (me ? PAINT.ver : 0) + (CARIMG.ok ? "i" : "v");
    let s = sprites[key]; if (s) return s;
    if (Object.keys(sprites).length > 8) sprites = {};
    const sp = paintCar(d, false, S, me ? PAINT.img : null); s = { img: sp.img, w: sp.w, h: sp.h };
    if (me) { // silueta pequeña para el brillo que recorre la carrocería
      const k = 0.3, sil = cvs(sp.img.width * k, sp.img.height * k), sg = sil.getContext("2d"); sg.drawImage(sp.img, 0, 0, sil.width, sil.height); sg.globalCompositeOperation = "source-in"; sg.fillStyle = "#fff"; sg.fillRect(0, 0, sil.width, sil.height);
      s.sil = sil; s.tmp = cvs(sil.width, sil.height);
    }
    sprites[key] = s; return s;
  }
  function prepare() { try { makeTiles(); const m = metrics(); spriteOf("me", m); for (const c of [COLORS.r1, COLORS.r2, COLORS.r3]) spriteOf(c, m); } catch (e) {} }   // poco después de salir, para que la toma no se tropiece

  /* ---------- Línea de tiempo ---------- */
  function tscale(t) { // cámara lenta al cruzar la meta
    const a = TC - 0.7, b = TC, c = TC + 0.75, d = TC + 1.7;
    if (t < a) return 1; if (t < b) return 1 - 0.8 * ease(seg(t, a, b)); if (t < c) return 0.2; if (t < d) return 0.2 + 0.8 * ease(seg(t, c, d)); return 1;
  }
  const velOf = (t, V0) => (t < TC + 1.4 ? V0 : Math.max(0.1 * V0, V0 * Math.exp(-(t - TC - 1.4) * 0.62)));
  const ZOOM = [[0, 0.42], [1.1, 0.47], [2.05, 0.62], [2.4, 1.02], [TC, 1.16], [TC + 0.7, 1.08], [TC + 1.5, 1.02], [4.85, 0.92], [4.95, 0.66], [6.6, 0.5], [8.0, 0.43], [END, 0.4]];
  const LEADK = [[0, 0.12], [2.1, 0.14], [2.4, 0.15], [TC + 1.5, 0.13], [4.85, 0.1], [4.95, -0.04], [6.6, -0.12], [END, -0.15]];
  const ROLLK = [[0, 0.004], [1.6, 0.016], [2.4, -0.05], [TC, -0.025], [TC + 1.5, 0.02], [4.85, 0.01], [4.95, 0.11], [6.6, 0.015], [END, 0.012]];

  function start(r, focus) {
    makeTiles();
    const m = metrics(), V0 = m.F * 1.85; let D = 0; for (let t = 0; t < TC; t += 1 / 240) D += velOf(t, V0) * tscale(t) / 240;
    const snap = cvs(cv.width, cv.height); snap.getContext("2d").drawImage(cv, 0, 0);
    const fin = r.sim.map((s) => s.fin), me = fin[2], order = r.order.filter((i) => i !== 2), lanes = [0.5, 0.05, 0.72], rivals = [];
    order.forEach((i, k) => { const g0 = Math.max(0.05, fin[i] - me), gap = g0 < 1 ? g0 : 1 + 1.6 * (1 - Math.exp(-(g0 - 1) / 1.6));; /* las diferencias grandes se comprimen sin perder el orden */ rivals.push({ i, gap, real: fin[i] - me, color: r.cars[i].color, lane: lanes[k % 3], crossed: false, ph: rnd(0, TAU) }); });
    A = { r, t: 0, tw: 0, m, V0, uc: -m.Lcar / 2 - D, hist: [[0, -m.Lcar / 2 - D]], camU: 0, camV: 0, vcs: 0, crossed: false, flash: 0, shake: 0, parts: [], strips: [], sparks: [], dust: [], lines: [], flashes: [], fw: [], snap, focus: focus || [VW / 2, VH * 0.6],
      dark: resolvedTheme() === "dark" || !!Scenery.def(cur).night, env: ENVS[cur.env || "alpine"], name: playerName().toUpperCase().slice(0, 12), nextDust: 0, nextFlash: 0, rivals, prev: null, prevT: 0, fired: {}, gapP2: order.length ? Math.max(0, fin[order[0]] - me) : 0 };
    A.camU = A.uc + 0.1 * m.F / ZOOM[0][1];
    for (let i = 0; i < 30; i++) A.lines.push({ x: rnd(-0.5, 0.5), y: rnd(0, 1), l: rnd(0.08, 0.34), a: rnd(0.05, 0.2) });
    r.victory = true; r.finHaptic = true; state = "victory"; document.body.classList.add("cine");
    for (let i = 0; i < 4; i++) if (i !== 2) Sound.enginesUpdate(i, 0.75, i === 1 ? -0.5 : 0.5, 0.3);
    Haptics.soft();
  }
  function cancel() { A = null; tail = null; document.body.classList.remove("cine"); }
  const active = () => !!A;
  const s2w = (m, dx, dy) => (m.portrait ? [-dy, dx] : [dx, dy]);   // desplazamiento en pantalla -> (adelante, lateral)
  function uAt(tw) { // posición de tu carro en el tiempo de carrera tw; los rivales siguen la misma historia, retrasados por su diferencia
    const h = A.hist; if (tw <= h[0][0]) return h[0][1] + A.V0 * (tw - h[0][0]);
    for (let i = h.length - 1; i > 0; i--) if (h[i - 1][0] <= tw) { const a = h[i - 1], b = h[i], q = b[0] > a[0] ? (tw - a[0]) / (b[0] - a[0]) : 0; return a[1] + (b[1] - a[1]) * clamp(q, 0, 1); }
    return h[h.length - 1][1];
  }

  // Los carros: tu carro y los rivales (que repiten tu historial, retrasados), pero NUNCA se encimarán: si dos carros quedarían muy cerca,
  // el de atrás se queda detrás a la distancia mínima (más corta si van en carriles bien separados).
  function carsNow(t, tw, m, yawMe) {
    const { Lcar, Rh } = m, me = { u: A.uc, v: A.vcs, yaw: yawMe, kind: "me", me: true }, out = [me];
    const need = (va, vb) => { const lat = Math.abs(va - vb), q = ease(clamp((lat - 0.5 * Lcar) / (0.22 * Lcar), 0, 1)); return (1.28 - 1.1 * q) * Lcar; };
    for (const rv of A.rivals) {
      const v = (rv.lane + 0.04 * Math.sin(t * 1.3 + rv.ph)) * Rh; let u = uAt(tw - rv.gap);
      for (const c of out) u = Math.min(u, c.u - need(c.v, v));
      out.push({ u, v, yaw: 0.02 * Math.sin(t * 1.1 + rv.ph), kind: rv.color, me: false, rv });
    }
    return out;
  }

  /* ---------- Partículas ---------- */
  const CONF = ["#FD1C22", "#F4F4F4", "#F6BC2F", "#2F6FDB", "#00A58E", "#E052A0", "#FFE9A0", "#50AFEA"];
  function burstFrom(m, u, v, dirV, n, spread) {   // cañón de confeti: sale de un punto, hacia adentro y hacia arriba
    const k = m.Ps / 9.8;
    for (let i = 0; i < n; i++) { const w = rnd(0.6, 1.3) * m.Ps * 0.7, shape = Math.random();
      A.parts.push({ u, v, z: rnd(30, 110), vu: rnd(-200, 420) * k * spread, vv: dirV * rnd(160, 900) * k * spread + rnd(-120, 120) * k, vz: rnd(520, 1500) * k, w, h: w * rnd(1.4, 2.8), rot: rnd(0, TAU), vr: rnd(-9, 9), flip: rnd(0, TAU), vf: rnd(5, 14), col: CONF[(Math.random() * CONF.length) | 0], shape: shape < 0.15 ? 1 : shape < 0.25 ? 2 : 0, age: 0, life: rnd(4.5, 7), ph: rnd(0, TAU) }); }
    for (let i = 0; i < Math.ceil(n / 9); i++) A.strips.push({ u, v, z: rnd(40, 130), vu: rnd(-100, 360) * k, vv: dirV * rnd(300, 1000) * k, vz: rnd(650, 1400) * k, col: CONF[(i * 3) % CONF.length], trail: [], age: 0, life: rnd(4.5, 6.5), ph: rnd(0, TAU), w: rnd(2.4, 4.4) * m.Ps / 9.8 });
  }
  function stepParts(dt, k) {
    for (const p of A.parts) {
      p.age += dt; if (p.z > 0) { p.vz = Math.max(p.vz - 560 * k * dt, -150 * k); p.vv *= 1 - 0.85 * dt; p.vu *= 1 - 0.5 * dt; p.vv += Math.sin(p.age * 6 + p.ph) * 70 * k * dt; p.z += p.vz * dt; p.u += p.vu * dt; p.v += p.vv * dt; p.rot += p.vr * dt; p.flip += p.vf * dt; if (p.z <= 0) { p.z = 0; p.vr = 0; p.vf = 0; } }
    }
    A.parts = A.parts.filter((p) => p.age < p.life);
    for (const s of A.strips) { s.age += dt; s.vz = Math.max(s.vz - 520 * k * dt, -130 * k); s.vv *= 1 - 0.8 * dt; s.vu *= 1 - 0.5 * dt; s.vv += Math.sin(s.age * 4 + s.ph) * 90 * k * dt; s.z = Math.max(0, s.z + s.vz * dt); s.u += s.vu * dt; s.v += s.vv * dt; s.trail.unshift([s.u, s.v, s.z]); if (s.trail.length > 14) s.trail.pop(); }
    A.strips = A.strips.filter((s) => s.age < s.life);
  }
  function spawnFirework(W, H, x, y) {
    const cols = [["#FFD76A", "#FF8A3C"], ["#7FD0FF", "#FFFFFF"], ["#FF6A9A", "#FFD0E0"], ["#9BFFB0", "#F4FFE0"]][(Math.random() * 4) | 0], n = 90, sp = Math.min(W, H) * rnd(0.4, 0.55);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd(-0.05, 0.05), s = sp * rnd(0.55, 1); A.fw.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, life: rnd(1.0, 1.6), col: cols[i % 2], px: x, py: y }); }
    Sound.whoosh(0.035, 1800, 500, 0.35);
  }

  /* ---------- Dibujo de la escena ---------- */
  function tileFill(g, tile, TS, ua, ub, va, vb, shift, alpha, blur) {
    const offs = blur > 3 ? [-blur, -blur * 0.5, 0] : [0], a0 = alpha / (offs.length > 1 ? 1.7 : 1);
    g.save(); g.beginPath(); g.rect(ua, va, ub - ua, vb - va); g.clip(); g.globalAlpha = a0;
    for (const o of offs) for (let ku = Math.floor((ua - shift - blur) / TS); ku * TS + shift < ub; ku++) for (let kv = Math.floor(va / TS); kv * TS < vb; kv++) g.drawImage(tile, ku * TS + shift + o, kv * TS, TS + 1, TS + 1);
    g.restore();
  }
  function frame(g, dt) {
    const r = A.r, m = A.m, { W, H, portrait, F, X, Lcar, Ps, Rh, kerb } = m, k = Ps / 9.8;
    const ts = tscale(A.t), dtw = dt * ts, vel = velOf(A.t, A.V0);
    A.t += dt; A.tw += dtw; const t = A.t, tw = A.tw;
    A.uc += vel * dtw; A.hist.push([tw, A.uc]); A.shake = Math.max(0, A.shake - dt * 2.2); A.flash = Math.max(0, A.flash - dt * 3);
    const zoom = kf(t, ZOOM), roll = kf(t, ROLLK) + 0.0035 * Math.sin(t * 1.7), closeness = clamp((zoom - 0.72) / 0.5, 0, 1);
    // el carro: carril, zigzag de festejo y guiñada
    const celeb = seg(t, TC + 1.4, TC + 2.6) * (1 - seg(t, 7.2, 8.6)), lane = -0.5 + 0.42 * seg(t, TC + 0.5, TC + 2.4);
    const vcar = (lane + 0.28 * celeb * Math.sin((t - TC - 1.4) * 1.5)) * Rh + 2.2 * Ps * Math.sin(t * 1.9), yaw = 0.03 * Math.cos(t * 1.9) + 0.2 * celeb * Math.cos((t - TC - 1.4) * 1.5);
    A.vcs += (vcar - A.vcs) * Math.min(1, dt * 6);
    const cars = carsNow(t, tw, m, yaw);
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) if (Math.abs(cars[i].u - cars[j].u) < 0.92 * Lcar && Math.abs(cars[i].v - cars[j].v) < 0.52 * Lcar) A.overlaps = (A.overlaps || 0) + 1;   // (control de calidad: debe quedar en 0)
    const camTarget = A.uc + kf(t, LEADK) * F / zoom; A.camU += (camTarget - A.camU) * Math.min(1, dt * 9);
    A.camV = (1 - closeness) * 0 + closeness * (A.vcs - 0.08 * Rh);
    const camV = A.camV, blur = vel * ts * 0.016 * 1.1, ext = Math.hypot(W, H) / 2 / zoom + 40, u0 = A.camU - ext, u1 = A.camU + ext, v0 = camV - ext, v1 = camV + ext;
    const me = spriteOf("me", m), env = A.env;
    // eventos
    if (!A.fired.cut && t >= 2.05) { A.fired.cut = 1; Sound.whoosh(0.09, 500, 2600, 0.45); Haptics.soft(); }
    if (!A.fired.cut2 && t >= 4.8) { A.fired.cut2 = 1; Sound.whoosh(0.07, 2400, 500, 0.5); Haptics.soft(); }
    if (!A.crossed && A.uc + Lcar / 2 >= 0) {
      A.crossed = true; A.flash = 1; A.shake = 1; Sound.finish(3); Sound.whoosh(0.07, 1400, 220, 0.9); Haptics.success();
      const Ug = 2 * (2 * Rh / 12) + 10 * Ps, ex = Rh + kerb + 6 * Ps;
      burstFrom(m, Ug, -ex, 1, 130, 1); burstFrom(m, Ug, ex, -1, 130, 1);
      for (let i = 0; i < 52; i++) A.sparks.push({ u: A.uc - Lcar * rnd(0.2, 0.5), v: A.vcs + rnd(-0.2, 0.2) * Lcar, vu: -rnd(80, 380) * k, vv: rnd(-160, 160) * k, age: -rnd(0, 0.4), life: rnd(0.25, 0.6) });
    }
    for (const c of cars) { const rv = c.rv; if (!rv) continue; const u = c.u; if (!rv.crossed && u + Lcar / 2 >= 0) { rv.crossed = true; A.shake = Math.max(A.shake, 0.35); Haptics.soft(); burstFrom(m, 2 * (2 * Rh / 12) + 10 * Ps, rv.lane > 0 ? -(Rh + kerb + 6 * Ps) : Rh + kerb + 6 * Ps, rv.lane > 0 ? 1 : -1, 40, 0.8); } }
    const fwT = [[TC + 2.0, 0.24, 0.34], [TC + 2.45, 0.78, 0.3], [TC + 2.9, 0.5, 0.38], [TC + 3.4, 0.2, 0.5], [TC + 3.7, 0.84, 0.46], [TC + 4.2, 0.5, 0.3]];
    fwT.forEach((f, i) => { if (!A.fired["fw" + i] && t >= f[0]) { A.fired["fw" + i] = 1; spawnFirework(W, H, W * f[1], H * f[2]); } });
    if (t > TC + 0.3) Sound.enginesUpdate(2, clamp(0.2 + 0.8 * vel / A.V0, 0, 1), 0, 1);
    stepParts(dtw, k);
    for (const s of A.sparks) { s.age += dtw; if (s.age > 0) { s.u += s.vu * dtw; s.v += s.vv * dtw; } } A.sparks = A.sparks.filter((s) => s.age < s.life);
    for (const d of A.dust) d.age += dtw; A.dust = A.dust.filter((d) => d.age < d.life);
    A.nextDust -= dtw; if (A.nextDust <= 0 && vel > 0.35 * A.V0) { A.nextDust = 0.004; const wob = 1 + 2.2 * Math.abs(celeb); for (const sd of [-1, 1]) A.dust.push({ u: A.uc - Lcar * 0.42, v: A.vcs + sd * Lcar * 0.21, age: 0, life: rnd(0.55, 0.95) * wob, r0: Lcar * 0.04, r1: Lcar * rnd(0.12, 0.2) * wob, vv: sd * rnd(8, 40) * k }); }
    A.rain = (A.rain || 0) - dtw; if (A.rain <= 0 && t > TC + 0.9 && t < 8.6) { A.rain = 0.012; for (let q = 0; q < 3; q++) { const w = rnd(0.6, 1.3) * Ps * 0.7; A.parts.push({ u: rnd(u0, u1), v: rnd(v0, v1), z: rnd(60, 340) * k, vu: rnd(-30, 30) * k, vv: rnd(-40, 40) * k, vz: -rnd(60, 160) * k, w, h: w * rnd(1.4, 2.6), rot: rnd(0, TAU), vr: rnd(-6, 6), flip: rnd(0, TAU), vf: rnd(5, 12), col: CONF[(Math.random() * CONF.length) | 0], shape: Math.random() < 0.2 ? 1 : 0, age: 0, life: rnd(2.6, 4.2), ph: rnd(0, TAU) }); } }
    A.nextFlash -= dt; if (A.nextFlash <= 0) { A.nextFlash = rnd(0.02, 0.06); for (const sd of [-1, 1]) A.flashes.push({ u: rnd(u0, u1), v: sd * (Rh + kerb + 7 * Ps + rnd(0, 14) * Ps), age: 0, life: rnd(0.12, 0.26), r: rnd(1.1, 2.2) * Ps }); }
    for (const f of A.flashes) f.age += dt; A.flashes = A.flashes.filter((f) => f.age < f.life);
    for (const f of A.fw) { f.age += dt; f.px = f.x; f.py = f.y; f.vy += 160 * dt; f.vx *= 1 - 1.1 * dt; f.vy *= 1 - 0.7 * dt; f.x += f.vx * dt; f.y += f.vy * dt; } A.fw = A.fw.filter((f) => f.age < f.life);
    const S = s2w(m, 1, 1);

    /* ===== fondo del escenario ===== */
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    const shk = (A.shake * A.shake * 10 + 0.5) * Ps / 9.8, shx = shk * Math.sin(t * 91) , shy = shk * Math.cos(t * 77);
    g.save(); g.translate(W / 2 + shx, H / 2 + shy); g.rotate((portrait ? -Math.PI / 2 : 0) + roll); g.scale(zoom, zoom); g.translate(-A.camU, -camV);
    g.fillStyle = env.g1; g.fillRect(u0, v0, u1 - u0, v1 - v0);
    const Sg = 16 * Ps; g.fillStyle = env.g2; for (let q = Math.floor(u0 / Sg); q * Sg < u1; q++) if (q & 1) g.fillRect(q * Sg, v0, Sg, v1 - v0);
    tileFill(g, grassTile(env), 26 * Ps, u0, u1, v0, v1, 0, 0.9, blur);
    // muro con paneles de la marca, gradas con aficionados y ráfagas de cámaras
    const wallW = 4.6 * Ps, edge = Rh + kerb, crowdW = 26 * Ps, BL = 30 * Ps;
    for (const sd of [-1, 1]) {
      const va = sd < 0 ? -(edge + wallW + crowdW) : edge + wallW, vb = sd < 0 ? -(edge + wallW) : edge + wallW + crowdW;
      g.fillStyle = "#14151A"; g.fillRect(u0, va, u1 - u0, vb - va);
      tileFill(g, tiles.crowd, 30 * Ps, u0, u1, va, vb, 0.1 * A.uc, 1, blur * 0.7);
      g.save(); g.globalAlpha = 0.45; tileFill(g, tiles.crowd, 30 * Ps, u0, u1, va, vb, 0.1 * A.uc + Math.sin(t * 6.5) * 1.2 * Ps, 0.5, 0); g.restore();
      const gr = g.createLinearGradient(0, sd < 0 ? vb : va, 0, sd < 0 ? va : vb); gr.addColorStop(0, "rgba(0,0,0,.05)"); gr.addColorStop(1, "rgba(0,0,0,.62)"); g.fillStyle = gr; g.fillRect(u0, va, u1 - u0, vb - va);
      const wa = sd < 0 ? -(edge + wallW) : edge; const [, sv] = s2w(m, 0.9 * Ps, 1.1 * Ps);
      g.fillStyle = "rgba(0,0,0,.36)"; g.fillRect(u0, wa + sv * 1.3, u1 - u0, wallW);
      for (let q = Math.floor(u0 / BL); q * BL < u1; q++) { g.fillStyle = (q & 1) ? "#F4F4F6" : "#E4272B"; g.fillRect(q * BL, wa, BL, wallW); }   // solo cuadros blancos y rojos
      g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(u0, sd < 0 ? wa + wallW - 0.5 * Ps : wa, u1 - u0, 0.5 * Ps);
    }
    g.save(); g.globalCompositeOperation = "lighter";
    for (const f of A.flashes) { const q = f.age / f.life, a = (1 - q) * (q < 0.2 ? q / 0.2 : 1), rr = f.r * (1.5 + q), rg = g.createRadialGradient(f.u, f.v, 0, f.u, f.v, rr); rg.addColorStop(0, `rgba(255,255,255,${0.95 * a})`); rg.addColorStop(0.3, `rgba(255,240,210,${0.4 * a})`); rg.addColorStop(1, "rgba(255,240,210,0)"); g.fillStyle = rg; g.fillRect(f.u - rr, f.v - rr, rr * 2, rr * 2); }
    g.restore();
    // pianos
    const KB = 7 * Ps;
    for (const sd of [-1, 1]) { const va = sd < 0 ? -edge : Rh;
      for (let q = Math.floor((u0 - blur) / KB); q * KB < u1; q++) { g.fillStyle = q & 1 ? "#F4F4F6" : "#E4272B"; g.fillRect(q * KB - blur, va, KB + blur, kerb); }
      g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(u0, sd < 0 ? -edge : Rh + kerb - 0.4 * Ps, u1 - u0, 0.4 * Ps); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(u0, sd < 0 ? -Rh - 0.5 * Ps : Rh, u1 - u0, 0.5 * Ps);
    }
    // asfalto: grano, huellas de goma, líneas y canicas de goma junto a los pianos
    g.fillStyle = "#2B2E35"; g.fillRect(u0, -Rh, u1 - u0, 2 * Rh);
    tileFill(g, tiles.asphalt, 26 * Ps, u0, u1, -Rh, Rh, 0, 1, blur);
    for (const lv of [-0.55, -0.12, 0.34, 0.66]) { const c = lv * Rh, w = 8 * Ps, gg = g.createLinearGradient(0, c - w, 0, c + w); gg.addColorStop(0, "rgba(0,0,0,0)"); gg.addColorStop(0.5, "rgba(0,0,0,.28)"); gg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gg; g.fillRect(u0, c - w, u1 - u0, 2 * w); }
    for (const sd of [-1, 1]) { const w = 5 * Ps, va = sd < 0 ? -Rh : Rh - w, gg = g.createLinearGradient(0, sd < 0 ? -Rh : Rh, 0, sd < 0 ? -Rh + w : Rh - w); gg.addColorStop(0, "rgba(10,10,12,.55)"); gg.addColorStop(1, "rgba(10,10,12,0)"); g.fillStyle = gg; g.fillRect(u0, va, u1 - u0, w); }
    g.fillStyle = "rgba(244,244,246,.92)"; g.fillRect(u0, -Rh + 0.3 * Ps, u1 - u0, 1.6 * Ps); g.fillRect(u0, Rh - 1.9 * Ps, u1 - u0, 1.6 * Ps);
    // la línea de meta: dos filas de cuadros con barras blancas
    const n = 14, sq = (2 * Rh) / n, bl = blur * 0.5;
    for (let row = 0; row < 2; row++) for (let c = 0; c < n; c++) { g.fillStyle = (row + c) & 1 ? "rgba(244,244,246,.96)" : "rgba(16,17,21,.96)"; g.fillRect(row * sq, -Rh + c * sq, sq, sq); if (bl > 1 && row === 1) { g.fillStyle = (row + c) & 1 ? "rgba(244,244,246,.35)" : "rgba(16,17,21,.35)"; g.fillRect(2 * sq, -Rh + c * sq, bl, sq); } }
    g.fillStyle = "rgba(244,244,246,.9)"; g.fillRect(-0.9 * sq - 1.1 * Ps, -Rh, 1.1 * Ps, 2 * Rh); g.fillRect(3 * sq - 0.1 * sq, -Rh, 1.1 * Ps, 2 * Rh);
    const Ug = 2 * sq + 10 * Ps;   // el arco de meta (a esta distancia de la línea)

    /* ===== los carros ===== */
    for (const d of A.dust) { const q = d.age / d.life, rr = (d.r0 + (d.r1 - d.r0) * q) * 1.6, a = 0.17 * (1 - q) * (1 - q), x = d.u, y = d.v + d.vv * d.age, rg = g.createRadialGradient(x, y, 0, x, y, rr); rg.addColorStop(0, `rgba(226,228,234,${a})`); rg.addColorStop(1, "rgba(226,228,234,0)"); g.fillStyle = rg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    for (const c of cars) c.sp = c.me ? me : spriteOf(c.kind, m);
    const [ou, ov] = s2w(m, 1.2 * Ps, 1.7 * Ps);
    for (const c of cars) { if (c.u + Lcar < u0 || c.u - Lcar > u1) continue;
      g.save(); g.translate(c.u + ou, c.v + ov); g.rotate(c.yaw); g.scale(Lcar * 0.58, Lcar * 0.3); const sg = g.createRadialGradient(0, 0, 0, 0, 0, 1); sg.addColorStop(0, "rgba(0,0,0,.55)"); sg.addColorStop(0.7, "rgba(0,0,0,.3)"); sg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = sg; g.fillRect(-1.2, -1.2, 2.4, 2.4); g.restore();
    }
    for (const c of cars) { if (c.u + Lcar < u0 || c.u - Lcar > u1) continue;
      g.save(); g.translate(c.u, c.v); g.rotate(c.yaw); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
      const slow = c.me ? t > TC + 1.3 : (vel < 0.5 * A.V0 && t > TC + 1.4);
      if (slow) { const br = Math.min(1, (t - TC - 1.3) * 1.2) * (0.55 + 0.45 * Math.sin(t * 9 + (c.me ? 0 : 2))); g.globalCompositeOperation = "lighter"; const rg = g.createRadialGradient(-Lcar * 0.5, 0, 0, -Lcar * 0.5, 0, Lcar * 0.22); rg.addColorStop(0, `rgba(255,50,40,${0.5 * br})`); rg.addColorStop(1, "rgba(255,50,40,0)"); g.fillStyle = rg; g.fillRect(-Lcar * 0.8, -Lcar * 0.3, Lcar * 0.6, Lcar * 0.6); g.globalCompositeOperation = "source-over"; }
      g.drawImage(c.sp.img, -c.sp.w * Ps / 2, -c.sp.h * Ps / 2, c.sp.w * Ps, c.sp.h * Ps);
      if (c.me && me.sil) { // brillo que recorre la carrocería, más fuerte al cruzar
        const tg = me.tmp.getContext("2d"), gw = me.tmp.width, gh = me.tmp.height; tg.globalCompositeOperation = "copy"; tg.drawImage(me.sil, 0, 0); tg.globalCompositeOperation = "source-in";
        const px = ((t * 0.55) % 1.6 - 0.3) * gw, lg = tg.createLinearGradient(px - gw * 0.18, 0, px + gw * 0.18, 0); const pk = 0.14 + 0.45 * Math.exp(-Math.pow((t - TC) / 0.35, 2));
        lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, `rgba(255,250,235,${pk})`); lg.addColorStop(1, "rgba(255,255,255,0)"); tg.fillStyle = lg; tg.fillRect(0, 0, gw, gh); tg.globalCompositeOperation = "source-over";
        g.globalCompositeOperation = "lighter"; g.drawImage(me.tmp, -me.w * Ps / 2, -me.h * Ps / 2, me.w * Ps, me.h * Ps); g.globalCompositeOperation = "source-over";
      }
      g.restore();
    }
    g.save(); g.globalCompositeOperation = "lighter";
    for (const s of A.sparks) if (s.age > 0) { const q = s.age / s.life, a = 1 - q; g.strokeStyle = `rgba(255,${170 + (80 * q) | 0},${60 + (60 * q) | 0},${a})`; g.lineWidth = 1.6 * k + 0.6; g.lineCap = "round"; g.beginPath(); g.moveTo(s.u, s.v); g.lineTo(s.u + 14 * k * (1 + vel / A.V0), s.v - s.vv * 0.03); g.stroke(); }
    g.restore();
    // sombra del arco sobre la pista
    { const gw = 8 * Ps, ex = 3 * Ps, [su, sv] = s2w(m, 4 * Ps, 5 * Ps), gu = Ug + su;
      const gg = g.createLinearGradient(gu - ex, 0, gu + gw + ex, 0); gg.addColorStop(0, "rgba(0,0,0,0)"); gg.addColorStop(0.2, "rgba(0,0,0,.36)"); gg.addColorStop(0.8, "rgba(0,0,0,.36)"); gg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gg; g.fillRect(gu - ex, -Rh - kerb + sv, gw + 2 * ex, 2 * (Rh + kerb)); }

    /* ===== el arco de meta: está alto, así que se ve más grande y se mueve más rápido que el suelo (paralaje) ===== */
    { const hg = 1.34, ex = edge + wallW + 3 * Ps; g.save(); g.translate(A.camU, camV); g.scale(hg, hg); g.translate(-A.camU, -camV);
      const bw = 6.4 * Ps, bu = Ug - bw / 2 + 4 * Ps;
      g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(bu + 1.4 * Ps, -ex + 1.6 * Ps, bw, 2 * ex);
      const bgr = g.createLinearGradient(bu, 0, bu + bw, 0); bgr.addColorStop(0, "#9AA1AC"); bgr.addColorStop(0.18, "#E7EAEE"); bgr.addColorStop(0.5, "#5B626D"); bgr.addColorStop(1, "#2A2E36"); g.fillStyle = bgr; g.fillRect(bu, -ex, bw, 2 * ex);
      g.strokeStyle = "rgba(20,22,28,.55)"; g.lineWidth = 0.35 * Ps; g.beginPath(); for (let v = -ex; v < ex; v += 3.2 * Ps) { g.moveTo(bu + 0.3 * Ps, v); g.lineTo(bu + bw - 0.3 * Ps, v + 1.6 * Ps); g.lineTo(bu + 0.3 * Ps, v + 3.2 * Ps); } g.stroke();
      const cs = 1.5 * Ps; for (let c = 0; c * cs < 2 * ex; c++) for (let rr = 0; rr < 2; rr++) { g.fillStyle = (c + rr) & 1 ? "#F4F4F6" : "#14161A"; g.fillRect(bu + bw * 0.5 - cs + rr * cs, -ex + c * cs, cs, cs); }
      for (let i = 0; i < 28; i++) { const v = -ex + (i + 0.5) * (2 * ex / 28), on = ((i + Math.floor(t * 9)) % 4) === 0, col = on ? "#FFFFFF" : (i % 2 ? "#FD1C22" : "#F6BC2F"); g.fillStyle = col; g.beginPath(); g.arc(bu + bw * 0.86, v, 0.5 * Ps, 0, TAU); g.fill(); if (on) { g.save(); g.globalCompositeOperation = "lighter"; const rg = g.createRadialGradient(bu + bw * 0.86, v, 0, bu + bw * 0.86, v, 2.4 * Ps); rg.addColorStop(0, "rgba(255,240,200,.7)"); rg.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = rg; g.fillRect(bu + bw * 0.86 - 2.4 * Ps, v - 2.4 * Ps, 4.8 * Ps, 4.8 * Ps); g.restore(); } }
      for (const sd of [-1, 1]) { const pv = sd * (ex - 1.6 * Ps); g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(bu - 0.8 * Ps + 1.4 * Ps, pv - 3.4 * Ps + 1.6 * Ps, bw + 1.6 * Ps, 6.8 * Ps); const pg = g.createLinearGradient(bu, 0, bu + bw, 0); pg.addColorStop(0, "#4A505A"); pg.addColorStop(1, "#1F2228"); g.fillStyle = pg; g.fillRect(bu - 0.8 * Ps, pv - 3.4 * Ps, bw + 1.6 * Ps, 6.8 * Ps); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(bu - 0.8 * Ps, pv - 3.4 * Ps, 0.8 * Ps, 6.8 * Ps); g.fillStyle = "#E4272B"; g.beginPath(); g.arc(bu + bw * 0.5, pv, 0.9 * Ps, 0, TAU); g.fill(); }
      g.restore(); }

    /* ===== confeti, serpentinas y destellos en el aire (con paralaje por altura) ===== */
    const zk = 480 * k, lift = (u, v, z) => { const sc = 1 + z / zk; return [A.camU + (u - A.camU) * sc, camV + (v - camV) * sc, sc]; };
    for (const p of A.parts) {
      const fade = p.age > p.life - 0.8 ? clamp((p.life - p.age) / 0.8, 0, 1) : 1, [su, sv] = s2w(m, p.z * 0.22, p.z * 0.34), fl = Math.cos(p.flip), [x, y, sc] = lift(p.u, p.v, p.z), fa = Math.max(0.15, Math.abs(fl));
      g.globalAlpha = 0.22 * fade; g.fillStyle = "#000"; g.save(); g.translate(p.u + su, p.v + sv); g.rotate(p.rot); g.scale(1, fa); g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
      g.globalAlpha = fade; g.save(); g.translate(x, y); g.rotate(p.rot); g.scale(sc, sc * fa); g.fillStyle = p.col;
      if (p.shape === 1) { g.beginPath(); g.arc(0, 0, p.w * 0.55, 0, TAU); g.fill(); } else if (p.shape === 2) { g.beginPath(); g.moveTo(0, -p.h / 2); g.lineTo(p.w / 2, p.h / 2); g.lineTo(-p.w / 2, p.h / 2); g.closePath(); g.fill(); } else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      if (fl < 0) { g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); } g.restore();
      if (p.z > 0 && fa > 0.9 && (((p.age * 20) | 0) + (p.ph * 5 | 0)) % 9 === 0) { g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.7 * fade; g.fillStyle = "#FFF3C0"; g.beginPath(); g.arc(x, y, p.w * 0.35 * sc, 0, TAU); g.fill(); g.restore(); }
    }
    g.globalAlpha = 1; g.lineCap = "round"; g.lineJoin = "round";
    for (const s of A.strips) { if (s.trail.length < 2) continue; const fade = s.age > s.life - 0.8 ? clamp((s.life - s.age) / 0.8, 0, 1) : 1; g.globalAlpha = fade; g.strokeStyle = s.col; g.lineWidth = s.w;
      g.beginPath(); s.trail.forEach((q, i) => { const [x, y] = lift(q[0], q[1], q[2]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); }
    g.globalAlpha = 1;
    g.restore();

    /* ===== pantalla: velocidad, fuegos artificiales, corte, postproceso ===== */
    const spd = clamp((vel * ts) / A.V0, 0, 1);
    g.save(); g.strokeStyle = "#fff"; g.lineCap = "round";
    for (const l of A.lines) { l.y -= (vel * ts / F) * dt * 0.62; if (l.y < -0.4) { l.y += 1.5; l.x = rnd(-0.5, 0.5); l.l = rnd(0.08, 0.34); } const len = l.l * F * (0.4 + 0.9 * spd), a = l.a * spd * (1 - 0.8 * seg(t, TC + 1.2, TC + 2.8)); if (a < 0.01) continue; g.globalAlpha = a; g.lineWidth = 1.2 + l.l * 3; const px = W / 2 + l.x * X, py = l.y * F; g.beginPath(); if (portrait) { g.moveTo(px, py); g.lineTo(px, py + len); } else { g.moveTo(py, H / 2 + l.x * X); g.lineTo(py + len, H / 2 + l.x * X); } g.stroke(); }
    g.restore();
    // fuegos artificiales (rastros de luz que se abren y caen)
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (const f of A.fw) { const q = f.age / f.life, a = (1 - q) * (1 - q); g.strokeStyle = f.col; g.globalAlpha = a; g.lineWidth = 2.2 * (1 - 0.5 * q); g.beginPath(); g.moveTo(f.px - f.vx * 0.04, f.py - f.vy * 0.04); g.lineTo(f.x, f.y); g.stroke(); g.fillStyle = "#fff"; g.globalAlpha = a * 0.8; g.beginPath(); g.arc(f.x, f.y, 1.3, 0, TAU); g.fill(); }
    g.restore();
    // corte con empuje rápido: barrido de luz y rastro de la imagen anterior
    const cut = CUTS.find((c) => t > c - 0.45 && t < c + 0.7), cutQ = cut ? Math.exp(-Math.pow((t - cut) / 0.17, 2)) : 0;
    if (cutQ > 0.02 && A.prev && A.prevT < cut) { g.save(); g.globalAlpha = 0.55 * cutQ; g.setTransform(1, 0, 0, 1, 0, 0); const z2 = 1 + 0.08 * cutQ; g.translate(cv.width / 2, cv.height / 2); g.scale(z2, z2); g.translate(-cv.width / 2, -cv.height / 2); g.drawImage(A.prev, 0, 0); g.restore(); g.setTransform(DPR, 0, 0, DPR, 0, 0); }
    postProcess(g, m, t);
    // al inicio: la vista de arriba se acerca al carro y se desvanece
    if (t < 0.7) { const q = ease(t / 0.7), [fx0, fy0] = A.focus, z = 1 + 2.4 * q; g.save(); g.globalAlpha = 1 - q; g.setTransform(1, 0, 0, 1, 0, 0); g.translate(fx0 * DPR, fy0 * DPR); g.scale(z, z); g.translate(-fx0 * DPR, -fy0 * DPR); g.drawImage(A.snap, 0, 0); g.restore(); g.setTransform(DPR, 0, 0, DPR, 0, 0); }
    if (cut && t < cut - 0.03) { if (!A.prev) A.prev = cvs(cv.width, cv.height); const pg = A.prev.getContext("2d"); pg.globalCompositeOperation = "copy"; pg.drawImage(cv, 0, 0); A.prevT = t; }
    overlays(g, m, t);
    if (t >= END - 0.42 && !A.ended) finish(g);
  }

  /* ---------- Postproceso: brillo, color, viñeta, grano y barras de cine ---------- */
  function postProcess(g, m, t) {
    const { W, H } = m; g.setTransform(1, 0, 0, 1, 0, 0);
    const bw = Math.max(8, cv.width >> 3), bh = Math.max(8, cv.height >> 3);
    if (!post) post = { a: cvs(bw, bh), b: cvs(bw >> 1, bh >> 1) };
    if (post.a.width !== bw) post = { a: cvs(bw, bh), b: cvs(bw >> 1, bh >> 1) };
    const pa = post.a.getContext("2d"), pb = post.b.getContext("2d"); pa.globalCompositeOperation = "copy"; pa.imageSmoothingQuality = "low"; pa.drawImage(cv, 0, 0, bw, bh);
    pa.globalCompositeOperation = "multiply"; pa.drawImage(post.a, 0, 0);   // elevar al cuadrado: solo brillan las zonas claras
    pb.globalCompositeOperation = "copy"; pb.imageSmoothingQuality = "high"; pb.drawImage(post.a, 0, 0, post.b.width, post.b.height);
    const kb = 0.26 + 0.3 * A.flash + 0.12 * seg(t, TC + 1.8, TC + 2.5);
    g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = clamp(kb, 0, 1); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(post.b, 0, 0, cv.width, cv.height); g.restore();
    g.save(); g.globalCompositeOperation = "soft-light"; const gg = g.createLinearGradient(0, 0, 0, cv.height); gg.addColorStop(0, "rgba(255,190,110,.55)"); gg.addColorStop(0.55, "rgba(255,255,255,.0)"); gg.addColorStop(1, "rgba(80,130,255,.5)"); g.fillStyle = gg; g.fillRect(0, 0, cv.width, cv.height); g.restore();
    const vg = g.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * 0.28, cv.width / 2, cv.height / 2, Math.hypot(cv.width, cv.height) * 0.62); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, A.dark ? "rgba(0,0,8,.72)" : "rgba(0,0,0,.55)"); g.fillStyle = vg; g.fillRect(0, 0, cv.width, cv.height);
    if (A.dark) { g.fillStyle = "rgba(8,14,34,.26)"; g.fillRect(0, 0, cv.width, cv.height); }
    const warm = seg(t, TC, TC + 0.5) * (1 - 0.6 * seg(t, 7, END)); if (warm > 0) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(255,196,110,${0.06 * warm})`; g.fillRect(0, 0, cv.width, cv.height); g.restore(); }
    if (A.flash > 0) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(255,248,230,${0.5 * A.flash * A.flash})`; g.fillRect(0, 0, cv.width, cv.height);
      const cy = cv.height / 2 + (m.portrait ? 0.1 * cv.height : 0), sg = g.createLinearGradient(0, cy, cv.width, cy); sg.addColorStop(0, "rgba(160,200,255,0)"); sg.addColorStop(0.5, `rgba(235,245,255,${0.9 * A.flash})`); sg.addColorStop(1, "rgba(160,200,255,0)"); g.fillStyle = sg; g.fillRect(0, cy - 3 * DPR, cv.width, 6 * DPR); g.restore(); }
    g.save(); g.globalCompositeOperation = "overlay"; g.globalAlpha = 0.07; const gx = (Math.random() * 160) | 0, gy = (Math.random() * 160) | 0, s = DPR * 1.6;
    for (let x = -gx * s; x < cv.width; x += 160 * s) for (let y = -gy * s; y < cv.height; y += 160 * s) g.drawImage(tiles.grain, x, y, 160 * s, 160 * s);
    g.restore();
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* ---------- Gráficos de pantalla: barras, GANADOR y el tercio inferior ---------- */
  function overlays(g, m, t) {
    const { W, H } = m, k = ease(seg(t, 0.1, 0.7)) * (1 - ease(seg(t, END - 0.55, END - 0.1))), bar = Math.round(H * 0.055 * k);
    g.fillStyle = "#000"; g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar);
    const t0 = TC + 1.05; if (t >= t0) titleGfx(g, m, t, t0, bar);
  }
  function titleGfx(g, m, t, t0, bar) {
    const { W, H } = m, out = 1 - ease(seg(t, END - 0.85, END - 0.45)), word = T("vic_winner").toUpperCase(), size = Math.min(W * 0.17, H * 0.1, 86), sp = size * 0.1, cy = bar + size * 1.5;
    g.save(); g.font = `800 italic ${size}px Montserrat, Figtree, sans-serif`; g.textBaseline = "alphabetic"; g.textAlign = "left";
    const ws = [...word].map((c) => g.measureText(c).width), tw = ws.reduce((a, b) => a + b, 0) + sp * (word.length - 1); let x = (W - tw) / 2;
    const gr = g.createLinearGradient(0, cy - size, 0, cy + size * 0.1); gr.addColorStop(0, "#FFF6D0"); gr.addColorStop(0.5, "#F6BC2F"); gr.addColorStop(1, "#C98A12");
    const sweep = ((t - t0 - 0.9) * 0.9) % 2.4, sx = -tw * 0.3 + sweep * tw * 0.8;
    [...word].forEach((c, i) => {
      const p = eoq(seg(t, t0 + i * 0.05, t0 + 0.6 + i * 0.05)); if (p <= 0) { x += ws[i] + sp; return; }
      g.globalAlpha = p * out; g.save(); g.translate(x, cy + (1 - p) * size * 0.45); g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = size * 0.22; g.shadowOffsetY = size * 0.05; g.fillStyle = gr; g.fillText(c, 0, 0); g.shadowColor = "transparent";
      const lx = x + ws[i] / 2 - sx; if (Math.abs(lx) < size) { g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(255,255,255,${0.7 * (1 - Math.abs(lx) / size)})`; g.fillText(c, 0, 0); } g.restore(); x += ws[i] + sp;
    });
    const lp = eoc(seg(t, t0 + 0.5, t0 + 1.1)); g.globalAlpha = out; g.fillStyle = "rgba(246,188,47,.95)"; g.fillRect(W / 2 - tw * 0.32 * lp, cy + size * 0.18, tw * 0.64 * lp, 2.2);
    g.restore();
    // tercio inferior estilo F1: caja de posición, nombre, diferencia y tiempo
    const lt = TC + 2.5; if (t < lt) return;
    const p = eoq(seg(t, lt, lt + 0.7)), o2 = out, pw = Math.min(W * 0.92, 470), ph = Math.min(78, H * 0.1), px = (W - pw) / 2, py = H - bar - ph - Math.max(18, H * 0.035), slide = (1 - p) * (pw * 0.6), sk = 0.2;
    g.save(); g.globalAlpha = p * o2; g.translate(px - slide, py);
    const para = (x0, w, y0, h, fill) => { g.beginPath(); g.moveTo(x0 + sk * h, y0); g.lineTo(x0 + w + sk * h, y0); g.lineTo(x0 + w, y0 + h); g.lineTo(x0, y0 + h); g.closePath(); g.fillStyle = fill; g.fill(); };
    g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 18; g.shadowOffsetY = 6; para(0, pw, 0, ph, "rgba(14,16,22,.88)"); g.shadowColor = "transparent";
    const gg = g.createLinearGradient(0, 0, 0, ph); gg.addColorStop(0, "#FFE9A0"); gg.addColorStop(0.5, "#F6BC2F"); gg.addColorStop(1, "#C98A12"); para(0, ph * 1.05, 0, ph, gg);
    g.font = `800 italic ${ph * 0.66}px Montserrat, Figtree, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#14161A"; g.fillText("1", ph * 0.58 + sk * ph * 0.3, ph * 0.54);
    const nx = ph * 1.5; g.textAlign = "left"; g.fillStyle = "#fff"; g.font = `800 ${ph * 0.34}px Montserrat, Figtree, sans-serif`; g.fillText(A.name, nx, ph * 0.4); g.fillStyle = "rgba(255,255,255,.55)"; g.font = `700 ${ph * 0.17}px Figtree, sans-serif`; g.fillText(T("vic_winner").toUpperCase(), nx, ph * 0.76);
    g.fillStyle = "#FD1C22"; g.fillRect(nx - 10, ph * 0.2, 3, ph * 0.6);
    g.textAlign = "right"; g.fillStyle = "#fff"; g.font = `700 ${ph * 0.3}px Montserrat, Figtree, sans-serif`; g.fillText(fmtRace(A.r.sim[2].fin), pw - ph * 0.25, ph * 0.4);
    if (A.gapP2 > 0) { g.fillStyle = "#7BE0A0"; g.font = `700 ${ph * 0.2}px Figtree, sans-serif`; g.fillText("+" + A.gapP2.toFixed(3) + "  " + T("vic_ahead"), pw - ph * 0.25, ph * 0.76); }
    g.restore();
  }

  function finish(g) {
    A.ended = true; const r = A.r;
    tail = { c: cvs(cv.width, cv.height), a: 1 }; tail.c.getContext("2d").drawImage(cv, 0, 0);
    r.victory = false; r.t = r.sim[2].fin + 0.7; state = "race"; Sound.enginesStop(); document.body.classList.remove("cine"); A = null;
  }
  function drawTail(g, dt) { if (!tail) return; tail.a -= dt / 0.6; if (tail.a <= 0) { tail = null; return; } g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = ease(tail.a); g.drawImage(tail.c, 0, 0); g.restore(); }
  function skip() { if (A && A.t > TC + 1.2 && A.t < END - 0.45) A.t = END - 0.45; }

  return { start, frame: (g, dt) => frame(g, dt), cancel, active, drawTail, skip, prepare, LEAD, time: () => (A ? +A.t.toFixed(2) : -1), overlaps: () => (A ? A.overlaps || 0 : -1) };
})();
