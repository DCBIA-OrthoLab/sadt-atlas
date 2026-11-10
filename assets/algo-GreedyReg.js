/* algo-GreedyReg.js : scenes de la page GreedyReg (VISOR et legacy).
   Aucune chaine traduisible ici : seulement des symboles et des nombres. Le texte vit dans le HTML. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, txt = A.txt, ease = A.ease, seg = A.seg, lerp = A.lerp;
  function pts(a) { return a.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function rot(p, c, th) {
    var dx = p[0] - c[0], dy = p[1] - c[1], s = Math.sin(th), k = Math.cos(th);
    return [c[0] + k * dx - s * dy, c[1] + s * dx + k * dy];
  }

  /* 1. La correlation croisee normalisee : le score monte a 1 quand la fenetre de T2 recouvre celle de T1,
        meme si T2 a une autre luminosite */
  A.scenes.greedyreg_ncc = function (svg) {
    var X0 = 20, W = 280, N = 140, WIN = 18, i, a = [];
    function sig(x) { return 0.12 + 0.7 * Math.exp(-Math.pow((x - 62) / 11, 2)) + 0.45 * Math.exp(-Math.pow((x - 92) / 7, 2)) + 0.25 * Math.exp(-Math.pow((x - 40) / 5, 2)); }
    for (i = 0; i < N; i++) { a.push(sig(i)); }
    function A_(x) { return x < 0 || x >= N ? 0.12 : sig(x); }
    function B_(x, s) { return 0.55 * A_(x - s) + 0.08; }
    var X = function (x) { return X0 + W * x / N; };
    var W0 = 50, win = [];
    function ncc(s) {
      var ma = 0, mb = 0, k, num = 0, da = 0, db = 0;
      for (k = 0; k < WIN; k++) { ma += A_(W0 + k) / WIN; mb += B_(W0 + k, s) / WIN; }
      for (k = 0; k < WIN; k++) { var u = A_(W0 + k) - ma, v = B_(W0 + k, s) - mb; num += u * v; da += u * u; db += v * v; }
      return num / Math.sqrt(da * db + 1e-12);
    }
    var cA = E("polyline", { "class": "a-acc-s", fill: "none" }, svg), cB = E("polyline", { "class": "a-seg-s", fill: "none" }, svg);
    var box = E("rect", { "class": "a-dash", x: X(W0), y: 14, width: W * WIN / N, height: 92 }, svg);
    var BY = 176, SH = [];
    for (i = -30; i <= 30; i++) { SH.push([160 + i * 4.2, BY - 52 * Math.max(0, ncc(i)) - 2]); }
    E("line", { "class": "a-ink", x1: 30, x2: 290, y1: BY, y2: BY }, svg);
    E("polyline", { "class": "a-fine", fill: "none", points: pts(SH) }, svg);
    var mk = E("circle", { "class": "a-acc", r: 5 }, svg);
    var vl = E("line", { "class": "a-dash", y1: BY, y2: 120 }, svg);
    var val = txt(svg, 290, 128, "", "a-label-b", "end");
    return function (t) {
      var s = lerp(26, 0, ease(seg(t, 0.12, 0.88)));
      var pa = [], pb = [];
      for (i = 0; i < N; i++) { pa.push([X(i), 100 - 78 * A_(i)]); pb.push([X(i), 100 - 78 * B_(i, s)]); }
      cA.setAttribute("points", pts(pa)); cB.setAttribute("points", pts(pb));
      var v = ncc(s), mx = 160 + s * 4.2, my = BY - 52 * Math.max(0, v) - 2;
      mk.setAttribute("cx", mx); mk.setAttribute("cy", my); vl.setAttribute("x1", mx); vl.setAttribute("x2", mx);
      val.textContent = v.toFixed(2);
    };
  };

  /* 2. La pyramide multi-resolution : on recale d'abord sur une image grossiere, puis on affine */
  A.scenes.greedyreg_pyramid = function (svg) {
    var CS = [40, 20, 10, 5], NIT = ["100", "100", "50", "25"], OX = 50, OY = 14, WW = 220, HH = 120, groups = [], L, i, j;
    var CX = OX + WW / 2, CY = OY + HH / 2;
    function img(x, y) { return Math.exp(-(Math.pow((x - CX) / 60, 2) + Math.pow((y - CY) / 36, 2))) + 0.5 * Math.exp(-(Math.pow((x - CX - 52) / 14, 2) + Math.pow((y - CY + 14) / 14, 2))); }
    for (L = 0; L < 4; L++) {
      var g = E("g", {}, svg), cs = CS[L];
      for (j = 0; j < HH / cs; j++) { for (i = 0; i < WW / cs; i++) {
        var v = img(OX + (i + 0.5) * cs, OY + (j + 0.5) * cs);
        E("rect", { "class": "a-soft", x: OX + i * cs, y: OY + j * cs, width: cs, height: cs, "fill-opacity": Math.min(0.9, v * 0.8) }, g);
      } }
      groups.push(g);
    }
    var shape = E("ellipse", { "class": "a-seg-s", rx: 60, ry: 36 }, svg);
    var box = [], bx = 52;
    for (L = 0; L < 4; L++) {
      E("rect", { "class": "a-ink", x: bx + L * 56, y: 152, width: 50, height: 22, rx: 4, fill: "none" }, svg);
      txt(svg, bx + L * 56 + 25, 167, NIT[L], "a-num", "middle");
      box.push(E("rect", { "class": "a-acc", x: bx + L * 56, y: 152, width: 50, height: 22, rx: 4, "fill-opacity": 0 }, svg));
    }
    var err = [[34, 18], [12, 6], [4, 2], [0.6, 0.3]];
    return function (t) {
      var s = Math.min(3.999, t * 4), lv = Math.floor(s), u = ease(s - lv);
      var e0 = lv === 0 ? [42, 22] : err[lv - 1], e1 = err[lv];
      var ex = lerp(e0[0], e1[0], seg(u, 0, 0.9)), ey = lerp(e0[1], e1[1], seg(u, 0, 0.9));
      for (L = 0; L < 4; L++) { groups[L].setAttribute("opacity", L === lv ? 1 : 0); box[L].setAttribute("fill-opacity", L === lv ? 0.35 : (L < lv ? 0.12 : 0)); }
      shape.setAttribute("cx", CX + ex); shape.setAttribute("cy", CY + ey);
    };
  };

  /* 3. Six ou douze degres de liberte : une rotation et une translation, ou une matrice libre */
  A.scenes.greedyreg_dof = function (svg) {
    function grid(cx, cy, S) {
      var o = [], k;
      for (k = -1; k <= 1; k++) {
        o.push([[-S, k * S * 0.66], [S, k * S * 0.66]]);
        o.push([[k * S * 0.66, -S], [k * S * 0.66, S]]);
      }
      return o;
    }
    var G = grid(0, 0, 44), panels = [[78, 92], [242, 92]], draws = [];
    panels.forEach(function (pc) {
      var base = G.map(function (l) { return E("polyline", { "class": "a-dash", fill: "none", points: pts(l.map(function (p) { return [pc[0] + p[0], pc[1] + p[1]]; })) }, svg); });
      var lines = G.map(function () { return E("polyline", { "class": "a-acc-s", fill: "none" }, svg); });
      draws.push({ c: pc, lines: lines, base: base });
    });
    txt(svg, 78, 176, "6", "a-label-b", "middle"); txt(svg, 242, 176, "12", "a-label-b", "middle");
    E("line", { "class": "a-fine", x1: 160, x2: 160, y1: 16, y2: 160 }, svg);
    return function (t) {
      var u = ease(seg(t, 0.1, 0.85));
      var th = 0.38 * u, tx = 9 * u, ty = -6 * u;
      var Aff = [[1 + 0.28 * u, 0.34 * u], [0.1 * u, 1 - 0.22 * u]];
      draws.forEach(function (d, n) {
        d.lines.forEach(function (ln, k) {
          var pl = G[k].map(function (p) {
            var x, y;
            if (n === 0) { x = Math.cos(th) * p[0] - Math.sin(th) * p[1] + tx; y = Math.sin(th) * p[0] + Math.cos(th) * p[1] + ty; }
            else { x = Aff[0][0] * p[0] + Aff[0][1] * p[1] + tx; y = Aff[1][0] * p[0] + Aff[1][1] * p[1] + ty; }
            return [d.c[0] + x, d.c[1] + y];
          });
          ln.setAttribute("points", pts(pl));
        });
      });
    };
  };

  /* 4. Kabsch (legacy, mode Distant) : on centre, on tourne autour du centre, puis on translate */
  A.scenes.greedyreg_kabsch = function (svg) {
    var F = [[210, 60], [250, 92], [236, 142], [180, 150], [164, 98]];
    var fc = [0, 0], i;
    F.forEach(function (p) { fc[0] += p[0] / F.length; fc[1] += p[1] / F.length; });
    var phi = 0.62, mc = [92, 112];
    var M = F.map(function (p, n) { var r = rot([mc[0] + (p[0] - fc[0]), mc[1] + (p[1] - fc[1])], mc, -phi); return [r[0] + (n % 2 ? 1 : -1), r[1] + (n % 3 ? -1 : 1)]; });
    var fixed = F.map(function (p) { return E("circle", { "class": "a-acc-s", cx: p[0], cy: p[1], r: 6 }, svg); });
    var links = F.map(function () { return E("line", { "class": "a-fine" }, svg); });
    var mov = F.map(function () { return E("circle", { "class": "a-seg", r: 4 }, svg); });
    var cF = E("path", { "class": "a-ink", d: "M" + (fc[0] - 6) + " " + fc[1] + " H" + (fc[0] + 6) + " M" + fc[0] + " " + (fc[1] - 6) + " V" + (fc[1] + 6) }, svg);
    var cM = E("path", { "class": "a-ink" }, svg);
    return function (t) {
      var r = ease(seg(t, 0.3, 0.6)), tr = ease(seg(t, 0.65, 0.92)), show = seg(t, 0.02, 0.2), cen = seg(t, 0.18, 0.3);
      var off = [(fc[0] - mc[0]) * tr, (fc[1] - mc[1]) * tr];
      for (i = 0; i < M.length; i++) {
        var p = rot(M[i], mc, phi * r); p = [p[0] + off[0], p[1] + off[1]];
        mov[i].setAttribute("cx", p[0]); mov[i].setAttribute("cy", p[1]); mov[i].setAttribute("opacity", show);
        fixed[i].setAttribute("opacity", show);
        links[i].setAttribute("x1", p[0]); links[i].setAttribute("y1", p[1]); links[i].setAttribute("x2", F[i][0]); links[i].setAttribute("y2", F[i][1]);
        links[i].setAttribute("opacity", show * 0.8);
      }
      var cx = mc[0] + off[0], cy = mc[1] + off[1];
      cM.setAttribute("d", "M" + (cx - 6) + " " + cy + " H" + (cx + 6) + " M" + cx + " " + (cy - 6) + " V" + (cy + 6));
      cM.setAttribute("opacity", cen); cF.setAttribute("opacity", cen);
    };
  };
})();
