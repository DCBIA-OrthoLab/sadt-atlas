/* aso-3d.js — les scenes d'ASO, sur le socle scene3d.js.

   ASO tourne un scan pour l'amener dans le repere d'un patient de reference.
   Ce n'est pas une illustration : la matrice jouee est celle qu'ASO a
   reellement ecrite en orientant le scan de test publie
   (MG_test_Or_transform.tfm), et les reperes qui se rapprochent sont ceux
   qu'ALI a reellement places.

   Deux emplois du meme code :
     data-aso          le Guide -- un seul mouvement, le resultat.
     data-aso="stages" l'Atlas -- les quatre etapes du .tfm, separement.
                       La fiche le dit : « a 3-point initialization -- a
                       translation followed by two rotations around
                       hand-built axes, never a least-squares Procrustes /
                       Kabsch », puis un ICP. Le fichier en contient quatre,
                       dans cet ordre.

   Le contenu est en HTML dans la page : traduit, indexe, imprimable. */
(function () {
  "use strict";

  var PATIENT = [255, 176, 84];
  var GOLD = [110, 230, 170];
  var SKULL = [205, 201, 193];
  var BASE = [128, 174, 128];

  /* ---- une matrice colonne-major, fraction t du chemin depuis l'identite.
     On passe par l'axe et l'angle : interpoler les seize coefficients
     donnerait une matrice qui n'est plus une rotation en cours de route. */
  function partial(m, t) {
    var r = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
    var c = Math.max(-1, Math.min(1, (r[0] + r[4] + r[8] - 1) / 2));
    var ang = Math.acos(c) * t;
    var ax = [r[5] - r[7], r[6] - r[2], r[1] - r[3]];
    var n = Math.sqrt(ax[0] * ax[0] + ax[1] * ax[1] + ax[2] * ax[2]);
    var out = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    if (n > 1e-9) {
      ax = [ax[0] / n, ax[1] / n, ax[2] / n];
      var s = Math.sin(ang), k = 1 - Math.cos(ang), x = ax[0], y = ax[1], z = ax[2];
      out[0] = 1 + k * (x * x - 1);   out[4] = -z * s + k * x * y;  out[8] = y * s + k * x * z;
      out[1] = z * s + k * x * y;     out[5] = 1 + k * (y * y - 1); out[9] = -x * s + k * y * z;
      out[2] = -y * s + k * x * z;    out[6] = x * s + k * y * z;   out[10] = 1 + k * (z * z - 1);
    }
    out[12] = m[12] * t; out[13] = m[13] * t; out[14] = m[14] * t;
    return out;
  }

  function mul(a, b) {                       /* a apres b, colonne-major */
    var r = new Float32Array(16), i, j, k, s;
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
      s = 0; for (k = 0; k < 4; k++) { s += a[k * 4 + j] * b[i * 4 + k]; }
      r[i * 4 + j] = s;
    }
    return r;
  }
  function apply(m, p) {
    return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
            m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
            m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  }
  var ID = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

  function build(fig) {
    var data = window.ASO_SCENE;
    var stage = fig.querySelector(".v3d-stage");
    if (!data || !stage) { return; }
    var stepwise = fig.getAttribute("data-aso") === "stages";

    var scene = new window.Scene3D(stage, data, {
      onFrame: function (dt) { return frame(dt); }
    });
    if (!scene.ok) { return; }
    fig.classList.add("v3d-on");

    var strings = {}, pot = fig.querySelectorAll(".v3d-i18n [data-k]");
    for (var i = 0; i < pot.length; i++) {
      strings[pot[i].getAttribute("data-k")] = pot[i].textContent.trim();
    }
    var statusEl = fig.querySelector(".v3d-status");
    function say(t) { if (statusEl) { statusEl.textContent = t || ""; } }

    scene.parts.forEach(function (p) {
      var c = p.code === "CB" ? BASE : SKULL;
      p.color = [c[0] / 255, c[1] / 255, c[2] / 255];
      p.alpha = p.code === "CB" ? 0.72 : 0.5;
      p.pickable = false;
    });

    var stages = data.stages || [];
    var STEP_MS = stepwise ? 950 : 2100;
    var HOLD = stepwise ? 700 : 900;
    var run = null, current = ID;

    /* PAS de residu affiche, et c'est un choix. ASO aligne des PLANS --
       occlusal et sagittal median -- pas des positions de points. Le gold
       est un autre patient : l'ecart entre leurs reperes est domine par la
       difference anatomique et ne diminue pas. Mesure faite : 17,96 mm au
       depart, 19,99 mm a l'arrivee. Afficher ce chiffre laisserait croire
       que l'orientation echoue, alors qu'il mesure autre chose qu'elle. */

    function start() {
      run = { i: 0, t: 0, done: [], holding: false };
      current = ID;
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    function cumulative(upTo) {
      var m = ID;
      for (var i = 0; i < upTo; i++) { m = mul(new Float32Array(stages[i].m), m); }
      return m;
    }

    function frame(dt) {
      if (!run) { return false; }
      run.t += dt;
      var base = cumulative(run.i);
      if (run.i >= stages.length) {
        current = base;
        paint();
        if (run.t > 1200) { run = null; fig.classList.remove("v3d-sim"); }
        return run !== null;
      }
      var st = stages[run.i];
      if (run.holding) {
        current = mul(new Float32Array(st.m), base);
        if (run.t >= HOLD) { run.i += 1; run.t = 0; run.holding = false; }
      } else {
        var t = Math.min(1, run.t / STEP_MS);
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        current = mul(partial(st.m, stepwise ? e : 1), base);
        if (!stepwise) {
          /* Le Guide ne decompose pas : un seul mouvement jusqu'au bout. */
          current = mul(partial(cumulative(stages.length), e), ID);
          if (t >= 1) { run.i = stages.length; run.t = 0; }
        } else if (t >= 1) { run.holding = true; run.t = 0; }
      }
      paint();
      return true;
    }

    function paint() {
      scene.parts.forEach(function (p) { p.xform = current; });
      var marks = [];
      data.gold.forEach(function (g) {
        marks.push({ p: g.p, c: [GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255], s: 0.017 });
      });
      Object.keys(data.patient || {}).forEach(function (k) {
        marks.push({ p: apply(current, data.patient[k]),
                     c: [PATIENT[0] / 255, PATIENT[1] / 255, PATIENT[2] / 255], s: 0.013 });
      });
      scene.setMarks(marks);

      var lbl = "";
      if (run && run.i < stages.length && stepwise) {
        var st = stages[run.i];
        lbl = (run.i + 1) + "/" + stages.length + " " + stageName(run.i) + " — "
            + (st.deg > 0.005 ? st.deg.toFixed(2) + "\u00b0" : st.mm.toFixed(2) + " mm");
        chip(run.i);
      } else if (!run) {
        lbl = (strings.done || "") + " " + (data.totalDeg || 0).toFixed(2) + "\u00b0";
        chip(-1);
      }
      say(lbl);
    }

    function chip(i) {
      var n = fig.querySelectorAll(".v3d-stages [data-stage]");
      for (var k = 0; k < n.length; k++) {
        n[k].setAttribute("aria-current", k === i ? "true" : "false");
      }
    }

    function stageName(i) {
      /* Le libelle seul : la pastille porte aussi la valeur dans un <code>,
         et la reprendre dupliquait « 0.17 mm — 0.17 mm ». */
      var n = fig.querySelectorAll(".v3d-stages [data-stage]");
      if (!n[i]) { return (stages[i] && stages[i].name) || ""; }
      var out = "";
      var kids = n[i].childNodes;
      for (var k = 0; k < kids.length; k++) {
        if (kids[k].nodeType === 3) { out += kids[k].nodeValue; }
      }
      return out.trim() || n[i].textContent.trim();
    }

    var go = fig.querySelector(".v3d-go");
    if (go) { go.addEventListener("click", start); }

    var fired = false;
    function once() {
      if (fired) { return; }
      fired = true;
      if (scene.reduced) { paint(); scene.dirty = true; scene.kick(); } else { start(); }
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { once(); }
      }, { rootMargin: "200px" }).observe(fig);
    }
    var bb = fig.getBoundingClientRect();
    if (bb.top < (window.innerHeight || 0) + 200 && bb.bottom > -200) { once(); }
    else if (!window.IntersectionObserver) { once(); }
    paint();
    scene.kick();
  }

  /* ------------------------------------------------------------------ */
  /* ASO_IOS : l'autre moteur, et le seul ou l'ecart veut dire quelque chose */
  /* ------------------------------------------------------------------ */
  function buildIOS(fig) {
    var data = window.ASO_IOS_SCENE;
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
    var statusEl = fig.querySelector(".v3d-status");
    function say(t) { if (statusEl) { statusEl.textContent = t || ""; } }

    var arch = scene.byCode.ARCH, gold = scene.byCode.GOLD;
    if (gold) {
      gold.color = [GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255];
      gold.alpha = 0.26; gold.pickable = false;
    }
    if (arch) {
      arch.color = [0.90, 0.88, 0.85];
      arch.alpha = 1; arch.pickable = false;
    }

    var M = new Float32Array(data.matrix || ID);
    var span = data.span || 1;
    var shared = data.shared || [];
    var run = null, current = ID;
    var MS = 2400;

    /* Ici la mesure est legitime : le gold est une arcade, et les reperes
       portent les MEMES etiquettes dent par dent. Sur le CBCT le gold est un
       autre patient et ce chiffre n'aurait aucun sens -- c'est pourquoi il
       n'y est pas. */
    function residual(m) {
      if (!shared.length) { return null; }
      var sum = 0;
      shared.forEach(function (k) {
        var a = apply(m, data.patient[k]), g = data.gold[k];
        var d = [a[0] - g[0], a[1] - g[1], a[2] - g[2]];
        sum += Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      });
      return sum / shared.length * span;
    }

    function start() { run = { t: 0 }; current = ID; fig.classList.add("v3d-sim"); scene.dirty = true; scene.kick(); }

    function frame(dt) {
      if (!run) { return false; }
      run.t += dt;
      var t = Math.min(1, run.t / MS);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      current = partial(M, e);
      paint();
      if (t >= 1 && run.t > MS + 900) { run = null; fig.classList.remove("v3d-sim"); return false; }
      return true;
    }

    function paint() {
      if (arch) { arch.xform = current; }
      var marks = [];
      shared.forEach(function (k) {
        marks.push({ p: data.gold[k], c: [GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255], s: 0.010 });
        marks.push({ p: apply(current, data.patient[k]),
                     c: [PATIENT[0] / 255, PATIENT[1] / 255, PATIENT[2] / 255], s: 0.008 });
      });
      scene.setMarks(marks);
      var r = residual(current);
      say(r == null ? "" : (strings.gap || "") + " " + r.toFixed(2) + " mm");
    }

    var go = fig.querySelector(".v3d-go");
    if (go) { go.addEventListener("click", start); }

    var fired = false;
    function once() {
      if (fired) { return; }
      fired = true;
      if (scene.reduced) { paint(); scene.dirty = true; scene.kick(); } else { start(); }
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { once(); }
      }, { rootMargin: "200px" }).observe(fig);
    }
    var bb = fig.getBoundingClientRect();
    if (bb.top < (window.innerHeight || 0) + 200 && bb.bottom > -200) { once(); }
    else if (!window.IntersectionObserver) { once(); }
    paint();
    scene.kick();
  }

  function init() {
    var ios = document.querySelectorAll("[data-aso-ios]");
    for (var k = 0; k < ios.length; k++) {
      try { buildIOS(ios[k]); }
      catch (err) {
        if (window.console) { console.warn("scene ASO_IOS indisponible :", err); }
      }
    }
    var figs = document.querySelectorAll("[data-aso]");
    for (var i = 0; i < figs.length; i++) {
      try { build(figs[i]); }
      catch (err) {
        if (window.console) { console.warn("scene ASO indisponible :", err); }
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
