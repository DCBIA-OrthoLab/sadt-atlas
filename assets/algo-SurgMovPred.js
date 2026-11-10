/* algo-SurgMovPred.js : scenes du module SurgMovPred (pages atlas VISOR et legacy).
   Aucune chaine traduisible ici : seulement des nombres et des symboles. */
(function () {
  "use strict";
  var A = window.Algo;
  if (!A) { return; }
  var E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;

  /* 1. Standardisation : quatre mesures d'echelles differentes sont ramenees sur le meme axe */
  A.scenes.smp_scale = function (svg) {
    /* chaque ligne : intervalle de depart [a, b] en pixels, position de la moyenne et de la valeur (0..1 dans cet intervalle), ecart-type en fraction */
    var rows = [
      { a: 30, b: 150, mu: 0.45, x: 0.78, sd: 0.2 },
      { a: 110, b: 300, mu: 0.6, x: 0.35, sd: 0.15 },
      { a: 60, b: 230, mu: 0.3, x: 0.55, sd: 0.25 },
      { a: 20, b: 110, mu: 0.5, x: 0.9, sd: 0.18 }
    ];
    var Y0 = 36, DY = 36, CX = 160, UNIT = 38, i;
    var els = [];
    E("line", { "class": "a-dash", x1: CX, x2: CX, y1: 14, y2: 178 }, svg);
    rows.forEach(function (r, k) {
      var y = Y0 + k * DY;
      var axis = E("line", { "class": "a-ink", y1: y, y2: y }, svg);
      var tick = E("path", { "class": "a-nlp-s" }, svg);
      var dot = E("circle", { "class": "a-acc", r: 5, cy: y }, svg);
      els.push({ axis: axis, tick: tick, dot: dot, y: y });
    });
    return function (t) {
      var u = ease(seg(t, 0.3, 0.8));
      rows.forEach(function (r, k) {
        var e = els[k], span = r.b - r.a;
        var bx0 = r.a, bx1 = r.b, bmu = r.a + r.mu * span, bx = r.a + r.x * span;
        var z = (r.x - r.mu) / r.sd;
        var ax0 = CX - 3 * UNIT, ax1 = CX + 3 * UNIT, amu = CX, ax = CX + z * UNIT;
        e.axis.setAttribute("x1", lerp(bx0, ax0, u)); e.axis.setAttribute("x2", lerp(bx1, ax1, u));
        var m = lerp(bmu, amu, u);
        e.tick.setAttribute("d", "M" + m + " " + (e.y - 8) + " V" + (e.y + 8));
        e.dot.setAttribute("cx", lerp(bx, ax, u));
      });
    };
  };

  /* 2. L'empilement : trois estimations de base, combinees par une regression lineaire */
  A.scenes.smp_stack = function (svg) {
    var f = [0.62, 0.45, 0.7], w = [0.5, 0.2, 0.35], cls = ["a-seg", "a-ana", "a-nlp"], BASE = 160, H = 130, BW = 34, XS = [34, 84, 134], i;
    E("line", { "class": "a-ink", x1: 20, x2: 300, y1: BASE, y2: BASE }, svg);
    var bars = [], parts = [];
    for (i = 0; i < 3; i++) {
      bars.push(E("rect", { "class": cls[i], x: XS[i], width: BW, rx: 2 }, svg));
      parts.push(E("rect", { "class": cls[i], x: 236, width: BW, rx: 1 }, svg));
    }
    E("path", { "class": "a-ink", d: "M184 112 H214 M208 107 L214 112 L208 117" }, svg);
    var tot = E("line", { "class": "a-acc-s", x1: 226, x2: 282 }, svg);
    return function (t) {
      var a = ease(seg(t, 0.05, 0.35)), b = ease(seg(t, 0.5, 0.9)), acc = 0, i2;
      for (i2 = 0; i2 < 3; i2++) {
        var h = H * f[i2] * a;
        bars[i2].setAttribute("height", h); bars[i2].setAttribute("y", BASE - h);
        bars[i2].setAttribute("fill-opacity", lerp(1, 0.4, b));
        var ph = H * w[i2] * f[i2] * b;
        parts[i2].setAttribute("height", ph); parts[i2].setAttribute("y", BASE - acc - ph);
        acc += ph;
      }
      tot.setAttribute("y1", BASE - acc); tot.setAttribute("y2", BASE - acc); tot.setAttribute("opacity", b > 0.95 ? 1 : 0);
    };
  };

  /* 3. Une cible par paquet : 112 cases, 28 structures par 4 composantes, une a une */
  A.scenes.smp_targets = function (svg) {
    var COLS = 28, ROWS = 4, X0 = 14, CW = 10.2, CH = 22, Y0 = 52, i, cells = [], skipped = { 37: 1, 80: 1 };
    for (i = 0; i < COLS * ROWS; i++) {
      var col = Math.floor(i / ROWS), row = i % ROWS;
      cells.push(E("rect", { "class": "a-cell", x: X0 + col * CW, y: Y0 + row * (CH + 3), width: CW - 1.4, height: CH, rx: 1.5 }, svg));
    }
    var head = E("path", { "class": "a-acc", d: "M0 0 l-4 -7 h8 z" }, svg);
    var done = [];
    return function (t) {
      var n = Math.floor(t * (COLS * ROWS + 1)), k;
      for (k = 0; k < cells.length; k++) {
        if (k < n) {
          if (skipped[k]) { cells[k].setAttribute("class", "a-dash"); cells[k].setAttribute("fill", "none"); }
          else { cells[k].setAttribute("class", "a-acc"); cells[k].setAttribute("fill-opacity", 0.75); }
        } else { cells[k].setAttribute("class", "a-cell"); cells[k].setAttribute("fill-opacity", 1); }
      }
      var cur = Math.min(COLS * ROWS - 1, n), col = Math.floor(cur / ROWS);
      head.setAttribute("transform", "translate(" + (X0 + col * CW + (CW - 1.4) / 2) + " " + (Y0 - 6) + ")");
      head.setAttribute("opacity", t >= 0.999 ? 0 : 1);
    };
  };
})();
