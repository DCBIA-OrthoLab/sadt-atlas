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
  var MASK_MS = 1200, REG_MS = 2600;
  /* Les six etapes de VoxelBasedRegistration, dans l'ordre du code. Cote
     Atlas on les joue toutes ; cote Guide seule la derniere compte. */
  var STEPS = [
    { k: "read",    ms:  700 },   /* lire le T2 mobile en itk.F            */
    { k: "predict", ms: 1800 },   /* AMASSS predit les trois masques       */
    { k: "mask",    ms: 1300 },   /* masquer le T1 : ce que voit elastix   */
    { k: "elastix", ms: 2600 },   /* la passe unique                       */
    { k: "matrix",  ms:  900 },   /* MatrixRetrieval -> Euler3D            */
    { k: "resample", ms: 1100 }   /* rechantillonne sur la grille DU T2    */
  ];

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
    var full = fig.getAttribute("data-areg") === "steps";
    var masks = scene.parts.filter(function (p) { return p.code.indexOf("M_") === 0; });

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
      /* Cote Atlas on part de la premiere etape ; cote Guide on va droit au
         resultat, c'est ce que le lecteur du Guide veut voir. */
      run = { i: full ? 0 : 3, t: 0 };
      current = ID();
      masks.forEach(function (m) { m.gen = 0; m.alpha = 0; });
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    function stepName(k) {
      var el = fig.querySelector('.v3d-i18n [data-k="' + k + '"]');
      return el ? el.textContent.trim() : k;
    }

    function chip(i) {
      var n = fig.querySelectorAll(".v3d-steps [data-step]");
      for (var j = 0; j < n.length; j++) {
        n[j].setAttribute("aria-current", j === i ? "true" : "false");
      }
    }

    function frame(dt) {
      if (!run || !active) { return false; }
      var st = STEPS[run.i];
      if (!st) { run = null; fig.classList.remove("v3d-sim"); chip(-1); return false; }
      run.t += dt;
      var f = Math.min(1, run.t / st.ms);
      chip(full ? run.i : -1);

      if (st.k === "read") {
        say(stepName("read"));
        paint(0, 1, 1);
      } else if (st.k === "predict") {
        /* Les masques sortent du reseau comme dans la scene AMASSS : un
           balayage, parce que l'inference parcourt le volume. */
        var mine = "M_" + active.code;
        masks.forEach(function (m) { m.gen = m.code === mine ? f : 0; m.alpha = m.code === mine ? 0.34 : 0; });
        say(stepName("predict") + " " + active.label);
        paint(null, 1, 1);
      } else if (st.k === "mask") {
        /* Le T1 est masque : elastix ne verra que l'interieur. On efface le
           reste plutot que de le decrire. */
        say(stepName("mask"));
        paint(0.34, 1 - 0.72 * f, 1 - 0.72 * f);
      } else if (st.k === "elastix") {
        var e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        current = partial(new Float32Array(active.m), e);
        /* L'ecart interpole entre les deux valeurs MESUREES ; la distance de
           surface se mesure hors ligne, sur les maillages pleins. */
        var gap = active.before + (active.after - active.before) * e;
        say(stepName("elastix") + " — " + gap.toFixed(2) + " mm");
        paint(0.34, 0.28, 1);
      } else if (st.k === "matrix") {
        say(stepName("matrix"));
        paint(0.20, 0.28 + 0.18 * f, 1);
      } else {
        say(stepName("resample"));
        paint(0.20 * (1 - f), 0.46, 1);
      }

      if (run.t >= st.ms + 350) { run.i += 1; run.t = 0; }
      return true;
    }

    function paint(maskAlpha, a1, a2) {
      if (t2) { t2.xform = current; }
      if (t1 && a1 != null) { t1.alpha = 0.46 * a1; }
      if (t2 && a2 != null) { t2.alpha = 0.52 * a2; }
      if (maskAlpha == null) { return; }
      masks.forEach(function (m) {
        var on = active && m.code === "M_" + active.code;
        m.alpha = on ? maskAlpha : 0;
        if (on && m.gen < 1) { m.gen = 1; }
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
