"use strict";
/* game.js: estados (intro, inicio, trazo, cuenta, carrera, resultado), entrada táctil y bucle principal */

const ui = { undo: $("undo"), hint: $("hint"), hud: $("hud"), lap: $("lap"), pos: $("pos"), bar: $("bar"), clear: $("clear"), go: $("go"), count: $("count"), result: $("result"), gameUi: $("game-ui"), lvl: $("lvl") };
let demo = null, resultAt = 0;
let state = "boot";          // boot | intro | home | draw | countdown | race | result
let cur = null;              // nivel actual
let pen = null, strokes = [], curStroke = null, prog = 0, prevIdx = 0, complete = false, warnAt = 0, drawing = false, myLine = null, hintKey = "hint_draw", hintTimer = 0, race = null, homeCars = [], introT0 = 0, lastNow = 0, penLast = null;

const lvlSave = (id) => Save.levels[id] || { stars: 0, place: 0, time: 0, races: 0 };
const isUnlocked = (lv) => { const prev = LEVELS.find((l) => l.id === lv.id - 1); return !prev || prev.grp !== lv.grp || ((Save.levels[lv.id - 1] || {}).stars || 0) >= 1; };   // el primero de cada grupo siempre está abierto
/* ---------- Pilotos: tu nombre (de la pantalla de inicio) y tres rivales ficticios ---------- */
const RIVAL_DRIVERS = [{ n: "A. Moreau", code: "MOR" }, { n: "L. Fischer", code: "FIS" }, { n: "K. Tanaka", code: "TAN" }];   // azul, amarillo, verde (el orden de cur.rivals)
const playerName = () => (Settings.name || "").trim() || T("you");
const playerCode = () => playerName().replace(/[^A-Za-zÀ-ÿ]/g, "").slice(0, 3).toUpperCase() || "YOU";
const driverOf = (i) => (i === 2 ? { n: playerName(), code: playerCode(), me: true } : RIVAL_DRIVERS[i === 3 ? 2 : i]);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtRace = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return (m ? m + ":" + (s < 10 ? "0" : "") : "") + s.toFixed(3); };
const starsFor = (place) => Math.max(0, 4 - place);

function setHint(key) {
  hintKey = key;
  ui.hint.style.opacity = 0; clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { ui.hint.textContent = key ? T(key) : ""; ui.hint.style.opacity = 1; }, 180);
}
function refreshHint() { ui.hint.textContent = hintKey ? T(hintKey) : ""; ui.lvl.textContent = cur ? cur.name : ""; themeChip(); }
// el chip de arriba toma la bandera y los colores del país del circuito
function themeChip() {
  const chip = $("chip"), f = cur && FLAGS[cur.cc]; if (!f) return;
  const c = f.c, strong = c.find((x) => !/^#(FFFFFF|000000)$/i.test(x)) || c[0];
  $("chip-flag").src = f.src; $("chip-cty").textContent = cur.sub[LANG].split(" · ")[0]; $("chip-no").textContent = String(cur.id).padStart(2, "0"); chip.classList.toggle("custom", !!cur.custom);
  const n = c.length, stops = c.map((x, i) => `${/^#FFFFFF$/i.test(x) ? "#DCDCE2" : x} ${(i * 100) / n}% ${((i + 1) * 100) / n}%`).join(",");
  chip.style.setProperty("--cc", strong); chip.style.setProperty("--cflag", `url(${f.src})`); $("chip-bar").style.background = `linear-gradient(90deg,${stops})`;
}

/* ---------- Inicio: la ciudad con carros dando vueltas despacio ---------- */
function enterHome(mode) {
  Victory.cancel();
  if (state === "countdown" || state === "race") Sound.enginesStop();
  state = "home"; race = null; cur = null;
  useTrack(LEVELS[0]); renderBackground();
  const lv = LEVELS[0];
  const lines = [TR.ideal.line, ...lv.rivals.map((r) => rivalLine(r))];
  const cols = [COLORS.player, COLORS.r1, COLORS.r2, COLORS.r3];
  homeCars = lines.map((line, i) => ({ line, s: (i * line.L) / 4 + 60, color: cols[i] }));
  ui.gameUi.classList.add("hidden"); ui.result.classList.remove("show");
  if (mode === "levels") UI.showHome(); else UI.showTitle();
}

/* ---------- Nivel ---------- */
function enterLevel(lv) {
  Victory.cancel();
  cur = lv; useTrack(lv); renderBackground();
  myLine = null; strokes = []; curStroke = null; prog = 0; complete = false; race = null; state = "draw";
  UI.hideHome();
  ui.gameUi.classList.remove("hidden"); ui.bar.classList.remove("hidden"); ui.hud.classList.add("hidden"); ui.result.classList.remove("show");
  syncButtons();
  refreshHint(); setHint("hint_draw");
  demo = !Save.demoSeen && lv.id === 1 ? { t0: performance.now() } : null; if (demo) setHint("demo_hint");
}
function leaveLevel(mode) { tmEl.box.classList.add("hidden"); boostSet("hidden"); Sound.enginesStop(); Sound.penEnd(); lightsReset(false); enterHome(mode === "title" ? undefined : "levels"); }

/* ---------- Trazo: la línea se queda al soltar el dedo y se puede seguir dibujando desde su final ---------- */
const allPts = () => { const out = []; for (const st of strokes) for (const p of st) out.push(p); return out; };
const lastPoint = () => { for (let i = strokes.length - 1; i >= 0; i--) if (strokes[i].length) return strokes[i][strokes[i].length - 1]; return null; };
function warn(key) { const now = performance.now(); if (now - warnAt > 1500) { warnAt = now; setHint(key); } }
function wrapIdx(dj) { const N = TR.N; if (dj > N / 2) dj -= N; if (dj < -N / 2) dj += N; return dj; }
function syncButtons() { ui.undo.disabled = strokes.length === 0; ui.clear.disabled = strokes.length === 0; ui.go.disabled = !myLine; }
function recalcProgress() { // tras deshacer: se vuelve a medir cuánto avanzó la línea que queda
  prog = 0; const pts = allPts(); if (!pts.length) { prevIdx = 0; return; }
  prevIdx = TR.nearest(pts[0][0], pts[0][1]);
  for (let k = 1; k < pts.length; k++) { const j = TR.nearest(pts[k][0], pts[k][1]); prog += wrapIdx(j - prevIdx); prevIdx = j; }
}
function addPoint(p) { // true si el punto se aceptó
  const l = curStroke[curStroke.length - 1];
  if (hyp(p[0] - l[0], p[1] - l[1]) < 4) return false;
  const j = TR.nearest(p[0], p[1]), c = TR.C[j];
  if (hyp(p[0] - c[0], p[1] - c[1]) > TR.hw + 70) { warn("err_road"); return false; }
  const dj = wrapIdx(j - prevIdx);
  if (dj < -4) { warn("err_dir"); return false; }        // yendo hacia atrás
  if (dj > 40) { warn("err_road"); return false; }       // saltando por encima de otra parte de la pista
  prevIdx = j; prog += dj; curStroke.push(p);
  if (prog >= 0.985 * TR.N) finishLine();
  return true;
}
function finishLine() { // la vuelta está completa: se suaviza, se cierra y queda lista para correr
  complete = true; drawing = false; Sound.penEnd();
  myLine = strokeToLine(allPts());
  syncButtons();
  const pct = Math.max(0, (myLine.lapT / TR.ideal.line.lapT - 1) * 100);
  setHint(pct < 2 ? "hint_good" : "hint_ok");
  Haptics.soft(); Sound.lineOk();
}
cv.addEventListener("pointerdown", (e) => {
  if (state === "victory") { Victory.skip(); return; }
  if (state !== "draw" || drawing) return;
  const p = toWorld(e);
  if (demo) { demo = null; Save.demoSeen = true; persist(); }
  if (complete) { warn("hint_done"); return; }
  const last = lastPoint();
  if (!last) { if (hyp(p[0] - TR.C[0][0], p[1] - TR.C[0][1]) > 80) { warn("err_start"); return; } }
  else if (hyp(p[0] - last[0], p[1] - last[1]) > 66) { warn("hint_cont"); return; }
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  drawing = true; penLast = { x: e.clientX, y: e.clientY, t: performance.now() };
  curStroke = last ? [last.slice()] : [p]; strokes.push(curStroke); pen = { tip: curStroke[0].slice(), fing: p, t: e.timeStamp };
  if (!last) { prog = 0; prevIdx = TR.nearest(p[0], p[1]); }
  setHint("hint_draw"); syncButtons(); Sound.penStart();
});
cv.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of evs.length ? evs : [e]) { if (!drawing) break; const fp = toWorld(ev); penFollow(pen.tip, fp, ev.timeStamp - pen.t); pen.t = ev.timeStamp; pen.fing = fp; addPoint(pen.tip.slice()); }
  const now = performance.now(), dt = Math.max(1, now - penLast.t);
  if (dt > 30) { Sound.penMove(hyp(e.clientX - penLast.x, e.clientY - penLast.y) / dt / 1.4); penLast = { x: e.clientX, y: e.clientY, t: now }; }
});
function endStroke() {
  if (!drawing) return;
  if (pen && curStroke) for (let i = 0; i < 40 && hyp(pen.fing[0] - pen.tip[0], pen.fing[1] - pen.tip[1]) > 2.5; i++) { penFollow(pen.tip, pen.fing, 14); if (!addPoint(pen.tip.slice())) break; }   // al soltar, la línea alcanza al dedo
  pen = null; drawing = false; Sound.penEnd();
  if (curStroke && curStroke.length < 3 && strokes.length > 1) strokes.pop();       // un toque sin dibujar no cuenta
  else if (curStroke && curStroke.length < 3) strokes.pop();
  curStroke = null; recalcProgress();
  if (!complete && strokes.length) { setHint("hint_cont"); Haptics.soft(); }
  syncButtons();
}
cv.addEventListener("pointerup", endStroke);
cv.addEventListener("pointercancel", endStroke);
function clearLine() { if (state !== "draw") return; Sound.penEnd(); drawing = false; myLine = null; strokes = []; curStroke = null; prog = 0; complete = false; syncButtons(); setHint("hint_draw"); }
function undoLine() {
  if (state !== "draw" || !strokes.length) return;
  drawing = false; Sound.penEnd(); strokes.pop(); curStroke = null; myLine = null; complete = false; recalcProgress(); syncButtons();
  setHint(strokes.length ? "hint_cont" : "hint_draw");
}
function redraw() { Victory.cancel(); tmEl.box.classList.add("hidden"); boostSet("hidden"); ui.result.classList.remove("show"); Sound.enginesStop(); lightsReset(false); race = null; myLine = null; strokes = []; curStroke = null; prog = 0; complete = false; state = "draw"; ui.bar.classList.remove("hidden"); ui.hud.classList.add("hidden"); syncButtons(); setHint("hint_draw"); }

/* ---------- Carrera ---------- */
function startRace() {
  if (!myLine) return;
  Victory.cancel(); setTimeout(Victory.prepare, 900);
  ui.result.classList.remove("show");
  const rivals = cur.rivals.map((r) => { const line = rivalLine(r); return { line, vs: 1, color: r.color, player: false, drv: makeDriver(r.trait, line, cur.noise) }; });
  const cars = [rivals[0], rivals[1], { line: myLine, vs: 1, color: COLORS.player, player: true, drv: makeDriver(null, myLine) }, rivals[2]];
  fx.dim = 0; fx.loss = false; fx.parts.length = 0; fx.rings.length = 0;
  cars.forEach((c, i) => { c.s0 = -(10 + i * 40); c.gridOff = i % 2 ? 9 : -9; c.lat = 0; });
  const sim = simulate(cars);
  const order = sim.map((s, i) => i).sort((a, b) => sim[a].fin - sim[b].fin);
  fx.dim = 0; fx.loss = false; fx.parts.length = 0; fx.rings.length = 0;
  const T0 = 4.35 + 0.9 + Math.random() * 0.9; // cinco luces, una por segundo, y una pausa al azar antes de apagarse (como en la F1)
  race = { cars, sim, ct: crossTimes(sim[2], myLine), order, place: order.indexOf(2) + 1, t: -T0, t0: -T0, shown: false, cd: 0, finHaptic: false };
  state = "countdown"; boostSet("hidden"); boostBtn.style.setProperty("--p", 1);
  ui.bar.classList.add("hidden"); ui.hud.classList.remove("hidden");
  ui.lap.textContent = T("lap", 1, LAPS); ui.pos.textContent = ORD[LANG][3];
  setHint(""); lightsReset(true);
  Sound.enginesStart(4, 2);
}
const lamps = [...document.querySelectorAll("#lights .lamp")];
/* ---------- Boost: un empujón corto, una vez por carrera. Como la carrera ya está calculada, se vuelve a calcular desde el inicio con el boost
   activado en ese instante (todo es determinista, así que hasta ese momento nada cambia) ---------- */
const boostBtn = $("boost");
function boostSet(mode) { boostBtn.classList.toggle("hidden", mode === "hidden"); boostBtn.classList.toggle("used", mode === "used"); boostBtn.classList.toggle("active", mode === "active"); boostBtn.disabled = mode !== "ready"; }
function useBoost() {
  const r = race; if (state !== "race" || !r || r.boostT0 != null || r.t < 0.4 || r.t > r.sim[2].fin - 0.8) return;
  r.boostT0 = r.t; r.cars[2].boost = { t0: r.t };
  r.sim = simulate(r.cars); r.ct = crossTimes(r.sim[2], myLine); r.order = r.sim.map((s, i) => i).sort((a, b) => r.sim[a].fin - r.sim[b].fin); r.place = r.order.indexOf(2) + 1;
  boostSet("active"); Sound.boost(); Haptics.heavy(); setTimeout(Haptics.medium, 140);
}
boostBtn.onclick = useBoost;
function boostFx(g, me, r) { // llama y estela detrás del carro mientras dura el boost
  if (r.boostT0 == null) return;
  const x = (r.t - r.boostT0) / BOOST_DUR; if (x < 0 || x > 1.15) return;
  const k = Math.min(1, x / 0.1, Math.max(0, (1.15 - x) / 0.35)), ang = Math.atan2(me.ty, me.tx), fl = 0.85 + 0.15 * Math.sin(r.t * 70);
  g.save(); g.translate(me.x, me.y); g.rotate(ang); g.globalCompositeOperation = "lighter";
  const len = (30 + 22 * k) * fl, gr = g.createLinearGradient(-17, 0, -17 - len, 0); gr.addColorStop(0, `rgba(255,180,90,${0.9 * k})`); gr.addColorStop(0.45, `rgba(255,70,40,${0.55 * k})`); gr.addColorStop(1, "rgba(255,40,30,0)");
  for (const y of [-2.6, 2.6]) { g.fillStyle = gr; g.beginPath(); g.moveTo(-17, y - 2.2); g.lineTo(-17 - len, y); g.lineTo(-17, y + 2.2); g.closePath(); g.fill(); }
  const rg = g.createRadialGradient(-20, 0, 0, -20, 0, 20); rg.addColorStop(0, `rgba(255,120,70,${0.55 * k})`); rg.addColorStop(1, "rgba(255,80,40,0)"); g.fillStyle = rg; g.fillRect(-42, -22, 44, 44);
  g.globalCompositeOperation = "source-over"; g.restore();
}
function lightsReset(show) { lamps.forEach((l) => l.classList.remove("on")); $("lights").classList.toggle("show", !!show); }
function lightOn(i) { lamps[i].classList.add("on"); Sound.light(i); Haptics.soft(); }
function lightsOut() {
  lamps.forEach((l) => l.classList.remove("on"));
  ui.count.textContent = T("go"); ui.count.classList.remove("pop"); void ui.count.offsetWidth; ui.count.classList.add("pop");
  Sound.go(); Haptics.medium();
  setTimeout(() => $("lights").classList.remove("show"), 700);
}

/* ---------- Cronómetro en vivo: tiempo de la vuelta, última y mejor ---------- */
const fmtLap = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2); };
const tmEl = { box: $("timing"), cur: $("tm-time"), lap: $("tm-lap"), last: $("tm-last"), best: $("tm-best"), bar: $("tm-bar") };
function timingUpdate(r, show) {
  tmEl.box.classList.toggle("hidden", !show); if (!show) return;
  const ct = r.ct, t = r.t; let k = -1; for (let i = 0; i < ct.length; i++) if (t >= ct[i]) k = i;
  const done = k >= LAPS, lapNo = clamp(k < 0 ? 1 : k + 1, 1, LAPS), start = k < 0 ? 0 : ct[Math.min(k, ct.length - 1)];
  const laps = []; for (let i = 1; i < ct.length && t >= ct[i]; i++) laps.push(ct[i] - ct[i - 1]);
  tmEl.cur.textContent = fmtLap(done ? laps[laps.length - 1] || 0 : k < 0 ? 0 : t - start);
  tmEl.lap.textContent = T("lap", lapNo, LAPS).toUpperCase();
  const last = laps.length ? laps[laps.length - 1] : 0, best = laps.length ? Math.min(...laps) : 0;
  tmEl.last.textContent = last ? fmtLap(last) : "--"; tmEl.best.textContent = best ? fmtLap(best) : "--";
  tmEl.last.classList.toggle("pb", !!last && last <= best + 1e-6);
  if (laps.length !== r.lapsShown) { r.lapsShown = laps.length; tmEl.box.classList.remove("flash"); void tmEl.box.offsetWidth; if (laps.length) tmEl.box.classList.add("flash"); }
  tmEl.bar.style.transform = `scaleX(${done ? 1 : clamp(r.cars.length && (carPoseS(r) / myLine.L - Math.floor(carPoseS(r) / myLine.L)), 0, 1)})`;
}
const carPoseS = (r) => { const c = r.cars[2], steps = r.sim[2].steps, t = Math.max(0, r.t) / DT, k = Math.min(steps - 3, Math.floor(t)), S = r.sim[2].s; return S[k] + (S[k + 1] - S[k]) * Math.min(1, t - k); };

function saveResult(place, time, lap) {
  const s = lvlSave(cur.id), stars = starsFor(place), prevStars = s.stars;
  s.races++; s.stars = Math.max(s.stars, stars);
  if (!s.place || place < s.place) s.place = place;
  if (!s.time || time < s.time) s.time = time;
  if (lap && (!s.lap || lap < s.lap)) s.lap = lap;
  Save.levels[cur.id] = s; Save.races++; if (place === 1) Save.wins++;
  persist();
  return { stars, newUnlock: prevStars === 0 && stars > 0 && LEVELS.some((l) => l.id === cur.id + 1) };
}
/* ---------- Trofeo (1.º) y medallas (2.º y 3.º); del 4.º en adelante, una bandera a cuadros ---------- */
function trophySvg(place) {
  const star = (x, y, s, d) => `<path class="spark" style="animation-delay:${d}s;transform-origin:${x}px ${y}px" d="M${x} ${y - s}L${x + s * 0.28} ${y - s * 0.28}L${x + s} ${y}L${x + s * 0.28} ${y + s * 0.28}L${x} ${y + s}L${x - s * 0.28} ${y + s * 0.28}L${x - s} ${y}L${x - s * 0.28} ${y - s * 0.28}Z" fill="#FFF6D0"/>`;
  if (place === 1) return `<svg viewBox="0 0 72 72" class="tro gold" aria-hidden="true"><defs><linearGradient id="gA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFEFB0"/><stop offset=".42" stop-color="#F6BC2F"/><stop offset="1" stop-color="#B9740C"/></linearGradient><linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9D56A"/><stop offset="1" stop-color="#C98714"/></linearGradient></defs>
    <ellipse cx="36" cy="64" rx="19" ry="3.2" fill="rgba(0,0,0,.22)"/>
    <path d="M21 11H9c0 12 5 19 13 20" fill="none" stroke="url(#gB)" stroke-width="4" stroke-linecap="round"/><path d="M51 11h12c0 12-5 19-13 20" fill="none" stroke="url(#gB)" stroke-width="4" stroke-linecap="round"/>
    <path d="M20 6h32v18c0 11-7 18-16 18S20 35 20 24z" fill="url(#gA)"/><path d="M20 6h32v5H20z" fill="#FFF3C4" opacity=".55"/>
    <path d="M26 12c-.4 9 2 16 7 21" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>
    <path d="M36 15l2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.8 5.4-.7z" fill="#FFF8DC" opacity=".92"/>
    <rect x="32" y="42" width="8" height="9" fill="url(#gB)"/><path d="M26 51h20l2.4 7H23.6z" fill="url(#gA)"/><rect x="21" y="58" width="30" height="5.4" rx="2" fill="#7A4F10"/><rect x="21" y="58" width="30" height="1.6" rx=".8" fill="#E7B04A"/>
    ${star(12, 38, 5, 0)}${star(62, 30, 4.2, 0.7)}${star(56, 6, 3.4, 1.3)}</svg>`;
  if (place === 2 || place === 3) {
    const c = place === 2 ? ["#FFFFFF", "#C4CAD2", "#8892A0", "#EEF1F4"] : ["#F6C79A", "#C47A3A", "#7A4515", "#E8AE75"];
    return `<svg viewBox="0 0 72 72" class="tro" aria-hidden="true"><defs><linearGradient id="mA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".5" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient></defs>
    <path d="M22 4h12l8 26H30z" fill="#FD1C22"/><path d="M50 4H38l-8 26h12z" fill="#F4F4F4"/><path d="M34 4h4l2 6-6 0z" fill="#B80F14" opacity=".6"/>
    <ellipse cx="36" cy="66" rx="17" ry="3" fill="rgba(0,0,0,.2)"/>
    <circle cx="36" cy="43" r="21" fill="url(#mA)"/><circle cx="36" cy="43" r="21" fill="none" stroke="${c[3]}" stroke-width="1.6" opacity=".9"/><circle cx="36" cy="43" r="15.5" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.4"/>
    <path d="M24 32c3-6 9-9 15-8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>
    <text x="36" y="51" text-anchor="middle" font-family="Montserrat,Figtree,sans-serif" font-weight="800" font-size="22" fill="rgba(40,30,20,.78)">${place}</text></svg>`;
  }
  return `<svg viewBox="0 0 72 72" class="tro flag" aria-hidden="true"><defs><clipPath id="fc"><path d="M20.4 11c8-4 14 4 22 0s12-2 12-2v26c0 0-4-2-12 2s-14-4-22 0z"/></clipPath></defs><ellipse cx="36" cy="66" rx="16" ry="3" fill="rgba(0,0,0,.18)"/><rect x="17" y="8" width="3.4" height="56" rx="1.7" fill="#8A8F98"/><circle cx="18.7" cy="8" r="3" fill="#B7BCC4"/>
    <g class="wave"><path d="M20.4 11c8-4 14 4 22 0s12-2 12-2v26c0 0-4-2-12 2s-14-4-22 0z" fill="#F4F4F4"/><path d="M20.4 11c8-4 14 4 22 0s12-2 12-2v26c0 0-4-2-12 2s-14-4-22 0z" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/>
    <g fill="#1B1B1D" clip-path="url(#fc)"><rect x="20" y="9" width="8" height="8"/><rect x="36" y="9" width="8" height="8"/><rect x="28" y="17" width="8" height="8"/><rect x="44" y="17" width="8" height="8"/><rect x="20" y="25" width="8" height="8"/><rect x="36" y="25" width="8" height="8"/></g></g></svg>`;
}

// Clasificación final como en la F1: posición, color, piloto y tiempo (el ganador) o diferencia (los demás); vuelta rápida en morado
function buildStandings(r) {
  const fin = r.sim.map((s) => s.fin), best = r.cars.map((c, i) => { const ct = crossTimes(r.sim[i], c.line), l = ct.slice(1).map((t, k) => t - ct[k]); return l.length ? Math.min(...l) : 1e9; });
  const fl = best.indexOf(Math.min(...best)), win = r.order[0], mine = (Save.car && Save.car.body) || CAR_DEFAULT.body;
  $("rStand").innerHTML = `<h3>${T("st_title")}</h3>` + r.order.map((i, pos) => {
    const d = driverOf(i), col = d.me ? mine : r.cars[i].color;
    return `<div class="st-row${d.me ? " me" : ""}" style="--d:${120 + pos * 90}ms"><b class="st-p">${pos + 1}</b><i class="st-c" style="background:${col}"></i><span class="st-n">${esc(d.n)}${i === fl ? '<em class="st-fl"></em>' : ""}</span><span class="st-t">${pos ? "+" + (fin[i] - fin[win]).toFixed(3) : fmtRace(fin[i])}</span></div>`;
  }).join("") + `<p class="st-note"><i></i>${T("st_fl")} · ${esc(driverOf(fl).n)} · ${fmtLap(best[fl])}</p>`;
}
function showResult() {
  resultAt = performance.now();
  const r = race, place = r.place, time = r.sim[2].fin;
  const ct = crossTimes(r.sim[2], myLine), laps = ct.slice(1).map((t, i) => t - ct[i]), bestLap = laps.length ? Math.min(...laps) : 0;
  const { stars } = saveResult(place, time, bestLap);
  $("rMedal").className = "medal p" + place; $("rMedal").innerHTML = trophySvg(place);
  buildStandings(r);
  $("rLaps").innerHTML = laps.map((t, li) => `<div class="${t === bestLap ? "best" : ""}">${T("lap_n", li + 1)}<b>${t.toFixed(2)}</b></div>`).join("");
  $("rTitle").textContent = ORD_LONG[LANG][place];
  $("rSub").textContent = T(place === 1 ? "sub1" : place === 2 ? "sub2" : place === 3 ? "sub3" : "sub0");
  const star = (on) => `<svg viewBox="0 0 24 24" class="${on ? "on" : "off"}" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4L2.8 9.5l6.4-.8z"/></svg>`;
  $("rStars").innerHTML = [0, 1, 2].map((i) => star(i < stars)).join("");
  $("rStars").querySelectorAll("svg.on").forEach((s, i) => { s.style.animationDelay = 0.45 + i * 0.28 + "s"; setTimeout(() => { Sound.star(i); Haptics.soft(); }, 450 + i * 280); });
  $("rTime").textContent = time.toFixed(1) + " s";
  const pct = (myLine.lapT / TR.ideal.line.lapT - 1) * 100;
  $("rLine").textContent = pct < 0.3 ? T("perfect") : T("per_lap", pct.toFixed(1));
  const hasNext = stars > 0 && LEVELS.some((l) => l.id === cur.id + 1);
  $("rNext").classList.toggle("hidden", !hasNext);
  $("rAgain").classList.toggle("primary", !hasNext);
  ui.result.classList.add("show");
  r.shown = true; state = "result";
}

function crossTimes(sim, line) { // tiempos en que el carro cruza la meta: s = 0, L, 2L, 3L
  const S = sim.s, n = sim.steps, out = []; let k = 0;
  for (let i = 1; i < n && out.length < LAPS + 1; i++) if (S[i] >= k * line.L) { const f = (k * line.L - S[i - 1]) / (S[i] - S[i - 1] || 1); out.push((i - 1 + clamp(f, 0, 1)) * DT); k++; }
  return out;
}
function carPose(c, i, r) {
  const steps = r.sim[i].steps, t = Math.max(0, r.t) / DT, k = Math.min(steps - 3, Math.floor(t)), f = Math.min(1, t - k);
  const S = r.sim[i].s, s = S[k] + (S[k + 1] - S[k]) * f, v = (S[k + 1] - S[k]) / DT;
  return { s, v, pose: poseAt(c.line, s), braking: r.t > 0 && S[k + 2] - S[k + 1] < S[k + 1] - S[k] - 0.012 };
}
// Etiqueta con el nombre sobre cada carro (el tuyo en rojo y con tu nombre; los rivales con su código de tres letras)
function nameTag(g, a, me) {
  if (!me && state === "countdown") return;
  const s = 1 / SC, text = me ? playerName().toUpperCase() : driverOf(a.i).code;
  g.save(); g.font = `800 ${(me ? 11 : 9.5) * s}px Montserrat, Figtree, sans-serif`; g.textBaseline = "middle"; g.textAlign = "center";
  const w = g.measureText(text).width + (me ? 14 : 10) * s, h = (me ? 18 : 14) * s, x = a.x - w / 2, y = a.y - 28 - h, r = h / 2;
  g.globalAlpha = me ? 1 : 0.78; g.fillStyle = me ? "rgba(253,28,34,.96)" : "rgba(18,20,26,.72)";
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill();
  g.fillStyle = "#fff"; g.fillText(text, a.x, y + h / 2 + 0.5 * s); g.restore();
}
function drawRace(g, r) {
  if (myLine) drawLinePath(g, myLine, 0, myLine.n, 3.6, "rgba(253,28,34,.55)", false);
  const P = r.cars.map((c, i) => {
    const cp = carPose(c, i, r), grid = c.gridOff * Math.max(0, 1 - Math.max(0, cp.s) / 120);
    const nx = -cp.pose.ty, ny = cp.pose.tx;
    return { c, i, x: cp.pose.x + nx * grid, y: cp.pose.y + ny * grid, tx: cp.pose.tx, ty: cp.pose.ty, nx, ny, s: cp.s, v: cp.v, braking: cp.braking };
  });
  // Tu carro va siempre exactamente por tu línea. Los rivales se apartan de él (y entre ellos) sin salirse de la calle,
  // y si aun así se encima uno, se vuelve translúcido para que nunca te tape.
  const me = P[2];
  for (const a of P) {
    if (a === me) { a.c.lat = 0; continue; }
    let tgt = 0;
    for (const b of P) {
      if (a === b) continue;
      const dx = a.x - b.x, dy = a.y - b.y, d = hyp(dx, dy), reach = b === me ? 46 : 30;
      if (d < reach) {
        let side = Math.sign(dx * a.nx + dy * a.ny);
        if (!side) side = a.i % 2 ? 1 : -1;
        tgt += side * (reach - d) * (b === me ? 0.6 : 0.3);
      }
    }
    const j = TR.nearest(a.x, a.y), c = TR.C[j], dn = (a.x - c[0]) * TR.Nm[j][0] + (a.y - c[1]) * TR.Nm[j][1], lim = TR.edge - 2;
    tgt = clamp(dn + clamp(tgt, -18, 18), -lim, lim) - dn;
    a.c.lat += (tgt - a.c.lat) * 0.1;
    a.x += a.nx * a.c.lat; a.y += a.ny * a.c.lat;
  }
  for (const a of P) {
    if (a === me) continue;
    const d = hyp(a.x - me.x, a.y - me.y);
    g.globalAlpha = d > 30 ? 1 : 0.4 + 0.6 * clamp((d - 14) / 16, 0, 1);
    drawCar(g, a.x, a.y, Math.atan2(a.ty, a.tx), a.c.color, a.braking, false);
  }
  g.globalAlpha = 1;
  boostFx(g, me, r);
  drawCar(g, me.x, me.y, Math.atan2(me.ty, me.tx), me.c.color, me.braking, true);
  for (const a of P) nameTag(g, a, a === me);
  if (state === "race" || state === "countdown") {
    P.forEach((a) => {
      if (a === me) { Sound.enginesUpdate(a.i, clamp(a.v / VMAX, 0, 1), 0, 1); return; }
      const d = hyp(a.x - me.x, a.y - me.y);
      Sound.enginesUpdate(a.i, clamp(a.v / VMAX, 0, 1), (a.x - me.x) / 240, 1 / (1 + (d / 170) * (d / 170))); // los rivales suenan según qué tan cerca están
    });
    Sound.enginesRoad(clamp(me.v / VMAX, 0, 1));
    const sIdx = idxAt(myLine, ((me.s % myLine.L) + myLine.L) % myLine.L), ratio = (me.v * me.v * myLine.kap[sIdx]) / A_LAT;
    Sound.enginesSqueal(clamp((ratio - 0.9) / 0.1, 0, 1) * clamp(me.v / VMAX, 0, 1));
  }
  const key = (c, i) => (r.sim[i].fin != null && r.t >= r.sim[i].fin ? 100 - r.sim[i].fin : P[i].s / c.line.L);
  const rank = r.cars.map((c, i) => i).sort((a, b) => key(r.cars[b], b) - key(r.cars[a], a)).indexOf(2) + 1;
  ui.pos.textContent = ORD[LANG][rank];
  const lapNo = Math.min(LAPS, Math.max(0, Math.floor(P[2].s / myLine.L)) + 1);
  if (lapNo > (r.lapNo || 1) && lapNo <= LAPS) { Sound.lap(); Haptics.soft(); }
  r.lapNo = Math.max(r.lapNo || 1, lapNo);
  ui.lap.textContent = T("lap", lapNo, LAPS);
  timingUpdate(r, state === "race" && r.t > 0 && r.t < r.sim[2].fin + 2.2);
  if (state === "race") { // estado del botón de boost
    const left = r.boostT0 == null ? -1 : 1 - (r.t - r.boostT0) / BOOST_DUR;
    if (r.boostT0 == null) { if (r.t > r.sim[2].fin - 0.8) boostSet("hidden"); else if (boostBtn.disabled || boostBtn.classList.contains("hidden")) boostSet("ready"); }
    else { boostBtn.style.setProperty("--p", clamp(left, 0, 1)); if (left <= 0 && !boostBtn.classList.contains("used")) boostSet("used"); if (r.t >= r.sim[2].fin) boostSet("hidden"); }
  }
  if (!r.finHaptic && r.t >= r.sim[2].fin) { r.finHaptic = true; boostSet("hidden"); onFinish(r); }
  if (!r.shown && r.t >= r.sim[2].fin + 0.65) showResult();
}


/* ---------- Tutorial: una línea de ejemplo se dibuja sola con un \"dedo\" (solo la primera vez) ---------- */
function drawDemo(g, now) {
  const line = TR.ideal.line, cyc = 5.2, t = ((now - demo.t0) / 1000) % cyc, p = easeInOut(clamp((t - 0.5) / 3.6, 0, 1));
  const fade = t > 4.4 ? clamp(1 - (t - 4.4) / 0.7, 0, 1) : 1, idx = Math.max(1, Math.floor(line.n * p));
  g.save(); g.globalAlpha = 0.85 * fade;
  drawLinePath(g, line, 0, idx, 5, "#FD1C22", true);
  const pose = poseAt(line, line.L * p * 0.999);
  g.globalAlpha = fade; g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.arc(pose.x, pose.y, 17 + 2 * Math.sin(now / 160), 0, 6.3); g.fill();
  g.fillStyle = "#fff"; g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1; g.beginPath(); g.arc(pose.x, pose.y, 10, 0, 6.3); g.fill(); g.stroke();
  g.restore();
}

/* ---------- Final: confeti suave al ganar, ondas de luz en la meta y la ciudad se atenúa si pierdes ---------- */
const fx = { parts: [], rings: [], dim: 0, t0: 0, loss: false };
function onFinish(r) {
  const stars = starsFor(r.place), p = TR.C[0], t = TR.T[0];
  fx.t0 = performance.now(); fx.loss = stars === 0; fx.parts.length = 0; fx.rings.length = 0;
  fx.rings.push({ x: p[0], y: p[1], r: 10, a: 0.9, v: 190, w: 4, col: fx.loss ? "190,180,165" : "253,28,34" });
  if (!fx.loss) {
    fx.rings.push({ x: p[0], y: p[1], r: 4, a: 0.7, v: 140, w: 2.5, col: "243,235,221", delay: 0.18 });
    const cols = ["#FD1C22", "#2F6FDB", "#F2B705", "#00A58E", "#FD1C22", "#FAFAFA"], n = r.place === 1 ? 70 : 32;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, sp = 70 + Math.random() * 230;
      fx.parts.push({ x: p[0] + (Math.random() - 0.5) * 40, y: p[1] + (Math.random() - 0.5) * 40, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6.283, vr: (Math.random() - 0.5) * 7, s: 3 + Math.random() * 3.4, col: cols[i % cols.length], age: -Math.random() * 0.25, life: 2.2 + Math.random() * 1.0 });
    }
  }
  Sound.enginesStop(); Sound.finish(stars);
  if (stars) Haptics.success(); else Haptics.medium();
}
function drawFx(g, dt) {
  for (const q of fx.rings) {
    if (q.delay > 0) { q.delay -= dt; continue; }
    q.r += q.v * dt; q.v *= 1 - 1.1 * dt; q.a -= 0.55 * dt;
    if (q.a > 0) { g.strokeStyle = `rgba(${q.col},${q.a})`; g.lineWidth = q.w; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.3); g.stroke(); }
  }
  for (const q of fx.parts) {
    q.age += dt; if (q.age < 0) continue;
    q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - 1.15 * dt; q.vy *= 1 - 1.15 * dt; q.rot += q.vr * dt;
    const a = clamp(1 - q.age / q.life, 0, 1) * clamp(q.age * 8, 0, 1);
    if (a <= 0) continue;
    g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.globalAlpha = a; g.fillStyle = q.col; g.fillRect(-q.s, -q.s * 0.45, q.s * 2, q.s * 0.9); g.restore();
  }
  fx.parts = fx.parts.filter((q) => q.age < q.life); fx.rings = fx.rings.filter((q) => q.a > 0);
}

/* ---------- Intro del juego (estilo Fórmula 1): ver 35-intro-scene.js ---------- */
let introTail = 0;
function startIntro() {
  state = "intro"; introT0 = performance.now(); introTail = 0;
  useTrack(LEVELS[0]); renderBackground(); IntroScene.reset();
  try { document.fonts.load("800 40px Montserrat"); document.fonts.load("600 14px Figtree"); } catch (e) {}
  Sound.whenRunning(() => Sound.splash((performance.now() - introT0) / 1000));
}
// El inicio aparece mientras el fondo de la intro se desvanece, y el logo viaja (sin cortes) desde donde quedó hasta su lugar en la página de inicio.
function finishIntro() {
  enterHome();
  introTail = performance.now();
  const tm = $("tt-mark"), full = IntroScene.rect(VW, VH), from = IntroScene.markRect(VW, VH);
  if (reduceMotion || !tm.src) return;
  tm.classList.add("fly-hide", "noanim");   // la R de la página queda quieta y oculta; el viajero la alcanza y la reemplaza
  // la palabra y la frase se desvanecen donde estaban; solo la R (el monograma) viaja al inicio
  const word = document.createElement("img"); word.className = "intro-fly"; word.alt = ""; word.src = IntroScene.wordURL(Math.round(full.w * DPR));
  Object.assign(word.style, { left: full.x + "px", top: full.y + "px", width: full.w + "px" }); document.body.appendChild(word);
  if (word.animate) word.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(26px)" }], { duration: 650, easing: "cubic-bezier(.4,0,.8,.4)", fill: "forwards" }).onfinish = () => word.remove(); else setTimeout(() => word.remove(), 650);
  const fly = document.createElement("img"); fly.className = "intro-fly flyR"; fly.src = tm.src; fly.alt = "";
  Object.assign(fly.style, { left: from.x + "px", top: from.y + "px", width: from.w + "px" }); document.body.appendChild(fly);
  // el vuelo sigue la posición REAL de la R del inicio en cada cuadro (así llega exacta aunque el diseño se asiente: sin saltos ni reacomodos)
  const t0 = performance.now(), D = 1150, glow = "rgba(253,28,34,.28)", ez = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const step = (now) => {
    const q = clamp((now - t0) / D, 0, 1), e = ez(q), to = tm.getBoundingClientRect();
    fly.style.left = from.x + (to.left - from.x) * e + "px"; fly.style.top = from.y + (to.top - from.y) * e + "px"; fly.style.width = from.w + (to.width - from.w) * e + "px";
    fly.style.filter = `drop-shadow(0 ${18 * e}px ${15 + 21 * e}px ${glow})`;
    if (q < 1) requestAnimationFrame(step); else { tm.classList.remove("fly-hide"); fly.remove(); }
  };
  requestAnimationFrame(step);
}

/* ---------- Bucle principal ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - (lastNow || now)) / 1000, 0, 0.05); lastNow = now;
  const g = ctx;
  Sound.music(state === "home" || state === "draw" || (state === "result" && now - resultAt > 2200)); // a media carrera no suena
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!bg) { g.fillStyle = pal().ground; g.fillRect(0, 0, cv.width, cv.height); return; }
  g.drawImage(bg, 0, 0);
  setWorld(g);
  if (state !== "intro") Scenery.anim(g, now / 1000);

  if (state === "intro") {
    const t = window.__introAt != null ? window.__introAt : (performance.now() - introT0) / 1000; // (__introAt: solo para pruebas)
    IntroScene.draw(g, t, VW, VH, DPR);
    if (t >= IntroScene.DURATION - IntroScene.FADE) finishIntro();
  } else if (state === "home") {
    for (const c of homeCars) {
      c.s += speedAt(c.line, c.s) * 0.62 * dt;
      const p = poseAt(c.line, c.s);
      drawCar(g, p.x, p.y, Math.atan2(p.ty, p.tx), c.color, false, false);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = resolvedTheme() === "dark" ? "rgba(14,14,15,.5)" : "rgba(242,242,240,.55)";
    g.fillRect(0, 0, cv.width, cv.height);
    if (introTail) { const tt = IntroScene.DURATION - IntroScene.FADE + (performance.now() - introTail) / 1000; if (tt < IntroScene.DURATION) IntroScene.draw(g, tt, VW, VH, DPR, true); else introTail = 0; }
  } else if (state === "draw") {
    drawChevrons(g, 0.28);
    if (demo) drawDemo(g, now);
    const s = TR.C[0], k = reduceMotion ? 0 : (Math.sin(now / 500) + 1) / 2;
    g.strokeStyle = `rgba(253,28,34,${0.55 + 0.35 * k})`; g.lineWidth = 2.4; g.beginPath(); g.arc(s[0], s[1], 20 + 4 * k, 0, 6.3); g.stroke();
    if (myLine) drawLinePath(g, myLine, 0, myLine.n, 5, "#FD1C22", true);
    else if (strokes.length) {
      const pts = allPts();
      if (pts.length > 1) { const sm = gaussOpen(resampleOpen(pts, 5), PLAYER_SMOOTH); g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "rgba(253,28,34,.95)"; g.lineWidth = 5; g.shadowColor = "rgba(253,28,34,.55)"; g.shadowBlur = 8; g.beginPath(); sm.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.restore(); }
      const e = pts[pts.length - 1];
      if (!drawing) { const k2 = reduceMotion ? 0.5 : (Math.sin(now / 380) + 1) / 2; g.fillStyle = `rgba(253,28,34,${0.22 + 0.2 * k2})`; g.beginPath(); g.arc(e[0], e[1], 15 + 6 * k2, 0, 6.3); g.fill(); g.fillStyle = "#fff"; g.strokeStyle = "rgba(217,137,58,.95)"; g.lineWidth = 2; g.beginPath(); g.arc(e[0], e[1], 6, 0, 6.3); g.fill(); g.stroke(); }
    }
    // la parrilla de salida
    const cars = [COLORS.r1, COLORS.r2, COLORS.player, COLORS.r3];
    cars.forEach((col, i) => {
      const sIdx = ((Math.round(-(10 + i * 40) / TR.ds) % TR.N) + TR.N) % TR.N, p = TR.C[sIdx], t = TR.T[sIdx], n = TR.Nm[sIdx], off = i % 2 ? 9 : -9;
      drawCar(g, p[0] + n[0] * off, p[1] + n[1] * off, Math.atan2(t[1], t[0]), col, false, i === 2);
    });
  } else if (race) {
    if (race.victory) { Victory.frame(g, dt); Victory.drawTail(g, dt); return; }
    race.t += dt;
    if (race.t < 0) {
      if (race.cd < 5 && race.t >= race.t0 + 0.35 + race.cd) { lightOn(race.cd); race.cd++; }
    } else if (state === "countdown") { state = "race"; lightsOut(); race.cd = 6; }
    drawRace(g, race);
    drawFx(g, dt);
    if (race.place === 1 && state === "race" && !reduceMotion && race.t >= race.sim[2].fin - Victory.LEAD && race.t < race.sim[2].fin) { // ganaste: toma de victoria desde muy cerca
      const cp = carPose(race.cars[2], 2, race); Victory.start(race, [OX + cp.pose.x * SC, OY + cp.pose.y * SC]); return;
    }
    Victory.drawTail(g, dt);
    if (fx.loss && race.finHaptic) { fx.dim = Math.min(1, fx.dim + dt / 1.1); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(24,18,12,${0.26 * fx.dim * fx.dim * (3 - 2 * fx.dim)})`; g.fillRect(0, 0, cv.width, cv.height); }
  }
}

/* ---------- Botones del juego ---------- */
ui.clear.onclick = clearLine;
ui.undo.onclick = undoLine;
ui.go.onclick = startRace;
$("rAgain").onclick = startRace;
$("rRedraw").onclick = redraw;
$("rMenu").onclick = () => leaveLevel();
$("rHome").onclick = () => leaveLevel("title");
$("rNext").onclick = () => { const n = LEVELS.find((l) => l.id === cur.id + 1); if (n) enterLevel(n); };
$("g-back").onclick = () => leaveLevel();
themeHooks.push(() => { if (TR) renderBackground(); });
addEventListener("resize", () => { layout(); });
// ni zoom ni selección de texto en ningún lado (pellizco, doble toque, mantener presionado)
["gesturestart", "gesturechange", "gestureend", "selectstart", "contextmenu", "dblclick", "dragstart"].forEach((ev) => addEventListener(ev, (e) => { if (e.target && e.target.tagName === "INPUT") return; e.preventDefault(); }, { passive: false }));   // (los campos de texto sí se pueden editar)
addEventListener("touchmove", (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0; addEventListener("touchend", (e) => { const n = Date.now(); if (n - lastTouchEnd < 320) e.preventDefault(); lastTouchEnd = n; }, { passive: false });
document.addEventListener("dblclick", (e) => e.preventDefault());
