/* aregios-3d.js — AREG_IOSCBCT : une arcade intra-orale sur un CBCT.

   Deux modalites qui n'ont rien en commun, un volume et une surface. La
   fiche resume l'appariement : « shared landmarks for the pre-alignment,
   then ICP onto a surface extracted from the CBCT by thresholding ».

   Trois choses que la scene doit rendre visibles :
   - la surface CBCT sort d'un seuil a 400, EN DUR dans le code, qui prend
     l'os et l'email sans les distinguer ;
   - les points sont apparies PAR ETIQUETTE, jamais par position -- apparier
     deux listes partielles par rang associerait des points sans rapport ;
   - le pre-alignement a deux garde-fous, au moins 3 paires et un residu RMS
     sous 10 mm, qui retombent tous deux sur l'identite.

   Le pre-alignement affiche est RECALCULE par aregios_mesh.py avec le meme
   vtkLandmarkTransform que le code, pas lu dans un fichier. */
(function () {
  "use strict";

  var BONE = [206, 200, 190];
  var ARCH = [232, 154, 92];
  var LM_IOS = [255, 176, 84];
  var LM_CB = [110, 230, 170];
  var STEPS = [
    { k: "surface", ms: 1400 },
    { k: "points",  ms: 1700 },
    { k: "pair",    ms: 1500 },
    { k: "align",   ms: 2400 },
    { k: "icp",     ms: 1300 }
  ];

  function ID() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }

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
  function apply(m, p) {
    return [m[0]*p[0] + m[4]*p[1] + m[8]*p[2] + m[12],
            m[1]*p[0] + m[5]*p[1] + m[9]*p[2] + m[13],
            m[2]*p[0] + m[6]*p[1] + m[10]*p[2] + m[14]];
  }

  function build(fig) {
    var data = window.AREGIOS_SCENE;
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
    function label(k) { return strings[k] || k; }

    var cbct = scene.byCode.CBCT;
    scene.parts.forEach(function (p) { p.pickable = false; });
    if (cbct) { cbct.color = [BONE[0]/255, BONE[1]/255, BONE[2]/255]; cbct.alpha = 0.55; }
    scene.parts.forEach(function (p) {
      if (p.code.indexOf("IOS_") !== 0) { return; }
      p.color = [ARCH[0]/255, ARCH[1]/255, ARCH[2]/255];
      p.alpha = 1;
    });

    var arches = data.arches || [];
    var run = null, current = ID(), active = arches[0] || null, fired = false;

    function pick(code) {
      for (var i = 0; i < arches.length; i++) {
        if (arches[i].code === code) { return arches[i]; }
      }
      return arches[0];
    }

    function show() {
      scene.parts.forEach(function (p) {
        if (p.code.indexOf("IOS_") !== 0) { return; }
        p.visible = active && p.code === "IOS_" + active.code;
      });
    }

    function chip(i) {
      var n = fig.querySelectorAll(".v3d-steps [data-step]");
      for (var j = 0; j < n.length; j++) {
        n[j].setAttribute("aria-current", j === i ? "true" : "false");
      }
    }

    function start(code) {
      if (code) { active = pick(code); }
      if (!active) { return; }
      var bs = fig.querySelectorAll("[data-arch]"), i;
      for (i = 0; i < bs.length; i++) {
        bs[i].setAttribute("aria-pressed",
          bs[i].getAttribute("data-arch") === active.code ? "true" : "false");
      }
      run = { i: 0, t: 0 };
      current = ID();
      show();
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    function seek(i) {
      if (!active || i == null || i < 0 || i >= STEPS.length) { return; }
      fired = true;
      run = { i: i, t: 0 };
      current = i >= 4 ? new Float32Array(active.m) : ID();
      show();
      fig.classList.add("v3d-sim");
      scene.dirty = true; scene.kick();
    }

    function frame(dt) {
      if (!run || !active) { return false; }
      var st = STEPS[run.i];
      if (!st) { run = null; fig.classList.remove("v3d-sim"); chip(-1); return false; }
      run.t += dt;
      var f = Math.min(1, run.t / st.ms);
      chip(run.i);

      var marks = [];
      if (st.k === "surface") {
        say(label("surface") + " " + (data.iso || 400));
        if (cbct) { cbct.alpha = 0.55 * f; }
        scene.parts.forEach(function (p) {
          if (p.code.indexOf("IOS_") === 0) { p.alpha = 1 - 0.9 * f; }
        });
      } else if (st.k === "points") {
        say(label("points"));
        if (cbct) { cbct.alpha = 0.55; }
        scene.parts.forEach(function (p) {
          if (p.code.indexOf("IOS_") === 0) { p.alpha = 0.1 + 0.9 * f; }
        });
        var keys = active.keys || [];
        var n = Math.max(1, Math.round(keys.length * f));
        keys.slice(0, n).forEach(function (k) {
          marks.push({ p: active.cbct[k], c: [LM_CB[0]/255, LM_CB[1]/255, LM_CB[2]/255], s: 0.015 });
          marks.push({ p: active.ios[k],  c: [LM_IOS[0]/255, LM_IOS[1]/255, LM_IOS[2]/255], s: 0.015 });
        });
      } else if (st.k === "pair") {
        /* Le point le plus important de la fiche : l'appariement se fait par
           NOM. On le montre en faisant pulser une paire apres l'autre. */
        var ks = active.keys || [];
        var idx = Math.min(ks.length - 1, Math.floor(f * ks.length));
        say(label("pair") + " " + ks[idx]);
        ks.forEach(function (k, j) {
          var hot = j === idx ? 0.024 : 0.012;
          marks.push({ p: active.cbct[k], c: [LM_CB[0]/255, LM_CB[1]/255, LM_CB[2]/255], s: hot });
          marks.push({ p: active.ios[k],  c: [LM_IOS[0]/255, LM_IOS[1]/255, LM_IOS[2]/255], s: hot });
        });
      } else if (st.k === "align") {
        var e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        current = partial(new Float32Array(active.m), e);
        var rms = active.before + (active.after - active.before) * e;
        say(label("align") + " — RMS " + rms.toFixed(2) + " mm");
        (active.keys || []).forEach(function (k) {
          marks.push({ p: active.cbct[k], c: [LM_CB[0]/255, LM_CB[1]/255, LM_CB[2]/255], s: 0.013 });
          marks.push({ p: apply(current, active.ios[k]),
                       c: [LM_IOS[0]/255, LM_IOS[1]/255, LM_IOS[2]/255], s: 0.011 });
        });
      } else {
        say(label("icp"));
        (active.keys || []).forEach(function (k) {
          marks.push({ p: active.cbct[k], c: [LM_CB[0]/255, LM_CB[1]/255, LM_CB[2]/255], s: 0.012 });
        });
      }

      scene.parts.forEach(function (p) {
        if (p.code.indexOf("IOS_") === 0) { p.xform = current; }
      });
      scene.setMarks(marks);
      if (run.t >= st.ms + 350) { run.i += 1; run.t = 0; }
      return true;
    }

    fig.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-arch]") : null;
      if (b) { e.preventDefault(); start(b.getAttribute("data-arch")); return; }
      if (e.target.closest && e.target.closest(".v3d-go")) { start(null); }
    });
    window.Scene3D.attachControls(fig, scene, seek);

    function once() { if (!fired) { fired = true; start(null); } }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { once(); }
      }, { rootMargin: "200px" }).observe(fig);
    }
    var bb = fig.getBoundingClientRect();
    if (bb.top < (window.innerHeight || 0) + 200 && bb.bottom > -200) { once(); }
    else if (!window.IntersectionObserver) { once(); }
    show();
    scene.kick();
  }

  function init() {
    var figs = document.querySelectorAll("[data-aregios]");
    for (var i = 0; i < figs.length; i++) {
      try { build(figs[i]); }
      catch (err) {
        if (window.console) { console.warn("scene AREG_IOSCBCT indisponible :", err); }
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
