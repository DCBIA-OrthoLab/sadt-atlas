/* Scenes de AutoMatrix (VISOR et legacy). Aucune chaine traduisible : des nombres et des noms de fichiers d'exemple. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;

  /* La meme transformation T : le contenu bouge par T^-1, le point aussi */
  A.scenes.automatrix_sync = function (svg) {
    var C = 16, NX = 8, NY = 6, LX = 14, RX = 178, Y0 = 34, T = 3, i, j;
    var shape = [[4, 2], [5, 2], [6, 2], [4, 3], [4, 4]], lm = [6, 2];
    var pick = [1, 2]; /* pixel de sortie examine */
    var k;
    for (k = 0; k < 2; k++) {
      for (j = 0; j < NY; j++) { for (i = 0; i < NX; i++) {
        E("rect", { "class": "a-cell", x: (k ? RX : LX) + i * C, y: Y0 + j * C, width: C, height: C }, svg);
      } }
    }
    var inCells = shape.map(function (c) { return E("rect", { "class": "a-seg", x: LX + c[0] * C + 1, y: Y0 + c[1] * C + 1, width: C - 2, height: C - 2, opacity: 0.55 }, svg); });
    var outCells = shape.map(function (c) { return E("rect", { "class": "a-acc", x: RX + (c[0] - T) * C + 1, y: Y0 + c[1] * C + 1, width: C - 2, height: C - 2, opacity: 0 }, svg); });
    var pO = E("rect", { "class": "a-acc-s", x: RX + pick[0] * C, y: Y0 + pick[1] * C, width: C, height: C, opacity: 0 }, svg);
    var pI = E("rect", { "class": "a-ana-s", x: LX + (pick[0] + T) * C, y: Y0 + pick[1] * C, width: C, height: C, opacity: 0 }, svg);
    var read = E("path", { "class": "a-ana-s", opacity: 0, fill: "none", "stroke-dasharray": "3 3" }, svg);
    var cx0 = LX + (lm[0] + 0.5) * C, cy = Y0 + (lm[1] + 0.5) * C, cx1 = RX + (lm[0] - T + 0.5) * C;
    var dot0 = E("circle", { "class": "a-nlp", cx: cx0, cy: cy, r: 4.5 }, svg);
    var dot1 = E("circle", { "class": "a-nlp", cx: cx1, cy: cy, r: 4.5, opacity: 0 }, svg);
    var mv = E("path", { "class": "a-nlp-s", d: "M" + cx0 + " " + (cy - 12) + " Q" + ((cx0 + cx1) / 2 + 20) + " " + (cy - 40) + " " + cx1 + " " + (cy - 12), fill: "none", opacity: 0 }, svg);
    return function (t) {
      var a = ease(seg(t, 0.05, 0.3)), b = ease(seg(t, 0.35, 0.6)), c = ease(seg(t, 0.65, 0.9));
      pO.setAttribute("opacity", a); pI.setAttribute("opacity", a);
      var x1 = RX + (pick[0] + 0.5) * C, y1 = Y0 + (pick[1] + 0.5) * C, x2 = LX + (pick[0] + T + 0.5) * C;
      read.setAttribute("d", "M" + x1 + " " + (y1 - 8) + " Q" + ((x1 + x2) / 2) + " " + (Y0 - 24) + " " + x2 + " " + (y1 - 8));
      read.setAttribute("opacity", a);
      outCells.forEach(function (c2) { c2.setAttribute("opacity", 0.6 * b); });
      dot1.setAttribute("opacity", c); mv.setAttribute("opacity", c * 0.8);
      dot0.setAttribute("opacity", 1 - 0.55 * c);
    };
  };

  /* Interpolation : le lineaire invente des valeurs, le plus proche voisin garde les etiquettes */
  A.scenes.automatrix_interp = function (svg) {
    var X0 = 30, STEP = 38, BASE = [66, 118, 170], H = 44, i;
    var vin = [0, 0, 0, 3, 3, 3, 3], lin = [0, 0, 1.5, 3, 3, 3], nn = [0, 0, 0, 3, 3, 3];
    var cls = ["a-soft", "a-acc", "a-seg"], bars = [[], [], []], r;
    for (r = 0; r < 3; r++) {
      var n = r ? 6 : 7;
      for (i = 0; i < n; i++) {
        bars[r].push(E("rect", { "class": cls[r], x: X0 + i * STEP + (r ? STEP / 2 : 0), width: 24, rx: 1 }, svg));
      }
      E("line", { "class": "a-ink", x1: 14, x2: 306, y1: BASE[r], y2: BASE[r] }, svg);
    }
    function set(b, base, h, op) { b.setAttribute("height", Math.max(0.6, h)); b.setAttribute("y", base - Math.max(0.6, h)); b.setAttribute("opacity", op); }
    return function (t) {
      var u = ease(seg(t, 0.2, 0.7));
      for (i = 0; i < 7; i++) { set(bars[0][i], BASE[0], vin[i] / 3 * H, 0.5); }
      for (i = 0; i < 6; i++) {
        set(bars[1][i], BASE[1], lerp(0, lin[i] / 3 * H, u), 1);
        set(bars[2][i], BASE[2], lerp(0, nn[i] / 3 * H, u), 1);
      }
    };
  };

  /* La boite de sortie : avec ou sans reference, et ou tombe le contenu */
  function gridScene(variant) {
    return function (svg) {
      var S = 6.4, X = function (v) { return 14 + (v + 14) * S; };
      var rowsDef = variant === "visor" ? [
        { y: 28, box: [-10, 10], con: [-8, 2], k: "in" },
        { y: 70, box: [-5, 15], con: [-13, -3], k: "t" },
        { y: 112, box: [10, 30], con: [-2, 8], k: "r" },
        { y: 154, box: [-10, 10], con: [-2, 8], k: "ref" }] : [
        { y: 36, box: [-10, 10], con: [-8, 2], k: "in" },
        { y: 90, box: [-10, 10], con: [-13, -3], k: "t" },
        { y: 144, box: [-10, 10], con: [-2, 8], k: "r" }];
      var els = [];
      E("line", { "class": "a-dash", x1: X(0), x2: X(0), y1: 10, y2: 186 }, svg);
      rowsDef.forEach(function (r, n) {
        var g = E("g", {}, svg);
        E("rect", { "class": "a-acc-s", x: X(r.box[0]), y: r.y - 14, width: (r.box[1] - r.box[0]) * S, height: 28, rx: 2 }, g);
        var lo = Math.max(r.con[0], r.box[0]), hi = Math.min(r.con[1], r.box[1]);
        E("rect", { "class": "a-dash", x: X(r.con[0]), y: r.y - 8, width: (r.con[1] - r.con[0]) * S, height: 16 }, g);
        if (hi > lo) { E("rect", { "class": "a-seg", x: X(lo), y: r.y - 8, width: (hi - lo) * S, height: 16, opacity: 0.7 }, g); }
        els.push(g);
      });
      return function (t) {
        els.forEach(function (g, n) { g.setAttribute("opacity", ease(seg(t, 0.05 + n * (0.8 / els.length) * 0.8, 0.2 + n * (0.8 / els.length) * 0.8 + 0.1))); });
      };
    };
  }
  A.scenes.automatrix_grid = gridScene("visor");
  A.scenes.automatrix_fov = gridScene("legacy");

  /* Miroir : diag(-1, 1, 1) autour du plan x = 0 du repere, pas de la ligne mediane du patient */
  A.scenes.automatrix_mirror = function (svg) {
    var CX = 160, CY = 98, S = 1;
    E("line", { "class": "a-ink", x1: CX, x2: CX, y1: 12, y2: 184 }, svg);
    var ph = E("g", {}, svg), ghost = E("g", {}, svg);
    function head(g, cls) {
      E("ellipse", { "class": cls, cx: 0, cy: 0, rx: 34, ry: 46, fill: "none" }, g);
      E("line", { "class": "a-dash", x1: 0, x2: 0, y1: -54, y2: 54 }, g);
      E("circle", { "class": "a-lmk", cx: 12, cy: -8, r: 3.5 }, g);
    }
    head(ph, "a-acc-s"); head(ghost, "a-nlp-s");
    var px = 70;
    return function (t) {
      var a = ease(seg(t, 0.2, 0.7));
      ph.setAttribute("transform", "translate(" + (CX + px) + " " + CY + ")");
      var gx = lerp(px, -px, a), sx = lerp(1, -1, a);
      ghost.setAttribute("transform", "translate(" + (CX + gx) + " " + CY + ") scale(" + sx + " 1)");
      ghost.setAttribute("opacity", seg(t, 0.15, 0.25));
      ph.setAttribute("opacity", 1 - 0.55 * a);
    };
  };

  /* Cle de patient : un meme calcul pour le fichier et pour sa matrice (VISOR) */
  function rowsScene(rows, keep, resultTexts, legacy) {
    return function (svg) {
      var els = [], r, k;
      var YS = [30, 76];
      for (r = 0; r < rows.length; r++) {
        var x = 16;
        for (k = 0; k < rows[r].length; k++) {
          var tk = rows[r][k], w = tk.length * 6.2 + 12, g = E("g", {}, svg), kp = keep[r].indexOf(k) >= 0;
          E("rect", { "class": kp ? "a-acc-s" : "a-nlp-s", x: 0, y: -11, width: w, height: 21, rx: 4 }, g);
          txt(g, w / 2, 3, tk, "a-label-b", "middle");
          els.push({ g: g, x: x, y: YS[r], kp: kp });
          x += w + 4;
        }
      }
      var res = [];
      for (r = 0; r < rows.length; r++) {
        var gg = E("g", {}, svg), w2 = resultTexts[r].length * 6.8 + 16;
        E("rect", { "class": legacy && r ? "a-nlp-s" : "a-seg-s", x: 16, y: 120 + r * 34 - 12, width: w2, height: 24, rx: 5 }, gg);
        txt(gg, 16 + w2 / 2, 120 + r * 34 + 4, resultTexts[r], "a-label-b", "middle");
        res.push(gg);
      }
      return function (t) {
        var a = ease(seg(t, 0.1, 0.4)), b = ease(seg(t, 0.5, 0.8));
        els.forEach(function (e) { e.g.setAttribute("transform", "translate(" + e.x + " " + e.y + ")"); e.g.setAttribute("opacity", e.kp ? 1 : 1 - 0.75 * a); });
        res.forEach(function (g) { g.setAttribute("opacity", b); });
      };
    };
  }
  A.scenes.automatrix_key = rowsScene([["C", "0001", "CB", "Reg", "transform"], ["p1", "CBReg", "matrix"]], [[0, 1], [0]], ["C_0001", "p1"], false);
  /* Legacy : la scan et la matrice appellent le meme nom, mais pas les memes coupures */
  A.scenes.automatrix_key_legacy = rowsScene([["patient1", "MA"], ["patient1", "MA"]], [[0, 1], [0]], ["patient1_MA", "patient1"], true);
})();
