"use strict";
/* landmarks2.js: monumentos grandes y fáciles de reconocer para las ciudades (Cerro de la Silla y Horno 3 en Monterrey, Big Ben y el London Eye,
   la Estatua de la Libertad y el Empire State, la Puerta de Brandeburgo, el Cristo Redentor, el Obelisco, la CN Tower, la Torre de Belém, la Torre de Tokio).
   Se dibujan desde arriba, con la luz de arriba a la izquierda y sombras largas hacia abajo a la derecha, y se colocan en el campo (el espacio libre más grande). */

Scenery.extend((H) => {
  const TAU = H.TAU, A = () => H.A;
  // el mejor lugar libre: primero en el centro del circuito y lo más lejos posible de la calle; si no cabe, se hace más chico
  const place = (r, o = {}) => {
    for (const k of [1, 0.85, 0.7, 0.55]) for (const m of o.margins || [70, 46, 30, 18]) for (const inside of o.inside != null ? [o.inside] : [true, false]) {
      const s = H.spot(Object.assign({ tries: 500, rect: "play", city: o.city }, o.spot || {}, { r: r * k, edge: m + (o.fit || 0.6) * r * k, inside }));
      if (s) return { x: s[0], y: s[1], k };
    }
    return null;
  };
  // el punto con más espacio libre alrededor (dentro del circuito) en una parte del mapa; k = cuánto cabe (1 = tamaño completo)
  let taken = [], takenX = null; const hypot2 = Math.hypot;
  const roomy = (r, part) => {
    const X = H.X; if (takenX !== X) { takenX = X; taken = []; }
    const b = X.play, y0 = b[1] + (b[3] - b[1]) * (part === "top" ? 0 : 0.42), y1 = b[1] + (b[3] - b[1]) * (part === "top" ? 0.5 : 0.74); let best = null;   // top: arriba; si no, la franja del medio (abajo están las gradas)
    for (let x = b[0]; x < b[2]; x += 10) for (let y = y0; y < y1; y += 10) {
      if (!H.inLoop(x, y) || H.wetAt(x, y, 10) || taken.some((t) => hypot2(x - t[0], y - t[1]) < t[2] + r * 0.6)) continue;
      const c = distToRoad(x, y) - X.HW; if (!best || c > best.c) best = { x, y, c };
    }
    if (!best || best.c < r * 0.35) return null;
    const k = Math.min(1.1, best.c / (r * 0.8)); taken.push([best.x, best.y, r * Math.min(1, k)]);
    return { x: best.x, y: best.y, k };
  };
  const lsh = (g, x, y, w, len, ang = 0.99, a = 0.27) => { g.save(); g.lineCap = "round"; g.strokeStyle = `rgba(18,24,34,${a})`; g.lineWidth = Math.max(2, w); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * len * 0.62, y + Math.sin(ang) * len * 0.8); g.stroke(); g.restore(); };
  const disc = (g, x, y, r, c0, c1) => { const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); rg.addColorStop(0, c0); rg.addColorStop(1, c1); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const poly = (g, P, dx = 0, dy = 0) => { g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0] + dx, p[1] + dy) : g.moveTo(p[0] + dx, p[1] + dy))); g.closePath(); };
  const sq = (g, x, y, s, c0, c1) => { g.fillStyle = "rgba(18,24,34,.22)"; g.fillRect(x - s / 2 + 3, y - s / 2 + 4, s, s); const lg = g.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2); lg.addColorStop(0, c0); lg.addColorStop(1, c1); g.fillStyle = lg; g.fillRect(x - s / 2, y - s / 2, s, s); g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 0.7; g.strokeRect(x - s / 2, y - s / 2, s, s); };

  const P = {
    /* ---- Monterrey ---- */
    cerro(o = {}) { // el Cerro de la Silla: dos picos con la silla en medio, dibujado en relieve para que se reconozca
      const X = H.X, g = X.g, s = roomy(100, "top") || place(100, { inside: true, margins: [10, 4, 0], fit: 0.5 }); if (!s) return; const k = (100 * s.k) / 150 * 1.1;   // al fondo del campo, arriba
      g.save(); g.translate(s.x, s.y + 10); g.scale(k, k);
      const top = [[-150, 22], [-122, -6], [-96, -44], [-72, -68], [-54, -44], [-34, -16], [-10, -6], [10, -8], [30, -36], [52, -54], [70, -48], [88, -28], [112, -2], [138, 22]];
      const outline = top.concat([[110, 34], [40, 40], [-60, 40], [-120, 34]]);
      g.fillStyle = "rgba(96,120,64,.5)"; g.beginPath(); g.ellipse(0, 26, 170, 26, 0, 0, TAU); g.fill();
      g.fillStyle = "rgba(24,20,12,.3)"; poly(g, outline, 16, 20); g.fill();
      const lg = g.createLinearGradient(-150, 0, 140, 0); lg.addColorStop(0, "#DCCFB4"); lg.addColorStop(0.5, "#B5A683"); lg.addColorStop(1, "#7A6D58"); g.fillStyle = lg; poly(g, outline); g.fill();
      g.save(); poly(g, outline); g.clip();
      g.fillStyle = "rgba(255,250,230,.34)"; poly(g, [[-72, -68], [-122, -6], [-150, 24], [-100, 34], [-66, -2]]); g.fill();     // cara iluminada del pico izquierdo
      g.fillStyle = "rgba(30,22,10,.3)"; poly(g, [[-72, -68], [-66, -2], [-24, 36], [-10, -6], [-34, -16], [-54, -44]]); g.fill(); // cara en sombra
      g.fillStyle = "rgba(255,250,230,.3)"; poly(g, [[52, -54], [30, -36], [10, -8], [18, 34], [56, 0]]); g.fill();                  // pico derecho
      g.fillStyle = "rgba(30,22,10,.34)"; poly(g, [[52, -54], [70, -48], [88, -28], [112, -2], [140, 24], [100, 36], [60, 2]]); g.fill();
      g.fillStyle = "rgba(20,14,6,.3)"; poly(g, [[-10, -6], [10, -8], [4, 36], [-14, 36]]); g.fill();                                     // la silla
      g.strokeStyle = "rgba(50,38,20,.38)"; g.lineWidth = 1; g.beginPath();
      for (const [a, b] of [[[-72, -68], [-92, 30]], [[-72, -68], [-48, 34]], [[-84, -28], [-130, 20]], [[52, -54], [34, 36]], [[52, -54], [78, 38]], [[64, -30], [112, 28]], [[-20, -10], [-24, 30]]]) { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
      g.restore();
      g.fillStyle = "rgba(255,255,245,.5)"; g.beginPath(); g.ellipse(-70, -62, 6, 3, -0.4, 0, TAU); g.ellipse(54, -50, 5, 2.6, 0.3, 0, TAU); g.fill();
      g.restore(); H.pad(s.x, s.y, 100 * Math.min(1, s.k));
    },
    horno3(o = {}) { // el Horno 3 de Fundidora: alto horno de acero con sus estufas, tubería, rampa y chimenea
      const X = H.X, g = X.g, sc = o.sc || 1.45, s = roomy(60 * sc, "bottom") || place(60 * sc, { inside: true, fit: 0.8 }); if (!s) return; const k = sc * Math.min(1, s.k + 0.1);
      g.save(); g.translate(s.x, s.y); g.scale(k, k);
      g.fillStyle = "rgba(120,104,90,.4)"; g.fillRect(-68, -44, 136, 88); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1; g.strokeRect(-68, -44, 136, 88);
      lsh(g, -22, -34, 6, 150, 0.95); lsh(g, 0, 0, 20, 120, 0.9); for (const y of [-26, 0, 26]) lsh(g, 46, y, 13, 90, 0.9);
      // rampa de carga
      g.save(); g.translate(0, 0); g.rotate(2.45); g.fillStyle = "#6F5B4C"; g.fillRect(14, -4.5, 56, 9); g.strokeStyle = "#B49A84"; g.lineWidth = 1; for (let q = 18; q < 68; q += 5) { g.beginPath(); g.moveTo(q, -4.5); g.lineTo(q, 4.5); g.stroke(); } g.restore();
      // tuberías a las estufas
      g.lineCap = "round"; for (const y of [-26, 0, 26]) { g.strokeStyle = "#5E4636"; g.lineWidth = 6; g.beginPath(); g.moveTo(28, 0); g.lineTo(46, y); g.stroke(); g.strokeStyle = "#A8826A"; g.lineWidth = 2; g.beginPath(); g.moveTo(28, 0); g.lineTo(46, y); g.stroke(); }
      for (const y of [-26, 0, 26]) { disc(g, 46, y, 14, "#D9906A", "#8A4A2C"); g.strokeStyle = "rgba(60,30,15,.4)"; g.lineWidth = 1; g.beginPath(); g.arc(46, y, 9, 0, TAU); g.stroke(); disc(g, 46, y, 4, "#5A3A2A", "#2E1C12"); }
      // el horno
      g.strokeStyle = "#7B7F86"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 31, 0, TAU); g.stroke(); g.strokeStyle = "#B7BCC4"; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 31, 0, TAU); g.stroke();
      disc(g, 0, 0, 26, "#E09A70", "#7E4126"); for (let q = 1; q < 4; q++) { g.strokeStyle = `rgba(60,30,15,${0.38 - q * 0.06})`; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, 26 - q * 5.5, 0, TAU); g.stroke(); }
      disc(g, 0, 0, 7, "#4A3226", "#1E120C"); g.strokeStyle = "#3A3A3F"; g.lineWidth = 1.2; g.beginPath(); for (let a = 0; a < 6.3; a += 0.2) g.lineTo(Math.cos(a) * (8 + a * 2.6), Math.sin(a) * (8 + a * 2.6)); g.stroke();
      disc(g, -22, 24, 11, "#C9CDD3", "#7A8088"); disc(g, -22, 24, 4, "#3A3A3F", "#18181B");        // captador de polvo
      disc(g, -22, -34, 6.5, "#C9CDD3", "#6B7078"); disc(g, -22, -34, 3, "#2B2B30", "#101012");  // chimenea
      g.restore(); H.pad(s.x, s.y, 64 * k); A().push({ t: "steam", x: s.x - 22 * k, y: s.y - 34 * k }); A().push({ t: "steam", x: s.x, y: s.y });
    },
    /* ---- Londres ---- */
    bigBen(o = {}) { // el Parlamento con el Big Ben (torre del reloj) y la torre Victoria
      const X = H.X, g = X.g, s = place(80, { inside: true }); if (!s) return; const k = 1.7 * Math.min(1, s.k + 0.15);
      g.save(); g.translate(s.x, s.y); g.scale(k, k);
      g.fillStyle = "rgba(18,24,34,.22)"; g.fillRect(-64, -12, 140, 30);
      const lg = g.createLinearGradient(0, -14, 0, 14); lg.addColorStop(0, "#E4D3A6"); lg.addColorStop(1, "#BFA978"); g.fillStyle = lg; g.fillRect(-68, -15, 136, 30);
      g.strokeStyle = "rgba(90,70,40,.45)"; g.lineWidth = 0.8; for (let q = -62; q < 66; q += 5) { g.beginPath(); g.moveTo(q, -13); g.lineTo(q, 13); g.stroke(); }
      g.fillStyle = "rgba(255,255,240,.5)"; g.fillRect(-60, -2, 124, 4); g.fillStyle = "#86A86A"; g.fillRect(-40, -9, 26, 6); g.fillRect(8, 3, 28, 6);
      // torre Victoria
      sq(g, 62, 0, 20, "#E0CD9C", "#B49C6A"); g.fillStyle = "#8A7650"; for (const [dx, dy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) g.fillRect(62 + dx - 2, dy - 2, 4, 4);
      lsh(g, 62, 0, 9, 90, 0.95);
      // torre del reloj
      lsh(g, -68, 0, 12, 150, 0.97, 0.3); sq(g, -68, 0, 18, "#E3D2A2", "#B9A272");
      g.fillStyle = "#4F6F76"; poly(g, [[-68, -9], [-59, 0], [-68, 9], [-77, 0]]); g.fill();
      g.fillStyle = "#6F9199"; poly(g, [[-68, -9], [-59, 0], [-68, 0]]); g.fill(); g.fillStyle = "#35545B"; poly(g, [[-68, 9], [-77, 0], [-68, 0]]); g.fill();
      disc(g, -68, 0, 2.2, "#F3D98A", "#B98F2A");
      g.restore(); H.pad(s.x, s.y, 86 * k); H.X.lights.push({ x: s.x - 68 * k, y: s.y, w: 8, h: 8, c: "#FFD27A", big: 30, ph: 1 });
    },
    eye(o = {}) { // el London Eye: rueda con cápsulas
      const X = H.X, g = X.g, s = place(58, { inside: true }); if (!s) return; const R = 46 * Math.min(1.15, 0.8 + s.k * 0.35);
      g.save(); g.translate(s.x, s.y);
      g.strokeStyle = "rgba(20,30,40,.2)"; g.lineWidth = 3; g.beginPath(); g.arc(14, 19, R, 0, TAU); g.stroke();
      g.lineWidth = 0.8; for (let q = 0; q < 24; q++) { const a = q / 24 * TAU; g.beginPath(); g.moveTo(14, 19); g.lineTo(14 + Math.cos(a) * R, 19 + Math.sin(a) * R); g.stroke(); }
      g.strokeStyle = "#6B7686"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(-18, 34); g.moveTo(0, 0); g.lineTo(14, 36); g.stroke();
      g.strokeStyle = "#F7F9FB"; g.lineWidth = 3.4; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.strokeStyle = "#B7C4D2"; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R - 3, 0, TAU); g.stroke();
      g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 0.8; for (let q = 0; q < 24; q++) { const a = q / 24 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke(); }
      for (let q = 0; q < 32; q++) { const a = q / 32 * TAU, cx = Math.cos(a) * (R + 3.4), cy = Math.sin(a) * (R + 3.4); g.fillStyle = "rgba(20,30,40,.25)"; g.beginPath(); g.ellipse(cx + 2.4, cy + 3, 3.6, 2.6, a, 0, TAU); g.fill(); g.fillStyle = "#9CD0F4"; g.beginPath(); g.ellipse(cx, cy, 3.6, 2.6, a, 0, TAU); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 0.7; g.stroke(); }
      disc(g, 0, 0, 5.5, "#FFFFFF", "#8A96A4"); g.restore(); H.pad(s.x, s.y, R + 10);
    },
    /* ---- Nueva York ---- */
    libertyIsland(o = {}) { // la Estatua de la Libertad sobre su isla estrellada, rodeada de agua
      const X = H.X, g = X.g, s = place(70, { inside: true }); if (!s) return; const k = Math.min(1, s.k + 0.15);
      g.save(); g.translate(s.x, s.y); g.scale(k, k);
      disc(g, 0, 0, 66, "#6FB4D6", "#3F8CB4"); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 66, 0, TAU); g.stroke(); g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.stroke();
      const star = (r0, r1, dx, dy) => { g.beginPath(); for (let q = 0; q < 22; q++) { const a = q / 22 * TAU, r = q % 2 ? r0 : r1; g.lineTo(Math.cos(a) * r + dx, Math.sin(a) * r + dy); } g.closePath(); };
      g.fillStyle = "rgba(10,40,60,.28)"; star(24, 40, 5, 6); g.fill(); g.fillStyle = "#D9D3BF"; star(24, 40, 0, 0); g.fill(); g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 0.8; g.stroke(); g.fillStyle = "#6FA070"; g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.fill();
      lsh(g, 0, 0, 4, 82, 0.97, 0.32); sq(g, 0, 0, 14, "#EDE9DB", "#B8B39F"); disc(g, 0, 0, 5.6, "#9BDCC4", "#4F9A80");
      g.strokeStyle = "#7FC8AE"; g.lineWidth = 1.6; for (let q = 0; q < 7; q++) { const a = -2.3 + q * 0.5; g.beginPath(); g.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); g.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5); g.stroke(); }
      disc(g, -7, -9, 2.4, "#FFE9A0", "#E8B63A");
      g.restore(); H.pad(s.x, s.y, 70 * k);
    },
    empire(o = {}) { // el Empire State: tres cuerpos escalonados y una aguja con sombra larga
      const X = H.X, g = X.g, s = place(40, { inside: true }); if (!s) return; const k = 1.25 * Math.min(1, s.k + 0.2);
      g.save(); g.translate(s.x, s.y); g.scale(k, k);
      lsh(g, 0, 0, 7, 230, 0.97, 0.3); sq(g, 0, 0, 44, "#C7CBD0", "#9AA1AA");
      for (const [sz, c0, c1] of [[34, "#DDE0E4", "#A8AEB6"], [24, "#E8EAEC", "#B3B9C0"], [15, "#F1F2F4", "#BCC2C8"], [8, "#F8F8F8", "#C9CED4"]]) sq(g, 0, 0, sz, c0, c1);
      g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 0.7; for (const sz of [34, 24, 15]) { g.beginPath(); g.moveTo(-sz / 2, -sz / 2); g.lineTo(sz / 2, sz / 2); g.moveTo(sz / 2, -sz / 2); g.lineTo(-sz / 2, sz / 2); g.stroke(); }
      disc(g, 0, 0, 2, "#FFFFFF", "#D8392F"); g.restore(); H.pad(s.x, s.y, 50 * k); H.X.lights.push({ x: s.x, y: s.y, w: 8, h: 8, c: "#FF5C5C", big: 30, ph: 2 });
    },
    /* ---- Berlín ---- */
    brandenburg(o = {}) { // la Puerta de Brandeburgo: doce columnas, cuadriga, plaza y árboles
      const X = H.X, g = X.g, s = roomy(66, "top") || place(66, { inside: true }); if (!s) return; const k = 1.5 * Math.min(1, s.k);
      g.save(); g.translate(s.x, s.y); g.scale(k, k);
      g.fillStyle = "rgba(214,208,190,.8)"; g.fillRect(-52, -34, 104, 68); g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 1; g.strokeRect(-52, -34, 104, 68);
      for (let q = -40; q <= 40; q += 10) { disc(g, q, -27, 3.4, "#6BA060", "#3F7A3F"); disc(g, q, 29, 3.4, "#6BA060", "#3F7A3F"); }
      g.fillStyle = "rgba(18,24,34,.24)"; g.fillRect(-42, -9, 90, 24);
      const lg = g.createLinearGradient(0, -14, 0, 14); lg.addColorStop(0, "#F0E6C8"); lg.addColorStop(1, "#C8B98E"); g.fillStyle = lg; g.fillRect(-44, -11, 88, 22);
      g.fillStyle = "#E8DDBC"; g.fillRect(-44, -3, 88, 6);
      for (const y of [-8, 8]) for (let q = -38; q <= 38; q += 7.6) { g.fillStyle = "rgba(18,24,34,.3)"; g.beginPath(); g.arc(q + 1.4, y + 1.6, 2.6, 0, TAU); g.fill(); disc(g, q, y, 2.6, "#FFFFFF", "#B7AE92"); }
      g.fillStyle = "#6E6350"; poly(g, [[-6, -3], [6, -3], [10, 3], [-10, 3]]); g.fill(); g.fillStyle = "#B88E2E"; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill();
      g.restore(); H.pad(s.x, s.y, 66 * k);
    },
    /* ---- Río de Janeiro ---- */
    cristo(o = {}) { // el Corcovado con el Cristo Redentor (brazos abiertos) y su sombra
      const X = H.X, g = X.g, s = place(62, { inside: true }); if (!s) return; const k = Math.min(1.1, 0.75 + s.k * 0.4);
      g.save(); g.translate(s.x, s.y); g.scale(k, k);
      g.fillStyle = "rgba(24,40,20,.3)"; g.beginPath(); g.ellipse(10, 12, 64, 58, 0, 0, TAU); g.fill();
      const rg = g.createRadialGradient(-14, -16, 4, 0, 0, 62); rg.addColorStop(0, "#9BB772"); rg.addColorStop(0.55, "#5E8A4A"); rg.addColorStop(1, "#37603A"); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.fill();
      g.strokeStyle = "rgba(20,50,20,.35)"; g.lineWidth = 1; for (const r of [46, 34, 22, 11]) { g.beginPath(); g.arc(-r * 0.12, -r * 0.1, r, 0, TAU); g.stroke(); }
      g.strokeStyle = "rgba(240,230,200,.8)"; g.lineWidth = 1.4; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(40, 36); g.bezierCurveTo(20, 30, 36, 10, 14, 6); g.stroke(); g.setLineDash([]);
      g.fillStyle = "rgba(10,20,10,.32)"; g.fillRect(2, -2, 46, 4.5); g.fillRect(34, -10, 4.5, 20); g.fillRect(10, 2, 4.5, 36);   // sombra en cruz
      g.fillStyle = "#F7F7F2"; g.fillRect(-12, -2.4, 24, 4.8); g.fillRect(-2.4, -12, 4.8, 22); disc(g, 0, -11, 3.2, "#FFFFFF", "#CFCFC6");
      g.restore(); H.pad(s.x, s.y, 64 * k);
    },
    sugarloaf(o = {}) { // el Pan de Azúcar con su teleférico
      const X = H.X, g = X.g, s = place(40, { inside: false, margins: [30, 18, 8] }) || place(36, { inside: true }); if (!s) return;
      g.save(); g.translate(s.x, s.y); g.fillStyle = "rgba(20,24,16,.3)"; g.beginPath(); g.ellipse(10, 12, 38, 32, 0.3, 0, TAU); g.fill();
      disc(g, 0, 0, 34, "#D5D6D8", "#7C828C"); g.strokeStyle = "rgba(40,45,55,.3)"; g.lineWidth = 1; for (let q = 0; q < 7; q++) { const a = q / 7 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 33, Math.sin(a) * 33); g.stroke(); }
      g.strokeStyle = "rgba(20,20,24,.55)"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-48, 22); g.lineTo(4, -2); g.stroke(); g.fillStyle = "#E8453C"; g.fillRect(-22, 7, 8, 5); g.restore(); H.pad(s.x, s.y, 40);
    },
    /* ---- Buenos Aires ---- */
    obelisco(o = {}) { // el Obelisco en su plaza con avenidas
      const X = H.X, g = X.g, s = place(64, { inside: true }); if (!s) return; const k = Math.min(1.1, 0.7 + s.k * 0.4);
      g.save(); g.translate(s.x, s.y); g.scale(k, k);
      g.fillStyle = "rgba(190,186,172,.9)"; g.beginPath(); g.arc(0, 0, 56, 0, TAU); g.fill(); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 56, 0, TAU); g.stroke();
      g.strokeStyle = "#6F727A"; g.lineWidth = 12; g.lineCap = "butt"; for (let q = 0; q < 6; q++) { const a = q / 6 * TAU + 0.3; g.beginPath(); g.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); g.lineTo(Math.cos(a) * 70, Math.sin(a) * 70); g.stroke(); }
      g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; g.setLineDash([5, 5]); for (let q = 0; q < 6; q++) { const a = q / 6 * TAU + 0.3; g.beginPath(); g.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); g.lineTo(Math.cos(a) * 68, Math.sin(a) * 68); g.stroke(); } g.setLineDash([]);
      disc(g, 0, 0, 17, "#9ECB82", "#5E9A4F"); lsh(g, 0, 0, 8, 200, 0.97, 0.3); sq(g, 0, 0, 10, "#FFFFFF", "#D2D4D8"); g.fillStyle = "#C9CBD0"; poly(g, [[-3.5, -3.5], [3.5, -3.5], [0, 0]]); g.fill();
      g.restore(); H.pad(s.x, s.y, 66 * k);
    },
    /* ---- Toronto ---- */
    cn(o = {}) { // la CN Tower: base en Y, cápsula y sombra larguísima
      const X = H.X, g = X.g, s = place(40, { inside: true }); if (!s) return; const k = Math.min(1.2, 0.8 + s.k * 0.4);
      g.save(); g.translate(s.x, s.y); g.scale(k, k);
      lsh(g, 0, 0, 6, 250, 0.99, 0.3); g.fillStyle = "rgba(18,24,34,.3)"; g.beginPath(); g.ellipse(150 * 0.62 * 0.54 + 6, 250 * 0.8 * 0.6 + 6, 17, 10, 0.9, 0, TAU); g.fill();
      for (let q = 0; q < 3; q++) { const a = q / 3 * TAU - 1.57; disc(g, Math.cos(a) * 12, Math.sin(a) * 12, 10, "#E6E9ED", "#8E96A2"); }
      disc(g, 0, 0, 9, "#F4F5F7", "#A6ADB8"); disc(g, 0, 0, 16, "#FFFFFF", "#9CA4B0"); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 16, 0, TAU); g.stroke(); disc(g, 0, 0, 5, "#C9CED6", "#6B7380");
      g.fillStyle = "#D8392F"; g.beginPath(); g.arc(0, 0, 1.6, 0, TAU); g.fill(); g.restore(); H.pad(s.x, s.y, 42 * k); H.X.lights.push({ x: s.x, y: s.y, w: 10, h: 10, c: "#FF6A5C", big: 34, ph: 1 });
    },
    /* ---- Lisboa ---- */
    belem(o = {}) { // la Torre de Belém: torre almenada con garitas, sobre su foso
      const X = H.X, g = X.g, s = place(40, { inside: true }); if (!s) return; const k = 1.3 * Math.min(1, s.k + 0.2);
      g.save(); g.translate(s.x, s.y); g.scale(k, k);
      g.fillStyle = "#7FB2C8"; g.fillRect(-32, -30, 64, 60); g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 1.5; g.strokeRect(-32, -30, 64, 60);
      sq(g, 0, 4, 40, "#F0E6CC", "#C9BC98"); g.fillStyle = "#D8CCAC"; g.fillRect(-14, -26, 28, 14); g.strokeStyle = "rgba(90,70,40,.4)"; g.lineWidth = 0.8; g.strokeRect(-14, -26, 28, 14);
      for (const [dx, dy] of [[-19, -16], [19, -16], [-19, 24], [19, 24]]) { disc(g, dx, dy, 4.4, "#FBF3DC", "#BDB08C"); disc(g, dx, dy, 1.8, "#9C8458", "#6B5A3A"); }
      sq(g, 0, -4, 16, "#F7EED6", "#C4B691"); g.fillStyle = "#9C3F2E"; poly(g, [[-5, -9], [5, -9], [5, 1], [-5, 1]]); g.fill();
      g.restore(); H.pad(s.x, s.y, 46 * k);
    },
    /* ---- Tokio ---- */
    tokyoTower(o = {}) { // la Torre de Tokio: celosía naranja y blanca
      const X = H.X, g = X.g, s = place(38, { inside: true }); if (!s) return; const k = 1.25 * Math.min(1, s.k + 0.2);
      g.save(); g.translate(s.x, s.y); g.scale(k, k);
      lsh(g, 0, 0, 5, 210, 0.98, 0.3);
      sq(g, 0, 0, 36, "#F4F1EA", "#C8C2B4"); g.strokeStyle = "#E8501E"; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-18, -18); g.lineTo(18, 18); g.moveTo(18, -18); g.lineTo(-18, 18); g.stroke(); g.strokeRect(-18, -18, 36, 36);
      sq(g, 0, 0, 22, "#FFFFFF", "#D9D4C6"); g.strokeStyle = "#E8501E"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-11, -11); g.lineTo(11, 11); g.moveTo(11, -11); g.lineTo(-11, 11); g.stroke(); g.strokeRect(-11, -11, 22, 22);
      sq(g, 0, 0, 10, "#FF7A3C", "#D2491C"); disc(g, 0, 0, 2.4, "#FFFFFF", "#D8392F");
      g.restore(); H.pad(s.x, s.y, 44 * k); H.X.lights.push({ x: s.x, y: s.y, w: 10, h: 10, c: "#FF7A3C", big: 36, ph: 1 });
    },
    faro(o = {}) { // el Faro del Comercio: columna naranja con su rayo
      const X = H.X, g = X.g, s = place(14, { inside: o.inside != null ? o.inside : false, margins: [40, 26, 14] }); if (!s) return;
      g.save(); g.translate(s.x, s.y); lsh(g, 0, 0, 5, 190, 0.97, 0.3); sq(g, 0, 0, 12, "#F4753A", "#B83F14"); disc(g, 0, 0, 2.6, "#FFD9A0", "#FF8A3C"); g.restore(); H.pad(s.x, s.y, 20);
      H.X.lights.push({ x: s.x, y: s.y, w: 8, h: 8, c: "#FF8A3C", big: 40, ph: 2 });
    },
  };
  return P;
});

/* ---------- Las ciudades: lo nuevo va primero (para que tome los mejores lugares) y lo viejo equivalente se apaga ---------- */
(() => {
  const hw = () => Scenery.HW(), ap = (o) => Scenery.push(o);
  const upgrade = (name, off, first, after) => {
    const old = Scenery.def({ name }), ob = old.build;
    Scenery.addScenes({ [name]: Object.assign({}, old, { build(S) { const S2 = Object.assign({}, S); off.forEach((k) => { S2[k] = () => null; }); first(S2); ob(S2); if (after) after(S2); } }) });
  };
  // Monterrey: Parque Fundidora con el Horno 3, el Cerro de la Silla y el Faro del Comercio, sobre pasto
  Scenery.addScenes({
    Monterrey: { clouds: 0.5, wind: true, build(S) {
      S.horno3({}); S.cerro({}); S.faro({}); S.patch(["grass", "grass", "grass"], { fill: 0.7 }); S.pond({ rx: 46, ry: 26 });
      S.grove(8, "round", ["#2D5A33", "#3E7443"], { cnt: 14 }); S.houses(4, "flat", { cnt: 9 }); S.towers(6, { hgt: 34, w: 24, cols: ["#C9B8A0", "#B8A68C", "#D9CBB0"], city: false });
      S.lot({}); S.serviceRoad(hw() + 40, "#B7A98C"); S.speckle(["#F4F2EC", "#E8C84A"], 300); ap({ t: "birds", n: 5, col: "#2B2B30", sp: 18 }); } },
  });
  upgrade("New York", ["liberty"], (S) => { S.libertyIsland({}); S.empire({}); });
  upgrade("London", ["westminster", "ferris"], (S) => { S.bigBen({}); S.eye({}); });
  upgrade("Berlin", ["gate"], (S) => { S.brandenburg({}); });
  upgrade("Rio de Janeiro", ["christ"], (S) => { S.cristo({}); S.sugarloaf({}); });
  upgrade("Buenos Aires", ["spire"], (S) => { S.obelisco({}); });
  upgrade("Toronto", ["cntower"], (S) => { S.cn({}); });
  upgrade("Lisbon", [], (S) => { S.belem({}); });
  upgrade("Tokyo", [], (S) => { S.tokyoTower({}); });
})();
