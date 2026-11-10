/* algo-AMASSS.js : scenes de AMASSS (page atlas, VISOR et legacy). Aucun texte traduisible ici. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;

  /* 1. Normalisation nnU-Net : ecreter a deux percentiles, retrancher la moyenne, diviser par l'ecart type */
  A.scenes.amasss_norm = function (svg) {
    var N = 40, W = 280, X0 = 20, BASE = 150, bw = W / N, i, lo = 4, hi = 35;
    var h = [];
    for (i = 0; i < N; i++) { h[i] = 100 * Math.exp(-Math.pow((i - 17) / 8, 2)) + 24 * Math.exp(-Math.pow((i - 32) / 3, 2)) + 6; }
    var mu = 17.5, sg = 8;                      /* position de la moyenne et de l'ecart type, en barres */
    var bars = [], g = E("g", {}, svg);
    for (i = 0; i < N; i++) { bars[i] = E("rect", { "class": "a-acc", width: bw - 1.2 }, g); }
    var lL = E("line", { "class": "a-dash", y1: 24, y2: BASE }, svg), lR = E("line", { "class": "a-dash", y1: 24, y2: BASE }, svg);
    var axis = E("line", { "class": "a-ink", x1: X0, x2: X0 + W, y1: BASE, y2: BASE }, svg);
    var zero = E("line", { "class": "a-ink", y1: BASE - 6, y2: BASE + 6 }, svg);
    var tz = txt(svg, 0, 168, "0", "a-label-b", "middle");
    var tl = txt(svg, 0, 168, "p0.5", "a-label", "middle"), tr = txt(svg, 0, 168, "p99.5", "a-label", "middle");
    function px(k) { return X0 + k * bw; }
    return function (t) {
      var a = ease(seg(t, 0.05, 0.4)), b = ease(seg(t, 0.55, 0.95));
      for (var k = 0; k < N; k++) {
        var kk = Math.min(hi, Math.max(lo, k));                          /* ecretage : on ramene sur la borne */
        var cx = lerp(k, kk, a);
        var z = (cx - mu) / sg;                                          /* puis (x - moyenne) / ecart type */
        var X = lerp(px(cx), 160 + z * 36, b);
        var hh = h[k] * (1 - 0.0 * a), edge = k < lo || k > hi;
        var op = edge ? 1 - 0.7 * a : 1;
        bars[k].setAttribute("x", X); bars[k].setAttribute("width", Math.max(1, bw - 1.2));
        bars[k].setAttribute("height", hh); bars[k].setAttribute("y", BASE - hh); bars[k].setAttribute("opacity", op);
      }
      var xl = lerp(px(lo), 160 + (lo - mu) / sg * 36, b), xr = lerp(px(hi), 160 + (hi - mu) / sg * 36, b);
      lL.setAttribute("x1", xl); lL.setAttribute("x2", xl); lR.setAttribute("x1", xr); lR.setAttribute("x2", xr);
      tl.setAttribute("x", xl); tr.setAttribute("x", xr);
      var zx = lerp(px(mu), 160, b);
      zero.setAttribute("x1", zx); zero.setAttribute("x2", zx); tz.setAttribute("x", zx); tz.setAttribute("opacity", b);
    };
  };

  /* 2. Fenetre glissante : trois fenetres decalees de la moitie, ponderees par une gaussienne.
     La courbe noire du bas est la SOMME des poids (le denominateur de la formule), pas le score final. */
  A.scenes.amasss_window = function (svg) {
    var X0 = 20, L = 280, T = 140, STEP = 70, BASE = 150, TOP = 56, sigma = T / 8, i;
    var starts = [0, 70, 140];
    E("rect", { "class": "a-cell", x: X0, y: 22, width: L, height: 18, fill: "none" }, svg);
    var tiles = [], bells = [], cls = ["a-acc-s", "a-ana-s", "a-nlp-s"], fl = ["a-acc", "a-ana", "a-nlp"];
    starts.forEach(function (s, n) {
      tiles.push(E("rect", { "class": cls[n], x: X0 + s, y: 20 + n * 0.0, width: T, height: 22, rx: 2, opacity: 0 }, svg));
      var d = "M" + (X0 + s) + " " + BASE;
      for (i = 0; i <= 28; i++) {
        var x = i / 28 * T, g = Math.exp(-Math.pow(x - T / 2, 2) / (2 * sigma * sigma));
        d += " L" + (X0 + s + x).toFixed(1) + " " + (BASE - 70 * g).toFixed(1);
      }
      d += " L" + (X0 + s + T) + " " + BASE + " Z";
      var b = E("path", { "class": fl[n], d: d, opacity: 0 }, svg); b.setAttribute("fill-opacity", 0.45);
      bells.push(b);
    });
    E("line", { "class": "a-ink", x1: X0, x2: X0 + L, y1: BASE, y2: BASE }, svg);
    var sumPath = E("path", { "class": "a-ink", fill: "none" }, svg);
    var d2 = "";
    for (i = 0; i <= 70; i++) {
      var x2 = i / 70 * L, s2 = 0;
      starts.forEach(function (s) { if (x2 >= s && x2 <= s + T) { s2 += Math.exp(-Math.pow(x2 - s - T / 2, 2) / (2 * sigma * sigma)); } });
      d2 += (i ? " L" : "M") + (X0 + x2).toFixed(1) + " " + (BASE + 10 - 30 * Math.min(1.3, s2)).toFixed(1);
    }
    sumPath.setAttribute("d", d2); sumPath.setAttribute("opacity", 0);
    txt(svg, X0, 172, "scan", "a-label");
    return function (t) {
      starts.forEach(function (s, n) {
        var u = ease(seg(t, 0.08 + n * 0.22, 0.26 + n * 0.22));
        tiles[n].setAttribute("opacity", u);
        bells[n].setAttribute("opacity", u);
      });
      sumPath.setAttribute("opacity", ease(seg(t, 0.78, 0.95)));
    };
  };

  /* 3. Fusion des masques : un masque plus tard dans l'ordre ecrase le precedent sur les voxels communs */
  A.scenes.amasss_merge = function (svg) {
    var GX = 12, GY = 7, C = 17, OX = 16, OY = 18, i, j;
    function inA(x, y) { return Math.pow(x - 4.5, 2) / 14 + Math.pow(y - 3, 2) / 9 < 1; }
    function inB(x, y) { return Math.pow(x - 7, 2) / 12 + Math.pow(y - 3, 2) / 8 < 1; }
    function inC(x, y) { return Math.pow(x - 6, 2) / 7 + Math.pow(y - 2.2, 2) / 3 < 1; }
    var cells = [];
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) {
      cells.push({ r: E("rect", { "class": "a-cell", x: OX + i * C, y: OY + j * C, width: C - 1, height: C - 1 }, svg), a: inA(i, j), b: inB(i, j), c: inC(i, j) });
    } }
    var sw = [["a-acc", 0], ["a-ana", 1], ["a-nlp", 2]];
    sw.forEach(function (s, n) { E("rect", { "class": s[0], x: 240, y: 30 + n * 28, width: 16, height: 16 }, svg); });
    var ptr = E("path", { "class": "a-ink", d: "M262 38 h8 M262 66 h8 M262 94 h8" }, svg);
    var tx = [txt(svg, 275, 42, "1", "a-label-b"), txt(svg, 275, 70, "2", "a-label-b"), txt(svg, 275, 98, "3", "a-label-b")];
    var hl = E("rect", { "class": "a-acc-s", x: 236, y: 26, width: 24, height: 24, fill: "none" }, svg);
    txt(svg, 238, 130, "order", "a-label");
    return function (t) {
      var step = t < 0.3 ? 0 : (t < 0.62 ? 1 : 2);
      if (t < 0.08) { step = -1; }
      hl.setAttribute("y", 26 + Math.max(0, step) * 28); hl.setAttribute("opacity", step < 0 ? 0 : 1);
      cells.forEach(function (c) {
        var k = "a-cell";
        if (step >= 0 && c.a) { k = "a-acc"; }
        if (step >= 1 && c.b) { k = "a-ana"; }
        if (step >= 2 && c.c) { k = "a-nlp"; }
        c.r.setAttribute("class", k);
      });
      tx.forEach(function (n, k) { n.setAttribute("opacity", k <= step ? 1 : 0.4); });
    };
  };

  /* 4. Interpolation : cubique contre lineaire entre les memes six echantillons (valeurs inventees) */
  A.scenes.amasss_interp = function (svg) {
    var X0 = 24, DX = 38, BASE = 150, ys = [60, 36, 74, 30, 66, 44], n = ys.length, i;
    function Y(k) { return BASE - ys[k] * 1.1; }
    function cat(k, u) {                       /* Catmull-Rom entre k et k+1 */
      var p0 = Y(Math.max(0, k - 1)), p1 = Y(k), p2 = Y(k + 1), p3 = Y(Math.min(n - 1, k + 2));
      return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
    }
    var dc = "", dl = "";
    for (i = 0; i < n - 1; i++) { for (var s = 0; s <= 12; s++) { dc += (dc ? " L" : "M") + (X0 + (i + s / 12) * DX).toFixed(1) + " " + cat(i, s / 12).toFixed(1); } }
    for (i = 0; i < n; i++) { dl += (i ? " L" : "M") + (X0 + i * DX) + " " + Y(i); }
    E("line", { "class": "a-ink", x1: X0 - 8, x2: X0 + (n - 1) * DX + 8, y1: BASE, y2: BASE }, svg);
    var pc = E("path", { "class": "a-ink", d: dc, fill: "none" }, svg);
    var pl = E("path", { "class": "a-acc-s", d: dl, fill: "none" }, svg);
    for (i = 0; i < n; i++) { E("circle", { "class": "a-soft", cx: X0 + i * DX, cy: Y(i), r: 3 }, svg); }
    var mk = E("line", { "class": "a-dash", y1: 20, y2: BASE }, svg);
    var q = E("circle", { "class": "a-seg", r: 4 }, svg), r = E("circle", { "class": "a-nlp", r: 4 }, svg);
    return function (t) {
      var a = ease(seg(t, 0.05, 0.4)), b = ease(seg(t, 0.45, 0.8));
      pc.setAttribute("opacity", 1 - 0.55 * b); pl.setAttribute("opacity", b);
      var pos = 2.4 + 0.3 * Math.sin(t * 3), k = Math.floor(pos), u = pos - k, x = X0 + pos * DX;
      mk.setAttribute("x1", x); mk.setAttribute("x2", x); mk.setAttribute("opacity", a);
      q.setAttribute("cx", x); q.setAttribute("cy", cat(k, u)); q.setAttribute("opacity", a);
      r.setAttribute("cx", x); r.setAttribute("cy", lerp(Y(k), Y(k + 1), u)); r.setAttribute("opacity", b);
    };
  };

  /* 5. Surface : isocontour d'un masque binaire (ici un contour 2D invente), lissage, puis decimation.
     Sans decimation (data-decim="0", legacy) : contour puis lissage seulement. */
  A.scenes.amasss_surface = function (svg, fig) {
    var dec = !(fig && fig.getAttribute && fig.getAttribute("data-decim") === "0");
    var GX = 12, GY = 9, C = 15, OX = 16, OY = 12, i, j;
    function ins(x, y) { return Math.pow(x - 5.5, 2) / 14 + Math.pow(y - 4, 2) / 8 < 1; }
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) {
      var r = E("rect", { "class": ins(i, j) ? "a-soft" : "a-cell", x: OX + i * C, y: OY + j * C, width: C - 1, height: C - 1 }, svg);
      if (ins(i, j)) { r.setAttribute("fill-opacity", 0.22); }
    } }
    var M = 40, smooth = [], rough = [], k;
    for (k = 0; k < M; k++) {
      var a = k / M * 2 * Math.PI, wob = 1 + 0.08 * Math.sin(3 * a), sgn = k % 2 ? 1 : -1;
      var px = OX + 5.5 * C + 4.1 * C * wob * Math.cos(a) + C / 2, py = OY + 4 * C + 2.9 * C * wob * Math.sin(a) + C / 2;
      smooth.push([px, py]);
      rough.push([px + sgn * 5 * Math.cos(a), py + sgn * 5 * Math.sin(a)]);   /* contour en escalier, avant lissage */
    }
    var poly = E("polyline", { "class": "a-acc-s", fill: "none", "stroke-linejoin": "round" }, svg);
    var dots = smooth.map(function (p) { return E("circle", { "class": "a-acc", cx: p[0], cy: p[1], r: 2 }, svg); });
    txt(svg, 236, 60, dec ? "0.5" : "1", "a-label-b"); if (dec) { txt(svg, 236, 130, "90 %", "a-label-b"); }
    return function (t) {
      var a = ease(seg(t, 0.05, 0.3)), sm = ease(seg(t, 0.35, 0.6)), d = dec ? ease(seg(t, 0.65, 0.95)) : 0;
      var list = [];
      smooth.forEach(function (p, n) {
        var thr = (n % 10) / 10;                  /* decimation : les sommets s'eteignent un a un, un sur dix reste */
        var on = n % 10 === 0 || thr > d;
        var q = [lerp(rough[n][0], p[0], sm), lerp(rough[n][1], p[1], sm)];
        dots[n].setAttribute("cx", q[0]); dots[n].setAttribute("cy", q[1]);
        dots[n].setAttribute("opacity", a * (on ? 1 : 0));
        if (on) { list.push(q); }
      });
      poly.setAttribute("points", list.concat([list[0]]).map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "));
      poly.setAttribute("opacity", a);
    };
  };

  /* 6. Largeur : S structures, W canaux (data-w sur la figure, 3 par defaut) */
  A.scenes.amasss_width = function (svg, fig) {
    var W = 3;
    if (fig && fig.getAttribute) { W = parseInt(fig.getAttribute("data-w") || "3", 10) || 3; }
    var names = ["MAND", "MAX", "CB", "CV", "UAW"], dur = [0.30, 0.22, 0.26, 0.18, 0.2], S = names.length, X0 = 56, L = 250, LH = 26, i;
    var free = [], placed = [];
    for (i = 0; i < W; i++) { free.push(0); }
    var total = 0;
    dur.forEach(function (d, n) {
      var lane = 0; for (i = 1; i < W; i++) { if (free[i] < free[lane]) { lane = i; } }
      placed.push({ lane: lane, s: free[lane], d: d }); free[lane] += d; total = Math.max(total, free[lane]);
    });
    var sc = L / total, top = 24, bars = [], loads = [], labs = [], LOAD = 0.06;   /* LOAD : duree inventee du chargement du modele */
    for (i = 0; i < W; i++) { E("line", { "class": "a-cell", x1: X0, x2: X0 + L, y1: top + i * LH + LH, y2: top + i * LH + LH }, svg); txt(svg, X0 - 8, top + i * LH + 17, String(i + 1), "a-num", "end"); }
    var fl = ["a-acc", "a-ana", "a-lmk", "a-nlp", "a-soft"];
    placed.forEach(function (p, n) {
      var ld = E("rect", { "class": fl[n % 5], x: X0 + p.s * sc, y: top + p.lane * LH + 3, width: 0, height: LH - 8, rx: 2, "fill-opacity": 0.3 }, svg);
      loads.push(ld);
      var r = E("rect", { "class": fl[n % 5], x: X0 + (p.s + LOAD) * sc, y: top + p.lane * LH + 3, width: 0, height: LH - 8, rx: 2 }, svg);
      bars.push(r);
      var l = txt(svg, X0 + (p.s + LOAD) * sc + 4, top + p.lane * LH + 17, names[n], "a-label-b"); l.setAttribute("opacity", 0); labs.push(l);
    });
    var cur = E("line", { "class": "a-dash", y1: top - 6, y2: top + W * LH + 4 }, svg);
    return function (t) {
      var T = t * total * 1.02;
      cur.setAttribute("x1", X0 + Math.min(T, total) * sc); cur.setAttribute("x2", X0 + Math.min(T, total) * sc);
      placed.forEach(function (p, n) {
        var wl = Math.max(0, Math.min(LOAD, T - p.s)) * sc;                 /* chargement du modele (pale) */
        var w = Math.max(0, Math.min(p.d - LOAD, T - p.s - LOAD)) * sc;     /* puis application a chaque scan (plein) */
        loads[n].setAttribute("width", wl);
        bars[n].setAttribute("width", w); labs[n].setAttribute("opacity", w > 28 ? 1 : 0);
      });
    };
  };
})();
