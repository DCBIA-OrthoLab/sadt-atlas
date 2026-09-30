/* ali-3d.js — les deux scenes d'ALI, sur le socle scene3d.js.

   ALI n'est pas un algorithme, c'est un aiguillage : « a dispatch widget that
   chooses between two backends with no shared code ». Une seule animation ne
   pourrait pas l'expliquer. Il y en a donc deux, et elles ne partagent que le
   socle WebGL.

   CBCT  un agent par repere marche dans le volume. Le reseau ne dit PAS ou
         est le point : il classe six directions et l'agent fait UN voxel.
         La trajectoire jouee est celle relevee par ali_trace.py dans
         `position_mem` — le chemin reellement parcouru, pas une reconstitution.

   IOS   une camera par dent, un rendu 224x224 par camera, une segmentation
         par pixel, puis pixel -> face -> sommets -> moyenne -> accrochage.

   Comme ailleurs sur ce site, le contenu est en HTML dans la page (traduit
   par i18n.py, indexe par la recherche, imprimable). Ces fichiers ne font que
   peindre et sequencer. */
(function () {
  "use strict";

  var SKULL = [200, 196, 188];
  var BASE = [128, 174, 128];          /* base du crane : couleur AMASSS */
  var AGENT = [255, 180, 84];
  var TRAIL = [120, 190, 235];
  var TARGET = [110, 230, 170];

  function el(fig, sel) { return fig.querySelector(sel); }

  function strings(fig) {
    var out = {}, nodes = fig.querySelectorAll(".v3d-i18n [data-k]");
    for (var i = 0; i < nodes.length; i++) {
      out[nodes[i].getAttribute("data-k")] = nodes[i].textContent.trim();
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Scene CBCT : l'agent qui marche                                     */
  /* ------------------------------------------------------------------ */
  function buildCBCT(fig) {
    var data = window.ALI_CBCT_SCENE;
    var stage = el(fig, ".v3d-stage"), list = el(fig, ".v3d-parts");
    if (!data || !stage || !list) { return; }

    var txt = strings(fig), statusEl = el(fig, ".v3d-status");
    var say = function (s) { if (statusEl) { statusEl.textContent = s || ""; } };

    var STEP_MS = 26;                  /* un pas du reseau = un voxel */
    var run = null, current = null;

    var scene = new window.Scene3D(stage, data, {
      onFrame: function (dt) { return tick(dt); }
    });
    if (!scene.ok) { return; }
    fig.classList.add("v3d-on");

    var raw = scene.byCode.RAW, cb = scene.byCode.CB;
    if (raw) {
      raw.color = [SKULL[0] / 255, SKULL[1] / 255, SKULL[2] / 255];
      raw.alpha = 0.16; raw.pickable = false;
    }
    if (cb) {
      cb.color = [BASE[0] / 255, BASE[1] / 255, BASE[2] / 255];
      cb.alpha = 0.34; cb.pickable = false;
    }

    function rows() { return list.querySelectorAll("[data-lm]"); }
    function mark(name) {
      var rs = rows();
      for (var i = 0; i < rs.length; i++) {
        rs[i].setAttribute("aria-current",
          rs[i].getAttribute("data-lm") === name ? "true" : "false");
      }
    }

    function start(name) {
      var a = data.agents[name];
      if (!a) { return; }
      current = name;
      mark(name);
      fig.classList.add("v3d-sim");
      run = { name: name, leg: 0, i: 0, t: 0, done: false, trail: [] };
      scene.lookHome();
      say(txt.walking || "");
      scene.dirty = true; scene.kick();
    }

    function tick(dt) {
      if (!run) { return false; }
      var a = data.agents[run.name];
      if (run.done) {
        /* la cible pulse un instant, puis on rend la main */
        run.t += dt;
        paint(a, true);
        if (run.t > 1400) { run = null; fig.classList.remove("v3d-sim"); return false; }
        return true;
      }
      run.t += dt;
      while (run.t >= STEP_MS && !run.done) {
        run.t -= STEP_MS;
        var leg = a.legs[run.leg];
        run.trail.push(leg.path[run.i]);
        run.i += 1;
        if (run.i >= leg.path.length) {
          if (run.leg + 1 < a.legs.length) {
            /* Changement d'echelle : la memoire courte est videe et la
               recherche reprend, plus fin. C'est `UpScale()`. */
            run.leg += 1; run.i = 0;
            say((txt.upscale || "") + " " + a.legs[run.leg].mm + " mm");
          } else {
            run.done = true; run.t = 0;
            say(a.steps + " " + (txt.steps || ""));
          }
        }
      }
      paint(a, false);
      return true;
    }

    function paint(a, done) {
      var marks = [], n = run.trail.length, i;
      /* La trace s'efface vers le passe : on voit d'ou l'agent vient sans
         que le debut mange la vue. */
      for (i = Math.max(0, n - 120); i < n - 1; i++) {
        var k = (i - Math.max(0, n - 120)) / 120;
        marks.push({ p: run.trail[i],
                     c: [TRAIL[0] / 255 * (0.35 + k * 0.65),
                         TRAIL[1] / 255 * (0.35 + k * 0.65),
                         TRAIL[2] / 255 * (0.35 + k * 0.65)],
                     s: 0.006 + k * 0.004 });
      }
      marks.push({ p: a.final, c: [TARGET[0] / 255, TARGET[1] / 255, TARGET[2] / 255],
                   s: done ? 0.022 : 0.013 });
      if (n) {
        marks.push({ p: run.trail[n - 1],
                     c: [AGENT[0] / 255, AGENT[1] / 255, AGENT[2] / 255], s: 0.019 });
      }
      scene.setMarks(marks);
    }

    list.addEventListener("click", function (e) {
      var row = e.target.closest ? e.target.closest("[data-lm]") : null;
      if (!row) { return; }
      e.preventDefault();
      start(row.getAttribute("data-lm"));
    });
    var go = el(fig, ".v3d-go");
    if (go) {
      go.addEventListener("click", function () {
        var rs = rows();
        start(current || (rs.length ? rs[0].getAttribute("data-lm") : null));
      });
    }

    /* On joue une fois a l'arrivee a l'ecran : personne ne clique un bouton
       pour comprendre de quoi on parle. */
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting || fig._played) { return; }
        fig._played = true;
        if (!scene.reduced) {
          var rs = rows();
          if (rs.length) { start(rs[0].getAttribute("data-lm")); }
        } else { scene.dirty = true; scene.kick(); }
      }, { rootMargin: "200px" }).observe(fig);
    }
    scene.kick();
  }

  /* ------------------------------------------------------------------ */
  /* Scene IOS : une camera par dent                                      */
  /* ------------------------------------------------------------------ */
  var GUM = [196, 150, 148];
  var TOOTH = [232, 228, 220];
  var AIM = [120, 200, 255];
  var POINT = [110, 230, 170];

  function buildIOS(fig) {
    var data = window.ALI_IOS_SCENE;
    var stage = el(fig, ".v3d-stage");
    if (!data || !stage) { return; }

    var txt = strings(fig), statusEl = el(fig, ".v3d-status");
    var say = function (s) { if (statusEl) { statusEl.textContent = s || ""; } };

    /* Une camera se pose, le reseau segmente, le point tombe. Puis la dent
       suivante : ALI_IOS boucle par dent, pas par arcade. */
    var PH = { fly: 460, look: 620, land: 420 };
    var RADIUS = 0.17;               /* ALI_IOS : `radius`, 0.2 en sphere unite */

    var scene = new window.Scene3D(stage, data, {
      onFrame: function (dt) { return tick(dt); },
      onOverlay: function () { overlay(); }
    });
    if (!scene.ok) { return; }
    fig.classList.add("v3d-on");

    scene.parts.forEach(function (p) {
      var c = p.code === "GUM" ? GUM : TOOTH;
      p.color = [c[0] / 255, c[1] / 255, c[2] / 255];
      p.pickable = p.code !== "GUM";
    });

    var teeth = data.teeth || [];
    var run = null, placed = {};

    /* La camera vise le centroide de la dent -- c'est le tableau
       `PredictedID` qui le donne, et rien d'autre. Sans lui, ALI_IOS ne
       trouve aucune dent et ne place rien. */
    function eyeFor(code) {
      var t = scene.up(data.centroids[code] || [0, 0, 0]);
      var d = [0.28, 1.0, 0.18];
      var l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      return { target: t,
               eye: [t[0] + d[0] / l * RADIUS,
                     t[1] + d[1] / l * RADIUS,
                     t[2] + d[2] / l * RADIUS] };
    }

    function pointOn(code) {
      var p = scene.byCode[code];
      var c = scene.up(p.c);
      return [c[0], c[1] + (p.e[2] || 0.03) * 0.85, c[2]];
    }

    function start() {
      placed = {};
      run = { i: 0, phase: "fly", t: 0, from: null };
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    function tick(dt) {
      if (!run) { return false; }
      run.t += dt;
      var code = teeth[run.i];
      if (!code) { run = null; fig.classList.remove("v3d-sim"); say(txt.done || ""); return false; }

      if (run.phase === "fly") {
        say((txt.camera || "") + " " + code.replace("T", ""));
        if (run.t >= PH.fly) { run.phase = "look"; run.t = 0; }
      } else if (run.phase === "look") {
        say((txt.segment || "") + " " + code.replace("T", ""));
        if (run.t >= PH.look) { run.phase = "land"; run.t = 0; }
      } else {
        if (run.t >= PH.land) {
          placed[code] = pointOn(code);
          run.i += 1; run.phase = "fly"; run.t = 0;
          if (run.i >= teeth.length) {
            run = null; fig.classList.remove("v3d-sim");
            say(Object.keys(placed).length + " " + (txt.done || ""));
          }
        }
      }
      marks();
      return true;
    }

    function marks() {
      var out = [], code = run && teeth[run.i];
      Object.keys(placed).forEach(function (k) {
        out.push({ p: placed[k], c: [POINT[0] / 255, POINT[1] / 255, POINT[2] / 255], s: 0.012 });
      });
      if (code) {
        var g = eyeFor(code);
        out.push({ p: g.eye, c: [AIM[0] / 255, AIM[1] / 255, AIM[2] / 255], s: 0.017 });
        if (run.phase === "land") {
          out.push({ p: pointOn(code), c: [POINT[0] / 255, POINT[1] / 255, POINT[2] / 255],
                     s: 0.010 + 0.012 * Math.min(1, run.t / PH.land) });
        }
      }
      scene.setMarks(out);
    }

    /* Le medaillon : ce que la camera voit, avec la vraie texture du reseau. */
    function overlay() {
      var code = run && teeth[run.i];
      if (!code) { return; }
      var g = eyeFor(code);
      scene.drawInset({ x: 0.685, y: 0.045, w: 0.28, h: 0.28 }, g.eye, g.target, code);
    }

    var go = el(fig, ".v3d-go");
    if (go) { go.addEventListener("click", start); }

    scene.onPick = function (code) {
      if (!code || code === "GUM" || run) { return; }
      scene.lookAtPart(code, 4.5);
    };

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting || fig._played) { return; }
        fig._played = true;
        if (!scene.reduced) { start(); } else { scene.dirty = true; scene.kick(); }
      }, { rootMargin: "200px" }).observe(fig);
    }
    scene.kick();
  }

  /* ------------------------------------------------------------------ */
  function init() {
    var a = document.querySelectorAll("[data-ali-cbct]"), i;
    for (i = 0; i < a.length; i++) {
      try { buildCBCT(a[i]); }
      catch (err) {
        if (window.console) { console.warn("scene ALI CBCT indisponible :", err); }
      }
    }
    var b = document.querySelectorAll("[data-ali-ios]");
    for (i = 0; i < b.length; i++) {
      try { buildIOS(b[i]); }
      catch (err) {
        if (window.console) { console.warn("scene ALI IOS indisponible :", err); }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
