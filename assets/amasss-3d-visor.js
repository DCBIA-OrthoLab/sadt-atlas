/* amasss-3d-visor.js : la scene AMASSS telle que la joue le portage VISOR.

   Copie d'amasss-3d.js (la page legacy en depend : on n'y touche pas), avec
   les trois ecarts que le code VISOR impose :

   1. Couleurs : LABEL_COLORS du catalogue VISOR (SADT-VISOR
      tools/AMASSS/src/sadt_amasss/catalog.py:70-80). UAW y vaut
      (0, 151, 206) et n'a plus besoin d'etre remplace par un gris-bleu.
   2. Largeur : les structures sont predites dans un ThreadPoolExecutor dont
      la largeur est accordee par le serveur (pipeline.py:442-478). Cocher
      « side by side » joue les structures par vagues de cette largeur
      (toutes a la fois : deployment.toml reserve une voie par structure
      cochee) ; decoche, une a la fois, ce qui est le cas sans superviseur
      (pipeline.py:269-271). La case est lue au lancement.
   3. Assemblage : une phase finale par scan (binarisation, fusion,
      ecriture), pipeline.py:490-522, qui n'apparaissait pas.

   Comme l'original : aucun texte traduisible ici. Les libelles sont dans la
   page (<span class="v3d-i18n" hidden>), la liste HTML est le contenu, le
   canvas un supplement. */
(function () {
  "use strict";

  var COLORS = {
    MAND: [216, 101,  79],
    CB:   [128, 174, 128],
    UAW:  [  0, 151, 206],
    MAX:  [230, 220,  70],
    CV:   [111, 184, 210]
  };
  var TRANSLUCENT = { UAW: 0.55 };
  var RAW_COLOR = [196, 190, 180];
  var EXPLODE = 0.16;
  var SIM = { intro: 800, load: 430, sweep: 1000, gap: 170, assemble: 700, outro: 650 };

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
    var parBox = fig.querySelector(".v3d-par");

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

    /* Une passe VISOR : lecture et conversion des scans, puis les structures
       par vagues de la largeur accordee, puis l'assemblage par scan. */
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
      var width = (parBox && !parBox.checked) ? 1 : codes.length;
      var waves = [];
      for (var k = 0; k < codes.length; k += width) { waves.push(codes.slice(k, k + width)); }
      select(null);
      sim = { codes: codes, waves: waves, w: -1, done: 0, phase: "intro", t: 0, rawA: 0.92 };
      fig.classList.add("v3d-sim");
      say(strings.reading || "");
      scene.dirty = true; scene.kick();
    }

    function announce(prefixKey) {
      var wave = sim.waves[sim.w];
      if (wave.length === 1) {
        say((strings[prefixKey] || "") + " " + nameOf(wave[0]));
      } else {
        say((strings[prefixKey + "Par"] || "") + " " + wave.length);
      }
    }

    function simStep(dt) {
      sim.t += dt;
      if (sim.phase === "intro") {
        sim.rawA = 0.92 - 0.60 * Math.min(1, sim.t / SIM.intro);
        if (sim.t >= SIM.intro) {
          sim.w = 0; sim.phase = "load"; sim.t = 0;
          announce("loading");
        }
      } else if (sim.phase === "load") {
        if (sim.t >= SIM.load) {
          sim.phase = "sweep"; sim.t = 0;
          announce("infer");
        }
      } else if (sim.phase === "sweep") {
        var g = Math.min(1, sim.t / SIM.sweep);
        sim.waves[sim.w].forEach(function (code) { byCode(code).gen = g; });
        if (sim.t >= SIM.sweep + SIM.gap) {
          sim.waves[sim.w].forEach(function (code) { byCode(code).gen = 1; });
          sim.done += sim.waves[sim.w].length;
          sim.w += 1; sim.t = 0;
          if (sim.w >= sim.waves.length) {
            sim.phase = "assemble";
            say(strings.assemble || "");
          } else {
            sim.phase = "load";
            announce("loading");
          }
        }
      } else if (sim.phase === "assemble") {
        if (sim.t >= SIM.assemble) {
          sim.phase = "outro"; sim.t = 0;
          say(sim.codes.length + " " + (strings.finished || ""));
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
      var k = 1 - Math.pow(1 - 0.16, dt / 16.7);
      anat.forEach(function (p) {
        if (!p.offGoal) { p.offGoal = [0, 0, 0]; }
        for (var i = 0; i < 3; i++) {
          var d = p.offGoal[i] - p.off[i];
          if (Math.abs(d) > 0.0004) { busy = true; }
          p.off[i] += d * k;
        }
      });
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
    window.Scene3D.attachControls(fig, scene, null);
    var reset = fig.querySelector(".v3d-reset");
    if (reset) { reset.addEventListener("click", function () { select(null); }); }

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
    var figs = document.querySelectorAll("[data-amasss-3d-visor]");
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
