"use strict";
/* core.js: utilidades, idioma, guardado, tema y vibración */

const $ = (id) => document.getElementById(id);
const isNative = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);   // (la usa el tutorial de la primera vez)
const hyp = Math.hypot;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Idioma (0 = English, 1 = Español) ---------- */
let LANG = 0;
const ORD = [["", "1st", "2nd", "3rd", "4th"], ["", "1.º", "2.º", "3.º", "4.º"]];
const ORD_LONG = [["", "1st place", "2nd place", "3rd place", "4th place"], ["", "Primer lugar", "Segundo lugar", "Tercer lugar", "Cuarto lugar"]];
const STR = {
  tagline: ["Draw the fastest line", "Dibuja la línea más rápida"],
  levels: ["Levels", "Niveles"],
  how: ["How to play", "Cómo jugar"],
  records: ["Records", "Récords"],
  settings: ["Settings", "Ajustes"],
  garage: ["Garage", "Garaje"],
  round: ["Round", "Fecha"],
  boost: ["Boost", "Boost"],
  sec_gp: ["Grand Prix", "Gran Premio"], sec_wt: ["World Tour", "Gira mundial"],
  vic_winner: ["Winner", "Ganador"], vic_ahead: ["ahead", "adelante"],
  tt_driver: ["Your name", "Tu nombre"], you: ["You", "Tú"], st_title: ["Final classification", "Clasificación final"], st_fl: ["Fastest lap", "Vuelta rápida"],
  sec_my: ["My circuits", "Mis circuitos"], c_new: ["New circuit", "Nuevo circuito"], c_new_sub: ["Draw your own", "Dibuja el tuyo"],
  c_edit_title: ["Edit circuit", "Editar circuito"], c_draw_hint: ["Draw a closed loop in one stroke and end where you began.", "Dibuja un circuito cerrado de un solo trazo y termina donde empezaste."],
  c_ok: ["Looks good. Pick a name and scenery.", "Se ve bien. Elige nombre y paisaje."], c_redraw: ["Redraw", "Dibujar de nuevo"], c_name: ["Name", "Nombre"],
  c_width: ["Road", "Calle"], c_w1: ["Narrow", "Angosta"], c_w2: ["Normal", "Normal"], c_w3: ["Wide", "Ancha"], c_theme: ["Scenery", "Paisaje"],
  c_diff: ["Rivals", "Rivales"], c_d1: ["Easy", "Fácil"], c_d2: ["Medium", "Medio"], c_d3: ["Hard", "Difícil"], c_save: ["Save and race", "Guardar y correr"],
  c_race: ["Race", "Correr"], c_edit: ["Edit", "Editar"], c_delete: ["Delete", "Borrar"], c_del_q: ["Delete this circuit?", "¿Borrar este circuito?"],
  c_my_sub: ["Custom circuit", "Circuito propio"], c_default: ["My circuit", "Mi circuito"],
  c_err_open: ["Close the loop: finish near where you started.", "Cierra el circuito: termina cerca de donde empezaste."],
  c_err_small: ["Too small. Draw a bigger track.", "Muy pequeño. Dibuja una pista más grande."],
  c_err_tight: ["Some corners are too tight. Round them off.", "Hay curvas muy cerradas. Suavízalas."],
  c_err_close: ["The track touches itself. Keep the roads apart.", "La pista se toca a sí misma. Separa los tramos."],
  c_err_straight: ["Add a long straight for the start line.", "Agrega una recta larga para la salida."],
  c_err_width: ["That road is too wide for this shape.", "Esa calle es muy ancha para esta forma."],
  t_meadow: ["Meadow", "Pradera"], t_alpine: ["Alpine", "Alpes"], t_forest: ["Forest", "Bosque"], t_desert: ["Desert", "Desierto"], t_fields: ["Fields", "Campos"],
  t_tropic: ["Tropical", "Trópico"], t_city: ["City", "Ciudad"], t_night: ["Night city", "Ciudad de noche"], t_coast: ["Coast", "Costa"], t_air: ["Airfield", "Aeródromo"],
  play: ["Play", "Jugar"], continue: ["Continue", "Continuar"],
  pos: ["Pos", "Lugar"], tm_last: ["Last", "Última"], tm_best: ["Best", "Mejor"],
  g_presets: ["Designs", "Diseños"], g_colors: ["Colors", "Colores"], g_stripes: ["Stripes", "Franjas"], g_number: ["Number", "Número"], g_paint: ["Paint", "Pintar"],
  g_body: ["Body", "Carrocería"], g_accent: ["Stripe", "Franja"], g_wings: ["Wings", "Alerones"], g_helmet: ["Helmet", "Casco"], g_tyres: ["Tyres", "Llantas"],
  g_s_none: ["None", "Ninguna"], g_s_center: ["Center", "Central"], g_s_twin: ["Twin", "Doble"], g_s_side: ["Sides", "Laterales"], g_s_chevron: ["Chevron", "Chevrón"], g_s_band: ["Rear band", "Banda"], g_s_checker: ["Checker", "Cuadros"],
  g_num_note: ["Drag anywhere to move it, pinch to resize. The dash means no number.", "Arrastra en cualquier parte para moverlo y pellizca para el tamaño. El guion es sin número."],
  g_eraser: ["Eraser", "Borrador"], g_mirror: ["Mirror", "Espejo"],
  g_paint_note: ["Draw right on the car. With Mirror on, both sides match.", "Dibuja sobre el carro. Con Espejo, los dos lados quedan iguales."],
  g_custom: ["Custom color", "Color personalizado"], g_stripe_col: ["Stripe color", "Color de la franja"], g_num_drag: ["Drag the number to move it. Pinch with two fingers to resize.", "Arrastra el número para moverlo. Pellizca con dos dedos para cambiar el tamaño."],
  g_size: ["Size", "Tamaño"], g_color: ["Color", "Color"], g_rotate: ["Rotate", "Girar"], g_outline: ["Outline", "Borde"], g_reset_pos: ["Reset", "Restablecer"],
  g_brush: ["Brush", "Pincel"], g_line: ["Line", "Línea"], g_stamp: ["Decal", "Calcomanía"], g_opacity: ["Opacity", "Opacidad"],
  back: ["Back", "Atrás"],
  clear: ["Clear", "Borrar"],
  start: ["Start race", "Empezar carrera"],
  go: ["Go", "Ya"],
  hint_draw: ["Draw one lap from the line", "Dibuja una vuelta desde la meta"],
  hint_ok: ["Ready when you are", "Lista cuando quieras"],
  hint_good: ["Great line. Ready when you are", "Gran línea. Lista cuando quieras"],
  hint_tip: ["Smoother and tighter is faster", "Más suave y por dentro es más rápida"],
  undo: ["Undo", "Deshacer"],
  hint_cont: ["Touch the line's end to keep drawing", "Toca el final de la línea para seguir"],
  hint_done: ["Lap complete. Undo or Clear to change", "Vuelta completa. Deshacer o Borrar"],
  err_full: ["Draw a full lap", "Dibuja una vuelta completa"],
  err_start: ["Start at the line", "Empieza en la meta"],
  err_road: ["Stay close to the road", "Mantente cerca de la calle"],
  err_dir: ["Follow the arrows", "Sigue las flechas"],
  lap: ["Lap {0}/{1}", "Vuelta {0}/{1}"],
  sub1: ["Clean racing.", "Carrera limpia."],
  sub2: ["Nice drive. Can you take first?", "Buen manejo. ¿Puedes ganar?"],
  sub3: ["Close. Cut tighter to the inside of each corner.", "Cerca. Pégate más al interior de cada curva."],
  sub0: ["Finish 3rd or better to move on. Try a tighter line.", "Termina 3.º o mejor para avanzar. Prueba una línea más cerrada."],
  race_time: ["Race time", "Tiempo"],
  vs_best: ["Your line vs best", "Tu línea vs la mejor"],
  perfect: ["Perfect", "Perfecta"],
  per_lap: ["+{0}% per lap", "+{0}% por vuelta"],
  redraw: ["Redraw", "Redibujar"],
  again: ["Race again", "Correr otra vez"],
  next: ["Next level", "Siguiente nivel"],
  menu: ["Levels", "Niveles"],
  home: ["Home", "Inicio"],
  lvl_name_1: ["Plaza", "Plaza"],
  lvl_name_2: ["Downtown", "Centro"],
  lvl_name_3: ["Harbor Ave", "Av. del Puerto"],
  lvl_sub_1: ["Wide, open corners", "Curvas amplias y abiertas"],
  lvl_sub_2: ["Tight S-curves", "Curvas en S cerradas"],
  lvl_sub_3: ["Long straight, sharp hairpin", "Recta larga y horquilla"],
  locked: ["Finish the previous level", "Termina el nivel anterior"],
  badge_next: ["Next", "Siguiente"],
  lap_n: ["Lap {0}", "Vuelta {0}"],
  best_lbl: ["Best", "Mejor"],
  best_lap: ["Best lap", "Mejor vuelta"],
  set_tut: ["Show the tutorial again", "Ver el tutorial otra vez"],
  tut_done: ["Done", "Listo"],
  demo_hint: ["Draw a line like this one", "Dibuja una línea como esta"],
  soon: ["More levels coming soon", "Más niveles pronto"],
  how1_t: ["Draw your line", "Dibuja tu línea"],
  how1_d: ["Before each race, trace one lap with your finger. Start at the checkered line and follow the arrows.", "Antes de cada carrera, traza una vuelta con el dedo. Empieza en la línea de cuadros y sigue las flechas."],
  how2_t: ["Cut the corners", "Corta las curvas"],
  how2_d: ["The fastest line is smooth. Enter wide, touch the inside of the corner, and leave wide. Sharp turns slow your car down.", "La línea más rápida es suave. Entra abierto, toca el interior de la curva y sal abierto. Los giros bruscos frenan tu carro."],
  how3_t: ["Stay on the road", "Quédate en la calle"],
  how3_d: ["Leaving the road costs speed. Your line is pulled back to the edge, so you can always finish.", "Salir de la calle te hace perder velocidad. Tu línea se ajusta al borde, así que siempre puedes terminar."],
  how4_t: ["Race and earn stars", "Corre y gana estrellas"],
  how4_d: ["Your car follows your line for three laps. Finish 1st for three stars, 2nd for two, 3rd for one. 4th means try again. Tap Boost once per race for a short push to pass. Tap Boost once per race for a short push to pass.", "Tu carro sigue tu línea durante tres vueltas. Primer lugar: tres estrellas; segundo: dos; tercero: una. Cuarto: vuelve a intentarlo. Toca Boost una vez por carrera para un empujón corto al rebasar."],
  rec_place: ["Best place", "Mejor lugar"],
  rec_time: ["Best time", "Mejor tiempo"],
  rec_stars: ["Stars", "Estrellas"],
  rec_races: ["Races", "Carreras"],
  rec_wins: ["Wins", "Victorias"],
  rec_none: ["Not raced yet", "Sin correr"],
  rec_total: ["Totals", "Totales"],
  set_sound: ["Sound", "Sonido"],
  set_music: ["Music", "Música"],
  set_haptics: ["Vibration", "Vibración"],
  set_haptics_web: ["iPhone app only", "Solo en la app de iPhone"],
  set_theme: ["Theme", "Tema"],
  theme_auto: ["Auto", "Auto"],
  theme_light: ["Light", "Claro"],
  theme_dark: ["Dark", "Oscuro"],
  set_lang: ["Language", "Idioma"],
  set_erase: ["Erase data", "Borrar datos"],
  erase_q: ["Erase all stars and records? This cannot be undone.", "¿Borrar todas las estrellas y récords? No se puede deshacer."],
  cancel: ["Cancel", "Cancelar"],
  erase_ok: ["Erase", "Borrar"],
  about: ["About", "Acerca de"],
  version: ["Version", "Versión"],
  website: ["Website", "Sitio web"],
  support: ["Support", "Soporte"],
};
function T(k, ...a) {
  const v = STR[k];
  let s = v ? v[LANG] : k;
  a.forEach((x, i) => { s = s.split("{" + i + "}").join(x); });
  return s;
}
function applyI18n() {
  document.documentElement.lang = LANG ? "es" : "en";
  document.querySelectorAll("[data-i]").forEach((el) => { el.textContent = T(el.dataset.i); });
  document.querySelectorAll("[data-i-ph]").forEach((el) => el.setAttribute("placeholder", T(el.dataset.iPh)));
  document.querySelectorAll("[data-i-label]").forEach((el) => el.setAttribute("aria-label", T(el.dataset.iLabel)));
}

/* ---------- Guardado y ajustes (siempre con try/catch: en modo privado puede fallar) ---------- */
const SAVE_KEY = "raceline-save-v2", SET_KEY = "raceline-settings-v1";
const freshSave = () => ({ levels: {}, races: 0, wins: 0, car: null, custom: [], customNext: 1001 });
const freshSettings = () => ({ name: "", sound: true, music: true, haptics: true, theme: "auto", lang: (navigator.language || "en").toLowerCase().startsWith("es") ? 1 : 0 });
function loadJSON(key, fresh) {
  const base = fresh();
  try { const raw = JSON.parse(localStorage.getItem(key) || "null"); if (raw && typeof raw === "object") Object.assign(base, raw); } catch (e) {}
  return base;
}
const Save = loadJSON(SAVE_KEY, freshSave);
const Settings = loadJSON(SET_KEY, freshSettings);
LANG = Settings.lang | 0;
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(Save)); } catch (e) {}
  try { localStorage.setItem(SET_KEY, JSON.stringify(Settings)); } catch (e) {}
}
addEventListener("pagehide", persist);
function eraseProgress() { const f = freshSave(); f.car = Save.car; for (const k of Object.keys(Save)) delete Save[k]; Object.assign(Save, f); persist(); }

/* ---------- Tema ---------- */
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
const themeHooks = [];
const resolvedTheme = () => (Settings.theme === "auto" ? (darkMQ.matches ? "dark" : "light") : Settings.theme);
function applyTheme() {
  const t = resolvedTheme();
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", t === "dark" ? "#0E0E0F" : "#F2F2F0"));
  try { const sb = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.StatusBar; if (sb) sb.setStyle({ style: t === "dark" ? "DARK" : "LIGHT" }); } catch (e) {}
  themeHooks.forEach((f) => f(t));
}
(darkMQ.addEventListener ? darkMQ.addEventListener.bind(darkMQ, "change") : darkMQ.addListener.bind(darkMQ))(() => { if (Settings.theme === "auto") applyTheme(); });

/* ---------- Vibración: Capacitor Haptics en la app; navigator.vibrate en Android; en Safari de iPhone no hay ---------- */
const Haptics = (() => {
  const plugin = () => (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Haptics) || null;
  const webVibrate = () => typeof navigator.vibrate === "function" && !/iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator.userActivation && !navigator.userActivation.hasBeenActive);
  let last = 0;
  const available = () => !!plugin() || webVibrate();
  const on = () => Settings.haptics && available();
  function impact(style = "LIGHT", minGap = 40) {
    if (!on()) return;
    const now = performance.now();
    if (now - last < minGap) return;
    last = now;
    const p = plugin();
    if (p) { try { p.impact({ style }); } catch (e) {} return; }
    navigator.vibrate(style === "HEAVY" ? 28 : style === "MEDIUM" ? 16 : 8);
  }
  return {
    available,
    tap: () => impact("LIGHT", 30),
    soft: () => impact("LIGHT", 20),
    medium: () => impact("MEDIUM", 60),
    heavy: () => impact("HEAVY", 80),
    success() {
      if (!on()) return;
      const p = plugin();
      if (p && p.notification) { try { p.notification({ type: "SUCCESS" }); } catch (e) {} }
      else if (navigator.vibrate) navigator.vibrate([12, 60, 18]);
    },
  };
})();
