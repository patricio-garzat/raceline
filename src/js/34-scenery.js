"use strict";
/* scenery.js: el paisaje propio de cada circuito (casas, campos, estadios, torres, puertos, molinos...) y sus animaciones
   (sombras de nubes, brillo del agua, olas, barcos, ruedas de la fortuna, molinos, pájaros, pétalos, neón...).
   build() pinta lo estático en el fondo (una vez); anim() dibuja lo que se mueve, cada cuadro, encima del fondo y debajo de los carros. */

const Scenery = (() => {
  const SH = "rgba(22,30,12,.30)";
  let A = [], X = null, placed = [];                         // A: animaciones del circuito actual · X: contexto de construcción
  const TAU = Math.PI * 2, rr = (f) => (a, b) => a + f() * (b - a);

  /* ---------- colocación ---------- */
  const inLoop = (x, y) => inPoly(x, y, TR.C);
  const inCity = (x, y) => (X.lv.city || []).some((r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);
  const wetAt = (x, y, m) => X.wet(x, y) || (m && (X.wet(x + m, y) || X.wet(x - m, y) || X.wet(x, y + m) || X.wet(x, y - m)));
  // busca un lugar libre: fuera de la pista (dr), dentro o fuera del circuito, sin agua ni otros objetos
  function spot(o = {}) {
    const r = o.r || 10, dr = o.edge != null ? X.HW + o.edge : (o.dr == null ? X.HW + 40 : o.dr + r), b = o.rect === "play" ? X.play : o.rect === "all" ? X.bounds : X.vis, rnd = X.rnd;
    for (let k = 0; k < (o.tries || 160); k++) {
      const x = b[0] + 20 + rnd() * (b[2] - b[0] - 40), y = b[1] + 20 + rnd() * (b[3] - b[1] - 40);
      if (o.inside != null && inLoop(x, y) !== o.inside) continue;
      if (o.city === true && !inCity(x, y)) continue;
      if (o.city === false && inCity(x, y)) continue;
      if (o.wet === true ? !wetAt(x, y) : wetAt(x, y, r)) continue;
      if (o.box && (x < o.box[0] || x > o.box[2] || y < o.box[1] || y > o.box[3])) continue;
      if (distToRoad(x, y) < dr) continue;
      if (placed.some((p) => hyp(x - p[0], y - p[1]) < p[2] + r + (o.gap == null ? 5 : o.gap))) continue;
      if (!o.noReserve) placed.push([x, y, r]);
      return [x, y];
    }
    return null;
  }
  const pad = (x, y, r) => { placed.push([x, y, r]); X.excl.push([x, y, r + 6]); };

  /* ---------- piezas ---------- */
  function house(g, x, y, w, h, a, col) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = SH; g.fillRect(-w / 2 + 3.5, -h / 2 + 4.5, w, h);
    g.fillStyle = mix(col, -0.3); g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h / 2); g.fillStyle = mix(col, -0.2); g.fillRect(-w / 2, 0, w, h / 2);
    g.fillStyle = mix(col, 0.32); g.fillRect(-w / 2, -0.7, w, 1.4);
    g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(-w / 2, -h / 2, w, 1);
    g.restore();
  }
  const ROOFS = {
    alp: ["#7A5A3C", "#6B4B31", "#8A6A48", "#5E4430"], med: ["#C8643C", "#BF5B34", "#D4784A", "#B8532F"], red: ["#B4483C", "#A33F35", "#C25A4A", "#8F3A32"],
    flat: ["#E3D2B0", "#D8C59E", "#EADBBC", "#CDB98F"], jp: ["#5C6672", "#4D5762", "#6B7683", "#434C57"], city: ["#B7B2A8", "#A8A398", "#C4BFB4", "#9B968B"],
    tropic: ["#E5694A", "#3F9FD0", "#F2B63D", "#58B368", "#C8508B", "#F28A3C"], white: ["#EFEDE6", "#E4E1D8", "#F6F4EE", "#D9D5CA"],
  };
  function houses(n, style, o = {}) { // grupos de casas (aldeas)
    const g = X.g, rnd = X.rnd, cols = ROOFS[style] || ROOFS.red;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 52, inside: o.inside, city: false, edge: o.edge == null ? 44 : o.edge, gap: 4 }); if (!s) continue;
      const a0 = (rnd() - 0.5) * 0.9, cnt = o.cnt || 9;
      for (let i = 0; i < cnt; i++) {
        const ang = rnd() * TAU, d = Math.sqrt(rnd()) * 44, x = s[0] + Math.cos(ang) * d, y = s[1] + Math.sin(ang) * d, w = (o.w || 20) + rnd() * 10, h = w * (0.55 + rnd() * 0.4);
        if (distToRoad(x, y) < X.HW + 40 || wetAt(x, y, 4)) continue;
        X.g.fillStyle = "rgba(90,130,60,.55)"; X.g.fillRect(x - w * 0.8, y - h * 0.9, w * 1.6, h * 1.8);
        house(g, x, y, w, h, a0 + (rnd() - 0.5) * 0.25, cols[Math.floor(rnd() * cols.length)]);
      }
      pad(s[0], s[1], 52);
    }
  }
  function field(g, x, y, w, h, a, kind, rnd) {
    g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.rect(-w / 2, -h / 2, w, h); g.clip();
    const rows = (col, step, lw, base) => { g.fillStyle = base; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = col; g.lineWidth = lw; for (let q = -h / 2 + step / 2; q < h / 2; q += step) { g.beginPath(); g.moveTo(-w / 2, q); g.lineTo(w / 2, q); g.stroke(); } };
    switch (kind) {
      case "wheat": rows("#C9A445", 4.5, 2.2, "#DDBF63"); break;
      case "hay": rows("#B89A52", 5, 2, "#CDB06A"); break;
      case "grass": rows("#6E9E4C", 5, 2.4, "#82B35F"); break;
      case "plow": rows("#6F4A33", 5, 2.4, "#8A6445"); break;
      case "paddy": rows("#9FC9B5", 6, 3.4, "#78AE58"); g.fillStyle = "rgba(200,235,240,.28)"; g.fillRect(-w / 2, -h / 2, w, h); break;
      case "lavender": rows("#8E6FC0", 5, 3, "#B79AD8"); break;
      case "vine": rows("#4F7A3A", 7, 3, "#9C7B54"); break;
      case "olive": g.fillStyle = "#B9AE86"; g.fillRect(-w / 2, -h / 2, w, h); for (let qx = -w / 2 + 6; qx < w / 2; qx += 9) for (let qy = -h / 2 + 6; qy < h / 2; qy += 9) { g.fillStyle = "rgba(30,40,10,.22)"; g.beginPath(); g.arc(qx + 1.5, qy + 2, 2.8, 0, TAU); g.fill(); g.fillStyle = "#7E8C58"; g.beginPath(); g.arc(qx, qy, 2.8, 0, TAU); g.fill(); } break;
      case "tulip": { const cs = ["#E8453C", "#F4C534", "#E86FA8", "#F4F2EC", "#8A4FC8"]; let ci = Math.floor(rnd() * cs.length); for (let q = -h / 2; q < h / 2; q += 4.2) { g.fillStyle = cs[ci % cs.length]; g.fillRect(-w / 2, q, w, 3.6); g.fillStyle = "rgba(30,60,20,.25)"; g.fillRect(-w / 2, q + 3.6, w, 0.6); ci += rnd() < 0.18 ? 1 : 0; } break; }
      case "sun": rows("#C79B1E", 6, 1.2, "#EBC63A"); g.fillStyle = "rgba(90,55,20,.55)"; for (let q = 0; q < w * h / 40; q++) { g.beginPath(); g.arc(-w / 2 + rnd() * w, -h / 2 + rnd() * h, 1.4, 0, TAU); g.fill(); } break;
      case "bluebonnet": rows("#4C5FB5", 4, 2.2, "#7388D0"); g.fillStyle = "rgba(255,255,255,.35)"; for (let q = 0; q < w * h / 30; q++) g.fillRect(-w / 2 + rnd() * w, -h / 2 + rnd() * h, 1.4, 1.4); break;
      case "agave": g.fillStyle = "#A8694B"; g.fillRect(-w / 2, -h / 2, w, h); for (let qx = -w / 2 + 6; qx < w / 2 - 3; qx += 10) for (let qy = -h / 2 + 6; qy < h / 2 - 3; qy += 10) { g.fillStyle = "rgba(40,20,10,.25)"; g.beginPath(); g.arc(qx + 1.6, qy + 2, 4.2, 0, TAU); g.fill(); g.fillStyle = "#7FB0A8"; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, r = k % 2 ? 1.8 : 4.4; g.lineTo(qx + Math.cos(a) * r, qy + Math.sin(a) * r); } g.closePath(); g.fill(); g.fillStyle = "#4F8A82"; g.beginPath(); g.arc(qx, qy, 1.1, 0, TAU); g.fill(); } break;
      case "solar": g.fillStyle = "#1F2F4E"; g.fillRect(-w / 2, -h / 2, w, h); for (let qx = -w / 2 + 2; qx < w / 2 - 4; qx += 8) for (let qy = -h / 2 + 2; qy < h / 2 - 3; qy += 6) { const gr = g.createLinearGradient(qx, qy, qx + 6, qy + 4); gr.addColorStop(0, "#3C6BA8"); gr.addColorStop(1, "#1E3F73"); g.fillStyle = gr; g.fillRect(qx, qy, 6.4, 4.2); } break;
      case "pivot": g.fillStyle = "#D8C08A"; g.fillRect(-w / 2, -h / 2, w, h); { const rad = Math.min(w, h) / 2 - 1; g.fillStyle = "#6FA04A"; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1; for (let q = 1; q < 6; q++) { g.beginPath(); g.arc(0, 0, rad * q / 6, 0, TAU); g.stroke(); } g.strokeStyle = "rgba(240,240,240,.9)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(rad * 0.95, 0); g.stroke(); } break;
      default: rows("#6E9E4C", 5, 2.4, "#82B35F");
    }
    g.restore();
    g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = "rgba(60,45,25,.3)"; g.lineWidth = 1.2; g.strokeRect(-w / 2, -h / 2, w, h); g.restore();
  }
  function fields(n, kinds, o = {}) {
    const rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const w = (o.w || 74) + rnd() * 50, h = (o.h || 54) + rnd() * 40, s = spot({ r: Math.max(w, h) * 0.55, inside: o.inside, city: false, dr: o.dr }); if (!s) continue;
      field(X.g, s[0], s[1], w, h, (rnd() - 0.5) * 0.5, kinds[Math.floor(rnd() * kinds.length)], rnd);
      X.excl.push([s[0], s[1], Math.max(w, h) * 0.55]);
    }
  }
  const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];
  function patch(kinds, o = {}) { // mosaico de campos de cultivo que cubre todo el terreno libre (vista aérea)
    const g = X.g, rnd = X.rnd, cs = o.cs || 60, b = X.bounds;
    for (let gx = b[0] - 10; gx < b[2] + 10; gx += cs) for (let gy = b[1] - 10; gy < b[3] + 10; gy += cs) {
      const cx = gx + cs / 2 + (rnd() - 0.5) * cs * 0.3, cy = gy + cs / 2 + (rnd() - 0.5) * cs * 0.3;
      if (rnd() > (o.fill == null ? 0.85 : o.fill)) continue;
      if (distToRoad(cx, cy) < X.HW + (o.edge == null ? 34 : o.edge) || wetAt(cx, cy, cs * 0.42) || inCity(cx, cy)) continue;
      if (placed.some((p) => hyp(cx - p[0], cy - p[1]) < p[2] + cs * 0.45)) continue;   // no se cubren los monumentos ya colocados
      if (o.inside != null && inLoop(cx, cy) !== o.inside) continue;
      field(g, cx, cy, cs * (1.04 + rnd() * 0.22), cs * (0.9 + rnd() * 0.28), (rnd() - 0.5) * (o.rot == null ? 0.3 : o.rot), pick(kinds, rnd), rnd);
    }
  }
  function oval(n, o = {}) { // campos deportivos (críquet, fútbol)
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const r = 26 + rnd() * 10, s = spot({ r, inside: o.inside, edge: 46, city: false, gap: 2 }); if (!s) continue;
      g.fillStyle = SH; g.beginPath(); g.ellipse(s[0] + 3, s[1] + 4, r, r * 0.86, 0, 0, TAU); g.fill(); g.fillStyle = "#5F9444"; g.beginPath(); g.ellipse(s[0], s[1], r, r * 0.86, 0, 0, TAU); g.fill();
      g.fillStyle = "#7DB25A"; g.beginPath(); g.ellipse(s[0], s[1], r * 0.8, r * 0.68, 0, 0, TAU); g.fill(); g.fillStyle = "#D6C28C"; g.fillRect(s[0] - 2.2, s[1] - r * 0.3, 4.4, r * 0.6); g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 1; g.beginPath(); g.ellipse(s[0], s[1], r * 0.8, r * 0.68, 0, 0, TAU); g.stroke();
    }
  }
  function serviceRoad(off, col) { // camino de servicio paralelo a la pista (se corta donde otra parte del circuito queda cerca)
    const g = X.g, C = TR.C, Nm = TR.Nm, N = TR.N; g.save(); g.lineCap = "round"; g.lineJoin = "round";
    for (const side of [-1, 1]) {
      let run = [];
      const flush = () => { if (run.length > 6) { g.beginPath(); run.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 4.2; g.stroke(); g.strokeStyle = col || "#BDB6A6"; g.lineWidth = 2.8; g.stroke(); } run = []; };
      for (let i = 0; i < N; i += 2) { const x = C[i][0] + Nm[i][0] * side * off, y = C[i][1] + Nm[i][1] * side * off; if (distToRoad(x, y) < off - 5 || wetAt(x, y, 3) || placed.some((p) => hyp(x - p[0], y - p[1]) < p[2] * 0.6)) flush(); else run.push([x, y]); }
      flush();
    }
    g.restore();
  }
  function speckle(cols, n) { // florecillas, matas y piedras sueltas para que el suelo no sea liso
    const g = X.g, rnd = X.rnd, b = X.bounds;
    for (let k = 0; k < n; k++) { const x = b[0] + rnd() * (b[2] - b[0]), y = b[1] + rnd() * (b[3] - b[1]); if (distToRoad(x, y) < X.HW + 28 || wetAt(x, y, 2)) continue; g.fillStyle = pick(cols, rnd); g.globalAlpha = 0.55 + rnd() * 0.4; g.beginPath(); g.arc(x, y, 0.8 + rnd() * 1.3, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  }
  function tower(g, x, y, w, h, hgt, col) { // rascacielos visto desde arriba, con sus muros, ventanas y sombra larga
    g.save(); g.translate(x, y);
    const dx = hgt * 0.5, dy = hgt * 0.78, ox = -hgt * 0.11, oy = -hgt * 0.17;
    g.fillStyle = "rgba(18,24,34,.32)"; g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(-w / 2 + dx, -h / 2 + dy); g.lineTo(w / 2 + dx, -h / 2 + dy); g.lineTo(w / 2 + dx, h / 2 + dy); g.lineTo(w / 2, h / 2); g.lineTo(-w / 2, h / 2); g.closePath(); g.fill();
    g.fillStyle = mix(col, -0.42); g.beginPath(); g.moveTo(w / 2, -h / 2); g.lineTo(w / 2, h / 2); g.lineTo(w / 2 + ox, h / 2 + oy); g.lineTo(w / 2 + ox, -h / 2 + oy); g.closePath(); g.fill();      // muro derecho
    g.fillStyle = mix(col, -0.28); g.beginPath(); g.moveTo(-w / 2, h / 2); g.lineTo(w / 2, h / 2); g.lineTo(w / 2 + ox, h / 2 + oy); g.lineTo(-w / 2 + ox, h / 2 + oy); g.closePath(); g.fill(); // muro de abajo
    g.strokeStyle = "rgba(200,225,255,.35)"; g.lineWidth = 0.6; for (let q = 1; q < 6; q++) { const u = q / 6; g.beginPath(); g.moveTo(-w / 2 + w * u, h / 2); g.lineTo(-w / 2 + w * u + ox, h / 2 + oy); g.stroke(); g.beginPath(); g.moveTo(w / 2, -h / 2 + h * u); g.lineTo(w / 2 + ox, -h / 2 + h * u + oy); g.stroke(); }
    g.translate(ox, oy);
    const gr = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); gr.addColorStop(0, mix(col, 0.3)); gr.addColorStop(1, mix(col, -0.08)); g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 0.8; g.strokeRect(-w / 2 + 0.4, -h / 2 + 0.4, w - 0.8, h - 0.8);
    g.fillStyle = mix(col, -0.12); g.fillRect(-w * 0.32, -h * 0.32, w * 0.64, h * 0.64); g.fillStyle = mix(col, 0.18); g.fillRect(-w * 0.2, -h * 0.2, w * 0.4, h * 0.4);
    g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(-w * 0.34, h * 0.1, w * 0.18, h * 0.18); g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.arc(w * 0.26, -h * 0.26, 1.1, 0, TAU); g.fill();
    g.restore();
  }
  function towers(n, o = {}) { // barrios de edificios: cada grupo tiene su plaza y torres de alturas distintas
    const g = X.g, rnd = X.rnd, cols = o.cols || ["#9FB2C4", "#B7C3CE", "#8FA3B8", "#C8CFD6", "#A9B8C7"], neon = o.neon || X.neon;
    let made = 0, tries = 0;
    while (made < n && tries++ < 30) {
      const cnt = Math.min(n - made, 3 + Math.floor(rnd() * 3)), R = 34, s = spot({ r: R, city: o.city, inside: o.inside, edge: 36, gap: -4 }); if (!s) continue;
      g.fillStyle = "rgba(0,0,0,.10)"; rrect(g, s[0] - R + 3, s[1] - R * 0.8 + 4, R * 2, R * 1.6, 8); g.fill(); g.fillStyle = o.plaza || "rgba(214,210,200,.9)"; rrect(g, s[0] - R, s[1] - R * 0.8, R * 2, R * 1.6, 8); g.fill(); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; g.stroke();
      const list = [];
      for (let i = 0; i < cnt; i++) {
        const w = (o.w || 22) * (0.8 + rnd() * 0.7), h = w * (0.8 + rnd() * 0.45), x = s[0] + (rnd() - 0.5) * (R * 2 - w - 8), y = s[1] + (rnd() - 0.5) * (R * 1.6 - h - 8);
        if (distToRoad(x, y) < X.HW + 30 || list.some((q) => Math.abs(q.x - x) < (q.w + w) / 2 + 2 && Math.abs(q.y - y) < (q.h + h) / 2 + 2)) continue;
        list.push({ x, y, w, h, hg: (o.hgt || 30) * (0.5 + rnd() * 1.1), col: cols[Math.floor(rnd() * cols.length)] });
      }
      list.sort((a, b) => a.y - b.y).forEach((q) => { tower(g, q.x, q.y, q.w, q.h, q.hg, q.col); X.lights.push({ x: q.x - q.hg * 0.11, y: q.y - q.hg * 0.17, w: q.w, h: q.h, c: neon[Math.floor(rnd() * neon.length)], ph: rnd() * TAU }); });
      pad(s[0], s[1], R + 2); made += cnt;
    }
  }
  function stadium(o = {}) {
    const g = X.g, rx = o.rx || 66, ry = o.ry || 50, s = spot({ r: Math.max(rx, ry) + 8, inside: o.inside, dr: o.dr }); if (!s) return;
    const [x, y] = s; g.save(); g.translate(x, y); g.rotate(o.rot || 0);
    g.fillStyle = SH; g.beginPath(); g.ellipse(7, 9, rx, ry, 0, 0, TAU); g.fill();
    g.fillStyle = o.wall || "#C9CCD2"; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
    const seat = o.seats || ["#D94A3E", "#E8E2D2", "#3F6FC0"];
    for (let ring = 0; ring < 3; ring++) { g.strokeStyle = seat[ring % seat.length]; g.globalAlpha = 0.9; g.lineWidth = 4.4; g.setLineDash([2.2, 1.4]); g.beginPath(); g.ellipse(0, 0, rx - 6 - ring * 5, ry - 6 - ring * 5, 0, 0, TAU); g.stroke(); }
    g.setLineDash([]); g.globalAlpha = 1;
    g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.ellipse(0, 0, rx - 2, ry - 2, 0, 0, TAU); g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,.8)"; g.stroke();
    const px = rx * 0.52, py = ry * 0.5; g.fillStyle = "#6FA04A"; g.beginPath(); g.ellipse(0, 0, px, py, 0, 0, TAU); g.fill();
    if (o.pitch !== false) { g.save(); g.beginPath(); g.ellipse(0, 0, px, py, 0, 0, TAU); g.clip(); g.fillStyle = "#7DB25A"; for (let q = -px; q < px; q += 10) g.fillRect(q, -py, 5, py * 2); g.restore(); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; g.strokeRect(-px * 0.78, -py * 0.7, px * 1.56, py * 1.4); g.beginPath(); g.moveTo(0, -py * 0.7); g.lineTo(0, py * 0.7); g.stroke(); g.beginPath(); g.arc(0, 0, py * 0.28, 0, TAU); g.stroke(); }
    else { g.fillStyle = "#D6B27C"; g.beginPath(); g.ellipse(0, 0, px, py, 0, 0, TAU); g.fill(); }
    if (o.roof) { g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, rx + 1, ry + 1, 0, 0, TAU); g.stroke(); }
    for (let q = 0; q < 8; q++) { const a = q / 8 * TAU, mx = Math.cos(a) * (rx + 3), my = Math.sin(a) * (ry + 3); g.fillStyle = "#8A8F98"; g.fillRect(mx - 1.5, my - 1.5, 3, 3); X.lights.push({ x: x + Math.cos(a) * (rx + 3) * Math.cos(o.rot || 0), y: y + Math.sin(a) * (ry + 3), w: 6, h: 6, c: "#FFE9B0", ph: q }); }
    g.restore(); pad(x, y, Math.max(rx, ry) + 8);
  }
  function lot(o = {}) {
    const g = X.g, rnd = X.rnd, w = o.w || 70, h = o.h || 42, s = spot({ r: Math.max(w, h) * 0.6, inside: o.inside, city: o.city, dr: o.dr }); if (!s) return;
    g.save(); g.translate(s[0], s[1]); g.rotate(o.a || (rnd() < 0.5 ? 0 : Math.PI / 2));
    g.fillStyle = SH; g.fillRect(-w / 2 + 3, -h / 2 + 4, w, h); g.fillStyle = "#6D7077"; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 0.8;
    const cars = ["#E9E9EC", "#2B2E36", "#C3433A", "#3C6FB5", "#D9B13E", "#8E949C", "#3E8F6D"];
    for (let q = -w / 2 + 4; q < w / 2 - 3; q += 6) for (const yy of [-h / 2 + 2, h / 2 - 11]) { g.beginPath(); g.moveTo(q, yy); g.lineTo(q, yy + 9); g.stroke(); if (rnd() < 0.62) { g.fillStyle = cars[Math.floor(rnd() * cars.length)]; rrect(g, q + 1, yy + 1.2, 4, 6.6, 1.2); g.fill(); g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(q + 1.6, yy + 2.6, 2.8, 1.6); } }
    g.restore(); pad(s[0], s[1], Math.max(w, h) * 0.6);
  }
  function tents(n, cols, o = {}) {
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 34, inside: o.inside, city: false, dr: o.dr }); if (!s) continue;
      g.fillStyle = "rgba(40,50,20,.14)"; g.beginPath(); g.ellipse(s[0], s[1], 36, 28, 0, 0, TAU); g.fill();
      for (let i = 0; i < 16; i++) {
        const ang = rnd() * TAU, d = Math.sqrt(rnd()) * 26, x = s[0] + Math.cos(ang) * d * 1.2, y = s[1] + Math.sin(ang) * d, c = cols[Math.floor(rnd() * cols.length)], a = rnd() * 3;
        g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = SH; g.fillRect(-4 + 2, -3.4 + 2.4, 8, 6.8); g.fillStyle = mix(c, -0.18); g.fillRect(-4, -3.4, 8, 3.4); g.fillStyle = c; g.fillRect(-4, 0, 8, 3.4); g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(-4, -0.4, 8, 0.8); g.restore();
      }
      pad(s[0], s[1], 34);
    }
  }
  function rocks(n, o = {}) {
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const r = (o.r || 12) * (0.6 + rnd() * 0.9), s = spot({ r: r + 4, inside: o.inside, dr: o.dr, gap: 2 }); if (!s) continue;
      const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rad = r * (0.72 + rnd() * 0.4); pts.push([Math.cos(a) * rad, Math.sin(a) * rad * 0.85]); }
      g.save(); g.translate(s[0], s[1]);
      g.fillStyle = SH; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0] + 4, p[1] + 5) : g.moveTo(p[0] + 4, p[1] + 5))); g.closePath(); g.fill();
      g.fillStyle = o.col || "#9A8F80"; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,.22)"; g.beginPath(); g.moveTo(pts[6][0], pts[6][1]); g.lineTo(pts[7][0], pts[7][1]); g.lineTo(pts[8][0], pts[8][1]); g.lineTo(0, 0); g.closePath(); g.fill();
      g.fillStyle = "rgba(0,0,0,.16)"; g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); g.lineTo(pts[2][0], pts[2][1]); g.lineTo(pts[3][0], pts[3][1]); g.lineTo(0, 0); g.closePath(); g.fill(); g.restore();
      X.excl.push([s[0], s[1], r + 3]);
    }
  }
  function hills(n, o = {}) { // relieve: lomas con luz desde arriba a la izquierda
    const g = X.g, rnd = X.rnd, b = X.bounds;
    for (let k = 0; k < n; k++) {
      const hx = b[0] + rnd() * (b[2] - b[0]), hy = b[1] + rnd() * (b[3] - b[1]), hr = (o.r || 120) * (0.7 + rnd() * 0.8), rg = g.createRadialGradient(hx - hr * 0.25, hy - hr * 0.25, hr * 0.05, hx, hy, hr);
      rg.addColorStop(0, `rgba(255,255,235,${o.light || 0.2})`); rg.addColorStop(0.55, "rgba(255,255,255,0)"); rg.addColorStop(0.8, `rgba(20,30,10,${o.dark || 0.1})`); rg.addColorStop(1, "rgba(20,30,10,0)");
      g.fillStyle = rg; g.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
    }
  }
  function dome(o = {}) {
    const g = X.g, r = o.r || 34, s = spot({ r: r + 8, inside: o.inside, city: o.city, dr: o.dr, wet: false }); if (!s) return null;
    const [x, y] = s; g.save(); g.translate(x, y);
    g.fillStyle = SH; g.beginPath(); g.arc(9, 11, r, 0, TAU); g.fill();
    const rg = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r); rg.addColorStop(0, o.hi || "#F4F6FA"); rg.addColorStop(1, o.lo || "#9CA7B8"); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.strokeStyle = "rgba(60,70,90,.35)"; g.lineWidth = 0.8;
    if (o.geo !== false) { for (let q = 1; q < 6; q++) { g.beginPath(); g.ellipse(0, 0, r, r * q / 6, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(0, 0, r * q / 6, r, 0, 0, TAU); g.stroke(); } }
    g.restore(); pad(x, y, r + 8); return [x, y, r];
  }
  function lake(x, y, rx, ry, col, seed) {  // estanque o laguito con orilla
    const pts = blobPoly(x, y, rx, ry, seed, 36); drawWater(X.g, pts, col, X.bounds, X.rnd); X.wetExtra.push(pts); pad(x, y, Math.max(rx, ry) + 8); return pts;
  }
  function pond(o = {}) {
    const rx = o.rx || 34, ry = o.ry || 22, s = spot({ r: Math.max(rx, ry) + 8, inside: o.inside, dr: o.dr, wet: false }); if (!s) return;
    const pts = lake(s[0], s[1], rx, ry, o.col || X.env.water || "#5CA6C9", Math.floor(s[0] * 7 + s[1]));
    A.push({ t: "glint", pts, n: 26, rnd: mulberry(Math.floor(s[0]) * 31 + Math.floor(s[1])) });
    if (o.fish) A.push({ t: "fish", cx: s[0], cy: s[1], rx: rx * 0.55, ry: ry * 0.5, n: 3 });
  }
  function windmill(n, o = {}) {
    const g = X.g;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 26, inside: o.inside, dr: o.dr }); if (!s) continue;
      g.save(); g.translate(s[0], s[1]); g.fillStyle = SH; g.beginPath(); g.ellipse(14, 16, 12, 6, 0.6, 0, TAU); g.fill();
      g.fillStyle = o.body || "#EFE8DA"; g.beginPath(); g.arc(0, 0, 5.4, 0, TAU); g.fill(); g.fillStyle = o.cap || "#B4483C"; g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); g.fill(); g.restore();
      A.push({ t: "rotor", x: s[0], y: s[1], r: o.len || 20, n: 4, sp: 0.45 + k * 0.09, ph: k * 1.3, w: 2.4 }); pad(s[0], s[1], 26);
    }
  }
  function ferris(o = {}) {
    const g = X.g, r = o.r || 28, s = spot({ r: r + 10, inside: o.inside, dr: o.dr, city: o.city }); if (!s) return;
    const [x, y] = s; g.save(); g.translate(x, y); g.fillStyle = SH; g.beginPath(); g.arc(8, 11, r, 0, TAU); g.fill();
    g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 3; g.beginPath(); g.arc(8, 11, r, 0, TAU); g.stroke(); g.restore();
    A.push({ t: "ferris", x, y, r, n: o.n || 14, sp: 0.1, col: o.col || "#F4F4F4", rim: o.rim || "#C9CED6" }); pad(x, y, r + 10);
  }
  function pump(n, o = {}) {
    const g = X.g;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 20, inside: o.inside, dr: o.dr }); if (!s) continue; const a = X.rnd() * TAU;
      g.save(); g.translate(s[0], s[1]); g.rotate(a); g.fillStyle = SH; g.fillRect(-12 + 3, -2 + 4, 24, 4);
      g.fillStyle = "#5C6370"; g.fillRect(-6, -5, 8, 10); g.fillStyle = "#3C4350"; g.beginPath(); g.arc(-4, 0, 2.6, 0, TAU); g.fill(); g.restore();
      A.push({ t: "pump", x: s[0], y: s[1], a, ph: k * 1.1 }); pad(s[0], s[1], 20);
    }
  }
  function tanks(n, o = {}) {
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 30, inside: o.inside, dr: o.dr }); if (!s) continue;
      const cnt = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < cnt; i++) { const x = s[0] + (i % 2) * 24 + rnd() * 4, y = s[1] + Math.floor(i / 2) * 24, r = 10 + rnd() * 3; g.fillStyle = SH; g.beginPath(); g.arc(x + 4, y + 5, r, 0, TAU); g.fill(); const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); rg.addColorStop(0, "#F4F2EC"); rg.addColorStop(1, "#B7B8B8"); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, r * 0.62, 0, TAU); g.stroke(); }
      pad(s[0] + 12, s[1] + 12, 32);
    }
  }
  function containers(o = {}) {
    const g = X.g, rnd = X.rnd, cols = ["#C8473C", "#2F6FB0", "#E1A736", "#3E8F6D", "#8E949C", "#D9D5CA", "#7B4F9E"];
    for (let k = 0; k < (o.n || 2); k++) {
      const s = spot({ r: 44, dr: o.dr, city: false }); if (!s) continue;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const w = 8, h = 3.6, x = s[0] - 32 + c * (w + 0.8), y = s[1] - 14 + r * (h + 3.2); g.fillStyle = SH; g.fillRect(x + 2, y + 2.4, w, h); const col = cols[Math.floor(rnd() * cols.length)]; g.fillStyle = col; g.fillRect(x, y, w, h); g.fillStyle = "rgba(0,0,0,.2)"; for (let q = 1; q < 4; q++) g.fillRect(x + q * 2, y, 0.5, h); g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(x, y, w, 0.8); }
      pad(s[0], s[1], 44);
    }
  }
  function crane(n) {
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 30, edge: 40, city: false }); if (!s) continue; const a = rnd() * 0.4 - 0.2;
      g.save(); g.translate(s[0], s[1]); g.rotate(a); g.fillStyle = SH; g.fillRect(3, 5, 56, 3); g.fillStyle = "#E1A736"; g.fillRect(0, -1.5, 56, 3); g.fillStyle = "#3E4350"; g.fillRect(-3, -4, 8, 8); g.fillStyle = "#C8473C"; g.fillRect(50, -2.4, 6, 4.8); g.restore(); pad(s[0] + 28, s[1], 34);
    }
  }
  function hangars(n) {
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const w = 54 + rnd() * 20, h = 26, s = spot({ r: w * 0.6, edge: 44, city: false }); if (!s) continue; const a = (rnd() < 0.5 ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.1;
      g.save(); g.translate(s[0], s[1]); g.rotate(a); g.fillStyle = SH; g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
      const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, "#E6E8EC"); gr.addColorStop(0.5, "#C9CED6"); gr.addColorStop(1, "#E6E8EC"); g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h);
      g.strokeStyle = "rgba(60,70,85,.28)"; g.lineWidth = 0.8; for (let q = -w / 2 + 6; q < w / 2; q += 6) { g.beginPath(); g.moveTo(q, -h / 2); g.lineTo(q, h / 2); g.stroke(); }
      g.fillStyle = "#B4483C"; g.fillRect(-w / 2, -h / 2, w, 2); g.restore(); pad(s[0], s[1], w * 0.6);
    }
  }
  function pagoda(o = {}) {
    const g = X.g, s = spot({ r: 30, inside: o.inside, dr: o.dr }); if (!s) return; const [x, y] = s;
    g.save(); g.translate(x, y); g.fillStyle = SH; g.fillRect(-18 + 5, -18 + 7, 36, 36);
    const cols = ["#5C6672", "#6B7683", "#7A8795", "#8B97A3"]; [26, 20, 14, 8].forEach((h, i) => { g.fillStyle = mix(cols[i], -0.25); g.fillRect(-h / 2 - 1, -h / 2 - 1, h + 2, h + 2); g.fillStyle = cols[i]; g.fillRect(-h / 2, -h / 2, h, h / 2); g.fillStyle = mix(cols[i], -0.18); g.fillRect(-h / 2, 0, h, h / 2); });
    g.fillStyle = "#C8473C"; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill(); g.restore(); pad(x, y, 30);
  }
  function torii(o = {}) {
    const g = X.g, s = spot({ r: 14, edge: 40, inside: o.inside }); if (!s) return; const a = X.rnd() * 3;
    g.save(); g.translate(s[0], s[1]); g.rotate(a); g.fillStyle = SH; g.fillRect(-9 + 3, -5 + 3, 18, 3); g.fillStyle = "#D8392F"; g.fillRect(-9, -5, 18, 2.8); g.fillRect(-7, -1, 14, 1.6); g.fillStyle = "#2B2B30"; g.fillRect(-10, -5.6, 20, 1.4); g.fillRect(-6, -4, 1.6, 8); g.fillRect(4.4, -4, 1.6, 8); g.restore(); pad(s[0], s[1], 14);
  }
  function mosque(o = {}) {
    const g = X.g, s = spot({ r: 36, dr: o.dr, city: o.city }); if (!s) return; const [x, y] = s;
    g.save(); g.translate(x, y); g.fillStyle = SH; g.fillRect(-26 + 5, -26 + 7, 52, 52); g.fillStyle = "#E9DFC8"; g.fillRect(-26, -26, 52, 52); g.fillStyle = "#D9CCAA"; g.fillRect(-20, -20, 40, 40);
    const rg = g.createRadialGradient(-5, -5, 2, 0, 0, 16); rg.addColorStop(0, "#F4F9F6"); rg.addColorStop(1, "#6FA69A"); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill();
    for (const [mx, my] of [[-26, -26], [26, -26], [-26, 26], [26, 26]]) { g.fillStyle = SH; g.beginPath(); g.arc(mx + 3, my + 4, 3.4, 0, TAU); g.fill(); g.fillStyle = "#F4EFE2"; g.beginPath(); g.arc(mx, my, 3.2, 0, TAU); g.fill(); g.fillStyle = "#6FA69A"; g.beginPath(); g.arc(mx, my, 1.4, 0, TAU); g.fill(); }
    g.restore(); pad(x, y, 38);
  }
  function villa(o = {}) {
    const g = X.g, s = spot({ r: 56, dr: o.dr, inside: o.inside }); if (!s) return; const [x, y] = s;
    g.save(); g.translate(x, y); g.rotate(o.rot || 0);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (i || j) { g.fillStyle = "#4F8C45"; g.fillRect(i * 34 - 14, j * 26 - 10, 28, 20); g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 0.8; g.strokeRect(i * 34 - 14, j * 26 - 10, 28, 20); }
    g.fillStyle = SH; g.fillRect(-36 + 6, -12 + 8, 72, 24); g.fillStyle = "#EFE6D2"; g.fillRect(-36, -12, 72, 24); g.fillStyle = "#B4483C"; g.fillRect(-36, -12, 72, 11); g.fillStyle = "#8F3A32"; g.fillRect(-36, -1, 72, 12); g.fillStyle = "#EFE6D2"; g.fillRect(-12, -16, 24, 32); g.fillStyle = "#C25A4A"; g.fillRect(-12, -16, 24, 14); g.fillStyle = "#A33F35"; g.fillRect(-12, -2, 24, 14);
    g.fillStyle = "#9FC9D8"; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 1; g.stroke(); g.restore(); pad(x, y, 58);
  }
  function casino(o = {}) {
    const g = X.g, s = spot({ r: 46, dr: o.dr, city: o.city }); if (!s) return; const [x, y] = s;
    g.save(); g.translate(x, y); g.fillStyle = SH; g.fillRect(-32 + 6, -22 + 8, 64, 44); g.fillStyle = "#EDE3CE"; g.fillRect(-32, -22, 64, 44); g.fillStyle = "#6A7F8C"; g.fillRect(-26, -16, 52, 32);
    g.fillStyle = "#E7D6B0"; g.fillRect(-20, -10, 40, 20); g.fillStyle = "#B4483C"; g.fillRect(-32, -22, 64, 3); for (const sx of [-28, 28]) { g.fillStyle = "#9A7A4C"; g.beginPath(); g.arc(sx, -18, 4, 0, TAU); g.fill(); }
    g.strokeStyle = "#6FA69A"; g.lineWidth = 3; g.beginPath(); g.arc(0, 30, 10, 0, TAU); g.stroke(); g.fillStyle = "#9FD0E0"; g.beginPath(); g.arc(0, 30, 8, 0, TAU); g.fill(); g.restore(); pad(x, y + 20, 48);
  }
  function courts(n) {
    const g = X.g;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 28, edge: 44, city: false }); if (!s) continue;
      g.fillStyle = SH; g.fillRect(s[0] - 26 + 3, s[1] - 14 + 3, 52, 28); g.fillStyle = "#C25A3C"; g.fillRect(s[0] - 26, s[1] - 14, 52, 28); g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 0.9; g.strokeRect(s[0] - 22, s[1] - 10, 44, 20); g.beginPath(); g.moveTo(s[0], s[1] - 10); g.lineTo(s[0], s[1] + 10); g.stroke(); pad(s[0], s[1], 30);
    }
  }
  function umbrellas(n, o = {}) { // sombrillas de playa sobre la arena junto a la costa
    const g = X.g, rnd = X.rnd, sh = X.lv.shore; if (!sh) return;
    const cols = ["#E8453C", "#F4C534", "#2F88C8", "#F4F2EC", "#E86FA8", "#2FAE8C"], sd = sh.side === "bottom" ? 1 : sh.side === "top" ? -1 : 0; if (!sd) return;
    for (let k = 0; k < n; k++) {
      const p = sh.pts[Math.floor(rnd() * sh.pts.length)], x = p[0] + (rnd() - 0.5) * 6, y = p[1] - sd * (7 + rnd() * 20); if (x < X.bounds[0] || x > X.bounds[2] || distToRoad(x, y) < X.HW + 52) continue;
      g.fillStyle = "rgba(60,40,10,.25)"; g.beginPath(); g.arc(x + 2.5, y + 3, 4.6, 0, TAU); g.fill(); g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.beginPath(); g.arc(x, y, 4.6, 0, TAU); g.fill();
      g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 0.8; for (let q = 0; q < 3; q++) { const a = q / 3 * Math.PI; g.beginPath(); g.moveTo(x + Math.cos(a) * 4.6, y + Math.sin(a) * 4.6); g.lineTo(x - Math.cos(a) * 4.6, y - Math.sin(a) * 4.6); g.stroke(); }
      g.fillStyle = "#F4EFE2"; g.fillRect(x + 5, y + 2, 3, 6.4); X.excl.push([x, y, 10]);
    }
  }
  function cows(n, o = {}) {
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 14, edge: 40, city: false, noReserve: true }); if (!s) continue; const a = rnd() * TAU;
      g.save(); g.translate(s[0], s[1]); g.rotate(a); g.fillStyle = "rgba(20,30,10,.25)"; g.beginPath(); g.ellipse(1.6, 2.2, 5.2, 2.6, 0, 0, TAU); g.fill(); g.fillStyle = o.sheep ? "#F2EFE6" : "#F4F2EC"; g.beginPath(); g.ellipse(0, 0, 4.8, 2.5, 0, 0, TAU); g.fill();
      if (!o.sheep) { g.fillStyle = "#26262A"; g.beginPath(); g.ellipse(-1, -0.4, 2, 1.4, 0.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(2, 0.8, 1.4, 1, 0, 0, TAU); g.fill(); }
      g.fillStyle = o.sheep ? "#3B3836" : "#26262A"; g.beginPath(); g.arc(4.8, 0, 1.5, 0, TAU); g.fill(); g.restore(); X.excl.push([s[0], s[1], 6]);
    }
  }
  function hay(n) { // pacas redondas
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 9, edge: 40, city: false, noReserve: true }); if (!s) continue;
      g.fillStyle = "rgba(60,40,10,.28)"; g.beginPath(); g.arc(s[0] + 2.4, s[1] + 3, 5.4, 0, TAU); g.fill(); g.fillStyle = "#D8BD6A"; g.beginPath(); g.arc(s[0], s[1], 5.4, 0, TAU); g.fill(); g.strokeStyle = "rgba(120,90,30,.55)"; g.lineWidth = 0.8; for (let q = 1; q < 3; q++) { g.beginPath(); g.arc(s[0], s[1], q * 1.8, 0, TAU); g.stroke(); } X.excl.push([s[0], s[1], 7]);
    }
  }
  function masts(n, o = {}) { // torres de luz (de noche brillan)
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 6, edge: 36, noReserve: false, gap: 14 }); if (!s) continue;
      g.fillStyle = SH; g.beginPath(); g.ellipse(s[0] + 5, s[1] + 7, 6, 2.6, 0.7, 0, TAU); g.fill(); g.fillStyle = "#8A8F98"; g.beginPath(); g.arc(s[0], s[1], 2.6, 0, TAU); g.fill(); g.fillStyle = "#E8EAEE"; g.beginPath(); g.arc(s[0], s[1], 1.4, 0, TAU); g.fill();
      X.lights.push({ x: s[0], y: s[1], w: 3, h: 3, c: o.col || "#FFF1CC", big: 34, ph: rnd() * 6 });
    }
  }
  function palms(n, o = {}) { // grupos de palmeras decorativas
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 22, inside: o.inside, dr: o.dr == null ? X.HW + 54 : o.dr, city: o.city, noReserve: false, gap: 2 }); if (!s) continue;
      const cnt = o.cnt || 4; for (let i = 0; i < cnt; i++) { const x = s[0] + (rnd() - 0.5) * 30, y = s[1] + (rnd() - 0.5) * 24; if (distToRoad(x, y) < X.HW + 46 || wetAt(x, y, 3)) continue; drawTree(g, o.kind || "palm", x, y, 6.5 + rnd() * 3, X.env.tc, rnd); }
    }
  }
  function grove(n, kind, tc, o = {}) { // arboledas de un tipo concreto (cerezos, arces...)
    const g = X.g, rnd = X.rnd;
    for (let k = 0; k < n; k++) {
      const s = spot({ r: 34, inside: o.inside, dr: o.dr == null ? X.HW + 58 : o.dr, city: false, gap: 2 }); if (!s) continue;
      const list = []; for (let i = 0; i < (o.cnt || 14); i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * 32, x = s[0] + Math.cos(a) * d, y = s[1] + Math.sin(a) * d; if (distToRoad(x, y) < X.HW + 46 || wetAt(x, y, 3)) continue; list.push([x, y, 5 + rnd() * 4]); }
      list.sort((a, b) => a[1] - b[1]).forEach((t) => drawTree(g, kind, t[0], t[1], t[2], tc, rnd));
    }
  }
  function fountain(o = {}) {
    const g = X.g, s = spot({ r: 22, dr: o.dr, city: o.city, inside: o.inside }); if (!s) return; const [x, y] = s;
    g.fillStyle = SH; g.beginPath(); g.arc(x + 3, y + 4, 16, 0, TAU); g.fill(); g.fillStyle = "#D9D5CA"; g.beginPath(); g.arc(x, y, 16, 0, TAU); g.fill(); g.fillStyle = "#6FB6D6"; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill();
    A.push({ t: "spray", x, y, h: o.h || 8 }); pad(x, y, 22);
  }
  function river(pts, w, col) { // río o canal (puntos en el mundo), con orilla
    if (WORLD.w > 700) pts = pts.map((p) => [WORLD.w / 2 + (p[0] - 320) * (WORLD.w / 640), p[1]]);   // en la compu el río se estira a lo ancho
    const g = X.g; g.save(); g.lineCap = "round"; g.lineJoin = "round";
    const path = () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
    path(); g.lineWidth = w + 7; g.strokeStyle = "rgba(240,235,215,.85)"; g.stroke(); path(); g.lineWidth = w; g.strokeStyle = col; g.stroke(); path(); g.lineWidth = w * 0.4; g.strokeStyle = "rgba(190,236,246,.28)"; g.stroke(); g.restore();
    X.rivers.push({ pts, w }); A.push({ t: "flow", pts, w });
  }
  function sphereBuilding(o = {}) { // gran cúpula con luces (Las Vegas)
    const d = dome({ r: o.r || 38, hi: "#2B2F4A", lo: "#0F1220", geo: false, city: o.city, dr: o.dr }); if (!d) return;
    A.push({ t: "sphere", x: d[0], y: d[1], r: d[2] });
  }
  function flameTowers(o = {}) { // Baku: tres torres con forma de llama
    const g = X.g, s = spot({ r: 40, dr: o.dr, city: o.city }); if (!s) return; const [x, y] = s;
    [[-20, 8, 18, 34], [0, -6, 22, 42], [20, 8, 18, 34]].forEach(([dx, dy, w, h]) => { g.save(); g.translate(x + dx, y + dy); g.fillStyle = "rgba(10,20,30,.3)"; g.beginPath(); g.ellipse(9, 12, w * 0.7, h * 0.35, 0.6, 0, TAU); g.fill(); const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, "#9FE0F0"); gr.addColorStop(1, "#2F6FA8"); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -h / 2); g.quadraticCurveTo(w / 2, -h / 6, w / 2.4, h / 2); g.lineTo(-w / 2.4, h / 2); g.quadraticCurveTo(-w / 2, -h / 6, 0, -h / 2); g.fill(); g.restore(); });
    A.push({ t: "flames", x, y }); pad(x, y, 46);
  }
  function supertrees(o = {}) { // Singapur: árboles gigantes con luces
    const g = X.g, rnd = X.rnd, s = spot({ r: 46, dr: o.dr, city: false }); if (!s) return;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3, d = 24 + rnd() * 10, x = s[0] + Math.cos(a) * d, y = s[1] + Math.sin(a) * d * 0.9, r = 9 + rnd() * 4; g.fillStyle = "rgba(10,30,20,.3)"; g.beginPath(); g.arc(x + 4, y + 5, r, 0, TAU); g.fill(); const rg = g.createRadialGradient(x - 2, y - 2, 1, x, y, r); rg.addColorStop(0, "#6EC27A"); rg.addColorStop(1, "#2C7A4C"); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 0.8; for (let q = 0; q < 8; q++) { const b = q / 8 * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r); g.stroke(); } X.lights.push({ x, y, w: r, h: r, c: ["#FF5CC8", "#6CFFB5", "#6C9CFF"][i % 3], big: r * 3, ph: i }); }
    pad(s[0], s[1], 48);
  }
  function bigRoof(o = {}) { // Ferrari World (Yas Marina): gran techo rojo con la franja
    const g = X.g, s = spot({ r: 64, dr: o.dr, city: false }); if (!s) return; const [x, y] = s;
    g.save(); g.translate(x, y); g.rotate(-0.3); g.fillStyle = SH; g.beginPath(); g.ellipse(10, 12, 62, 34, 0, 0, TAU); g.fill();
    const gr = g.createLinearGradient(-60, -30, 60, 30); gr.addColorStop(0, "#E8423A"); gr.addColorStop(1, "#B02A25"); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 60, 33, 0, 0, TAU); g.fill();
    g.strokeStyle = "#F4F2EC"; g.lineWidth = 5; g.beginPath(); g.moveTo(-52, 0); g.quadraticCurveTo(0, -22, 52, 0); g.stroke(); g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1; for (let q = -48; q < 50; q += 8) { g.beginPath(); g.moveTo(q, -26); g.lineTo(q, 26); g.stroke(); } g.restore(); pad(x, y, 66);
    X.lights.push({ x, y, w: 40, h: 20, c: "#FF5A4A", big: 70, ph: 1 });
  }
  function ledHotel(o = {}) { // hotel curvo con luces de colores (Yas Marina)
    const g = X.g, s = spot({ r: 50, dr: o.dr, city: false }); if (!s) return; const [x, y] = s;
    g.save(); g.translate(x, y); g.rotate(0.4); g.fillStyle = SH; g.beginPath(); g.ellipse(9, 12, 46, 20, 0, 0, TAU); g.fill();
    g.fillStyle = "#EDEFF2"; g.beginPath(); g.ellipse(0, 0, 44, 18, 0, 0, TAU); g.fill(); g.fillStyle = "#9FB0C2"; g.beginPath(); g.ellipse(0, 0, 34, 11, 0, 0, TAU); g.fill(); g.restore();
    A.push({ t: "led", x, y, rx: 40, ry: 15, rot: 0.4 }); pad(x, y, 52);
  }
  function sands(o = {}) { // Marina Bay Sands: tres torres y un parque en la azotea
    const g = X.g, s = spot({ r: 56, dr: o.dr, city: false }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.rotate(-0.25);
    g.fillStyle = "rgba(20,26,34,.3)"; g.fillRect(-46 + 12, -12 + 16, 92, 26); [-30, 0, 30].forEach((dx) => { g.fillStyle = "#C9D3DD"; g.fillRect(dx - 12, -14, 24, 28); g.fillStyle = "#9FB0C2"; g.fillRect(dx - 9, -11, 18, 22); });
    g.fillStyle = "#EDEFF2"; g.beginPath(); g.ellipse(0, 0, 54, 9, 0, 0, TAU); g.fill(); g.fillStyle = "#5FB4D8"; g.fillRect(-22, -2.4, 40, 4.8); g.restore(); pad(x, y, 58);
    X.lights.push({ x, y, w: 80, h: 10, c: "#FFD27A", big: 70, ph: 2 });
  }

  /* ---------- API de cada circuito ---------- */
  const API = { patch, oval, serviceRoad, speckle, spot, houses, fields, towers, stadium, lot, tents, rocks, hills, dome, pond, windmill, ferris, pump, tanks, containers, crane, hangars, pagoda, torii, mosque, villa, casino, courts, umbrellas, cows, hay, masts, palms, grove, fountain, river, sphereBuilding, flameTowers, supertrees, bigRoof, ledHotel, sands };

  const SCENES = {
    Spielberg: { clouds: 1, build(S) { S.hills(10, { r: 140, light: 0.22, dark: 0.16 }); S.patch(["grass", "grass", "hay", "wheat", "grass"], { fill: 0.75 }); S.serviceRoad(HWo() + 40); S.houses(5, "alp", { cnt: 10 }); S.cows(46); S.hay(16); S.tents(3, ["#F27A21", "#E8E2D2", "#D8392F"]); S.pond({ rx: 26, ry: 16 }); S.speckle(["#F4F2EC", "#F2D24A", "#E8A0C0"], 700); A.push({ t: "birds", n: 6, col: "#2B2B30", sp: 20 }); } },
    Monza: { clouds: 0.5, leaves: ["#C9922E", "#B5651D", "#8E9A3A"], build(S) { S.patch(["grass", "grass", "wheat"], { fill: 0.45 }); S.serviceRoad(HWo() + 42, "#C8BFA8"); S.villa({ rot: 0.3 }); S.villa({ rot: -0.5 }); S.tents(3, ["#D8392F", "#F4F2EC", "#2E8B57"]); S.lot({ w: 84, h: 50 }); S.lot({ w: 70, h: 40 }); S.fountain(); S.pond({ rx: 28, ry: 18 }); S.speckle(["#F4F2EC", "#F2D24A"], 400); A.push({ t: "birds", n: 5, col: "#2B2B30", sp: 16 }); } },
    "Las Vegas": { night: true, neon: ["#FF3C8E", "#35E0FF", "#FFC83C", "#8F5CFF"], clouds: 0, build(S) { S.towers(16, { hgt: 50, w: 30, neon: X.neon, city: true, gap: -4 }); S.sphereBuilding({ r: 44, city: false }); S.ferris({ r: 32, city: false }); S.towers(8, { hgt: 46, w: 28, neon: X.neon, city: false }); S.casino({}); S.casino({}); S.lot({ w: 86, h: 50 }); S.lot({ w: 70, h: 44 }); S.palms(8, { cnt: 5 }); S.rocks(10, { r: 20, col: "#A48F78" }); S.serviceRoad(HWo() + 42, "#8E8A82"); S.speckle(["#6B6254", "#8A7F6A"], 500); A.push({ t: "beams", n: 3 }); A.push({ t: "dust", n: 14, col: "rgba(236,214,170,.5)" }); } },
    Melbourne: { clouds: 0.8, build(S) { S.patch(["grass", "grass"], { fill: 0.5 }); S.oval(2); S.serviceRoad(HWo() + 40, "#CDBE9A"); S.towers(10, { hgt: 44, w: 28, cols: ["#A9B8C7", "#C4CFD9", "#8FA3B8"], city: false }); S.fountain(); S.speckle(["#F4F2EC", "#F2D24A", "#F28FB5"], 500); A.push({ t: "boats", kind: "sail", n: 5 }); A.push({ t: "birds", n: 7, col: "#F4F2EC", sp: 22 }); } },
    Montreal: { clouds: 0.9, leaves: ["#D8542A", "#E69B2B", "#B8341F"], treeTc: ["#B84A22", "#E0802B"], build(S) { S.patch(["grass", "grass", "wheat"], { fill: 0.55 }); S.serviceRoad(HWo() + 40); S.dome({ r: 42, hi: "#F2F6FA", lo: "#8FA3B8" }); S.houses(4, "red", { cnt: 9 }); S.lot({}); S.pond({ rx: 34, ry: 20 }); S.speckle(["#E69B2B", "#B8341F"], 400); A.push({ t: "boats", kind: "cargo", n: 2 }); A.push({ t: "birds", n: 6, col: "#F4F2EC", sp: 20 }); } },
    Sakhir: { clouds: 0.25, wind: true, build(S) { S.patch(["pivot", "solar", "pivot"], { fill: 0.28, cs: 78 }); S.pump(8); S.tanks(3); S.rocks(16, { r: 16, col: "#A58F73" }); S.palms(6, { cnt: 6 }); S.lot({ w: 74, h: 44 }); S.serviceRoad(HWo() + 42, "#C9B48A"); S.speckle(["#B5A074", "#C9B48A", "#8A7F5A"], 700); A.push({ t: "birds", n: 4, col: "#3B3836", sp: 18 }); } },
    Barcelona: { clouds: 0.6, build(S) { S.hills(8, { r: 130, light: 0.2, dark: 0.14 }); S.patch(["olive", "vine", "olive", "wheat", "plow"], { fill: 0.8 }); S.houses(7, "med", { cnt: 12 }); S.lot({ w: 80, h: 48 }); S.serviceRoad(HWo() + 40, "#CDBE9A"); S.speckle(["#F4F2EC", "#E8A0C0", "#F2D24A"], 400); A.push({ t: "birds", n: 6, col: "#2B2B30", sp: 20 }); } },
    Lusail: { night: true, neon: ["#FFC83C", "#35E0FF", "#FF7A3C"], clouds: 0, wind: true, build(S) { S.stadium({ rx: 80, ry: 62, wall: "#D8B864", seats: ["#E9D9A8", "#C9A43E", "#F4F0E2"], roof: true }); S.towers(12, { hgt: 52, w: 28, neon: X.neon, cols: ["#9FB0C2", "#C9D3DD"], city: false }); S.masts(16); S.patch(["solar"], { fill: 0.22, cs: 72 }); S.rocks(8, { r: 16, col: "#B49F80" }); S.lot({ w: 90, h: 52 }); S.serviceRoad(HWo() + 42, "#9A9486"); S.speckle(["#8A7F6A", "#B5A074"], 500); A.push({ t: "beams", n: 2 }); } },
    Silverstone: { clouds: 1.1, build(S) { S.patch(["wheat", "hay", "grass", "plow", "wheat"], { fill: 0.85 }); S.hangars(4); S.tents(6, ["#2E86C1", "#E8E2D2", "#D8392F", "#F2B705", "#2FAE5A"]); S.hay(24); S.serviceRoad(HWo() + 40, "#BDB6A6"); S.lot({ w: 90, h: 54 }); S.houses(2, "red", { cnt: 6 }); S.speckle(["#F4F2EC", "#F2D24A"], 400); A.push({ t: "windsock", pos: S.spot({ r: 8, edge: 70 }) }); A.push({ t: "birds", n: 8, col: "#26262A", sp: 22 }); } },
    Miami: { clouds: 0.5, neon: ["#FF7AB8", "#4FD8E6"], build(S) { S.patch(["grass"], { fill: 0.4 }); S.stadium({ rx: 78, ry: 60, wall: "#EDEFF2", seats: ["#2FB7C2", "#FFFFFF", "#F28C9E"] }); S.towers(10, { hgt: 42, w: 28, cols: ["#F5B5C8", "#8FD6DD", "#F4E3B8", "#E9EEF2"], city: false }); S.palms(10, { cnt: 5 }); S.lot({ w: 90, h: 52 }); S.lot({ w: 70, h: 42 }); S.serviceRoad(HWo() + 40, "#D8D2C2"); A.push({ t: "boats", kind: "yacht", n: 4 }); A.push({ t: "birds", n: 7, col: "#F4F2EC", sp: 22 }); } },
    Shanghai: { clouds: 0.5, neon: ["#FF4C7A", "#4FD8FF", "#FFD25C"], build(S) { S.towers(18, { hgt: 66, w: 28, cols: ["#9FB2C4", "#B7C3CE", "#8FA3B8", "#A9B8C7"], city: false }); S.patch(["grass", "paddy"], { fill: 0.3 }); S.dome({ r: 28, hi: "#E8B8C8", lo: "#B15A7A" }); S.pagoda(); S.lot({}); S.serviceRoad(HWo() + 40, "#C9C4B8"); S.fountain(); A.push({ t: "boats", kind: "sail", n: 3 }); A.push({ t: "birds", n: 6, col: "#2B2B30", sp: 20 }); } },
    "Yas Marina": { night: true, neon: ["#FF5CC8", "#35E0FF", "#FFD25C", "#8F5CFF"], clouds: 0, wind: true, build(S) { S.bigRoof({}); S.ledHotel({}); S.towers(10, { hgt: 48, w: 28, neon: X.neon, cols: ["#C9D3DD", "#9FB0C2"], city: false }); S.palms(10, { cnt: 5 }); S.masts(12); S.lot({ w: 90, h: 52 }); S.serviceRoad(HWo() + 42, "#A39D8F"); S.speckle(["#B5A074", "#8A7F5A"], 500); A.push({ t: "boats", kind: "yacht", n: 5 }); A.push({ t: "beams", n: 3 }); } },
    Austin: { clouds: 1.1, wind: true, build(S) { S.patch(["bluebonnet", "grass", "wheat", "plow", "bluebonnet"], { fill: 0.8 }); S.windmill(3, { len: 15, body: "#B4B8BE", cap: "#7A808A" }); S.tanks(2); S.tents(4, ["#2E86C1", "#E8E2D2", "#E28A2C"]); S.hay(18); S.cows(24); S.houses(2, "red", { cnt: 5 }); S.lot({}); S.serviceRoad(HWo() + 40, "#C9B48A"); S.speckle(["#4C5FB5", "#F4F2EC", "#E8A0C0"], 700); A.push({ t: "birds", n: 5, col: "#2B2B30", sp: 18 }); } },
    "Mexico City": { clouds: 0.7, build(S) { S.patch(["grass"], { fill: 0.35 }); S.stadium({ rx: 72, ry: 58, wall: "#CFC9BA", seats: ["#E8453C", "#F4C534", "#3F9F6A"], pitch: false }); S.houses(10, "tropic", { cnt: 14, w: 17 }); S.fountain({}); S.lot({}); S.serviceRoad(HWo() + 40, "#CDBE9A"); S.speckle(["#E8453C", "#F4C534", "#E052A0"], 500); A.push({ t: "birds", n: 8, col: "#6B7077", sp: 20 }); } },
    Interlagos: { clouds: 1.3, fog: 0.6, build(S) { S.hills(10, { r: 140, light: 0.16, dark: 0.2 }); S.patch(["grass", "plow", "grass"], { fill: 0.4 }); S.houses(12, "tropic", { cnt: 16, w: 15 }); S.pond({ rx: 44, ry: 28 }); S.tents(3, ["#2FAE5A", "#F4D03F", "#2E6FD8"]); S.serviceRoad(HWo() + 40, "#B5651D"); S.speckle(["#F2D24A", "#E052A0", "#F4F2EC"], 600); A.push({ t: "birds", n: 7, col: "#2FAE5A", sp: 18 }); } },
    Zandvoort: { clouds: 1, wind: true, build(S) { S.patch(["tulip", "tulip", "grass", "wheat"], { fill: 0.8 }); S.umbrellas(40); S.windmill(4, { len: 26 }); S.houses(4, "red", { cnt: 9 }); S.serviceRoad(HWo() + 40, "#E3D6B8"); S.speckle(["#F4F2EC", "#8FA070"], 600); A.push({ t: "boats", kind: "sail", n: 4 }); A.push({ t: "birds", n: 9, col: "#F4F2EC", sp: 24 }); } },
    Jeddah: { night: true, neon: ["#FFD27A", "#4FD8E6", "#FF8A5C"], clouds: 0, wind: true, build(S) { S.towers(14, { hgt: 52, w: 28, neon: X.neon, cols: ["#E8E0CE", "#D8CFB8", "#C9D3DD"], city: false }); S.mosque({ city: false }); S.fountain({ h: 14 }); S.palms(9, { cnt: 5 }); S.containers({ n: 3 }); S.masts(12); S.lot({}); S.serviceRoad(HWo() + 42, "#A39D8F"); A.push({ t: "boats", kind: "dhow", n: 5 }); } },
    Baku: { clouds: 0.5, wind: true, neon: ["#FF8A3C", "#4FD8E6"], build(S) { S.flameTowers({ city: false }); S.towers(12, { hgt: 42, w: 26, cols: ["#D9C9A4", "#CDB98F", "#E3D6B8"], city: false }); S.pump(6); S.tanks(3); S.lot({}); S.palms(5, { cnt: 4 }); S.serviceRoad(HWo() + 40, "#C9B48A"); S.rocks(6, { r: 14, col: "#A58F73" }); A.push({ t: "boats", kind: "cargo", n: 3 }); A.push({ t: "birds", n: 7, col: "#F4F2EC", sp: 22 }); } },
    Madrid: { clouds: 0.7, build(S) { S.patch(["grass", "olive"], { fill: 0.3 }); S.stadium({ rx: 62, ry: 62, wall: "#D9B88C", seats: ["#C25A3C", "#EFE6D2"], pitch: false }); S.towers(10, { hgt: 40, w: 28, cols: ["#C9B8A0", "#B8A68C"], city: false }); S.houses(7, "med", { cnt: 12 }); S.lot({ w: 100, h: 60 }); S.fountain({}); S.serviceRoad(HWo() + 40, "#CDBE9A"); A.push({ t: "birds", n: 8, col: "#6B7077", sp: 20 }); } },
    Hungaroring: { clouds: 0.8, build(S) { S.hills(10, { r: 130, light: 0.2, dark: 0.14 }); S.patch(["sun", "sun", "wheat", "grass", "lavender", "sun"], { fill: 0.88 }); S.houses(4, "red", { cnt: 9 }); S.pond({ rx: 40, ry: 26 }); S.hay(22); S.serviceRoad(HWo() + 40, "#CDBE9A"); S.speckle(["#F4F2EC", "#F2D24A"], 500); A.push({ t: "balloon" }); A.push({ t: "birds", n: 6, col: "#2B2B30", sp: 20 }); } },
    Suzuka: { clouds: 0.7, petals: ["#F9C7D6", "#F4A7C0", "#FFFFFF"], treeTc: ["#E88AAE", "#F9C7D6"], build(S) { S.patch(["paddy", "paddy", "grass"], { fill: 0.7 }); S.grove(10, "cherry", ["#E88AAE", "#F9C7D6"], { cnt: 20 }); S.ferris({ r: 34, inside: true }); S.pagoda(); S.torii(); S.houses(5, "jp", { cnt: 10 }); S.pond({ rx: 44, ry: 28, fish: true }); S.serviceRoad(HWo() + 40, "#D8CFB8"); S.speckle(["#F9C7D6", "#FFFFFF"], 700); A.push({ t: "birds", n: 5, col: "#2B2B30", sp: 18 }); } },
    Singapore: { night: true, neon: ["#FF5CC8", "#35E0FF", "#FFD25C", "#6CFFB5"], clouds: 0, build(S) { S.sands({}); S.ferris({ r: 38, city: false, col: "#E9EEF4" }); S.supertrees({}); S.towers(18, { hgt: 62, w: 28, neon: X.neon, cols: ["#9FB2C4", "#B7C3CE", "#8FA3B8"], city: false }); S.containers({ n: 3 }); S.crane(3); S.palms(6, { cnt: 4 }); S.serviceRoad(HWo() + 40, "#9A9486"); A.push({ t: "boats", kind: "yacht", n: 4 }); A.push({ t: "beams", n: 2 }); } },
    Spa: { clouds: 1.2, fog: 1, leaves: ["#C9922E", "#B5651D", "#A64B2A"], build(S) { S.hills(12, { r: 140, light: 0.16, dark: 0.2 }); S.patch(["grass", "grass", "hay"], { fill: 0.45 }); S.houses(4, "alp", { cnt: 9 }); S.cows(26); S.tents(4, ["#F27A21", "#2E86C1", "#E8E2D2", "#2FAE5A"]); S.river([[-200, 250], [120, 290], [250, 240], [420, 280], [800, 250]], 16, "#6FA0B8"); S.serviceRoad(HWo() + 40, "#A8A08C"); S.speckle(["#C9922E", "#A64B2A"], 500); A.push({ t: "birds", n: 5, col: "#2B2B30", sp: 18 }); } },
    Monaco: { clouds: 0.5, neon: ["#FFD27A"], build(S) { S.casino({ city: false }); S.courts(3); S.towers(16, { hgt: 46, w: 28, cols: ["#E9E0CC", "#D8C9A8", "#F2EBDD", "#C98B5A"], city: false }); S.houses(5, "med", { cnt: 12 }); S.palms(8, { cnt: 4 }); S.fountain({}); S.serviceRoad(HWo() + 38, "#CDBE9A"); A.push({ t: "boats", kind: "yacht", n: 6 }); A.push({ t: "birds", n: 7, col: "#F4F2EC", sp: 22 }); } },
  };
  const HWo = () => X.HW;

  const EXT = [], ADD = {};
  const helpers = { get X() { return X; }, get A() { return A; }, spot, pad, SH, TAU, hexA: (h, a) => hexA(h, a), inLoop, inCity, wetAt, pick, house, tower, mulberry: (n) => mulberry(n) };

  /* ---------- construcción ---------- */
  function build(c) {
    A = []; placed = []; X = Object.assign({ lights: [], wetExtra: [], rivers: [] }, c);
    X.def = SCENES[c.lv.name] || ADD[c.lv.name] || ADD[c.lv.scene] || {}; X.neon = X.def.neon || ["#FFC83C", "#35E0FF"];
    X.bounds = c.bounds; X.nightForced = !!X.def.night;
    X.vis = [-OX / SC + 8, -OY / SC + 8, (VW - OX) / SC - 8, (VH - OY) / SC - 8];                                  // lo que se ve en pantalla
    X.play = [-OX / SC + 18, (SAFE.t + 118 - OY) / SC, (VW - OX) / SC - 18, (VH - SAFE.b - 96 - OY) / SC];            // la zona de juego (sin los chips ni el botón)
    const water = [...(c.lv.water || []), ...c.lakes];
    A.push({ t: "clouds", k: X.def.clouds == null ? 0.6 : X.def.clouds });
    water.forEach((pts, i) => A.push({ t: "glint", pts, n: 70, rnd: mulberry(hash2(c.lv.id, 700 + i)) }));
    if (c.lv.shore) A.push({ t: "foam", sh: c.lv.shore });
    if (X.def.leaves) A.push({ t: "leaves", cols: X.def.leaves, n: 18 });
    if (X.def.petals) A.push({ t: "leaves", cols: X.def.petals, n: 26, petal: true });
    if (X.def.wind) A.push({ t: "dust", n: 16, col: "rgba(238,218,176,.45)" });
    if (X.def.fog) A.push({ t: "fog", k: X.def.fog });
    // de noche (o en circuitos nocturnos), las orillas de lagos y agua se oscurecen igual que el resto
    // el agua cuenta como zona ocupada
    const prevWet = c.wet; X.wet = (x, y) => prevWet(x, y) || X.wetExtra.some((p) => inPoly(x, y, p)) || X.rivers.some((rv) => { for (let i = 1; i < rv.pts.length; i++) { const a = rv.pts[i - 1], b = rv.pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2, 0, 1); if (hyp(x - (a[0] + dx * t), y - (a[1] + dy * t)) < rv.w / 2 + 8) return true; } return false; });
    X.water = water;
    const S = Object.assign({}, API); EXT.forEach((f) => Object.assign(S, f(helpers)));
    if (X.def.build) X.def.build(S);
    // animaciones que dependen del agua (barcos)
    A.filter((a) => a.t === "boats").forEach((a) => prepBoats(a));
    return { blocked: (x, y) => placed.some((p) => hyp(x - p[0], y - p[1]) < p[2]), treeTc: X.def.treeTc, treeKind: X.def.treeKind, treeMul: X.def.treeMul, night: !!X.def.night };
  }
  const SCN = () => X;
  function boatSpots(a) { // trayectorias de barcos: líneas rectas dentro del agua (cualquier lago o la orilla)
    const rnd = mulberry(hash2(X.lv.id, 99)), out = [], b = X.bounds;
    for (let tries = 0; tries < 500 && out.length < a.n; tries++) {
      const x = b[0] + rnd() * (b[2] - b[0]), y = b[1] + rnd() * (b[3] - b[1]); if (!X.wet(x, y)) continue;
      const ang = (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 0.3, L = 70 + rnd() * 90; let ok = true;
      for (let q = 0; q <= 6; q++) { const px = x + Math.cos(ang) * L * q / 6, py = y + Math.sin(ang) * L * q / 6; if (!X.wet(px, py, 8) || distToRoad(px, py) < X.HW + 40) { ok = false; break; } }
      if (ok && !out.some((o) => hyp(o.x - x, o.y - y) < 40)) out.push({ x, y, ang, L, ph: rnd(), sp: 5 + rnd() * 7 });
    }
    return out;
  }
  function prepBoats(a) { a.list = boatSpots(a); }

  /* ---------- luces nocturnas (se llama después de oscurecer el fondo) ---------- */
  function nightLights(g) {
    if (!X) return;
    g.save(); g.globalCompositeOperation = "lighter";
    for (const l of X.lights) {
      const R = l.big ? l.big * 0.8 : Math.max(l.w, l.h) * 1.15, rg = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, R);
      rg.addColorStop(0, hexA(l.c, l.big ? 0.42 : 0.5)); rg.addColorStop(1, hexA(l.c, 0)); g.fillStyle = rg; g.fillRect(l.x - R, l.y - R, R * 2, R * 2);
    }
    g.restore();
  }
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  /* ---------- animación ---------- */
  let cloudTex = null, last = 0;
  function cloudPattern() {
    if (cloudTex) return cloudTex;
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), rnd = mulberry(77);
    for (let i = 0; i < 9; i++) { const x = rnd() * 256, y = rnd() * 256, r = 30 + rnd() * 42; for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { const rg = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); rg.addColorStop(0, "rgba(20,30,40,.55)"); rg.addColorStop(1, "rgba(20,30,40,0)"); g.fillStyle = rg; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); } }
    return (cloudTex = c);
  }
    function anim(g, T) {
    if (!X) return; const dt = Math.min(0.05, T - last || 0.016); last = T; const b = X.bounds, W = b[2] - b[0], H = b[3] - b[1], night = X.nightForced || resolvedTheme() === "dark";
    for (const a of A) {
      switch (a.t) {
        case "clouds": { if (night || reduceMotion || a.k <= 0) break; const p = (a.pat || (a.pat = g.createPattern(cloudPattern(), "repeat"))); g.save(); g.globalAlpha = 0.13 * a.k; g.translate((T * 6) % 512, (T * 2.5) % 512); g.scale(2, 2); g.fillStyle = p; g.fillRect(-300, -300, (W + 700) / 2, (H + 700) / 2); g.restore(); break; }
        case "glint": { if (!a.pts) break; if (!a.spots) { a.spots = []; const bx = a.pts.reduce((m, p) => [Math.min(m[0], p[0]), Math.min(m[1], p[1]), Math.max(m[2], p[0]), Math.max(m[3], p[1])], [1e9, 1e9, -1e9, -1e9]); for (let k = 0; k < a.n * 4 && a.spots.length < a.n; k++) { const x = Math.max(bx[0], b[0]) + a.rnd() * (Math.min(bx[2], b[2]) - Math.max(bx[0], b[0])), y = Math.max(bx[1], b[1]) + a.rnd() * (Math.min(bx[3], b[3]) - Math.max(bx[1], b[1])); if (inPoly(x, y, a.pts)) a.spots.push([x, y, a.rnd() * 6.3, 0.6 + a.rnd() * 1.4]); } } g.save(); g.lineCap = "round"; g.lineWidth = 1.1; for (const s of a.spots) { const v = Math.sin(T * s[3] + s[2]); if (v < 0.2) continue; g.strokeStyle = `rgba(255,255,255,${(v - 0.2) * 0.8})`; const l = 3 + v * 4; g.beginPath(); g.moveTo(s[0] - l, s[1]); g.lineTo(s[0] + l, s[1]); g.stroke(); } g.restore(); break; }
        case "foam": { const sh = a.sh, sd = sh.side === "bottom" ? 1 : sh.side === "top" ? -1 : 0; if (!sd) break; g.save(); g.lineCap = "round"; g.lineJoin = "round"; for (let k = 0; k < 3; k++) { const ph = (T * 0.35 + k / 3) % 1, off = sd * (3 + ph * 22), al = (1 - ph) * 0.55 * Math.min(1, ph * 6); g.strokeStyle = `rgba(255,255,255,${al})`; g.lineWidth = 2.4 - ph * 1.4; g.beginPath(); let st = false; for (const p of sh.pts) { if (p[0] < b[0] - 20 || p[0] > b[2] + 20) continue; const y = p[1] + off + Math.sin(p[0] * 0.07 + T * 1.2 + k) * 2.2; st ? g.lineTo(p[0], y) : g.moveTo(p[0], y); st = true; } g.stroke(); } g.restore(); break; }
        case "flow": { g.save(); g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1.2; g.setLineDash([6, 22]); g.lineDashOffset = -T * 9; g.beginPath(); a.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.restore(); break; }
        case "rotor": { g.save(); g.translate(a.x, a.y); g.rotate(a.ph + T * a.sp); g.fillStyle = "#F4F1E8"; g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 0.6; for (let k = 0; k < a.n; k++) { g.save(); g.rotate(k / a.n * TAU); g.fillStyle = "rgba(20,30,10,.2)"; g.fillRect(2 + 2, -a.w / 2 + 3, a.r, a.w); g.fillStyle = "#F4F1E8"; g.fillRect(2, -a.w / 2, a.r, a.w); g.strokeRect(2, -a.w / 2, a.r, a.w); g.restore(); } g.fillStyle = "#8A8F98"; g.beginPath(); g.arc(0, 0, 2, 0, TAU); g.fill(); g.restore(); break; }
        case "ferris": { g.save(); g.translate(a.x, a.y); g.strokeStyle = a.rim; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, a.r, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, a.r * 0.62, 0, TAU); g.lineWidth = 0.8; g.stroke(); g.rotate(T * a.sp); for (let k = 0; k < a.n; k++) { const an = k / a.n * TAU; g.strokeStyle = "rgba(140,150,165,.9)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an) * a.r, Math.sin(an) * a.r); g.stroke(); g.fillStyle = "rgba(20,26,34,.25)"; g.beginPath(); g.arc(Math.cos(an) * a.r + 2.4, Math.sin(an) * a.r + 3, 3, 0, TAU); g.fill(); g.fillStyle = k % 3 === 0 ? "#E8453C" : k % 3 === 1 ? "#F4C534" : a.col; g.beginPath(); g.arc(Math.cos(an) * a.r, Math.sin(an) * a.r, 3, 0, TAU); g.fill(); } g.fillStyle = "#8A8F98"; g.beginPath(); g.arc(0, 0, 2.4, 0, TAU); g.fill(); g.restore(); if (night) { g.save(); g.globalCompositeOperation = "lighter"; g.translate(a.x, a.y); g.rotate(T * a.sp); for (let k = 0; k < a.n; k++) { const an = k / a.n * TAU, cols = ["#FF5CC8", "#35E0FF", "#FFD25C"]; g.fillStyle = hexA(cols[k % 3], 0.7); g.beginPath(); g.arc(Math.cos(an) * a.r, Math.sin(an) * a.r, 3.4, 0, TAU); g.fill(); } g.restore(); } break; }
        case "pump": { g.save(); g.translate(a.x, a.y); g.rotate(a.a); const sw = Math.sin(T * 1.4 + a.ph) * 0.32; g.rotate(sw * 0.0); g.fillStyle = "#3C4350"; const l = 11 + sw * 5; g.fillStyle = "rgba(20,26,34,.25)"; g.fillRect(-l + 2.4, -1.4 + 3, l * 2, 2.8); g.fillStyle = "#4B5563"; g.fillRect(-l, -1.4, l * 2, 2.8); g.fillStyle = "#E1A736"; g.beginPath(); g.arc(l, 0, 2.4, 0, TAU); g.fill(); g.restore(); break; }
        case "boats": { if (!a.list) break; for (const s of a.list) { const u = (s.ph + T * s.sp / s.L) % 2, k = u < 1 ? u : 2 - u, dir = u < 1 ? 1 : -1, x = s.x + Math.cos(s.ang) * s.L * k, y = s.y + Math.sin(s.ang) * s.L * k + Math.sin(T * 1.6 + s.ph * 9) * 0.8; g.save(); g.translate(x, y); g.rotate(s.ang + (dir > 0 ? 0 : Math.PI)); drawBoat(g, a.kind, s); g.restore(); } break; }
        case "birds": { if (reduceMotion) break; const cyc = 34, u = ((T + (a.off || (a.off = Math.random() * 20))) % cyc) / cyc, x = b[0] - 60 + (W + 120) * u, y0 = b[1] + H * (0.22 + 0.12 * Math.sin(a.n)) ; g.save(); for (let k = 0; k < a.n; k++) { const bx = x - k * 13 + (k % 2) * 6, by = y0 + Math.sin(k * 2.3) * 22 + k * 9, fl = Math.sin(T * 9 + k) * 0.6; g.fillStyle = "rgba(0,0,0,.14)"; g.save(); g.translate(bx + 12, by + 22); wing(g, fl); g.restore(); g.fillStyle = a.col; g.save(); g.translate(bx, by); wing(g, fl); g.restore(); } g.restore(); break; }
        case "leaves": { const ps = a.ps || (a.ps = Array.from({ length: a.n }, (_, i) => ({ x: b[0] + Math.random() * W, y: b[1] + Math.random() * H, vx: 6 + Math.random() * 10, vy: 9 + Math.random() * 12, r: Math.random() * 6, vr: (Math.random() - 0.5) * 3, c: a.cols[i % a.cols.length], s: (a.petal ? 1.8 : 2.6) + Math.random() * 1.6, ph: Math.random() * 6 }))); for (const p of ps) { p.x += (p.vx + Math.sin(T * 1.3 + p.ph) * 6) * dt; p.y += p.vy * dt; p.r += p.vr * dt; if (p.y > b[3] + 10) { p.y = b[1] - 10; p.x = b[0] + Math.random() * W; } if (p.x > b[2] + 10) p.x = b[0] - 10; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, TAU); g.fill(); g.restore(); } break; }
        case "dust": { const ps = a.ps || (a.ps = Array.from({ length: a.n }, () => ({ x: b[0] + Math.random() * W, y: b[1] + Math.random() * H, v: 30 + Math.random() * 40, l: 14 + Math.random() * 30 }))); g.save(); g.strokeStyle = a.col; g.lineWidth = 1.2; g.lineCap = "round"; for (const p of ps) { p.x += p.v * dt; if (p.x > b[2] + 40) { p.x = b[0] - 40; p.y = b[1] + Math.random() * H; } g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.l, p.y - p.l * 0.1); g.stroke(); } g.restore(); break; }
        case "fog": { if (night) break; g.save(); for (let k = 0; k < 6; k++) { const x = b[0] + (((k * 173 + T * 5) % (W + 300)) - 150), y = b[1] + ((k * 291) % H), R = 120 + (k % 3) * 40, rg = g.createRadialGradient(x, y, 0, x, y, R); rg.addColorStop(0, `rgba(235,240,245,${0.28 * a.k})`); rg.addColorStop(1, "rgba(235,240,245,0)"); g.fillStyle = rg; g.fillRect(x - R, y - R, R * 2, R * 2); } g.restore(); break; }
        case "balloon": { const cyc = 70, u = ((T + 12) % cyc) / cyc, x = b[0] + W * (1.1 - 1.2 * u), y = b[1] + H * (0.3 + 0.1 * Math.sin(u * 5)); g.save(); g.fillStyle = "rgba(20,30,10,.2)"; g.beginPath(); g.ellipse(x + 26, y + 36, 11, 12, 0, 0, TAU); g.fill(); const cols = ["#E8453C", "#F4C534", "#2F88C8", "#F4F2EC", "#3FAE6A"]; for (let k = 0; k < 5; k++) { g.fillStyle = cols[k]; g.beginPath(); g.ellipse(x + (k - 2) * 2.6, y, 5, 13, 0, 0, TAU); g.fill(); } g.fillStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.ellipse(x - 3, y - 4, 3, 6, 0, 0, TAU); g.fill(); g.fillStyle = "#6B4B31"; g.fillRect(x - 1.6, y + 14, 3.2, 3); g.restore(); break; }
        case "windsock": { const s = a.pos; if (!s) break; g.save(); g.translate(s[0], s[1]); g.fillStyle = "#EDEFF2"; g.beginPath(); g.arc(0, 0, 2, 0, TAU); g.fill(); g.rotate(0.3 + Math.sin(T * 1.7) * 0.18); for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? "#F4F2EC" : "#E8643C"; g.fillRect(2 + k * 3.2, -1.8 + k * 0.1, 3.2, 3.6 - k * 0.5); } g.restore(); break; }
        case "sphere": { g.save(); g.translate(a.x, a.y); g.globalCompositeOperation = "lighter"; const cols = ["#FF3C8E", "#35E0FF", "#FFC83C", "#8F5CFF"], c1 = cols[Math.floor(T * 0.5) % 4], c2 = cols[(Math.floor(T * 0.5) + 1) % 4], f = (T * 0.5) % 1; for (let k = 0; k < 14; k++) { const an = k / 14 * TAU + T * 0.4, rr2 = a.r * (0.2 + 0.7 * ((k * 0.37 + T * 0.2) % 1)); g.fillStyle = hexA(f < 0.5 ? c1 : c2, 0.5); g.beginPath(); g.arc(Math.cos(an) * rr2 * 0.8, Math.sin(an) * rr2 * 0.8, 2.6, 0, TAU); g.fill(); } const rg = g.createRadialGradient(0, 0, 0, 0, 0, a.r * 1.2); rg.addColorStop(0, hexA(c1, 0.35)); rg.addColorStop(1, hexA(c1, 0)); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, a.r * 1.2, 0, TAU); g.fill(); g.restore(); break; }
        case "flames": { g.save(); g.globalCompositeOperation = "lighter"; [[-20, 8], [0, -6], [20, 8]].forEach(([dx, dy], k) => { const fl = 0.55 + 0.45 * Math.sin(T * 5 + k * 2) * Math.sin(T * 3.3 + k); const rg = g.createRadialGradient(a.x + dx, a.y + dy, 0, a.x + dx, a.y + dy, 22); rg.addColorStop(0, `rgba(255,${140 + 60 * fl},60,${0.5 * fl})`); rg.addColorStop(1, "rgba(255,90,40,0)"); g.fillStyle = rg; g.fillRect(a.x + dx - 24, a.y + dy - 24, 48, 48); }); g.restore(); break; }
        case "led": { g.save(); g.translate(a.x, a.y); g.rotate(a.rot); g.globalCompositeOperation = "lighter"; const cols = ["#FF5CC8", "#35E0FF", "#FFD25C", "#8F5CFF", "#6CFFB5"]; for (let k = 0; k < 20; k++) { const an = k / 20 * TAU; g.fillStyle = hexA(cols[(k + Math.floor(T * 3)) % 5], 0.7); g.beginPath(); g.arc(Math.cos(an) * a.rx, Math.sin(an) * a.ry, 2.4, 0, TAU); g.fill(); } g.restore(); break; }
        case "beams": { if (!night) break; g.save(); g.globalCompositeOperation = "lighter"; for (let k = 0; k < a.n; k++) { const px = b[0] + W * (0.2 + 0.3 * k), py = b[1] + H * (0.12 + 0.25 * (k % 2)), an = -1.57 + Math.sin(T * 0.4 + k * 2) * 0.9, L = 420; const gr = g.createLinearGradient(px, py, px + Math.cos(an) * L, py + Math.sin(an) * L); gr.addColorStop(0, "rgba(255,255,255,.2)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(an - 0.04) * L, py + Math.sin(an - 0.04) * L); g.lineTo(px + Math.cos(an + 0.04) * L, py + Math.sin(an + 0.04) * L); g.closePath(); g.fill(); } g.restore(); break; }
        case "spray": { if (a.auto) break; g.save(); g.fillStyle = "rgba(255,255,255,.75)"; for (let k = 0; k < 10; k++) { const an = k / 10 * TAU, ph = (T * 0.9 + k * 0.37) % 1, r2 = a.h * ph; g.globalAlpha = 1 - ph; g.beginPath(); g.arc(a.x + Math.cos(an) * r2, a.y + Math.sin(an) * r2, 1.4, 0, TAU); g.fill(); } g.restore(); break; }
        case "fish": { g.save(); g.fillStyle = "#F28A3C"; for (let k = 0; k < a.n; k++) { const an = T * 0.35 + k * 2.1, x = a.cx + Math.cos(an) * a.rx, y = a.cy + Math.sin(an * 1.3) * a.ry; g.save(); g.translate(x, y); g.rotate(an + 1.57); g.globalAlpha = 0.85; g.beginPath(); g.ellipse(0, 0, 3.4, 1.4, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-3, 0); g.lineTo(-5.4, -1.4 + Math.sin(T * 8 + k)); g.lineTo(-5.4, 1.4); g.fill(); g.restore(); } g.restore(); break; }
        case "steam": { const ps = a.ps || (a.ps = Array.from({ length: 9 }, (_, i) => ({ ph: i / 9 }))); g.save(); for (const p of ps) { const u = (T * 0.16 + p.ph) % 1, x = a.x + u * 34 + Math.sin(u * 6 + p.ph * 9) * 3, y = a.y - u * 52, r = 3 + u * 11; g.fillStyle = `rgba(245,245,247,${0.5 * (1 - u)})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } g.restore(); break; }
        case "vehicle": { const P = a.pts; if (!P || P.length < 3) break; if (!a.cum) { a.cum = [0]; for (let i = 1; i < P.length; i++) a.cum.push(a.cum[i - 1] + hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); } const Ln = a.cum[a.cum.length - 1], u = ((T * a.sp + a.off) % (2 * Ln)), d = u < Ln ? u : 2 * Ln - u, dir = u < Ln ? 1 : -1; let k = 1; while (k < P.length - 1 && a.cum[k] < d) k++; const f = (d - a.cum[k - 1]) / ((a.cum[k] - a.cum[k - 1]) || 1), x = P[k - 1][0] + (P[k][0] - P[k - 1][0]) * f, y = P[k - 1][1] + (P[k][1] - P[k - 1][1]) * f, ang = Math.atan2(P[k][1] - P[k - 1][1], P[k][0] - P[k - 1][0]) + (dir > 0 ? 0 : Math.PI); g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = "rgba(20,26,34,.28)"; g.fillRect(-a.len / 2 + 2, -a.wid / 2 + 3, a.len, a.wid); g.fillStyle = a.col; rrect(g, -a.len / 2, -a.wid / 2, a.len, a.wid, 1.6); g.fill(); g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(-a.len / 2 + 2, -a.wid / 2 + 1, a.len - 4, 1.2); g.fillStyle = "rgba(20,30,40,.55)"; g.fillRect(a.len * 0.18, -a.wid / 2 + 1.2, a.len * 0.22, a.wid - 2.4); g.restore(); break; }
        case "flags": { drawFlags(g, T); break; }
      }
    }
  }
  const wing = (g, fl) => { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-3, -4 - fl * 3, -7, -1 - fl * 4); g.lineTo(-2, 1); g.quadraticCurveTo(-3, 4 + fl * 3, -7, 1 + fl * 4); g.lineTo(0, 0); g.fill(); g.beginPath(); g.ellipse(1, 0, 2.6, 1.3, 0, 0, TAU); g.fill(); };
  function drawBoat(g, kind, s) {
    g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-30, -6); g.lineTo(-30, 6); g.closePath(); g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1;
    if (kind === "sail") { g.fillStyle = "rgba(10,40,60,.22)"; g.beginPath(); g.ellipse(2, 3, 9, 3, 0, 0, TAU); g.fill(); g.fillStyle = "#F4F2EC"; g.beginPath(); g.ellipse(0, 0, 9, 2.8, 0, 0, TAU); g.fill(); g.fillStyle = "#F7F7F5"; g.beginPath(); g.moveTo(-3, 0); g.lineTo(6, -7); g.lineTo(6, 0); g.fill(); g.fillStyle = "#E8453C"; g.beginPath(); g.moveTo(-3, 0); g.lineTo(5, 6); g.lineTo(5, 0); g.fill(); }
    else if (kind === "cargo") { g.fillStyle = "rgba(10,40,60,.25)"; g.fillRect(-26 + 4, -7 + 5, 56, 14); g.fillStyle = "#2B3A55"; g.fillRect(-26, -7, 56, 14); g.fillStyle = "#C8473C"; g.fillRect(-24, -5, 38, 10); const cc = ["#E1A736", "#2F6FB0", "#3E8F6D", "#D9D5CA"]; for (let q = 0; q < 8; q++) { g.fillStyle = cc[q % 4]; g.fillRect(-22 + q * 4.6, -4, 4, 8); } g.fillStyle = "#EDEFF2"; g.fillRect(18, -5, 8, 10); }
    else if (kind === "dhow") { g.fillStyle = "rgba(10,40,60,.22)"; g.beginPath(); g.ellipse(2, 3, 13, 4, 0, 0, TAU); g.fill(); g.fillStyle = "#8A5A33"; g.beginPath(); g.moveTo(-12, 0); g.quadraticCurveTo(0, -5, 14, 0); g.quadraticCurveTo(0, 5, -12, 0); g.fill(); g.fillStyle = "#F0E2C0"; g.beginPath(); g.moveTo(-2, 0); g.lineTo(6, -9); g.lineTo(6, 0); g.fill(); }
    else { g.fillStyle = "rgba(10,40,60,.25)"; g.beginPath(); g.ellipse(2, 3, 13, 4.4, 0, 0, TAU); g.fill(); g.fillStyle = "#F8F6F1"; g.beginPath(); g.moveTo(-12, -3.4); g.lineTo(5, -3.4); g.quadraticCurveTo(15, 0, 5, 3.4); g.lineTo(-12, 3.4); g.closePath(); g.fill(); g.fillStyle = "#C9A878"; g.fillRect(-10, -2.4, 11, 4.8); g.fillStyle = "#4C5A6B"; g.fillRect(-4, -1.8, 5, 3.6); }
  }
  // banderas del país ondeando junto a la recta de salida
  function drawFlags(g, T) {
    const f = X.flagImg === undefined ? (X.flagImg = (() => { const d = FLAGS[X.lv.cc]; if (!d) return null; const im = new Image(); im.src = d.src; return im; })()) : X.flagImg;
    if (!f || !f.complete || !X.poles) return;
    for (const p of X.poles) {
      g.fillStyle = "rgba(20,30,10,.25)"; g.fillRect(p.x + 2, p.y - 18 + 3, 1.6, 18); g.fillStyle = "#E8EAEE"; g.fillRect(p.x, p.y - 18, 1.6, 20);
      const W = 22, H = 14.5, N = 11; for (let i = 0; i < N; i++) { const u = i / N, y = Math.sin(T * 3.4 + u * 4.2 + p.ph) * 1.6 * u, sx = f.naturalWidth * u, sw = f.naturalWidth / N + 1; g.drawImage(f, sx, 0, sw, f.naturalHeight, p.x + 1.6 + u * W, p.y - 18 + y, W / N + 0.6, H); }
      g.fillStyle = "#C9CED6"; g.beginPath(); g.arc(p.x + 0.8, p.y - 18, 1.4, 0, TAU); g.fill();
    }
  }
  function setPoles(poles) { if (X) X.poles = poles; }

  return { tower: (g, x, y, w, h, hgt, col) => tower(g, x, y, w, h, hgt, col), build, anim, nightLights, def: (lv) => SCENES[lv.name] || ADD[lv.name] || ADD[lv.scene] || {}, HW: () => X.HW, push: (o) => A.push(o), setPoles, extend: (f) => EXT.push(f), addScenes: (o) => Object.assign(ADD, o) };
})();
