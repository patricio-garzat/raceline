"use strict";
/* pick.js: elige la versión del juego (compu o celular): tamaño del mundo, vueltas y lista de circuitos. Se decide una vez, al abrir. */

const DESKTOP = (() => {
  const q = new URLSearchParams(location.search);
  if (q.get("desktop")) return true;
  if (q.get("mobile")) return false;
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && Math.min(innerWidth, innerHeight) < 700) return false;
  return innerWidth >= 900 && innerWidth / Math.max(1, innerHeight) > 1.15;
})();
const LAPS = DESKTOP ? 2 : 3;
const WORLD = DESKTOP ? { w: 1600, h: 1000 } : { w: 640, h: 1000 };
const LEVELS = DESKTOP ? LEVELS_D : LEVELS_P;
document.documentElement.classList.toggle("desk", DESKTOP);
