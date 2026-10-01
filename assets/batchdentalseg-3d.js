/* batchdentalseg-3d.js — la scene BatchDentalSeg, sur le socle scene3d.js.

   Ce que la scene doit faire comprendre, et qui la distingue d'AMASSS :

   1. UN SEUL reseau, multi-etiquettes. AMASSS charge un reseau binaire PAR
      structure et les revele l'une apres l'autre ; ici `nnUNetv2_predict`
      fait une passe unique et TOUTES les etiquettes sortent ensemble. D'ou
      un seul balayage, partage par toutes les pieces.
   2. Le modele change l'INVENTAIRE, pas le code. Les quatre entrees du combo
      passent par le meme `Parameter(...)` ; seule la table d'etiquettes
      differe. Choisir un modele ici applique sa table a la scene : la voute
      cranienne DISPARAIT quand on choisit UniversalLab, parce que ce modele
      n'a pas d'etiquette « Upper Skull ». Ce n'est pas un effet, c'est la
      table du code.
   3. Beaucoup de dents ne se pilotent pas avec trente-deux boutons. Le
      selecteur des 52 dents d'UniversalLab est un SCHEMA DENTAIRE (deux
      arcades, la disposition clinique standard), pas une liste.

   HONNETETE. La geometrie est UNE passe `UniversalLabDentalsegmentator`
   lancee pour cette page sur `PreDentalSurgery`, l'echantillon publie par
   Slicer lui-meme. Elle a ecrit 32 etiquettes sur les 55 de sa table : 29
   dents, plus mandibule, maxillaire et canal. Les 23 manquantes manquent a
   la BOUCHE, pas a la page -- trois dents de sagesse et toute la denture
   temporaire -- et les cellules correspondantes du schema le disent au lieu
   de montrer une dent qui n'existe pas.

   Le bouton « Run » n'est actif QUE pour le modele qui a reellement tourne :
   rejouer la meme geometrie sous l'etiquette d'un autre modele serait
   mentir. Pour les trois autres, la scene applique leur table -- ce qui est
   verifiable dans le code -- et le statut dit que la geometrie a l'ecran
   reste celle de la passe UniversalLab. Le passage de la teinte neutre aux
   couleurs officielles a l'etape `labelmap` est une MISE EN SCENE du remap
   par LUT ; la legende de la figure le dit.

   Le contenu editorial n'est pas ici : il est en HTML dans la page, donc
   traduit par i18n.py, indexe par la recherche et imprimable. Sans WebGL2 le
   canvas ne s'affiche jamais et la page reste entiere. */
(function () {
  "use strict";

  /* Teinte de la prediction avant le remap : ni une couleur du module, ni une
     couleur de structure. Un gris-vert d'instrument. */
  var PRED = [150, 168, 158];
  var RAW_COLOR = [196, 190, 180];
  /* Vue eclatee. Une dent est cernee de ses voisines : il faut les ecarter
     franchement pour la degager, alors qu'un os n'a que quelques voisins. */
  var EXPLODE = 0.09;
  var EXPLODE_TOOTH = 0.17;

  /* Les etapes du module, dans l'ordre du code. `predict` est la passe
     nnU-Net (une seule, step_size 0,5, un fold, sans TTA) ; `labelmap` est
     `_buildLabelArray` (un export + un remap par LUT) ; `export` est
     `_exportVTKPerLabel` et la mise en place des opacites 3D. */
  var STEPS = [
    { k: "read",     ms: 1100 },
    { k: "predict",  ms: 2800 },
    { k: "labelmap", ms: 1100 },
    { k: "export",   ms: 1300 }
  ];

  function hex(s) {
    var n = parseInt(s.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function build(fig) {
    var data = window.BATCHDENTALSEG_MESH;
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
    var statusEls = fig.querySelectorAll(".v3d-status");
    function say(t) {
      for (var k = 0; k < statusEls.length; k++) { statusEls[k].textContent = t || ""; }
    }

    var info = data.parts_info || {};
    var models = data.models || {};
    var runModel = data.model;
    var run = data.run || {};

    /* ---- pieces ---- */
    var anat = [], raw = null;
    scene.parts.forEach(function (p) {
      p.row = list.querySelector('[data-part="' + p.code + '"]');
      var meta = info[p.code] || {};
      p.official = hex(meta.color || "#b9b3a8");
      p.base = meta.opacity != null ? meta.opacity : 1.0;
      p.on = true;
      if (p.code === "RAW") {
        raw = p;
        p.color = [RAW_COLOR[0] / 255, RAW_COLOR[1] / 255, RAW_COLOR[2] / 255];
        p.pickable = false;
        p.alpha = 0;
      } else {
        p.color = p.official.slice();
        p.alpha = p.base;
        /* La pastille de la liste doit porter la couleur de la piece qui est
           VRAIMENT a l'ecran : un modele par dent ne peint pas la mandibule
           comme un modele a cinq etiquettes. Le HTML porte la valeur de repli,
           pour le cas sans WebGL. */
        if (p.row && meta.color) { p.row.style.setProperty("--sw", meta.color); }
        anat.push(p);
      }
    });

    var rows = [];
    var lis = list.querySelectorAll("[data-part]");
    for (i = 0; i < lis.length; i++) {
      rows.push({
        el: lis[i],
        code: lis[i].getAttribute("data-part"),
        /* Le nom d'etiquette du module, pas le libelle affiche : c'est lui
           qui sert de cle dans les quatre tables. */
        label: lis[i].getAttribute("data-label"),
        num: lis[i].querySelector(".v3d-lab"),
        tag: lis[i].querySelector(".v3d-tag")
      });
    }

    var chart = fig.querySelector(".v3d-chart");
    var model = runModel, selected = null, hovered = null, sim = null;

    /* Une cellule du schema porte la VALEUR d'etiquette ; la piece porte le
       code `T01`..`T52`. Les deux se deduisent l'une de l'autre, et c'est la
       seule traduction a faire entre le schema et la scene. */
    function toothCode(value) {
      var n = parseInt(value, 10);
      return "T" + (n < 10 ? "0" + n : String(n));
    }
    function cellFor(code) {
      if (!chart || code.charAt(0) !== "T") { return null; }
      return chart.querySelector('[data-tooth="' + parseInt(code.slice(1), 10) + '"]');
    }
    /* Une dent que la passe n'a pas produite n'est pas cliquable : on ne
       designe que ce qui existe, exactement comme le picking de la scene. */
    function markChart() {
      if (!chart) { return; }
      var cells = chart.querySelectorAll("[data-tooth]");
      for (var j = 0; j < cells.length; j++) {
        var has = !!scene.byCode[toothCode(cells[j].getAttribute("data-tooth"))];
        cells[j].setAttribute("data-state", has ? "on" : "absent");
      }
    }
    var lutMix = 1;        /* 0 = teinte de prediction, 1 = couleurs du module */
    var opaMix = 1;        /* 0 = tout opaque, 1 = opacites 3D du module      */

    /* ---- le modele choisi applique SA table ---- */

    function perTooth(name) {
      return Object.keys(models[name] || {}).length > 10;
    }

    function applyModel(name) {
      model = name;
      var table = models[name] || {};
      var teeth = perTooth(name);
      var bs = fig.querySelectorAll("[data-bds-model]");
      for (var j = 0; j < bs.length; j++) {
        bs[j].setAttribute("aria-pressed",
          bs[j].getAttribute("data-bds-model") === name ? "true" : "false");
      }
      fig.classList.toggle("v3d-teeth", teeth);
      if (chart) { chart.hidden = !teeth; }
      if (teeth) { markChart(); }

      rows.forEach(function (r) {
        var val = table[r.label];
        var part = scene.byCode[r.code];
        var state;
        if (val == null) {
          /* Une arcade absente de la table d'un modele par dent n'est pas
             absente : elle est DECOUPEE. Les deux cas ne se disent pas
             pareil. */
          state = (teeth && (r.code === "UPT" || r.code === "LOT"))
            ? "split" : "absent";
        } else if (!part) {
          state = "nogeom";     /* dans la table, mais pas dans la passe lue */
        } else {
          state = "on";
        }
        r.state = state;
        r.el.setAttribute("data-state", state);
        if (r.num) { r.num.textContent = val == null ? "—" : String(val); }
        if (r.tag) { r.tag.textContent = strings[state] || ""; }
        if (part) { part.on = (state === "on" || state === "split"); }
      });

      /* Le bouton ne joue que le modele qui a REELLEMENT tourne. */
      var go = fig.querySelector(".v3d-go");
      var playable = (name === runModel);
      if (go) { go.disabled = !playable; }
      fig.classList.toggle("v3d-noplay", !playable);
      select(null);
      if (!playable) {
        sim = null;
        fig.classList.remove("v3d-sim");
        lutMix = 1; opaMix = 1;
        anat.forEach(function (p) { p.gen = 1; });
        say(strings.other || "");
      } else {
        say("");
      }
      scene.dirty = true; scene.kick();
    }

    /* ---- selection ---- */

    function nameOf(code) {
      var p = scene.byCode[code], el = p && p.row && p.row.querySelector(".v3d-name");
      if (el) { return el.textContent.trim(); }
      /* Le nom d'une dent vit dans le `title` de sa cellule -- donc en HTML,
         donc traduisible et indexe, et pas dans ce fichier. */
      var cell = cellFor(code);
      if (cell) { return (cell.getAttribute("title") || "").split("—")[0].trim(); }
      return code;
    }

    function select(code) {
      var part = code ? scene.byCode[code] : null;
      if (part && !part.on) { part = null; code = null; }
      selected = code;
      rows.forEach(function (r) {
        r.el.setAttribute("aria-current", r.code === code ? "true" : "false");
      });
      if (chart) {
        var cells = chart.querySelectorAll("[data-tooth]");
        for (var j = 0; j < cells.length; j++) {
          cells[j].setAttribute("aria-pressed",
            code && toothCode(cells[j].getAttribute("data-tooth")) === code
              ? "true" : "false");
        }
      }
      fig.classList.toggle("v3d-has-sel", !!code);
      /* Une dent fait un rayon de 0,06 dans ce repere : la rapprocher
         davantage mettrait la camera DANS l'arcade, entre les racines. On
         garde donc le plancher de `lookAtPart` (0,42) et c'est l'effacement
         de l'os, plus bas, qui rend la dent visible -- pas la distance. */
      if (part) { scene.lookAtPart(code, 3.0); } else { scene.lookHome(); }

      /* Vue eclatee : les autres pieces s'ecartent du centre de la selection,
         ce qui degage ce qu'on regarde sans le deplacer. Les decalages sont
         dans le repere BRUT -- le shader redresse lui-meme. */
      var push = (code && code.charAt(0) === "T") ? EXPLODE_TOOTH : EXPLODE;
      anat.forEach(function (p) {
        if (!part || p === part) { p.offGoal = [0, 0, 0]; return; }
        var d = [p.c[0] - part.c[0], p.c[1] - part.c[1], p.c[2] - part.c[2]];
        var l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
        p.offGoal = l < 1e-4 ? [0, push, 0]
                             : [d[0] / l * push, d[1] / l * push, d[2] / l * push];
      });
      if (scene.reduced) { anat.forEach(function (p) { p.off = p.offGoal.slice(); }); }
      if (code) {
        /* Le volume est MESURE sur le label map de la passe (nombre de voxels
           x volume du voxel), pas estime. La valeur d'etiquette est celle du
           modele choisi -- et elle n'existe pas pour une arcade que ce
           modele decoupe, auquel cas on ne l'ecrit pas. */
        var meta = info[code] || {};
        var val = (models[model] || {})[meta.name];
        var bits = [nameOf(code)];
        if (val != null && strings.label) { bits.push(strings.label + " " + val); }
        if (meta.fdi && strings.fdi) { bits.push(strings.fdi + " " + meta.fdi); }
        bits.push(Math.round(meta.mm3 || 0).toLocaleString() + " mm³");
        say(bits.join(" · "));
      } else if (model === runModel) { say(""); }
      scene.dirty = true; scene.kick();
    }

    function hover(code) {
      if (sim) { return; }
      if (code === hovered) { return; }
      hovered = code;
      scene.canvas.style.cursor = code ? "pointer" : "";
      rows.forEach(function (r) {
        r.el.classList.toggle("v3d-hover", r.code === hovered);
      });
      /* Survoler une dent dans la vue allume sa cellule, et reciproquement :
         les deux moities du composant doivent toujours dire la meme chose. */
      if (chart) {
        var cells = chart.querySelectorAll("[data-tooth]");
        for (var j = 0; j < cells.length; j++) {
          cells[j].classList.toggle("v3d-hover",
            !!hovered && toothCode(cells[j].getAttribute("data-tooth")) === hovered);
        }
      }
      scene.dirty = true; scene.kick();
    }

    /* ---- la passe ---- */

    function start() {
      if (model !== runModel) { return; }
      select(null);
      sim = { i: 0, t: 0 };
      lutMix = 0; opaMix = 0;
      anat.forEach(function (p) { p.gen = 0; });
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    function seek(i) {
      if (model !== runModel) { return; }
      if (i == null || i < 0 || i >= STEPS.length) { return; }
      /* Choisir une etape est une intention : l'autoplay en attente ne doit
         pas venir la remplacer une seconde plus tard. */
      fired = true;
      sim = { i: i, t: 0 };
      /* On remet le monde tel qu'il doit etre A L'ENTREE de cette etape,
         sinon on verrait les couleurs deja remappees selon d'ou on vient. */
      anat.forEach(function (p) { p.gen = i >= 2 ? 1 : 0; });
      lutMix = i >= 3 ? 1 : 0;
      opaMix = 0;
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    function chip(i) {
      var n = fig.querySelectorAll(".v3d-steps [data-step]");
      for (var j = 0; j < n.length; j++) {
        n[j].setAttribute("aria-current", j === i ? "true" : "false");
      }
    }

    function stepName(k) {
      return strings[k] || k;
    }

    function simStep(dt) {
      var st = STEPS[sim.i];
      if (!st) {
        sim = null;
        fig.classList.remove("v3d-sim");
        chip(-1);
        lutMix = 1; opaMix = 1;
        anat.forEach(function (p) { p.gen = 1; });
        say(shown() + " " + (strings.done || "") + " · "
            + (run.ok || 0) + "/" + (run.scans || 0) + " "
            + (strings.scans || "") + " · "
            + (run.seconds || 0).toFixed(1) + " s");
        return;
      }
      sim.t += dt;
      chip(sim.i);
      var f = Math.min(1, sim.t / st.ms);

      if (st.k === "read") {
        /* Le scan d'entree, seuille. Pas de reseau ici : un bloc unique. */
        raw && (raw.alpha = 0.92 - 0.10 * f);
        anat.forEach(function (p) { p.gen = 0; });
        lutMix = 0; opaMix = 0;
        say(stepName("read"));
      } else if (st.k === "predict") {
        /* UNE passe, donc UN balayage : toutes les etiquettes avancent
           ensemble. C'est la difference avec AMASSS, et elle se voit. */
        raw && (raw.alpha = 0.82 * (1 - f));
        anat.forEach(function (p) { p.gen = f; });
        lutMix = 0; opaMix = 0;
        say(stepName("predict") + " — " + Math.round(f * 100) + " %");
      } else if (st.k === "labelmap") {
        raw && (raw.alpha = 0);
        anat.forEach(function (p) { p.gen = 1; });
        lutMix = f;
        opaMix = 0;
        say(stepName("labelmap") + " — " + shown() + " "
            + (strings.values || ""));
      } else {
        raw && (raw.alpha = 0);
        anat.forEach(function (p) { p.gen = 1; });
        lutMix = 1;
        opaMix = f;
        say(stepName("export"));
      }
      if (sim.t >= st.ms + 260) { sim.i += 1; sim.t = 0; }
    }

    function shown() {
      var n = 0;
      anat.forEach(function (p) { if (p.on) { n += 1; } });
      return n;
    }

    function frame(dt) {
      var busy = false;
      var toothSel = !!selected && selected.charAt(0) === "T";
      if (sim) { simStep(dt); busy = true; }

      var k = 1 - Math.pow(1 - 0.16, dt / 16.7);
      anat.forEach(function (p) {
        if (!p.offGoal) { p.offGoal = [0, 0, 0]; }
        for (var j = 0; j < 3; j++) {
          var d = p.offGoal[j] - p.off[j];
          if (Math.abs(d) > 0.0004) { busy = true; }
          p.off[j] += d * k;
        }
      });

      if (raw && !sim) { raw.alpha = 0; }
      anat.forEach(function (p) {
        /* la teinte : neutre pendant la prediction, officielle apres le LUT */
        for (var j = 0; j < 3; j++) {
          p.color[j] = PRED[j] / 255 + (p.official[j] - PRED[j] / 255) * lutMix;
        }
        /* l'opacite : pleine pendant la passe, puis celle du module */
        var a = 1 + (p.base - 1) * opaMix;
        /* Une dent est ENFERMEE dans son os. Sans effacer la mandibule et le
           maxillaire on ne regarde que l'interieur d'un maxillaire, ce qui
           est noir et n'apprend rien. */
        if (toothSel && p.code.charAt(0) !== "T") { a *= 0.14; }
        p.alpha = p.on ? a : 0;
        /* Estomper les autres pieces, pas les eteindre : a zero, une scene de
           32 pieces devient une silhouette noire des qu'on choisit une dent. */
        var dim = (!selected || selected === p.code) ? 1.0 : 0.26;
        if (p.code === hovered && dim === 1.0) { dim = 1.22; }
        p.dim = dim;
      });
      return busy;
    }

    /* ---- le schema dentaire : 52 cellules, pas 52 boutons empiles ---- */

    if (chart) {
      chart.addEventListener("click", function (e) {
        var cell = e.target.closest ? e.target.closest("[data-tooth]") : null;
        if (!cell) { return; }
        e.preventDefault();
        var value = cell.getAttribute("data-tooth");
        var code = toothCode(value);
        if (scene.byCode[code]) {
          select(code === selected ? null : code);   /* select() ecrit le statut */
          return;
        }
        /* Etiquette de la table que la passe n'a pas produite : cette dent
           n'est pas dans cette bouche. On le dit plutot que d'en montrer une. */
        select(null);
        var bits = [(cell.getAttribute("title") || "").split("—")[0].trim()];
        if (strings.label) { bits.push(strings.label + " " + value); }
        if (strings.notinscan) { bits.push(strings.notinscan); }
        say(bits.join(" · "));
      });
    }

    /* ---- la liste et les commandes ---- */

    list.addEventListener("click", function (e) {
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
    fig.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-bds-model]") : null;
      if (b) { e.preventDefault(); applyModel(b.getAttribute("data-bds-model")); return; }
      if (e.target.closest && e.target.closest(".v3d-go")) { start(); }
    });
    var reset = fig.querySelector(".v3d-reset");
    if (reset) { reset.addEventListener("click", function () { select(null); }); }

    window.Scene3D.attachControls(fig, scene, seek);
    applyModel(runModel);

    /* Jouer une fois a l'arrivee a l'ecran. L'IntersectionObserver seul ne
       suffit pas : il ne se declenche pas toujours sur un element deja
       visible au chargement, d'ou le test de position. */
    var fired = false;
    function once() {
      if (fired) { return; }
      fired = true;
      if (scene.reduced) { scene.dirty = true; scene.kick(); } else { start(); }
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
    var figs = document.querySelectorAll("[data-bds-3d]");
    for (var i = 0; i < figs.length; i++) {
      try { build(figs[i]); }
      catch (err) {
        if (window.console) { console.warn("scene BatchDentalSeg indisponible :", err); }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
