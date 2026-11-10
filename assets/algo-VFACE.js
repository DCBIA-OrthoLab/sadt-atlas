/* algo-VFACE.js : les scenes des cartes .algo des pages VFACE (VISOR et legacy).
   Aucune chaine traduisible ici, seulement des nombres ; les couleurs sont des classes .a-*.
   Chaque scene est une fonction (svg) -> draw(t), t dans [0, 1]. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;
  function rot(x, y, a, cx, cy) {
    var c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  }

  /* 1. Reechantillonnage a 0,3 mm : meme nombre de voxels, voxels plus petits, le champ se resserre autour du centre */
  A.scenes.vface_resample = function (svg) {
    var cx = 160, cy = 96, NX = 8, NY = 6, C = 28, i, k = 0.55;
    E("rect", { "class": "a-dash", x: cx - NX * C / 2, y: cy - NY * C / 2, width: NX * C, height: NY * C }, svg);
    var g = E("g", {}, svg), lines = [];
    for (i = 0; i <= NX; i++) { lines.push(E("line", { "class": "a-ink", y1: 0, y2: 0, x1: 0, x2: 0 }, g)); }
    for (i = 0; i <= NY; i++) { lines.push(E("line", { "class": "a-ink", y1: 0, y2: 0, x1: 0, x2: 0 }, g)); }
    var box = E("rect", { "class": "a-acc-s", rx: 2 }, svg);
    var mark = E("circle", { "class": "a-acc", cx: cx, cy: cy, r: 3 }, svg);
    return function (t) {
      var u = ease(seg(t, 0.25, 0.75)), s = lerp(1, k, u), c = C * s, w = NX * c, h = NY * c;
      for (i = 0; i <= NX; i++) { var l = lines[i]; l.setAttribute("x1", cx - w / 2 + i * c); l.setAttribute("x2", cx - w / 2 + i * c); l.setAttribute("y1", cy - h / 2); l.setAttribute("y2", cy + h / 2); }
      for (i = 0; i <= NY; i++) { var m = lines[NX + 1 + i]; m.setAttribute("y1", cy - h / 2 + i * c); m.setAttribute("y2", cy - h / 2 + i * c); m.setAttribute("x1", cx - w / 2); m.setAttribute("x2", cx + w / 2); }
      box.setAttribute("x", cx - w / 2); box.setAttribute("y", cy - h / 2); box.setAttribute("width", w); box.setAttribute("height", h);
      box.setAttribute("opacity", u);
      mark.setAttribute("opacity", 1);
    };
  };

  /* 2. Orientation : les reperes du patient sont amenes sur ceux de la reference, le plan sagittal tombe sur x = 0 */
  A.scenes.vface_orient = function (svg) {
    var cx = 160, cy = 98, i;
    var ref = [[0, -58], [-30, -36], [30, -36], [-44, 4], [44, 4], [-22, 46], [22, 46], [0, 62]];
    E("line", { "class": "a-dash", x1: cx, x2: cx, y1: 18, y2: 180 }, svg);
    var gold = [], pat = [], lns = [];
    for (i = 0; i < ref.length; i++) { gold.push(E("circle", { "class": "a-ink", cx: cx + ref[i][0], cy: cy + ref[i][1], r: 4.5 }, svg)); }
    for (i = 0; i < ref.length; i++) { lns.push(E("line", { "class": "a-dash", x1: 0, y1: 0, x2: 0, y2: 0 }, svg)); }
    var plane = E("line", { "class": "a-acc-s", x1: cx, x2: cx, y1: 18, y2: 180 }, svg);
    for (i = 0; i < ref.length; i++) { pat.push(E("circle", { "class": "a-acc", r: 4.5 }, svg)); }
    return function (t) {
      var u = ease(seg(t, 0.2, 0.8)), a = 0.38 * (1 - u), ox = 34 * (1 - u), oy = -14 * (1 - u);
      for (i = 0; i < ref.length; i++) {
        var p = rot(cx + ref[i][0] + 3 * Math.sin(i * 2.3) * (1 - u), cy + ref[i][1], a, cx, cy);
        pat[i].setAttribute("cx", p[0] + ox); pat[i].setAttribute("cy", p[1] + oy);
        lns[i].setAttribute("x1", p[0] + ox); lns[i].setAttribute("y1", p[1] + oy);
        lns[i].setAttribute("x2", cx + ref[i][0]); lns[i].setAttribute("y2", cy + ref[i][1]);
        lns[i].setAttribute("opacity", 0.8 * (1 - u));
      }
      var q1 = rot(cx, 18, a, cx, cy), q2 = rot(cx, 180, a, cx, cy);
      plane.setAttribute("x1", q1[0] + ox); plane.setAttribute("y1", q1[1] + oy);
      plane.setAttribute("x2", q2[0] + ox); plane.setAttribute("y2", q2[1] + oy);
    };
  };

  /* 3. Le miroir : la tete se retourne autour du plan x = 0, un repere lateral tombe sur son homologue de l'autre cote */
  A.scenes.vface_mirror = function (svg) {
    var cx = 160, cy = 98;
    var pts = [[-6, -62], [30, -52], [44, -20], [40, 18], [52, 44], [22, 66], [0, 72]];
    function shape(sx, cls, extra) {
      var d = "M" + (cx - 0) + " " + (cy + pts[0][1]);
      for (var i = 1; i < pts.length; i++) { d += " L" + (cx + sx * pts[i][0]) + " " + (cy + pts[i][1]); }
      return E("path", { "class": cls, d: d, fill: "none" }, svg);
    }
    var base = E("path", { "class": "a-ink", d: "" }, svg), flip = E("path", { "class": "a-acc-s", d: "" }, svg);
    function setPath(el, sx) {
      var d = "M" + (cx + sx * pts[0][0]) + " " + (cy + pts[0][1]);
      for (var i = 1; i < pts.length; i++) { d += " L" + (cx + sx * pts[i][0]) + " " + (cy + pts[i][1]); }
      el.setAttribute("d", d);
    }
    setPath(base, 1);
    E("line", { "class": "a-dash", x1: cx, x2: cx, y1: 16, y2: 182 }, svg);
    var gr = E("circle", { "class": "a-ink", cx: cx + 52, cy: cy + 44, r: 4.5 }, svg);
    var gl = E("circle", { "class": "a-seg", cx: cx - 55, cy: cy + 40, r: 4.5 }, svg);
    var gm = E("circle", { "class": "a-acc", r: 4.5 }, svg);
    var pair = E("line", { "class": "a-dash" }, svg);
    return function (t) {
      var u = ease(seg(t, 0.15, 0.6)), sx = Math.cos(Math.PI * u), b = ease(seg(t, 0.65, 0.9));
      setPath(flip, sx);
      gm.setAttribute("cx", cx + sx * 52); gm.setAttribute("cy", cy + 44);
      pair.setAttribute("x1", cx + sx * 52); pair.setAttribute("y1", cy + 44); pair.setAttribute("x2", cx - 55); pair.setAttribute("y2", cy + 40);
      pair.setAttribute("opacity", b);
      gl.setAttribute("opacity", 0.4 + 0.6 * b);
    };
  };

  /* 4. Recalage region par region : on aligne le miroir sur le haut du crane, puis sur la mandibule ; la region choisie devient symetrique */
  A.scenes.vface_register = function (svg) {
    var cx = 160, i;
    var up = [[-38, 44], [0, 28], [38, 44]], lo = [[-34, 130], [0, 152], [34, 130]];
    var shiftLo = 16;
    E("path", { "class": "a-ink", d: "M" + (cx - 52) + " 66 Q" + cx + " 6 " + (cx + 52) + " 66" }, svg);
    E("path", { "class": "a-ink", d: "M" + (cx - 40) + " 120 Q" + cx + " 176 " + (cx + 40) + " 120" }, svg);
    var origin = [], mov = [], lines = [], i2;
    var all = up.concat(lo);
    for (i = 0; i < all.length; i++) { origin.push(E("circle", { "class": "a-ink", cx: cx + all[i][0] + (i >= 3 ? shiftLo : 0), cy: all[i][1], r: 4 }, svg)); }
    for (i = 0; i < all.length; i++) { lines.push(E("line", { "class": "a-dash" }, svg)); }
    var gm = E("g", {}, svg);
    var cu = E("path", { "class": "a-seg-s", d: "M" + (cx - 52) + " 66 Q" + cx + " 6 " + (cx + 52) + " 66" }, gm);
    var cl = E("path", { "class": "a-seg-s", d: "M" + (cx - 40) + " 120 Q" + cx + " 176 " + (cx + 40) + " 120" }, gm);
    for (i = 0; i < all.length; i++) { mov.push(E("circle", { "class": "a-seg", cx: cx + all[i][0], cy: all[i][1], r: 4 }, gm)); }
    var tag = [E("rect", { "class": "a-acc-s", x: cx - 60, y: 12, width: 120, height: 70, rx: 4 }, svg), E("rect", { "class": "a-acc-s", x: cx - 60, y: 108, width: 120, height: 76, rx: 4 }, svg)];
    return function (t) {
      var a = ease(seg(t, 0.08, 0.3)), b = ease(seg(t, 0.55, 0.8));
      // decalage de depart (-12, 9) ; alignement sur le haut (0) ; puis sur la mandibule (shiftLo)
      var dx = lerp(lerp(-12, 0, a), shiftLo, b), dy = lerp(lerp(9, 0, a), 0, b);
      gm.setAttribute("transform", "translate(" + dx + " " + dy + ")");
      for (i = 0; i < all.length; i++) {
        lines[i].setAttribute("x1", cx + all[i][0] + dx); lines[i].setAttribute("y1", all[i][1] + dy);
        lines[i].setAttribute("x2", cx + all[i][0] + (i >= 3 ? shiftLo : 0)); lines[i].setAttribute("y2", all[i][1]);
      }
      tag[0].setAttribute("opacity", a * (1 - b)); tag[1].setAttribute("opacity", b);
    };
  };

  /* 5. Un point, trois reperes : base du crane, scan centre, maxillaire ; on passe de l'un a l'autre sans nouvelle recherche */
  A.scenes.vface_derive = function (svg) {
    var ys = 98, xs = [52, 160, 268], ang = [-0.42, 0, 0.5], i, heads = [];
    var P = [-12, -10];
    for (i = 0; i < 3; i++) {
      var g = E("g", { transform: "translate(" + xs[i] + " " + ys + ")" }, svg);
      var ax = E("g", { transform: "rotate(" + (ang[i] * 180 / Math.PI) + ")" }, g);
      E("path", { "class": "a-ink", d: "M-34 0 H34 M0 -34 V34" }, ax);
      E("path", { "class": "a-ink", d: "M30 -4 L35 0 L30 4 M-4 -30 L0 -35 L4 -30" }, ax);
      var h = E("g", {}, g);
      E("ellipse", { "class": "a-soft", cx: 0, cy: 2, rx: 17, ry: 23, "fill-opacity": 0.14 }, h);
      E("ellipse", { "class": "a-ink", cx: 0, cy: 2, rx: 17, ry: 23 }, h);
      E("circle", { "class": "a-acc", cx: P[0], cy: P[1], r: 4.5 }, h);
      heads.push(g);
    }
    var ar1 = E("path", { "class": "a-ink", d: "M92 98 H122 M117 94 L123 98 L117 102" }, svg);
    var ar2 = E("path", { "class": "a-ink", d: "M198 98 H228 M223 94 L229 98 L223 102" }, svg);
    var ring = E("circle", { "class": "a-acc-s", r: 12 }, svg);
    return function (t) {
      var a = seg(t, 0.05, 0.12), b = ease(seg(t, 0.3, 0.45)), c = ease(seg(t, 0.62, 0.77));
      for (i = 0; i < 3; i++) {
        var local = i === 0 ? 1 : (i === 1 ? b : c);
        heads[i].setAttribute("opacity", 0.25 + 0.75 * local);
      }
      ar1.setAttribute("opacity", b); ar2.setAttribute("opacity", c);
      var k = t < 0.5 ? 0 : (t < 0.85 ? 1 : 2);
      ring.setAttribute("cx", xs[k] + P[0]); ring.setAttribute("cy", ys + P[1]);
      ring.setAttribute("opacity", a);
    };
  };

  /* 6. Une distance entre deux reperes : le vecteur et ses composantes */
  A.scenes.vface_dist = function (svg) {
    var p = [88, 136], q = [226, 62];
    E("path", { "class": "a-ink", d: "M30 160 H290 M30 160 V28" }, svg);
    var legX = E("line", { "class": "a-dash", x1: p[0], y1: p[1], x2: q[0], y2: p[1] }, svg);
    var legY = E("line", { "class": "a-dash", x1: q[0], y1: p[1], x2: q[0], y2: q[1] }, svg);
    var vec = E("line", { "class": "a-acc-s", x1: p[0], y1: p[1], x2: p[0], y2: p[1] }, svg);
    E("circle", { "class": "a-seg", cx: p[0], cy: p[1], r: 5.5 }, svg);
    var qd = E("circle", { "class": "a-ana", cx: q[0], cy: q[1], r: 5.5 }, svg);
    var tip = E("circle", { "class": "a-acc", r: 3.5 }, svg);
    return function (t) {
      var a = ease(seg(t, 0.1, 0.5)), b = ease(seg(t, 0.55, 0.85));
      var x = lerp(p[0], q[0], a), y = lerp(p[1], q[1], a);
      vec.setAttribute("x2", x); vec.setAttribute("y2", y);
      tip.setAttribute("cx", x); tip.setAttribute("cy", y);
      legX.setAttribute("opacity", b); legY.setAttribute("opacity", b);
      qd.setAttribute("opacity", 0.35 + 0.65 * a);
    };
  };

  /* 7. Un angle : deux droites, on garde l'angle entre elles ; avec un sommet commun, on prend le supplement */
  A.scenes.vface_angle = function (svg) {
    var ox = 120, oy = 120, L = 100, i;
    var u = E("line", { "class": "a-seg-s", x1: ox, y1: oy, x2: ox + L, y2: oy, "stroke-width": 2.6 }, svg);
    var v = E("line", { "class": "a-ana-s", x1: ox, y1: oy, x2: ox, y2: oy, "stroke-width": 2.6 }, svg);
    var tail = E("line", { "class": "a-dash", x1: ox, y1: oy, x2: ox, y2: oy }, svg);
    E("circle", { "class": "a-ink", cx: ox, cy: oy, r: 3.5 }, svg);
    var arc = E("path", { "class": "a-acc-s", d: "" }, svg), arc2 = E("path", { "class": "a-nlp-s", d: "" }, svg);
    var TH = 0.84;
    function arcPath(a0, a1, r) {
      var x0 = ox + r * Math.cos(a0), y0 = oy - r * Math.sin(a0), x1 = ox + r * Math.cos(a1), y1 = oy - r * Math.sin(a1);
      return "M" + x0 + " " + y0 + " A" + r + " " + r + " 0 " + (Math.abs(a1 - a0) > Math.PI ? 1 : 0) + " 0 " + x1 + " " + y1;
    }
    return function (t) {
      var a = ease(seg(t, 0.1, 0.5)), b = ease(seg(t, 0.62, 0.9)), th = TH * a;
      u.setAttribute("x2", ox + L);
      v.setAttribute("x2", ox + L * Math.cos(th)); v.setAttribute("y2", oy - L * Math.sin(th));
      tail.setAttribute("x2", ox - L * 0.55); tail.setAttribute("y2", oy); tail.setAttribute("opacity", b);
      arc.setAttribute("d", th > 0.02 ? arcPath(0, th, 38) : "");
      arc2.setAttribute("d", b > 0.02 ? arcPath(th, Math.PI, 56) : ""); arc2.setAttribute("opacity", b);
      arc.setAttribute("opacity", 1 - 0.55 * b);
    };
  };

  /* 8. Les arbres de decision : le patient descend dans chaque arbre, les valeurs des feuilles s'additionnent */
  A.scenes.vface_trees = function (svg) {
    var tx = [58, 160, 262], leaf = [[-0.9, 0.7], [0.4, -0.6], [0.5, -0.3]], pick = [1, 0, 0], i;
    var X0 = 40, X1 = 280, XM = 160, YA = 168;
    var balls = [], tot = 0, steps = [];
    for (i = 0; i < 3; i++) {
      E("path", { "class": "a-ink", d: "M" + tx[i] + " 22 L" + (tx[i] - 24) + " 62 M" + tx[i] + " 22 L" + (tx[i] + 24) + " 62" }, svg);
      E("circle", { "class": "a-cell", cx: tx[i], cy: 22, r: 5 }, svg);
      E("rect", { "class": "a-cell", x: tx[i] - 32, y: 62, width: 16, height: 12, rx: 2 }, svg);
      E("rect", { "class": "a-cell", x: tx[i] + 16, y: 62, width: 16, height: 12, rx: 2 }, svg);
      steps.push(tot); tot += leaf[i][pick[i]];
    }
    steps.push(tot);
    E("line", { "class": "a-ink", x1: X0 - 12, x2: X1 + 12, y1: YA, y2: YA }, svg);
    E("line", { "class": "a-dash", x1: XM, x2: XM, y1: YA - 14, y2: YA + 14 }, svg);
    var ball = E("circle", { "class": "a-acc", r: 5.5 }, svg);
    var mark = E("circle", { "class": "a-nlp", cy: YA, r: 6.5 }, svg);
    var stepbar = E("line", { "class": "a-nlp-s", y1: YA - 12, y2: YA - 12, "stroke-width": 3 }, svg);
    function sx(v) { return XM + v * 95; }
    return function (t) {
      var s = Math.min(2.999, t * 3.2), k = Math.floor(s), u = ease(Math.min(1, (s - k) * 1.5));
      var x0 = tx[k], x1 = tx[k] + (pick[k] ? 24 : -24);
      var dsc = ease(seg(s - k, 0, 0.6));
      ball.setAttribute("cx", lerp(x0, x1, dsc)); ball.setAttribute("cy", lerp(22, 68, dsc));
      ball.setAttribute("opacity", t > 0.95 ? 0 : 1);
      var from = steps[k], to = steps[k + 1], now = lerp(from, to, u);
      mark.setAttribute("cx", sx(now));
      stepbar.setAttribute("x1", sx(from)); stepbar.setAttribute("x2", sx(now));
    };
  };

  /* 9. Carte de chaleur : pour chaque sommet de la surface de reference, la distance signee a la surface comparee */
  A.scenes.vface_heat = function (svg) {
    var n = 15, i, base = [], cmp = [], dots = [], lns = [];
    function by(x) { return 112 + 18 * Math.sin((x - 30) / 52); }
    function cy(x) { return by(x) + 15 * Math.sin((x - 30) / 34 + 0.9) - 4; }
    var d1 = "M30 " + by(30), d2 = "M30 " + cy(30);
    for (i = 1; i <= 52; i++) { var x = 30 + i * 5; d1 += " L" + x + " " + by(x); d2 += " L" + x + " " + cy(x); }
    E("path", { "class": "a-ink", d: d1, "stroke-width": 2 }, svg);
    var other = E("path", { "class": "a-dash", d: d2 }, svg);
    for (i = 0; i < n; i++) {
      var x = 42 + i * 17.4, d = by(x) - cy(x);
      lns.push(E("line", { "class": "a-dash", x1: x, y1: by(x), x2: x, y2: cy(x) }, svg));
      dots.push([E("circle", { "class": d > 0 ? "a-nlp" : "a-seg", cx: x, cy: by(x), r: 5 }, svg), Math.min(1, Math.abs(d) / 16)]);
    }
    return function (t) {
      var a = ease(seg(t, 0.12, 0.4)), b = ease(seg(t, 0.45, 0.85));
      other.setAttribute("opacity", a);
      for (i = 0; i < n; i++) {
        lns[i].setAttribute("opacity", a * (1 - b * 0.7));
        dots[i][0].setAttribute("fill-opacity", 0.12 + 0.88 * b * dots[i][1]);
      }
    };
  };
})();
