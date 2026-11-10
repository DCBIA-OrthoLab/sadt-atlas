/* algo-FlexReg.js : scenes de la page FlexReg (VISOR et legacy).
   Aucune chaine traduisible ici : seulement des symboles et des nombres. Le texte vit dans le HTML. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, txt = A.txt, ease = A.ease, seg = A.seg, lerp = A.lerp;
  function pts(a) { return a.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function rot(p, c, th) {
    var dx = p[0] - c[0], dy = p[1] - c[1], s = Math.sin(th), k = Math.cos(th);
    return [c[0] + k * dx - s * dy, c[1] + s * dx + k * dy];
  }

  /* Les quatre centroides des dents (vue de dessus, l'avant en haut) */
  var AR = [124, 62], AL = [196, 62], PR = [78, 146], PL = [242, 146];

  /* 1. Les coins du papillon : combinaison affine du centroide propre et du centroide oppose */
  A.scenes.flexreg_corners = function (svg) {
    var arch = [], i;
    for (i = 0; i <= 24; i++) {
      var s = i / 24, x = lerp(PR[0] - 10, PL[0] + 10, s);
      arch.push([x, 46 + 120 * Math.pow(2 * s - 1, 2) * 0.9]);
    }
    E("polyline", { "class": "a-fine", fill: "none", points: pts(arch) }, svg);
    var cs = [AR, AL, PR, PL].map(function (c) { return E("circle", { "class": "a-acc-s", cx: c[0], cy: c[1], r: 7 }, svg); });
    var quad = E("polygon", { "class": "a-acc-s", fill: "none" }, svg);
    var corners = [0, 1, 2, 3].map(function () { return E("circle", { "class": "a-acc", r: 4.5 }, svg); });
    var SX = 70, SW = 180, SY = 182;
    E("line", { "class": "a-ink", x1: SX, x2: SX + SW, y1: SY, y2: SY }, svg);
    var knob = E("circle", { "class": "a-seg", cy: SY, r: 5 }, svg);
    txt(svg, SX - 6, SY + 4, "0", "a-num", "end"); txt(svg, SX + SW + 6, SY + 4, "1", "a-num");
    var lab = txt(svg, 160, 20, "", "a-label-b", "middle");
    return function (t) {
      var rho = ease(seg(t, 0.06, 0.6)), adj = ease(seg(t, 0.68, 0.95)) * 14;
      var r = (1 - rho) / 2;
      var cen = [[AR[0], AR[1] - adj], [AL[0], AL[1] - adj], [PR[0], PR[1] + adj], [PL[0], PL[1] + adj]];
      var ar = [(1 - r) * cen[0][0] + r * cen[1][0], (1 - r) * cen[0][1] + r * cen[1][1]];
      var al = [(1 - r) * cen[1][0] + r * cen[0][0], (1 - r) * cen[1][1] + r * cen[0][1]];
      var pr = [(1 - r) * cen[2][0] + r * cen[3][0], (1 - r) * cen[2][1] + r * cen[3][1]];
      var pl = [(1 - r) * cen[3][0] + r * cen[2][0], (1 - r) * cen[3][1] + r * cen[2][1]];
      [ar, al, pl, pr].forEach(function (p, k) { corners[k].setAttribute("cx", p[0]); corners[k].setAttribute("cy", p[1]); });
      cs.forEach(function (n, k) { n.setAttribute("cx", cen[k][0]); n.setAttribute("cy", cen[k][1]); });
      quad.setAttribute("points", pts([ar, al, pl, pr]));
      knob.setAttribute("cx", SX + SW * rho);
      lab.textContent = "r = " + r.toFixed(2);
    };
  };

  /* 2. Le contour : deux segments et deux Beziers quadratiques, symetrises par rapport a leur corde */
  A.scenes.flexreg_outline = function (svg) {
    var M = [(PR[0] + PL[0]) / 2, PR[1]];
    function bez(P0, P1, P2, n) {
      var o = [], i;
      for (i = 0; i <= n; i++) { var s = i / n; o.push([(1 - s) * (1 - s) * P0[0] + 2 * (1 - s) * s * P1[0] + s * s * P2[0], (1 - s) * (1 - s) * P0[1] + 2 * (1 - s) * s * P1[1] + s * s * P2[1]]); }
      return o;
    }
    function reflect(B, P0, P2) {
      var dx = P2[0] - P0[0], dy = P2[1] - P0[1], L = Math.hypot(dx, dy) + 1e-6, ux = dx / L, uy = dy / L;
      return B.map(function (p) {
        var pr = (p[0] - P0[0]) * ux + (p[1] - P0[1]) * uy, qx = P0[0] + pr * ux, qy = P0[1] + pr * uy;
        return [2 * qx - p[0], 2 * qy - p[1]];
      });
    }
    var BR = bez(PR, M, AR, 30), BL = bez(PL, M, AL, 30), SR = reflect(BR, PR, AR), SL = reflect(BL, PL, AL);
    var segA = E("line", { "class": "a-acc-s", x1: AL[0], y1: AL[1], x2: AR[0], y2: AR[1] }, svg);
    var segP = E("line", { "class": "a-acc-s", x1: PL[0], y1: PL[1], x2: PR[0], y2: PR[1] }, svg);
    var rawR = E("polyline", { "class": "a-dash", fill: "none" }, svg), rawL = E("polyline", { "class": "a-dash", fill: "none" }, svg);
    var curR = E("polyline", { "class": "a-acc-s", fill: "none" }, svg), curL = E("polyline", { "class": "a-acc-s", fill: "none" }, svg);
    [AR, AL, PR, PL].forEach(function (c) { E("circle", { "class": "a-acc", cx: c[0], cy: c[1], r: 4 }, svg); });
    E("circle", { "class": "a-seg", cx: M[0], cy: M[1], r: 3.5 }, svg);
    return function (t) {
      var a = seg(t, 0.02, 0.2), b = seg(t, 0.2, 0.42), m = ease(seg(t, 0.5, 0.85));
      segA.setAttribute("opacity", a); segP.setAttribute("opacity", a);
      var k = Math.max(2, Math.round(b * BR.length));
      rawR.setAttribute("points", pts(BR.slice(0, k))); rawL.setAttribute("points", pts(BL.slice(0, k)));
      rawR.setAttribute("opacity", 1 - 0.7 * m); rawL.setAttribute("opacity", 1 - 0.7 * m);
      var kr = m > 0 ? BR.length : 0;
      curR.setAttribute("points", pts(BR.slice(0, kr).map(function (p, j) { return [lerp(p[0], SR[j][0], m), lerp(p[1], SR[j][1], m)]; })));
      curL.setAttribute("points", pts(BL.slice(0, kr).map(function (p, j) { return [lerp(p[0], SL[j][0], m), lerp(p[1], SL[j][1], m)]; })));
    };
  };

  /* 3. Le marquage puis le remplissage : une inondation de proche en proche, arretee par le contour */
  A.scenes.flexreg_fill = function (svg) {
    var NX = 24, NY = 14, S = 11.5, OX = 22, OY = 22, i, j, cells = [];
    var cx = OX + NX * S / 2 - S / 2, cy = OY + NY * S / 2 - S / 2;
    function outlineDist(x, y) {
      var a = 100, b = 58, ang = Math.atan2((y - cy) / b, (x - cx) / a), ex = cx + a * Math.cos(ang), ey = cy + b * Math.sin(ang);
      return Math.hypot(x - ex, y - ey);
    }
    var mark = [], fill = [], dist = [], maxd = 1;
    for (j = 0; j < NY; j++) { mark[j] = []; fill[j] = []; dist[j] = []; for (i = 0; i < NX; i++) { var x = OX + i * S, y = OY + j * S; mark[j][i] = outlineDist(x, y) < 6.2; dist[j][i] = -1; } }
    var si = Math.round(NX / 2), sj = Math.round(NY / 2), q = [[si, sj]];
    dist[sj][si] = 0;
    while (q.length) {
      var c = q.shift(), nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var n = 0; n < 4; n++) {
        var ni = c[0] + nb[n][0], nj = c[1] + nb[n][1];
        if (ni < 0 || nj < 0 || ni >= NX || nj >= NY || mark[nj][ni] || dist[nj][ni] >= 0) { continue; }
        dist[nj][ni] = dist[c[1]][c[0]] + 1; maxd = Math.max(maxd, dist[nj][ni]); q.push([ni, nj]);
      }
    }
    for (j = 0; j < NY; j++) { for (i = 0; i < NX; i++) {
      var node = E("circle", { "class": "a-soft", cx: OX + i * S, cy: OY + j * S, r: 2, "fill-opacity": 0.2 }, svg);
      cells.push({ i: i, j: j, n: node, ang: Math.atan2(OY + j * S - cy, OX + i * S - cx) });
    } }
    var start = E("circle", { "class": "a-seg", cx: OX + si * S, cy: OY + sj * S, r: 4.5 }, svg);
    return function (t) {
      var a = seg(t, 0.02, 0.3), b = seg(t, 0.3, 0.95);
      cells.forEach(function (c) {
        var isMark = mark[c.j][c.i], d = dist[c.j][c.i], cls = "a-soft", op = 0.2, r = 2;
        if (isMark && a * 2 * Math.PI > c.ang + Math.PI) { cls = "a-acc"; op = 1; r = 3; }
        else if (d >= 0 && d / maxd <= b) { cls = "a-acc"; op = 0.45; r = 3; }
        c.n.setAttribute("class", cls); c.n.setAttribute("fill-opacity", op); c.n.setAttribute("r", r);
      });
      start.setAttribute("opacity", a > 0.9 ? 1 : 0);
    };
  };

  /* 4. L'ICP rigide sur la plaque : on part des centroides, puis on alterne voisins et ajustement */
  A.scenes.flexreg_icp = function (svg) {
    var i, K = 11, T = [], B = [];
    function shape(u) { return [160 + 96 * Math.cos(u), 98 + 50 * Math.sin(u) + 14 * Math.cos(2 * u)]; }
    for (i = 0; i < 44; i++) { T.push(shape(i / 44 * 2 * Math.PI + 0.07)); }
    var C0 = [160, 98];
    for (i = 0; i < 36; i++) { var p = rot(shape(i / 36 * 2 * Math.PI), C0, 0.4); B.push([p[0] + 20, p[1] + 14]); }
    function centroid(a) { var c = [0, 0]; a.forEach(function (p) { c[0] += p[0] / a.length; c[1] += p[1] / a.length; }); return c; }
    var tc = centroid(T), cur = B.map(function (p) { return p.slice(); }), frames = [];
    function near(p) { var b = 0, bd = 1e9; for (var j = 0; j < T.length; j++) { var d = Math.hypot(p[0] - T[j][0], p[1] - T[j][1]); if (d < bd) { bd = d; b = j; } } return b; }
    function snap() { frames.push({ p: cur.map(function (p) { return p.slice(); }), m: cur.map(near) }); }
    snap();
    var mc = centroid(cur);
    cur = cur.map(function (p) { return [p[0] + tc[0] - mc[0], p[1] + tc[1] - mc[1]]; });
    snap();
    for (var k = 0; k < K; k++) {
      var m = frames[frames.length - 1].m, qs = m.map(function (j) { return T[j]; });
      var pc = centroid(cur), qc = centroid(qs), s1 = 0, s2 = 0;
      cur.forEach(function (p, n) {
        var ax = p[0] - pc[0], ay = p[1] - pc[1], bx = qs[n][0] - qc[0], by = qs[n][1] - qc[1];
        s1 += ax * by - ay * bx; s2 += ax * bx + ay * by;
      });
      var th = Math.atan2(s1, s2);
      cur = cur.map(function (p) { var r = rot(p, pc, th); return [r[0] + qc[0] - pc[0], r[1] + qc[1] - pc[1]]; });
      snap();
    }
    T.forEach(function (p) { E("circle", { "class": "a-acc-s", cx: p[0], cy: p[1], r: 3.2 }, svg); });
    var links = B.map(function () { return E("line", { "class": "a-fine", opacity: 0 }, svg); });
    var dots = B.map(function () { return E("circle", { "class": "a-seg", r: 2.6 }, svg); });
    return function (t) {
      var s = t * (frames.length - 1), f = Math.min(frames.length - 2, Math.floor(s)), u = ease(s - f);
      for (i = 0; i < dots.length; i++) {
        var x = lerp(frames[f].p[i][0], frames[f + 1].p[i][0], u), y = lerp(frames[f].p[i][1], frames[f + 1].p[i][1], u), q = T[frames[f].m[i]];
        dots[i].setAttribute("cx", x); dots[i].setAttribute("cy", y);
        links[i].setAttribute("x1", x); links[i].setAttribute("y1", y); links[i].setAttribute("x2", q[0]); links[i].setAttribute("y2", q[1]);
        links[i].setAttribute("opacity", f === 0 ? 0 : 0.7);
      }
    };
  };

  /* 5. Le changement de repere de la matrice : conjuguer par diag(-1,-1,1) revient a tourner de 180 degres autour de z */
  A.scenes.flexreg_flip = function (svg) {
    var O = [160, 98];
    E("line", { "class": "a-ink", x1: 40, x2: 280, y1: O[1], y2: O[1] }, svg);
    E("line", { "class": "a-ink", x1: O[0], x2: O[0], y1: 12, y2: 184 }, svg);
    txt(svg, 276, O[1] - 6, "x", "a-label-b", "end"); txt(svg, O[0] + 6, 22, "y", "a-label-b");
    var base = [[30, 24], [96, 24], [96, 40], [48, 40], [48, 54], [78, 54], [78, 68], [48, 68], [48, 92], [30, 92]];
    function q0(p) { return [(p[0] - 10) * 0.8, p[1] * 0.8]; }
    var Q = base.map(q0);
    var poly = E("polygon", { "class": "a-seg", "fill-opacity": 0.85 }, svg);
    E("polygon", { "class": "a-dash", fill: "none", points: pts(Q.map(function (p) { return [O[0] - p[0], O[1] + p[1]]; })) }, svg);
    var tA = txt(svg, O[0] + 100, O[1] - 70, "LPS", "a-label-b", "middle"), tB = txt(svg, O[0] - 100, O[1] + 80, "RAS", "a-label-b", "middle");
    return function (t) {
      var th = Math.PI * ease(seg(t, 0.22, 0.8)), c = Math.cos(th), s = Math.sin(th);
      poly.setAttribute("points", pts(Q.map(function (p) { return [O[0] + c * p[0] - s * p[1], O[1] - (s * p[0] + c * p[1])]; })));
      tA.setAttribute("opacity", t < 0.5 ? 1 : 0.3); tB.setAttribute("opacity", t > 0.5 ? 1 : 0.3);
    };
  };

  /* 6. La bande muqueuse (legacy) : elle croit le long de la surface depuis la ligne, plus haute la ou la hauteur l'est */
  A.scenes.flexreg_band = function (svg) {
    var i, N = 15, L = [], hs = [], X0 = 26, X1 = 294, H = [5, 8, 11, 8, 14, 17, 11];
    function y(x) { return 108 - 38 * Math.sin((x - X0) / (X1 - X0) * Math.PI); }
    for (i = 0; i < N; i++) { var x = X0 + (X1 - X0) * i / (N - 1); L.push([x, y(x)]); }
    for (i = 0; i < N; i++) { var s = i / (N - 1) * (H.length - 1), k = Math.min(H.length - 2, Math.floor(s)); hs.push(lerp(H[k], H[k + 1], s - k)); }
    var band = E("polygon", { "class": "a-acc", "fill-opacity": 0.25 }, svg);
    E("polyline", { "class": "a-ink", fill: "none", points: pts(L) }, svg);
    var seeds = L.map(function (p) { return E("circle", { "class": "a-acc", cx: p[0], cy: p[1], r: 2.6 }, svg); });
    var rings = L.map(function (p) { return E("line", { "class": "a-dash", x1: p[0], x2: p[0] }, svg); });
    return function (t) {
      var g = ease(seg(t, 0.15, 0.85)), top = [], bot = [];
      L.forEach(function (p, n) { top.push([p[0], p[1] - hs[n] * 2.2 * g]); bot.unshift([p[0], p[1] + hs[n] * 2.2 * g]); });
      band.setAttribute("points", pts(top.concat(bot)));
      rings.forEach(function (r, n) { r.setAttribute("y1", L[n][1] - hs[n] * 2.2 * g); r.setAttribute("y2", L[n][1] + hs[n] * 2.2 * g); r.setAttribute("opacity", g > 0 ? 0.6 : 0); });
      seeds.forEach(function (s) { s.setAttribute("opacity", 1); });
    };
  };
})();
