"use strict";
/* ui.js: pantallas (inicio con niveles, cómo jugar, récords, ajustes), diálogo y respuesta de los botones */

const ICON = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  how: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1.9-1.1 1.8M12 17.2h.01"/>',
  records: '<path d="M5.5 21V4M5.5 4.5h11.5l-2.3 4 2.3 4H5.5"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7M10.2 10.5v6M13.8 10.5v6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.2"/><path d="M8 11V8.2a4 4 0 0 1 8 0V11"/>',
  draw: '<path d="M4 20l1.2-4.2L16.6 4.4a1.9 1.9 0 0 1 2.7 0l.3.3a1.9 1.9 0 0 1 0 2.7L8.2 18.8z"/><path d="M14.5 6.5l3 3"/>',
  curve: '<path d="M4 20C4 11 8 6 20 6"/><path d="M4 20h0M20 6h0" /><path d="M15 3l5 3-5 3"/>',
  road: '<path d="M8 21L10 3M16 21L14 3"/><path d="M12 5v2.5M12 10.5V13M12 16v3"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h11.5l-2.3 4 2.3 4H5.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  car: '<path d="M3.5 8.5v7M20.5 9v6"/><path d="M6 12h3.2l1.6-2.4h3.6l5.6 1.4v2l-5.6 1.4h-3.6L9.2 12"/><path d="M8.5 6.5h3M8.5 17.5h3M15.5 7.2h2M15.5 16.8h2"/>',
};
const STAR_PATH = "M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4L2.8 9.5l6.4-.8z";
const starsSvg = (n) => [0, 1, 2].map((i) => `<svg viewBox="0 0 24 24" class="${i < n ? "on" : "off"}" stroke-width="1.6" stroke-linejoin="round"><path d="${STAR_PATH}"/></svg>`).join("");

const UI = (() => {
  const home = $("scr-home"), title = $("scr-title"), subs = { how: $("scr-how"), records: $("scr-records"), settings: $("scr-settings"), garage: $("scr-garage") };
  let open = null, baseOpen = home;

  function thumb(lv) {
    const C = centerlineOf(lv), pts = C.filter((p, i) => i % 6 === 0), ew = Math.round(lv.roadW * 0.8), rw = Math.round(lv.roadW * 0.52);
    const d = "M" + pts.map((p) => p[0].toFixed(0) + " " + p[1].toFixed(0)).join("L") + "Z";
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    const pd = ew / 2 + 14, vb = [x0 - pd, y0 - pd, x1 - x0 + 2 * pd, y1 - y0 + 2 * pd].map((v) => v.toFixed(0)).join(" ");
    return `<svg viewBox="${vb}" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--thumb-edge)" stroke-width="${ew}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="var(--thumb-road)" stroke-width="${rw}" stroke-linejoin="round"/></svg>`;
  }
  function buildLevels() {
    const box = $("levels"); box.innerHTML = "";
    let total = 0, nextId = 0;
    LEVELS.forEach((lv) => { const sv = lvlSave(lv.id); total += sv.stars; if (!nextId && isUnlocked(lv) && sv.stars === 0) nextId = lv.id; });
    $("total-n").textContent = total; $("total-of").textContent = "/ " + LEVELS.length * 3;
    const play = (lv) => { Sound.nav(); enterLevel(lv); };
    let lastGrp = 0;
    LEVELS.forEach((lv, idx) => {
      if (lv.grp !== lastGrp) { lastGrp = lv.grp; const h = document.createElement("div"); h.className = "lv-sec"; h.innerHTML = `<span>${T(lv.grp === 1 ? "sec_gp" : "sec_wt")}</span><i></i>`; box.appendChild(h); }
      const s = lvlSave(lv.id), ok = isUnlocked(lv), b = document.createElement("button");
      b.className = "tile" + (ok ? "" : " locked") + (lv.id === nextId ? " next" : ""); b.dataset.tap = ""; b.style.setProperty("--i", Math.min(idx, 14)); b.setAttribute("aria-label", lv.name);
      b.innerHTML = `<span class="thumb-w"><span class="thumb" style="background:${mix(ENVS[lv.env].g1, -0.66)}">${thumb(lv)}</span><img class="flag" src="${FLAGS[lv.cc].src}" alt=""></span><span class="tn"><small>${String(lv.id).padStart(2, "0")}</small><b>${lv.name}</b>${ok ? `<span class="lvl-stars">${starsSvg(s.stars)}</span>` : `<svg class="ic lk" viewBox="0 0 24 24">${ICON.lock}</svg>`}</span>`;
      if (ok) b.onclick = () => play(lv); else b.setAttribute("aria-disabled", "true");
      box.appendChild(b);
    });
    // mis circuitos: el botón de crear y los que ya dibujó el jugador
    { const h = document.createElement("div"); h.className = "lv-sec"; h.innerHTML = `<span>${T("sec_my")}</span><i></i>`; box.appendChild(h);
      const nb = document.createElement("button"); nb.className = "tile newc"; nb.dataset.tap = ""; nb.setAttribute("aria-label", T("c_new"));
      nb.innerHTML = `<span class="thumb-w"><span class="thumb plus"><svg viewBox="0 0 24 24" class="ic">${ICON.plus}</svg></span></span><span class="tn"><small>${T("c_new_sub")}</small><b>${T("c_new")}</b></span>`;
      nb.onclick = () => { Sound.nav(); Custom.open(null); }; box.appendChild(nb);
      Custom.list().forEach((lv, k) => {
        const s = lvlSave(lv.id), b = document.createElement("button");
        b.className = "tile"; b.dataset.tap = ""; b.setAttribute("aria-label", lv.name);
        b.innerHTML = `<span class="thumb-w"><span class="thumb" style="background:${mix(ENVS[lv.env].g1, -0.66)}">${thumb(lv)}</span><img class="flag" src="${FLAGS.cu.src}" alt=""></span><span class="tn"><small>C${String(k + 1).padStart(2, "0")}</small><b>${lv.name.replace(/[<>&]/g, "")}</b><span class="lvl-stars">${starsSvg(s.stars)}</span></span>`;
        b.onclick = () => { Sound.nav(); Custom.sheet(lv); }; box.appendChild(b);
      }); }
  }
  function nextLevel() { return LEVELS.find((l) => isUnlocked(l) && lvlSave(l.id).stars === 0) || LEVELS.find((l) => lvlSave(l.id).stars < 3) || LEVELS[LEVELS.length - 1]; }
  let markURL = null;
  function buildTitle() {
    const lv = nextLevel(), f = FLAGS[lv.cc], stars = LEVELS.reduce((a, l) => a + lvlSave(l.id).stars, 0);
    if (!markURL) { try { markURL = IntroScene.markURL(900, true); } catch (e) { markURL = ""; } } $("tt-mark").style.aspectRatio = String(IntroScene.markAspect()); if (markURL) $("tt-mark").src = markURL;
    $("tt-flag").src = f.src; $("tt-name").textContent = lv.name; $("tt-next").textContent = (stars ? T("continue") : T("play")) + " · " + T("round") + " " + String(lv.id).padStart(2, "0");
    $("tt-stars").textContent = stars + " / " + LEVELS.length * 3; $("tt-play").onclick = () => { Sound.nav(); enterLevel(lv); };
  }
  function showTitle() { buildTitle(); home.classList.remove("show"); title.classList.add("show"); }
  function showHome() { buildLevels(); title.classList.remove("show"); home.classList.add("show"); }
  function hideHome() { home.classList.remove("show"); title.classList.remove("show"); }
  $("tt-levels").onclick = () => { Sound.nav(); showHome(); };
  $("lv-back").onclick = () => { Sound.nav(); showTitle(); };
  { const nm = $("tt-driver"); nm.value = Settings.name || "";   // nombre del piloto: sale en la carrera y en la clasificación
    nm.addEventListener("input", () => { Settings.name = nm.value.replace(/[<>&"'`]/g, "").slice(0, 12); persist(); });
    nm.addEventListener("blur", () => { nm.value = Settings.name = (Settings.name || "").trim(); persist(); });
    nm.addEventListener("keydown", (e) => { if (e.key === "Enter") nm.blur(); }); }
  $("lv-new").onclick = () => { Sound.nav(); Custom.open(null); };

  function go(name) {
    if (open) return;
    if (name === "records") buildRecords();
    if (name === "settings") syncSettings();
    if (name === "garage") Garage.open();
    baseOpen = title.classList.contains("show") ? title : home; open = name; subs[name].classList.add("show"); baseOpen.classList.add("under"); Sound.nav();
  }
  function back() { if (!open) return; Sound.nav(); subs[open].classList.remove("show"); baseOpen.classList.remove("under"); open = null; }

  function buildRecords() {
    const box = $("rec-list"); box.innerHTML = "";
    let stars = 0; LEVELS.forEach((lv) => { stars += lvlSave(lv.id).stars; });
    const sum = document.createElement("div"); sum.className = "rec-sum";
    sum.innerHTML = [[stars + "<i>/" + LEVELS.length * 3 + "</i>", T("rec_stars")], [Save.races || 0, T("rec_races")], [Save.wins || 0, T("rec_wins")]].map(([v, l]) => `<div><b>${v}</b><small>${l}</small></div>`).join("");
    box.appendChild(sum);
    const grid = document.createElement("div"); grid.className = "rec-grid"; box.appendChild(grid);
    LEVELS.forEach((lv) => {
      const s = Save.levels[lv.id], t = document.createElement("div"); t.className = "rtile" + (s && s.races ? "" : " none");
      t.innerHTML = `<span class="rt-f"><img src="${FLAGS[lv.cc].src}" alt=""></span><span class="rt-t"><b>${lv.name}</b>${s && s.races ? `<span class="lvl-stars">${starsSvg(s.stars)}</span><small>${ORD[LANG][s.place]} · ${s.time.toFixed(1)} s${s.lap ? " · " + s.lap.toFixed(2) : ""}</small>` : `<small>${T("rec_none")}</small>`}</span>`;
      grid.appendChild(t);
    });
  }

  /* ---------- Ajustes ---------- */
  function syncSettings() {
    $("t-sound").setAttribute("aria-checked", Settings.sound); $("t-music").setAttribute("aria-checked", Settings.music !== false);
    const hv = Haptics.available();
    $("t-haptics").setAttribute("aria-checked", Settings.haptics && hv); $("t-haptics").disabled = !hv;
    $("haptics-note").textContent = hv ? "" : T("set_haptics_web");
    document.querySelectorAll("#seg-theme button").forEach((b) => b.classList.toggle("on", b.dataset.v === Settings.theme));
    document.querySelectorAll("#seg-lang button").forEach((b) => b.classList.toggle("on", +b.dataset.v === LANG));
    $("ver").textContent = window.APP_VERSION || "web";
  }
  $("t-sound").onclick = () => { Settings.sound = !Settings.sound; persist(); syncSettings(); if (Settings.sound) { Sound.wake(); setTimeout(() => Sound.tap(), 80); } else { Sound.enginesStop(); } Sound.musicSync(); };
  $("t-music").onclick = () => { Settings.music = Settings.music === false; persist(); syncSettings(); Sound.wake(); Sound.musicSync(); };
  $("t-haptics").onclick = () => { Settings.haptics = !Settings.haptics; persist(); syncSettings(); Haptics.tap(); };
  document.querySelectorAll("#seg-theme button").forEach((b) => { b.onclick = () => { Settings.theme = b.dataset.v; persist(); applyTheme(); syncSettings(); }; });
  document.querySelectorAll("#seg-lang button").forEach((b) => { b.onclick = () => { Settings.lang = LANG = +b.dataset.v; persist(); applyI18n(); syncSettings(); refreshHint(); if (home.classList.contains("show")) buildLevels(); }; });
  $("set-tut").onclick = () => { Save.demoSeen = false; persist(); const sp = $("set-tut").firstElementChild; sp.textContent = T("tut_done"); setTimeout(() => { sp.textContent = T("set_tut"); }, 1600); };
  $("set-erase").onclick = async () => { if (await ask(T("erase_q"), T("erase_ok"))) { eraseProgress(); buildLevels(); } };

  /* ---------- Diálogo ---------- */
  function ask(msg, okLabel) {
    return new Promise((res) => {
      const d = $("dialog"); $("dlg-msg").textContent = msg; $("dlg-ok").textContent = okLabel; $("dlg-no").textContent = T("cancel");
      d.classList.add("show");
      const done = (v) => { d.classList.remove("show"); res(v); };
      $("dlg-ok").onclick = () => done(true); $("dlg-no").onclick = () => done(false);
    });
  }

  document.querySelectorAll("[data-go]").forEach((b) => { b.onclick = () => go(b.dataset.go); });
  document.querySelectorAll("[data-back]").forEach((b) => { b.onclick = back; });
  document.querySelectorAll("[data-ic]").forEach((el) => { el.innerHTML = ICON[el.dataset.ic] || ""; });

  /* Toque ligero en los botones, y su "thump" suave */
  const tappable = (e) => e.target.closest && e.target.closest("button:not(:disabled), [data-tap]:not([aria-disabled])");
  document.addEventListener("pointerdown", (e) => { if (tappable(e)) Haptics.tap(); }, true);
  document.addEventListener("click", (e) => { const b = tappable(e); if (b && !b.dataset.quiet) Sound.tap(); }, true);

  return { showHome, showTitle, hideHome, go, back, buildLevels, ask };
})();
