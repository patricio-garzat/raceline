"use strict";
/* garage.js: el taller. El carro se ve en vertical (nariz hacia arriba) y grande, sin que la pantalla se mueva mientras se edita.
   Pestañas: Diseños, Colores, Franjas, Número (se mueve con el dedo desde donde está y se agranda o encoge con pellizco)
   y Pintar (pincel, línea, borrador, espejo, opacidad, deshacer y rehacer). Todo se guarda en Save.car. */

const Garage = (() => {
  const stage = $("g-car"), box = $("g-stage"), panel = $("g-panel"), tabBtns = [...document.querySelectorAll("#g-tabs button")];
  const sctx = stage.getContext("2d");
  const mkc = () => { const c = document.createElement("canvas"); c.width = PAINT_W; c.height = PAINT_H; return c; };
  const pad = mkc(), layer = mkc(), base = mkc(), tmp = mkc();       // pad = lo que se ve; layer = base + trazos ya hechos; tmp = trazo en curso
  const pctx = pad.getContext("2d"), lctx = layer.getContext("2d"), bctx = base.getContext("2d"), tctx = tmp.getContext("2d");
  let tab = "presets", part = "body", dsg = playerDesign(), strokes = [], redo = [], hasInk = false, baseInk = false, cur = null, raf = 0, geom = { ppu: 10, cx: 0, cy: 0, dpr: 1 };
  const ptrs = new Map(); let numDrag = null, pinch = null;
  const brush = { tool: "brush", color: "#FD1C22", size: 1.6, op: 1, mirror: true };

  const IC = {
    brush: '<path d="M4 20c2.8 0 4-1.2 4-3.2 0-1.2-.8-2-2-2s-2.2.9-2.2 2.2c0 1.4-.6 2.3-1.8 3z"/><path d="M8.2 15.6L18.5 5.3a2 2 0 0 1 2.8 2.8L11 18.4"/>',
    line: '<path d="M5 19L19 5"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/>',
    eraser: '<path d="M7 20h11M5.2 15.8l8.6-8.6a2 2 0 0 1 2.8 0l2.4 2.4a2 2 0 0 1 0 2.8L12 20H8.4z"/><path d="M9.4 10.6l5 5"/>',
    undo: '<path d="M9 7L4.5 11.5 9 16"/><path d="M4.5 11.5H15a4.5 4.5 0 0 1 0 9h-3"/>',
    redo: '<path d="M15 7l4.5 4.5L15 16"/><path d="M19.5 11.5H9a4.5 4.5 0 0 0 0 9h3"/>',
    clear: '<path d="M5 7h14M9.5 7V5h5v2M7 7l1 12h8l1-12"/>',
    mirror: '<path d="M12 3v18" stroke-dasharray="2.4 2.4"/><path d="M9 7L3.5 12 9 17zM15 7l5.5 5-5.5 5z"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" class="ic">${IC[k]}</svg>`;
  ["undo", "redo", "clear", "mirror"].forEach((k) => { $("g-" + k).innerHTML = svg(k); });

  /* ---------- guardar ---------- */
  function commit() {
    let paint = null;
    if (hasInk) { try { paint = layer.toDataURL("image/png"); } catch (e) {} }
    Save.car = Object.assign({}, dsg, { paint });
    const cp = mkc(); cp.getContext("2d").drawImage(layer, 0, 0);
    PAINT.img = hasInk ? cp : null; PAINT.ver++; carCache.clear();
    persist();
  }
  const clearAll = () => { lctx.clearRect(0, 0, PAINT_W, PAINT_H); pctx.clearRect(0, 0, PAINT_W, PAINT_H); bctx.clearRect(0, 0, PAINT_W, PAINT_H); strokes = []; redo = []; hasInk = baseInk = false; };

  /* ---------- escenario (vertical: la nariz mira hacia arriba) ---------- */
  function sizeStage() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3), w = box.clientWidth, h = box.clientHeight; if (!w || !h) return false;
    if (stage.width !== Math.round(w * dpr) || stage.height !== Math.round(h * dpr)) { stage.width = Math.round(w * dpr); stage.height = Math.round(h * dpr); }
    geom = { dpr, ppu: Math.min((h * 0.92) / 39, (w * 0.82) / 21), cx: w / 2, cy: h / 2 + h * 0.01 }; return true;
  }
  function drawStage() {
    raf = 0; if (!sizeStage()) return;
    const W = stage.width, H = stage.height, { dpr, ppu, cx, cy } = geom, S = ppu * dpr;
    sctx.clearRect(0, 0, W, H);
    const sp = paintCar(dsg, false, S, hasInk ? pad : null, { crop: [40, 22] });
    sctx.save(); sctx.translate(cx * dpr, cy * dpr);
    sctx.fillStyle = "rgba(0,0,0,.5)"; try { sctx.filter = `blur(${ppu * 0.9 * dpr}px)`; } catch (e) {} sctx.beginPath(); sctx.ellipse(ppu * 0.8 * dpr, ppu * 0.9 * dpr, 9.5 * S, 19 * S, 0, 0, 6.3); sctx.fill(); try { sctx.filter = "none"; } catch (e) {}
    sctx.rotate(-Math.PI / 2); sctx.imageSmoothingQuality = "high"; sctx.drawImage(sp.img, -sp.img.width / 2, -sp.img.height / 2); sctx.restore();
    if (tab === "number" && dsg.num) numberHandle();
    if (tab === "paint" && brush.mirror) { sctx.save(); sctx.strokeStyle = "rgba(255,255,255,.28)"; sctx.setLineDash([6 * dpr, 8 * dpr]); sctx.lineWidth = dpr; sctx.beginPath(); sctx.moveTo(cx * dpr, cy * dpr - 20.5 * S); sctx.lineTo(cx * dpr, cy * dpr + 20.5 * S); sctx.stroke(); sctx.restore(); }
  }
  const redraw = () => { if (!raf) raf = requestAnimationFrame(drawStage); };
  // sprite (x hacia la nariz, y a la derecha del piloto) <-> pantalla
  const toScreen = (x, y) => [geom.cx + y * geom.ppu, geom.cy - x * geom.ppu];
  const fromScreen = (px, py) => [-(py - geom.cy) / geom.ppu, (px - geom.cx) / geom.ppu];
  const numSize = () => (dsg.num > 9 ? 4.6 : 3.4) * numDesign(dsg).ns * geom.ppu;       // lado del recuadro del número, en px de pantalla
  function numberHandle() {
    const n = numDesign(dsg), [sx, sy] = toScreen(n.nx, n.ny), d = geom.dpr, sz = numSize() * d;
    sctx.save(); sctx.translate(sx * d, sy * d); sctx.strokeStyle = "#FD1C22"; sctx.lineWidth = 1.6 * d; sctx.setLineDash([5 * d, 4 * d]); sctx.strokeRect(-sz * 0.6, -sz * 0.6, sz * 1.2, sz * 1.2);
    sctx.fillStyle = "#FD1C22"; sctx.setLineDash([]); for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { sctx.beginPath(); sctx.arc(a * sz * 0.6, b * sz * 0.6, 3 * d, 0, 6.3); sctx.fill(); } sctx.restore();
  }

  /* ---------- miniaturas verticales ---------- */
  function mini(d) {
    const sp = paintCar(d, false, 5, null, { crop: [40, 22] }), c = document.createElement("canvas"); c.width = sp.img.height; c.height = sp.img.width; c.className = "g-mini";
    const g = c.getContext("2d"); g.translate(c.width / 2, c.height / 2); g.rotate(-Math.PI / 2); g.drawImage(sp.img, -sp.img.width / 2, -sp.img.height / 2); return c;
  }

  /* ---------- piezas de la interfaz ---------- */
  const PARTS = [["body", "g_body"], ["accent", "g_accent"], ["wing", "g_wings"], ["helmet", "g_helmet"]];
  const same = (a, b) => ["body", "accent", "wing", "helmet", "stripe", "num"].every((k) => a[k] === b[k]);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  function swatches(list, value, onPick, row) {
    const wrap = el("div", "g-sw" + (row ? " row" : "")), v = String(value || "").toLowerCase();
    list.forEach((c) => { const b = el("button", "sw" + (c.toLowerCase() === v ? " on" : "")); b.style.setProperty("--c", c); b.setAttribute("aria-label", c); b.onclick = () => onPick(c); wrap.appendChild(b); });
    const cu = el("label", "sw custom" + (v && !list.some((c) => c.toLowerCase() === v) ? " on" : "")); if (v && !list.some((c) => c.toLowerCase() === v)) cu.style.setProperty("--c", value);
    const inp = el("input"); inp.type = "color"; inp.value = /^#[0-9a-f]{6}$/i.test(value) ? value : "#FD1C22"; inp.oninput = () => onPick(inp.value.toUpperCase(), true); cu.appendChild(inp); wrap.appendChild(cu);
    return wrap;
  }
  function slider(label, value, min, max, step, onInput, fmt) {
    const row = el("label", "g-slider"); row.innerHTML = `<span>${label}</span><b>${fmt ? fmt(value) : value}</b>`;
    const r = el("input"); r.type = "range"; r.min = min; r.max = max; r.step = step; r.value = value;
    const fill = () => r.style.setProperty("--p", ((r.value - min) / (max - min)) * 100 + "%"); fill();
    r.oninput = () => { onInput(+r.value); row.querySelector("b").textContent = fmt ? fmt(+r.value) : r.value; fill(); }; row.appendChild(r); return row;
  }

  function buildPanel() {
    panel.innerHTML = ""; panel.className = "g-panel " + tab; panel.scrollTop = 0;
    tabBtns.forEach((b) => b.classList.toggle("on", b.dataset.t === tab));
    box.classList.toggle("paint", tab === "paint"); box.classList.toggle("number", tab === "number");
    $("g-undo").disabled = !strokes.length; $("g-redo").disabled = !redo.length; $("g-clear").disabled = !hasInk; $("g-mirror").classList.toggle("on", brush.mirror);
    if (tab === "presets") {
      const grid = el("div", "g-grid");
      CAR_PRESETS.forEach((p) => {
        const full = Object.assign({}, CAR_DEFAULT, p.d), b = el("button", "g-card" + (!hasInk && same(dsg, full) ? " on" : ""));
        b.appendChild(mini(full)); b.appendChild(el("span", null, p.n[LANG]));
        b.onclick = () => { dsg = Object.assign({}, full); clearAll(); commit(); redraw(); buildPanel(); };
        grid.appendChild(b);
      });
      panel.appendChild(grid);
    } else if (tab === "colors") {
      const chips = el("div", "g-parts");
      PARTS.forEach(([k, label]) => { const b = el("button", "g-chip" + (k === part ? " on" : ""), `<i style="background:${dsg[k]}"></i><span>${T(label)}</span>`); b.onclick = () => { part = k; buildPanel(); }; chips.appendChild(b); });
      panel.appendChild(chips);
      panel.appendChild(swatches(CAR_PALETTE, dsg[part], (c, lv) => { if (part === "body" && dsg.wing === dsg.body) dsg.wing = c; dsg[part] = c; commit(); redraw(); if (!lv) buildPanel(); }));
    } else if (tab === "stripes") {
      const grid = el("div", "g-grid");
      CAR_STRIPES.forEach((st) => { const d = Object.assign({}, dsg, { stripe: st }), b = el("button", "g-card" + (dsg.stripe === st ? " on" : "")); b.appendChild(mini(d)); b.appendChild(el("span", null, T("g_s_" + st))); b.onclick = () => { dsg.stripe = st; commit(); redraw(); buildPanel(); }; grid.appendChild(b); });
      panel.appendChild(grid); panel.appendChild(el("h4", "g-h", T("g_stripe_col")));
      panel.appendChild(swatches(CAR_PALETTE, dsg.accent, (c, lv) => { dsg.accent = c; commit(); redraw(); if (!lv) buildPanel(); }, true));
    } else if (tab === "number") {
      const n = numDesign(dsg), row = el("div", "g-num");
      const step = (k) => { dsg.num = clamp((dsg.num || 0) + k, 0, 99); commit(); redraw(); buildPanel(); };
      [["−10", -10], ["−", -1]].forEach(([l, k]) => { const b = el("button", null, l); b.onclick = () => step(k); row.appendChild(b); });
      row.appendChild(el("b", null, dsg.num || "–")); [["+", 1], ["+10", 10]].forEach(([l, k]) => { const b = el("button", null, l); b.onclick = () => step(k); row.appendChild(b); });
      panel.appendChild(row);
      if (dsg.num) {
        panel.appendChild(el("p", "g-note", T("g_num_drag")));
        panel.appendChild(el("h4", "g-h", T("g_color")));
        panel.appendChild(swatches(["#FFFFFF", "#14161A", ...CAR_PALETTE.slice(3)], n.nc, (c, lv) => { dsg.nc = c; commit(); redraw(); if (!lv) buildPanel(); }, true));
        const tools = el("div", "g-tools two");
        const mk = (label, on, fn) => { const b = el("button", "g-tool" + (on ? " on" : ""), label); b.onclick = fn; tools.appendChild(b); };
        mk(`<b class="ol">9</b><span>${T("g_outline")}</span>`, n.no, () => { dsg.no = !n.no; commit(); redraw(); buildPanel(); });
        mk(`<span>${T("g_reset_pos")}</span>`, false, () => { dsg.nx = NUM_DEFAULT.nx; dsg.ny = NUM_DEFAULT.ny; dsg.nr = NUM_DEFAULT.nr; dsg.ns = 1; commit(); redraw(); });
        panel.appendChild(tools);
      } else panel.appendChild(el("p", "g-note", T("g_num_note")));
    } else if (tab === "paint") {
      const tools = el("div", "g-tools big");
      [["brush", "g_brush"], ["line", "g_line"], ["eraser", "g_eraser"]].forEach(([k, l]) => { const b = el("button", "g-tool" + (brush.tool === k ? " on" : ""), svg(k) + `<span>${T(l)}</span>`); b.onclick = () => { brush.tool = k; buildPanel(); }; tools.appendChild(b); });
      panel.appendChild(tools);
      if (brush.tool !== "eraser") panel.appendChild(swatches(CAR_PALETTE, brush.color, (c, lv) => { brush.color = c; if (!lv) buildPanel(); }, true));
      const sl = el("div", "g-sl2");
      sl.appendChild(slider(T("g_size"), brush.size, 0.4, 6, 0.1, (v) => { brush.size = v; }, (v) => v.toFixed(1)));
      if (brush.tool !== "eraser") sl.appendChild(slider(T("g_opacity"), brush.op, 0.1, 1, 0.05, (v) => { brush.op = v; }, (v) => Math.round(v * 100) + "%"));
      panel.appendChild(sl);
    }
  }

  /* ---------- dibujo de los trazos sobre la pintura ---------- */
  const flipY = (y) => PAINT_H - y;
  function strokePath(g, pts, flip) {
    const P = pts.map((p) => [p[0], flip ? flipY(p[1]) : p[1]]); g.beginPath();
    if (P.length === 1) { g.moveTo(P[0][0], P[0][1]); g.lineTo(P[0][0] + 0.01, P[0][1]); return; }
    g.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) { const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2; g.quadraticCurveTo(P[i][0], P[i][1], mx, my); }
    g.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
  }
  function paintStroke(g, st) { // dibuja un trazo completo (y su espejo) sobre g, con su opacidad (sin acumularse al cruzarse)
    const erase = st.tool === "eraser", t = erase ? g : tctx;
    if (!erase) tctx.clearRect(0, 0, PAINT_W, PAINT_H);
    t.save(); t.lineCap = "round"; t.lineJoin = "round"; t.lineWidth = st.s * PAINT_PX; t.strokeStyle = st.c; t.fillStyle = st.c;
    if (erase) t.globalCompositeOperation = "destination-out";
    for (const flip of st.m ? [false, true] : [false]) {
      if (st.tool === "line") { const a = st.pts[0], b = st.pts[st.pts.length - 1]; t.beginPath(); t.moveTo(a[0], flip ? flipY(a[1]) : a[1]); t.lineTo(b[0], flip ? flipY(b[1]) : b[1]); t.stroke(); }
      else { strokePath(t, st.pts, flip); t.stroke(); }
    }
    t.restore();
    if (!erase) { g.save(); g.globalAlpha = st.o; g.drawImage(tmp, 0, 0); g.restore(); }
  }
  function rebuildLayer() { lctx.clearRect(0, 0, PAINT_W, PAINT_H); if (baseInk) lctx.drawImage(base, 0, 0); strokes.forEach((st) => paintStroke(lctx, st)); hasInk = baseInk || strokes.length > 0; }
  function liveRender() { pctx.clearRect(0, 0, PAINT_W, PAINT_H); pctx.drawImage(layer, 0, 0); if (cur) paintStroke(pctx, cur); } // vista previa: la capa más el trazo en curso
  function undo() { if (!strokes.length) return; redo.push(strokes.pop()); rebuildLayer(); liveRender(); commit(); redraw(); buildPanel(); }
  function redoStroke() { if (!redo.length) return; strokes.push(redo.pop()); rebuildLayer(); liveRender(); commit(); redraw(); buildPanel(); }

  /* ---------- gestos sobre el carro ---------- */
  const rel = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const toPad = (e) => { const [x, y] = fromScreen(...rel(e)); return [(x + 20) * PAINT_PX, (y + 10) * PAINT_PX]; };
  const dist2 = () => { const a = [...ptrs.values()]; return a.length > 1 ? hyp(a[0][0] - a[1][0], a[0][1] - a[1][1]) : 0; };
  stage.addEventListener("pointerdown", (e) => {
    const p = rel(e);
    if (tab === "number" && dsg.num) {
      e.preventDefault(); try { stage.setPointerCapture(e.pointerId); } catch (er) {}
      ptrs.set(e.pointerId, p);
      if (ptrs.size === 2) { numDrag = null; pinch = { d0: dist2() || 1, ns0: numDesign(dsg).ns }; return; }
      const n = numDesign(dsg);   // el número se mueve desde donde está: el dedo puede tocar en cualquier parte del escenario (arrastre relativo)
      numDrag = { f0: fromScreen(...p), nx0: n.nx, ny0: n.ny };
      return;
    }
    if (tab !== "paint") return;
    e.preventDefault(); stage.setPointerCapture(e.pointerId);
    cur = { tool: brush.tool, c: brush.color, s: brush.size, o: brush.tool === "eraser" ? 1 : brush.op, m: brush.mirror, pts: [toPad(e)] };
    liveRender(); redraw();
  });
  stage.addEventListener("pointermove", (e) => {
    if (tab === "number") {
      if (!ptrs.has(e.pointerId)) return; e.preventDefault(); ptrs.set(e.pointerId, rel(e));
      if (pinch && ptrs.size >= 2) { dsg.ns = clamp(pinch.ns0 * dist2() / pinch.d0, 0.5, 3.2); redraw(); }
      else if (numDrag) { const [fx, fy] = fromScreen(...rel(e)); dsg.nx = clamp(numDrag.nx0 + fx - numDrag.f0[0], -19, 19); dsg.ny = clamp(numDrag.ny0 + fy - numDrag.f0[1], -9.5, 9.5); redraw(); }
      return;
    }
    if (!cur) return; e.preventDefault();
    for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) { const p = toPad(ev), q = cur.pts[cur.pts.length - 1]; if (hyp(p[0] - q[0], p[1] - q[1]) < 2.5) continue; cur.pts.push(p); }
    liveRender(); redraw();
  });
  const end = (e) => {
    if (tab === "number") { const had = ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { numDrag = null; if (had) commit(); } return; }
    if (!cur) return; const st = cur; cur = null;
    strokes.push(st); redo = []; rebuildLayer(); liveRender(); commit(); redraw(); buildPanel();
  };
  stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
  $("g-undo").onclick = undo; $("g-redo").onclick = redoStroke;
  $("g-clear").onclick = () => { clearAll(); commit(); redraw(); buildPanel(); };
  $("g-mirror").onclick = () => { brush.mirror = !brush.mirror; buildPanel(); redraw(); };

  /* ---------- pestañas y apertura ---------- */
  tabBtns.forEach((b) => { b.onclick = () => { tab = b.dataset.t; ptrs.clear(); numDrag = pinch = null; buildPanel(); redraw(); }; });
  function open() {
    dsg = playerDesign(); strokes = []; redo = []; cur = null; ptrs.clear(); numDrag = pinch = null;
    clearAll(); hasInk = baseInk = !!PAINT.img;
    if (PAINT.img) { bctx.drawImage(PAINT.img, 0, 0, PAINT_W, PAINT_H); lctx.drawImage(base, 0, 0); pctx.drawImage(base, 0, 0); }
    tab = "presets"; buildPanel(); requestAnimationFrame(() => { drawStage(); setTimeout(drawStage, 520); });
  }
  addEventListener("resize", () => { if ($("scr-garage").classList.contains("show")) redraw(); });
  return { open, redraw };
})();
