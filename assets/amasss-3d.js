/* amasss-3d.js — la scene AMASSS, sur le socle scene3d.js.

   Depuis le port sur scene3d, tout ce qui touche a l'interaction -- orbite,
   molette, PINCEMENT A DEUX DOIGTS, double-tape pour recadrer, designation
   au clic -- est fourni par le socle. Ce fichier ne decrit plus qu'une scene
   et sa sequence. Toute scene future en herite sans rien reecrire.

   Le contenu editorial n'est pas ici : il est en HTML dans la page, donc
   traduit par i18n.py, indexe par la recherche et imprimable. Sans WebGL2 le
   canvas ne s'affiche jamais et la page reste entiere. */
(function () {
  "use strict";

  /* LABEL_COLORS de AMASSS_CLI.py -- les couleurs du code, pas des couleurs
     decoratives. UAW y vaut (0,0,0) : un volume d'air noir sur fond sombre
     est invisible, donc on l'affiche en gris-bleu et la legende le dit. */
  var COLORS = {
    MAND: [216, 101,  79],
    CB:   [128, 174, 128],
    UAW:  [140, 170, 190],
    MAX:  [230, 220,  70],
    CV:   [111, 184, 210]
  };
  var TRANSLUCENT = { UAW: 0.55 };
  var RAW_COLOR = [196, 190, 180];
  var EXPLODE = 0.16;
  var SIM = { intro: 800, load: 430, sweep: 1000, gap: 170, outro: 650 };

  function build(fig) {
    var data = window.AMASSS_MESH;
    var stage = fig.querySelector(".v3d-stage");
    var list = fig.querySelector(".v3d-parts");
    if (!data || !stage || !list) { return; }

    var scene = new window.Scene3D(stage, data, {
      onFrame: function (dt) { return frame(dt); },
      onPick: function (code) { select(code === selected ? null : code); },
      onHover: function (code) { hover(code); }
    });
    if (!scene.ok) { return; }
    fig.classList.add("v3d-on");

    var strings = {}, pot = fig.querySelectorAll(".v3d-i18n [data-k]");
    for (var i = 0; i < pot.length; i++) {
      strings[pot[i].getAttribute("data-k")] = pot[i].textContent.trim();
    }
    var statusEl = fig.querySelector(".v3d-status");
    function say(t) { if (statusEl) { statusEl.textContent = t || ""; } }

    var anat = [], raw = null;
    scene.parts.forEach(function (p) {
      p.row = list.querySelector('[data-part="' + p.code + '"]');
      p.base = TRANSLUCENT[p.code] || 1.0;
      p.on = true;
      if (p.code === "RAW") {
        raw = p;
        p.color = [RAW_COLOR[0] / 255, RAW_COLOR[1] / 255, RAW_COLOR[2] / 255];
        p.pickable = false;
        p.alpha = 0;
      } else {
        var c = COLORS[p.code] || RAW_COLOR;
        p.color = [c[0] / 255, c[1] / 255, c[2] / 255];
        p.alpha = p.base;
        anat.push(p);
      }
    });

    var selected = null, hovered = null, sim = null;

    function byCode(code) { return scene.byCode[code]; }

    function select(code) {
      selected = code;
      anat.forEach(function (p) {
        if (p.row) { p.row.setAttribute("aria-current", p.code === code ? "true" : "false"); }
      });
      fig.classList.toggle("v3d-has-sel", !!code);
      var part = code ? byCode(code) : null;
      if (part) { scene.lookAtPart(code, 3.1); } else { scene.lookHome(); }

      /* Vue eclatee : les autres pieces s'ecartent en s'eloignant du centre
         de la selection, ce qui degage ce qu'on regarde sans le deplacer.
         Les decalages sont dans le repere BRUT : le shader redresse lui-meme. */
      anat.forEach(function (p) {
        if (!part || p === part) { p.offGoal = [0, 0, 0]; return; }
        var d = [p.c[0] - part.c[0], p.c[1] - part.c[1], p.c[2] - part.c[2]];
        var l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
        p.offGoal = l < 1e-4 ? [0, EXPLODE, 0]
                             : [d[0] / l * EXPLODE, d[1] / l * EXPLODE, d[2] / l * EXPLODE];
      });
      if (scene.reduced) { anat.forEach(function (p) { p.off = p.offGoal.slice(); }); }
      scene.dirty = true; scene.kick();
    }

    function hover(code) {
      if (sim) { return; }
      if (code === hovered) { return; }
      hovered = code;
      scene.canvas.style.cursor = code ? "pointer" : "";
      anat.forEach(function (p) {
        if (p.row) { p.row.classList.toggle("v3d-hover", p.code === hovered); }
      });
      scene.dirty = true; scene.kick();
    }

    /* Une passe AMASSS : un reseau binaire PAR structure, charge puis
       applique, en boucle. Decocher ne produit rien -- c'est le module. */
    function run() {
      var codes = [];
      anat.forEach(function (p) {
        var chk = p.row && p.row.querySelector(".v3d-chk");
        p.on = chk ? chk.checked : true;
        p.gen = 0;
        if (p.on) { codes.push(p.code); }
      });
      if (!codes.length) {
        anat.forEach(function (p) { p.gen = 1; p.on = true; });
        say(strings.empty || "");
        scene.dirty = true; scene.kick();
        return;
      }
      select(null);
      sim = { codes: codes, i: -1, phase: "intro", t: 0, rawA: 0.92 };
      fig.classList.add("v3d-sim");
      say(strings.reading || "");
      scene.dirty = true; scene.kick();
    }

    function simStep(dt) {
      sim.t += dt;
      if (sim.phase === "intro") {
        sim.rawA = 0.92 - 0.60 * Math.min(1, sim.t / SIM.intro);
        if (sim.t >= SIM.intro) {
          sim.i = 0; sim.phase = "load"; sim.t = 0;
          say((strings.loading || "") + " " + nameOf(sim.codes[0]));
        }
      } else if (sim.phase === "load") {
        if (sim.t >= SIM.load) {
          sim.phase = "sweep"; sim.t = 0;
          say((strings.infer || "") + " " + nameOf(sim.codes[sim.i]));
        }
      } else if (sim.phase === "sweep") {
        var part = byCode(sim.codes[sim.i]);
        part.gen = Math.min(1, sim.t / SIM.sweep);
        if (sim.t >= SIM.sweep + SIM.gap) {
          part.gen = 1; sim.i += 1; sim.t = 0;
          if (sim.i >= sim.codes.length) {
            sim.phase = "outro";
            say(sim.codes.length + " " + (strings.finished || ""));
          } else {
            sim.phase = "load";
            say((strings.loading || "") + " " + nameOf(sim.codes[sim.i]));
          }
        }
      } else {
        sim.rawA = 0.32 * (1 - Math.min(1, sim.t / SIM.outro));
        if (sim.t >= SIM.outro) { sim = null; fig.classList.remove("v3d-sim"); }
      }
    }

    function nameOf(code) {
      var p = byCode(code), el = p && p.row && p.row.querySelector(".v3d-name");
      return el ? el.textContent.trim() : code;
    }

    function frame(dt) {
      var busy = false;
      if (sim) { simStep(dt); busy = true; }
      /* les decalages de la vue eclatee, cales sur le temps ecoule */
      var k = 1 - Math.pow(1 - 0.16, dt / 16.7);
      anat.forEach(function (p) {
        if (!p.offGoal) { p.offGoal = [0, 0, 0]; }
        for (var i = 0; i < 3; i++) {
          var d = p.offGoal[i] - p.off[i];
          if (Math.abs(d) > 0.0004) { busy = true; }
          p.off[i] += d * k;
        }
      });
      /* opacites : le scan d'entree pendant la passe, les structures sinon */
      if (raw) { raw.alpha = sim ? sim.rawA : 0; }
      anat.forEach(function (p) {
        p.alpha = p.base * (p.on ? 1 : 0);
        var dim = (!selected || selected === p.code) ? 1.0 : 0.0;
        if (p.code === hovered && dim === 1.0) { dim = 1.22; }
        p.dim = dim;
      });
      fig.classList.toggle("v3d-raw", !!sim && sim.rawA > 0.45);
      return busy;
    }

    list.addEventListener("click", function (e) {
      if (e.target.classList && e.target.classList.contains("v3d-chk")) { return; }
      var row = e.target.closest ? e.target.closest("[data-part]") : null;
      if (!row) { return; }
      e.preventDefault();
      var code = row.getAttribute("data-part");
      select(code === selected ? null : code);
    });
    list.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") { return; }
      var row = e.target.closest ? e.target.closest("[data-part]") : null;
      if (!row) { return; }
      e.preventDefault();
      var code = row.getAttribute("data-part");
      select(code === selected ? null : code);
    });
    list.addEventListener("change", function (e) {
      if (e.target.classList.contains("v3d-chk")) { say(""); }
    });
    var go = fig.querySelector(".v3d-go");
    if (go) { go.addEventListener("click", run); }
    var reset = fig.querySelector(".v3d-reset");
    if (reset) { reset.addEventListener("click", function () { select(null); }); }

    /* Jouer une fois a l'arrivee a l'ecran. L'IntersectionObserver seul ne
       suffit pas : il ne se declenche pas toujours sur un element deja
       visible au chargement, d'ou le test de position. */
    var fired = false;
    function once() {
      if (fired) { return; }
      fired = true;
      if (scene.reduced) { scene.dirty = true; scene.kick(); } else { run(); }
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { once(); }
      }, { rootMargin: "200px" }).observe(fig);
    }
    var r = fig.getBoundingClientRect();
    if (r.top < (window.innerHeight || 0) + 200 && r.bottom > -200) { once(); }
    else if (!window.IntersectionObserver) { once(); }

    scene.kick();
  }

  function init() {
    var figs = document.querySelectorAll("[data-amasss-3d]");
    for (var i = 0; i < figs.length; i++) {
      try { build(figs[i]); }
      catch (err) {
        if (window.console) { console.warn("visualiseur 3D indisponible :", err); }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
