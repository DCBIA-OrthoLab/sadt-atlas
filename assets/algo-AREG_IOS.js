/* algo-AREG_IOS.js : les scenes animees de la page AREG_IOS (VISOR et legacy).
   Aucune chaine traduisible ici : le texte, les formules et les legendes vivent dans le HTML.
   Couleurs par classes .a-* (jetons du theme). k1 accent (.a-acc), k2 .a-seg, k3 .a-ana, k4 .a-nlp. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, txt = A.txt, ease = A.ease, seg = A.seg, lerp = A.lerp;

  /* 1. Le vote : chaque vue donne a chaque triangle qu'elle voit une probabilite, les probabilites s'additionnent */
  A.scenes.areg_ios_vote = function (svg) {
    var V = 3, F = 3, i, j;
    /* probabilite « patch » vue par la vue v sur le triangle f */
    var P = [[0.85, 0.35, 0.1], [0.7, 0.6, 0.2], [0.9, 0.3, 0.35]];
    var VX = 16, VW = 30, VY = 40, VS = 40, FX = 130, FY = 40, FS = 40, BX = 200, BW = 100;
    var pix = [], arrows = [], bars = [], barsB = [], tiles = [], vcols = [];
    for (j = 0; j < V; j++) {
      vcols.push(E("g", { opacity: 0 }, svg));
      for (i = 0; i < F; i++) {
        E("rect", { "class": "a-cell", x: VX + j * (VW + 6), y: VY + i * VS, width: VW, height: VS - 6 }, vcols[j]);
        pix.push(E("rect", { "class": "a-acc", x: VX + j * (VW + 6) + 1, y: VY + i * VS + 1, width: VW - 2, height: VS - 8, "fill-opacity": 0.1 + 0.8 * P[j][i] }, vcols[j]));
      }
    }
    for (i = 0; i < F; i++) {
      tiles.push(E("rect", { "class": "a-cell", x: FX, y: FY + i * FS, width: FS - 6, height: FS - 6, rx: 2 }, svg));
      barsB.push(E("rect", { "class": "a-soft", x: BX, y: FY + i * FS + 18, height: 8, width: 0, "fill-opacity": 0.35 }, svg));
      bars.push(E("rect", { "class": "a-acc", x: BX, y: FY + i * FS + 6, height: 8, width: 0 }, svg));
    }
    var win = [];
    for (i = 0; i < F; i++) { win.push(E("rect", { "class": "a-seg", x: FX + 1, y: FY + i * FS + 1, width: FS - 8, height: FS - 8, rx: 2, opacity: 0 }, svg)); }
    var lines = [];
    for (j = 0; j < V; j++) {
      lines.push([]);
      for (i = 0; i < F; i++) {
        lines[j].push(E("line", { "class": "a-dash", x1: VX + j * (VW + 6) + VW, y1: VY + i * VS + (VS - 6) / 2, x2: FX, y2: FY + i * FS + (FS - 6) / 2, opacity: 0 }, svg));
      }
    }
    E("line", { "class": "a-ink", x1: BX, x2: BX, y1: FY - 4, y2: FY + F * FS - 4 }, svg);
    return function (t) {
      var sum = [0, 0, 0], tot = [0, 0, 0];
      for (j = 0; j < V; j++) {
        var s = ease(seg(t, 0.05 + j * 0.24, 0.25 + j * 0.24));
        vcols[j].setAttribute("opacity", s);
        for (i = 0; i < F; i++) {
          lines[j][i].setAttribute("opacity", 0.6 * s * (1 - ease(seg(t, 0.3 + j * 0.24, 0.45 + j * 0.24))));
          sum[i] += P[j][i] * s; tot[i] += s;
        }
      }
      var fin = ease(seg(t, 0.8, 0.95));
      for (i = 0; i < F; i++) {
        bars[i].setAttribute("width", sum[i] * BW / V);
        barsB[i].setAttribute("width", (tot[i] - sum[i]) * BW / V);
        win[i].setAttribute("opacity", sum[i] > tot[i] - sum[i] ? fin : 0);
      }
    };
  };

  /* 2. La fermeture morphologique : dilater deux fois puis eroder deux fois comble les trous du patch */
  A.scenes.areg_ios_closing = function (svg) {
    var GX = 15, GY = 9, S = 19, OX = 22, OY = 12, i, j, k;
    var cur = [];
    for (j = 0; j < GY; j++) {
      cur.push([]);
      for (i = 0; i < GX; i++) {
        var d = Math.pow((i - 7) / 5.6, 2) + Math.pow((j - 4) / 3.3, 2);
        cur[j].push(d <= 1 ? 1 : 0);
      }
    }
    cur[4][5] = 0; cur[3][8] = 0; cur[5][9] = 0; cur[2][7] = 0; cur[4][10] = 0;   /* les trous laisses par le vote */
    function step(g, grow) {
      var out = [];
      for (var y = 0; y < GY; y++) {
        out.push([]);
        for (var x = 0; x < GX; x++) {
          var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]], any1 = false, any0 = false;
          for (var q = 0; q < 4; q++) {
            var xx = x + nb[q][0], yy = y + nb[q][1];
            if (xx < 0 || yy < 0 || xx >= GX || yy >= GY) { continue; }
            if (g[yy][xx]) { any1 = true; } else { any0 = true; }
          }
          out[y].push(grow ? (g[y][x] || any1 ? 1 : 0) : (g[y][x] && !any0 ? 1 : 0));
        }
      }
      return out;
    }
    var states = [cur];
    states.push(step(states[0], true)); states.push(step(states[1], true));
    states.push(step(states[2], false)); states.push(step(states[3], false));
    var dots = [];
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) { dots.push(E("circle", { cx: OX + i * S, cy: OY + j * S, r: 6, "class": "a-cell" }, svg)); } }
    var marks = [];
    for (k = 0; k < 5; k++) { marks.push(E("circle", { "class": "a-acc", cx: 118 + k * 20, cy: 190, r: 3.5 }, svg)); }
    return function (t) {
      var s = Math.min(4, Math.floor(t * 5)), g = states[s];
      for (var n = 0; n < dots.length; n++) {
        var on = g[Math.floor(n / GX)][n % GX];
        dots[n].setAttribute("class", on ? "a-acc" : "a-cell");
      }
      for (k = 0; k < 5; k++) { marks[k].setAttribute("opacity", k === s ? 1 : 0.25); }
    };
  };

  /* 3. La bande muco-gingivale : une courbe par les points repères, accrochee aux sommets, puis une bande qui grandit le long du maillage */
  A.scenes.areg_ios_band = function (svg) {
    var GX = 25, GY = 14, S = 12, OX = 12, OY = 10, i, j, n;
    var L = [[2, 11], [6, 7], [11, 5], [16, 5.5], [20.5, 8], [23, 12]];   /* points repères, en unités de maille */
    function spline(u) {   /* Catmull-Rom à travers les points repères */
      var m = L.length - 1, s = Math.min(m - 0.0001, u * m), k = Math.floor(s), f = s - k;
      var p0 = L[Math.max(0, k - 1)], p1 = L[k], p2 = L[k + 1], p3 = L[Math.min(m, k + 2)];
      function c(a, b, d, e) { return 0.5 * ((2 * b) + (-a + d) * f + (2 * a - 5 * b + 4 * d - e) * f * f + (-a + 3 * b - 3 * d + e) * f * f * f); }
      return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
    }
    var dots = [], seeds = {}, curve = [];
    for (n = 0; n <= 60; n++) { var sp = spline(n / 60); curve.push(sp); seeds[Math.round(sp[0]) + "," + Math.round(sp[1])] = 1; }
    /* Dijkstra multi-source sur la grille à 8 voisins, longueurs euclidiennes */
    var dist = [], q = [];
    for (j = 0; j < GY; j++) { dist.push([]); for (i = 0; i < GX; i++) { dist[j].push(Infinity); } }
    for (var key in seeds) { if (seeds.hasOwnProperty(key)) { var kk = key.split(","); dist[+kk[1]][+kk[0]] = 0; q.push([0, +kk[0], +kk[1]]); } }
    while (q.length) {
      q.sort(function (a, b) { return a[0] - b[0]; });
      var cu = q.shift(), cx = cu[1], cy = cu[2];
      if (cu[0] > dist[cy][cx]) { continue; }
      for (var dy = -1; dy <= 1; dy++) { for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) { continue; }
        var nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= GX || ny >= GY) { continue; }
        var nd = cu[0] + Math.sqrt(dx * dx + dy * dy);
        if (nd < dist[ny][nx] && nd <= 3.2) { dist[ny][nx] = nd; q.push([nd, nx, ny]); }
      } }
    }
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) { dots.push(E("circle", { "class": "a-fine", cx: OX + i * S, cy: OY + j * S, r: 1.8 }, svg)); } }
    var path = E("polyline", { "class": "a-ink", fill: "none", points: curve.map(function (p) { return (OX + p[0] * S).toFixed(1) + "," + (OY + p[1] * S).toFixed(1); }).join(" "), opacity: 0 }, svg);
    var marks = L.map(function (p) { return E("circle", { "class": "a-lmk", cx: OX + p[0] * S, cy: OY + p[1] * S, r: 4.2 }, svg); });
    var snaps = [];
    for (key in seeds) { if (seeds.hasOwnProperty(key)) { var k2 = key.split(","); snaps.push([+k2[0], +k2[1]]); } }
    var seedDots = snaps.map(function (p) { return E("circle", { "class": "a-seg", cx: OX + p[0] * S, cy: OY + p[1] * S, r: 3, opacity: 0 }, svg); });
    return function (t) {
      var a = ease(seg(t, 0.08, 0.3)), b = ease(seg(t, 0.3, 0.45)), c = ease(seg(t, 0.5, 0.92));
      path.setAttribute("opacity", a * (1 - 0.55 * b));
      for (n = 0; n < seedDots.length; n++) { seedDots[n].setAttribute("opacity", b); }
      var r = 3.2 * c;
      for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) {
        var on = dist[j][i] <= r && dist[j][i] > 0;
        dots[j * GX + i].setAttribute("class", on ? "a-acc" : "a-fine");
        dots[j * GX + i].setAttribute("r", on ? 3 : 1.8);
      } }
    };
  };

  /* 4. L'ICP : on apparie chaque point au plus proche, on cherche la rotation et la translation rigides, et on recommence */
  A.scenes.areg_ios_icp = function (svg) {
    var N = 26, i, k, tgt = [], src0 = [];
    for (i = 0; i < N; i++) {
      var u = i / (N - 1), a = lerp(-1.1, 1.1, u);
      tgt.push([160 + 95 * Math.sin(a) + 6 * Math.sin(i * 2.1), 100 - 52 * Math.cos(a) * 1.0 + 4 * Math.cos(i * 1.7) + 20]);
    }
    var ang0 = 0.42, tx0 = -34, ty0 = 26, cc = [160, 100];
    for (i = 0; i < N; i++) {
      var p = tgt[i], x = p[0] - cc[0], y = p[1] - cc[1];
      src0.push([cc[0] + x * Math.cos(ang0) - y * Math.sin(ang0) + tx0 + 1.5 * Math.sin(i * 3.3), cc[1] + x * Math.sin(ang0) + y * Math.cos(ang0) + ty0 + 1.5 * Math.cos(i * 2.9)]);
    }
    function mean(P) { var m = [0, 0]; P.forEach(function (p) { m[0] += p[0] / P.length; m[1] += p[1] / P.length; }); return m; }
    function near(p) { var b = 0, bd = 1e9; for (var q = 0; q < N; q++) { var d = Math.hypot(p[0] - tgt[q][0], p[1] - tgt[q][1]); if (d < bd) { bd = d; b = q; } } return b; }
    /* états : 0 départ, 1 centroïdes appariés, puis 5 itérations */
    var states = [src0], ms = mean(src0), mt = mean(tgt);
    states.push(src0.map(function (p) { return [p[0] + mt[0] - ms[0], p[1] + mt[1] - ms[1]]; }));
    for (k = 0; k < 5; k++) {
      var S = states[states.length - 1], pr = S.map(function (p) { return tgt[near(p)]; });
      var m1 = mean(S), m2 = mean(pr), sd = 0, sc = 0;
      for (i = 0; i < N; i++) {
        var ax = S[i][0] - m1[0], ay = S[i][1] - m1[1], bx = pr[i][0] - m2[0], by = pr[i][1] - m2[1];
        sd += ax * bx + ay * by; sc += ax * by - ay * bx;
      }
      var th = Math.atan2(sc, sd), co = Math.cos(th), si = Math.sin(th);
      states.push(S.map(function (p) {
        var x = p[0] - m1[0], y = p[1] - m1[1];
        return [co * x - si * y + m2[0], si * x + co * y + m2[1]];
      }));
    }
    var T = tgt.map(function (p) { return E("circle", { "class": "a-ink", cx: p[0], cy: p[1], r: 3, fill: "none" }, svg); });
    var links = tgt.map(function () { return E("line", { "class": "a-dash", opacity: 0 }, svg); });
    var dots = src0.map(function () { return E("circle", { "class": "a-acc", r: 3 }, svg); });
    return function (t) {
      var s = t * (states.length - 1), k0 = Math.min(states.length - 2, Math.floor(s)), w = ease(s - k0);
      var A0 = states[k0], B0 = states[k0 + 1];
      for (var n = 0; n < N; n++) {
        var x = lerp(A0[n][0], B0[n][0], w), y = lerp(A0[n][1], B0[n][1], w);
        dots[n].setAttribute("cx", x); dots[n].setAttribute("cy", y);
        var q = tgt[near(A0[n])];
        links[n].setAttribute("x1", x); links[n].setAttribute("y1", y);
        links[n].setAttribute("x2", q[0]); links[n].setAttribute("y2", q[1]);
        links[n].setAttribute("opacity", k0 >= 1 && k0 < states.length - 2 ? 0.55 * (1 - w) + 0.15 : (k0 === 0 ? 0 : 0.15));
      }
    };
  };
})();
