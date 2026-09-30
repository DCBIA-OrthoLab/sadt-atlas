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
  var TRAIL = [120, 190, 235];
  var GREY = [206, 202, 196];
  var SEG_MS = 1900, CENT_MS = 1100;

  var hue = window.Scene3D.hue;

  var WALK_MS = 2600;

  /* Le mode Fully-Automated n'est que « the semi mode preceded by generating
     the missing landmarks » : le pipeline complet commence donc par ALI. Ces
     trajectoires sont celles que les agents ont REELLEMENT parcourues sur ce
     scan, relevees dans `position_mem`, et elles finissent a 0,28 mm des
     reperes qu'ASO a ensuite utilises. */
  function flatPath(agent) {
    var out = [];
    (agent.legs || []).forEach(function (l) {
      (l.path || []).forEach(function (pt) { out.push(pt); });
    });
    return out;
  }

  function walkMarks(agents, f) {
    var marks = [];
    Object.keys(agents || {}).forEach(function (k) {
      var pts = agents[k]._flat || (agents[k]._flat = flatPath(agents[k]));
      if (!pts.length) { return; }
      var n = Math.max(1, Math.round(pts.length * f));
      for (var i = Math.max(0, n - 34); i < n - 1; i++) {
        var a = (i - Math.max(0, n - 34)) / 34;
        marks.push({ p: pts[i], c: [TRAIL[0] / 255 * (0.3 + a * 0.7),
                                    TRAIL[1] / 255 * (0.3 + a * 0.7),
                                    TRAIL[2] / 255 * (0.3 + a * 0.7)], s: 0.005 + a * 0.003 });
      }
      marks.push({ p: pts[n - 1],
                   c: [PATIENT[0] / 255, PATIENT[1] / 255, PATIENT[2] / 255],
                   s: f >= 1 ? 0.013 : 0.017 });
    });
    return marks;
  }

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

    var agents = data.agents || {};
    var hasAli = Object.keys(agents).length > 0;

    function start() {
      run = { act: hasAli ? "ali" : "orient", i: 0, t: 0, holding: false };
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
      if (run.act === "ali") {
        var f = Math.min(1, run.t / WALK_MS);
        scene.setMarks(walkMarks(agents, f).concat(goldMarks()));
        say(strings.placing || "");
        chip(-1);
        if (run.t >= WALK_MS + 500) { run.act = "orient"; run.t = 0; }
        return true;
      }
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

    function goldMarks() {
      return (data.gold || []).map(function (g) {
        return { p: g.p, c: [GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255], s: 0.017 };
      });
    }

    function paint() {
      scene.parts.forEach(function (p) { p.xform = current; });
      var marks = goldMarks();
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

    var gold = scene.byCode.GOLD;
    if (gold) {
      gold.color = [GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255];
      gold.alpha = 0.26; gold.pickable = false;
    }
    /* Tout ce qui n'est pas le gold appartient au patient et bouge ensemble. */
    var moving = scene.parts.filter(function (p) { return p.code !== "GOLD"; });
    var teeth = data.teeth || [];
    moving.forEach(function (p) {
      p.color = [GREY[0] / 255, GREY[1] / 255, GREY[2] / 255];
      p.alpha = 1; p.pickable = false;
      var k = teeth.indexOf(p.code);
      p.seg = k < 0 ? null : hue(k, teeth.length);
    });

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

    /* Le pipeline, dans l'ordre du code : segmenter, prendre les centroides
       de couronnes, puis orienter sur ces centroides. */
    function start() {
      run = { act: teeth.length ? "seg" : "orient", t: 0, lit: 0 };
      current = ID;
      moving.forEach(function (p) { p.on = false; });
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    function frame(dt) {
      if (!run) { return false; }
      run.t += dt;
      if (run.act === "seg") {
        var k = Math.min(teeth.length, Math.floor(run.t / (SEG_MS / teeth.length)) + 1);
        run.lit = k;
        say((strings.seg || "") + " " + k + "/" + teeth.length);
        paint();
        if (run.t >= SEG_MS + 350) { run.act = "cent"; run.t = 0; }
        return true;
      }
      if (run.act === "cent") {
        say(strings.centroids || "");
        paint();
        if (run.t >= CENT_MS + 350) { run.act = "orient"; run.t = 0; }
        return true;
      }
      var t = Math.min(1, run.t / MS);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      current = partial(M, e);
      paint();
      if (t >= 1 && run.t > MS + 900) { run = null; fig.classList.remove("v3d-sim"); return false; }
      return true;
    }

    function paint() {
      var act = run ? run.act : "done";
      moving.forEach(function (p) {
        p.xform = current;
        p.on = true;
        var k = teeth.indexOf(p.code);
        var lit = act === "seg" ? (k >= 0 && k < run.lit) : true;
        var c = (lit && p.seg) ? p.seg : GREY;
        p.color = [c[0] / 255, c[1] / 255, c[2] / 255];
      });
      var marks = [];
      if (act === "seg") { scene.setMarks([]); return; }
      /* Les centroides : c'est la-dessus que l'orientation travaille. */
      Object.keys(data.centroids || {}).forEach(function (k) {
        marks.push({ p: apply(current, data.centroids[k]),
                     c: [PATIENT[0] / 255, PATIENT[1] / 255, PATIENT[2] / 255], s: 0.014 });
      });
      if (act === "orient" || act === "done") {
        shared.forEach(function (k) {
          marks.push({ p: data.gold[k], c: [GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255], s: 0.009 });
        });
        var r = residual(current);
        if (r != null) { say((strings.gap || "") + " " + r.toFixed(2) + " mm"); }
      }
      scene.setMarks(marks);
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
  /* Le Guide : deux entrees, une bascule                                 */
  /* ------------------------------------------------------------------ */
  /* « It handles both a CBCT (a volume) and an intraoral scan (a surface),
     with two different engines behind a single window » -- la page le dit,
     la figure le montre. Un seul mouvement de chaque cote : le Guide donne
     le resultat, l'Atlas decompose. */
  function buildGuide(fig) {
    var scenes = {}, mode = null, run = null, current = {};
    var strings = {}, pot = fig.querySelectorAll(".v3d-i18n [data-k]");
    for (var i = 0; i < pot.length; i++) {
      strings[pot[i].getAttribute("data-k")] = pot[i].textContent.trim();
    }
    /* Chaque scene a son bandeau : celui du CBCT disparait avec sa scene
       quand on bascule sur l'IOS. On ecrit dans tous. */
    var statusEls = fig.querySelectorAll(".v3d-status");
    function say(t) {
      for (var k = 0; k < statusEls.length; k++) { statusEls[k].textContent = t || ""; }
    }
    var MS = 2300;

    function setup(name, payload, tint) {
      var st = fig.querySelector('[data-scene="' + name + '"]');
      if (!payload || !st) { return null; }
      var sc = new window.Scene3D(st, payload, {
        onFrame: function (dt) { return mode === name ? frame(dt) : false; }
      });
      if (!sc.ok) { return null; }
      sc.parts.forEach(function (p) {
        var c = tint(p.code);
        p.color = [c[0] / 255, c[1] / 255, c[2] / 255];
        p.alpha = c[3];
        p.pickable = false;
      });
      current[name] = ID;
      return sc;
    }

    scenes.cbct = setup("cbct", window.ASO_SCENE, function (code) {
      return code === "CB" ? [BASE[0], BASE[1], BASE[2], 0.72] : [SKULL[0], SKULL[1], SKULL[2], 0.5];
    });
    scenes.ios = setup("ios", window.ASO_IOS_SCENE, function (code) {
      return code === "GOLD" ? [GOLD[0], GOLD[1], GOLD[2], 0.26] : [GREY[0], GREY[1], GREY[2], 1];
    });
    /* Une teinte par dent, prete pour l'acte de segmentation. */
    if (scenes.ios) {
      var tl = (window.ASO_IOS_SCENE || {}).teeth || [];
      scenes.ios.parts.forEach(function (p) {
        var k = tl.indexOf(p.code);
        p.seg = k < 0 ? null : hue(k, tl.length);
      });
    }
    if (!scenes.cbct && !scenes.ios) { return; }
    fig.classList.add("v3d-on");

    function target(name) {
      if (name === "ios") { return new Float32Array(window.ASO_IOS_SCENE.matrix || ID); }
      var d = window.ASO_SCENE, m = ID;
      (d.stages || []).forEach(function (st) { m = mul(new Float32Array(st.m), m); });
      return m;
    }

    function start(name) {
      mode = name;
      var bs = fig.querySelectorAll("[data-mode]"), i;
      for (i = 0; i < bs.length; i++) {
        bs[i].setAttribute("aria-pressed", bs[i].getAttribute("data-mode") === name ? "true" : "false");
      }
      fig.setAttribute("data-active", name);
      /* Cote CBCT, le pipeline complet : ALI place les reperes, puis ASO
         oriente. Cote IOS ce sont les dents segmentees qui jouent ce role,
         et elles sont deja la. */
      var ags = name === "cbct" ? ((window.ASO_SCENE || {}).agents || {}) : {};
      var tl = name === "ios" ? ((window.ASO_IOS_SCENE || {}).teeth || []) : [];
      var first = Object.keys(ags).length ? "ali" : (tl.length ? "seg" : "orient");
      run = { t: 0, m: target(name), act: first, ags: ags, teeth: tl, lit: 0 };
      current[name] = ID;
      fig.classList.add("v3d-sim");
      var sc = scenes[name];
      if (sc) { sc.dirty = true; sc.kick(); }
    }

    function frame(dt) {
      var sc = scenes[mode];
      if (!run || !sc) { return false; }
      run.t += dt;
      if (run.act === "ali") {
        var f = Math.min(1, run.t / WALK_MS);
        var gm = ((window.ASO_SCENE || {}).gold || []).map(function (g) {
          return { p: g.p, c: [GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255], s: 0.017 };
        });
        sc.setMarks(walkMarks(run.ags, f).concat(gm));
        say(strings.placing || "");
        if (run.t >= WALK_MS + 500) { run.act = "orient"; run.t = 0; }
        return true;
      }
      if (run.act === "seg") {
        run.lit = Math.min(run.teeth.length,
                           Math.floor(run.t / (SEG_MS / run.teeth.length)) + 1);
        say((strings.seg || "") + " " + run.lit + "/" + run.teeth.length);
        paint();
        if (run.t >= SEG_MS + 350) { run.act = "cent"; run.t = 0; }
        return true;
      }
      if (run.act === "cent") {
        say(strings.centroids || "");
        paint();
        if (run.t >= CENT_MS + 350) { run.act = "orient"; run.t = 0; }
        return true;
      }
      var t = Math.min(1, run.t / MS);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      current[mode] = partial(run.m, e);
      paint();
      if (t >= 1 && run.t > MS + 900) { run = null; fig.classList.remove("v3d-sim"); return false; }
      return true;
    }

    function paint() {
      var sc = scenes[mode], m = current[mode] || ID;
      if (!sc) { return; }
      var marks = [];
      if (mode === "ios") {
        var d = window.ASO_IOS_SCENE;
        var act = run ? run.act : "done";
        /* Tout ce qui n'est pas le gold appartient au patient et bouge
           ensemble. L'ancienne piece unique « ARCH » n'existe plus depuis
           que l'arcade est decoupee dent par dent. */
        sc.parts.forEach(function (pp) {
          if (pp.code === "GOLD") { return; }
          pp.xform = m;
          var kk = (d.teeth || []).indexOf(pp.code);
          var lit = act === "seg" ? (kk >= 0 && kk < run.lit) : true;
          var cc = (lit && pp.seg) ? pp.seg : GREY;
          pp.color = [cc[0] / 255, cc[1] / 255, cc[2] / 255];
        });
        if (act === "seg") { sc.setMarks([]); return; }
        Object.keys(d.centroids || {}).forEach(function (kk) {
          marks.push({ p: apply(m, d.centroids[kk]),
                       c: [PATIENT[0] / 255, PATIENT[1] / 255, PATIENT[2] / 255], s: 0.013 });
        });
        if (act === "cent") { sc.setMarks(marks); return; }
        var sum = 0;
        (d.shared || []).forEach(function (k) {
          var a = apply(m, d.patient[k]), g = d.gold[k];
          marks.push({ p: g, c: [GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255], s: 0.010 });
          marks.push({ p: a, c: [PATIENT[0] / 255, PATIENT[1] / 255, PATIENT[2] / 255], s: 0.008 });
          var v = [a[0] - g[0], a[1] - g[1], a[2] - g[2]];
          sum += Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        });
        /* L'ecart n'est affiche que du cote IOS : la, le gold est une arcade
           et les reperes portent les memes etiquettes dent par dent. Sur le
           CBCT c'est un autre patient, le chiffre ne voudrait rien dire. */
        var r = (d.shared || []).length ? sum / d.shared.length * (d.span || 1) : null;
        say(r == null ? "" : (strings.gap || "") + " " + r.toFixed(2) + " mm");
      } else {
        var c = window.ASO_SCENE;
        sc.parts.forEach(function (p) { p.xform = m; });
        (c.gold || []).forEach(function (g) {
          marks.push({ p: g.p, c: [GOLD[0] / 255, GOLD[1] / 255, GOLD[2] / 255], s: 0.017 });
        });
        Object.keys(c.patient || {}).forEach(function (k) {
          marks.push({ p: apply(m, c.patient[k]),
                       c: [PATIENT[0] / 255, PATIENT[1] / 255, PATIENT[2] / 255], s: 0.013 });
        });
        say((strings.rotated || "") + " " + (c.totalDeg || 0).toFixed(2) + "\u00b0");
      }
      sc.setMarks(marks);
    }

    fig.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-mode]") : null;
      if (b) { e.preventDefault(); start(b.getAttribute("data-mode")); return; }
      if (e.target.closest && e.target.closest(".v3d-go")) { start(mode || "cbct"); }
    });

    var fired = false;
    function once() { if (!fired) { fired = true; start("cbct"); } }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { once(); }
      }, { rootMargin: "200px" }).observe(fig);
    }
    var bb = fig.getBoundingClientRect();
    if (bb.top < (window.innerHeight || 0) + 200 && bb.bottom > -200) { once(); }
    else if (!window.IntersectionObserver) { once(); }
  }

  function init() {
    var gd = document.querySelectorAll("[data-aso-guide]");
    for (var q = 0; q < gd.length; q++) {
      try { buildGuide(gd[q]); }
      catch (err) {
        if (window.console) { console.warn("scene ASO (guide) indisponible :", err); }
      }
    }
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
