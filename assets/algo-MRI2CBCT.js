/* algo-MRI2CBCT.js : scenes du module MRI2CBCT (page atlas legacy).
   Aucune chaine traduisible ici : seulement des nombres et des symboles. */
(function () {
  "use strict";
  var A = window.Algo;
  if (!A) { return; }
  var E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;
  function pts(a) { return a.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }

  /* 1. Reechantillonnage de l'IRM : meme etendue physique, voxels isotropes de 0.3 mm */
  A.scenes.mri_resample = function (svg) {
    var X = 40, Y = 44, W = 240, H = 84, i;
    var fine = E("g", {}, svg), coarse = E("g", {}, svg);
    for (i = 0; i <= 20; i++) { E("line", { "class": "a-fine", x1: X + i * 12, x2: X + i * 12, y1: Y, y2: Y + H }, fine); }
    for (i = 0; i <= 7; i++) { E("line", { "class": "a-fine", x1: X, x2: X + W, y1: Y + i * 12, y2: Y + i * 12 }, fine); }
    for (i = 0; i <= 4; i++) { E("line", { "class": "a-ink", x1: X, x2: X + W, y1: Y + i * 21, y2: Y + i * 21 }, coarse); }
    E("rect", { "class": "a-ink", x: X, y: Y, width: W, height: H }, svg);
    var sl = E("rect", { "class": "a-acc", x: X, y: Y + 21, width: W, height: 21, opacity: 0.3 }, svg);
    var sf = E("rect", { "class": "a-acc", x: X, y: Y + 24, width: 12, height: 12, opacity: 0 }, svg);
    E("path", { "class": "a-ink", d: "M" + X + " " + (Y + H + 14) + " H" + (X + W) + " M" + X + " " + (Y + H + 10) + " v8 M" + (X + W) + " " + (Y + H + 10) + " v8" }, svg);
    var l1 = txt(svg, X, Y - 10, "3.0", "a-label-b"), l2 = txt(svg, X + W, Y - 10, "0.3", "a-label-b", "end");
    txt(svg, X + W / 2, Y + H + 30, "L", "a-label-b", "middle");
    return function (t) {
      var u = ease(seg(t, 0.25, 0.7));
      fine.setAttribute("opacity", u); coarse.setAttribute("opacity", 1 - 0.7 * u);
      sl.setAttribute("opacity", 0.3 * (1 - u)); sf.setAttribute("opacity", 0.7 * u);
      l1.setAttribute("opacity", 1 - 0.55 * u); l2.setAttribute("opacity", 0.45 + 0.55 * u);
    };
  };

  /* 2. Surface d'un masque : masque moins son erosion, puis un echantillon de points */
  A.scenes.mri_surface = function (svg) {
    var GX = 15, GY = 11, C = 18, OX = 24, OY = 8, i, j, m = {}, cells = [], shell = [];
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) {
      if (Math.pow((i - 7) / 6.2, 2) + Math.pow((j - 5) / 4.6, 2) <= 1) { m[i + "," + j] = 1; }
    } }
    function inside(a, b) { return m[a + "," + b] === 1; }
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) {
      if (!inside(i, j)) { continue; }
      var inner = inside(i - 1, j) && inside(i + 1, j) && inside(i, j - 1) && inside(i, j + 1);
      var r = E("rect", { "class": "a-soft", x: OX + i * C, y: OY + j * C, width: C - 1, height: C - 1, "fill-opacity": 0.28 }, svg);
      cells.push({ el: r, inner: inner });
      if (!inner) { shell.push([OX + (i + 0.5) * C, OY + (j + 0.5) * C]); }
    } }
    var dots = shell.map(function (p, k) {
      return E("circle", { "class": "a-lmk", cx: p[0], cy: p[1], r: 3.4, opacity: 0, "data-k": k }, svg);
    });
    return function (t) {
      var a = ease(seg(t, 0.15, 0.45)), b = ease(seg(t, 0.6, 0.9));
      cells.forEach(function (c) {
        if (c.inner) { c.el.setAttribute("fill-opacity", lerp(0.28, 0.06, a)); c.el.setAttribute("class", "a-soft"); }
        else { c.el.setAttribute("class", a > 0.5 ? "a-acc" : "a-soft"); c.el.setAttribute("fill-opacity", a > 0.5 ? 0.55 : 0.28); }
      });
      dots.forEach(function (d, k) { d.setAttribute("opacity", (k % 2 === 0) ? b : 0); });
    };
  };

  /* 3. La coupe de cote : on garde la moitie scannee, plus une marge de 5 mm */
  A.scenes.mri_sidecut = function (svg) {
    var CX = 160, CY = 92, RX = 92, RY = 62, N = 26, i, P = [];
    for (i = 0; i < N; i++) {
      var a = i / N * Math.PI * 2, k = 1 + 0.07 * Math.sin(a * 3);
      P.push([CX + Math.cos(a) * RX * k, CY + Math.sin(a) * RY * k]);
    }
    var dots = P.map(function (p) { return E("circle", { "class": "a-acc", cx: p[0], cy: p[1], r: 3.6 }, svg); });
    var band = E("rect", { "class": "a-nlp", x: CX - 12, y: 14, width: 12, height: 156, opacity: 0.15 }, svg);
    var mid = E("line", { "class": "a-dash", x1: CX, x2: CX, y1: 14, y2: 170 }, svg);
    var slab = E("rect", { "class": "a-nlp-s", x: CX + 20, y: CY - 28, width: 60, height: 56, rx: 3, opacity: 0 }, svg);
    return function (t) {
      var a = ease(seg(t, 0.1, 0.3)), b = ease(seg(t, 0.45, 0.8));
      mid.setAttribute("opacity", a); band.setAttribute("opacity", 0.15 * a);
      P.forEach(function (p, k) {
        var keep = p[0] - CX >= -12;
        dots[k].setAttribute("opacity", keep ? 1 : 1 - 0.85 * b);
        dots[k].setAttribute("class", keep ? "a-acc" : "a-soft");
      });
      slab.setAttribute("opacity", b);
    };
  };

  /* 4. Cinquante tirages : le meilleur recouvrement est garde */
  A.scenes.mri_draws = function (svg) {
    var arc = [], i, N = 14;
    for (i = 0; i < N; i++) { var s = i / (N - 1); arc.push([-70 + 140 * s, -22 * Math.sin(Math.PI * s) + 10 * Math.sin(3 * s)]); }
    var poses = [[-2.4, 38, 8], [1.1, -20, 40], [2.7, 30, -10], [0.5, 50, 30], [-0.9, -30, -12], [0.04, 2, 0]];
    var CX = 124, CY = 92, BX = 262, BASE = 150, bars = [], fit = [0.31, 0.22, 0.12, 0.28, 0.4, 0.93];
    var tgt = E("polyline", { "class": "a-ink", "stroke-width": 3, "stroke-linecap": "round" }, svg);
    tgt.setAttribute("points", pts(arc.map(function (p) { return [CX + p[0], CY + p[1]]; })));
    var src = E("polyline", { "class": "a-nlp-s", "stroke-width": 3, "stroke-linecap": "round" }, svg);
    E("line", { "class": "a-ink", x1: BX - 10, x2: BX + poses.length * 9 + 4, y1: BASE, y2: BASE }, svg);
    for (i = 0; i < poses.length; i++) { bars.push(E("rect", { "class": "a-soft", x: BX + i * 9, width: 7, rx: 1, "fill-opacity": 0.35 }, svg)); }
    function place(k) {
      var p = poses[k], c = Math.cos(p[0]), s = Math.sin(p[0]);
      return arc.map(function (q) { return [CX + p[1] * 0.6 + q[0] * c - q[1] * s, CY + p[2] * 0.6 + q[0] * s + q[1] * c]; });
    }
    return function (t) {
      var s = t * poses.length, k = Math.min(poses.length - 1, Math.floor(s)), u = s - k;
      if (t >= 0.999) { k = poses.length - 1; u = 1; }
      src.setAttribute("points", pts(place(k)));
      for (i = 0; i < poses.length; i++) {
        var h = i < k ? 100 * fit[i] : (i === k ? 100 * fit[i] * ease(u * 1.6) : 0);
        bars[i].setAttribute("height", h); bars[i].setAttribute("y", BASE - h);
        bars[i].setAttribute("class", (i === poses.length - 1 && k === i && u > 0.8) ? "a-acc" : "a-soft");
        bars[i].setAttribute("fill-opacity", (i === poses.length - 1 && k === i && u > 0.8) ? 1 : 0.35);
      }
    };
  };

  /* 5. L'angle de la pose : au-dela de 90 degres, aucune tete ne se retourne ainsi */
  A.scenes.mri_angle = function (svg) {
    var CX = 110, CY = 98, R = 70;
    E("circle", { "class": "a-cell", cx: CX, cy: CY, r: R }, svg);
    E("line", { "class": "a-dash", x1: CX - R - 8, x2: CX + R + 8, y1: CY, y2: CY }, svg);
    E("line", { "class": "a-dash", x1: CX, x2: CX, y1: CY - R - 8, y2: CY + R + 8 }, svg);
    E("line", { "class": "a-ink", x1: CX, x2: CX + R, y1: CY, y2: CY }, svg);
    var arcP = E("path", { "class": "a-acc-s", "stroke-width": 3 }, svg);
    var arm = E("line", { "class": "a-acc-s", "stroke-width": 2.4, x1: CX, y1: CY }, svg);
    var head = E("circle", { "class": "a-acc", r: 5 }, svg);
    var val = txt(svg, 218, 98, "", "a-label-b");
    txt(svg, CX + R * 0.7 + 4, CY - R * 0.7 - 4, "90", "a-num");
    return function (t) {
      var deg = lerp(8, 172, ease(seg(t, 0.1, 0.9))), a = deg * Math.PI / 180, bad = deg > 90;
      var x = CX + R * Math.cos(-a), y = CY + R * Math.sin(-a);
      arm.setAttribute("x2", x); arm.setAttribute("y2", y);
      head.setAttribute("cx", x); head.setAttribute("cy", y);
      var large = deg > 180 ? 1 : 0;
      arcP.setAttribute("d", "M" + (CX + 28) + " " + CY + " A28 28 0 " + large + " 0 " + (CX + 28 * Math.cos(-a)) + " " + (CY + 28 * Math.sin(-a)));
      var c = bad ? "a-nlp" : "a-acc";
      head.setAttribute("class", c); arcP.setAttribute("class", bad ? "a-nlp-s" : "a-acc-s"); arm.setAttribute("class", bad ? "a-nlp-s" : "a-acc-s");
      val.textContent = Math.round(deg) + "";
    };
  };

  /* 6. Le miroir : la forme est reflechie a travers un plan qui passe par son centre */
  A.scenes.mri_mirror = function (svg) {
    var CX = 160, CY = 98, shape = [[-52, -50], [-8, -50], [-8, -22], [-30, -22], [-30, 4], [-8, 4], [-8, 32], [-52, 32]];
    shape = shape.map(function (p) { return [p[0] + 30, p[1] + 8]; });
    E("line", { "class": "a-dash", x1: CX, x2: CX, y1: 14, y2: 182 }, svg);
    var ghost = E("polygon", { "class": "a-ink", opacity: 0.4, "stroke-dasharray": "3 3" }, svg);
    ghost.setAttribute("points", pts(shape.map(function (p) { return [CX + p[0], CY + p[1]]; })));
    var poly = E("polygon", { "class": "a-nlp", opacity: 0.55 }, svg);
    var edge = E("polygon", { "class": "a-nlp-s" }, svg);
    return function (t) {
      var u = ease(seg(t, 0.2, 0.75)), s = Math.cos(Math.PI * u);
      var p = pts(shape.map(function (q) { return [CX + q[0] * s, CY + q[1]]; }));
      poly.setAttribute("points", p); edge.setAttribute("points", p);
    };
  };
})();
