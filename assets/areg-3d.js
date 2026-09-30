/* areg-3d.js — le recalage d'AREG_CBCT, sur le socle scene3d.js.

   Ce que la scene doit faire comprendre : le recalage ne regarde PAS tout le
   crane. `VoxelBasedRegistration` masque d'abord le T1, et elastix ne voit
   que l'interieur du masque. D'ou trois recalages distincts, chacun avec sa
   matrice. Se superposer sur la base du crane ne superpose pas la mandibule,
   et c'est precisement l'interet clinique : on se superpose sur une
   structure stable pour MESURER le deplacement des autres.

   Les trois matrices sont celles qu'AREG a reellement ecrites. Le sens a ete
   verifie et non suppose : elastix renvoie la transformation du fixe vers le
   mobile, donc c'est son inverse qui amene le T2 sur le T1. */
(function () {
  "use strict";

  var FIXED = [150, 178, 205];   /* T1, la reference */
  var MOVING = [232, 154, 92];   /* T2, ce qui bouge */
  var MASK = [120, 220, 175];
  var MASK_MS = 1200, REG_MS = 2400;

  function build(fig) {
    var data = window.AREG_SCENE;
    var stage = fig.querySelector(".v3d-stage");
    if (!data || !stage) { return; }

    var scene = new window.Scene3D(stage, data, {
      onFrame: function (dt) { return frame(dt); }
    });
    if (!scene.ok) { return; }
    fig.classList.add("v3d-on");

    var strings = {}, pot = fig.querySelectorAll(".v3d-i18n [data-k]");
    for (var i = 0; i < pot.length; i++) {
      strings[pot[i].getAttribute("data-k")] = pot[i].textContent.trim();
    }
    var statusEls = fig.querySelectorAll(".v3d-status");
    function say(t) {
      for (var k = 0; k < statusEls.length; k++) { statusEls[k].textContent = t || ""; }
    }

    var t1 = scene.byCode.T1, t2 = scene.byCode.T2;
    scene.parts.forEach(function (p) { p.pickable = false; });
    if (t1) { t1.color = [FIXED[0] / 255, FIXED[1] / 255, FIXED[2] / 255]; t1.alpha = 0.46; }
    if (t2) { t2.color = [MOVING[0] / 255, MOVING[1] / 255, MOVING[2] / 255]; t2.alpha = 0.52; }
    scene.parts.forEach(function (p) {
      if (p.code.indexOf("M_") !== 0) { return; }
      p.color = [MASK[0] / 255, MASK[1] / 255, MASK[2] / 255];
      p.alpha = 0; p.visible = true;
    });

    var regions = data.regions || [];
    var run = null, current = ID(), active = null;

    function ID() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }

    function partial(m, t) {
      /* axe et angle : interpoler les seize coefficients donnerait une
         matrice qui n'est plus une rotation en cours de route */
      var r = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
      var c = Math.max(-1, Math.min(1, (r[0] + r[4] + r[8] - 1) / 2));
      var ang = Math.acos(c) * t;
      var ax = [r[5] - r[7], r[6] - r[2], r[1] - r[3]];
      var n = Math.sqrt(ax[0] * ax[0] + ax[1] * ax[1] + ax[2] * ax[2]);
      var out = ID();
      if (n > 1e-9) {
        ax = [ax[0] / n, ax[1] / n, ax[2] / n];
        var s = Math.sin(ang), k = 1 - Math.cos(ang), x = ax[0], y = ax[1], z = ax[2];
        out[0] = 1 + k * (x * x - 1);  out[4] = -z * s + k * x * y; out[8] = y * s + k * x * z;
        out[1] = z * s + k * x * y;    out[5] = 1 + k * (y * y - 1); out[9] = -x * s + k * y * z;
        out[2] = -y * s + k * x * z;   out[6] = x * s + k * y * z;  out[10] = 1 + k * (z * z - 1);
      }
      out[12] = m[12] * t; out[13] = m[13] * t; out[14] = m[14] * t;
      return out;
    }

    function region(code) {
      for (var i = 0; i < regions.length; i++) {
        if (regions[i].code === code) { return regions[i]; }
      }
      return null;
    }

    function start(code) {
      active = region(code) || regions[0];
      if (!active) { return; }
      var bs = fig.querySelectorAll("[data-region]"), i;
      for (i = 0; i < bs.length; i++) {
        bs[i].setAttribute("aria-pressed",
          bs[i].getAttribute("data-region") === active.code ? "true" : "false");
      }
      run = { act: "mask", t: 0 };
      current = ID();
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    function frame(dt) {
      if (!run || !active) { return false; }
      run.t += dt;
      if (run.act === "mask") {
        var f = Math.min(1, run.t / MASK_MS);
        say((strings.masking || "") + " " + active.label);
        paint(f);
        if (run.t >= MASK_MS + 400) { run.act = "reg"; run.t = 0; }
        return true;
      }
      var t = Math.min(1, run.t / REG_MS);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      current = partial(new Float32Array(active.m), e);
      /* L'ecart interpole entre les deux valeurs MESUREES, il n'est pas
         recalcule dans le navigateur : la distance de surface se mesure hors
         ligne, sur les maillages pleins, pas sur ceux qu'on a decimes. */
      var gap = active.before + (active.after - active.before) * e;
      say((strings.gap || "") + " " + gap.toFixed(2) + " mm");
      paint(1);
      if (t >= 1 && run.t > REG_MS + 900) { run = null; fig.classList.remove("v3d-sim"); return false; }
      return true;
    }

    function paint(maskAlpha) {
      if (t2) { t2.xform = current; }
      scene.parts.forEach(function (p) {
        if (p.code.indexOf("M_") !== 0) { return; }
        var on = active && p.code === "M_" + active.code;
        p.alpha = on ? 0.30 * maskAlpha : 0;
      });
    }

    fig.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-region]") : null;
      if (b) { e.preventDefault(); start(b.getAttribute("data-region")); return; }
      if (e.target.closest && e.target.closest(".v3d-go")) {
        start(active ? active.code : (regions[0] || {}).code);
      }
    });

    var fired = false;
    function once() {
      if (fired) { return; }
      fired = true;
      start((regions[0] || {}).code);
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { once(); }
      }, { rootMargin: "200px" }).observe(fig);
    }
    var bb = fig.getBoundingClientRect();
    if (bb.top < (window.innerHeight || 0) + 200 && bb.bottom > -200) { once(); }
    else if (!window.IntersectionObserver) { once(); }
    scene.kick();
  }

  function init() {
    var figs = document.querySelectorAll("[data-areg]");
    for (var i = 0; i < figs.length; i++) {
      try { build(figs[i]); }
      catch (err) {
        if (window.console) { console.warn("scene AREG indisponible :", err); }
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
