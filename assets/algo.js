/* algo.js : de petites animations qui illustrent UN pas d'un algorithme.

   Chaque <figure class="algo" data-scene="..."> porte son texte, sa formule et
   sa legende dans le HTML (traduit par i18n.py, indexe par la recherche,
   imprimable). Ce fichier ne fait que dessiner dans le <svg> de la figure : une
   fonction draw(t), t dans [0, 1], par scene. Aucune chaine traduisible ici,
   seulement des nombres. Les couleurs sont des classes (.a-*) qui lisent les
   jetons du theme.

   La figure joue en boucle tant qu'elle est a l'ecran, avec une pause a la fin ;
   « Replay » la relance. Avec prefers-reduced-motion, ou sans JavaScript, elle
   reste a son etat final. Pour une capture : ajouter #algo=0.55 a l'URL fige
   toutes les scenes au temps 0.55. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  function E(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) { n.setAttribute(k, attrs[k]); } }
    if (parent) { parent.appendChild(n); }
    return n;
  }
  function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function ease(x) { x = clamp(x); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function txt(parent, x, y, s, cls, anchor) {
    var n = E("text", { x: x, y: y, "class": cls || "a-label", "text-anchor": anchor || "start" }, parent);
    n.textContent = s;
    return n;
  }

  var SCENES = {};
  /* Socle public : un fichier assets/algo-<Module>.js ajoute ses scenes sans toucher a celui-ci,
     SCENES[nom] = function (svg, fig) { ...; return function draw(t) {...}; } */
  window.Algo = { scenes: SCENES, E: E, clamp: clamp, ease: ease, seg: seg, lerp: lerp, txt: txt };

  /* 1. Ecretage de l'histogramme : les queues sont ramenees sur les percentiles */
  SCENES.clamp = function (svg) {
    var N = 40, X0 = 20, W = 280, BASE = 150, bw = W / N;
    var lo = 6, hi = 34, heights = [], i;
    for (i = 0; i < N; i++) {
      heights[i] = 105 * Math.exp(-Math.pow((i - 19) / 8, 2)) + 22 * Math.exp(-Math.pow((i - 31) / 3, 2)) + 5;
    }
    var bars = [], g = E("g", {}, svg);
    for (i = 0; i < N; i++) { bars[i] = E("rect", { "class": "a-acc", x: X0 + i * bw + 0.6, width: bw - 1.2 }, g); }
    var pileL = E("rect", { "class": "a-acc", width: bw - 1.2 }, g);
    var pileR = E("rect", { "class": "a-acc", width: bw - 1.2 }, g);
    var lineL = E("line", { "class": "a-dash", y1: 24, y2: BASE }, svg);
    var lineR = E("line", { "class": "a-dash", y1: 24, y2: BASE }, svg);
    E("line", { "class": "a-ink", x1: X0, x2: X0 + W, y1: BASE, y2: BASE }, svg);
    var tl = txt(svg, X0, 168, "1 %", "a-label"), tr = txt(svg, X0 + W, 168, "99 %", "a-label", "end");
    var massL = 0, massR = 0;
    for (i = 0; i < lo; i++) { massL += heights[i]; }
    for (i = hi + 1; i < N; i++) { massR += heights[i]; }
    return function (t) {
      var a = ease(seg(t, 0.05, 0.5)), u = ease(seg(t, 0.5, 0.95));
      var xl = lerp(X0, X0 + lo * bw, a), xr = lerp(X0 + W, X0 + (hi + 1) * bw, a);
      lineL.setAttribute("x1", xl); lineL.setAttribute("x2", xl);
      lineR.setAttribute("x1", xr); lineR.setAttribute("x2", xr);
      tl.setAttribute("x", xl); tr.setAttribute("x", xr);
      for (var k = 0; k < N; k++) {
        var out = k < lo || k > hi, h = heights[k] * (out ? 1 - u : 1);
        bars[k].setAttribute("height", Math.max(0, h));
        bars[k].setAttribute("y", BASE - Math.max(0, h));
        bars[k].setAttribute("opacity", out ? 0.35 + 0.65 * (1 - a) * (1 - u) : 1);
      }
      var hl = heights[lo] + u * Math.min(60, massL * 0.5), hr = heights[hi] + u * Math.min(60, massR * 0.5);
      pileL.setAttribute("x", X0 + lo * bw + 0.6); pileL.setAttribute("height", hl); pileL.setAttribute("y", BASE - hl);
      pileR.setAttribute("x", X0 + hi * bw + 0.6); pileR.setAttribute("height", hr); pileR.setAttribute("y", BASE - hr);
      pileL.setAttribute("opacity", u > 0 ? 1 : 0); pileR.setAttribute("opacity", u > 0 ? 1 : 0);
    };
  };

  /* 2. Reechantillonnage : la meme boite, des voxels plus petits */
  SCENES.resample = function (svg) {
    var X = 40, Y = 22, W = 240, H = 120, cw = 60, ch = 40, i;
    var fine = [], gf = E("g", {}, svg);
    for (i = 0; i * 18 <= W; i++) { fine.push(E("line", { "class": "a-fine", x1: X + i * 18, x2: X + i * 18, y1: Y, y2: Y + H }, gf)); }
    for (i = 0; i * 12 <= H; i++) { fine.push(E("line", { "class": "a-fine", x1: X, x2: X + W, y1: Y + i * 12, y2: Y + i * 12 }, gf)); }
    for (i = 0; i <= 4; i++) { E("line", { "class": "a-ink", x1: X + i * cw, x2: X + i * cw, y1: Y, y2: Y + H }, svg); }
    for (i = 0; i <= 3; i++) { E("line", { "class": "a-ink", x1: X, x2: X + W, y1: Y + i * ch, y2: Y + i * ch }, svg); }
    var hiC = E("rect", { "class": "a-acc", x: X + cw, y: Y + ch, width: cw, height: ch, opacity: 0.35 }, svg);
    var hiF = E("rect", { "class": "a-acc", x: X + cw, y: Y + ch, width: 18, height: 12, opacity: 0 }, svg);
    var l1 = txt(svg, X, 160, "1 mm", "a-label-b"), l2 = txt(svg, X + W, 160, "0.3 mm", "a-label-b", "end");
    return function (t) {
      var u = ease(seg(t, 0.25, 0.7));
      gf.setAttribute("opacity", u);
      hiC.setAttribute("opacity", 0.35 * (1 - u));
      hiF.setAttribute("opacity", 0.6 * u);
      l1.setAttribute("opacity", 1 - 0.55 * u); l2.setAttribute("opacity", 0.45 + 0.55 * u);
    };
  };

  /* 3. Le cube que voit l'agent, rescale a [-1, 1] avec ses propres min et max */
  SCENES.crop = function (svg) {
    var CS = 16, GX = 12, GY = 8, OX = 12, OY = 26, WIN = 4, i, j;
    function val(x, y) { return 0.2 + 0.55 * Math.exp(-(Math.pow(x - 8, 2) + Math.pow(y - 3, 2)) / 6) + 0.12 * Math.sin(x * 1.3 + y); }
    var cells = [], g = E("g", {}, svg);
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) {
      cells.push(E("rect", { "class": "a-soft", x: OX + i * CS, y: OY + j * CS, width: CS - 1, height: CS - 1, "fill-opacity": 0.12 + 0.5 * val(i, j) }, g));
    } }
    var win = E("rect", { "class": "a-acc-s", width: WIN * CS, height: WIN * CS, rx: 2 }, svg);
    var px = 236, py = 60, PS = 18, prev = [];
    for (j = 0; j < WIN; j++) { for (i = 0; i < WIN; i++) {
      prev.push(E("rect", { "class": "a-soft", x: px + i * PS, y: py + j * PS, width: PS - 1, height: PS - 1 }, svg));
    } }
    E("rect", { "class": "a-acc-s", x: px - 2, y: py - 2, width: WIN * PS + 3, height: WIN * PS + 3, rx: 2 }, svg);
    var arrow = E("path", { "class": "a-ink", d: "M214 94 H230 M226 90 L231 94 L226 98" }, svg);
    txt(svg, OX, 172, "scan slice", "a-label");
    txt(svg, px, 150, "-1", "a-num"); txt(svg, px + WIN * PS, 150, "1", "a-num", "end");
    var path = [[1, 1], [4, 2], [7, 2], [7, 3]];
    return function (t) {
      var s = t * (path.length - 1), k = Math.min(path.length - 2, Math.floor(s)), u = ease(s - k);
      var wx = Math.round(lerp(path[k][0], path[k + 1][0], u)), wy = Math.round(lerp(path[k][1], path[k + 1][1], u));
      win.setAttribute("x", OX + wx * CS - 0.5); win.setAttribute("y", OY + wy * CS - 0.5);
      var vs = [], mn = 9, mx = -9, n = 0;
      for (j = 0; j < WIN; j++) { for (i = 0; i < WIN; i++) {
        var v = val(wx + i, wy + j); vs.push(v); mn = Math.min(mn, v); mx = Math.max(mx, v);
      } }
      for (n = 0; n < vs.length; n++) { prev[n].setAttribute("fill-opacity", 0.05 + 0.9 * (vs[n] - mn) / Math.max(1e-6, mx - mn)); }
      arrow.setAttribute("opacity", 0.8);
    };
  };

  /* 3b. Les six scores du reseau : le plus haut l'emporte, trois evaluations de suite */
  SCENES.moves = function (svg) {
    var X0 = 40, BW = 30, GAP = 14, BASE = 150, i;
    var rounds = [[0.2, 0.55, 0.35, 0.8, 0.15, 0.4], [0.6, 0.25, 0.3, 0.45, 0.85, 0.2], [0.3, 0.7, 0.9, 0.35, 0.25, 0.5]];
    var bars = [];
    for (i = 0; i < 6; i++) {
      bars.push(E("rect", { "class": "a-ink", x: X0 + i * (BW + GAP), width: BW, rx: 2 }, svg));
      txt(svg, X0 + i * (BW + GAP) + BW / 2, BASE + 16, String(i + 1), "a-label-b", "middle");
    }
    E("line", { "class": "a-ink", x1: X0 - 8, x2: X0 + 6 * (BW + GAP) - GAP + 8, y1: BASE, y2: BASE }, svg);
    var out = txt(svg, 160, 24, "", "a-label-b", "middle");
    return function (t) {
      var s = t * 2.999, r = Math.min(2, Math.floor(s)), u = ease(Math.min(1, (s - r) * 2.2));
      var from = rounds[(r + 2) % 3], to = rounds[r], best = 0;
      if (t >= 0.999) { r = 2; u = 1; from = to = rounds[2]; }
      for (i = 1; i < 6; i++) { if (to[i] > to[best]) { best = i; } }
      for (i = 0; i < 6; i++) {
        var h = 100 * lerp(r === 0 && t < 0.34 ? 0 : from[i], to[i], u);
        bars[i].setAttribute("height", h); bars[i].setAttribute("y", BASE - h);
        bars[i].setAttribute("class", i === best && u > 0.9 ? "a-acc" : "a-ink");
        bars[i].setAttribute("fill-opacity", i === best && u > 0.9 ? 1 : 0.25);
      }
      out.textContent = u > 0.9 ? "m* = " + (best + 1) : "";
    };
  };

  /* 4. La marche : un voxel par pas, jusqu'a tourner en rond, puis l'echelle fine */
  SCENES.walk = function (svg) {
    var GX = 14, GY = 9, C = 20, OX = 20, OY = 6, i;
    var coarse = [[7, 4], [8, 4], [9, 4], [9, 3], [10, 3], [11, 3], [10, 3]];
    var F = C / 3, tgt = [10.45, 3.3];
    var gcF = E("g", { opacity: 0 }, svg), gcC = E("g", {}, svg);
    for (i = 0; i <= GX * 3; i++) { E("line", { "class": "a-fine", x1: OX + i * F, x2: OX + i * F, y1: OY, y2: OY + GY * C }, gcF); }
    for (i = 0; i <= GY * 3; i++) { E("line", { "class": "a-fine", x1: OX, x2: OX + GX * C, y1: OY + i * F, y2: OY + i * F }, gcF); }
    for (i = 0; i <= GX; i++) { E("line", { "class": "a-cell", x1: OX + i * C, x2: OX + i * C, y1: OY, y2: OY + GY * C }, gcC); }
    for (i = 0; i <= GY; i++) { E("line", { "class": "a-cell", x1: OX, x2: OX + GX * C, y1: OY + i * C, y2: OY + i * C }, gcC); }
    E("circle", { "class": "a-dash", cx: OX + 7.5 * C, cy: OY + 4.5 * C, r: 7 }, svg);
    var star = E("path", { "class": "a-seg", d: "M0 -7 L2 -2 L7 -2 L3 1 L5 7 L0 3 L-5 7 L-3 1 L-7 -2 L-2 -2 Z" }, svg);
    star.setAttribute("transform", "translate(" + (OX + tgt[0] * C) + " " + (OY + tgt[1] * C) + ")");
    var trail = E("polyline", { "class": "a-acc-s", fill: "none", "stroke-linejoin": "round" }, svg);
    var ring = E("circle", { "class": "a-nlp-s", r: 9, opacity: 0 }, svg);
    var agent = E("circle", { "class": "a-acc", r: 4.5 }, svg);
    var fine = [[10.5, 3.5], [10.17, 3.5], [10.17, 3.17], [10.5, 3.17], [10.5, 3.5]];
    function cpt(p) { return [OX + (p[0] + 0.5) * C, OY + (p[1] + 0.5) * C]; }
    function fpt(p) { return [OX + p[0] * C, OY + p[1] * C]; }
    var all = [], n;
    for (n = 0; n < coarse.length; n++) { all.push(cpt(coarse[n])); }
    var finePts = [cpt(coarse[coarse.length - 1]), fpt([10.5, 3.5]), fpt([10.5, 3.17]), fpt([10.17, 3.17]), fpt([10.5, 3.17]) ];
    var lab = txt(svg, OX, 196, "", "a-num");
    return function (t) {
      var pts = [], pos, k;
      var ph1 = seg(t, 0.0, 0.58), sw = ease(seg(t, 0.66, 0.78)), ph2 = seg(t, 0.8, 0.97);
      var s1 = ph1 * (all.length - 1);
      k = Math.min(all.length - 2, Math.floor(s1));
      for (n = 0; n <= k; n++) { pts.push(all[n]); }
      pos = [lerp(all[k][0], all[k + 1][0], s1 - k), lerp(all[k][1], all[k + 1][1], s1 - k)];
      pts.push(pos);
      var arrived = ph1 >= 1;
      if (arrived) {
        pts = all.slice();
        var s2 = ph2 * (finePts.length - 1), k2 = Math.min(finePts.length - 2, Math.floor(s2));
        pos = all[all.length - 1];
        if (sw > 0.99 && ph2 > 0) {
          for (n = 1; n <= k2; n++) { pts.push(finePts[n]); }
          pos = [lerp(finePts[k2][0], finePts[k2 + 1][0], s2 - k2), lerp(finePts[k2][1], finePts[k2 + 1][1], s2 - k2)];
          pts.push(pos);
        }
      }
      gcF.setAttribute("opacity", sw);
      gcC.setAttribute("opacity", 1 - 0.5 * sw);
      trail.setAttribute("points", pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "));
      agent.setAttribute("cx", pos[0]); agent.setAttribute("cy", pos[1]);
      var rp = all[4];
      ring.setAttribute("cx", rp[0]); ring.setAttribute("cy", rp[1]);
      ring.setAttribute("opacity", arrived && sw < 0.99 ? 1 : 0);
      lab.textContent = "";
    };
  };

  /* 5. Moyenne finale : six reprises, la moyenne tombe entre deux voxels.
     Vue 2D : projection des six departs (+-x, +-y, +-z) sur un plan, les deux departs
     en z tombent au centre (points creux). Les arrivees sont des voxels entiers,
     seule la moyenne tombe entre deux voxels. */
  SCENES.focus = function (svg) {
    var CX = 160, CY = 92, V = 22, i;
    for (i = -6; i <= 6; i++) {
      E("line", { "class": "a-fine", x1: CX + i * V - V / 2, x2: CX + i * V - V / 2, y1: 12, y2: 172 }, svg);
      if (Math.abs(i) <= 3) { E("line", { "class": "a-fine", x1: 20, x2: 300, y1: CY + i * V - V / 2, y2: CY + i * V - V / 2 }, svg); }
    }
    var starts = [[4, 0], [-4, 0], [0, 4], [0, -4], [-0.3, -0.3], [0.3, 0.3]];
    var hollow = [false, false, false, false, true, true];
    var lands = [[1, 0], [0, 0], [1, 1], [0, 1], [1, -1], [0, -1]];
    var mean = [0, 0];
    lands.forEach(function (l) { mean[0] += l[0] / 6; mean[1] += l[1] / 6; });
    var dots = starts.map(function (s, k) {
      return E("circle", hollow[k] ? { "class": "a-acc-s", r: 4, fill: "none" } : { "class": "a-acc", r: 4 }, svg);
    });
    var land = lands.map(function () { return E("rect", { "class": "a-acc-s", width: 16, height: 16, rx: 2, opacity: 0, fill: "none" }, svg); });
    var m = E("g", { opacity: 0 }, svg);
    E("circle", { "class": "a-seg", r: 6 }, m);
    E("path", { "class": "a-ink", d: "M-11 0 H11 M0 -11 V11" }, m);
    return function (t) {
      var w = ease(seg(t, 0.08, 0.6)), u = ease(seg(t, 0.68, 0.92));
      dots.forEach(function (d, k) {
        var x = lerp(starts[k][0], lands[k][0], w), y = lerp(starts[k][1], lands[k][1], w);
        d.setAttribute("cx", CX + x * V); d.setAttribute("cy", CY + y * V);
        land[k].setAttribute("x", CX + lands[k][0] * V - 8); land[k].setAttribute("y", CY + lands[k][1] * V - 8);
        land[k].setAttribute("opacity", w > 0.98 ? 0.8 * (1 - u) : 0);
        d.setAttribute("opacity", 1 - 0.7 * u);
      });
      m.setAttribute("transform", "translate(" + (CX + mean[0] * V) + " " + (CY + mean[1] * V) + ")");
      m.setAttribute("opacity", u);
    };
  };

  /* 6. De l'indice de voxel aux millimetres */
  SCENES.mm = function (svg) {
    var X0 = 24, C = 22, N = 12, v = 7, o = 2.4, s = 0.5, i, Y1 = 40, Y2 = 124, Z = X0 + (o + 0.5) * C;
    for (i = 0; i < N; i++) {
      E("rect", { "class": "a-cell", x: X0 + i * C, y: Y1, width: C, height: 22 }, svg);
      txt(svg, X0 + i * C + C / 2, Y1 + 15, String(i), "a-num", "middle");
    }
    var cell = E("rect", { "class": "a-acc", x: X0 + v * C, y: Y1, width: C, height: 22 }, svg);
    E("line", { "class": "a-ink", x1: X0, x2: X0 + N * C, y1: Y2, y2: Y2 }, svg);
    var mm;
    for (mm = -1; mm <= 6; mm++) {
      var xx = Z + mm / s * C;
      if (xx >= X0 && xx <= X0 + N * C) {
        E("line", { "class": "a-ink", x1: xx, x2: xx, y1: Y2 - 4, y2: Y2 + 4 }, svg);
        txt(svg, xx, Y2 + 16, String(mm), "a-num", "middle");
      }
    }
    var org = E("path", { "class": "a-nlp", d: "M0 0 l-4 -8 h8 z" }, svg);
    org.setAttribute("transform", "translate(" + Z + " " + (Y2 - 5) + ")");
    var vx = X0 + (v + 0.5) * C;
    var off = E("line", { "class": "a-nlp-s", y1: Y1 + 34, y2: Y1 + 34, x1: X0 + 0.5 * C, x2: X0 + 0.5 * C }, svg);
    var drop = E("line", { "class": "a-acc-s", x1: vx, x2: vx, y1: Y1 + 22, y2: Y1 + 22 }, svg);
    var dot = E("circle", { "class": "a-acc", r: 4.5, cx: vx, cy: Y1 + 22, opacity: 0 }, svg);
    var val = txt(svg, vx, Y2 + 36, "", "a-label-b", "middle");
    txt(svg, X0, 30, "index", "a-label"); txt(svg, X0, Y2 + 36, "mm", "a-label");
    return function (t) {
      var a = ease(seg(t, 0.1, 0.4)), b = ease(seg(t, 0.5, 0.85));
      cell.setAttribute("opacity", 0.35 + 0.4 * seg(t, 0, 0.1));
      off.setAttribute("x2", lerp(X0 + 0.5 * C, Z, a));
      off.setAttribute("opacity", a > 0 ? 1 : 0);
      drop.setAttribute("y2", lerp(Y1 + 22, Y2 - 5, b));
      dot.setAttribute("cy", lerp(Y1 + 22, Y2 - 5, b)); dot.setAttribute("opacity", b > 0 ? 1 : 0);
      val.textContent = b > 0.95 ? ((v - o) * s).toFixed(1) : "";
    };
  };

  /* 7. La sphere unite : centrer sur la boite, puis diviser par la plus grande distance */
  SCENES.sphere = function (svg) {
    var CX = 160, CY = 92, R = 70;
    var raw = [], n = 16, i;
    for (i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, rr = 34 + 14 * Math.sin(a * 2 + 0.6) + 9 * Math.cos(a * 3);
      raw.push([Math.cos(a) * rr * 1.5, Math.sin(a) * rr * 0.9]);
    }
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    raw.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
    var bc = [(minx + maxx) / 2, (miny + maxy) / 2], D = Math.hypot(maxx - bc[0], maxy - bc[1]);
    E("circle", { "class": "a-dash", cx: CX, cy: CY, r: R }, svg);
    var box = E("rect", { "class": "a-dash" }, svg);
    var poly = E("polygon", { "class": "a-acc", "fill-opacity": 0.35, stroke: "none" }, svg);
    var edge = E("polygon", { "class": "a-acc-s", "stroke-linejoin": "round" }, svg);
    var ctr = E("path", { "class": "a-nlp-s", d: "M-5 0 H5 M0 -5 V5" }, svg);
    var corner = E("circle", { "class": "a-seg", r: 3.5 }, svg);
    txt(svg, CX, 184, "1", "a-label-b", "middle");
    var off0 = [-70, 18], sc0 = 0.95;
    return function (t) {
      var a = ease(seg(t, 0.1, 0.45)), b = ease(seg(t, 0.5, 0.9));
      var sc = lerp(sc0, R / D, b);
      var tx = lerp(CX + off0[0], CX, a), ty = lerp(CY + off0[1], CY, a);
      function map(p) { return [tx + (p[0] - bc[0]) * sc, ty + (p[1] - bc[1]) * sc]; }
      var pts = raw.map(map).map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
      poly.setAttribute("points", pts); edge.setAttribute("points", pts);
      var a1 = map([minx, miny]), a2 = map([maxx, maxy]);
      box.setAttribute("x", a1[0]); box.setAttribute("y", a1[1]); box.setAttribute("width", a2[0] - a1[0]); box.setAttribute("height", a2[1] - a1[1]);
      ctr.setAttribute("transform", "translate(" + tx + " " + ty + ")");
      corner.setAttribute("cx", a2[0]); corner.setAttribute("cy", a2[1]);
    };
  };

  /* 8. Les cameras : les VRAIS vecteurs de direction des tables du code, en projection oblique.
     Mandibule (tables 'Lower'). O et C : position = centre + r d, avec d comme dans le code
     (les vecteurs de O ne sont pas tous de longueur 1, on garde leur longueur reelle).
     MG : visee + r d, abaissee de 0.15 r, d tournee de +-0.35 rad autour de la verticale.
     Seule la dent est un croquis. */
  SCENES.cameras = function (svg, fig) {
    var CX = 160, CY = 100, K = 290, i;
    var AZ = 38 * Math.PI / 180, EL = 24 * Math.PI / 180;
    function nrm(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); }
    function div(v, n) { return [v[0] / n, v[1] / n, v[2] / n]; }
    function proj(p) {
      var xr = p[0] * Math.cos(AZ) + p[1] * Math.sin(AZ), yr = -p[0] * Math.sin(AZ) + p[1] * Math.cos(AZ);
      return [CX + xr * K, CY - (p[2] * Math.cos(EL) + yr * Math.sin(EL)) * K, yr];
    }
    var cvec = [[1, 0, 0], [-1, 0, 0], [1, -1, 0], [-1, -1, 0], [1, 1, 0], [-1, 1, 0],
      [1, 0, 0.5], [-1, 0, 0.5], [1, -1, 0.5], [-1, -1, 0.5], [1, 1, 0.5], [-1, 1, 0.5]];
    var sp = 0.35, front = [0, -1, 0];
    var nets = {
      O: { r: 0.2, dirs: [[0, 0, 1], div([0.5, 0, 1], nrm([0.5, 0.5, 1])), div([-0.5, 0, 1], nrm([-0.5, -0.5, 1])),
        div([0, 0.5, 1], nrm([1, 0, 1])), div([0, -0.5, 1], nrm([0, 1, 1]))], drop: 0 },
      C: { r: 0.3, dirs: cvec.map(function (v) { return div(v, nrm(v)); }), drop: 0 },
      MG: { r: 0.2, dirs: [front,
        [front[0] * Math.cos(sp) - front[1] * Math.sin(sp), front[0] * Math.sin(sp) + front[1] * Math.cos(sp), 0],
        [front[0] * Math.cos(sp) + front[1] * Math.sin(sp), -front[0] * Math.sin(sp) + front[1] * Math.cos(sp), 0]], drop: 0.15 }
    };
    var tooth = E("polygon", { "class": "a-acc", "fill-opacity": 0.45, points: "148,112 152,90 160,82 168,90 172,112 164,116 156,116" }, svg);
    var g = E("g", {}, svg), net = "O", cams = [];
    function build() {
      while (g.firstChild) { g.removeChild(g.firstChild); }
      cams = [];
      var d = nets[net], c = [CX, CY];
      E("circle", { "class": "a-dash", cx: CX, cy: CY, r: d.r * K }, g);
      d.dirs.forEach(function (v) {
        var p = [v[0] * d.r, v[1] * d.r, v[2] * d.r - d.drop * d.r], q = proj(p);
        var ang = Math.atan2(CY - q[1], CX - q[0]) * 180 / Math.PI;
        var node = E("g", { transform: "translate(" + q[0].toFixed(1) + " " + q[1].toFixed(1) + ") rotate(" + ang.toFixed(1) + ")" }, g);
        E("path", { "class": "a-ana", d: "M7 0 L-6 5 L-6 -5 Z" }, node);
        var ray = E("line", { "class": "a-acc-s", x1: q[0], y1: q[1], x2: CX, y2: CY - 4, opacity: 0 }, g);
        cams.push({ ray: ray, node: node, back: q[2] > 0.05 });
      });
    }
    var tabs = fig.querySelectorAll("[data-net]"), tags = fig.querySelectorAll("[data-for]");
    function select(name) {
      net = name; build();
      for (i = 0; i < tabs.length; i++) { tabs[i].setAttribute("aria-pressed", tabs[i].getAttribute("data-net") === name ? "true" : "false"); }
      for (i = 0; i < tags.length; i++) { tags[i].className = tags[i].getAttribute("data-for") === name ? "on" : ""; }
    }
    for (i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function (e) { select(e.currentTarget.getAttribute("data-net")); });
    }
    select("O");
    return function (t) {
      var n = cams.length, k = Math.min(n - 1, Math.floor(t * n)), j;
      for (j = 0; j < n; j++) {
        cams[j].ray.setAttribute("opacity", j === k ? 0.9 : 0);
        cams[j].node.setAttribute("opacity", (j <= k ? 1 : 0.5) * (cams[j].back ? 0.6 : 1));
      }
    };
  };

  /* 9. Du pixel au point 3D : pixels, triangles, centroide, accrochage */
  SCENES.pixel = function (svg) {
    var PX = 16, PY = 36, P = 14, i, j, on = {};
    [[2,2],[3,2],[2,3],[3,3],[4,3],[3,4],[4,4],[5,4]].forEach(function (c) { on[c[0] + "," + c[1]] = 1; });
    var pix = [];
    for (j = 0; j < 8; j++) { for (i = 0; i < 8; i++) {
      var r = E("rect", { "class": on[i + "," + j] ? "a-acc" : "a-cell", x: PX + i * P, y: PY + j * P, width: P, height: P }, svg);
      if (on[i + "," + j]) { r.setAttribute("opacity", 0.9); pix.push([PX + (i + 0.5) * P, PY + (j + 0.5) * P]); }
      else { r.setAttribute("class", "a-cell"); }
    }}
    var SX = 168, surf = [], k;
    for (k = 0; k <= 7; k++) { surf.push([SX + k * 20, 112 + 16 * Math.sin(k * 0.8)]); }
    var low = surf.map(function (p) { return [p[0] + 4, p[1] + 34]; });
    var tris = [];
    for (k = 0; k < 7; k++) {
      tris.push([surf[k], surf[k + 1], low[k]]); tris.push([surf[k + 1], low[k + 1], low[k]]);
    }
    var tel = tris.map(function (tr) {
      return E("polygon", { "class": "a-cell", points: tr.map(function (p) { return p.join(","); }).join(" "), fill: "none" }, svg);
    });
    var sel = [4, 5, 6, 7, 8, 9, 10], hitCtr = sel.map(function (n) {
      var tr = tris[n]; return [(tr[0][0] + tr[1][0] + tr[2][0]) / 3, (tr[0][1] + tr[1][1] + tr[2][1]) / 3];
    });
    var lines = pix.map(function (p, n) {
      return E("line", { "class": "a-acc-s", x1: p[0], y1: p[1], x2: hitCtr[n % hitCtr.length][0], y2: hitCtr[n % hitCtr.length][1], opacity: 0, "stroke-width": 0.8 }, svg);
    });
    /* le code additionne les 3 sommets du triangle de CHAQUE pixel : un triangle vu par
       deux pixels compte deux fois (ici le premier et le dernier pixel partagent un triangle) */
    var cx = 0, cy = 0, verts = {}, all = [];
    pix.forEach(function (p, n) { tris[sel[n % sel.length]].forEach(function (v) { all.push(v); verts[v.join(",")] = v; }); });
    var vs = Object.keys(verts).map(function (q) { return verts[q]; });
    all.forEach(function (v) { cx += v[0] / all.length; cy += v[1] / all.length; });
    var vdots = vs.map(function (v) { return E("circle", { "class": "a-seg", cx: v[0], cy: v[1], r: 2.8, opacity: 0 }, svg); });
    var surfLine = E("polyline", { "class": "a-ink", points: surf.map(function (p) { return p.join(","); }).join(" ") }, svg);
    var near = surf[0], best = 1e9;
    surf.concat(low).forEach(function (p) { var d = Math.hypot(p[0] - cx, p[1] - cy); if (d < best) { best = d; near = p; } });
    var cen = E("g", { opacity: 0 }, svg);
    E("circle", { "class": "a-nlp", r: 5 }, cen); E("path", { "class": "a-ink", d: "M-9 0 H9 M0 -9 V9" }, cen);
    var snapLine = E("line", { "class": "a-dash", x1: cx, y1: cy, x2: cx, y2: cy, opacity: 0 }, svg);
    return function (t) {
      var a = ease(seg(t, 0.05, 0.3)), b = ease(seg(t, 0.3, 0.5)), c = ease(seg(t, 0.55, 0.75)), d = ease(seg(t, 0.78, 0.97));
      lines.forEach(function (l) { l.setAttribute("opacity", 0.75 * a * (1 - 0.6 * c)); });
      sel.forEach(function (n) { tel[n].setAttribute("class", b > 0.5 ? "a-seg-s" : "a-cell"); });
      vdots.forEach(function (v) { v.setAttribute("opacity", c); });
      var px = lerp(cx, near[0], d), py = lerp(cy, near[1], d);
      cen.setAttribute("transform", "translate(" + px + " " + py + ")");
      cen.setAttribute("opacity", c);
      snapLine.setAttribute("x2", near[0]); snapLine.setAttribute("y2", near[1]); snapLine.setAttribute("opacity", d > 0 ? 0.7 : 0);
    };
  };

  /* ------------------------------------------------------------------ */
  function init(fig) {
    var svg = fig.querySelector("svg");
    var make = SCENES[fig.getAttribute("data-scene")];
    if (!svg || !make) { return; }
    var holder = E("g", { "class": "algo-scene" }, svg);
    var draw = make(holder, fig);
    var DUR = parseInt(fig.getAttribute("data-ms") || "5200", 10), PAUSE = 1400;
    var frozen = /algo=([0-9.]+)/.exec(window.location.hash || "");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (frozen) { draw(parseFloat(frozen[1])); return; }
    if (reduce) { draw(1); return; }
    var start = null, raf = 0, visible = false;
    function tick(ts) {
      if (!visible) { raf = 0; return; }
      if (start === null) { start = ts; }
      var el = ts - start, period = DUR + PAUSE;
      var t = (el % period) / DUR;
      draw(t > 1 ? 1 : t);
      raf = window.requestAnimationFrame(tick);
    }
    function go() { if (!raf && visible) { start = null; raf = window.requestAnimationFrame(tick); } }
    draw(1);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { go(); } }, { rootMargin: "50px" }).observe(fig);
    } else { visible = true; go(); }
    var btn = fig.querySelector(".algo-play");
    if (btn) { btn.addEventListener("click", function () { start = null; visible = true; if (!raf) { go(); } else { start = null; } }); }
  }

  function boot() {
    var figs = document.querySelectorAll("figure.algo[data-scene]");
    for (var i = 0; i < figs.length; i++) {
      try { init(figs[i]); } catch (e) { if (window.console) { console.warn("algo :", e); } }
    }
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", boot); } else { boot(); }
})();
