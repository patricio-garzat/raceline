"use strict";
/* landmarks.js: monumentos y escenas de la "Gira mundial" (circuitos de ciudades importantes), sobre el motor de 34-scenery.js.
   Cada ciudad lleva algo que la identifica: Parque Fundidora en Monterrey, la torre Eiffel en París, el Coliseo en Roma... */

Scenery.extend((H) => {
  const TAU = H.TAU, SH = H.SH, K = 1.25;   // los monumentos se dibujan un poco más grandes para que se reconozcan
  const sp = (o) => { for (const inside of [true, undefined]) for (const [k, e] of [[1, null], [0.85, 34], [0.7, 30], [0.55, 26]]) { const r = H.spot(Object.assign({ tries: 300, rect: "play" }, o, { r: (o.r || 10) * k, edge: e == null ? o.edge : e, inside: o.inside != null ? o.inside : inside })); if (r) return r; } return null; };   // si no cabe, se intenta con menos holgura
  const lshadow = (g, x, y, w, len, ang = 0.99) => { g.save(); g.lineCap = "round"; g.strokeStyle = "rgba(18,24,34,.27)"; g.lineWidth = Math.max(2, w); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * len * 0.62, y + Math.sin(ang) * len * 0.8); g.stroke(); g.restore(); };
  const disc = (g, x, y, r, c0, c1) => { const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); rg.addColorStop(0, c0); rg.addColorStop(1, c1); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };

  const P = {
    // torre de observación / obelisco: base, sombra larga y, si se quiere, plataforma redonda (CN Tower, torre de TV, Skytree, Obelisco, Monumento a Washington)
    spire(o = {}) {
      const X = H.X, g = X.g, r = o.r || 8, s = sp({ r: r + 12, edge: 40, city: o.city, inside: o.inside }); if (!s) return null; const [x, y] = s, len = o.len || 130;
      lshadow(g, x, y, Math.max(2, r * 0.5), len);
      if (o.pod) { g.fillStyle = "rgba(18,24,34,.27)"; g.beginPath(); g.ellipse(x + len * 0.31, y + len * 0.4, r * 1.3, r * 0.85, 0.9, 0, TAU); g.fill(); }
      if (o.sq) { g.fillStyle = o.col || "#F4F4F6"; g.fillRect(x - r / 2, y - r / 2, r, r); g.strokeStyle = o.lat ? "#D8392F" : "rgba(0,0,0,.2)"; g.lineWidth = o.lat ? 1.4 : 0.7; g.strokeRect(x - r / 2, y - r / 2, r, r); g.beginPath(); g.moveTo(x - r / 2, y - r / 2); g.lineTo(x + r / 2, y + r / 2); g.moveTo(x + r / 2, y - r / 2); g.lineTo(x - r / 2, y + r / 2); g.stroke(); }
      else disc(g, x, y, r, "#FFFFFF", o.col || "#B9BEC7");
      if (o.pod) { disc(g, x, y, r * 0.62, "#FFFFFF", "#9AA0AA"); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, r * 0.62, 0, TAU); g.stroke(); }
      H.pad(x, y, r + 14); if (o.glow) H.X.lights.push({ x, y, w: r, h: r, c: o.glow, big: r * 5, ph: 1 }); return [x, y];
    },
    eiffel(o = {}) {
      const X = H.X, g = X.g, s = sp({ r: 52 * K, edge: 40, city: o.city }); if (!s) return; const [x, y] = s;
      g.save(); g.translate(x, y); g.scale(K, K);
      g.fillStyle = "#5C9A47"; g.fillRect(-44, -76, 88, 152); g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 1; g.strokeRect(-44, -76, 88, 152); g.beginPath(); g.moveTo(0, -76); g.lineTo(0, 76); g.stroke();
      lshadow(g, 0, 0, 13, 190, 0.95);
      g.fillStyle = "#7A6A58"; g.fillRect(-19, -19, 38, 38); g.fillStyle = "#6B5B4B"; g.fillRect(-15, -15, 30, 30);
      g.strokeStyle = "#4A3E34"; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-19, -19); g.lineTo(19, 19); g.moveTo(19, -19); g.lineTo(-19, 19); g.stroke();
      g.strokeStyle = "#8B7A66"; g.lineWidth = 1; for (let q = 1; q < 4; q++) { const k = 19 - q * 9.5; g.strokeRect(-k, -k, k * 2, k * 2); }
      disc(g, 0, 0, 4.2, "#E9D9B4", "#8A7A64"); g.restore(); H.pad(x, y, 56 * K); X.lights.push({ x, y, w: 14, h: 14, c: "#FFD27A", big: 44, ph: 2 });
    },
    arc(o = {}) { // Arco del Triunfo: glorieta con doce avenidas
      const X = H.X, g = X.g, s = sp({ r: 50 * K, edge: 40, city: o.city }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K);
      g.strokeStyle = "#8E9096"; g.lineCap = "butt"; g.lineWidth = 7; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + 0.26; g.beginPath(); g.moveTo(Math.cos(a) * 32, Math.sin(a) * 32); g.lineTo(Math.cos(a) * 104, Math.sin(a) * 104); g.stroke(); }
      g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 0.8; g.setLineDash([4, 5]); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + 0.26; g.beginPath(); g.moveTo(Math.cos(a) * 34, Math.sin(a) * 34); g.lineTo(Math.cos(a) * 104, Math.sin(a) * 104); g.stroke(); } g.setLineDash([]);
      g.fillStyle = "#8E9096"; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fill(); g.fillStyle = "#C9C6BC"; g.beginPath(); g.arc(0, 0, 25, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 0.8; g.setLineDash([3, 4]); g.beginPath(); g.arc(0, 0, 29.5, 0, TAU); g.stroke(); g.setLineDash([]);
      g.fillStyle = SH; g.fillRect(-11 + 4, -7 + 6, 22, 14); g.fillStyle = "#E6DFCB"; g.fillRect(-11, -7, 22, 14); g.fillStyle = "#CFC6AC"; g.fillRect(-11, -7, 22, 4); g.fillStyle = "#B9AF93"; g.fillRect(-3, -7, 6, 14); g.restore(); H.pad(x, y, 60 * K);
    },
    capitol(o = {}) {
      const X = H.X, g = X.g, s = sp({ r: 50 * K, edge: 40, city: o.city }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K);
      g.fillStyle = "#5C9A47"; g.fillRect(-52, -34, 104, 68); g.fillStyle = SH; g.fillRect(-40 + 5, -10 + 7, 80, 20);
      g.fillStyle = "#ECE8DC"; g.fillRect(-40, -10, 80, 20); g.fillStyle = "#D7D1BF"; g.fillRect(-40, -10, 80, 3); g.fillRect(-14, -14, 28, 28);
      g.fillStyle = SH; g.beginPath(); g.arc(5, 7, 12, 0, TAU); g.fill(); disc(g, 0, 0, 12, "#FFFFFF", "#C4C8CE"); g.strokeStyle = "rgba(60,70,90,.3)"; g.lineWidth = 0.7; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); g.stroke(); }
      g.fillStyle = "#B9B5A8"; g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fill(); g.restore(); H.pad(x, y, 56 * K);
    },
    pool(o = {}) { // espejo de agua con árboles a los lados (Explanada Nacional)
      const X = H.X, g = X.g, w = o.w || 130, h = o.h || 16, s = sp({ r: Math.max(w, h) / 2 + 6, edge: 40, city: o.city, inside: o.inside }); if (!s) return; const [x, y] = s;
      g.fillStyle = "#5C9A47"; g.fillRect(x - w / 2 - 8, y - h / 2 - 16, w + 16, h + 32); g.fillStyle = "#E9E6DA"; g.fillRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6); g.fillStyle = "#6FB6D6"; g.fillRect(x - w / 2, y - h / 2, w, h);
      g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x - w / 2, y - 1, w, 2);
      for (let q = -w / 2; q < w / 2; q += 12) for (const yy of [-h / 2 - 11, h / 2 + 11]) drawTree(g, "round", x + q + 4, y + yy, 4.6, ["#2F6B3A", "#4A8A55"], X.rnd);
      H.pad(x, y, w / 2 + 6); X.rivers.push({ pts: [[x - w / 2, y], [x + w / 2, y]], w: h }); H.A.push({ t: "flow", pts: [[x - w / 2, y], [x + w / 2, y]], w: h });
    },
    liberty(o = {}) { // la Estatua de la Libertad sobre su isla en forma de estrella
      const X = H.X, g = X.g, s = sp({ r: 36, wet: true, edge: 50 }) || sp({ r: 30, edge: 44 }); if (!s) return; const [x, y] = s;
      g.save(); g.translate(x, y); g.fillStyle = "rgba(10,40,60,.25)"; g.beginPath(); for (let k = 0; k < 22; k++) { const a = k / 22 * TAU, r = k % 2 ? 17 : 29; g.lineTo(Math.cos(a) * r + 4, Math.sin(a) * r + 5); } g.closePath(); g.fill();
      g.fillStyle = "#D9D3BF"; g.beginPath(); for (let k = 0; k < 22; k++) { const a = k / 22 * TAU, r = k % 2 ? 17 : 29; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.fillStyle = "#6FA070"; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill();
      lshadow(g, 0, 0, 3, 56); g.fillStyle = "#E4E0D2"; g.fillRect(-6, -6, 12, 12); disc(g, 0, 0, 4.4, "#8FD0B8", "#4F9A80"); for (let k = 0; k < 7; k++) { const a = -2.2 + k * 0.5; g.strokeStyle = "#7FC8AE"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(Math.cos(a) * 3, Math.sin(a) * 3); g.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); g.stroke(); }
      g.fillStyle = "#FFD27A"; g.beginPath(); g.arc(-8, -3, 1.5, 0, TAU); g.fill(); g.restore(); H.pad(x, y, 34);
    },
    bridge(o = {}) { // puente que sale de la costa hacia el agua
      const X = H.X, g = X.g, sh = X.lv.shore, sd = sh ? (sh.side === "bottom" ? 1 : sh.side === "top" ? -1 : 0) : 0; if (!sd) return;
      const L = o.len || 150, W = o.w || 13, b = X.bounds, rnd = X.rnd; let p = null;
      for (let t = 0; t < 80 && !p; t++) { const q = sh.pts[Math.floor(rnd() * sh.pts.length)]; if (q[0] < b[0] + 40 || q[0] > b[2] - 40) continue; if (distToRoad(q[0], q[1] + sd * L) < X.HW + 36) continue; if (H.X.wet(q[0], q[1] + sd * 20)) p = q; }
      if (!p) return;
      g.save(); g.translate(p[0], p[1] - sd * 16); g.rotate(sd > 0 ? Math.PI / 2 : -Math.PI / 2);
      g.fillStyle = "rgba(10,40,60,.26)"; g.fillRect(6, -W / 2 + 7, L + 16, W); g.fillStyle = o.deck || "#8E9096"; g.fillRect(0, -W / 2, L + 16, W); g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect(0, -0.5, L + 16, 1);
      if (o.style === "tower") { for (const u of [0.32, 0.66]) { g.fillStyle = "#5C6F84"; g.fillRect(L * u - 7, -W / 2 - 4, 14, W + 8); g.fillStyle = "#7C90A6"; g.fillRect(L * u - 5, -W / 2 - 2, 10, W + 4); g.fillStyle = "#3F6FB0"; g.fillRect(L * u - 3, -2, 6, 4); } g.fillStyle = "#3F6FB0"; g.fillRect(L * 0.32, -W / 2 - 2, L * 0.34, 2); g.fillRect(L * 0.32, W / 2, L * 0.34, 2); }
      else if (o.style === "arch") { g.strokeStyle = o.cab || "#6B7078"; g.lineWidth = 3.4; g.beginPath(); g.ellipse(L * 0.5 + 8, 0, L * 0.48, W * 0.62, 0, 0, TAU); g.stroke(); g.lineWidth = 0.8; for (let q = 0.1; q < 0.95; q += 0.07) { const x = L * q + 8; g.beginPath(); g.moveTo(x, -W / 2); g.lineTo(x, W / 2); g.stroke(); } for (const u of [0.04, 0.96]) { g.fillStyle = "#A9A292"; g.fillRect(L * u + 4, -W / 2 - 3, 10, W + 6); } }
      else { for (const u of [0.38, 0.8]) { g.fillStyle = o.pylon || "#B8443A"; g.fillRect(L * u - 3.5, -W / 2 - 4, 7, W + 8); } g.strokeStyle = o.cab || "#C25A4A"; g.lineWidth = 1; for (const u of [0.38, 0.8]) for (const e of [-1, 1]) for (let q = -4; q <= 4; q++) { if (!q) continue; g.beginPath(); g.moveTo(L * u, e * (W / 2 + 4)); g.lineTo(L * u + q * 9, e * W / 2); g.stroke(); } }
      g.restore(); H.pad(p[0], p[1] + sd * L * 0.5, 20);
    },
    westminster(o = {}) {
      const X = H.X, g = X.g, s = sp({ r: 52 * K, edge: 40, city: o.city }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K);
      g.fillStyle = "#5C9A47"; g.fillRect(-56, -26, 112, 52); g.fillStyle = SH; g.fillRect(-46 + 5, -12 + 7, 90, 24); g.fillStyle = "#CDBB93"; g.fillRect(-46, -12, 90, 24); g.fillStyle = "#B8A67E"; for (let q = -40; q < 40; q += 10) g.fillRect(q, -12, 4, 24); g.fillStyle = "#8A7D5C"; g.fillRect(-46, -12, 90, 2);
      lshadow(g, -40, -4, 6, 120, 0.9); g.fillStyle = "#D6C8A0"; g.fillRect(-46, -10, 11, 11); g.fillStyle = "#BFAE82"; g.fillRect(-43, -7, 5, 5); disc(g, -40.5, -4.5, 1.8, "#FFE9A0", "#C9A640"); g.restore(); H.pad(x, y, 56 * K);
      H.X.lights.push({ x: x - 40 * K, y: y - 4 * K, w: 8, h: 8, c: "#FFD27A", big: 30, ph: 3 });
    },
    allianz(o = {}) {
      const X = H.X, g = X.g, rx = 70, ry = 54, s = sp({ r: 72 * K, edge: 40, city: o.city }) || sp({ r: 56 * K, edge: 40 }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K);
      g.fillStyle = SH; g.beginPath(); g.ellipse(7, 9, rx, ry, 0, 0, TAU); g.fill(); g.fillStyle = "#F2F3F6"; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.clip(); g.strokeStyle = "rgba(150,160,175,.65)"; g.lineWidth = 0.9; for (let q = -130; q < 130; q += 10) { g.beginPath(); g.moveTo(q, -ry); g.lineTo(q + ry, 0); g.lineTo(q, ry); g.stroke(); g.beginPath(); g.moveTo(q, -ry); g.lineTo(q - ry, 0); g.lineTo(q, ry); g.stroke(); } g.restore();
      g.strokeStyle = "#C9CED6"; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, rx - 14, ry - 14, 0, 0, TAU); g.stroke(); g.fillStyle = "#6FA04A"; g.beginPath(); g.ellipse(0, 0, rx * 0.5, ry * 0.5, 0, 0, TAU); g.fill();
      g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; g.strokeRect(-rx * 0.4, -ry * 0.36, rx * 0.8, ry * 0.72); g.beginPath(); g.moveTo(0, -ry * 0.36); g.lineTo(0, ry * 0.36); g.stroke(); g.restore(); H.pad(x, y, 74 * K);
      H.A.push({ t: "led", x, y, rx: rx - 3, ry: ry - 3, rot: 0 });
    },
    festtents(o = {}) { // carpas de la Oktoberfest
      const X = H.X, g = X.g, rnd = X.rnd, n = o.n || 6, s = sp({ r: 62, edge: 40, city: false }); if (!s) return;
      for (let i = 0; i < n; i++) {
        const x = s[0] + (i % 3 - 1) * 46 + (rnd() - 0.5) * 6, y = s[1] + (Math.floor(i / 3) - 0.5) * 36, w = 38, h = 22;
        g.save(); g.translate(x, y); g.fillStyle = SH; g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h); g.fillStyle = "#F6F4EE"; g.fillRect(-w / 2, -h / 2, w, h);
        g.save(); g.beginPath(); g.rect(-w / 2, -h / 2, w, h); g.clip(); g.strokeStyle = "#7FB4E6"; g.lineWidth = 3; for (let q = -w; q < w; q += 8) { g.beginPath(); g.moveTo(q, -h / 2); g.lineTo(q + h, h / 2); g.stroke(); } g.restore();
        g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(-w / 2, -1, w, 2); g.fillStyle = "#C25A3C"; g.fillRect(-w / 2, -h / 2, w, 2); g.restore();
      }
      for (let q = 0; q < 14; q++) { g.fillStyle = "#8A5A33"; g.fillRect(s[0] - 62 + q * 9, s[1] + 34, 6, 2.4); } H.pad(s[0], s[1], 66);
    },
    furnace(o = {}) { // Horno 3 de Fundidora: alto horno de acero, estufas, tuberías y chimeneas con vapor
      const X = H.X, g = X.g, s = sp({ r: 58 * K, edge: 40, city: false }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K);
      g.fillStyle = "rgba(60,50,40,.25)"; g.fillRect(-62, -34, 124, 68);
      lshadow(g, 22, -18, 6, 150, 0.9);
      g.strokeStyle = "#6A5446"; g.lineCap = "round"; g.lineWidth = 3.6; g.beginPath(); g.moveTo(-34, -14); g.lineTo(-8, -6); g.moveTo(-34, 14); g.lineTo(-8, 8); g.moveTo(8, 0); g.lineTo(30, -18); g.stroke(); g.lineWidth = 1.4; g.strokeStyle = "#8B7260"; g.beginPath(); g.moveTo(-34, -14); g.lineTo(-8, -6); g.moveTo(-34, 14); g.lineTo(-8, 8); g.stroke();
      [[-40, -16], [-40, 16], [-28, 0]].forEach(([qx, qy]) => { g.fillStyle = "rgba(30,20,10,.3)"; g.beginPath(); g.arc(qx + 4, qy + 5, 11, 0, TAU); g.fill(); disc(g, qx, qy, 11, "#C98B62", "#8A4F32"); g.strokeStyle = "rgba(60,30,15,.4)"; g.lineWidth = 0.8; g.beginPath(); g.arc(qx, qy, 6.5, 0, TAU); g.stroke(); });
      g.fillStyle = "rgba(30,20,10,.3)"; g.beginPath(); g.arc(4, 4, 17, 0, TAU); g.fill(); disc(g, 0, 0, 17, "#D49A70", "#7A4228"); for (let k = 1; k < 4; k++) { g.strokeStyle = "rgba(60,30,15," + (0.35 - k * 0.05) + ")"; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 17 - k * 4, 0, TAU); g.stroke(); }
      g.strokeStyle = "#3A3A3F"; g.lineWidth = 1.2; g.beginPath(); for (let a = 0; a < 6.3; a += 0.2) g.lineTo(Math.cos(a) * (6 + a * 1.7), Math.sin(a) * (6 + a * 1.7)); g.stroke();
      disc(g, 30, -18, 5.5, "#B7BCC4", "#6B7078"); disc(g, 30, -18, 2.6, "#2B2B30", "#101012");
      g.fillStyle = "#7B7F86"; g.fillRect(34, 8, 22, 6); g.strokeStyle = "#4B4F56"; g.lineWidth = 0.8; for (let q = 36; q < 56; q += 4) { g.beginPath(); g.moveTo(q, 8); g.lineTo(q + 3, 14); g.stroke(); } g.restore();
      H.pad(x, y, 62 * K); H.A.push({ t: "steam", x: x + 30 * K, y: y - 18 * K });
    },
    mountain(o = {}) { // cerro con luz desde arriba a la izquierda (Cerro de la Silla, Table Mountain...)
      const X = H.X, g = X.g, rx = o.rx || 90, ry = o.ry || 48, s = sp({ r: Math.max(rx, ry) * 0.9, edge: 36, city: false, gap: -10 }); if (!s) return; const [x, y] = s, rnd = X.rnd; g.save(); g.translate(x, y); g.rotate(o.rot || -0.12);
      g.fillStyle = "rgba(70,100,50,.35)"; g.beginPath(); g.ellipse(0, 4, rx * 1.18, ry * 1.25, 0, 0, TAU); g.fill();
      const pts = []; for (let k = 0; k < 28; k++) { const a = k / 28 * TAU, r = 0.85 + 0.15 * Math.sin(a * 3 + 1) + rnd() * 0.07; pts.push([Math.cos(a) * rx * r, Math.sin(a) * ry * r]); }
      g.fillStyle = "rgba(30,25,15,.3)"; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0] + 7, p[1] + 9) : g.moveTo(p[0] + 7, p[1] + 9))); g.closePath(); g.fill();
      const gr = g.createLinearGradient(-rx, -ry, rx, ry); gr.addColorStop(0, o.hi || "#B1A48E"); gr.addColorStop(1, o.lo || "#6B6050"); g.fillStyle = gr; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
      const peaks = o.flat ? [[-rx * 0.5, -ry * 0.15], [rx * 0.55, -ry * 0.1]] : (o.peaks || [[-rx * 0.38, -ry * 0.1], [rx * 0.4, ry * 0.0]]);
      peaks.forEach(([px, py]) => { for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, ex = px + Math.cos(a) * rx * 0.62, ey = py + Math.sin(a) * ry * 0.7, lit = Math.cos(a - 2.4) > 0; g.fillStyle = lit ? "rgba(255,255,240,.17)" : "rgba(20,15,5,.2)"; g.beginPath(); g.moveTo(px, py); g.lineTo(ex, ey); g.lineTo(px + Math.cos(a + 0.7) * rx * 0.62, py + Math.sin(a + 0.7) * ry * 0.7); g.closePath(); g.fill(); } g.strokeStyle = "rgba(40,30,15,.3)"; g.lineWidth = 0.8; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.3; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * rx * 0.5, py + Math.sin(a) * ry * 0.55); g.stroke(); } });
      if (o.flat) { g.fillStyle = "rgba(255,255,240,.18)"; g.beginPath(); g.ellipse(0, -ry * 0.12, rx * 0.62, ry * 0.3, 0, 0, TAU); g.fill(); }
      g.restore(); H.pad(x, y, Math.max(rx, ry) * 0.9);
    },
    cathedral(o = {}) {
      const X = H.X, g = X.g, s = sp({ r: 48 * K, edge: 40, city: o.city }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K);
      g.fillStyle = "#D9D0BA"; g.fillRect(-50, -34, 100, 68); g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 1; g.strokeRect(-50, -34, 100, 68);
      g.fillStyle = SH; g.fillRect(-34 + 5, -9 + 7, 62, 18); g.fillRect(-4 + 5, -22 + 7, 16, 44); g.fillStyle = "#E3B073"; g.fillRect(-34, -9, 62, 18); g.fillStyle = "#C98F54"; g.fillRect(-34, -9, 62, 9); g.fillStyle = "#E3B073"; g.fillRect(-4, -22, 16, 44); g.fillStyle = "#C98F54"; g.fillRect(-4, -22, 8, 44);
      for (const dy of [-6, 6]) { lshadow(g, -34, dy, 4, 70, 0.85); g.fillStyle = "#E8C46A"; g.fillRect(-39, dy - 5, 10, 10); g.fillStyle = "#B8903A"; g.fillRect(-36, dy - 2.5, 4, 5); }
      disc(g, 4, 0, 6, "#F2D58C", "#B8903A"); g.restore(); H.pad(x, y, 54 * K);
    },
    colosseum(o = {}) {
      const X = H.X, g = X.g, s = sp({ r: 56 * K, edge: 40, city: o.city }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K); g.rotate(-0.4);
      g.fillStyle = SH; g.beginPath(); g.ellipse(7, 9, 54, 42, 0, 0, TAU); g.fill();
      g.lineCap = "butt"; g.strokeStyle = "#D9C9A0"; g.lineWidth = 15; g.beginPath(); g.ellipse(0, 0, 45, 34, 0, 0.5, TAU - 0.15); g.stroke();
      g.strokeStyle = "#B9A57A"; g.lineWidth = 1; for (let k = 0; k < 40; k++) { const a = 0.6 + k / 40 * (TAU - 0.8), c = Math.cos(a), s2 = Math.sin(a); g.beginPath(); g.moveTo(c * 38, s2 * 28); g.lineTo(c * 52, s2 * 40); g.stroke(); }
      g.strokeStyle = "#EDE0BC"; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 52, 40, 0, 0.5, TAU - 0.15); g.stroke();
      g.fillStyle = "#D9C08A"; g.beginPath(); g.ellipse(0, 0, 33, 24, 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(120,90,50,.45)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-26, -4); g.lineTo(26, -4); g.moveTo(-26, 4); g.lineTo(26, 4); g.moveTo(0, -22); g.lineTo(0, 22); g.stroke();
      g.restore(); H.pad(x, y, 56 * K);
    },
    pyramids(o = {}) {
      const X = H.X, g = X.g, s = sp({ r: 62, edge: 40, city: false, gap: 2 }); if (!s) return; const [x, y] = s;
      [[0, 0, 40, 0.3], [-52, 34, 30, 0.4], [-86, 62, 20, 0.3]].forEach(([dx, dy, r, rot]) => { g.save(); g.translate(x + dx, y + dy); g.rotate(rot);
        g.fillStyle = "rgba(60,40,10,.3)"; g.beginPath(); g.moveTo(-r, -r); g.lineTo(r * 2.6, r * 0.9); g.lineTo(r * 2.2, r * 2.4); g.lineTo(r, r); g.lineTo(-r, r); g.closePath(); g.fill();
        const tri = (pts, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); g.lineTo(pts[2], pts[3]); g.lineTo(pts[4], pts[5]); g.closePath(); g.fill(); };
        tri([-r, -r, r, -r, 0, 0], "#E9D29C"); tri([-r, -r, -r, r, 0, 0], "#F0DEAE"); tri([r, -r, r, r, 0, 0], "#C9A768"); tri([-r, r, r, r, 0, 0], "#B8935A");
        g.strokeStyle = "rgba(90,60,20,.35)"; g.lineWidth = 0.8; g.strokeRect(-r, -r, r * 2, r * 2); g.beginPath(); g.moveTo(-r, -r); g.lineTo(r, r); g.moveTo(r, -r); g.lineTo(-r, r); g.stroke(); g.restore(); });
      H.pad(x - 30, y + 20, 80);
    },
    opera(o = {}) {
      const X = H.X, g = X.g, s = sp({ r: 48 * K, edge: 40, city: false, wet: o.wet }) || sp({ r: 44 * K, edge: 40, city: false }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K);
      g.fillStyle = "rgba(10,40,60,.22)"; g.fillRect(-48 + 6, -22 + 8, 96, 40); g.fillStyle = "#E3D6BB"; g.fillRect(-48, -22, 96, 40); g.fillStyle = "#CFC09E"; g.fillRect(-48, 12, 96, 6);
      [[-30, 0, 30, -0.35], [-6, 2, 34, -0.2], [20, -2, 28, -0.3], [34, 6, 18, -0.15], [-12, -12, 22, -0.4]].forEach(([qx, qy, L, rot], i) => { g.save(); g.translate(qx, qy); g.rotate(rot); g.fillStyle = "rgba(40,50,60,.25)"; g.beginPath(); g.ellipse(4, 5, L * 0.5, L * 0.32, 0, 0, TAU); g.fill(); const gr = g.createLinearGradient(-L / 2, 0, L / 2, 0); gr.addColorStop(0, "#FFFFFF"); gr.addColorStop(1, "#D2D7DE"); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, L * 0.5, L * 0.3, 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(100,110,125,.35)"; g.lineWidth = 0.7; for (let q = -3; q <= 3; q++) { g.beginPath(); g.moveTo(-L * 0.45, q * L * 0.07); g.lineTo(L * 0.45, q * L * 0.03); g.stroke(); } g.restore(); });
      g.restore(); H.pad(x, y, 52 * K);
    },
    burj(o = {}) { // Burj Khalifa: tres lóbulos escalonados y sombra larguísima
      const X = H.X, g = X.g, s = sp({ r: 34, edge: 40, city: o.city }); if (!s) return; const [x, y] = s;
      lshadow(g, x, y, 4, 190, 0.92);
      for (const [r, c0, c1] of [[17, "#E9EEF4", "#9FB0C2"], [13, "#F4F7FA", "#B7C4D2"], [9, "#FFFFFF", "#CBD5E0"]]) for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + 0.5; disc(g, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.62, c0, c1); }
      disc(g, x, y, 5, "#FFFFFF", "#9AA6B4"); g.strokeStyle = "#E8EAEE"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y + 4); g.stroke(); H.pad(x, y, 40); H.X.lights.push({ x, y, w: 12, h: 12, c: "#FFFFFF", big: 38, ph: 0 });
    },
    palmIsland(o = {}) { // Palm Jumeirah, vista desde arriba
      const X = H.X, g = X.g, b = X.bounds, rnd = X.rnd; let s = null;
      for (let t = 0; t < 120 && !s; t++) { const x = b[0] + 60 + rnd() * (b[2] - b[0] - 120), y = b[1] + 60 + rnd() * 150; if (X.wet(x, y) && X.wet(x - 50, y) && X.wet(x + 50, y) && X.wet(x, y + 50)) s = [x, y]; }
      s = s || [b[0] + (b[2] - b[0]) * 0.5, b[1] + 70]; const [x, y] = s;
      g.save(); g.translate(x, y); g.fillStyle = "rgba(10,40,60,.2)"; g.beginPath(); g.ellipse(5, 6, 56, 40, 0, 0, TAU); g.fill();
      g.fillStyle = "#E3CF9E"; g.fillRect(-3.5, -34, 7, 68);
      for (let k = 0; k < 8; k++) for (const sgn of [-1, 1]) { const yy = -26 + k * 7, L = 34 - Math.abs(k - 3.5) * 2.6; g.save(); g.translate(0, yy); g.rotate(sgn * (0.9 - k * 0.05)); g.fillStyle = "#E8D6A6"; g.fillRect(-1.6, 0, 3.2, L); g.fillStyle = "#C25A3C"; for (let q = 4; q < L; q += 5) { g.fillRect(-4, q, 2.2, 2.2); g.fillRect(1.8, q, 2.2, 2.2); } g.fillStyle = "#4F8A55"; for (let q = 4; q < L; q += 7) g.fillRect(-0.8, q, 1.6, 1.6); g.restore(); }
      g.strokeStyle = "#E3CF9E"; g.lineWidth = 5; g.beginPath(); g.arc(0, -4, 50, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.restore(); H.pad(x, y, 60);
    },
    christ(o = {}) { // el Corcovado con el Cristo Redentor y el Pan de Azúcar
      const X = H.X, g = X.g, s = sp({ r: 50, edge: 40, city: false, gap: -6 }); if (!s) return; const [x, y] = s;
      for (const [dx, dy, r, c0, c1] of [[0, 0, 46, "#8FBF7A", "#3F7A44"], [58, 30, 28, "#A9A292", "#6B6456"]]) { g.fillStyle = "rgba(20,40,20,.3)"; g.beginPath(); g.ellipse(x + dx + 8, y + dy + 10, r, r * 0.86, 0, 0, TAU); g.fill(); const rg = g.createRadialGradient(x + dx - r * 0.35, y + dy - r * 0.4, 2, x + dx, y + dy, r); rg.addColorStop(0, c0); rg.addColorStop(1, c1); g.fillStyle = rg; g.beginPath(); g.ellipse(x + dx, y + dy, r, r * 0.86, 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(20,50,25,.28)"; g.lineWidth = 0.9; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.4; g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a) * r * 0.9, y + dy + Math.sin(a) * r * 0.78); g.stroke(); } }
      g.save(); g.translate(x, y); lshadow(g, 0, 0, 2.6, 60, 0.95); g.fillStyle = "rgba(18,24,34,.3)"; g.fillRect(2, 3, 28, 3); g.fillStyle = "#F4F6F4"; g.fillRect(-1.6, -9, 3.2, 18); g.fillRect(-12, -2, 24, 3.4); g.fillStyle = "#CFD6D0"; g.fillRect(-1.6, -9, 1.2, 18); g.restore(); H.pad(x, y, 52); H.pad(x + 58, y + 30, 30);
    },
    cntower(o = {}) { return P.spire(Object.assign({ r: 8, len: 170, pod: true, col: "#C9CED6", city: o.city, glow: "#FFFFFF" }, o)); },
    hagia(o = {}) {
      const X = H.X, g = X.g, s = sp({ r: 54 * K, edge: 40, city: false }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K); g.rotate(0.2);
      g.fillStyle = "#D8D0BC"; g.fillRect(-52, -40, 104, 80); g.fillStyle = SH; g.fillRect(-30 + 5, -22 + 7, 60, 44);
      g.fillStyle = "#C98F7A"; g.fillRect(-30, -22, 60, 44); g.fillStyle = "#B87A66"; g.fillRect(-30, -22, 60, 4);
      disc(g, 0, 0, 20, "#E9ECEF", "#8A96A4"); g.strokeStyle = "rgba(60,70,90,.3)"; g.lineWidth = 0.8; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); g.stroke(); }
      for (const dx of [-26, 26]) disc(g, dx, 0, 11, "#E3E6EA", "#9AA6B4");
      for (const [mx, my] of [[-48, -36], [48, -36], [-48, 36], [48, 36]]) { lshadow(g, mx, my, 3, 56, 0.9); disc(g, mx, my, 3.4, "#FFFFFF", "#B9B5A8"); disc(g, mx, my, 1.4, "#C25A3C", "#8F3A32"); } g.restore(); H.pad(x, y, 58 * K);
    },
    crossing(o = {}) { // cruce de Shibuya: avenidas en diagonal con pasos peatonales y pantallas de neón
      const X = H.X, g = X.g, s = sp({ r: 50 * K, edge: 40, city: o.city }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K);
      g.fillStyle = "#3C3F46"; g.fillRect(-46, -46, 92, 92); g.fillStyle = "#505460"; g.fillRect(-46, -14, 92, 28); g.fillRect(-14, -46, 28, 92);
      g.fillStyle = "rgba(255,255,255,.85)"; for (let q = -42; q < 42; q += 6) { g.fillRect(q, -14, 3.4, 4); g.fillRect(q, 10, 3.4, 4); g.fillRect(-14, q, 4, 3.4); g.fillRect(10, q, 4, 3.4); }
      g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 3; g.beginPath(); g.moveTo(-14, -14); g.lineTo(14, 14); g.moveTo(14, -14); g.lineTo(-14, 14); g.stroke();
      const cols = ["#FF3C8E", "#35E0FF", "#FFC83C", "#8F5CFF"]; [[-46, -46], [46, -46], [-46, 46], [46, 46]].forEach(([qx, qy], i) => { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(qx - 12 + (qx > 0 ? 3 : -3), qy - 9 + 4, 24, 18); g.fillStyle = cols[i]; g.fillRect(qx - 12, qy - 9, 24, 18); g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(qx - 12, qy - 9, 24, 3); H.X.lights.push({ x: x + qx, y: y + qy, w: 24, h: 18, c: cols[i], ph: i }); }); g.restore(); H.pad(x, y, 62 * K);
    },
    gate(o = {}) { // Puerta de Brandeburgo
      const X = H.X, g = X.g, s = sp({ r: 38 * K, edge: 40, city: o.city }); if (!s) return; const [x, y] = s; g.save(); g.translate(x, y); g.scale(K, K);
      g.fillStyle = "#5C9A47"; g.fillRect(-52, -26, 104, 52); g.fillStyle = SH; g.fillRect(-34 + 5, -9 + 7, 68, 18); g.fillStyle = "#D8CFB6"; g.fillRect(-34, -9, 68, 18); g.fillStyle = "#BDB296"; g.fillRect(-34, -9, 68, 4); g.fillStyle = "#9A8F76"; for (let q = -30; q < 32; q += 11) g.fillRect(q, -5, 4, 12);
      disc(g, 0, -2, 4, "#8FD0B8", "#4F9A80"); g.restore(); H.pad(x, y, 50 * K);
    },
    canals(o = {}) { // canales paralelos con puentes (Ámsterdam)
      const X = H.X, g = X.g, b = X.bounds, n = o.n || 4;
      for (let k = 0; k < n; k++) { const yy = 190 + k * 150 + (k % 2) * 16; let run = []; const flush = () => { if (run.length > 1) { const a = run[0], z = run[run.length - 1]; if (z[0] - a[0] > 50) { H.P.river([a, z], 13, "#6FA6B8"); } } run = []; }; for (let xx = b[0]; xx <= b[2]; xx += 6) { const ok = distToRoad(xx, yy) > X.HW + 40 && !X.wet(xx, yy) && H.inLoop(xx, yy); if (ok) run.push([xx, yy]); else flush(); } flush(); }
    },
    traffic(kind, n = 2) { // vehículos que recorren una calle paralela a la pista
      const X = H.X, g = X.g, C = TR.C, Nm = TR.Nm, N = TR.N, K = { tram: ["#F2B705", 18, 5.2], bus: ["#D8392F", 15, 5.2], cab: ["#F2C21A", 7.4, 3.8], metro: ["#E4E8EC", 30, 5.4], streetcar: ["#D8392F", 20, 5.6] }[kind] || ["#F2B705", 14, 5], off = X.HW + 52;
      let best = null; for (const side of [-1, 1]) { let run = []; const flush = () => { if (run.length > 20 && (!best || run.length > best.length)) best = run.slice(); run = []; }; for (let i = 0; i < N; i += 3) { const x = C[i][0] + Nm[i][0] * side * off, y = C[i][1] + Nm[i][1] * side * off; if (distToRoad(x, y) < off - 6 || X.wet(x, y, 3)) flush(); else run.push([x, y]); } flush(); }
      if (!best) return; const g2 = X.g; g2.save(); g2.lineCap = "round"; g2.lineJoin = "round"; g2.beginPath(); best.forEach((p, i) => (i ? g2.lineTo(p[0], p[1]) : g2.moveTo(p[0], p[1]))); g2.strokeStyle = "#5D6068"; g2.lineWidth = kind === "tram" || kind === "streetcar" || kind === "metro" ? 5 : 9; g2.stroke(); g2.strokeStyle = "rgba(255,255,255,.55)"; g2.lineWidth = 0.8; g2.setLineDash([5, 6]); g2.stroke(); g2.restore();
      for (let k = 0; k < n; k++) H.A.push({ t: "vehicle", pts: best, col: K[0], len: K[1], wid: K[2], sp: 14 + k * 4, off: k * 160 });
    },
  };
  H.P = P;
  P.river = (pts, w, col) => { if (WORLD.w > 700) pts = pts.map((p) => [WORLD.w / 2 + (p[0] - 320) * (WORLD.w / 640), p[1]]); const X = H.X, g = X.g; g.save(); g.lineCap = "round"; const path = () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); }; path(); g.lineWidth = w + 7; g.strokeStyle = "rgba(240,235,215,.85)"; g.stroke(); path(); g.lineWidth = w; g.strokeStyle = col; g.stroke(); g.restore(); X.rivers.push({ pts, w }); H.A.push({ t: "flow", pts, w }); };
  return P;
});

/* ---------- las escenas de la Gira mundial ---------- */
const X_HW = () => Scenery.HW(), A_push = (o) => Scenery.push(o);
Scenery.addScenes({
  "New York": { clouds: 0.6, neon: ["#FFD27A", "#4FD8E6"], build(S) { S.liberty(); S.bridge({ style: "suspension", deck: "#8E9096", cab: "#5C6F84", pylon: "#7A8A98" }); S.oval(1); S.towers(30, { hgt: 66, w: 28, cols: ["#9FB2C4", "#B7C3CE", "#8FA3B8", "#C8CFD6", "#A9B8C7"], city: false }); S.traffic("cab", 4); S.lot({}); S.serviceRoad(X_HW() + 38, "#8E8A82"); A_push({ t: "boats", kind: "yacht", n: 3 }); A_push({ t: "birds", n: 7, col: "#6B7077", sp: 20 }); } },
  "Washington DC": { clouds: 0.7, petals: ["#F9C7D6", "#F4A7C0", "#FFFFFF"], treeTc: ["#E88AAE", "#F9C7D6"], build(S) { S.patch(["grass"], { fill: 0.6 }); S.capitol({}); S.pool({ w: 120, h: 16 }); S.spire({ r: 9, len: 150, sq: true, col: "#F4F4F6" }); S.grove(8, "cherry", ["#E88AAE", "#F9C7D6"], { cnt: 16 }); S.towers(8, { hgt: 30, w: 26, cols: ["#E6E0D0", "#D8D2C0"], city: false }); S.serviceRoad(X_HW() + 38, "#CDBE9A"); A_push({ t: "birds", n: 6, col: "#2B2B30", sp: 20 }); } },
  Monterrey: { clouds: 0.5, wind: true, build(S) { S.mountain({ rx: 120, ry: 62, peaks: [[-44, -8], [48, 2]], hi: "#B9AA92", lo: "#6A5E4C", rot: -0.1 }); S.furnace({}); S.patch(["grass", "plow"], { fill: 0.35 }); S.rocks(8, { r: 14, col: "#A58F73" }); S.houses(5, "flat", { cnt: 10 }); S.towers(8, { hgt: 36, w: 24, cols: ["#C9B8A0", "#B8A68C", "#D9CBB0"], city: false }); S.lot({}); S.serviceRoad(X_HW() + 40, "#B7A98C"); S.speckle(["#6B6254", "#B5A074"], 500); A_push({ t: "birds", n: 5, col: "#2B2B30", sp: 18 }); } },
  Guadalajara: { clouds: 0.5, build(S) { S.patch(["agave", "agave", "agave", "plow"], { fill: 0.9 }); S.cathedral({}); S.houses(6, "med", { cnt: 12 }); S.hay(8); S.lot({}); S.serviceRoad(X_HW() + 40, "#C9B48A"); S.speckle(["#F4F2EC", "#E8A0C0"], 300); A_push({ t: "birds", n: 7, col: "#2B2B30", sp: 20 }); } },
  Paris: { clouds: 0.6, neon: ["#FFD27A"], build(S) { S.eiffel({ city: false }); S.arc({ city: false }); S.bridge({ style: "arch", deck: "#A9A292", cab: "#8E8672", len: 130 }); S.towers(18, { hgt: 26, w: 26, cols: ["#E6DEC9", "#DAD1BA", "#EFE8D6", "#C9C0A8"], city: false, plaza: "rgba(210,205,190,.9)" }); S.fountain({}); S.serviceRoad(X_HW() + 38, "#C9C4B8"); A_push({ t: "boats", kind: "yacht", n: 3 }); A_push({ t: "birds", n: 8, col: "#6B7077", sp: 20 }); } },
  Munich: { clouds: 0.8, treeKind: "pine", build(S) { S.hills(8, { r: 130, light: 0.18, dark: 0.12 }); S.patch(["grass", "grass", "wheat"], { fill: 0.5 }); S.allianz({}); S.festtents({}); S.spire({ r: 8, len: 170, pod: true, col: "#C9CED6" }); S.houses(4, "red", { cnt: 9 }); S.lot({ w: 90, h: 54 }); S.serviceRoad(X_HW() + 40, "#CDBE9A"); S.speckle(["#F4F2EC", "#F2D24A"], 300); A_push({ t: "birds", n: 6, col: "#2B2B30", sp: 20 }); } },
  London: { clouds: 1.2, neon: ["#FFD27A", "#4FD8E6"], build(S) { S.westminster({ city: false }); S.ferris({ r: 34, city: false, col: "#E9EEF4", rim: "#4F7FC0" }); S.bridge({ style: "tower", deck: "#7C90A6" }); S.towers(16, { hgt: 48, w: 26, cols: ["#B8A68C", "#C9B8A0", "#A9B8C7", "#D8CFB8"], city: false }); S.traffic("bus", 4); S.fountain({}); S.serviceRoad(X_HW() + 38, "#A8A08C"); A_push({ t: "boats", kind: "cargo", n: 2 }); A_push({ t: "birds", n: 6, col: "#6B7077", sp: 18 }); } },
  Rome: { clouds: 0.5, treeKind: "pine", treeTc: ["#2E5B36", "#3F7545"], build(S) { S.hills(6, { r: 120, light: 0.18, dark: 0.12 }); S.patch(["olive", "grass", "wheat"], { fill: 0.4 }); S.colosseum({}); S.houses(8, "med", { cnt: 12 }); S.rocks(8, { r: 13, col: "#D9CDB0" }); S.fountain({}); S.lot({}); S.serviceRoad(X_HW() + 40, "#CDBE9A"); A_push({ t: "birds", n: 8, col: "#2B2B30", sp: 20 }); } },
  Lisbon: { clouds: 0.6, build(S) { S.hills(10, { r: 120, light: 0.2, dark: 0.15 }); S.bridge({ style: "suspension", deck: "#8E9096", cab: "#C25A3C", pylon: "#B8443A", len: 160 }); S.patch(["olive", "grass"], { fill: 0.3 }); S.houses(10, "med", { cnt: 14 }); S.traffic("tram", 3); S.towers(4, { hgt: 30, w: 22, cols: ["#E9E0CC", "#D8C9A8"], city: false }); S.serviceRoad(X_HW() + 38, "#C9B48A"); A_push({ t: "boats", kind: "sail", n: 4 }); A_push({ t: "birds", n: 8, col: "#F4F2EC", sp: 22 }); } },
  Amsterdam: { clouds: 0.9, build(S) { S.canals({ n: 4 }); S.windmill(2, { len: 22 }); S.houses(10, "red", { cnt: 14, w: 15 }); S.patch(["tulip", "grass"], { fill: 0.3 }); S.serviceRoad(X_HW() + 38, "#C9B48A"); A_push({ t: "boats", kind: "sail", n: 2 }); A_push({ t: "birds", n: 8, col: "#F4F2EC", sp: 22 }); } },
  Berlin: { clouds: 0.9, build(S) { S.patch(["grass"], { fill: 0.4 }); S.gate({}); S.spire({ r: 8, len: 160, pod: true, col: "#C9CED6" }); S.hangars(2); S.towers(10, { hgt: 40, w: 26, cols: ["#B7B2A8", "#A8A398", "#C4BFB4", "#9FB2C4"], city: false }); S.lot({}); S.serviceRoad(X_HW() + 40, "#A8A08C"); S.speckle(["#F4F2EC"], 200); A_push({ t: "birds", n: 6, col: "#2B2B30", sp: 20 }); } },
  Tokyo: { night: true, neon: ["#FF3C8E", "#35E0FF", "#FFC83C", "#8F5CFF"], clouds: 0, petals: ["#F9C7D6", "#F4A7C0"], build(S) { S.spire({ r: 8, len: 170, sq: true, lat: true, col: "#FFFFFF", glow: "#FF5A4A" }); S.crossing({}); S.ferris({ r: 34, city: false }); S.bridge({ style: "suspension", deck: "#8E9096", cab: "#C9CED6", pylon: "#E8EAEE" }); S.towers(20, { hgt: 56, w: 26, neon: ["#FF3C8E", "#35E0FF", "#FFC83C", "#8F5CFF"], city: false }); S.traffic("metro", 2); S.grove(4, "cherry", ["#E88AAE", "#F9C7D6"], { cnt: 12 }); S.serviceRoad(X_HW() + 38, "#8E8A82"); A_push({ t: "boats", kind: "yacht", n: 3 }); A_push({ t: "beams", n: 2 }); } },
  Sydney: { clouds: 0.5, build(S) { S.opera({}); S.bridge({ style: "arch", deck: "#8E9096", cab: "#6B7078", len: 170 }); S.patch(["grass"], { fill: 0.35 }); S.towers(14, { hgt: 46, w: 26, cols: ["#9FB2C4", "#B7C3CE", "#8FA3B8"], city: false }); S.palms(6, { cnt: 4 }); S.serviceRoad(X_HW() + 38, "#CDBE9A"); A_push({ t: "boats", kind: "sail", n: 6 }); A_push({ t: "birds", n: 8, col: "#F4F2EC", sp: 22 }); } },
  Dubai: { night: true, neon: ["#FFD27A", "#35E0FF", "#FF5CC8"], clouds: 0, wind: true, build(S) { S.burj({ city: false }); S.palmIsland({}); S.towers(20, { hgt: 62, w: 26, neon: ["#FFD27A", "#35E0FF", "#FF5CC8"], cols: ["#C9D3DD", "#9FB0C2", "#E8E0CE"], city: false }); S.palms(8, { cnt: 5 }); S.masts(12); S.lot({}); S.rocks(6, { r: 14, col: "#B49F80" }); S.serviceRoad(X_HW() + 40, "#A39D8F"); A_push({ t: "boats", kind: "yacht", n: 4 }); A_push({ t: "beams", n: 3 }); } },
  "Rio de Janeiro": { clouds: 1, build(S) { S.christ({}); S.stadium({ rx: 70, ry: 56, wall: "#E4E1D8", seats: ["#E8453C", "#F4F2EC", "#2E8B57"] }); S.hills(8, { r: 120, light: 0.18, dark: 0.16 }); S.houses(12, "tropic", { cnt: 16, w: 15 }); S.umbrellas(40); S.palms(8, { cnt: 5 }); S.serviceRoad(X_HW() + 40, "#CDBE9A"); A_push({ t: "boats", kind: "sail", n: 5 }); A_push({ t: "birds", n: 8, col: "#F4F2EC", sp: 22 }); } },
  "Buenos Aires": { clouds: 0.6, treeTc: ["#6BA05A", "#8FBF6E"], build(S) { S.patch(["grass", "grass", "wheat"], { fill: 0.5 }); S.spire({ r: 8, len: 150, sq: true, col: "#F4F4F6" }); S.stadium({ rx: 62, ry: 54, wall: "#D9D5C8", seats: ["#2F6FDB", "#F2B705"], pitch: true }); S.houses(12, "tropic", { cnt: 14, w: 16 }); S.towers(6, { hgt: 36, w: 24, cols: ["#E6E0D0", "#C9D3DD"], city: false }); S.lot({}); S.serviceRoad(X_HW() + 40, "#CDBE9A"); S.speckle(["#B07CE0", "#F4F2EC"], 300); A_push({ t: "birds", n: 7, col: "#2B2B30", sp: 20 }); } },
  Toronto: { clouds: 0.8, leaves: ["#D8542A", "#E69B2B"], build(S) { S.cntower({ city: false }); S.dome({ r: 30, hi: "#E9ECEF", lo: "#8A96A4", geo: false }); S.patch(["grass"], { fill: 0.3 }); S.towers(18, { hgt: 58, w: 26, cols: ["#9FB2C4", "#B7C3CE", "#8FA3B8"], city: false }); S.traffic("streetcar", 3); S.serviceRoad(X_HW() + 38, "#A8A08C"); A_push({ t: "boats", kind: "sail", n: 4 }); A_push({ t: "birds", n: 7, col: "#F4F2EC", sp: 22 }); } },
  Istanbul: { clouds: 0.6, build(S) { S.hagia({}); S.mosque({ city: false }); S.spire({ r: 7, len: 110, col: "#D9D0BA" }); S.hills(6, { r: 120, light: 0.18, dark: 0.12 }); S.patch(["olive", "grass"], { fill: 0.3 }); S.houses(9, "med", { cnt: 14 }); S.serviceRoad(X_HW() + 40, "#C9B48A"); A_push({ t: "boats", kind: "cargo", n: 3 }); A_push({ t: "birds", n: 8, col: "#F4F2EC", sp: 22 }); } },
  Cairo: { clouds: 0.3, wind: true, build(S) { S.pyramids({}); S.mosque({ city: false }); S.palms(10, { cnt: 5 }); S.houses(6, "flat", { cnt: 12 }); S.rocks(8, { r: 13, col: "#B49F80" }); S.serviceRoad(X_HW() + 40, "#C9B48A"); S.speckle(["#B5A074", "#8A7F5A"], 600); A_push({ t: "boats", kind: "sail", n: 3 }); A_push({ t: "birds", n: 5, col: "#2B2B30", sp: 18 }); } },
  "Cape Town": { clouds: 0.8, fog: 0.7, build(S) { S.mountain({ rx: 130, ry: 54, flat: true, hi: "#B1A48E", lo: "#6B6050", rot: 0 }); S.stadium({ rx: 62, ry: 50, wall: "#F2F3F6", seats: ["#E8E2D2", "#C9CED6"], roof: true }); S.mountain({ rx: 56, ry: 36, peaks: [[0, 0]], hi: "#9FB07A", lo: "#5E6B48", rot: 0.3 }); S.patch(["vine", "grass"], { fill: 0.3 }); S.houses(7, "white", { cnt: 12 }); S.palms(6, { cnt: 4 }); S.umbrellas(24); S.serviceRoad(X_HW() + 38, "#CDBE9A"); A_push({ t: "boats", kind: "sail", n: 5 }); A_push({ t: "birds", n: 8, col: "#F4F2EC", sp: 22 }); } },
});
