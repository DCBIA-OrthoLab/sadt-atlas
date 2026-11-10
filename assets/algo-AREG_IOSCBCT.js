/* algo-AREG_IOSCBCT.js : scenes de la page AREG_IOSCBCT (VISOR et legacy).
   Aucune chaine traduisible ici : seulement des symboles et des nombres. Le texte vit dans le HTML. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, txt = A.txt, ease = A.ease, seg = A.seg, lerp = A.lerp;
  function pts(a) { return a.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function rot(p, c, th) {
    var dx = p[0] - c[0], dy = p[1] - c[1], s = Math.sin(th), k = Math.cos(th);
    return [c[0] + k * dx - s * dy, c[1] + s * dx + k * dy];
  }

  /* 1. Le niveau de contour : a mi-chemin entre le plateau de l'email et celui des tissus mous */
  A.scenes.ioscbct_level = function (svg) {
    var X0 = 30, X1 = 300, yS = 140, yE = 50, N = 90, i, line = [];
    function sg(z) { return 1 / (1 + Math.exp(-z)); }
    function prof(x) { return yS + (yE - yS) * (sg((x - 120) / 7) - sg((x - 225) / 7)); }
    for (i = 0; i <= N; i++) { var x = X0 + (X1 - X0) * i / N; line.push([x, prof(x)]); }
    E("line", { "class": "a-ink", x1: X0, x2: X1, y1: 172, y2: 172 }, svg);
    var curve = E("polyline", { "class": "a-ink", fill: "none" }, svg);
    var lS = E("line", { "class": "a-dash", x1: X0, x2: X1, y1: yS, y2: yS }, svg);
    var lE = E("line", { "class": "a-dash", x1: X0, x2: X1, y1: yE, y2: yE }, svg);
    var tS = txt(svg, X1 - 4, yS + 14, "S", "a-label-b", "end"), tE = txt(svg, X1 - 4, yE - 6, "E", "a-label-b", "end");
    var yL = (yS + yE) / 2;
    var lL = E("line", { "class": "a-acc-s", x1: X0, x2: X1, y1: yS, y2: yS }, svg);
    var tL = txt(svg, X0 + 2, yL - 6, "L", "a-label-b");
    var cross = [];
    for (i = 1; i < line.length; i++) {
      if ((line[i - 1][1] - yL) * (line[i][1] - yL) < 0) { cross.push(line[i][0]); }
    }
    var dots = cross.map(function (cx) { return E("circle", { "class": "a-acc", cx: cx, cy: yL, r: 5 }, svg); });
    return function (t) {
      var a = seg(t, 0.02, 0.32), b = seg(t, 0.32, 0.5), c = ease(seg(t, 0.5, 0.75)), d = seg(t, 0.75, 0.9);
      var k = Math.max(2, Math.round(a * line.length));
      curve.setAttribute("points", pts(line.slice(0, k)));
      [lS, lE, tS, tE].forEach(function (n) { n.setAttribute("opacity", b); });
      var y = lerp(yS, yL, c);
      lL.setAttribute("y1", y); lL.setAttribute("y2", y); lL.setAttribute("opacity", c > 0 ? 1 : 0);
      tL.setAttribute("opacity", c > 0.3 ? 1 : 0); tL.setAttribute("y", y - 6);
      dots.forEach(function (n) { n.setAttribute("opacity", d); n.setAttribute("r", 3 + 3 * Math.sin(Math.PI * Math.min(1, d * 1.1))); });
    };
  };

  /* 2. L'ajustement rigide sur les points repères : un couple trop loin est écarté, l'ajustement est refait */
  A.scenes.ioscbct_fit = function (svg) {
    var C = [160, 108], i, a = [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0];
    var Q = a.map(function (v) { return [160 + 92 * Math.sin(v), 150 - 66 * Math.cos(v)]; });
    var noise = [[1, -1], [-1, 1], [0, 0], [1, 1], [-1, -1], [1, 0]];
    var P1 = Q.map(function (q, n) { return [q[0] + noise[n][0], q[1] + noise[n][1]]; });
    P1[2] = [P1[2][0] + 6, P1[2][1] - 24];
    var BAD = 2;
    var poses = [[0.34, 34, -22], [0.05, 3, 4], [0, 0, 0]];
    function place(p, ps) { var r = rot(p, C, ps[0]); return [r[0] + ps[1], r[1] + ps[2]]; }
    var links = Q.map(function () { return E("line", { "class": "a-ink", opacity: 0 }, svg); });
    var fixed = Q.map(function (q) { return E("circle", { "class": "a-acc-s", cx: q[0], cy: q[1], r: 6 }, svg); });
    var mov = Q.map(function () { return E("circle", { "class": "a-seg", r: 4 }, svg); });
    var tag = txt(svg, 0, 0, "> 3", "a-label-b", "middle");
    return function (t) {
      var show = ease(seg(t, 0.03, 0.2)), link = ease(seg(t, 0.2, 0.34));
      var u1 = ease(seg(t, 0.3, 0.5)), drop = ease(seg(t, 0.52, 0.64)), u2 = ease(seg(t, 0.66, 0.92));
      var ps = [0, 1, 2].map(function (k) { return lerp(lerp(poses[0][k], poses[1][k], u1), poses[2][k], u2); });
      for (i = 0; i < Q.length; i++) {
        var p = place(P1[i], ps), bad = i === BAD;
        mov[i].setAttribute("cx", p[0]); mov[i].setAttribute("cy", p[1]);
        mov[i].setAttribute("opacity", show * (bad ? 1 - 0.7 * drop : 1));
        fixed[i].setAttribute("opacity", show);
        links[i].setAttribute("x1", p[0]); links[i].setAttribute("y1", p[1]);
        links[i].setAttribute("x2", Q[i][0]); links[i].setAttribute("y2", Q[i][1]);
        links[i].setAttribute("class", bad && drop > 0.5 ? "a-dash" : "a-ink");
        links[i].setAttribute("opacity", link * (bad ? 1 - 0.55 * drop : 0.9));
        if (bad) { tag.setAttribute("x", (p[0] + Q[i][0]) / 2 + 16); tag.setAttribute("y", (p[1] + Q[i][1]) / 2); }
      }
      tag.setAttribute("opacity", t > 0.34 && t < 0.62 ? 1 : 0);
    };
  };

  /* 3. L'ICP point au plan : seule la composante le long de la normale compte, la surface glisse librement */
  A.scenes.ioscbct_icp = function (svg) {
    var X0 = 18, X1 = 302, N = 142, R = 15, i, k, fx = [], fn = [];
    function fy(x) { return 112 + 15 * Math.sin(x / 24); }
    for (i = 0; i <= N; i++) {
      var x = X0 + (X1 - X0) * i / N, dy = 15 / 24 * Math.cos(x / 24), L = Math.sqrt(1 + dy * dy);
      fx.push([x, fy(x)]); fn.push([dy / L, -1 / L]);
    }
    var M0 = [];
    for (i = 0; i < 26; i++) { var xx = 48 + i * 9; M0.push([xx, fy(xx)]); }
    var C = [160, 112];
    function nearest(p) {
      var b = 0, bd = 1e9;
      for (var j = 0; j < fx.length; j++) { var d = Math.hypot(p[0] - fx[j][0], p[1] - fx[j][1]); if (d < bd) { bd = d; b = j; } }
      return [b, bd];
    }
    var frames = [], cur = M0.map(function (p) { var r = rot(p, C, 0.06); return [r[0] + 13, r[1] + 8]; });
    function snapshot() {
      var m = cur.map(function (p) { var n = nearest(p); return { j: n[0], d: n[1], ok: n[1] < R }; });
      frames.push({ p: cur.map(function (p) { return p.slice(); }), m: m });
      return m;
    }
    for (k = 0; k < 9; k++) {
      var m = snapshot(), S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bv = [0, 0, 0], any = 0;
      for (i = 0; i < cur.length; i++) {
        if (!m[i].ok) { continue; }
        any++;
        var q = fx[m[i].j], n = fn[m[i].j], p = cur[i];
        var cr = (p[0] - C[0]) * n[1] - (p[1] - C[1]) * n[0], row = [cr, n[0], n[1]];
        var res = (p[0] - q[0]) * n[0] + (p[1] - q[1]) * n[1];
        for (var r = 0; r < 3; r++) { bv[r] -= row[r] * res; for (var c = 0; c < 3; c++) { S[r][c] += row[r] * row[c]; } }
      }
      if (any < 3) { break; }
      for (i = 0; i < 3; i++) { S[i][i] += 1e-6; }
      var sol = solve3(S, bv);
      cur = cur.map(function (p) { var r = rot(p, C, sol[0]); return [r[0] + sol[1], r[1] + sol[2]]; });
    }
    snapshot();
    function solve3(Mx, b) {
      var a = Mx.map(function (r, ii) { return r.concat([b[ii]]); }), ii, jj, kk;
      for (ii = 0; ii < 3; ii++) {
        var piv = ii;
        for (jj = ii + 1; jj < 3; jj++) { if (Math.abs(a[jj][ii]) > Math.abs(a[piv][ii])) { piv = jj; } }
        var tmp = a[ii]; a[ii] = a[piv]; a[piv] = tmp;
        for (jj = ii + 1; jj < 3; jj++) { var f = a[jj][ii] / a[ii][ii]; for (kk = ii; kk < 4; kk++) { a[jj][kk] -= f * a[ii][kk]; } }
      }
      var x = [0, 0, 0];
      for (ii = 2; ii >= 0; ii--) { var s = a[ii][3]; for (jj = ii + 1; jj < 3; jj++) { s -= a[ii][jj] * x[jj]; } x[ii] = s / a[ii][ii]; }
      return x;
    }
    E("polyline", { "class": "a-ink", fill: "none", points: pts(fx) }, svg);
    for (i = 0; i <= N; i += 14) {
      E("line", { "class": "a-fine", x1: fx[i][0], y1: fx[i][1], x2: fx[i][0] + 9 * fn[i][0], y2: fx[i][1] + 9 * fn[i][1] }, svg);
    }
    var ring = E("circle", { "class": "a-dash", r: R }, svg);
    var links = M0.map(function () { return E("line", { "class": "a-fine", opacity: 0 }, svg); });
    var dots = M0.map(function () { return E("circle", { "class": "a-seg", r: 3 }, svg); });
    return function (t) {
      var s = t * (frames.length - 1), f = Math.min(frames.length - 2, Math.floor(s)), u = ease(s - f);
      var A0 = frames[f], A1 = frames[f + 1];
      for (i = 0; i < dots.length; i++) {
        var x = lerp(A0.p[i][0], A1.p[i][0], u), y = lerp(A0.p[i][1], A1.p[i][1], u), mm = A0.m[i];
        dots[i].setAttribute("cx", x); dots[i].setAttribute("cy", y);
        dots[i].setAttribute("opacity", mm.ok ? 1 : 0.3);
        links[i].setAttribute("x1", x); links[i].setAttribute("y1", y);
        links[i].setAttribute("x2", fx[mm.j][0]); links[i].setAttribute("y2", fx[mm.j][1]);
        links[i].setAttribute("opacity", mm.ok ? 0.8 : 0);
        if (i === 13) { ring.setAttribute("cx", x); ring.setAttribute("cy", y); }
      }
    };
  };

  /* 4. Le test des normales : un voisin de l'arcade opposee est refuse, il regarde dans l'autre sens */
  A.scenes.ioscbct_normals = function (svg) {
    function U(x) { return 66 + 11 * Math.sin(x / 38); }
    function Lw(x) { return 132 - 9 * Math.sin((x + 20) / 38); }
    var up = [], lo = [], i;
    for (i = 0; i <= 56; i++) { var x = 24 + i * 5; up.push([x, U(x)]); lo.push([x, Lw(x)]); }
    E("polyline", { "class": "a-ink", fill: "none", points: pts(up) }, svg);
    E("polyline", { "class": "a-ink", fill: "none", points: pts(lo) }, svg);
    var px = 168, qU = [px, U(px)], qL = [px, Lw(px)];
    var py0 = 106, py1 = U(px) + 4;
    function arrow(g, x, y, dy, cls) {
      E("line", { "class": cls, x1: x, y1: y, x2: x, y2: y + dy }, g);
      E("path", { "class": cls, d: "M" + (x - 3) + " " + (y + dy - Math.sign(dy) * 5) + " L" + x + " " + (y + dy) + " L" + (x + 3) + " " + (y + dy - Math.sign(dy) * 5) }, g);
    }
    var gU = E("g", {}, svg), gL = E("g", {}, svg), gP = E("g", {}, svg);
    arrow(gU, qU[0], qU[1], 20, "a-ink"); arrow(gL, qL[0], qL[1], -20, "a-ink");
    var ring = E("circle", { "class": "a-dash", cx: px, cy: 0, r: 34 }, svg);
    var pt = E("circle", { "class": "a-seg", cx: px, r: 5 }, gP);
    var np = E("g", {}, svg);
    var lnL = E("line", { "class": "a-dash", x1: px, x2: qL[0], y1: 0, y2: qL[1] }, svg);
    var lnU = E("line", { "class": "a-acc-s", x1: px, x2: qU[0], y1: 0, y2: qU[1] }, svg);
    var xL = txt(svg, px + 16, 128, "-1", "a-label-b"), oU = txt(svg, px + 16, 86, "+1", "a-label-b");
    var nArrow = E("g", {}, np);
    arrow(nArrow, px - 14, 0, 16, "a-seg-s");
    return function (t) {
      var py = lerp(py0, py1, ease(seg(t, 0.72, 0.98)));
      pt.setAttribute("cy", py); ring.setAttribute("cy", py);
      nArrow.setAttribute("transform", "translate(0 " + (py - 0) + ")");
      lnL.setAttribute("y1", py); lnU.setAttribute("y1", py);
      var a = seg(t, 0.12, 0.3), b = seg(t, 0.35, 0.5), c = seg(t, 0.5, 0.68);
      lnL.setAttribute("opacity", a * (1 - 0.6 * (t > 0.5 ? 1 : 0))); xL.setAttribute("opacity", b);
      lnU.setAttribute("opacity", c); oU.setAttribute("opacity", c);
    };
  };
})();
