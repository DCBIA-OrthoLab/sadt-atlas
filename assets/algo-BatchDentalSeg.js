/* algo-BatchDentalSeg.js : scenes de BatchDentalSeg (page atlas, VISOR et legacy). Aucun texte traduisible ici. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;

  /* 1. Rognage automatique : seuil d'air, boite englobante, marge, test de gain */
  A.scenes.bds_crop = function (svg) {
    var GX = 16, GY = 10, C = 15, OX = 20, OY = 14, i, j;
    function inHead(x, y) { return Math.pow(x - 6.4, 2) / 12 + Math.pow(y - 4.6, 2) / 11 < 1; }
    var cells = [], x0 = 99, x1 = -1, y0 = 99, y1 = -1;
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) {
      var on = inHead(i, j);
      cells.push({ on: on, r: E("rect", { "class": "a-cell", x: OX + i * C, y: OY + j * C, width: C - 1, height: C - 1 }, svg) });
      if (on) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
    } }
    var M = 1;                                   /* la marge de 15 mm, en cases */
    var tight = E("rect", { "class": "a-dash", x: OX + x0 * C - 1, y: OY + y0 * C - 1, width: (x1 - x0 + 1) * C + 1, height: (y1 - y0 + 1) * C + 1, fill: "none", opacity: 0 }, svg);
    var bx0 = Math.max(0, x0 - M), bx1 = Math.min(GX - 1, x1 + M), by0 = Math.max(0, y0 - M), by1 = Math.min(GY - 1, y1 + M);
    var box = E("rect", { "class": "a-acc-s", x: OX + bx0 * C - 1, y: OY + by0 * C - 1, width: (bx1 - bx0 + 1) * C + 1, height: (by1 - by0 + 1) * C + 1, fill: "none", opacity: 0 }, svg);
    var kept = Math.round(100 * ((bx1 - bx0 + 1) * (by1 - by0 + 1)) / (GX * GY));
    var lab = txt(svg, OX + GX * C + 10, OY + 20, "", "a-label-b");
    var lim = txt(svg, OX + GX * C + 10, OY + 38, "", "a-num");
    return function (t) {
      var a = ease(seg(t, 0.05, 0.25)), b = ease(seg(t, 0.3, 0.5)), c = ease(seg(t, 0.52, 0.72)), d = ease(seg(t, 0.75, 0.95));
      cells.forEach(function (c0, n) {
        var inside = (n % GX) >= bx0 && (n % GX) <= bx1 && Math.floor(n / GX) >= by0 && Math.floor(n / GX) <= by1;
        c0.r.setAttribute("class", c0.on && a > 0.5 ? "a-acc" : "a-cell");
        c0.r.setAttribute("opacity", inside ? 1 : 1 - 0.7 * d);
      });
      tight.setAttribute("opacity", b * (1 - c));
      box.setAttribute("opacity", c);
      lab.textContent = c > 0.5 ? kept + " %" : "";
      lim.textContent = c > 0.5 ? "≤ 85 %" : "";
    };
  };

  /* 2. Garde memoire : estimation du pic, comparee au budget */
  A.scenes.bds_memory = function (svg) {
    var X0 = 30, L = 260, rows = [
      { y: 40, parts: [60, 26, 14, 14], total: 114 },
      { y: 100, parts: [110, 44, 26, 14], total: 194 }
    ];
    var budget = 150, S = L / 220, cls = ["a-acc", "a-ana", "a-nlp", "a-soft"], k;
    var bars = [];
    rows.forEach(function (row) {
      E("line", { "class": "a-cell", x1: X0, x2: X0 + L, y1: row.y + 30, y2: row.y + 30 }, svg);
      var rs = [], x = X0;
      row.parts.forEach(function (p, n) {
        var r = E("rect", { "class": cls[n], x: x, y: row.y, width: 0, height: 24 }, svg); r.setAttribute("fill-opacity", n === 3 ? 0.3 : 0.9);
        rs.push({ r: r, x: x, w: p * S, cum: row.parts.slice(0, n).reduce(function (a, b) { return a + b; }, 0) }); x += p * S;
      });
      var v = txt(svg, X0 + row.total * S + 6, row.y + 17, "", "a-label-b");
      bars.push({ rs: rs, v: v, row: row });
    });
    var bl = E("line", { "class": "a-dash", x1: X0 + budget * S, x2: X0 + budget * S, y1: 18, y2: 150 }, svg);
    txt(svg, X0 + budget * S, 166, "0.85", "a-label", "middle");
    return function (t) {
      bars.forEach(function (b, n) {
        var u = ease(seg(t, 0.05 + n * 0.25, 0.5 + n * 0.25)), tot = b.row.total;
        b.rs.forEach(function (p, m) {
          var shown = Math.max(0, Math.min(1, (u * tot - p.cum) / (b.row.parts[m])));
          p.r.setAttribute("width", Math.max(0, shown * p.w));
        });
        var done = u > 0.99, ok = tot <= budget;
        b.v.textContent = done ? (ok ? "✓" : "×") : "";
        b.v.setAttribute("x", X0 + tot * S + 6);
      });
    };
  };

  /* 3. Correction du miroir : le plan sagittal passe par les incisives centrales */
  A.scenes.bds_mirror = function (svg) {
    var X0 = 24, DX = 38, Y = 92, n = 8, i, xs = [], plane;
    for (i = 0; i < n; i++) { xs.push(X0 + (i + 0.5) * DX); }
    plane = (xs[3] + xs[4]) / 2;
    E("path", { "class": "a-cell", d: "M" + X0 + " " + (Y + 40) + " Q" + (X0 + n * DX / 2) + " " + (Y - 70) + " " + (X0 + n * DX) + " " + (Y + 40), fill: "none" }, svg);
    var side = [0, 0, 0, 0, 1, 1, 1, 1], wrong = { 1: true, 6: true };
    var dots = [], rings = [];
    var ys = [58, 40, 30, 24, 24, 30, 40, 58];
    for (i = 0; i < n; i++) {
      var cls = side[i] === 0 ? "a-acc" : "a-ana";
      var col = wrong[i] ? (side[i] === 0 ? "a-ana" : "a-acc") : cls;       /* etiquette portee par la dent */
      dots.push({ el: E("circle", { "class": col, cx: xs[i], cy: ys[i] + 40, r: 9 }, svg), good: cls, bad: col, w: !!wrong[i] });
      rings.push(E("circle", { "class": "a-ink", cx: xs[i], cy: ys[i] + 40, r: 13, fill: "none", opacity: 0 }, svg));
    }
    var pl = E("line", { "class": "a-ink", x1: plane, x2: plane, y1: 18, y2: 170, opacity: 0 }, svg);
    var inc = [3, 4].map(function (k) { return E("circle", { "class": "a-soft", cx: xs[k], cy: ys[k] + 40, r: 3, opacity: 0 }, svg); });
    return function (t) {
      var a = ease(seg(t, 0.08, 0.35)), b = ease(seg(t, 0.55, 0.8));
      pl.setAttribute("opacity", a); inc.forEach(function (c) { c.setAttribute("opacity", a); });
      dots.forEach(function (d, k) {
        d.el.setAttribute("class", d.w && b > 0.5 ? d.good : d.bad);
        rings[k].setAttribute("opacity", d.w ? 0.8 * a * (b > 0.5 ? 1 - b : 1) : 0);
      });
    };
  };

  /* 4. Argmax par classe : on garde la meilleure valeur et son indice au fil des classes */
  A.scenes.bds_argmax = function (svg) {
    var X0 = 40, BW = 30, GAP = 12, BASE = 150, vals = [0.35, 0.8, 0.5, 0.9, 0.2, 0.62], n = vals.length, i;
    var bars = [], best = E("rect", { "class": "a-acc-s", rx: 3, fill: "none", opacity: 0 }, svg);
    for (i = 0; i < n; i++) {
      var r = E("rect", { "class": "a-soft", x: X0 + i * (BW + GAP), width: BW, rx: 2 }, svg); r.setAttribute("fill-opacity", 0.25);
      r.setAttribute("height", vals[i] * 100); r.setAttribute("y", BASE - vals[i] * 100); bars.push(r);
      txt(svg, X0 + i * (BW + GAP) + BW / 2, BASE + 16, String(i), "a-label-b", "middle");
    }
    E("line", { "class": "a-ink", x1: X0 - 8, x2: X0 + n * (BW + GAP) - GAP + 8, y1: BASE, y2: BASE }, svg);
    var run = E("line", { "class": "a-dash", x1: X0 - 8, x2: X0 + n * (BW + GAP) - GAP + 8 }, svg);
    var out = txt(svg, 160, 22, "", "a-label-b", "middle");
    return function (t) {
      var s = Math.min(n - 1, Math.floor(seg(t, 0.05, 0.85) * n * 0.9999)), b = 0, k;
      for (k = 1; k <= s; k++) { if (vals[k] > vals[b]) { b = k; } }
      for (k = 0; k < n; k++) { bars[k].setAttribute("fill-opacity", k === s ? 0.8 : (k < s ? 0.45 : 0.2)); bars[k].setAttribute("class", k === b ? "a-acc" : "a-soft"); }
      var x = X0 + b * (BW + GAP);
      best.setAttribute("x", x - 3); best.setAttribute("y", BASE - vals[b] * 100 - 3); best.setAttribute("width", BW + 6); best.setAttribute("height", vals[b] * 100 + 6); best.setAttribute("opacity", 1);
      var yy = BASE - vals[b] * 100; run.setAttribute("y1", yy); run.setAttribute("y2", yy);
      out.textContent = String(b);
    };
  };
  /* 5. Normalisation nnU-Net (copie des scenes d'AMASSS, pour ne pas en dependre) :
        ecreter a deux percentiles, retrancher une moyenne, diviser par un ecart type.
        Histogramme, moyenne et ecart type sont dessines, pas calcules. */
  A.scenes.bds_norm = function (svg) {
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
        var hh = h[k], edge = k < lo || k > hi;
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

  /* 6. Fenetre glissante : fenetres qui se recouvrent d'au moins la moitie, poids gaussiens ;
        la courbe noire est la SOMME des poids (le denominateur), pas p(x). */
  A.scenes.bds_window = function (svg) {
    var X0 = 20, L = 280, T = 140, STEP = 70, BASE = 150, TOP = 56, sigma = T / 8, i;
    var starts = [0, 70, 140];
    E("rect", { "class": "a-cell", x: X0, y: 22, width: L, height: 18, fill: "none" }, svg);
    var tiles = [], bells = [], cls = ["a-acc-s", "a-ana-s", "a-nlp-s"], fl = ["a-acc", "a-ana", "a-nlp"];
    starts.forEach(function (s, n) {
      tiles.push(E("rect", { "class": cls[n], x: X0 + s, y: 20, width: T, height: 22, rx: 2, opacity: 0 }, svg));
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

  /* 7. Interpolation : une courbe lisse (Catmull-Rom, pour figurer le spline cubique) contre
        des segments droits entre les 7 memes echantillons. */
  A.scenes.bds_interp = function (svg) {
    var X0 = 24, DX = 38, BASE = 150, ys = [60, 36, 74, 30, 66, 44, 52], n = ys.length, i;
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
})();
