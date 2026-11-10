/* algo-AREG_CBCT.js : les scenes animees de la page AREG_CBCT (VISOR et legacy).
   Aucune chaine traduisible ici : le texte, les formules et les legendes vivent dans le HTML.
   Couleurs par classes .a-* (jetons du theme), jamais en dur.
   Codes couleur communs avec les legendes : k1 accent (.a-acc), k2 .a-seg, k3 .a-ana, k4 .a-nlp. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, txt = A.txt, ease = A.ease, seg = A.seg, lerp = A.lerp;

  function rng(seed) {   /* petit generateur deterministe : la scene est la meme a chaque lecture */
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* 1. Le masque : seuls les voxels de la region gardent leur valeur, le reste est mis a zero */
  A.scenes.areg_cbct_mask = function (svg) {
    var GX = 20, GY = 12, C = 14, OX = 20, OY = 14, i, j, cells = [], inside = [];
    var cx = 9.5, cy = 5.5, rx = 6.2, ry = 4.0;
    function val(x, y) {
      var d = Math.sqrt(Math.pow((x - 9.5) / 8.6, 2) + Math.pow((y - 5.5) / 5.4, 2));
      var ring = Math.exp(-Math.pow((d - 0.82) / 0.1, 2));
      return 0.12 + 0.55 * ring + 0.2 * Math.exp(-Math.pow(d / 0.5, 2));
    }
    var g = E("g", {}, svg);
    for (j = 0; j < GY; j++) {
      for (i = 0; i < GX; i++) {
        var inm = Math.pow((i - cx) / rx, 2) + Math.pow((j - cy) / ry, 2) <= 1;
        inside.push(inm);
        cells.push(E("rect", { "class": "a-soft", x: OX + i * C, y: OY + j * C, width: C - 1, height: C - 1, "fill-opacity": 0.1 + 0.7 * val(i, j) }, g));
      }
    }
    var zeroTag = txt(svg, OX + GX * C, 14 + GY * C + 14, "0", "a-num", "end");
    var outline = E("ellipse", { "class": "a-seg-s", cx: OX + (cx + 0.5) * C, cy: OY + (cy + 0.5) * C, rx: rx * C, ry: ry * C, opacity: 0 }, svg);
    return function (t) {
      var a = ease(seg(t, 0.08, 0.35)), b = ease(seg(t, 0.45, 0.85));
      outline.setAttribute("opacity", a);
      for (var n = 0; n < cells.length; n++) {
        var base = 0.1 + 0.7 * val(n % GX, Math.floor(n / GX));
        cells[n].setAttribute("fill-opacity", inside[n] ? base : lerp(base, 0.03, b));
      }
      zeroTag.setAttribute("opacity", b);
    };
  };

  /* 2. L'information mutuelle : le nuage des paires (valeur T1, valeur T2) se resserre quand les images s'alignent */
  A.scenes.areg_cbct_mi = function (svg) {
    var X0 = 40, Y0 = 156, W = 250, H = 130, N = 64, i, pts = [], dots = [];
    var R = rng(11), tissues = [[0.18, 0.22], [0.52, 0.58], [0.86, 0.84]];
    for (i = 0; i < N; i++) {
      var k = i % 3, tt = tissues[k];
      pts.push({ x: tt[0] + (R() - 0.5) * 0.07, y: tt[1] + (R() - 0.5) * 0.07, r: R(), k: k });
    }
    E("path", { "class": "a-ink", d: "M" + X0 + " " + (Y0 - H - 6) + " V" + Y0 + " H" + (X0 + W + 6) }, svg);
    txt(svg, X0 + W, Y0 + 14, "T1", "a-label-b", "end");
    txt(svg, X0 - 8, Y0 - H - 8, "T2", "a-label-b", "end");
    var g = E("g", {}, svg);
    for (i = 0; i < N; i++) { dots.push(E("circle", { "class": "a-acc", r: 3, opacity: 0.8 }, g)); }
    E("rect", { "class": "a-cell", x: X0 + W - 70, y: 16, width: 70, height: 8, rx: 2 }, svg);
    var bar = E("rect", { "class": "a-seg", x: X0 + W - 70, y: 16, height: 8, rx: 2, width: 4 }, svg);
    txt(svg, X0 + W - 76, 24, "MI", "a-label-b", "end");
    return function (t) {
      var u = ease(seg(t, 0.12, 0.88));
      for (var n = 0; n < N; n++) {
        var p = pts[n], yy = lerp(p.r, p.y, u);
        dots[n].setAttribute("cx", X0 + p.x * W);
        dots[n].setAttribute("cy", Y0 - yy * H);
      }
      bar.setAttribute("width", 4 + 66 * u);
    };
  };

  /* 3. La transformation rigide : y = R(x - c) + c + t. Une rotation autour du centre c, puis une translation */
  A.scenes.areg_cbct_rigid = function (svg) {
    var C = [110, 100], th = 0.5, tr = [92, -34], i;
    var shape = [[70, 52], [150, 44], [168, 92], [150, 142], [96, 150], [74, 112]];
    function rot(p, a) { var x = p[0] - C[0], y = p[1] - C[1]; return [C[0] + x * Math.cos(a) - y * Math.sin(a), C[1] + x * Math.sin(a) + y * Math.cos(a)]; }
    function pts(poly) { return poly.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
    var fixed = E("polygon", { "class": "a-ink", points: pts(shape), "stroke-dasharray": "4 3", "stroke-linejoin": "round" }, svg);
    var moving = E("polygon", { "class": "a-acc-s", points: pts(shape), "stroke-linejoin": "round" }, svg);
    var X = shape[1];
    var cm = E("g", {}, svg);
    E("circle", { "class": "a-ana", r: 4, cx: C[0], cy: C[1] }, cm);
    var v0 = E("line", { "class": "a-ink", x1: C[0], y1: C[1], x2: X[0], y2: X[1], "stroke-dasharray": "3 3" }, svg);
    var v1 = E("line", { "class": "a-seg-s", x1: C[0], y1: C[1], x2: X[0], y2: X[1] }, svg);
    var vt = E("line", { "class": "a-nlp-s", x1: X[0], y1: X[1], x2: X[0], y2: X[1] }, svg);
    var dot = E("circle", { "class": "a-acc", r: 4, cx: X[0], cy: X[1] }, svg);
    txt(svg, C[0] - 8, C[1] + 16, "c", "a-label-b", "end");
    return function (t) {
      var a = ease(seg(t, 0.1, 0.5)), b = ease(seg(t, 0.55, 0.92));
      var ang = th * a, off = [tr[0] * b, tr[1] * b];
      var poly = shape.map(function (p) { var q = rot(p, ang); return [q[0] + off[0], q[1] + off[1]]; });
      moving.setAttribute("points", pts(poly));
      var q = rot(X, ang);
      v1.setAttribute("x2", q[0]); v1.setAttribute("y2", q[1]);
      v1.setAttribute("opacity", a > 0 ? 1 : 0);
      vt.setAttribute("x1", q[0]); vt.setAttribute("y1", q[1]);
      vt.setAttribute("x2", q[0] + off[0]); vt.setAttribute("y2", q[1] + off[1]);
      vt.setAttribute("opacity", b > 0 ? 1 : 0);
      dot.setAttribute("cx", q[0] + off[0]); dot.setAttribute("cy", q[1] + off[1]);
    };
  };

  /* 3b. Legacy : l'angle et la translation d'elastix sont gardes, mais pas le centre c. La transformation
     reconstruite tourne autour de l'origine O du repere : y = R x + t au lieu de y = R(x - c) + c + t */
  A.scenes.areg_cbct_rigid_legacy = function (svg) {
    var O = [28, 120], C = [150, 98], th = 0.3, tr = [40, -10];
    var shape = [[100, 60], [190, 52], [205, 95], [188, 140], [125, 148], [104, 106]];
    function rot(p, a, K) { var x = p[0] - K[0], y = p[1] - K[1]; return [K[0] + x * Math.cos(a) - y * Math.sin(a), K[1] + x * Math.sin(a) + y * Math.cos(a)]; }
    function pts(poly) { return poly.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
    E("polygon", { "class": "a-ink", points: pts(shape), "stroke-dasharray": "4 3", "stroke-linejoin": "round" }, svg);
    var elx = E("polygon", { "class": "a-acc-s", points: pts(shape), "stroke-dasharray": "6 3", "stroke-linejoin": "round" }, svg);
    var leg = E("polygon", { "class": "a-acc-s", points: pts(shape), "stroke-linejoin": "round" }, svg);
    var X = shape[1];
    E("path", { "class": "a-ink", d: "M" + (O[0] - 6) + " " + O[1] + " H" + (O[0] + 6) + " M" + O[0] + " " + (O[1] - 6) + " V" + (O[1] + 6) }, svg);
    txt(svg, O[0] + 10, O[1] + 14, "O", "a-label-b", "start");
    E("circle", { "class": "a-ana", r: 4, cx: C[0], cy: C[1] }, svg);
    txt(svg, C[0] - 8, C[1] + 16, "c", "a-label-b", "end");
    var rO = E("line", { "class": "a-seg-s", x1: O[0], y1: O[1], x2: X[0], y2: X[1], opacity: 0.6 }, svg);
    var rC = E("line", { "class": "a-seg-s", x1: C[0], y1: C[1], x2: X[0], y2: X[1] }, svg);
    var gap = E("line", { "class": "a-ink", x1: X[0], y1: X[1], x2: X[0], y2: X[1], "stroke-dasharray": "2 3" }, svg);
    var dE = E("circle", { "class": "a-acc", r: 4, cx: X[0], cy: X[1] }, svg);
    var dL = E("circle", { "class": "a-acc", r: 4, cx: X[0], cy: X[1] }, svg);
    return function (t) {
      var a = ease(seg(t, 0.1, 0.5)), b = ease(seg(t, 0.55, 0.85)), g = ease(seg(t, 0.88, 0.98));
      var off = [tr[0] * b, tr[1] * b], ang = th * a;
      var pe = shape.map(function (p) { var q = rot(p, ang, C); return [q[0] + off[0], q[1] + off[1]]; });
      var pl = shape.map(function (p) { var q = rot(p, ang, O); return [q[0] + off[0], q[1] + off[1]]; });
      elx.setAttribute("points", pts(pe)); leg.setAttribute("points", pts(pl));
      var xe = rot(X, ang, C), xl = rot(X, ang, O);
      rC.setAttribute("x2", xe[0]); rC.setAttribute("y2", xe[1]);
      rO.setAttribute("x2", xl[0]); rO.setAttribute("y2", xl[1]);
      dE.setAttribute("cx", xe[0] + off[0]); dE.setAttribute("cy", xe[1] + off[1]);
      dL.setAttribute("cx", xl[0] + off[0]); dL.setAttribute("cy", xl[1] + off[1]);
      gap.setAttribute("x1", xe[0] + off[0]); gap.setAttribute("y1", xe[1] + off[1]);
      gap.setAttribute("x2", lerp(xe[0] + off[0], xl[0] + off[0], g)); gap.setAttribute("y2", lerp(xe[1] + off[1], xl[1] + off[1], g));
    };
  };

  /* 4. Trois niveaux d'une pyramide : on aligne d'abord sur des images floues, puis de plus en plus nettes */
  A.scenes.areg_cbct_pyramid = function (svg) {
    var C = [160, 84];
    var shape = [[110, 40], [210, 36], [226, 84], [208, 130], [128, 134], [102, 90]];
    function xf(poly, a, dx, dy) {
      return poly.map(function (p) {
        var x = p[0] - C[0], y = p[1] - C[1];
        return [C[0] + x * Math.cos(a) - y * Math.sin(a) + dx, C[1] + x * Math.sin(a) + y * Math.cos(a) + dy];
      });
    }
    function pts(poly) { return poly.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
    E("polygon", { "class": "a-ink", points: pts(shape), "stroke-linejoin": "round" }, svg);
    var wide = E("polygon", { "class": "a-acc-s", points: pts(shape), "stroke-width": 16, "stroke-linejoin": "round" }, svg);
    var mid = E("polygon", { "class": "a-acc-s", points: pts(shape), "stroke-width": 7, "stroke-linejoin": "round" }, svg);
    var thin = E("polygon", { "class": "a-acc-s", points: pts(shape), "stroke-linejoin": "round" }, svg);
    var marks = [];
    for (var i = 0; i < 3; i++) { marks.push(E("circle", { "class": "a-acc", cx: 140 + i * 20, cy: 176, r: 4 })); svg.appendChild(marks[i]); }
    var start = [0.32, 44, -30], l1 = [0.1, 14, -8], l2 = [0.025, 3, -1.5];
    function pose(u) {
      var a, b, w;
      if (u < 1) { a = start; b = l1; w = u; } else if (u < 2) { a = l1; b = l2; w = u - 1; } else { a = l2; b = [0, 0, 0]; w = u - 2; }
      w = ease(w);
      return [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)];
    }
    return function (t) {
      var u = Math.min(2.999, t * 3), level = Math.floor(u), p = pose(u);
      var poly = pts(xf(shape, p[0], p[1], p[2]));
      wide.setAttribute("points", poly); mid.setAttribute("points", poly); thin.setAttribute("points", poly);
      wide.setAttribute("opacity", level === 0 ? 0.22 : 0);
      mid.setAttribute("opacity", level === 1 ? 0.3 : 0);
      thin.setAttribute("opacity", level === 2 ? 1 : 0.2);
      for (var n = 0; n < 3; n++) { marks[n].setAttribute("opacity", n === level ? 1 : 0.25); }
    };
  };

  /* 5. Le reechantillonnage : chaque voxel de la grille de T2 va chercher sa valeur la ou la transformation le renvoie */
  A.scenes.areg_cbct_resample = function (svg) {
    var OX = 30, OY = 18, C = 46, GX = 6, GY = 3, i, j;
    for (j = 0; j <= GY; j++) { E("line", { "class": "a-cell", x1: OX, x2: OX + GX * C, y1: OY + j * C, y2: OY + j * C }, svg); }
    for (i = 0; i <= GX; i++) { E("line", { "class": "a-cell", y1: OY, y2: OY + GY * C, x1: OX + i * C, x2: OX + i * C }, svg); }
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) { E("circle", { "class": "a-fine", cx: OX + (i + 0.5) * C, cy: OY + (j + 0.5) * C, r: 1.6 }, svg); } }
    var x0 = [OX + 2.35 * C, OY + 1.2 * C], y0 = [OX + 2.78 * C, OY + 1.64 * C];
    /* 4 centres voisins : (2,1) (3,1) (2,2) (3,2) en indices ; le point cible tombe a (2.78, 1.64) en unites de voxel */
    var cx0 = OX + 2.5 * C, cy0 = OY + 1.5 * C;
    var wr = [];
    var pos = [[cx0, cy0], [cx0 + C, cy0], [cx0, cy0 + C], [cx0 + C, cy0 + C]];
    var px = y0[0], py = y0[1];
    var rects = [
      [px, py, cx0 - px, cy0 - py], [px, py, cx0 + C - px, cy0 - py],
      [px, py, cx0 - px, cy0 + C - py], [px, py, cx0 + C - px, cy0 + C - py]
    ];
    /* le poids d'un voisin est l'aire du rectangle oppose */
    var opp = [3, 2, 1, 0];
    for (i = 0; i < 4; i++) {
      var r = rects[opp[i]];
      wr.push(E("rect", { "class": "a-ana", x: Math.min(px, px + r[2]), y: Math.min(py, py + r[3]), width: Math.abs(r[2]), height: Math.abs(r[3]), opacity: 0 }, svg));
    }
    var cen = [];
    for (i = 0; i < 4; i++) { cen.push(E("circle", { "class": "a-acc", cx: pos[i][0], cy: pos[i][1], r: 4, opacity: 0.3 }, svg)); }
    var sample = E("circle", { "class": "a-nlp", r: 4.5, cx: x0[0], cy: x0[1] }, svg);
    var arrow = E("line", { "class": "a-dash", x1: x0[0], y1: x0[1], x2: x0[0], y2: x0[1] }, svg);
    var res = E("circle", { "class": "a-seg", r: 5, cx: y0[0], cy: y0[1], opacity: 0 }, svg);
    return function (t) {
      var a = ease(seg(t, 0.1, 0.45)), b = ease(seg(t, 0.55, 0.85)), c = seg(t, 0.85, 0.95);
      var x = lerp(x0[0], y0[0], a), y = lerp(x0[1], y0[1], a);
      sample.setAttribute("cx", x); sample.setAttribute("cy", y);
      arrow.setAttribute("x2", x); arrow.setAttribute("y2", y); arrow.setAttribute("opacity", a > 0 ? 0.8 : 0);
      for (var n = 0; n < 4; n++) {
        wr[n].setAttribute("opacity", 0.45 * b);
        cen[n].setAttribute("opacity", lerp(0.3, 1, b));
      }
      res.setAttribute("opacity", c);
    };
  };
})();
