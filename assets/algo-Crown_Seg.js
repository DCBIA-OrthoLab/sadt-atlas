/* algo-Crown_Seg.js : scenes de la page Crown_Seg (VISOR).
   Aucune chaine traduisible ici : seulement des chiffres et des signes. Couleurs : classes .a-* uniquement. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;

  /* Du pixel a la face : on additionne les probabilites des pixels qui montrent la face, la plus forte classe l'emporte */
  A.scenes.crownseg_vote = function (svg) {
    var cls = ["a-acc", "a-seg", "a-ana"];
    var P = [[0.2, 0.7, 0.1], [0.1, 0.6, 0.3], [0.5, 0.4, 0.1], [0.15, 0.55, 0.3]];
    var BW = 9, BH = 54, i, c, bars = [], base = 110;
    for (i = 0; i < 4; i++) {
      var x0 = 16 + i * 46;
      E("line", { "class": "a-ink", x1: x0 - 3, x2: x0 + 3 * (BW + 2) + 1, y1: base, y2: base }, svg);
      bars[i] = [];
      for (c = 0; c < 3; c++) { bars[i][c] = E("rect", { "class": cls[c], x: x0 + c * (BW + 2), width: BW, rx: 1.5 }, svg); }
      E("rect", { "class": "a-cell", x: x0 + 3, y: 20, width: 24, height: 14, rx: 2 }, svg);
    }
    var SX = 226, sums = [], tot = [0, 0, 0];
    for (c = 0; c < 3; c++) { for (i = 0; i < 4; i++) { tot[c] += P[i][c]; } }
    E("line", { "class": "a-ink", x1: SX - 4, x2: SX + 3 * (BW + 6) + 2, y1: base, y2: base }, svg);
    for (c = 0; c < 3; c++) { sums[c] = E("rect", { "class": cls[c], x: SX + c * (BW + 6), width: BW + 4, rx: 2 }, svg); }
    var arrow = E("path", { "class": "a-ink", d: "M196 70 H214 M210 66 L215 70 L210 74" }, svg);
    var tri = E("polygon", { "class": "a-cell", points: "262,128 296,128 279,158", fill: "none" }, svg);
    var best = tot.indexOf(Math.max.apply(null, tot));
    var tri2 = E("polygon", { "class": cls[best], points: "262,128 296,128 279,158" }, svg);
    txt(svg, 16, 14, "σ(z)", "a-label", "start");
    txt(svg, SX, 14, "Σ", "a-label-b", "start");
    return function (t) {
      for (i = 0; i < 4; i++) {
        var u = ease(seg(t, 0.04 + i * 0.1, 0.18 + i * 0.1));
        for (c = 0; c < 3; c++) {
          var h = P[i][c] * BH * u;
          bars[i][c].setAttribute("height", Math.max(0.01, h)); bars[i][c].setAttribute("y", base - h);
        }
      }
      var s = ease(seg(t, 0.5, 0.78));
      for (c = 0; c < 3; c++) {
        var hh = tot[c] / 3 * BH * 1.4 * s;
        sums[c].setAttribute("height", Math.max(0.01, hh)); sums[c].setAttribute("y", base - hh);
        sums[c].setAttribute("opacity", c === best ? 1 : 1 - 0.55 * ease(seg(t, 0.8, 0.92)));
      }
      arrow.setAttribute("opacity", ease(seg(t, 0.44, 0.52)));
      tri2.setAttribute("opacity", ease(seg(t, 0.84, 0.97)));
      tri.setAttribute("opacity", 1);
    };
  };

  /* Nettoyage de l'etiquetage : les ilots disparaissent, puis une fermeture (dilater, eroder) comble les trous */
  A.scenes.crownseg_clean = function (svg) {
    var G = [
      "......................",
      "..aaaaaa..bbbbbbbb....",
      "..aaaaaa..bbbbbbbb..a.",
      "..aabaaa..bb.bbbbb....",
      "..aaaaaa..bbbbbbbb....",
      "..aaaaaa..bbbbbbbb....",
      "...b..................",
      "......................"
    ];
    /* ilots : b isole dans a (ligne 3 et 6), a isole dans le fond (ligne 2) */
    var s1 = G.map(function (r, y) {
      return r.split("").map(function (ch, x) {
        if (ch === "b" && x < 8) { return y === 3 ? "a" : "."; }
        if (ch === "a" && x > 12) { return "."; }
        return ch;
      }).join("");
    });
    var s2 = s1.map(function (r) { return r.replace(/bb\.bbbbb/, "bbbbbbbb"); });
    var W = 22, H = 8, CS = 13, OX = 17, OY = 22, x, y, cells = [];
    for (y = 0; y < H; y++) { for (x = 0; x < W; x++) {
      cells.push(E("rect", { "class": "a-cell", x: OX + x * CS, y: OY + y * CS, width: CS - 1, height: CS - 1, rx: 2 }, svg));
    } }
    var dots = [];
    for (x = 0; x < 3; x++) { dots.push(E("circle", { "class": "a-cell", cx: 130 + x * 30, cy: 160, r: 7 }, svg)); }
    var fills = [];
    for (x = 0; x < 3; x++) { fills.push(E("circle", { "class": "a-acc", cx: 130 + x * 30, cy: 160, r: 4.5 }, svg)); }
    txt(svg, 130, 182, "1", "a-num", "middle"); txt(svg, 160, 182, "2", "a-num", "middle"); txt(svg, 190, 182, "3", "a-num", "middle");
    function paint(g, g2, u) {
      for (y = 0; y < H; y++) { for (x = 0; x < W; x++) {
        var a = g[y].charAt(x), b = g2[y].charAt(x), ch = u > 0.5 ? b : a, n = y * W + x;
        var cl = ch === "a" ? "a-seg" : (ch === "b" ? "a-ana" : "a-cell");
        cells[n].setAttribute("class", cl);
        cells[n].setAttribute("opacity", a !== b ? (u > 0.5 ? 0.35 + 0.65 * ease((u - 0.5) * 2) : 1 - 0.65 * ease(u * 2)) : 1);
      } }
    }
    return function (t) {
      var step = t < 0.34 ? 0 : (t < 0.68 ? 1 : 2);
      if (step === 0) { paint(G, G, 0); }
      else if (step === 1) { paint(G, s1, ease(seg(t, 0.34, 0.6))); }
      else { paint(s1, s2, ease(seg(t, 0.68, 0.94))); }
      for (x = 0; x < 3; x++) { fills[x].setAttribute("opacity", step >= x ? 1 : 0.1); }
    };
  };

  /* Universal vers FDI : une seule table de correspondance, lue case par case */
  A.scenes.crownseg_fdi = function (svg) {
    var rows = [
      [1, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15, 16],
      [17, 18, 19, 20, 21, 22, 23, 24], [25, 26, 27, 28, 29, 30, 31, 32]
    ];
    var fdi = [
      [18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28],
      [38, 37, 36, 35, 34, 33, 32, 31], [41, 42, 43, 44, 45, 46, 47, 48]
    ];
    var CW = 33, X0 = 28, Y0 = 16, RH = 44, r, c, uni = [], out = [], boxes = [];
    for (r = 0; r < 4; r++) { for (c = 0; c < 8; c++) {
      var x = X0 + c * CW, y = Y0 + r * RH;
      boxes.push(E("rect", { "class": "a-cell", x: x, y: y, width: CW - 3, height: 36, rx: 3 }, svg));
      uni.push(txt(svg, x + (CW - 3) / 2, y + 14, String(rows[r][c]), "a-num", "middle"));
      E("line", { "class": "a-fine", x1: x + 3, x2: x + CW - 6, y1: y + 19, y2: y + 19 }, svg);
      out.push(txt(svg, x + (CW - 3) / 2, y + 31, String(fdi[r][c]), "a-label-b", "middle"));
    } }
    var hi = E("rect", { "class": "a-acc-s", width: CW - 3, height: 36, rx: 3 }, svg);
    return function (t) {
      var n = 32, k = Math.min(n - 1, Math.floor(t * 1.04 * n)), i;
      for (i = 0; i < n; i++) { out[i].setAttribute("opacity", i <= k ? 1 : 0.0); }
      var rr = Math.floor(k / 8), cc = k % 8;
      hi.setAttribute("x", X0 + cc * CW); hi.setAttribute("y", Y0 + rr * RH);
    };
  };
})();
