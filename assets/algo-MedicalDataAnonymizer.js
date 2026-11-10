/* Scenes of the MedicalDataAnonymizer atlas page. Numbers and code symbols only. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, txt = A.txt, ease = A.ease, seg = A.seg, lerp = A.lerp;
  function big(n, size) { n.setAttribute("font-size", size || 18); return n; }

  /* 1. The confidence threshold: detections below it are dropped without a trace */
  A.scenes.mda_threshold = function (svg) {
    var scores = [0.95, 0.88, 0.72, 0.64, 0.55, 0.47, 0.38, 0.22], X0 = 34, BASE = 160, H = 120, bars = [], i;
    E("line", { "class": "a-ink", x1: X0 - 8, x2: 306, y1: BASE, y2: BASE }, svg);
    txt(svg, X0 - 12, BASE + 3, "0", "a-num", "end"); txt(svg, X0 - 12, BASE - H + 3, "1", "a-num", "end");
    for (i = 0; i < scores.length; i++) {
      var h = scores[i] * H;
      bars.push(E("rect", { "class": "a-nlp", x: X0 + i * 34, y: BASE - h, width: 24, height: h, rx: 2 }, svg));
    }
    var line = E("line", { "class": "a-acc-s", x1: X0 - 8, x2: 306, y1: 0, y2: 0 }, svg);
    var lab = txt(svg, 306, 0, "", "a-label-b", "end");
    return function (t) {
      var tau = t < 0.15 ? 0.2 : (t < 0.6 ? lerp(0.2, 0.8, ease(seg(t, 0.15, 0.6))) : lerp(0.8, 0.5, ease(seg(t, 0.6, 0.85))));
      var y = BASE - tau * H;
      line.setAttribute("y1", y); line.setAttribute("y2", y);
      lab.setAttribute("y", y - 4); lab.textContent = tau.toFixed(2);
      for (var k = 0; k < scores.length; k++) { bars[k].setAttribute("opacity", scores[k] >= tau ? 1 : 0.18); }
    };
  };

  /* 2. The four ways to replace a detected span; the same span always gets the same hash */
  A.scenes.mda_operators = function (svg) {
    var W = [24, 18, 28, 16, 22, 30, 18, 24], ENT = { 1: 1, 5: 1 }, X0 = 22, G = 5;
    function line(y, kind, parent) {
      var x = X0, els = [], i;
      for (i = 0; i < W.length; i++) {
        if (ENT[i] && kind !== "src") {
          if (kind === "redact") { continue; }
          var w = kind === "replace" ? 46 : (kind === "hash" ? 28 : 20);
          var s = kind === "replace" ? "<PERSON>" : (kind === "hash" ? "9f2c" : "****");
          var n = txt(parent, x + w / 2, y + 8, s, "a-label-b", "middle");
          n.setAttribute("font-size", 8);
          els.push(n); x += w + G; continue;
        }
        els.push(E("rect", { "class": ENT[i] ? "a-nlp" : "a-soft", x: x, y: y, width: W[i], height: 8, rx: 1, opacity: ENT[i] ? 0.9 : 0.3 }, parent));
        x += W[i] + G;
      }
      return els;
    }
    var rows = [], kinds = ["src", "replace", "redact", "hash", "mask"], ys = [24, 66, 96, 126, 156];
    kinds.forEach(function (k, i) {
      var g = E("g", {}, svg);
      line(ys[i], k, g);
      if (i > 0) { txt(svg, 10, ys[i] + 8, String(i), "a-num", "middle"); }
      rows.push(g);
    });
    E("line", { "class": "a-dash", x1: 10, x2: 310, y1: 46, y2: 46 }, svg);
    return function (t) {
      rows.forEach(function (g, i) { g.setAttribute("opacity", i === 0 ? 1 : ease(seg(t, 0.08 + (i - 1) * 0.2, 0.2 + (i - 1) * 0.2))); });
    };
  };

  /* 3. A CSV is flattened to one string per row and cut again at every space */
  A.scenes.mda_csv = function (svg) {
    var CX = [14, 90, 166, 242], CWd = 72, TOPY = [20, 40, 60], BOTY = [112, 132, 152], tokens = [], i, j;
    var src = [[[0], [1, 2], [3]], [[0], [], [3]], [[0], [1], [2]]];
    for (i = 0; i < 3; i++) {
      for (j = 0; j < 3; j++) { E("rect", { "class": "a-cell", x: CX[j], y: TOPY[i], width: CWd, height: 16 }, svg); }
    }
    for (i = 0; i < 3; i++) { for (j = 0; j < 4; j++) { if (i === 2 && j === 3) { continue; } E("rect", { "class": "a-cell", x: CX[j], y: BOTY[i], width: CWd, height: 16, opacity: 0.5 }, svg); } }
    var dest = [[0, 1, 2, 3], [0, 1], [0, 1, 2]];
    for (i = 0; i < 3; i++) {
      var n = 0;
      for (j = 0; j < 3; j++) {
        src[i][j].forEach(function (sub) {
          var fromX = CX[j] + 8 + (src[i][j].length > 1 ? src[i][j].indexOf(sub) * 30 : 0);
          var toCol = dest[i][n], moved = toCol !== j || (src[i][j].length > 1 && src[i][j].indexOf(sub) > 0);
          tokens.push({ r: E("rect", { "class": moved ? "a-nlp" : "a-acc", x: fromX, y: TOPY[i] + 5, width: src[i][j].length > 1 ? 24 : 44, height: 6, rx: 1, opacity: 0.8 }, svg),
                        fx: fromX, fy: TOPY[i] + 5, tx: CX[toCol] + 8, ty: BOTY[i] + 5, w: src[i][j].length > 1 ? 24 : 44 });
          n++;
        });
      }
    }
    E("path", { "class": "a-ink", d: "M160 84 V100 M155 95 L160 101 L165 95" }, svg);
    return function (t) {
      var m = ease(seg(t, 0.3, 0.75));
      tokens.forEach(function (k) {
        k.r.setAttribute("x", lerp(k.fx, k.tx, m)); k.r.setAttribute("y", lerp(k.fy, k.ty, m));
      });
    };
  };
})();
