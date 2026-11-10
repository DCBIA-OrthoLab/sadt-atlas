/* algo-CLIC.js : scenes du module CLIC (pages atlas VISOR et legacy).
   Aucune chaine traduisible ici : seulement des nombres et des symboles.
   Les couleurs sont des classes .a-* (jetons du theme). */
(function () {
  "use strict";
  var A = window.Algo;
  if (!A) { return; }
  var E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;

  /* 1. La boucle sur les coupes : une coupe axiale a la fois, le reseau, puis le masque peint */
  A.scenes.clic_slices = function (svg) {
    var N = 9, i, cells = [];
    for (i = 0; i < N; i++) {
      cells.push(E("rect", { "class": "a-cell", x: 20 + i * 33, y: 16, width: 28, height: 28, rx: 2 }, svg));
    }
    var fill = E("g", {}, svg), marks = [];
    for (i = 0; i < N; i++) {
      marks.push(E("rect", { "class": "a-seg", x: 20 + i * 33, y: 16, width: 28, height: 28, rx: 2, opacity: 0 }, fill));
    }
    var cur = E("rect", { "class": "a-acc-s", y: 13, width: 34, height: 34, rx: 3 }, svg);
    E("rect", { "class": "a-cell", x: 30, y: 70, width: 110, height: 100 }, svg);
    E("rect", { "class": "a-nlp-s", x: 164, y: 98, width: 44, height: 44, rx: 4 }, svg);
    E("path", { "class": "a-ink", d: "M142 120 H162 M157 116 L162 120 L157 124" }, svg);
    E("path", { "class": "a-ink", d: "M210 120 H226 M221 116 L226 120 L221 124" }, svg);
    E("rect", { "class": "a-cell", x: 230, y: 70, width: 70, height: 100 }, svg);
    var blob = E("ellipse", { "class": "a-soft", cx: 85, cy: 120, "fill-opacity": 0.2 }, svg);
    var out = E("ellipse", { "class": "a-seg", cx: 265, cy: 120, opacity: 0 }, svg);
    txt(svg, 30, 186, "z", "a-label-b");
    var zl = txt(svg, 42, 186, "", "a-num");
    return function (t) {
      var idx = Math.min(N - 1, Math.floor(t * N)), ph = t * N - idx;
      if (t >= 0.999) { idx = N - 1; ph = 1; }
      for (i = 0; i < N; i++) { marks[i].setAttribute("opacity", i < idx || (i === idx && ph > 0.7) ? 0.55 : 0); }
      cur.setAttribute("x", 17 + idx * 33);
      var r = 0.35 + 0.65 * Math.sin(Math.PI * (idx + 0.5) / N);
      blob.setAttribute("rx", 14 + 26 * r); blob.setAttribute("ry", 12 + 22 * r);
      out.setAttribute("rx", (14 + 26 * r) * 0.636); out.setAttribute("ry", (12 + 22 * r) * 0.636);
      out.setAttribute("opacity", ph > 0.5 ? 0.7 : 0);
      zl.textContent = "= " + idx;
    };
  };

  /* 2. Min-max d'UNE coupe : le plus sombre devient 0, le plus clair 1 */
  A.scenes.clic_minmax = function (svg) {
    var vals = [0.42, 0.5, 0.47, 0.58, 0.52, 0.61, 0.45, 0.55, 0.4, 0.57, 0.49, 0.53];
    var N = vals.length, X0 = 30, BW = 16, GAP = 4, BASE = 160, H = 120, i;
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    E("line", { "class": "a-ink", x1: X0 - 8, x2: X0 + N * (BW + GAP), y1: BASE, y2: BASE }, svg);
    var bars = [];
    for (i = 0; i < N; i++) {
      bars.push(E("rect", { "class": vals[i] === lo || vals[i] === hi ? "a-acc" : "a-soft", x: X0 + i * (BW + GAP), width: BW, rx: 2 }, svg));
    }
    var lL = E("line", { "class": "a-dash", x1: X0 - 8, x2: X0 + N * (BW + GAP) + 6 }, svg);
    var lH = E("line", { "class": "a-dash", x1: X0 - 8, x2: X0 + N * (BW + GAP) + 6 }, svg);
    txt(svg, X0 + N * (BW + GAP) + 10, BASE + 3, "0", "a-num");
    txt(svg, X0 + N * (BW + GAP) + 10, BASE - H + 3, "1", "a-num");
    return function (t) {
      var u = ease(seg(t, 0.25, 0.8));
      for (i = 0; i < N; i++) {
        var nv = (vals[i] - lo) / (hi - lo), v = lerp(vals[i], nv, u), h = H * v;
        bars[i].setAttribute("height", h); bars[i].setAttribute("y", BASE - h);
        bars[i].setAttribute("fill-opacity", vals[i] === lo || vals[i] === hi ? 1 : 0.35);
      }
      lL.setAttribute("y1", BASE - H * lerp(lo, 0, u)); lL.setAttribute("y2", BASE - H * lerp(lo, 0, u));
      lH.setAttribute("y1", BASE - H * lerp(hi, 1, u)); lH.setAttribute("y2", BASE - H * lerp(hi, 1, u));
    };
  };

  /* 3. Le seuil sur le score d'instance : au-dessus on garde, en dessous on jette */
  A.scenes.clic_score = function (svg) {
    var sc = [0.97, 0.91, 0.82, 0.74, 0.55, 0.32, 0.12], N = sc.length, X0 = 36, BW = 28, GAP = 12, BASE = 160, H = 130, i;
    E("line", { "class": "a-ink", x1: X0 - 10, x2: X0 + N * (BW + GAP), y1: BASE, y2: BASE }, svg);
    var bars = [];
    for (i = 0; i < N; i++) {
      bars.push(E("rect", { "class": "a-acc", x: X0 + i * (BW + GAP), width: BW, rx: 2, y: BASE - H * sc[i], height: H * sc[i] }, svg));
    }
    var line = E("line", { "class": "a-acc-s", x1: X0 - 10, x2: X0 + N * (BW + GAP) }, svg);
    var tag = txt(svg, X0 + N * (BW + GAP) + 4, 0, "0.7", "a-label-b");
    txt(svg, 8, BASE + 3, "0", "a-num"); txt(svg, 8, BASE - H + 3, "1", "a-num");
    return function (t) {
      var th = lerp(1, 0.7, ease(seg(t, 0.1, 0.5))), done = ease(seg(t, 0.55, 0.85));
      var y = BASE - H * th;
      line.setAttribute("y1", y); line.setAttribute("y2", y); tag.setAttribute("y", y + 4);
      for (i = 0; i < N; i++) {
        var keep = sc[i] >= th;
        bars[i].setAttribute("opacity", keep ? 1 : 1 - 0.75 * done);
        bars[i].setAttribute("class", (keep || done <= 0) ? "a-acc" : "a-soft");
      }
    };
  };

  /* 4. Le seuil sur la probabilite d'un pixel du masque */
  A.scenes.clic_mask = function (svg) {
    var GX = 9, GY = 8, C = 19, OX = 20, OY = 14, i, j, cells = [];
    function p(x, y) {
      return Math.min(1, 0.95 * Math.exp(-(Math.pow(x - 4, 2) / 5 + Math.pow(y - 3.4, 2) / 4.5)) + 0.04 * ((x * 7 + y * 3) % 5) / 4);
    }
    var vals = [];
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) {
      var v = p(i, j); vals.push(v);
      cells.push(E("rect", { "class": "a-soft", x: OX + i * C, y: OY + j * C, width: C - 1, height: C - 1 }, svg));
    } }
    var GX0 = 238;
    E("line", { "class": "a-ink", x1: GX0, x2: GX0, y1: 20, y2: 150 }, svg);
    txt(svg, GX0 + 6, 24, "1", "a-num"); txt(svg, GX0 + 6, 153, "0", "a-num");
    var ln = E("line", { "class": "a-acc-s", x1: GX0 - 8, x2: GX0 + 30 }, svg);
    var tg = txt(svg, GX0 + 34, 0, "0.5", "a-label-b");
    return function (t) {
      var a = ease(seg(t, 0.15, 0.4)), b = ease(seg(t, 0.55, 0.85));
      var y = 150 - 130 * 0.5;
      ln.setAttribute("y1", y); ln.setAttribute("y2", y); ln.setAttribute("opacity", a); tg.setAttribute("y", y + 4); tg.setAttribute("opacity", a);
      for (var k = 0; k < cells.length; k++) {
        var on = vals[k] > 0.5;
        if (b > 0) {
          cells[k].setAttribute("class", on ? "a-seg" : "a-soft");
          cells[k].setAttribute("fill-opacity", on ? lerp(0.1 + 0.8 * vals[k], 0.9, b) : lerp(0.1 + 0.8 * vals[k], 0.04, b));
        } else {
          cells[k].setAttribute("class", "a-soft");
          cells[k].setAttribute("fill-opacity", 0.06 + 0.8 * vals[k]);
        }
      }
    };
  };

  /* 5. Le dernier peint gagne : deux masques se recouvrent, l'ordre decide */
  A.scenes.clic_paint = function (svg) {
    var GX = 11, GY = 7, C = 22, OX = 24, OY = 22, i, j, cells = [];
    for (j = 0; j < GY; j++) { for (i = 0; i < GX; i++) {
      cells.push({ i: i, j: j, el: E("rect", { "class": "a-cell", x: OX + i * C, y: OY + j * C, width: C, height: C }, svg) });
    } }
    function inA(i, j) { return i >= 1 && i <= 6 && j >= 1 && j <= 4; }
    function inB(i, j) { return i >= 4 && i <= 9 && j >= 2 && j <= 5; }
    var fills = cells.map(function (c) { return E("rect", { x: OX + c.i * C + 1, y: OY + c.j * C + 1, width: C - 2, height: C - 2, opacity: 0, "class": "a-seg" }, svg); });
    var ov = E("rect", { "class": "a-acc-s", x: OX + 4 * C, y: OY + 2 * C, width: 3 * C, height: 3 * C }, svg);
    txt(svg, 30, 15, "1", "a-label-b"); txt(svg, 190, 15, "2", "a-label-b");
    return function (t) {
      var a = ease(seg(t, 0.08, 0.38)), b = ease(seg(t, 0.45, 0.75));
      for (var k = 0; k < cells.length; k++) {
        var c = cells[k], A1 = inA(c.i, c.j), B1 = inB(c.i, c.j), f = fills[k];
        if (B1 && b > 0) { f.setAttribute("class", "a-nlp"); f.setAttribute("opacity", 0.75 * b + (A1 ? 0.25 * (1 - b) : 0)); }
        else if (A1) { f.setAttribute("class", "a-seg"); f.setAttribute("opacity", 0.75 * a); }
        else { f.setAttribute("opacity", 0); }
      }
      ov.setAttribute("opacity", b > 0.9 ? 1 : 0);
    };
  };
})();
