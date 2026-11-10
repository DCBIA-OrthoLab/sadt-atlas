/* algo-DOCShapeAXI.js : les scenes des cartes .algo des pages DOCShapeAXI (VISOR et legacy).
   Aucune chaine traduisible ici, seulement des nombres ; les couleurs sont des classes .a-*.
   Chaque scene est une fonction (svg) -> draw(t), t dans [0, 1]. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;

  /* 1. Les 42 vues : une camera tourne autour de la surface, chaque vue est un rendu de 224 x 224 */
  A.scenes.dsx_views = function (svg) {
    var cx = 98, cy = 98, R = 66, N = 14, i;
    var ring = E("circle", { "class": "a-cell", cx: cx, cy: cy, r: R }, svg);
    var body = E("ellipse", { "class": "a-soft", cx: cx, cy: cy, rx: 27, ry: 17, "fill-opacity": 0.28 }, svg);
    E("ellipse", { "class": "a-ink", cx: cx, cy: cy, rx: 27, ry: 17 }, svg);
    var cams = [];
    for (i = 0; i < N; i++) {
      var a = 2 * Math.PI * i / N;
      cams.push(E("circle", { "class": "a-ink", cx: cx + R * Math.cos(a), cy: cy + R * Math.sin(a), r: 3.5 }, svg));
    }
    var ray = E("line", { "class": "a-dash", x1: cx, y1: cy, x2: cx, y2: cy }, svg);
    var act = E("circle", { "class": "a-acc", r: 5.5 }, svg);
    var X0 = 214, Y0 = 44, S = 84;
    E("rect", { "class": "a-acc-s", x: X0, y: Y0, width: S, height: S, rx: 3 }, svg);
    var sil = E("ellipse", { "class": "a-seg", cx: X0 + S / 2, cy: Y0 + S / 2, rx: 20, ry: 20, "fill-opacity": 0.7 }, svg);
    txt(svg, X0 + S / 2, Y0 - 8, "224", "a-num", "middle");
    var ch = ["a-seg", "a-ana", "a-nlp", "a-soft"];
    for (i = 0; i < 4; i++) { E("rect", { "class": ch[i], x: X0 + 2 + i * 21, y: Y0 + S + 12, width: 17, height: 9, rx: 2, "fill-opacity": 0.7 }, svg); }
    return function (t) {
      var k = Math.min(N - 1, Math.floor(t * N)), a = 2 * Math.PI * k / N;
      var px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
      act.setAttribute("cx", px); act.setAttribute("cy", py);
      ray.setAttribute("x2", px); ray.setAttribute("y2", py);
      var c = Math.abs(Math.cos(a));
      sil.setAttribute("rx", lerp(17, 27, c) * 1.3); sil.setAttribute("ry", 17 * 1.3);
      sil.setAttribute("fill-opacity", 0.45 + 0.4 * c);
    };
  };

  /* 2. Le pooling par attention : des poids, puis un seul vecteur */
  A.scenes.dsx_pool = function (svg) {
    var n = 8, X0 = 36, DX = 35, Y = 132, i;
    var w = [0.15, 0.3, 0.9, 0.55, 0.12, 0.7, 0.25, 0.4], sum = 0;
    for (i = 0; i < n; i++) { sum += w[i]; }
    var toks = [], bars = [];
    for (i = 0; i < n; i++) {
      toks.push(E("circle", { "class": "a-seg", cx: X0 + i * DX, cy: Y, r: 8 }, svg));
      bars.push(E("rect", { "class": "a-nlp", x: X0 + i * DX - 6, width: 12, rx: 2 }, svg));
    }
    E("line", { "class": "a-ink", x1: 14, x2: 306, y1: Y + 16, y2: Y + 16 }, svg);
    var out = E("g", {}, svg), oc = [];
    for (i = 0; i < 4; i++) { oc.push(E("rect", { "class": "a-ana", x: 148, y: 30 + i * 12, width: 24, height: 11, rx: 2 }, out)); }
    var arrow = E("path", { "class": "a-ink", d: "M160 84 V100 M156 96 L160 101 L164 96" }, svg);
    return function (t) {
      var a = ease(seg(t, 0.05, 0.35)), b = ease(seg(t, 0.5, 0.85));
      for (i = 0; i < n; i++) {
        var h = 6 + 52 * w[i] * a;
        bars[i].setAttribute("height", h); bars[i].setAttribute("y", Y - 14 - h);
        var tx = lerp(X0 + i * DX, 160, b), ty = lerp(Y, 62, b);
        toks[i].setAttribute("cx", tx); toks[i].setAttribute("cy", ty);
        toks[i].setAttribute("r", lerp(8, 3 + 9 * w[i] / sum * 2.2, b));
        toks[i].setAttribute("opacity", 1 - 0.55 * b);
        bars[i].setAttribute("opacity", 1 - b);
      }
      out.setAttribute("opacity", b); arrow.setAttribute("opacity", b);
    };
  };

  /* 3. La fusion : deux vecteurs mis bout a bout, une couche lineaire, le score le plus haut l'emporte */
  A.scenes.dsx_fuse = function (svg) {
    var i, CH = 12, CW = 22;
    var left = [], right = [];
    for (i = 0; i < 4; i++) {
      left.push(E("rect", { "class": "a-seg", x: 28, y: 40 + i * CH, width: CW, height: CH - 1, rx: 2 }, svg));
      right.push(E("rect", { "class": "a-ana", x: 82, y: 40 + i * CH, width: CW, height: CH - 1, rx: 2 }, svg));
    }
    var bars = [], sc = [0.35, 0.8, 0.5, 0.2], bx = 196;
    for (i = 0; i < 4; i++) { bars.push(E("rect", { "class": "a-nlp", x: bx + i * 26, width: 18, rx: 2 }, svg)); }
    E("line", { "class": "a-ink", x1: bx - 8, x2: bx + 4 * 26, y1: 150, y2: 150 }, svg);
    var arrow = E("path", { "class": "a-ink", d: "M120 76 H168 M163 72 L169 76 L163 80" }, svg);
    var best = E("rect", { "class": "a-acc", x: bx + 26, width: 18, rx: 2 }, svg);
    return function (t) {
      var a = ease(seg(t, 0.05, 0.35)), b = ease(seg(t, 0.4, 0.55)), c = ease(seg(t, 0.55, 0.8)), d = ease(seg(t, 0.8, 0.95));
      for (i = 0; i < 4; i++) {
        right[i].setAttribute("x", lerp(82, 28, a)); right[i].setAttribute("y", lerp(40 + i * CH, 40 + (i + 4) * CH, a));
        var h = 6 + 90 * sc[i] * c;
        bars[i].setAttribute("height", h); bars[i].setAttribute("y", 150 - h);
        bars[i].setAttribute("opacity", 1 - 0.7 * d * (i === 1 ? 0 : 1));
      }
      arrow.setAttribute("opacity", b);
      var hb = 6 + 90 * sc[1] * c;
      best.setAttribute("height", hb); best.setAttribute("y", 150 - hb); best.setAttribute("opacity", d);
    };
  };

  /* 4. Grad-CAM : une petite carte de 7 x 7 agrandie jusqu'a la taille d'une vue */
  A.scenes.dsx_cam = function (svg) {
    var G = 7, F = 24, i, j;
    function v(x, y) { return 0.1 + 0.85 * Math.exp(-(Math.pow(x - 3.8, 2) + Math.pow(y - 2.6, 2)) / 3.2) + 0.1 * Math.sin(x * 2.1 + y * 1.3); }
    var cs = 10, ox = 20, oy = 62, coarse = [];
    for (j = 0; j < G; j++) { for (i = 0; i < G; i++) {
      coarse.push(E("rect", { "class": "a-nlp", x: ox + i * cs, y: oy + j * cs, width: cs - 1, height: cs - 1, "fill-opacity": 0 }, svg));
    } }
    E("rect", { "class": "a-ink", x: ox - 1, y: oy - 1, width: G * cs + 1, height: G * cs + 1 }, svg);
    var arrow = E("path", { "class": "a-ink", d: "M104 98 H130 M125 94 L131 98 L125 102" }, svg);
    var fs = 5, fx = 150, fy = 38, fine = [];
    for (j = 0; j < F; j++) { for (i = 0; i < F; i++) {
      var gx = (i + 0.5) / F * G - 0.5, gy = (j + 0.5) / F * G - 0.5;
      var x0 = Math.max(0, Math.min(G - 2, Math.floor(gx))), y0 = Math.max(0, Math.min(G - 2, Math.floor(gy)));
      var u = Math.max(0, Math.min(1, gx - x0)), w = Math.max(0, Math.min(1, gy - y0));
      var val = lerp(lerp(v(x0, y0), v(x0 + 1, y0), u), lerp(v(x0, y0 + 1), v(x0 + 1, y0 + 1), u), w);
      fine.push([E("rect", { "class": "a-nlp", x: fx + i * fs, y: fy + j * fs, width: fs, height: fs, "fill-opacity": 0 }, svg), val]);
    } }
    E("rect", { "class": "a-ink", x: fx - 1, y: fy - 1, width: F * fs + 2, height: F * fs + 2 }, svg);
    txt(svg, ox, oy + G * cs + 16, "7", "a-num"); txt(svg, fx, fy + F * fs + 16, "224", "a-num");
    return function (t) {
      var a = ease(seg(t, 0.05, 0.35)), b = ease(seg(t, 0.5, 0.9));
      for (var n = 0; n < coarse.length; n++) {
        var gi = n % G, gj = Math.floor(n / G);
        coarse[n].setAttribute("fill-opacity", 0.9 * a * v(gi, gj));
      }
      arrow.setAttribute("opacity", ease(seg(t, 0.4, 0.55)));
      for (n = 0; n < fine.length; n++) { fine[n][0].setAttribute("fill-opacity", 0.9 * b * fine[n][1]); }
    };
  };

  /* 5. Recadrage : on coupe aux percentiles 1 et 99, puis on etire sur [-1, 1] */
  A.scenes.dsx_rescale = function (svg) {
    var vals = [-0.8, -0.2, 0.0, 0.1, 0.25, 0.3, 0.42, 0.5, 0.6, 0.7, 1.9, 2.6, -1.5], n = vals.length, i;
    var XA = 24, XB = 296, YT = 52, YB = 142, lo = -0.5, hi = 1.05;
    function top(v) { return XA + (v + 2) / 5 * (XB - XA); }
    E("line", { "class": "a-ink", x1: XA, x2: XB, y1: YT + 14, y2: YT + 14 }, svg);
    E("line", { "class": "a-ink", x1: XA, x2: XB, y1: YB + 14, y2: YB + 14 }, svg);
    var l1 = E("line", { "class": "a-dash", x1: top(lo), x2: top(lo), y1: YT - 18, y2: YT + 22 }, svg);
    var l2 = E("line", { "class": "a-dash", x1: top(hi), x2: top(hi), y1: YT - 18, y2: YT + 22 }, svg);
    txt(svg, XA, YB + 32, "-1", "a-num"); txt(svg, XB, YB + 32, "1", "a-num", "end");
    var dots = [];
    for (i = 0; i < n; i++) { dots.push(E("circle", { "class": i % 2 ? "a-nlp" : "a-ana", cx: top(vals[i]), cy: YT, r: 4.5 }, svg)); }
    return function (t) {
      var a = ease(seg(t, 0.1, 0.4)), b = ease(seg(t, 0.55, 0.92));
      l1.setAttribute("opacity", seg(t, 0.05, 0.15)); l2.setAttribute("opacity", seg(t, 0.05, 0.15));
      for (i = 0; i < n; i++) {
        var c = Math.max(lo, Math.min(hi, vals[i])), v1 = lerp(vals[i], c, a);
        var target = XA + (c - lo) / (hi - lo) * (XB - XA);
        dots[i].setAttribute("cx", lerp(top(v1), target, b));
        dots[i].setAttribute("cy", lerp(YT, YB, b));
      }
    };
  };

  /* 6. Retour sur le maillage : maximum par face entre les vues, premier sommet, filtre median */
  A.scenes.dsx_project = function (svg) {
    var F = 6, X0 = 40, DX = 42, i;
    var va = [0.9, 0.3, 0, 0.6, 0, 0], vb = [0.2, 0.7, 0, 0.45, 0, 0.25];
    var face = [], pa = [], pb = [], lnA = [], lnB = [], vert = [], vv = [];
    var YA = 30, YF = 84, YV = 138;
    for (i = 0; i < F; i++) {
      var x = X0 + i * DX;
      pa.push(E("rect", { "class": "a-seg", x: x - 18, y: YA - 8, width: 16, height: 12, rx: 2 }, svg));
      pb.push(E("rect", { "class": "a-ana", x: x + 2, y: YA - 8, width: 16, height: 12, rx: 2 }, svg));
      lnA.push(E("line", { "class": "a-dash", x1: x - 10, y1: YA + 5, x2: x - 4, y2: YF - 10 }, svg));
      lnB.push(E("line", { "class": "a-dash", x1: x + 10, y1: YA + 5, x2: x + 4, y2: YF - 10 }, svg));
      face.push(E("path", { "class": "a-nlp", d: "M" + (x - 18) + " " + (YF + 10) + " L" + (x + 18) + " " + (YF + 10) + " L" + x + " " + (YF - 10) + " Z" }, svg));
    }
    for (i = 0; i <= F; i++) {
      vert.push(E("circle", { "class": "a-acc", cx: X0 - 18 + i * DX, cy: YV, r: 6 }, svg));
      vv.push(0);
    }
    E("line", { "class": "a-ink", x1: X0 - 18, x2: X0 - 18 + F * DX, y1: YV, y2: YV }, svg);
    function med(a) { var s = a.slice().sort(function (p, q) { return p - q; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
    return function (t) {
      var a = ease(seg(t, 0.05, 0.3)), b = ease(seg(t, 0.35, 0.6)), c = ease(seg(t, 0.68, 0.95));
      var fv = [], raw = [], sm = [];
      for (i = 0; i < F; i++) {
        pa[i].setAttribute("fill-opacity", 0.12 + 0.85 * va[i] * a); pb[i].setAttribute("fill-opacity", 0.12 + 0.85 * vb[i] * a);
        lnA[i].setAttribute("opacity", a * (va[i] > 0 ? 1 : 0.25)); lnB[i].setAttribute("opacity", a * (vb[i] > 0 ? 1 : 0.25));
        fv.push(Math.max(va[i], vb[i]));
        face[i].setAttribute("fill-opacity", 0.08 + 0.9 * fv[i] * a);
      }
      for (i = 0; i <= F; i++) { raw.push(i < F ? fv[i] : 0); }
      for (i = 0; i <= F; i++) {
        var nb = [];
        if (i > 0) { nb.push(raw[i - 1]); } if (i > 1) { nb.push(raw[i - 2]); }
        if (i < F) { nb.push(raw[i + 1]); } if (i < F - 1) { nb.push(raw[i + 2]); }
        sm.push(raw[i] > 0 ? raw[i] : med(nb));
      }
      for (i = 0; i <= F; i++) {
        var val = lerp(0, lerp(raw[i], sm[i], c), b);
        vert[i].setAttribute("fill-opacity", 0.1 + 0.9 * val);
        vert[i].setAttribute("r", 5 + 2 * val);
      }
    };
  };
})();
