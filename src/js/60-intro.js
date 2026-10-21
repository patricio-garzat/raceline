"use strict";
/* intro.js: intro de BluBer Games (logo oficial animado, ~4 s, sobre blanco) y arranque del juego.
   Es la misma animación que usa Cube Swipe; el sonido es del propio juego (motor suave y marimba). */

function playStudio(el, next, onStart) {
  const q = (id) => document.getElementById(id);
  const easeOut = "cubic-bezier(.16,1,.3,1)", inOut = "cubic-bezier(.65,0,.35,1)";
  const tl = (node, frames, delay, duration, easing = easeOut, fill = "both") => {
    node.style.transformBox = "fill-box";
    return node.animate(frames, { delay, duration, easing, fill });
  };
  const finish = () => {
    document.documentElement.classList.remove("booting");
    next();
    const out = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    out.onfinish = () => el.remove();
  };
  let begun = false;
  const begin = () => { if (begun) return; begun = true; setTimeout(run, isNative() ? 200 : 300); };
  if (document.readyState === "complete") setTimeout(begin, 150);
  else addEventListener("load", () => setTimeout(begin, 150), { once: true });
  setTimeout(begin, 2500); // por si la carga tarda demasiado

  function run() {
    onStart();
    if (reduceMotion || !el.animate) { el.classList.add("go"); setTimeout(finish, 1600); return; }
    // copias de las letras para el brillo (un clipPath no admite grupos)
    const ws = q("bb-word-shape");
    el.querySelectorAll("#bb-word path").forEach((l) => ws.appendChild(l.cloneNode()));
    const all = q("bb-all"); all.style.transformOrigin = "center";
    tl(all, [{ transform: "scale(0.955)" }, { transform: "scale(1)" }], 0, 4000, "cubic-bezier(.22,.6,.2,1)");
    const bear = q("bb-bear"); bear.style.transformOrigin = "50% 100%";
    tl(bear, [{ transform: "translateY(19px) scale(0.965)", opacity: 0 }, { transform: "none", opacity: 1 }], 250, 1000, "cubic-bezier(.25,.1,.25,1)");
    el.querySelectorAll("#bb-word path").forEach((l, i) => tl(l, [{ transform: "translateY(340px)" }, { transform: "translateY(0)" }], 1200 + i * 70, 760));
    const gm = [...el.querySelectorAll("#bb-games path")], boxes = gm.map((g) => g.getBBox());
    const cx = (boxes[0].x + boxes[4].x + boxes[4].width) / 2;
    gm.forEach((g, i) => {
      const dx = (cx - (boxes[i].x + boxes[i].width / 2)) * 0.75;
      tl(g, [{ transform: `translateX(${dx}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], 1950 + Math.abs(i - 2) * 70, 800);
    });
    tl(q("bb-sweep"), [{ transform: "translateX(0) skewX(-18deg)" }, { transform: "translateX(2230px) skewX(-18deg)" }], 2800, 900, inOut);
    tl(bear, [{ transform: "rotate(0deg)" }, { transform: "rotate(-2.6deg)", offset: 0.45 }, { transform: "rotate(-2.6deg)", offset: 0.65 }, { transform: "rotate(0deg)" }], 2700, 1000, inOut, "none");
    const eye = q("bb-eye"); eye.style.transformOrigin = "center";
    tl(eye, [{ transform: "scaleY(1)" }, { transform: "scaleY(0.12)", offset: 0.5 }, { transform: "scaleY(1)" }], 3250, 200, "ease-in-out", "none");
    el.classList.add("go");
    setTimeout(finish, 4000);
  }
}

/* ---------- Arranque ---------- */
(function boot() {
  applyTheme(); applyI18n(); layout();
  requestAnimationFrame(frame);
  const studio = $("studio");
  const q = new URLSearchParams(location.search); // pruebas: ?skip salta las intros y ?level=N entra directo a un nivel
  if (q.has("skip")) {
    if (studio) studio.remove(); document.documentElement.classList.remove("booting");
    enterHome(); if (q.get("level")) enterLevel(LEVELS[(+q.get("level") || 1) - 1]);
    return;
  }
  const toGame = () => startIntro();
  if (!studio) { document.documentElement.classList.remove("booting"); toGame(); return; }
  let t0 = null, played = false;
  const play = () => { Sound.whenRunning(() => { if (played || !studio.isConnected) return; played = true; Sound.studio((performance.now() - t0) / 1000); }); };
  playStudio(studio, toGame, () => { t0 = performance.now(); play(); });
  // en la web el navegador no deja sonar antes del primer toque: entonces el sonido entra en cuanto la persona toca (Sound.wake)
})();
