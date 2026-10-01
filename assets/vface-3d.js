/* vface-3d.js — l'asymetrie de VFACE, sur le socle scene3d.js.

   TOUT CE QUE CETTE SCENE AFFICHE SORT D'UNE VRAIE PASSE DE VFACE sur son jeu
   de test publie : ses trois matrices AREG, son scan miroir, les reperes
   predits par ALI, et ses trois cartes `ModelDistance`. Une version
   precedente recalait le miroir par un ICP ecrit pour la page ; cet ICP
   glissait sur le maxillaire (10,2 deg au lieu des 4,4 reels) et sa distance
   non signee faisait passer ce patient pour presque symetrique. Plus rien
   n'est recalcule ici.

   LE PROPOS. Le miroir de VFACE est `diag(-1, 1, 1)` : une reflexion par
   rapport a x = 0, un plan DU MONDE. Rien dans cette matrice ne connait le
   patient, et c'est pour cela que toute la chaine amont existe -- amener le
   plan sagittal median du patient sur ce plan-la.

   Puis le point qui compte. createlistprocess.py appelle ModelToModel
   Distance trois fois, une par recalage, et les trois cartes ne racontent pas
   la meme chose :
     base du crane -> la face entiere, deviee lateralement, mediane |d| 7,0 mm
     maxillaire    -> le haut du crane epouse son miroir a 1,0 mm
     mandibule     -> la mandibule epouse le sien a 0,45 mm
   Se superposer SUR une structure la rend symetrique par construction. Ce
   n'est pas un defaut de la mesure, c'est la mesure : l'asymetrie qu'on lit
   depend de ce sur quoi on s'est superpose.

   TROIS SURFACES DIFFERENTES, TROIS ECHELLES. La carte « base du crane »
   couvre le crane entier, celle du maxillaire le haut du crane seul, celle de
   la mandibule la mandibule seule -- ce sont les fichiers que VFACE ecrit. Et
   leurs plages vont de +/-2,6 mm a +/-32. Chaque carte a donc son echelle,
   annoncee dans la legende ; la comparaison se fait sur les chiffres, pas sur
   la teinte. */
(function () {
  "use strict";

  var BONE = [212, 205, 193];      /* la surface, neutre : la couleur est la carte */
  var MIR = [150, 178, 205];       /* le miroir, franchement autre chose           */
  var PLANE = [186, 170, 220];     /* le plan sagittal median                      */
  /* Un ton par jeu de reperes d'ALI, parce que VFACE en predit trois. */
  var LMC = { CB: [255, 176, 84], U: [120, 220, 175], L: [232, 154, 92] };

  /* Les etapes, dans l'ordre de VFACE_utils/review_steps.ORDER. Les quatre
     etapes de preparation y sont fondues en une : le scan publie arrive deja
     oriente, donc la pose d'avant n'existe nulle part et il n'y a aucune
     rotation a animer. On montre la condition atteinte -- le plan a x = 0. */
  var STEPS = [
    { k: "orient",   ms: 1500 },   /* t1_oriented_max + t1_oriented_cb */
    { k: "lm",       ms: 2000 },   /* t1_landmarks : les 26 points d'ALI */
    { k: "masks",    ms: 1700 },   /* t1_masks -> les surfaces osseuses  */
    { k: "mirror",   ms: 2200 },   /* mirror_scans                       */
    { k: "register", ms: 2400 },   /* registration_cb / _max / _mand     */
    { k: "map",      ms: 1800 }    /* bone_surfaces : ModelDistance      */
  ];
  var S_MASKS = 2, S_MIRROR = 3, S_REGISTER = 4, S_MAP = 5;

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

    var regions = data.regions || [];
    var mir = scene.byCode.MIRROR, plane = scene.byCode.PLANE, raw = scene.byCode.RAW;
    /* La carte « base du crane » couvre le crane entier : elle sert aussi de
       contexte neutre pour les deux autres, qui ne couvrent qu'une structure. */
    var whole = scene.byCode.H_CB;
    var maps = {};
    regions.forEach(function (r) { maps[r.code] = scene.byCode[r.part]; });

    /* Les reperes d'ALI, a plat et dans un ordre stable, avec leur jeu. */
    var marks = [];
    Object.keys(data.landmarks || {}).forEach(function (set) {
      var c = LMC[set] || LMC.CB;
      Object.keys(data.landmarks[set]).sort().forEach(function (lab) {
        marks.push({ p: data.landmarks[set][lab],
                     c: [c[0] / 255, c[1] / 255, c[2] / 255], s: 0.017 });
      });
    });

    scene.parts.forEach(function (p) {
      p.pickable = false;
      p.color = [BONE[0] / 255, BONE[1] / 255, BONE[2] / 255];
      p.ramp = 0;
      p.alpha = 0;
    });
    if (mir) {
      mir.color = [MIR[0] / 255, MIR[1] / 255, MIR[2] / 255];
      mir.alpha = 0;
    }
    if (plane) {
      plane.color = [PLANE[0] / 255, PLANE[1] / 255, PLANE[2] / 255];
      plane.alpha = 0;
    }

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

    function showPlane(a) { if (plane) { plane.alpha = 0.2 * a; } }

    /* Le scan tel qu'il entre, avant qu'AMASSS n'ait rien produit. */
    function rawOnly(a) {
      if (raw) { raw.alpha = a; raw.gen = 1; }
      if (whole) { whole.alpha = 0; }
      regions.forEach(function (r) {
        var p = maps[r.code];
        if (p) { p.alpha = 0; p.ramp = 0; }
      });
    }

    /* Les surfaces osseuses. Avant la carte, seule celle du crane entier est
       montree, en teinte neutre : c'est la segmentation d'AMASSS. */
    function bone(a, gen) {
      if (raw) { raw.alpha = 0; }
      if (!whole) { return; }
      whole.ramp = 0;
      whole.alpha = a;
      whole.gen = gen == null ? 1 : gen;
      regions.forEach(function (r) {
        var p = maps[r.code];
        if (p && p !== whole) { p.alpha = 0; p.ramp = 0; }
      });
    }

    /* La carte de la region active. Les deux autres disparaissent ; si la
       carte ne couvre pas tout le crane, celle du crane entier reste en fond
       neutre pour qu'on voie OU on regarde. */
    function paintMap(f) {
      var mine = active && maps[active.code];
      regions.forEach(function (r) {
        var p = maps[r.code];
        if (!p) { return; }
        if (p === mine) {
          p.ramp = 2; p.gen = 1; p.alpha = 1;
        } else if (p === whole) {
          p.ramp = 0; p.gen = 1; p.alpha = 0.3 * f;   /* le fond neutre */
        } else {
          p.alpha = 0; p.ramp = 0;
        }
      });
      var bar = fig.querySelector(".v3d-ramp");
      if (bar) {
        bar.classList.toggle("is-on", f > 0.05);
        var lo = bar.querySelector(".v3d-ramp-lo"), hi = bar.querySelector(".v3d-ramp-hi");
        if (lo && active) { lo.textContent = "−" + active.limit + " mm"; }
        if (hi && active) { hi.textContent = "+" + active.limit + " mm"; }
      }
    }

    function start(code) {
      active = region(code) || regions[0];
      if (!active) { return; }
      var bs = fig.querySelectorAll("[data-vregion]"), i;
      for (i = 0; i < bs.length; i++) {
        bs[i].setAttribute("aria-pressed",
          bs[i].getAttribute("data-vregion") === active.code ? "true" : "false");
      }
      seek(full ? 0 : S_MAP);
    }

    function frame(dt) {
      if (!run || !active) { return false; }
      var st = STEPS[run.i];
      if (!st) { run = null; fig.classList.remove("v3d-sim"); chip(-1); return false; }
      run.t += dt;
      var f = Math.min(1, run.t / st.ms);
      chip(run.i);

      if (st.k === "orient") {
        /* Le scan publie arrive deja oriente : aucune rotation a animer, la
           pose d'avant n'existe nulle part. On montre la condition atteinte. */
        say(word("orient"));
        scene.setMarks([]);
        rawOnly(0.9);
        showPlane(f);
      } else if (st.k === "lm") {
        /* Les 26 points que ALI a REELLEMENT predits pour ce scan, dans les
           trois jeux que VFACE lui demande. */
        var n = Math.max(1, Math.round(marks.length * f));
        scene.setMarks(marks.slice(0, n));
        say(word("lm") + " " + n + "/" + marks.length);
        rawOnly(0.5);
        showPlane(1);
      } else if (st.k === "masks") {
        /* Les surfaces osseuses d'AMASSS sortent en balayage : l'inference
           parcourt le volume. Ce sont les surfaces sur lesquelles les cartes
           seront mesurees. */
        say(word("masks"));
        scene.setMarks([]);
        bone(0.9, f);
        if (raw) { raw.alpha = 0.5 * (1 - f); }   /* il cede la place */
        showPlane(1 - f);
      } else if (st.k === "mirror") {
        /* La reflexion. A mi-course tout est plaque sur x = 0 et le plan
           apparait de lui-meme. */
        var e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        if (mir) { mir.xform = flip(e); mir.alpha = 0.5; }
        bone(0.5);
        say(word("mirror") + (e < 0.92 ? "" : " — " + word("plane")));
      } else if (st.k === "register") {
        /* La matrice qu'AREG a ecrite pour CETTE region, et rien d'autre. */
        var g = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        if (mir) { mir.xform = partial(new Float32Array(active.m), g); mir.alpha = 0.5; }
        bone(0.5);
        say(word("register") + " — " + active.label + " — "
            + active.rot.toFixed(2) + "°, " + active.trans.toFixed(2) + " mm");
      } else {
        /* La carte de VFACE. Le miroir s'efface : sinon le bleu couvre la
           couleur qu'on est venu lire. */
        if (mir) { mir.xform = new Float32Array(active.m); mir.alpha = 0.5 * (1 - f); }
        if (raw) { raw.alpha = 0; }
        showPlane(0);
        scene.setMarks([]);
        paintMap(f);
        say(word("map") + " — " + active.label + " — "
            + word("absmed") + " " + active.absmed.toFixed(2) + " mm, "
            + active.dmin.toFixed(1) + " … +" + active.dmax.toFixed(1) + " mm");
      }

      if (run.t >= st.ms + 350) { run.i += 1; run.t = 0; }
      return true;
    }

    /* Sauter a une etape : remettre le monde tel qu'il doit etre A L'ENTREE
       de celle-la, sinon on verrait un miroir deja recale ou une carte deja
       peinte selon l'etape d'ou l'on vient. */
    var fired = false;

    function seek(i) {
      if (!active) { active = regions[0]; }
      if (!active || i == null || i < 0 || i >= STEPS.length) { return; }
      /* Choisir une etape est une intention : l'autoplay en attente ne doit
         pas venir la remplacer une seconde plus tard. */
      fired = true;
      run = { i: i, t: 0 };
      /* Les reperes n'existent qu'a l'etape « lm », ou frame() les fait
         tomber un par un ; partout ailleurs la liste est vide. */
      scene.setMarks([]);
      showPlane(i >= 1 && i < S_MASKS ? 1 : 0);
      if (i >= S_MAP) {
        paintMap(1);
      } else {
        paintMap(0);
        /* Avant l'etape de segmentation il n'y a que le scan ; apres, la
           surface osseuse qu'AMASSS en a tiree. */
        if (i < S_MASKS) { rawOnly(0.9); } else { bone(i >= S_MIRROR ? 0.5 : 0.9); }
      }
      if (mir) {
        mir.alpha = i >= S_MIRROR ? 0.5 : 0;
        /* flip(0) = la matrice miroir elle-meme, qui ramene la piece sur
           l'original ; ID() = la position reflechie, pas encore recalee. */
        mir.xform = i >= S_MAP ? new Float32Array(active.m)
                               : (i === S_REGISTER ? ID() : flip(0));
      }
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
