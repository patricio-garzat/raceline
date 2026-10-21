"use strict";
/* audio.js: todo el sonido es procedural (Web Audio), cálido y nunca agudo.
   - En cada acción solo un "thump" suave; las melodías (marimba de madera) se reservan para los premios.
   - Sesión de audio: "ambient" en la app (suena solo si el iPhone no está en silencio y no aparece en la Dynamic Island),
     "playback" en la web.
   - En el WebView el AudioContext puede quedar "zombi" tras una interrupción: se revisa en cada toque y, si hace falta, se crea otro. */

const Sound = (() => {
  let ac = null, master = null, noiseBuf = null, beepBuf = null, gen = 0, lastPerf = 0, lastTime = 0;
  const on = () => Settings.sound;
  const running = () => !!ac && ac.state === "running" && on();

  function sessionType() { try { if (navigator.audioSession) navigator.audioSession.type = isNative() ? "ambient" : "playback"; } catch (e) {} }

  // En la landing (blubergames.com) el juego va en un iframe: ahí se usa el AudioContext que la página de afuera ya dejó sonando (window.bluberAudio),
  // así suena desde que abre (Safari no deja sonar a un iframe hasta que lo tocan a él).
  function sharedAC() { try { const p = window.parent, s = p !== window && p.bluberAudio; return s && s.state !== "closed" ? s : null; } catch (e) { return null; } }
  function create(fresh) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { if (ac && ac !== sharedAC()) ac.close(); } catch (e) {}
    sessionType();
    ac = (!fresh && sharedAC()) || new AC({ latencyHint: "interactive" });
    gen++; mNode = null;
    ac.addEventListener("statechange", () => { if (ac && ac.state === "running") musicStart(); });
    master = ac.createGain(); master.gain.value = 0.9;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 24; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6000; lp.Q.value = 0.5;
    master.connect(comp); comp.connect(lp); lp.connect(ac.destination);
    const len = ac.sampleRate * 2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let b = 0; // ruido café: más grave y suave que el blanco
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = b * 3.2; }
    lastPerf = 0;
    beepBuf = null; // el pitido de las luces de salida (grabación de la F1), decodificado una vez por contexto
    try { const bin = atob(START_BEEP), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const mine = ac; ac.decodeAudioData(u.buffer, (b) => { if (ac === mine) beepBuf = b; }, () => {}); } catch (e) {}
  }
  function ensure() { if (!ac) create(); return ac; }

  // En cada toque: crea o despierta el audio; si quedó zombi (dice "running" pero el reloj no avanza), lo recrea
  function wake() {
    if (!on()) return;
    ensure(); if (!ac) return;
    sessionType();
    const p = performance.now();
    if (ac.state === "running" && lastPerf && p - lastPerf > 800 && ac.currentTime - lastTime < 0.02) { create(true); }
    if (ac.state !== "running") ac.resume().catch(() => {});
    lastPerf = p; lastTime = ac.currentTime;
  }
  setInterval(() => { if (ac && ac.state === "running") { lastPerf = performance.now(); lastTime = ac.currentTime; } }, 400);
  ["pointerdown", "touchend", "keydown"].forEach((ev) => addEventListener(ev, wake, { passive: true, capture: true }));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); else if (ac && ac.state === "running") ac.suspend().catch(() => {}); });
  sessionType();   // la web también pide la sesión "playback" desde que abre (suena aunque el iPhone esté en silencio)
  if (isNative() || sharedAC()) setTimeout(wake, 0); // en la app (y dentro de la landing) suena desde que abre

  function whenRunning(cb) {
    ensure();
    if (!ac) return;
    if (ac.state === "running") { cb(); return; }
    const h = () => { if (ac && ac.state === "running") { ac.removeEventListener("statechange", h); cb(); } };
    ac.addEventListener("statechange", h);
    ac.resume().catch(() => {});
  }

  /* ---------- Piezas ---------- */
  function env(g, t, peak, a, d) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0002, t + a + d);
  }
  // "thump" suave: seno grave que baja + un soplido de ruido café
  function thump(vol = 0.5, f0 = 150, t = null) {
    if (!running()) return;
    t = t == null ? ac.currentTime : t;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.14);
    env(g, t, vol, 0.006, 0.16);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
    const n = ac.createBufferSource(); n.buffer = noiseBuf;
    const ng = ac.createGain(), nf = ac.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.value = 900;
    env(ng, t, vol * 0.5, 0.004, 0.05);
    n.connect(nf); nf.connect(ng); ng.connect(master); n.start(t, Math.random()); n.stop(t + 0.12);
  }
  // marimba de madera: fundamental + parcial a 4× que se apaga rápido
  function marimba(freq, t = null, vol = 0.22, dur = 1.2) {
    if (!running()) return;
    t = t == null ? ac.currentTime : t;
    const mk = (f, v, d) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = f; env(g, t, v, 0.004, d);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.1);
    };
    mk(freq, vol, dur); mk(freq * 4, vol * 0.3, 0.14); mk(freq * 2, vol * 0.18, 0.4);
  }
  // un solo "arranque" suave de motor (para la intro de BluBer)
  function revSwell(t, vol = 0.05, dur = 1.1) {
    if (!running()) return;
    const mkO = (type, f0, f1) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.55); o.frequency.exponentialRampToValueAtTime(f0 * 1.05, t + dur); return o; };
    const a = mkO("sawtooth", 92, 168), b = mkO("triangle", 46, 84);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 2;
    lp.frequency.setValueAtTime(260, t); lp.frequency.exponentialRampToValueAtTime(720, t + dur * 0.5); lp.frequency.exponentialRampToValueAtTime(300, t + dur);
    const g = ac.createGain(); env(g, t, vol, dur * 0.4, dur * 0.6);
    a.connect(lp); b.connect(lp); lp.connect(g); g.connect(master);
    a.start(t); b.start(t); a.stop(t + dur + 0.1); b.stop(t + dur + 0.1);
  }

  /* ---------- Lápiz: ruido filtrado mientras se dibuja ---------- */
  let pen = null;
  function penStart() {
    if (!running() || pen) return;
    const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.7;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600;
    const g = ac.createGain(); g.gain.value = 0;
    n.connect(bp); bp.connect(lp); lp.connect(g); g.connect(master); n.start(0, Math.random());
    pen = { n, g, bp, gen };
  }
  function penMove(speed) { // speed: 0..1
    if (!pen || pen.gen !== gen) return;
    const t = ac.currentTime;
    pen.g.gain.setTargetAtTime(0.35 * clamp(speed, 0, 1), t, 0.05);
    pen.bp.frequency.setTargetAtTime(1100 + 1400 * clamp(speed, 0, 1), t, 0.05);
  }
  function penEnd() {
    if (!pen) return;
    const p = pen; pen = null;
    if (p.gen !== gen) return;
    p.g.gain.setTargetAtTime(0, ac.currentTime, 0.05);
    try { p.n.stop(ac.currentTime + 0.4); } catch (e) {}
  }

  /* ---------- Motores de la carrera: un motor por carro, con cambios de marcha, el mezclado depende de la cercanía ---------- */
  let engines = null;
  function enginesStart(n, playerIdx) {
    enginesStop();
    if (!running()) return;
    const noise = (freq, q, type = "bandpass") => { const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const bp = ac.createBiquadFilter(); bp.type = type; bp.frequency.value = freq; bp.Q.value = q; const g = ac.createGain(); g.gain.value = 0; src.connect(bp); bp.connect(g); g.connect(master); src.start(0, Math.random()); return { src, bp, g }; };
    const road = noise(420, 0.5, "lowpass"), squeal = noise(950, 1.1);
    const list = [];
    for (let i = 0; i < n; i++) {
      // motor suave: dos dientes de sierra ligeramente desafinados (cuerpo), un sub grave y un soplo de admisión, todo por un pasabajos
      const a = ac.createOscillator(), b = ac.createOscillator(), sub = ac.createOscillator(), lfo = ac.createOscillator(), lfoG = ac.createGain();
      a.type = "sawtooth"; b.type = "sawtooth"; sub.type = "triangle"; lfo.type = "sine";
      const base = 0.95 + (i % 4) * 0.035 + Math.random() * 0.02; // cada carro con su propio tono
      lfo.frequency.value = 0.35 + Math.random() * 0.4; lfo.connect(lfoG); lfoG.connect(a.detune); lfoG.connect(b.detune); lfoG.gain.value = 9; // vibrato mínimo (en cents)
      const gb = ac.createGain(), gs = ac.createGain(); gb.gain.value = 0.7; gs.gain.value = 0.55;
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380; lp.Q.value = 0.7;
      const lp2 = ac.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 900; lp2.Q.value = 0.4;
      const g = ac.createGain(); g.gain.value = 0;
      const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
      a.connect(lp); b.connect(gb); gb.connect(lp); sub.connect(gs); gs.connect(lp); lp.connect(lp2); lp2.connect(g);
      if (pan) { g.connect(pan); pan.connect(master); } else g.connect(master);
      a.start(); b.start(); sub.start(); lfo.start();
      list.push({ a, b, sub, lfo, g, pan, lp, base, sm: 0, player: i === playerIdx });
    }
    engines = { list, road, squeal, gen };
  }
  function enginesUpdate(i, speed01, pan, level = 1) {
    if (!engines || engines.gen !== gen) return;
    const e = engines.list[i], t = ac.currentTime;
    e.sm += (speed01 - e.sm) * 0.04; // velocidad promediada: la diferencia dice si acelera o levanta el pie
    const thr = clamp(0.62 + (speed01 - e.sm) * 5, 0.3, 1);
    const f = (70 + 62 * Math.pow(speed01, 0.85)) * e.base; // sube y baja con calma, sin saltos de marcha
    e.a.frequency.setTargetAtTime(f, t, 0.28); e.b.frequency.setTargetAtTime(f * 1.006, t, 0.28); e.sub.frequency.setTargetAtTime(f * 0.5, t, 0.28);
    e.lp.frequency.setTargetAtTime((230 + 380 * speed01) * (0.7 + 0.3 * thr) * (0.55 + 0.45 * Math.min(1, level * 1.4)), t, 0.2); // a lo lejos suena más apagado
    e.g.gain.setTargetAtTime((e.player ? 0.05 : 0.02) * level * (0.5 + 0.5 * speed01) * (0.55 + 0.45 * thr), t, 0.18);
    if (e.pan) e.pan.pan.setTargetAtTime(clamp(pan, -0.85, 0.85), t, 0.15);
  }
  function enginesRoad(speed01) { if (engines && engines.gen === gen) engines.road.g.gain.setTargetAtTime(0.035 * speed01 * speed01, ac.currentTime, 0.3); }
  function enginesSqueal(x) { if (engines && engines.gen === gen) { const t = ac.currentTime; engines.squeal.g.gain.setTargetAtTime(0.012 * clamp(x, 0, 1), t, 0.12); engines.squeal.bp.frequency.setTargetAtTime(850 + 250 * x, t, 0.15); } }
  function enginesStop() {
    if (!engines) return;
    const e = engines; engines = null;
    if (e.gen !== gen) return;
    const t = ac.currentTime;
    e.list.forEach((x) => { x.g.gain.setTargetAtTime(0, t, 0.3); [x.a, x.b, x.sub, x.lfo].forEach((o) => o.stop(t + 1.5)); });
    [e.road, e.squeal].forEach((n) => { n.g.gain.setTargetAtTime(0, t, 0.2); try { n.src.stop(t + 1.2); } catch (er) {} });
  }
  // boost: un empujón suave, el motor sube y se oye aire
  function boost() { if (!running()) return; const t = ac.currentTime; whoosh(0.06, 380, 2200, 0.8); revSwell(t, 0.03, 1.6); thump(0.16, 110, t); }
  // un soplido suave (para pasar de pantalla)
  function whoosh(vol = 0.1, f0 = 380, f1 = 1500, dur = 0.22, at0 = null) {
    if (!running()) return;
    const t = at0 == null ? ac.currentTime : at0, n = ac.createBufferSource(); n.buffer = noiseBuf;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.8; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); env(g, t, vol, dur * 0.35, dur * 0.65);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t, Math.random()); n.stop(t + dur + 0.1);
  }

  /* ---------- Sonidos de carreras, suaves (ASMR): paso de un motor, aplausos lejanos, tics del motor al enfriarse ---------- */
  function panNode(p0, p1, t, dur) {
    if (!ac.createStereoPanner) return null;
    const pn = ac.createStereoPanner(); pn.pan.setValueAtTime(p0, t); pn.pan.linearRampToValueAtTime(p1, t + dur); return pn;
  }
  // un monoplaza que pasa de largo: el tono sube al acercarse y baja al alejarse (efecto Doppler), con soplido de aire
  function flyby(t, vol = 0.1, p0 = -0.7, p1 = 0.7, dur = 1.5) {
    if (!running()) return;
    const mid = t + dur * 0.46, a = ac.createOscillator(), b = ac.createOscillator();
    a.type = "sawtooth"; b.type = "triangle";
    a.frequency.setValueAtTime(118, t); a.frequency.exponentialRampToValueAtTime(205, mid); a.frequency.exponentialRampToValueAtTime(96, t + dur);
    b.frequency.setValueAtTime(59, t); b.frequency.exponentialRampToValueAtTime(102, mid); b.frequency.exponentialRampToValueAtTime(48, t + dur);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 1.2; lp.frequency.setValueAtTime(260, t); lp.frequency.exponentialRampToValueAtTime(820, mid); lp.frequency.exponentialRampToValueAtTime(240, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, mid - dur * 0.04); g.gain.exponentialRampToValueAtTime(0.0002, t + dur);
    const pn = panNode(p0, p1, t, dur);
    a.connect(lp); b.connect(lp); lp.connect(g); if (pn) { g.connect(pn); pn.connect(master); } else g.connect(master);
    a.start(t); b.start(t); a.stop(t + dur + 0.1); b.stop(t + dur + 0.1);
    const n = ac.createBufferSource(); n.buffer = noiseBuf;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.7; bp.frequency.setValueAtTime(380, t); bp.frequency.exponentialRampToValueAtTime(1500, mid); bp.frequency.exponentialRampToValueAtTime(420, t + dur);
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(vol * 0.55, mid); ng.gain.exponentialRampToValueAtTime(0.0002, t + dur);
    const pn2 = panNode(p0, p1, t, dur);
    n.connect(bp); bp.connect(ng); if (pn2) { ng.connect(pn2); pn2.connect(master); } else ng.connect(master);
    n.start(t, Math.random()); n.stop(t + dur + 0.1);
  }
  // aplausos lejanos y cálidos: muchas palmadas cortas de ruido filtrado en momentos al azar, con un crescendo y un final suave
  function applause(t, dur, count, vol) {
    if (!running()) return;
    for (let i = 0; i < count; i++) {
      const x = Math.random(), tt = t + dur * (x < 0.5 ? Math.pow(x * 2, 1.7) * 0.5 : 0.5 + (1 - Math.pow((1 - x) * 2, 1.4)) * 0.5), env = Math.sin(Math.PI * clamp((tt - t) / dur, 0, 1)); // más densas al centro
      const n = ac.createBufferSource(); n.buffer = noiseBuf;
      const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1300 + Math.random() * 1700; bp.Q.value = 0.9;
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3600;
      const g = ac.createGain(), d = 0.012 + Math.random() * 0.02, pk = vol * (0.25 + 0.75 * env) * (0.4 + Math.random() * 0.6);
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(Math.max(0.0003, pk), tt + 0.003); g.gain.exponentialRampToValueAtTime(0.0002, tt + d + 0.03);
      const pn = ac.createStereoPanner ? ac.createStereoPanner() : null; if (pn) pn.pan.value = Math.random() * 1.6 - 0.8;
      n.connect(bp); bp.connect(lp); lp.connect(g); if (pn) { g.connect(pn); pn.connect(master); } else g.connect(master);
      n.start(tt, Math.random() * 1.5); n.stop(tt + d + 0.06);
    }
  }
  // tics del motor al enfriarse: clics metálicos suaves y cada vez más espaciados
  function ticks(t, n = 7, vol = 0.07) {
    if (!running()) return;
    let tt = t;
    for (let i = 0; i < n; i++) {
      const src = ac.createBufferSource(); src.buffer = noiseBuf;
      const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2300 + Math.random() * 1200; bp.Q.value = 9;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(vol * (1 - i / (n + 2)), tt + 0.002); g.gain.exponentialRampToValueAtTime(0.0002, tt + 0.05);
      const pn = ac.createStereoPanner ? ac.createStereoPanner() : null; if (pn) pn.pan.value = Math.random() * 0.6 - 0.3;
      src.connect(bp); bp.connect(g); if (pn) { g.connect(pn); pn.connect(master); } else g.connect(master);
      src.start(tt, Math.random() * 1.5); src.stop(tt + 0.09);
      tt += 0.16 + i * 0.07 + Math.random() * 0.06;
    }
  }
  // arrancada: el motor sube de vueltas con un soplido de llantas
  function launch(t, vol = 0.07) {
    if (!running()) return;
    const a = ac.createOscillator(), b = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
    a.type = "sawtooth"; b.type = "triangle"; lp.type = "lowpass"; lp.Q.value = 1.5;
    a.frequency.setValueAtTime(90, t); a.frequency.exponentialRampToValueAtTime(230, t + 0.7); b.frequency.setValueAtTime(45, t); b.frequency.exponentialRampToValueAtTime(115, t + 0.7);
    lp.frequency.setValueAtTime(260, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.18); g.gain.exponentialRampToValueAtTime(0.0002, t + 0.9);
    a.connect(lp); b.connect(lp); lp.connect(g); g.connect(master); a.start(t); b.start(t); a.stop(t + 1); b.stop(t + 1);
    whoosh(vol * 0.9, 500, 1700, 0.5);
  }
  // clic suave de un seguro / matraca (para las estrellas)
  function clack(t, f = 520, vol = 0.14) {
    if (!running()) return;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0002, t + 0.07);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1);
    const n = ac.createBufferSource(); n.buffer = noiseBuf; const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1700; bp.Q.value = 2; const ng = ac.createGain();
    ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(vol * 0.5, t + 0.002); ng.gain.exponentialRampToValueAtTime(0.0002, t + 0.03);
    n.connect(bp); bp.connect(ng); ng.connect(master); n.start(t, Math.random()); n.stop(t + 0.06);
  }

  /* ---------- Música de fondo (audio/music.mp3): suena en el inicio, al dibujar y en el resultado; se apaga a media carrera ---------- */
  let mBuf = null, mLoading = false, mNode = null, mWant = false, mRms = 0.1, mPos = 0, mStartAt = 0, mOff = 0;   // mPos: dónde se quedó la canción
  const musicOn = () => Settings.sound && Settings.music !== false;
  const MUSIC_RMS = 0.013;                      // volumen de fondo (≈ -37 dBFS): apenas se nota, no estorba
  function musicLoad(cb) {
    if (mBuf) { cb(); return; }
    if (mLoading) return;
    mLoading = true;
    fetch("audio/music.mp3").then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => ac.decodeAudioData(ab, res, rej)))
      .then((b) => { mBuf = b; const d = b.getChannelData(0); let sum = 0, n = 0; for (let i = 0; i < d.length; i += 7) { sum += d[i] * d[i]; n++; } mRms = Math.sqrt(sum / n) || 0.1; mLoading = false; cb(); })
      .catch(() => { mLoading = false; });
  }
  function musicStart() {
    if (!mWant || !running() || !musicOn()) return;
    const goal = clamp(MUSIC_RMS / mRms, 0.04, 1.4);
    if (mNode && mNode.gen === gen) { mNode.g.gain.setTargetAtTime(goal, ac.currentTime, 1.1); return; }
    musicLoad(() => {
      if (!mWant || !running() || !musicOn() || (mNode && mNode.gen === gen)) return;
      const src = ac.createBufferSource(); src.buffer = mBuf; src.loop = true;
      const g = ac.createGain(); g.gain.value = 0;
      const off = mPos % mBuf.duration;                   // sigue donde se quedó (no empieza desde el inicio)
      src.connect(g); g.connect(ac.destination); src.start(0, off);
      mStartAt = ac.currentTime; mOff = off; mNode = { src, g, gen };
      g.gain.setTargetAtTime(clamp(MUSIC_RMS / mRms, 0.04, 1.4), ac.currentTime, 1.1);   // entra poco a poco
    });
  }
  function musicStop() {
    if (!mNode) return;
    const n = mNode; mNode = null;
    if (n.gen !== gen) return;
    if (mBuf) mPos = (mOff + (ac.currentTime - mStartAt)) % mBuf.duration;
    n.g.gain.setTargetAtTime(0, ac.currentTime, 0.28);                                 // sale rápido
    try { n.src.stop(ac.currentTime + 1.6); } catch (e) {}
  }

  /* ---------- Escenas ---------- */
  const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99 };
  function at(from, time, fn) { // agenda algo que debe sonar en "time" s de la animación, sabiendo que ya van "from" s
    const d = time - from;
    if (d < -0.05) return;
    fn(ac.currentTime + Math.max(0.02, d));
  }
  return {
    wake, whenRunning,
    get ready() { return running(); },
    get ctx() { return ac; },
    music(on) { if (on === mWant) return; mWant = on; if (on) musicStart(); else musicStop(); },
    musicInfo() { return { want: mWant, loaded: !!mBuf, playing: !!mNode, rms: mRms, gain: mNode ? mNode.g.gain.value : 0, pos: mPos }; },
    musicSync() { if (musicOn() && mWant) musicStart(); else musicStop(); },
    tap() { thump(0.34, 170); },
    soft() { thump(0.2, 190); },
    thump, flyby, applause, ticks, launch, boost,
    penStart, penMove, penEnd,
    lineOk() { thump(0.3, 140); },
    count(step) { thump(0.4, 120 + step * 28); },
    go() { launch(ac ? ac.currentTime + 0.02 : 0, 0.07); },
    finish(stars) { // paso de un monoplaza, aplausos lejanos (más o menos según las estrellas) y los tics del motor al enfriarse
      if (!running()) return;
      const t = ac.currentTime + 0.05;
      thump(0.36, 120, t); flyby(t + 0.04, 0.1);
      if (stars > 0) { applause(t + 0.5, 2.6 + stars * 0.5, 36 * stars + 18, 0.075); ticks(t + 2.4, 6, 0.06); }
      else { whoosh(0.05, 700, 200, 0.9); ticks(t + 1.6, 4, 0.05); }
    },
    star(i) { if (running()) clack(ac.currentTime + 0.02, 480 + i * 70, 0.15); },
    enginesStart, enginesUpdate, enginesRoad, enginesSqueal, enginesStop, whoosh,
    light(i) { // pitido de las luces de salida, igual al de la Fórmula 1 (si no se pudo decodificar, un thump suave)
      if (!running()) return;
      if (!beepBuf) { thump(0.4, 100 + i * 17); return; }
      const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = beepBuf; g.gain.value = 0.28; s.connect(g); g.connect(master); s.start();
    },
    nav() { whoosh(0.09, 320, 1300, 0.24); },
    lap() { thump(0.18, 150); whoosh(0.05, 500, 1000, 0.3); },
    // Intro de BluBer: dos sonidos del propio juego (motor suave y un monoplaza que pasa), en sincronía con la animación
    studio(from = 0) {
      if (!running()) return;
      at(from, 1.15, (t) => revSwell(t, 0.045, 1.2));
      at(from, 2.7, (t) => { thump(0.26, 140, t); flyby(t + 0.02, 0.07, -0.5, 0.5, 1.3); });
    },
    // Intro del juego (ver 35-intro-scene.js): el logo se forma. Soplidos suaves cuando barren los pianos y la cinta, un monoplaza lejano que pasa,
    // un motor que sube y un "thump" cuando el carro se acomoda; todo muy bajito.
    splash(from = 0) {
      if (!running()) return;
      at(from, 0.25, (t) => thump(0.18, 125, t));
      at(from, 0.35, (t) => whoosh(0.03, 300, 1200, 0.8, t));
      at(from, 0.9, (t) => whoosh(0.035, 500, 1600, 0.7, t));
      at(from, 1.4, (t) => revSwell(t, 0.03, 1.5));
      at(from, 1.55, (t) => flyby(t, 0.05, -0.4, 0.4, 1.0));
      at(from, 2.1, (t) => whoosh(0.035, 450, 1500, 0.8, t));
      at(from, 2.4, (t) => thump(0.24, 100, t));
      at(from, 2.95, (t) => whoosh(0.03, 800, 3000, 0.55, t));
    },
  };
})();
