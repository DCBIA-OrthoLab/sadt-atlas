/* Scenes de ASO (VISOR et legacy). Aucune chaine traduisible : des nombres seulement.
   Les calculs 3D sont des vrais calculs (Rodrigues, produit vectoriel, ICP), les positions sont illustratives. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;
  var PI = Math.PI;

  /* ---- petits outils de vecteurs 3D ---- */
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function unit(a) { var l = len(a) || 1; return mul(a, 1 / l); }
  /* la matrice du texte : alpha = cos(theta/2), (beta, gamma, delta) = -a sin(theta/2) */
  function rodrigues(axis, theta) {
    var a = unit(axis), s = Math.sin(theta / 2), al = Math.cos(theta / 2), be = -a[0] * s, ga = -a[1] * s, de = -a[2] * s;
    return [
      [al * al + be * be - ga * ga - de * de, 2 * (be * ga + al * de), 2 * (be * de - al * ga)],
      [2 * (be * ga - al * de), al * al + ga * ga - be * be - de * de, 2 * (ga * de + al * be)],
      [2 * (be * de + al * ga), 2 * (ga * de - al * be), al * al + de * de - be * be - ga * ga]];
  }
  function apply(R, p) { return [dot(R[0], p), dot(R[1], p), dot(R[2], p)]; }
  /* vue orthographique, camera inclinee */
  function viewer(cx, cy, s, yaw, pitch) {
    var cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return function (p) {
      var x = p[0] * cyw + p[2] * syw, z = -p[0] * syw + p[2] * cyw, y = p[1];
      var y2 = y * cp - z * sp;
      return [cx + s * x, cy - s * y2];
    };
  }
  function pts(arr) { return arr.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }

  /* 1. Recentrage : seule l'origine du volume bouge, son centre vient sur l'origine du repere */
  A.scenes.aso_recenter = function (svg) {
    var CX = 160, CY = 100, W = 120, H = 90, cx0 = 66, cy0 = -34, i;
    E("path", { "class": "a-ink", d: "M" + (CX - 130) + " " + CY + " H" + (CX + 130) + " M" + CX + " " + (CY - 90) + " V" + (CY + 90) }, svg);
    var g = E("g", {}, svg);
    E("rect", { "class": "a-seg", x: -W / 2, y: -H / 2, width: W, height: H, opacity: 0.18 }, g);
    for (i = 1; i < 6; i++) { E("line", { "class": "a-cell", x1: -W / 2 + i * W / 6, x2: -W / 2 + i * W / 6, y1: -H / 2, y2: H / 2 }, g); }
    for (i = 1; i < 4; i++) { E("line", { "class": "a-cell", x1: -W / 2, x2: W / 2, y1: -H / 2 + i * H / 4, y2: -H / 2 + i * H / 4 }, g); }
    E("rect", { "class": "a-seg-s", x: -W / 2, y: -H / 2, width: W, height: H }, g);
    E("circle", { "class": "a-ana", cx: -W / 2, cy: -H / 2, r: 4.5 }, g);
    E("circle", { "class": "a-acc", cx: 0, cy: 0, r: 4.5 }, g);
    var arrow = E("line", { "class": "a-nlp-s", x1: 0, y1: 0, x2: 0, y2: 0 }, svg);
    var head = E("path", { "class": "a-nlp", d: "M0 0 l-8 -3.5 v7 z" }, svg);
    return function (t) {
      var a = ease(seg(t, 0.2, 0.75)), pre = ease(seg(t, 0.05, 0.2));
      var x = CX + lerp(cx0, 0, a), y = CY + lerp(cy0, 0, a);
      g.setAttribute("transform", "translate(" + x + " " + y + ")");
      arrow.setAttribute("x1", CX + cx0); arrow.setAttribute("y1", CY + cy0); arrow.setAttribute("x2", lerp(CX + cx0, CX + 6, pre)); arrow.setAttribute("y2", lerp(CY + cy0, CY + 3, pre));
      arrow.setAttribute("opacity", 1 - a);
      var ang = Math.atan2(-cy0, -cx0) * 180 / PI;
      head.setAttribute("transform", "translate(" + lerp(CX + cx0, CX + 6, pre) + " " + lerp(CY + cy0, CY + 3, pre) + ") rotate(" + ang + ")");
      head.setAttribute("opacity", (1 - a) * (pre > 0.05 ? 1 : 0));
    };
  };

  /* 2. Le meilleur triplet : on essaie des triplets, chacun laisse une distance moyenne, on garde le plus petit */
  A.scenes.aso_triplet = function (svg) {
    var P = [[30, 50], [62, 34], [96, 58], [48, 88], [90, 104], [28, 126], [70, 138]];
    var ang = 0.5, cs = Math.cos(ang), sn = Math.sin(ang), O = 150;
    var Q = P.map(function (p) { var x = p[0] - 62, y = p[1] - 90; return [O + 24 + 1.02 * (x * cs - y * sn), 90 + 1.02 * (x * sn + y * cs)]; });
    var cands = [[0, 1, 2], [0, 3, 5], [2, 4, 6], [1, 3, 6], [4, 5, 0], [3, 2, 1]], score = [0.78, 0.5, 0.9, 0.16, 0.62, 0.7], best = 3;
    var tri1 = E("polygon", { "class": "a-seg-s", fill: "none" }, svg), tri2 = E("polygon", { "class": "a-acc-s", fill: "none" }, svg);
    P.forEach(function (p) { E("circle", { "class": "a-seg", cx: p[0], cy: p[1], r: 3.2 }, svg); });
    Q.forEach(function (p) { E("circle", { "class": "a-acc", cx: p[0], cy: p[1], r: 3.2 }, svg); });
    var bars = [], X0 = 244, BASE = 170;
    E("line", { "class": "a-ink", x1: X0 - 6, x2: X0 + 6 * 11 + 4, y1: BASE, y2: BASE }, svg);
    cands.forEach(function (c, k) { bars.push(E("rect", { "class": "a-ink", x: X0 + k * 11, width: 8, rx: 1 }, svg)); });
    var win = E("rect", { "class": "a-nlp-s", x: X0 + best * 11 - 2, y: BASE - 100, width: 12, height: 102, rx: 2, opacity: 0 }, svg);
    return function (t) {
      var s = t * 6.4, k = Math.min(5, Math.floor(s)), fin = ease(seg(t, 0.82, 0.96));
      var show = fin > 0 ? best : k;
      tri1.setAttribute("points", pts(cands[show].map(function (i) { return P[i]; })));
      tri2.setAttribute("points", pts(cands[show].map(function (i) { return Q[i]; })));
      cands.forEach(function (c, j) {
        var h = (j < k ? 1 : (j === k ? ease(s - k) : 0)) * score[j] * 90;
        bars[j].setAttribute("height", Math.max(0.5, h)); bars[j].setAttribute("y", BASE - Math.max(0.5, h));
        bars[j].setAttribute("class", fin > 0 && j === best ? "a-nlp" : "a-ink");
        bars[j].setAttribute("opacity", fin > 0 && j !== best ? 0.4 : 1);
      });
      win.setAttribute("opacity", fin);
    };
  };


  /* 2 bis. Legacy : les triplets sont TIRES AU HASARD (generateur global, sans graine), un triplet deja vu ne compte pas, on garde le meilleur.
     Les tirages, les scores et le nombre de cases sont inventes pour l'image. */
  A.scenes.aso_draw = function (svg) {
    var COLS = 8, ROWS = 5, N = COLS * ROWS, CELL = 21, GAP = 3, X0 = 12, Y0 = 34, D = 26, i, seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var draws = [], score = [];
    for (i = 0; i < N; i++) { score.push(0.2 + 0.8 * ((i * 0.6180339 + 0.13) % 1)); }
    for (i = 0; i < D; i++) { draws.push(Math.floor(rnd() * N)); }
    draws[9] = draws[3]; draws[18] = draws[12];
    function pos(c) { return [X0 + (c % COLS) * (CELL + GAP), Y0 + Math.floor(c / COLS) * (CELL + GAP)]; }
    var fills = [], marks = [];
    for (i = 0; i < N; i++) {
      var p = pos(i);
      fills.push(E("rect", { "class": "a-seg", x: p[0], y: p[1], width: CELL, height: CELL, rx: 2, opacity: 0 }, svg));
      E("rect", { "class": "a-ink", x: p[0], y: p[1], width: CELL, height: CELL, rx: 2, fill: "none", opacity: 0.45 }, svg);
    }
    var best = E("rect", { "class": "a-acc-s", width: CELL + 4, height: CELL + 4, rx: 3, fill: "none", "stroke-width": 2.4, opacity: 0 }, svg);
    var cur = E("rect", { "class": "a-nlp-s", width: CELL + 4, height: CELL + 4, rx: 3, fill: "none", "stroke-width": 2.4 }, svg);
    var cross = E("path", { "class": "a-ink", fill: "none", "stroke-width": 2 }, svg);
    var CX0 = 232, CX1 = 306, CBASE = 172, CTOP = 36;
    E("path", { "class": "a-ink", d: "M" + CX0 + " " + CTOP + " V" + CBASE + " H" + CX1, fill: "none" }, svg);
    var curve = E("polyline", { "class": "a-nlp-s", fill: "none", "stroke-width": 2 }, svg);
    var dot = E("circle", { "class": "a-acc", r: 4 }, svg);
    return function (t) {
      var k = Math.min(D - 1, Math.floor(t * D * 1.02)), seen = {}, bestC = -1, bestS = 9, pts = [], j, c, isRepeat = false;
      for (j = 0; j <= k; j++) {
        c = draws[j]; isRepeat = !!seen[c]; seen[c] = true;
        if (score[c] < bestS) { bestS = score[c]; bestC = c; }
        pts.push([CX0 + (CX1 - CX0) * j / (D - 1), CBASE - (CBASE - CTOP) * 0.9 * bestS]);
      }
      for (i = 0; i < N; i++) { fills[i].setAttribute("opacity", seen[i] ? 0.4 : 0); }
      var pc = pos(draws[k]), done = t > 0.94, pb = pos(bestC);
      cur.setAttribute("x", pc[0] - 2); cur.setAttribute("y", pc[1] - 2); cur.setAttribute("opacity", done ? 0 : 1);
      cross.setAttribute("d", isRepeat && !done ? "M" + (pc[0] + 3) + " " + (pc[1] + 3) + " l" + (CELL - 6) + " " + (CELL - 6) + " M" + (pc[0] + CELL - 3) + " " + (pc[1] + 3) + " l" + (6 - CELL) + " " + (CELL - 6) : "");
      best.setAttribute("x", pb[0] - 2); best.setAttribute("y", pb[1] - 2); best.setAttribute("opacity", bestC >= 0 ? 1 : 0);
      curve.setAttribute("points", pts.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "));
      var lp = pts[pts.length - 1]; dot.setAttribute("cx", lp[0]); dot.setAttribute("cy", lp[1]);
    };
  };

  /* 3. Premiere rotation : les deux vecteurs sont replies dans le quadrant positif avant de prendre l'angle */
  A.scenes.aso_fold = function (svg) {
    var OX = 150, OY = 150, S = 60;
    E("rect", { "class": "a-soft", x: OX, y: OY - 120, width: 140, height: 120, opacity: 0.07 }, svg);
    E("path", { "class": "a-ink", d: "M" + (OX - 120) + " " + OY + " H" + (OX + 140) + " M" + OX + " " + (OY - 124) + " V" + (OY + 8) }, svg);
    var u = [-1.3, 0.9], w = [1.0, 0.75];
    var vTrue = E("path", { "class": "a-dash", fill: "none" }, svg);
    var vec1 = E("line", { "class": "a-seg-s", "stroke-width": 2.4 }, svg), tip1 = E("circle", { "class": "a-seg", r: 4 }, svg);
    var vec2 = E("line", { "class": "a-acc-s", "stroke-width": 2.4, x1: OX, y1: OY, x2: OX + w[0] * S, y2: OY - w[1] * S }, svg);
    E("circle", { "class": "a-acc", cx: OX + w[0] * S, cy: OY - w[1] * S, r: 4 }, svg);
    var arc = E("path", { "class": "a-nlp-s", fill: "none", "stroke-width": 2 }, svg);
    var a2 = Math.atan2(w[1], w[0]), a1 = Math.atan2(u[1], Math.abs(u[0]));
    function P(a, r) { return [OX + Math.cos(a) * r, OY - Math.sin(a) * r]; }
    function arcPath(a, b, r) { var p = P(a, r), q = P(b, r); return "M" + p[0] + " " + p[1] + " A" + r + " " + r + " 0 0 " + (b > a ? 0 : 1) + " " + q[0] + " " + q[1]; }
    return function (t) {
      var f = ease(seg(t, 0.2, 0.45)), r = ease(seg(t, 0.55, 0.9));
      var x = u[0] * (1 - 2 * f), y = u[1], L = Math.hypot(x, y), ang = Math.atan2(y, x);
      var cur = f >= 1 ? lerp(a1, a2, r) : ang;
      var cx = Math.cos(cur) * L, cy = Math.sin(cur) * L;
      vec1.setAttribute("x1", OX); vec1.setAttribute("y1", OY); vec1.setAttribute("x2", OX + cx * S); vec1.setAttribute("y2", OY - cy * S);
      tip1.setAttribute("cx", OX + cx * S); tip1.setAttribute("cy", OY - cy * S);
      var ta = Math.atan2(u[1], u[0]);
      vTrue.setAttribute("d", arcPath(ta, a2, 30)); vTrue.setAttribute("opacity", f < 0.05 ? 1 : 0);
      arc.setAttribute("d", arcPath(a1, cur, 44)); arc.setAttribute("opacity", f > 0.9 ? 1 : 0);
    };
  };

  /* 4. Deuxieme rotation : un roulis autour de l'axe deja aligne, vu de bout */
  A.scenes.aso_roll = function (svg) {
    var CX = 160, CY = 98, R = 62;
    E("circle", { "class": "a-ink", cx: CX, cy: CY, r: R, fill: "none" }, svg);
    E("circle", { "class": "a-ink", cx: CX, cy: CY, r: 9, fill: "none" }, svg);
    E("circle", { "class": "a-ink", cx: CX, cy: CY, r: 2.6 }, svg);
    var a0 = 215 * PI / 180, a1 = 62 * PI / 180;
    var q = E("circle", { "class": "a-acc", cx: CX + Math.cos(a1) * R, cy: CY - Math.sin(a1) * R, r: 5 }, svg);
    var qline = E("line", { "class": "a-acc-s", x1: CX, y1: CY, x2: CX + Math.cos(a1) * R, y2: CY - Math.sin(a1) * R }, svg);
    var pline = E("line", { "class": "a-seg-s" }, svg), p = E("circle", { "class": "a-seg", r: 5 }, svg);
    var arc = E("path", { "class": "a-nlp-s", fill: "none", "stroke-width": 2 }, svg);
    return function (t) {
      var r = ease(seg(t, 0.3, 0.85)), a = lerp(a0, a1 + 2 * PI * 0, r);
      /* chemin le plus court */
      var d = ((a1 - a0 + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
      a = a0 + d * r;
      var x = CX + Math.cos(a) * R, y = CY - Math.sin(a) * R;
      p.setAttribute("cx", x); p.setAttribute("cy", y); pline.setAttribute("x1", CX); pline.setAttribute("y1", CY); pline.setAttribute("x2", x); pline.setAttribute("y2", y);
      var s0 = a0, rr = 36, e = a;
      var P0 = [CX + Math.cos(s0) * rr, CY - Math.sin(s0) * rr], P1 = [CX + Math.cos(e) * rr, CY - Math.sin(e) * rr];
      arc.setAttribute("d", "M" + P0[0] + " " + P0[1] + " A" + rr + " " + rr + " 0 " + (Math.abs(e - s0) > PI ? 1 : 0) + " " + (e > s0 ? 0 : 1) + " " + P1[0] + " " + P1[1]);
      arc.setAttribute("opacity", r > 0.02 ? 1 : 0);
    };
  };

  /* 5. La rotation appliquee a des points : la matrice du texte, calculee pour de bon */
  A.scenes.aso_rotate = function (svg) {
    var V = viewer(160, 108, 70, 0.7, 0.45);
    var axis = unit([0.35, 1, 0.25]), theta = 62 * PI / 180;
    var P = [[-1.1, -0.2, 0.3], [0.9, 0.35, -0.5], [0.2, -0.9, 0.9], [-0.4, 0.7, 0.8], [0.6, -0.4, -0.9]];
    var ax = [V(mul(axis, -1.25)), V(mul(axis, 1.35))];
    E("line", { "class": "a-nlp-s", x1: ax[0][0], y1: ax[0][1], x2: ax[1][0], y2: ax[1][1] }, svg);
    var tri0 = E("polygon", { "class": "a-dash", fill: "none" }, svg), tri1 = E("polygon", { "class": "a-seg-s", fill: "none" }, svg);
    var ghost = P.map(function () { return E("circle", { "class": "a-soft", r: 3, opacity: 0.35 }, svg); });
    var dots = P.map(function (p, i) { return E("circle", { "class": i < 3 ? "a-seg" : "a-acc", r: 4 }, svg); });
    var trails = P.map(function () { return E("polyline", { "class": "a-dash", fill: "none" }, svg); });
    return function (t) {
      var a = ease(seg(t, 0.15, 0.85)), R = rodrigues(axis, theta * a);
      var base = P.map(V), now = P.map(function (p) { return V(apply(R, p)); });
      ghost.forEach(function (g, i) { g.setAttribute("cx", base[i][0]); g.setAttribute("cy", base[i][1]); });
      dots.forEach(function (d, i) { d.setAttribute("cx", now[i][0]); d.setAttribute("cy", now[i][1]); });
      tri0.setAttribute("points", pts(base.slice(0, 3))); tri1.setAttribute("points", pts(now.slice(0, 3)));
      trails.forEach(function (tr, i) {
        var arr = [], k;
        for (k = 0; k <= 12; k++) { arr.push(V(apply(rodrigues(axis, theta * a * k / 12), P[i]))); }
        tr.setAttribute("points", pts(arr)); tr.setAttribute("opacity", a > 0.01 ? 0.8 : 0);
      });
    };
  };

  /* 6. L'ICP : chaque point prend son plus proche voisin, on ajuste, on recommence (vrai calcul 2D) */
  A.scenes.aso_icp = function (svg) {
    var Q = [[-70, -34], [-24, -52], [30, -40], [64, -6], [46, 38], [-8, 52], [-56, 28]];
    var th0 = 24 * PI / 180, i, k, K = 6;
    function rot(p, th, c) { var x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * Math.cos(th) - y * Math.sin(th), c[1] + x * Math.sin(th) + y * Math.cos(th)]; }
    var P0 = Q.map(function (q) { var r = rot(q, th0, [0, 0]); return [r[0] + 12, r[1] - 8]; });
    function nearest(p) { var b = 0, d = 1e9; Q.forEach(function (q, j) { var e = Math.hypot(p[0] - q[0], p[1] - q[1]); if (e < d) { d = e; b = j; } }); return b; }
    var states = [P0], cur = P0;
    for (k = 0; k < K; k++) {
      var m = cur.map(nearest), mp = [0, 0], mq = [0, 0];
      cur.forEach(function (p, i2) { mp[0] += p[0] / cur.length; mp[1] += p[1] / cur.length; mq[0] += Q[m[i2]][0] / cur.length; mq[1] += Q[m[i2]][1] / cur.length; });
      var s1 = 0, s2 = 0;
      cur.forEach(function (p, i2) { var a = [p[0] - mp[0], p[1] - mp[1]], b = [Q[m[i2]][0] - mq[0], Q[m[i2]][1] - mq[1]]; s1 += a[0] * b[1] - a[1] * b[0]; s2 += a[0] * b[0] + a[1] * b[1]; });
      var th = Math.atan2(s1, s2);
      cur = cur.map(function (p) { var r = rot(p, th, mp); return [r[0] + (mq[0] - mp[0]), r[1] + (mq[1] - mp[1])]; });
      states.push(cur);
    }
    function err(S) { var e = 0; S.forEach(function (p) { var q = Q[nearest(p)]; e += Math.hypot(p[0] - q[0], p[1] - q[1]); }); return e / S.length; }
    var e0 = err(P0), CX = 150, CY = 98;
    var pairs = P0.map(function () { return E("line", { "class": "a-dash" }, svg); });
    Q.forEach(function (q) { E("circle", { "class": "a-acc", cx: CX + q[0], cy: CY + q[1], r: 4.2 }, svg); });
    var dots = P0.map(function () { return E("circle", { "class": "a-seg", r: 4.2 }, svg); });
    E("line", { "class": "a-ink", x1: 262, x2: 262, y1: 30, y2: 170 }, svg);
    var bar = E("rect", { "class": "a-nlp", x: 268, width: 14, rx: 2 }, svg);
    return function (t) {
      var s = t * K, j = Math.min(K - 1, Math.floor(s)), u = ease(s - j), S0 = states[j], S1 = states[j + 1];
      var pos = S0.map(function (p, i2) { return [lerp(p[0], S1[i2][0], u), lerp(p[1], S1[i2][1], u)]; });
      var show = S0.map(nearest);
      dots.forEach(function (d, i2) { d.setAttribute("cx", CX + pos[i2][0]); d.setAttribute("cy", CY + pos[i2][1]); });
      pairs.forEach(function (l, i2) {
        l.setAttribute("x1", CX + pos[i2][0]); l.setAttribute("y1", CY + pos[i2][1]); l.setAttribute("x2", CX + Q[show[i2]][0]); l.setAttribute("y2", CY + Q[show[i2]][1]);
        l.setAttribute("opacity", 0.9 * (1 - 0.4 * u));
      });
      var e = lerp(err(S0), err(S1), u), h = Math.max(1, 138 * e / e0);
      bar.setAttribute("height", h); bar.setAttribute("y", 170 - h);
    };
  };

  /* 7. Reechantillonnage : le volume tourne dans sa propre boite, ce qui en sort est perdu */
  A.scenes.aso_resample = function (svg) {
    var CX = 160, CY = 98, B = 110, id = "asoclip" + Math.floor(Math.random() * 1e6);
    var defs = E("defs", {}, svg), cp = E("clipPath", { id: id }, defs);
    E("rect", { x: CX - B / 2, y: CY - B / 2, width: B, height: B }, cp);
    var full = E("g", { "class": "a-dash" }, svg), outline = E("rect", { "class": "a-dash", x: -66, y: -26, width: 132, height: 52, fill: "none" }, full);
    var inside = E("g", { "clip-path": "url(#" + id + ")" }, svg), body = E("g", {}, inside);
    E("rect", { "class": "a-seg", x: -66, y: -26, width: 132, height: 52, opacity: 0.35 }, body);
    E("path", { "class": "a-seg-s", d: "M-66 -26 h132 v52 h-132 z M-30 -26 v52 M30 -26 v52", fill: "none" }, body);
    E("circle", { "class": "a-acc", cx: 40, cy: -8, r: 4 }, body);
    E("rect", { "class": "a-acc-s", x: CX - B / 2, y: CY - B / 2, width: B, height: B }, svg);
    return function (t) {
      var a = ease(seg(t, 0.2, 0.8)) * 38;
      var tf = "translate(" + CX + " " + CY + ") rotate(" + a + ")";
      body.setAttribute("transform", tf); full.setAttribute("transform", tf);
      full.setAttribute("opacity", 0.6);
    };
  };

  /* 8. Barycentre des sommets de chaque dent (IOS) */
  A.scenes.aso_centroid = function (svg) {
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var N = 9, teeth = [], i, j, chosen = [1, 4, 7];
    for (i = 0; i < N; i++) {
      var u = (i - (N - 1) / 2) / ((N - 1) / 2), cx = 160 + u * 112, cy = 150 - (1 - u * u) * 78, vs = [], mx = 0, my = 0;
      for (j = 0; j < 14; j++) { var x = cx + (rnd() - 0.5) * 22, y = cy + (rnd() - 0.5) * 22; vs.push([x, y]); mx += x / 14; my += y / 14; }
      teeth.push({ vs: vs, c: [mx, my] });
    }
    var clsS = ["a-seg", "a-ana", "a-nlp"];
    var dots = [], crosses = [];
    teeth.forEach(function (T, k) {
      T.vs.forEach(function (v) { dots.push(E("circle", { "class": clsS[k % 3], cx: v[0], cy: v[1], r: 2.3, opacity: 0.8 }, svg)); });
      var g = E("g", { opacity: 0 }, svg), big = chosen.indexOf(k) >= 0;
      var ca = { "class": big ? "a-acc" : "a-ink", cx: T.c[0], cy: T.c[1], r: big ? 5.6 : 3.4 };
      if (!big) { ca.fill = "none"; }
      E("circle", ca, g);
      if (big) { E("path", { "class": "a-ink", d: "M" + (T.c[0] - 9) + " " + T.c[1] + " h18 M" + T.c[0] + " " + (T.c[1] - 9) + " v18" }, g); }
      crosses.push(g);
    });
    return function (t) {
      var a = ease(seg(t, 0.25, 0.7));
      crosses.forEach(function (g) { g.setAttribute("opacity", a); });
      dots.forEach(function (d) { d.setAttribute("opacity", 0.8 - 0.55 * a); });
    };
  };

  /* 9. Jaw alignment on three centroids : le plan du triplet est tourne sur celui de la reference, puis la direction, puis les barycentres */
  A.scenes.aso_plane = function (svg) {
    var V = viewer(160, 110, 62, 0.55, 0.5);
    var T = [[-1.2, 0.0, 0.3], [0.0, 0.0, -0.5], [1.2, 0.0, 0.3]];            /* reference : gauche, milieu, droite */
    var S0 = [[-0.9, 0.8, -0.7], [0.1, 0.1, 0.0], [1.0, -0.5, 0.8]];         /* scan, hors du plan de la reference, normale du meme cote que celle de la reference (le code ne retourne jamais une normale) */
    function normal(S) { return unit(cross(sub(S[2], S[1]), sub(S[0], S[1]))); }
    function cen(S) { return mul(add(add(S[0], S[1]), S[2]), 1 / 3); }
    var nt = normal(T), ns = normal(S0);
    var ax1 = cross(ns, nt), th1 = Math.acos(Math.max(-1, Math.min(1, dot(ns, nt)))), R1 = rodrigues(ax1, th1);
    function turned(S, R, c) { return S.map(function (p) { return add(apply(R, sub(p, c)), c); }); }
    var c0 = cen(S0), S1 = turned(S0, R1, c0);
    var d1 = unit(sub(S1[2], S1[0])), d2 = unit(sub(T[2], T[0]));
    var th2 = Math.atan2(dot(cross(d1, d2), nt), dot(d1, d2)), R2 = rodrigues(nt, th2), S2 = turned(S1, R2, cen(S1));
    var shift = sub(cen(T), cen(S2));
    var ref = E("polygon", { "class": "a-acc", opacity: 0.3 }, svg), refE = E("polygon", { "class": "a-acc-s", fill: "none" }, svg);
    var scan = E("polygon", { "class": "a-seg", opacity: 0.4 }, svg), scanE = E("polygon", { "class": "a-seg-s", fill: "none" }, svg);
    var nref = E("line", { "class": "a-acc-s", "stroke-width": 2 }, svg), nsc = E("line", { "class": "a-seg-s", "stroke-width": 2 }, svg);
    var dots = S0.map(function () { return E("circle", { "class": "a-seg", r: 4 }, svg); });
    var rd = T.map(function () { return E("circle", { "class": "a-acc", r: 4 }, svg); });
    ref.setAttribute("points", pts(T.map(V))); refE.setAttribute("points", pts(T.map(V)));
    T.forEach(function (p, i) { var q = V(p); rd[i].setAttribute("cx", q[0]); rd[i].setAttribute("cy", q[1]); });
    var r0 = V(cen(T)), r1 = V(add(cen(T), mul(nt, 1.1)));
    nref.setAttribute("x1", r0[0]); nref.setAttribute("y1", r0[1]); nref.setAttribute("x2", r1[0]); nref.setAttribute("y2", r1[1]);
    return function (t) {
      var a = ease(seg(t, 0.1, 0.38)), b = ease(seg(t, 0.4, 0.65)), c = ease(seg(t, 0.68, 0.92));
      var S = turned(S0, rodrigues(ax1, th1 * a), c0), cc = cen(S);
      S = turned(S, rodrigues(nt, th2 * b), cc);
      S = S.map(function (p) { return add(p, mul(shift, c)); });
      var ns2 = apply(rodrigues(nt, th2 * b), apply(rodrigues(ax1, th1 * a), ns)), cs = cen(S);
      var q = S.map(V);
      scan.setAttribute("points", pts(q)); scanE.setAttribute("points", pts(q));
      dots.forEach(function (d, i) { d.setAttribute("cx", q[i][0]); d.setAttribute("cy", q[i][1]); });
      var n0 = V(cs), n1 = V(add(cs, mul(ns2, 1.1)));
      nsc.setAttribute("x1", n0[0]); nsc.setAttribute("y1", n0[1]); nsc.setAttribute("x2", n1[0]); nsc.setAttribute("y2", n1[1]);
    };
  };
})();
