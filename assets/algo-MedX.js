/* Scenes of the MedX atlas page (archived code). Numbers and code symbols only. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, txt = A.txt, ease = A.ease, seg = A.seg, lerp = A.lerp;
  function big(n, size) { n.setAttribute("font-size", size || 18); return n; }

  /* 1. Chunking: paragraphs and whole sections are packed into chunks of at most 3500 characters */
  A.scenes.medx_chunk = function (svg) {
    var K = 120 / 3500, BASE = 176, BW = 38, binX = [128, 182, 236], FX = 24;
    var items = [
      { c: 1200, sec: 0, bin: 0 }, { c: 900, sec: 0, bin: 0 },
      { c: 1400, sec: 1, bin: 1, via: 0 }, { c: 600, sec: 0, bin: 1 },
      { c: 1600, sec: 1, bin: 2, via: 1 }, { c: 700, sec: 0, bin: 2 }
    ];
    var fill = [0, 0, 0], i;
    for (i = 0; i < 3; i++) {
      E("rect", { "class": "a-ink", x: binX[i] - 2, y: BASE - 120 - 2, width: BW + 4, height: 124, rx: 2 }, svg);
    }
    E("line", { "class": "a-dash", x1: binX[0] - 8, x2: binX[2] + BW + 8, y1: BASE - 120, y2: BASE - 120 }, svg);
    txt(svg, binX[2] + BW + 8, BASE - 125, "3500", "a-num", "end");
    items.forEach(function (it) {
      it.h = it.c * K;
      it.fy = BASE - fill[it.bin] - it.h; fill[it.bin] += it.h + 1;
      it.r = E("rect", { "class": it.sec ? "a-seg" : "a-acc", width: BW, height: it.h, rx: 2, opacity: 0 }, svg);
    });
    return function (t) {
      items.forEach(function (it, n) {
        var a = 0.03 + n * 0.15, appear = ease(seg(t, a, a + 0.04)), fly = ease(seg(t, a + 0.05, a + 0.14));
        var sx = FX, sy = 90 - it.h / 2, fx = binX[it.bin], fy = it.fy, x, y;
        if (it.via !== undefined) {
          var vx = binX[it.via], vy = BASE - 120 - it.h - 6;
          if (fly < 0.5) { x = lerp(sx, vx, fly * 2); y = lerp(sy, vy, fly * 2); }
          else { x = lerp(vx, fx, fly * 2 - 1); y = lerp(vy, fy, fly * 2 - 1); }
        } else { x = lerp(sx, fx, fly); y = lerp(sy, fy, fly); }
        it.r.setAttribute("x", x); it.r.setAttribute("y", y);
        it.r.setAttribute("opacity", appear * (it.sec ? 0.8 : 0.65));
      });
    };
  };

  /* 2. Merging the value of one field seen in several chunks */
  A.scenes.medx_merge = function (svg) {
    var CX = 176, CY = 78, CWd = 126, PY = 86;
    E("rect", { "class": "a-ink", x: CX - 6, y: CY, width: CWd, height: 36, rx: 3 }, svg);
    var ev = [0.04, 0.27, 0.5, 0.74], pills = [
      { w: 30, cls: "a-acc", to: CX }, { w: 30, cls: "a-acc", to: CX }, { w: 56, cls: "a-acc", to: CX }, { w: 36, cls: "a-nlp", to: CX + 66 }
    ];
    pills.forEach(function (p, i) {
      p.r = E("rect", { "class": p.cls, y: PY, height: 20, rx: 3, width: p.w, opacity: 0 }, svg);
      if (i === 2) { p.core = E("rect", { "class": "a-acc", y: PY, height: 20, rx: 3, width: 30, opacity: 0 }, svg); }
    });
    var cA = E("rect", { "class": "a-acc", x: CX, y: CY + 8, width: 30, height: 20, rx: 3, opacity: 0 }, svg);
    var cA2 = E("rect", { "class": "a-acc", x: CX, y: CY + 8, width: 56, height: 20, rx: 3, opacity: 0 }, svg);
    var cA2core = E("rect", { "class": "a-acc", x: CX, y: CY + 8, width: 30, height: 20, rx: 3, opacity: 0 }, svg);
    var sep = big(txt(svg, CX + 62, CY + 24, "|", "a-label-b", "middle"), 18);
    var cB = E("rect", { "class": "a-nlp", x: CX + 70, y: CY + 8, width: 36, height: 20, rx: 3, opacity: 0 }, svg);
    var marks = [], i;
    for (i = 0; i < 4; i++) { marks.push(E("circle", { "class": "a-acc", cx: 17 + i * 16, cy: 150, r: 3, opacity: 0.2 }, svg)); }
    return function (t) {
      pills.forEach(function (p, i) {
        var a = ev[i], m = ease(seg(t, a, a + 0.13)), gone = i === 1 ? seg(t, a + 0.11, a + 0.17) : seg(t, a + 0.12, a + 0.18);
        var x = lerp(14, p.to - 4, m), vis = t >= a ? (1 - gone) * 0.9 : 0;
        if (i === 0) { vis = t >= a ? (1 - gone) * 0.9 : 0; }
        p.r.setAttribute("x", x); p.r.setAttribute("opacity", vis);
        if (p.core) { p.core.setAttribute("x", x); p.core.setAttribute("opacity", vis ? 1 : 0); }
      });
      var t1 = seg(t, ev[0] + 0.13, ev[0] + 0.19), t3 = seg(t, ev[2] + 0.13, ev[2] + 0.19), t4 = seg(t, ev[3] + 0.13, ev[3] + 0.19);
      cA.setAttribute("opacity", t1 * (1 - t3));
      cA2.setAttribute("opacity", t3 * 0.9);
      cA2core.setAttribute("opacity", t3);
      sep.setAttribute("opacity", t4); cB.setAttribute("opacity", t4 * 0.9);
      for (var j = 0; j < 4; j++) { marks[j].setAttribute("opacity", t >= ev[j] ? 1 : 0.2); }
    };
  };

  /* 3. Turning a field into a number: before the first slash, or the mean of every number found */
  A.scenes.medx_number = function (svg) {
    var s1 = big(txt(svg, 30, 56, "7/10", "a-label-b"), 24);
    var box1 = E("rect", { "class": "a-acc-s", x: 27, y: 34, width: 15, height: 28, rx: 3, opacity: 0 }, svg);
    var arr1 = E("path", { "class": "a-ink", d: "M130 48 H168 M162 43 L169 48 L162 53" }, svg);
    var r1 = big(txt(svg, 200, 56, "7", "a-label-b"), 26);
    E("line", { "class": "a-dash", x1: 14, x2: 306, y1: 82, y2: 82 }, svg);
    var s2 = big(txt(svg, 30, 140, "8-9", "a-label-b"), 24);
    var b1 = E("rect", { "class": "a-acc-s", x: 27, y: 118, width: 15, height: 28, rx: 3, opacity: 0 }, svg);
    var b2 = E("rect", { "class": "a-acc-s", x: 57, y: 118, width: 15, height: 28, rx: 3, opacity: 0 }, svg);
    E("line", { "class": "a-ink", x1: 150, x2: 300, y1: 150, y2: 150 }, svg);
    var d8 = E("circle", { "class": "a-acc", cx: 170, cy: 150, r: 4, opacity: 0 }, svg);
    var d9 = E("circle", { "class": "a-acc", cx: 280, cy: 150, r: 4, opacity: 0 }, svg);
    var dm = E("circle", { "class": "a-nlp", cx: 225, cy: 150, r: 5, opacity: 0 }, svg);
    txt(svg, 170, 168, "8", "a-num", "middle"); txt(svg, 280, 168, "9", "a-num", "middle");
    var r2 = big(txt(svg, 225, 128, "8.5", "a-label-b", "middle"), 22);
    return function (t) {
      var a = ease(seg(t, 0.08, 0.3)), b = ease(seg(t, 0.3, 0.45));
      box1.setAttribute("opacity", a); r1.setAttribute("opacity", b); arr1.setAttribute("opacity", 0.25 + 0.75 * b);
      var c = ease(seg(t, 0.52, 0.68)), d = ease(seg(t, 0.68, 0.86));
      b1.setAttribute("opacity", c); b2.setAttribute("opacity", c);
      d8.setAttribute("opacity", c); d9.setAttribute("opacity", c);
      dm.setAttribute("opacity", d); r2.setAttribute("opacity", d);
      void s1; void s2;
    };
  };

  /* 4. A percentage is divided by the number of patients, so a missing value counts as a no */
  A.scenes.medx_percent = function (svg) {
    var states = [1, 1, 1, 1, 0, 0, 0, 2, 2, 2], dots = [], i;
    for (i = 0; i < 10; i++) {
      var cx = 28 + (i % 5) * 26, cy = 52 + Math.floor(i / 5) * 30;
      var d = E("circle", { cx: cx, cy: cy, r: 9, "class": states[i] === 1 ? "a-acc" : (states[i] === 0 ? "a-ink" : "a-dash") }, svg);
      dots.push(d);
    }
    var BX = 176, BW = 120, BY = 112;
    E("rect", { "class": "a-ink", x: BX, y: BY, width: BW, height: 14, rx: 2 }, svg);
    var bar = E("rect", { "class": "a-acc", x: BX, y: BY, width: 0, height: 14, rx: 2, opacity: 0.8 }, svg);
    txt(svg, BX, BY + 28, "0", "a-num"); txt(svg, BX + BW, BY + 28, "100", "a-num", "end");
    var num = big(txt(svg, 236, 76, "", "a-label-b", "middle"), 22);
    var frac = txt(svg, 28, 128, "4 / 10", "a-label-b");
    return function (t) {
      var k = ease(seg(t, 0.45, 0.62));
      for (var j = 0; j < 10; j++) {
        if (states[j] === 2) { dots[j].setAttribute("class", k > 0.5 ? "a-ink" : "a-dash"); }
      }
      var g = ease(seg(t, 0.62, 0.92));
      bar.setAttribute("width", BW * 0.4 * g);
      num.textContent = g > 0.98 ? "40" : "";
      frac.setAttribute("opacity", ease(seg(t, 0.3, 0.45)));
    };
  };
})();
