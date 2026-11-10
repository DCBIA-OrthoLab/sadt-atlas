/* Scenes de AutoCrop3D (VISOR et legacy). Aucune chaine traduisible : des nombres et des noms de fichiers d'exemple. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;
  function grid(svg, x0, y0, nx, ny, cs, cls) {
    var out = [], i, j;
    for (j = 0; j < ny; j++) { out[j] = []; for (i = 0; i < nx; i++) {
      out[j][i] = E("rect", { "class": cls || "a-cell", x: x0 + i * cs, y: y0 + j * cs, width: cs, height: cs }, svg);
    } }
    return out;
  }

  /* Du cadre physique aux indices : troncature vers zero, puis tranche */
  A.scenes.autocrop3d_box = function (svg) {
    var X0 = 20, Y0 = 14, C = 20, NX = 12, NY = 8, i, j;
    var lo = [2.7, 1.6], hi = [8.4, 5.7], tl = [Math.floor(lo[0]), Math.floor(lo[1])], th = [Math.floor(hi[0]), Math.floor(hi[1])];
    var cells = grid(svg, X0, Y0, NX, NY, C, "a-cell");
    var fill = [];
    for (j = 0; j < NY; j++) { fill[j] = []; for (i = 0; i < NX; i++) {
      fill[j][i] = E("rect", { "class": "a-seg", x: X0 + i * C + 1, y: Y0 + j * C + 1, width: C - 2, height: C - 2, opacity: 0 }, svg);
    } }
    var box = E("rect", { "class": "a-acc-s", rx: 1 }, svg);
    var cLo = E("circle", { "class": "a-acc", r: 4 }, svg), cHi = E("circle", { "class": "a-acc", r: 4 }, svg);
    var sLo = E("circle", { "class": "a-seg-s", r: 6 }, svg), sHi = E("circle", { "class": "a-seg-s", r: 6 }, svg);
    var n1 = txt(svg, 0, 0, "", "a-num"), n2 = txt(svg, 0, 0, "", "a-num");
    var px = function (v, o) { return o + v * C; };
    return function (t) {
      var a = ease(seg(t, 0.05, 0.3)), b = ease(seg(t, 0.35, 0.6)), c = ease(seg(t, 0.65, 0.9));
      var x1 = lerp(px(lo[0], X0), px(tl[0], X0), b), y1 = lerp(px(lo[1], Y0), px(tl[1], Y0), b);
      var x2 = lerp(px(hi[0], X0), px(th[0], X0), b), y2 = lerp(px(hi[1], Y0), px(th[1], Y0), b);
      box.setAttribute("x", x1); box.setAttribute("y", y1); box.setAttribute("width", x2 - x1); box.setAttribute("height", y2 - y1);
      box.setAttribute("opacity", a);
      cLo.setAttribute("cx", x1); cLo.setAttribute("cy", y1); cHi.setAttribute("cx", x2); cHi.setAttribute("cy", y2);
      cLo.setAttribute("opacity", a); cHi.setAttribute("opacity", a);
      sLo.setAttribute("cx", x1); sLo.setAttribute("cy", y1); sHi.setAttribute("cx", x2); sHi.setAttribute("cy", y2);
      sLo.setAttribute("opacity", b > 0.9 ? 1 : 0); sHi.setAttribute("opacity", b > 0.9 ? 1 : 0);
      n1.setAttribute("x", x1 - 4); n1.setAttribute("y", y1 - 7); n1.setAttribute("text-anchor", "end");
      n2.setAttribute("x", x2 + 7); n2.setAttribute("y", y2 + 14);
      n1.textContent = a > 0.2 ? (b > 0.5 ? tl[0] + ", " + tl[1] : lo[0] + ", " + lo[1]) : "";
      n2.textContent = a > 0.2 ? (b > 0.5 ? th[0] + ", " + th[1] : hi[0] + ", " + hi[1]) : "";
      for (j = 0; j < NY; j++) { for (i = 0; i < NX; i++) {
        var inside = i >= tl[0] && i < th[0] && j >= tl[1] && j < th[1];
        fill[j][i].setAttribute("opacity", inside ? 0.55 * c : 0);
      } }
    };
  };

  /* Axe a direction negative : le coin bas du cadre tombe sur le plus grand indice, d'ou l'echange */
  A.scenes.autocrop3d_swap = function (svg) {
    var X0 = 20, Y = 60, C = 28, N = 10, i, pl = 2.3, pu = 7.6;
    var cells = [], marks = [];
    for (i = 0; i < N; i++) {
      cells.push(E("rect", { "class": "a-cell", x: X0 + i * C, y: Y, width: C, height: 30 }, svg));
      cells.push(txt(svg, X0 + i * C + C / 2, Y + 20, String(N - 1 - i), "a-num", "middle"));
    }
    var hl = [];
    for (i = 0; i < N; i++) { hl.push(E("rect", { "class": "a-seg", x: X0 + i * C + 1, y: Y + 1, width: C - 2, height: 28, opacity: 0 }, svg)); }
    E("line", { "class": "a-ink", x1: X0, x2: X0 + N * C, y1: 128, y2: 128 }, svg);
    E("path", { "class": "a-ink", d: "M" + (X0 + N * C) + " 128 l-6 -3 v6 z" }, svg);
    var dl = E("circle", { "class": "a-ana", r: 5, cy: 128 }, svg), du = E("circle", { "class": "a-nlp", r: 5, cy: 128 }, svg);
    var ll = E("line", { "class": "a-ana-s", y1: 128, y2: Y + 30 }, svg), lu = E("line", { "class": "a-nlp-s", y1: 128, y2: Y + 30 }, svg);
    var xl = X0 + pl * C, xu = X0 + pu * C;
    var il = N - 1 - Math.floor(pl), iu = N - 1 - Math.floor(pu); /* 7 et 2 */
    var tl = txt(svg, 0, 48, "", "a-label-b", "middle"), tu = txt(svg, 0, 48, "", "a-label-b", "middle");
    return function (t) {
      var a = ease(seg(t, 0.05, 0.35)), b = ease(seg(t, 0.45, 0.7)), c = ease(seg(t, 0.72, 0.95));
      dl.setAttribute("cx", xl); du.setAttribute("cx", xu); dl.setAttribute("opacity", a); du.setAttribute("opacity", a);
      ll.setAttribute("x1", xl); ll.setAttribute("x2", xl); lu.setAttribute("x1", xu); lu.setAttribute("x2", xu);
      ll.setAttribute("opacity", b); lu.setAttribute("opacity", b);
      tl.setAttribute("x", xl); tu.setAttribute("x", xu);
      tl.textContent = b > 0.5 ? String(il) : ""; tu.textContent = b > 0.5 ? String(iu) : "";
      for (i = 0; i < N; i++) {
        var idx = N - 1 - i, inside = idx >= Math.min(il, iu) && idx < Math.max(il, iu);
        hl[i].setAttribute("opacity", inside ? 0.55 * c : 0);
      }
    };
  };

  /* Le bloc extrait garde pas, direction et valeurs ; seule l'origine se deplace */
  A.scenes.autocrop3d_origin = function (svg) {
    var X0 = 20, Y0 = 30, W = 150, H = 120, BX = 60, BY = 40, BW = 70, BH = 54;
    E("rect", { "class": "a-ink", x: X0, y: Y0, width: W, height: H }, svg);
    var o1 = E("circle", { "class": "a-seg", cx: X0, cy: Y0, r: 4.5 }, svg);
    var blk = E("rect", { "class": "a-acc", x: X0 + BX, y: Y0 + BY, width: BW, height: BH, opacity: 0.3 }, svg);
    var blk2 = E("rect", { "class": "a-acc-s", x: X0 + BX, y: Y0 + BY, width: BW, height: BH }, svg);
    var arrow = E("line", { "class": "a-nlp-s", x1: X0, y1: Y0, x2: X0, y2: Y0 }, svg);
    var o2 = E("circle", { "class": "a-nlp", r: 4.5, cx: X0 + BX, cy: Y0 + BY, opacity: 0 }, svg);
    var cp = E("g", {}, svg);
    E("rect", { "class": "a-acc", x: 0, y: 0, width: BW, height: BH, opacity: 0.3 }, cp);
    E("rect", { "class": "a-acc-s", x: 0, y: 0, width: BW, height: BH }, cp);
    var o3 = E("circle", { "class": "a-nlp", cx: 0, cy: 0, r: 4.5 }, cp);
    return function (t) {
      var a = ease(seg(t, 0.1, 0.4)), b = ease(seg(t, 0.5, 0.9));
      arrow.setAttribute("x2", lerp(X0, X0 + BX, a)); arrow.setAttribute("y2", lerp(Y0, Y0 + BY, a));
      o2.setAttribute("opacity", a > 0.95 ? 1 : 0);
      var x = lerp(X0 + BX, 220, b), y = lerp(Y0 + BY, 60, b);
      cp.setAttribute("transform", "translate(" + x + " " + y + ")"); cp.setAttribute("opacity", b > 0 ? 1 : 0);
      blk.setAttribute("opacity", 0.3 - 0.2 * b);
    };
  };

  /* L'extrait remis a sa place dans un volume vide de la taille d'origine */
  A.scenes.autocrop3d_repad = function (svg) {
    var X0 = 14, Y0 = 36, C = 16, NX = 12, NY = 8, PX = 5, PY = 3, LX = 4, LY = 3, i, j;
    var base = grid(svg, X0, Y0, NX, NY, C, "a-cell");
    var zero = E("rect", { "class": "a-soft", x: X0, y: Y0, width: NX * C, height: NY * C, opacity: 0 }, svg);
    var piece = E("g", {}, svg), cs = [];
    for (j = 0; j < PY; j++) { for (i = 0; i < PX; i++) {
      cs.push(E("rect", { "class": "a-seg", x: i * C + 1, y: j * C + 1, width: C - 2, height: C - 2, opacity: 0.6 }, piece));
    } }
    var frame = E("rect", { "class": "a-seg-s", x: 0, y: 0, width: PX * C, height: PY * C }, piece);
    var sx = 232, sy = 52, ex = X0 + LX * C, ey = Y0 + LY * C;
    var trail = E("path", { "class": "a-dash" }, svg);
    return function (t) {
      var a = ease(seg(t, 0.3, 0.75)), z = ease(seg(t, 0.15, 0.4));
      var x = lerp(sx, ex, a), y = lerp(sy, ey, a);
      piece.setAttribute("transform", "translate(" + x + " " + y + ")");
      zero.setAttribute("opacity", 0.07 * z);
      trail.setAttribute("d", "M" + (sx + 1) + " " + (sy + 1) + " L" + (x + 1) + " " + (y + 1));
      trail.setAttribute("opacity", a > 0 && a < 1 ? 0.8 : 0);
    };
  };

  /* Cle de patient VISOR : le meme calcul pour le scan et pour le ROI */
  function tokenRows(svg, rows, out, dropAt, mergeAt) {
    var els = [], y = [34, 78], i, k, r;
    for (r = 0; r < rows.length; r++) {
      var x = 22;
      for (k = 0; k < rows[r].length; k++) {
        var w = rows[r][k].length * 6.4 + 14, g = E("g", {}, svg);
        var tk = rows[r][k];
        var keep = out[r].indexOf(k) >= 0;
        E("rect", { "class": keep ? "a-acc-s" : "a-nlp-s", x: 0, y: -12, width: w, height: 22, rx: 4 }, g);
        txt(g, w / 2, 3, tk, "a-label-b", "middle");
        els.push({ g: g, x: x, y: y[r], keep: keep, w: w, k: k, r: r });
        x += w + 6;
      }
    }
    return els;
  }
  A.scenes.autocrop3d_key = function (svg) {
    var rows = [["Patient", "01", "Scan"], ["Patient", "01", "ROI"]], keepIdx = [[0, 1], [0, 1]];
    var els = tokenRows(svg, rows, keepIdx);
    var res = E("g", {}, svg), rw = 0;
    var rect = E("rect", { "class": "a-seg-s", x: 22, y: 128, width: 130, height: 26, rx: 5 }, res);
    var rt = txt(res, 87, 146, "Patient_01", "a-label-b", "middle");
    var l1 = E("path", { "class": "a-acc-s", d: "M87 96 V124" }, svg), l2 = E("path", { "class": "a-acc-s", d: "M87 52 V124", opacity: 0 }, svg);
    var strike = els.filter(function (e) { return !e.keep; });
    return function (t) {
      var a = ease(seg(t, 0.1, 0.4)), b = ease(seg(t, 0.5, 0.8));
      els.forEach(function (e) {
        var o = e.keep ? 1 : 1 - 0.75 * a;
        e.g.setAttribute("transform", "translate(" + e.x + " " + e.y + ")");
        e.g.setAttribute("opacity", o);
      });
      res.setAttribute("opacity", b); l1.setAttribute("opacity", b); l2.setAttribute("opacity", b * 0.7);
    };
  };

  /* Cle de patient legacy : deux regles differentes, donc deux cles differentes */
  A.scenes.autocrop3d_key_legacy = function (svg) {
    var rows = [["MA", "0001", "T1", "Scan"], ["MA", "0001", "ROI"]], keepIdx = [[0, 1], [0]];
    var els = tokenRows(svg, rows, keepIdx);
    var r1 = E("g", {}, svg), r2 = E("g", {}, svg);
    E("rect", { "class": "a-seg-s", x: 22, y: 118, width: 92, height: 24, rx: 5 }, r1); txt(r1, 68, 134, "MA_0001", "a-label-b", "middle");
    E("rect", { "class": "a-nlp-s", x: 190, y: 118, width: 44, height: 24, rx: 5 }, r2); txt(r2, 212, 134, "MA", "a-label-b", "middle");
    var ne = E("g", { "class": "a-ink" }, svg);
    E("path", { "class": "a-nlp-s", d: "M130 124 H168 M130 136 H168 M142 144 L156 116" }, ne);
    return function (t) {
      var a = ease(seg(t, 0.1, 0.4)), b = ease(seg(t, 0.5, 0.8));
      els.forEach(function (e) {
        e.g.setAttribute("transform", "translate(" + e.x + " " + e.y + ")");
        e.g.setAttribute("opacity", e.keep ? 1 : 1 - 0.75 * a);
      });
      r1.setAttribute("opacity", b); r2.setAttribute("opacity", b); ne.setAttribute("opacity", b);
    };
  };

  /* Surface : marge de fond, contour ferme, lissage */
  function surfaceScene(both) { return function (svg) {
    var CX = 160, CY = 98, C = 14, FW = 9, FH = 8, PAD = 2;
    var fx0 = CX - (FW * C) / 2, fy0 = CY - (FH * C) / 2, fx1 = fx0 + FW * C, fy1 = fy0 + FH * C;
    var ring = E("rect", { "class": "a-dash", x: fx0 - PAD * C, y: fy0 - PAD * C, width: FW * C + (both ? 2 : 1) * PAD * C, height: FH * C + (both ? 2 : 1) * PAD * C }, svg);
    var cells = [], i, j, ec = [fx0 + 6.0 * C, CY], ea = 3.6 * C, eb = 3.0 * C;
    for (j = 0; j < FH + (both ? 2 : 1) * PAD; j++) { for (i = 0; i < FW + (both ? 2 : 1) * PAD; i++) {
      var x = fx0 + (i - PAD) * C, y = fy0 + (j - PAD) * C, mx = x + C / 2, my = y + C / 2;
      var inFrame = mx > fx0 && mx < fx1 && my > fy0 && my < fy1;
      var inside = inFrame && Math.pow((mx - ec[0]) / ea, 2) + Math.pow((my - ec[1]) / eb, 2) <= 1;
      cells.push({ r: E("rect", { "class": inside ? "a-seg" : "a-cell", x: x, y: y, width: C, height: C, "fill-opacity": inside ? 0.45 : 1 }, svg), inFrame: inFrame, inside: inside });
    } }
    var frame = E("rect", { "class": "a-acc-s", x: fx0, y: fy0, width: FW * C, height: FH * C }, svg);
    var th0 = Math.acos(Math.max(-1, Math.min(1, (fx1 - ec[0]) / ea))), N = 40, noise = [], k;
    for (k = 0; k <= N; k++) { noise.push((k % 2 ? 1 : -1) * 3.2 * (0.6 + 0.4 * Math.sin(k * 2.1))); }
    var arc = E("polyline", { "class": "a-nlp-s", "stroke-linejoin": "round", fill: "none" }, svg);
    var cut = E("line", { "class": "a-nlp-s" }, svg);
    var gap = E("line", { "class": "a-dash", x1: fx1, x2: fx1, y1: ec[1] + eb * Math.sin(th0), y2: ec[1] - eb * Math.sin(th0), opacity: 0 }, svg);
    return function (t) {
      var pad = ease(seg(t, 0.12, 0.35)), dr = ease(seg(t, 0.38, 0.62)), cl = ease(seg(t, 0.62, 0.72)), sm = ease(seg(t, 0.74, 0.97));
      ring.setAttribute("opacity", pad);
      var m = Math.round(dr * N), pts = [], last;
      for (k = 0; k <= m; k++) {
        var th = th0 + (2 * Math.PI - 2 * th0) * k / N, r = 1 + noise[k] * (1 - sm) / 60;
        last = [ec[0] + ea * Math.cos(th) * r, ec[1] + eb * Math.sin(th) * r];
        if (last[0] > fx1) { last[0] = fx1; }
        pts.push(last[0].toFixed(1) + "," + last[1].toFixed(1));
      }
      arc.setAttribute("points", pts.join(" ")); arc.setAttribute("opacity", dr > 0 ? 1 : 0);
      var sY = ec[1] + eb * Math.sin(th0), eY = ec[1] - eb * Math.sin(th0);
      cut.setAttribute("x1", fx1); cut.setAttribute("x2", fx1); cut.setAttribute("y1", lerp(sY, eY, cl)); cut.setAttribute("y2", sY);
      cut.setAttribute("opacity", both && cl > 0 ? 1 : 0);
      gap.setAttribute("opacity", !both && cl > 0 ? 1 : 0);
    };
  }; }
  A.scenes.autocrop3d_surface = surfaceScene(true);
  A.scenes.autocrop3d_surface_legacy = surfaceScene(false);
})();
