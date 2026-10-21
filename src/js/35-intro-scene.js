"use strict";
/* intro-scene.js: la intro del juego con el logo RACELINE nuevo (LOGO3, ver 05-logo3.js: la R, la palabra y "BY BLUBER GAMES"; sin el recuadro del ícono,
   que es solo para el favicon y el ícono de la app), sobre negro.
   Se forma así: la franja roja baja trazándose, la R se descubre con un barrido inclinado, los cuadros de meta se "estampan" en su pie, RACE entra
   letra por letra desde la izquierda y LINE desde la derecha (con estela de velocidad), aparece la frase y un destello cruza el logo.
   4.4 s; el logo viaja hasta la página de inicio (ver finishIntro en 40-game.js). */

const IntroScene = (() => {
  const DURATION = 4.4, FADE = 0.55;
  const ease = (x) => x * x * (3 - 2 * x), eoq = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 4), eoc = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3), eoe = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(x, 0, 1))), eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  let P = null, fired = {}, mk = null;
  const boxOf = (d) => { const n = d.match(/-?\d+\.?\d*/g).map(Number); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); } return [x0, y0, x1, y1]; };

  function init() {
    if (P) return;
    const L = LOGO3, mp = (l) => Object.assign({ p: new Path2D(l.d) }, l);
    P = { r: { p: new Path2D(L.r), box: boxOf(L.r) }, acc: { p: new Path2D(L.acc), box: boxOf(L.acc) }, race: L.race.map(mp), line: L.line.map(mp), tag: { p: new Path2D(L.tag.d), box: L.tag.box },
      chk: L.chk.split("Z").filter((s) => s.trim()).map((s) => { const d = s + "Z", b = boxOf(d); return { p: new Path2D(d), box: b, cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2 }; }) };
    P.chk.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
    const a = P.acc.box, b = P.r.box, pd = 6; P.mbox = [Math.min(a[0], b[0]) - pd, Math.min(a[1], b[1]) - pd, Math.max(a[2], b[2]) + pd, Math.max(a[3], b[3]) + pd];   // la R sola (monograma)
  }
  function reset() { fired = {}; init(); }
  function events(t) { // vibración sutil, sincronizada con la animación
    const once = (k, at, fn) => { if (t >= at && !fired[k]) { fired[k] = 1; fn(); } };
    once("a", 0.3, () => Haptics.soft()); once("b", 0.75, () => Haptics.medium()); once("c", 1.2, () => Haptics.soft());
    once("d", 1.55, () => Haptics.soft()); once("e", 2.55, () => Haptics.soft());
  }

  // el logo completo en su propio lienzo transparente (para poder pasarle el destello solo por encima de las formas)
  function compose(t, M, dark, only) {   // only: "mark" = solo la R (recortada), "word" = todo menos la R (mismo lienzo que el logo completo)
    const [vx, vy, vw, vh] = only === "mark" ? P.mbox.map((v, i, a) => (i < 2 ? v : a[i] - a[i - 2])) : LOGO3.vb, k = M / vw, mkC = () => { const e = document.createElement("canvas"); e.width = M; e.height = Math.ceil(vh * k) + 2; return e; };
    const c = only ? mkC() : (mk && mk.width === M ? mk : (mk = mkC())), g = c.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(k, 0, 0, k, -vx * k, -vy * k);
    const raceCol = dark ? ["#FFFFFF", "#D4D6DC"] : ["#1A1A1C", "#000000"], lineCol = ["#FF3F44", "#E1161C"], rCol = dark ? ["#FFFFFF", "#DADCE2"] : ["#1A1A1C", "#000000"];
    const fillOf = (b, cols) => { const gr = g.createLinearGradient(0, b[1], 0, b[3]); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); return gr; };
    const A = P.acc, R = P.r, rh = R.box[3] - R.box[1], rw = R.box[2] - R.box[0], skew = rh * 0.2;
    if (only !== "word") {
    // la franja roja se traza de arriba hacia abajo
    { const p = eoc(seg(t, 0.15, 0.7)); if (p > 0) { g.save(); g.beginPath(); g.rect(A.box[0] - 4, A.box[1] - 4, A.box[2] - A.box[0] + 8, (A.box[3] - A.box[1] + 8) * p); g.clip(); g.fillStyle = fillOf(A.box, lineCol); g.fill(A.p); g.restore(); } }
    // la R se descubre con un barrido inclinado de izquierda a derecha
    { const p = eio(seg(t, 0.45, 1.2)); if (p > 0) { const xr = R.box[0] - skew + p * (rw + 3 * skew); g.save(); g.beginPath(); g.moveTo(R.box[0] - skew * 2, R.box[1] - 2); g.lineTo(xr + skew, R.box[1] - 2); g.lineTo(xr - skew, R.box[3] + 2); g.lineTo(R.box[0] - skew * 2, R.box[3] + 2); g.closePath(); g.clip();
      g.translate((1 - p) * -10, 0); g.fillStyle = fillOf(R.box, rCol); g.fill(R.p, "evenodd"); g.restore(); } }
    // los cuadros de meta se estampan en el pie de la R (son huecos transparentes)
    P.chk.forEach((q, i) => { const u = seg(t, 1.15 + i * 0.1, 1.15 + i * 0.1 + 0.28); if (u <= 0) return; const s = 1 + (1 - eoc(u)) * 1.1; g.save(); g.globalCompositeOperation = "destination-out"; g.translate(q.cx, q.cy); g.scale(s, s); g.translate(-q.cx, -q.cy); g.globalAlpha = Math.min(1, u * 2.4); g.fill(q.p); g.restore(); });
    }
    if (only === "mark") return c;
    // RACE entra desde la izquierda y LINE desde la derecha, con estela
    const slide = (list, from, t0, step, sgn, cols) => list.forEach((l, i) => {
      const u = seg(t, t0 + i * step, t0 + i * step + 0.78), p = eoe(u); if (u <= 0) return;
      const off = (1 - p) * from * sgn, a = clamp(u * 3.2, 0, 1);
      for (let j = 4; j >= 1; j--) { const tr = (1 - p) * 52 * j * -sgn; if (Math.abs(tr) < 2) continue; g.save(); g.globalAlpha = a * 0.14 * (1 - j / 5); g.translate(off + tr, 0); g.fillStyle = cols[0]; g.fill(l.p, "evenodd"); g.restore(); }
      g.save(); g.globalAlpha = a; g.translate(off, 0); g.fillStyle = fillOf([0, l.box[1], 0, l.box[3]], cols); g.fill(l.p, "evenodd"); g.restore();
    });
    slide(P.race, 380, 0.95, 0.09, -1, raceCol);
    slide(P.line, 380, 1.25, 0.085, 1, lineCol);
    // "BY BLUBER GAMES": se abre desde el centro
    { const p = eoq(seg(t, 1.95, 2.65)); if (p > 0) { const b = P.tag.box, cx = (b[0] + b[2]) / 2; g.save(); g.beginPath(); g.rect(cx - (b[2] - b[0]) * 0.5 * p - 2, b[1] - 3, (b[2] - b[0]) * p + 4, b[3] - b[1] + 6); g.clip(); g.globalAlpha = p; g.fillStyle = dark ? "#C4C6CE" : "#2C2C2E"; g.fill(P.tag.p, "evenodd"); g.restore(); } }
    // destello que cruza el logo
    const gk = seg(t, 2.5, 3.3);
    if (gk > 0 && gk < 1) { const W2 = vw, x = vx - 160 + eio(gk) * (W2 + 320); g.save(); g.globalCompositeOperation = "source-atop"; g.translate(x, 0); g.transform(1, 0, -0.4, 1, 0, 0); const gr = g.createLinearGradient(-60, 0, 60, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(-60, vy - 40, 120, vh + 80); g.restore(); }
    return c;
  }

  function draw(g, t, w, h, dpr, noLogo) {
    init(); events(t);
    const fadeOut = t > DURATION - FADE ? 1 - ease(seg(t, DURATION - FADE, DURATION)) : 1, vw = LOGO3.vb[2], vh = LOGO3.vb[3];
    g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalAlpha = fadeOut;
    const cx = w / 2, cy = h * 0.42, LW = Math.min(w * 0.94, 520), LH = LW * vh / vw;
    const bgG = g.createRadialGradient(cx, cy, 10, cx, cy, Math.hypot(w, h) * 0.7); bgG.addColorStop(0, "#17171A"); bgG.addColorStop(1, "#050506"); g.fillStyle = bgG; g.fillRect(0, 0, w, h);
    // franjas de velocidad que cruzan al principio
    { const su = seg(t, 0.1, 1.5); if (su > 0 && su < 1) { g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 7; i++) { const y = cy - LH * 1.1 + (i / 6) * LH * 2.2 + (i % 2) * 7, x = -w * 0.3 + eoe(clamp(su * 1.25 - i * 0.04, 0, 1)) * w * 1.5, len = w * (0.2 + 0.07 * (i % 3)); const lg = g.createLinearGradient(x - len, 0, x, 0); lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(1, `rgba(255,${i % 2 ? 90 : 200},${i % 2 ? 90 : 200},${0.16 * (1 - su)})`); g.fillStyle = lg; g.fillRect(x - len, y, len, 1.4); } g.restore(); } }
    // resplandor rojo cuando el logo está completo
    { const gl = ease(seg(t, 2.0, 2.9)) * (1 - 0.3 * ease(seg(t, 3.4, 4.0))); if (gl > 0) { g.save(); g.globalCompositeOperation = "lighter"; const rg = g.createRadialGradient(cx, cy, LW * 0.08, cx, cy, LW * 0.7); rg.addColorStop(0, `rgba(253,28,34,${0.14 * gl})`); rg.addColorStop(1, "rgba(253,28,34,0)"); g.fillStyle = rg; g.fillRect(0, 0, w, h); g.restore(); } }
    // cámara: acercamiento lento y continuo
    const cam = 0.93 + 0.07 * eoq(seg(t, 0, 3.8));
    if (!noLogo) { const M = Math.round(LW * dpr), c = compose(t, M, true);
      g.save(); g.translate(cx, cy); g.scale(cam, cam); g.shadowColor = "rgba(253,28,34,.26)"; g.shadowBlur = 26; g.drawImage(c, -LW / 2, -LH / 2, LW, c.height / dpr); g.restore(); }
    const fi = ease(seg(t, 0, 0.3)); if (fi < 1) { g.globalAlpha = fadeOut; g.fillStyle = `rgba(0,0,0,${1 - fi})`; g.fillRect(0, 0, w, h); }
    g.restore();
  }

  // el logo completo como imagen (para la página de inicio): dark = RACE en blanco, si no en negro
  function logoURL(M, dark = true) { init(); const prev = mk; mk = null; const c = compose(10, M, dark); mk = prev; return c.toDataURL("image/png"); }
  function markURL(M, dark = true) { init(); return compose(10, M, dark, "mark").toDataURL("image/png"); }   // el monograma (R) solo, para la página de inicio
  function wordURL(M, dark = true) { init(); return compose(10, M, dark, "word").toDataURL("image/png"); }   // el logo menos la R (se desvanece mientras la R viaja al inicio)
  function markRect(w, h) { init(); const f = rect(w, h), vb = LOGO3.vb, s = f.w / vb[2], m = P.mbox; return { x: f.x + (m[0] - vb[0]) * s, y: f.y + (m[1] - vb[1]) * s, w: (m[2] - m[0]) * s }; }   // dónde queda la R dentro del logo completo
  function markAspect() { init(); const m = P.mbox; return (m[2] - m[0]) / (m[3] - m[1]); }   // proporción de la R sola (para reservar su lugar antes de que cargue la imagen)
  const rect = (w, h) => { const LW = Math.min(w * 0.94, 520), vh = LOGO3.vb[3], vw = LOGO3.vb[2]; return { x: w / 2 - LW / 2, y: h * 0.42 - (LW * vh / vw) / 2, w: LW }; };   // dónde queda el logo al final de la intro
  return { DURATION, FADE, draw, reset, logoURL, markURL, wordURL, rect, markRect, markAspect };
})();
