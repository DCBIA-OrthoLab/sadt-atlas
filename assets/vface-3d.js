/* vface-3d.js — l'asymetrie de VFACE, sur le socle scene3d.js.

   Ce que la scene doit faire comprendre, en deux temps.

   1. Le miroir de VFACE est `diag(-1, 1, 1)` : une reflexion par rapport au
      plan x = 0, celui du MONDE. Rien dans cette matrice ne connait le
      patient. Tout ce que VFACE empile en amont -- les deux passes de reperes
      d'ALI, les deux orientations SEMI_ASO -- ne sert qu'a amener le plan
      sagittal median du patient SUR ce plan-la. L'animation le montre en
      aplatissant le miroir sur x = 0 a mi-course : le plan se dessine tout
      seul, on n'a pas a le decrire.

   2. Le miroir n'est pas lu tel quel. `review_steps.py` liste trois
      recalages -- base du crane, maxillaire, mandibule -- et c'est le fond du
      sujet : l'asymetrie qu'on mesure depend de la structure sur laquelle on
      se superpose. Se recaler sur le maxillaire le rend symetrique par
      construction, et ce qu'il reste se lit ailleurs. Trois recalages, trois
      cartes, un seul crane.

   Le residu de chaque recalage est affiche, parce qu'il n'est pas le meme :
   la base du crane et la mandibule se recalent serre, le maxillaire non. Une
   carte lue sur un recalage lache ne vaut pas celle d'un recalage serre, et
   c'est au lecteur de le voir.

   DEUX CHOSES QU'ON NE MONTRE PAS, ET POURQUOI.
   - Le set de reperes maxillaire (`ANS IF PNS UL6O UR1O UR6O`,
     createlistprocess.py:288) n'est pas dans le jeu publie. L'etape est
     nommee, et rien n'est dessine : six points inventes seraient six
     mensonges.
   - Les deux rotations d'orientation. Le scan publie est DEJA oriente ; la
     pose d'avant n'existe nulle part. On montre donc la condition atteinte
     -- le plan x = 0 -- et pas un chemin reconstitue. */
(function () {
  "use strict";

  var BONE = [212, 205, 193];      /* le crane, neutre : la couleur est la carte */
  var MIR = [150, 178, 205];       /* le miroir, franchement autre chose         */
  var REGION = [120, 220, 175];    /* la region de superposition                 */
  var LM = [255, 176, 84];         /* les reperes d'ALI                          */
  var PLANE = [186, 170, 220];     /* le plan sagittal median                    */

  /* Les etapes d'un run « Asymmetry Assesment » en pipeline complet, dans
     l'ordre exact de VFACE_utils/review_steps.ORDER. `mirror_masks` manque :
     il n'existe qu'en mode CMFReg. */
  var STEPS = [
    { k: "lmMax",    ms: 1100 },   /* t1_landmarks_orientation_max */
    { k: "orMax",    ms: 1100 },   /* t1_oriented_max              */
    { k: "lmCB",     ms: 1900 },   /* t1_landmarks_orientation_cb  */
    { k: "orCB",     ms: 1500 },   /* t1_oriented_cb               */
    { k: "masks",    ms: 1700 },   /* t1_masks                     */
    { k: "mirror",   ms: 2200 },   /* mirror_scans                 */
    { k: "register", ms: 2400 },   /* registration_cb/_max/_mand   */
    { k: "map",      ms: 1600 }    /* bone_surfaces                */
  ];
  var S_MIRROR = 5, S_REGISTER = 6, S_MAP = 7;

  function ID() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }

  /* La reflexion en cours de route. On ne peut PAS interpoler une reflexion
     par des rotations : le determinant devrait passer de -1 a +1 sans jamais
     valoir zero, ce qui est impossible en restant une isometrie. On passe
     donc par l'etat degenere -- diag(0,1,1), tout le maillage aplati sur
     x = 0 -- et c'est precisement ce qu'on veut montrer : le plan. */
  function flip(t) {
    var m = ID();
    m[0] = -1 + 2 * t;
    return m;
  }

  /* Interpolation d'un deplacement rigide : axe et angle, jamais les seize
     coefficients (une moyenne de deux rotations n'est pas une rotation). */
  function partial(m, t) {
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

  function build(fig) {
    var data = window.VFACE_SCENE;
    var stage = fig.querySelector(".v3d-stage");
    if (!data || !stage) { return; }

    var scene = new window.Scene3D(stage, data, {
      onFrame: function (dt) { return frame(dt); }
    });
    if (!scene.ok) { return; }
    fig.classList.add("v3d-on");

    var statusEls = fig.querySelectorAll(".v3d-status");
    function say(t) {
      for (var k = 0; k < statusEls.length; k++) { statusEls[k].textContent = t || ""; }
    }
    function word(k) {
      var el = fig.querySelector('.v3d-i18n [data-k="' + k + '"]');
      return el ? el.textContent.trim() : k;
    }

    var face = scene.byCode.FACE, mir = scene.byCode.MIRROR, plane = scene.byCode.PLANE;
    var regions = data.regions || [];
    var clip = data.clip || 8;

    /* Les reperes du set « base du crane » dans l'ordre de la liste de VFACE,
       separes en ceux qu'ALI a trouves et ceux qui manquent. On affiche les
       deux : un set incomplet est une information, pas un defaut a cacher. */
    var setCB = data.setCB || [];
    var lmCB = setCB.filter(function (k) { return (data.landmarks || {})[k]; });
    var lostCB = setCB.filter(function (k) { return !(data.landmarks || {})[k]; });

    scene.parts.forEach(function (p) { p.pickable = false; });
    if (face) {
      face.color = [BONE[0] / 255, BONE[1] / 255, BONE[2] / 255];
      face.alpha = 1; face.ramp = false;
    }
    if (mir) {
      mir.color = [MIR[0] / 255, MIR[1] / 255, MIR[2] / 255];
      mir.alpha = 0;
    }
    if (plane) {
      plane.color = [PLANE[0] / 255, PLANE[1] / 255, PLANE[2] / 255];
      plane.alpha = 0;
    }
    var regParts = scene.parts.filter(function (p) { return p.code.indexOf("R_") === 0; });
    regParts.forEach(function (p) {
      p.color = [REGION[0] / 255, REGION[1] / 255, REGION[2] / 255];
      p.alpha = 0; p.gen = 0;
    });

    var run = null, active = null;
    var full = fig.getAttribute("data-vface") === "steps";

    function region(code) {
      for (var i = 0; i < regions.length; i++) {
        if (regions[i].code === code) { return regions[i]; }
      }
      return null;
    }

    function chip(i) {
      var n = fig.querySelectorAll(".v3d-steps [data-step]");
      for (var j = 0; j < n.length; j++) {
        n[j].setAttribute("aria-current", j === i ? "true" : "false");
      }
    }

    function showPlane(a) { if (plane) { plane.alpha = 0.22 * a; } }

    function marksAll() {
      scene.setMarks(lmCB.map(function (k) {
        return { p: data.landmarks[k], c: [LM[0] / 255, LM[1] / 255, LM[2] / 255], s: 0.018 };
      }));
    }

    /* Peindre la carte de CETTE region. Un seul maillage, un tableau de
       valeurs par region : `setScalars` echange le champ sans reconstruire
       quoi que ce soit. */
    function paintMap(on) {
      if (!face) { return; }
      if (on && active && active.field) {
        scene.setScalars("FACE", active.field, 0, clip);
        face.ramp = true;
      } else {
        face.ramp = false;
      }
      var bar = fig.querySelector(".v3d-ramp");
      if (bar) { bar.classList.toggle("is-on", !!on); }
    }

    function start(code) {
      active = region(code) || regions[0];
      if (!active) { return; }
      var bs = fig.querySelectorAll("[data-vregion]"), i;
      for (i = 0; i < bs.length; i++) {
        bs[i].setAttribute("aria-pressed",
          bs[i].getAttribute("data-vregion") === active.code ? "true" : "false");
      }
      seek(0);
    }

    function frame(dt) {
      if (!run || !active) { return false; }
      var st = STEPS[run.i];
      if (!st) { run = null; fig.classList.remove("v3d-sim"); chip(-1); return false; }
      run.t += dt;
      var f = Math.min(1, run.t / st.ms);
      chip(run.i);
      var mine = "R_" + active.code;

      if (st.k === "lmMax") {
        /* Le set maxillaire est nomme et rien n'est dessine : il n'est pas
           dans le jeu publie, et six points inventes seraient six mensonges. */
        say(word("lmMax") + " — " + (data.setMAX || []).join(", "));
        scene.setMarks([]);
        showPlane(0);
      } else if (st.k === "orMax") {
        /* Aucune rotation a animer : le scan publie est deja oriente. */
        say(word("orMax"));
      } else if (st.k === "lmCB") {
        /* Les points que ALI_CBCT a REELLEMENT ecrits pour ce scan. */
        var n = Math.max(1, Math.round(lmCB.length * f));
        scene.setMarks(lmCB.slice(0, n).map(function (k) {
          return { p: data.landmarks[k], c: [LM[0] / 255, LM[1] / 255, LM[2] / 255], s: 0.018 };
        }));
        say(word("lmCB") + " " + n + "/" + setCB.length
            + (lostCB.length ? " — " + lostCB.join(", ") + " " + word("notfound") : ""));
      } else if (st.k === "orCB") {
        /* Le plan x = 0 arrive. La rotation qui l'y amene n'existe nulle part
           dans ce jeu : on montre la condition atteinte, pas un chemin
           reconstitue. */
        say(word("orCB"));
        marksAll();
        showPlane(f);
      } else if (st.k === "masks") {
        /* Les trois masques d'AMASSS sortent en balayage, comme dans la scene
           AMASSS : l'inference parcourt le volume. */
        regParts.forEach(function (p) { p.gen = f; p.alpha = 0.55; });
        say(word("masks"));
        scene.setMarks([]);
        if (face) { face.alpha = 1 - 0.45 * f; }
      } else if (st.k === "mirror") {
        /* La reflexion. A mi-course tout est plaque sur x = 0 et le plan
           apparait de lui-meme. */
        var e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        if (mir) { mir.xform = flip(e); mir.alpha = 0.5; }
        if (face) { face.alpha = 0.55; }
        regParts.forEach(function (p) {
          p.gen = 1; p.alpha = p.code === mine ? 0.5 : 0;
        });
        say(word("mirror") + (e < 0.92 ? "" : " — " + word("plane")));
      } else if (st.k === "register") {
        /* Le recalage ne regarde QUE la region choisie, et c'est tout
           l'interet : se superposer sur une structure, pour lire l'ecart
           ailleurs. L'ecart interpole entre les deux valeurs MESUREES. */
        var g = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        if (mir) { mir.xform = partial(new Float32Array(active.m), g); }
        var gap = active.icpBefore + (active.icpAfter - active.icpBefore) * g;
        say(word("register") + " — " + active.label + " — " + gap.toFixed(2) + " mm");
        if (mir) { mir.alpha = 0.5; }
        if (face) { face.alpha = 0.55; }
        regParts.forEach(function (p) { p.alpha = p.code === mine ? 0.5 : 0; });
        paintMap(false);
      } else {
        /* La carte. Le miroir, les masques et le plan s'effacent : sinon ils
           couvrent la couleur qu'on est venu lire. */
        if (mir) { mir.xform = new Float32Array(active.m); mir.alpha = 0.5 * (1 - f); }
        regParts.forEach(function (p) { p.alpha = 0; });
        showPlane(1 - f);
        if (face) { face.alpha = 0.55 + 0.45 * f; }
        paintMap(true);
        say(word("map") + " — " + word("median") + " " + active.median.toFixed(2)
            + " mm, 95ᵗʰ " + active.p95.toFixed(2) + " mm");
      }

      if (run.t >= st.ms + 350) { run.i += 1; run.t = 0; }
      return true;
    }

    /* Sauter a une etape : remettre le monde tel qu'il doit etre A L'ENTREE
       de celle-la, sinon on verrait un miroir deja recale, des reperes deja
       poses ou une carte deja peinte selon l'etape d'ou l'on vient. */
    var fired = false;

    function seek(i) {
      if (!active) { active = regions[0]; }
      if (!active || i == null || i < 0 || i >= STEPS.length) { return; }
      /* Choisir une etape est une intention : l'autoplay en attente ne doit
         pas venir la remplacer une seconde plus tard. */
      fired = true;
      run = { i: i, t: 0 };
      if (i >= 3 && i <= 4) { marksAll(); } else { scene.setMarks([]); }
      showPlane(i >= 3 && i < S_MAP ? 1 : 0);
      if (mir) {
        mir.alpha = i >= S_MIRROR ? 0.5 : 0;
        /* flip(0) = la matrice miroir elle-meme, qui ramene la piece sur
           l'original ; ID() = la position reflechie, pas encore recalee. */
        mir.xform = i >= S_MAP ? new Float32Array(active.m)
                               : (i === S_REGISTER ? ID() : flip(0));
      }
      regParts.forEach(function (p) {
        p.gen = i >= S_MIRROR ? 1 : 0;
        p.alpha = (i >= S_MIRROR && p.code === "R_" + active.code) ? 0.5 : 0;
      });
      if (face) { face.alpha = i <= 3 ? 1 : 0.55; }
      paintMap(false);
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    fig.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-vregion]") : null;
      if (b) { e.preventDefault(); start(b.getAttribute("data-vregion")); return; }
      if (e.target.closest && e.target.closest(".v3d-go")) {
        start(active ? active.code : (regions[0] || {}).code);
      }
    });

    window.Scene3D.attachControls(fig, scene, seek);

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
    var figs = document.querySelectorAll("[data-vface]");
    for (var i = 0; i < figs.length; i++) {
      try { build(figs[i]); }
      catch (err) {
        if (window.console) { console.warn("scene VFACE indisponible :", err); }
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
