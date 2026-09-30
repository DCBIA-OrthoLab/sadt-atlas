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

  /* Jouer une fois, quand la figure arrive a l'ecran. L'IntersectionObserver
     seul ne suffit pas : s'il observe un element DEJA visible au chargement,
     il ne se declenche pas toujours. On teste donc aussi la position de
     depart. */
  function whenVisible(fig, fn) {
    var fired = false;
    function go() {
      if (fired) { return; }
      fired = true;
      fn();
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { go(); }
      }, { rootMargin: "200px" }).observe(fig);
    }
    var r = fig.getBoundingClientRect();
    if (r.top < (window.innerHeight || 0) + 200 && r.bottom > -200) { go(); }
    else if (!window.IntersectionObserver) { go(); }
  }

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
    window.Scene3D.attachControls(fig, scene, null);

    /* On joue une fois a l'arrivee a l'ecran : personne ne clique un bouton
       pour comprendre de quoi on parle. */
    whenVisible(fig, function () {
      if (scene.reduced) { scene.dirty = true; scene.kick(); return; }
      var rs = rows();
      if (rs.length) { start(rs[0].getAttribute("data-lm")); }
    });
    scene.kick();
  }

  /* ------------------------------------------------------------------ */
  /* Scene IOS : une camera par dent                                      */
  /* ------------------------------------------------------------------ */
  var GUM = [196, 150, 148];
  var TOOTH = [232, 228, 220];
  var UNSEG = [206, 202, 196];   /* avant etiquetage : rien ne distingue les dents */
  var SEG_MS = 1900;
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

    var teeth = data.teeth || [];
    scene.parts.forEach(function (p) {
      p.color = [UNSEG[0] / 255, UNSEG[1] / 255, UNSEG[2] / 255];
      p.pickable = p.code !== "GUM";
      var k = teeth.indexOf(p.code);
      p.seg = p.code === "GUM" ? GUM : (k < 0 ? TOOTH : window.Scene3D.hue(k, teeth.length));
    });

    var run = null, placed = {};

    /* La camera vise le centroide de la dent -- c'est le tableau
       `PredictedID` qui le donne, et rien d'autre. Sans lui, ALI_IOS ne
       trouve aucune dent et ne place rien. */
    /* DEUX REPERES, et il ne faut pas les confondre.
       Le shader applique MODEL a tout ce qu'il dessine, marqueurs compris :
       une position de marqueur se donne donc dans le repere BRUT des
       donnees. La camera de drawInset, elle, agit APRES MODEL : elle se
       donne dans le repere redresse. Melanger les deux applique la rotation
       deux fois et decale les points de 90 degres. */
    var OCCLUSAL = [0.28, -0.18, 1.0];   /* vers les couronnes, repere brut */

    function eyeFor(code) {
      var t = data.centroids[code] || [0, 0, 0];
      var d = OCCLUSAL;
      var l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      var eye = [t[0] + d[0] / l * RADIUS,
                 t[1] + d[1] / l * RADIUS,
                 t[2] + d[2] / l * RADIUS];
      /* `eye`/`target` pour les marqueurs, `*Up` pour la camera du medaillon. */
      return { target: t, eye: eye,
               targetUp: scene.up(t), eyeUp: scene.up(eye) };
    }

    function pointOn(code) {
      var p = scene.byCode[code];
      /* Sur la couronne : on remonte d'une demi-hauteur le long de l'axe
         occlusal du repere brut, qui est z. */
      return [p.c[0], p.c[1], p.c[2] + (p.e[2] || 0.03) * 0.85];
    }

    /* Le tableau d'etiquettes conditionne TOUT : c'est lui qui donne le
       centroide de chaque dent, donc la position de la camera. Sans lui,
       ALI_IOS ne trouve aucune dent et ne place rien. La segmentation est
       donc le premier acte, pas un detail de preparation. */
    function start() {
      placed = {};
      run = { phase: teeth.length ? "seg" : "fly", i: 0, t: 0, lit: 0 };
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    function tint() {
      var seg = run && run.phase === "seg";
      scene.parts.forEach(function (p) {
        var k = teeth.indexOf(p.code);
        var lit = seg ? (k >= 0 && k < run.lit) : true;
        var c = lit ? p.seg : UNSEG;
        p.color = [c[0] / 255, c[1] / 255, c[2] / 255];
      });
    }

    function tick(dt) {
      if (!run) { return false; }
      run.t += dt;
      if (run.phase === "seg") {
        run.lit = Math.min(teeth.length,
                           Math.floor(run.t / (SEG_MS / teeth.length)) + 1);
        say((txt.seg || "") + " " + run.lit + "/" + teeth.length);
        tint();
        marks();
        if (run.t >= SEG_MS + 350) { run.phase = "fly"; run.t = 0; run.i = 0; tint(); }
        return true;
      }
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
      if (run && run.phase === "seg") { scene.setMarks([]); return; }
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
      if (run && run.phase === "seg") { return; }
      var code = run && teeth[run.i];
      if (!code) { return; }
      var g = eyeFor(code);
      scene.drawInset({ x: 0.685, y: 0.045, w: 0.28, h: 0.28 }, g.eyeUp, g.targetUp, code);
    }

    var go = el(fig, ".v3d-go");
    if (go) { go.addEventListener("click", start); }
    window.Scene3D.attachControls(fig, scene, null);

    scene.onPick = function (code) {
      if (!code || code === "GUM" || run) { return; }
      scene.lookAtPart(code, 4.5);
    };

    whenVisible(fig, function () {
      if (scene.reduced) { scene.dirty = true; scene.kick(); } else { start(); }
    });
    scene.kick();
  }

  /* ------------------------------------------------------------------ */
  /* Scene du Guide : ce qu'ALI PRODUIT, pas comment il s'y prend         */
  /* ------------------------------------------------------------------ */
  /* Le lecteur du Guide ne lit pas de code. Ce qui l'interesse tient en une
     phrase de sa propre page : « ALI drops anatomical landmarks onto your
     scans for you. It works just as well on a CBCT as on an intraoral scan ».
     Donc : une entree, des points nommes, et une bascule entre les deux
     types de donnees -- « two engines, one window ». Pas de marche d'agent :
     c'est l'affaire de l'Atlas. */
  function buildGuide(fig) {
    var scenes = {}, mode = null, run = null;
    var txt = strings(fig), statusEl = el(fig, ".v3d-status");
    var say = function (s) { if (statusEl) { statusEl.textContent = s || ""; } };
    var DROP = 190;                 /* un point toutes les 190 ms */

    function setup(name, payload, stage, tint) {
      if (!payload || !stage) { return null; }
      var sc = new window.Scene3D(stage, payload, {
        onFrame: function (dt) { return mode === name ? tick(dt) : false; }
      });
      if (!sc.ok) { return null; }
      sc.parts.forEach(function (p) {
        var c = tint(p.code);
        p.color = [c[0] / 255, c[1] / 255, c[2] / 255];
        p.alpha = c[3] != null ? c[3] : 1;
        p.pickable = false;
      });
      return sc;
    }

    scenes.cbct = setup("cbct", window.ALI_CBCT_SCENE,
      el(fig, '[data-scene="cbct"]'),
      function (code) {
        /* Assez dense pour se lire comme un scan, assez translucide pour
           que Sella, qui est au fond du crane, reste visible. */
        return code === "CB" ? [128, 174, 128, 0.72] : [205, 201, 193, 0.5];
      });
    scenes.ios = setup("ios", window.ALI_IOS_SCENE,
      el(fig, '[data-scene="ios"]'),
      function (code) { return code === "GUM" ? [196, 150, 148, 1] : [232, 228, 220, 1]; });

    if (!scenes.cbct && !scenes.ios) { return; }
    fig.classList.add("v3d-on");

    /* Les points du CBCT sont REELS : releves par ali_trace.py. Ceux qui
       n'ont pas ete trouves ne sont pas inventes -- ils ne tombent pas. */
    function targets(name) {
      if (name === "cbct") {
        var ag = (window.ALI_CBCT_SCENE || {}).agents || {}, out = [];
        Object.keys(ag).forEach(function (k) {
          if (ag[k].ok !== false) { out.push({ k: k, p: ag[k].final }); }
        });
        return out;
      }
      var sc = scenes.ios, d = window.ALI_IOS_SCENE || {};
      /* Repere brut : le shader redresse lui-meme. Le faire ici aussi
         tournerait les points une seconde fois. */
      return (d.teeth || []).map(function (c) {
        var p = sc.byCode[c];
        return { k: c, p: [p.c[0], p.c[1], p.c[2] + (p.e[2] || 0.03) * 0.85] };
      });
    }

    function chips() { return fig.querySelectorAll('[data-lm]'); }

    function start(name) {
      mode = name;
      var bs = fig.querySelectorAll("[data-mode]"), i;
      for (i = 0; i < bs.length; i++) {
        bs[i].setAttribute("aria-pressed", bs[i].getAttribute("data-mode") === name ? "true" : "false");
      }
      fig.setAttribute("data-active", name);
      var cs = chips();
      for (i = 0; i < cs.length; i++) { cs[i].setAttribute("aria-current", "false"); }
      run = { list: targets(name), i: 0, t: 0 };
      fig.classList.add("v3d-sim");
      say("");
      var sc = scenes[name];
      if (sc) { sc.setMarks([]); sc.dirty = true; sc.kick(); }
    }

    function tick(dt) {
      var sc = scenes[mode];
      if (!run || !sc) { return false; }
      run.t += dt;
      while (run.t >= DROP && run.i < run.list.length) {
        run.t -= DROP;
        var hit = run.list[run.i];
        var chip = fig.querySelector('[data-lm="' + hit.k + '"]');
        if (chip) { chip.setAttribute("aria-current", "true"); }
        run.i += 1;
      }
      sc.setMarks(run.list.slice(0, run.i).map(function (m, i) {
        var fresh = i === run.i - 1 && run.t < 140;
        return { p: m.p, c: [POINT[0] / 255, POINT[1] / 255, POINT[2] / 255],
                 s: fresh ? 0.026 : 0.014 };
      }));
      if (run.i >= run.list.length) {
        say(run.list.length + " " + (txt.placed || ""));
        run = null;
        fig.classList.remove("v3d-sim");
        return false;
      }
      return true;
    }

    fig.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-mode]") : null;
      if (b) { e.preventDefault(); start(b.getAttribute("data-mode")); return; }
      if (e.target.closest && e.target.closest(".v3d-go")) { start(mode || "cbct"); }
    });

    /* Deux scenes, une seule commande de vitesse. */
    var both = {};
    Object.defineProperty(both, "speed", {
      set: function (v) {
        Object.keys(scenes).forEach(function (k) { if (scenes[k]) { scenes[k].speed = v; } });
      },
      get: function () { return (scenes.cbct || scenes.ios || {}).speed || 1; }
    });
    both.kick = function () {
      Object.keys(scenes).forEach(function (k) {
        if (scenes[k]) { scenes[k].dirty = true; scenes[k].kick(); }
      });
    };
    window.Scene3D.attachControls(fig, both, null);

    whenVisible(fig, function () { start("cbct"); });
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
    var c = document.querySelectorAll("[data-ali-guide]");
    for (i = 0; i < c.length; i++) {
      try { buildGuide(c[i]); }
      catch (err) {
        if (window.console) { console.warn("scene ALI (guide) indisponible :", err); }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
