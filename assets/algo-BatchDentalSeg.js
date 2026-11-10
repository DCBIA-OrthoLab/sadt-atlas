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
    txt(svg, X0 + budget * S, 166, "0.85 ×", "a-label", "middle");
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
    var X0 = 40, BW = 36, GAP = 16, BASE = 150, vals = [0.35, 0.8, 0.5, 0.9, 0.2, 0.62], n = vals.length, i;
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
})();
