/* Scenes of the CNE atlas pages (legacy and VISOR). Numbers and code symbols only:
   every sentence lives in the HTML. Colours are .a-* classes. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, txt = A.txt, ease = A.ease, seg = A.seg, lerp = A.lerp;
  function big(n, size) { n.setAttribute("font-size", size || 18); return n; }

  /* 1. Text normalisation: seven characters rewritten, then runs of blank lines collapsed */
  A.scenes.cne_clean = function (svg) {
    var pairs = [["\u2019", "'"], ["\u2018", "'"], ["\u201C", "\""], ["\u201D", "\""], ["\u2013", "-"], ["\u2014", "-"], ["\u00A0", "\u2423"]];
    var cols = [], i;
    for (i = 0; i < pairs.length; i++) {
      var x = 22 + i * 41;
      E("rect", { "class": "a-cell", x: x, y: 8, width: 34, height: 28, rx: 3 }, svg);
      E("rect", { "class": "a-cell", x: x, y: 52, width: 34, height: 28, rx: 3 }, svg);
      var top = i === 6 ? E("rect", { "class": "a-soft", x: x + 8, y: 16, width: 18, height: 12, opacity: 0.3 }, svg)
                        : big(txt(svg, x + 17, 29, pairs[i][0], "a-label-b", "middle"), 20);
      var arrow = E("path", { "class": "a-ink", d: "M" + (x + 17) + " 39 V47 M" + (x + 13) + " 43 L" + (x + 17) + " 48 L" + (x + 21) + " 43" }, svg);
      var low = big(txt(svg, x + 17, 73, pairs[i][1], "a-label-b", "middle"), 20);
      var ring = E("rect", { "class": "a-acc-s", x: x - 1, y: 7, width: 36, height: 30, rx: 4, opacity: 0 }, svg);
      cols.push({ top: top, low: low, arrow: arrow, ring: ring });
    }
    var kinds = [1, 1, 0, 0, 0, 1, 0, 1], widths = [190, 150, 0, 0, 0, 170, 0, 120];
    var keep = [1, 1, 1, 0, 0, 1, 1, 1], rows = [], H = 11, Y0 = 100;
    for (i = 0; i < kinds.length; i++) {
      rows.push(kinds[i]
        ? E("rect", { "class": "a-soft", x: 60, width: widths[i], height: 6, rx: 1, opacity: 0.45 }, svg)
        : E("line", { "class": "a-dash", x1: 60, x2: 100, y1: 0, y2: 0 }, svg));
    }
    return function (t) {
      for (var k = 0; k < cols.length; k++) {
        var u = ease(seg(t, 0.05 + k * 0.055, 0.12 + k * 0.055)), c = cols[k];
        c.top.setAttribute("opacity", 1 - 0.6 * u);
        c.low.setAttribute("opacity", u);
        c.arrow.setAttribute("opacity", 0.2 + 0.8 * u);
        c.ring.setAttribute("opacity", Math.sin(Math.PI * u));
      }
      var s = ease(seg(t, 0.6, 0.92)), y = Y0, j;
      for (j = 0; j < rows.length; j++) {
        var h = keep[j] ? H : lerp(H, 0, s), r = rows[j], cy = y + h / 2;
        if (kinds[j]) { r.setAttribute("y", cy - 3); } else { r.setAttribute("y1", cy); r.setAttribute("y2", cy); }
        r.setAttribute("opacity", keep[j] ? (kinds[j] ? 0.45 : 1) : 1 - s);
        y += h;
      }
    };
  };

  /* 2. The context window: the prompt fills it from the left, the answer gets what is left (up to max_tokens).
     Three notes in turn: short (answer gets all it may use), long (answer cut short), too long (error). Illustrative lengths. */
  A.scenes.cne_window = function (svg, fig) {
    var R = parseFloat((fig && fig.getAttribute && fig.getAttribute("data-reserve")) || "0.3");
    var X = 20, W = 280, Y = 78, H = 34;
    var cases = [0.35, 0.86, 1.0];
    E("rect", { "class": "a-ink", x: X, y: Y, width: W, height: H, rx: 3 }, svg);
    var note = E("rect", { "class": "a-seg", x: X, y: Y + 4, height: H - 8, opacity: 0.7 }, svg);
    var ans = E("rect", { "class": "a-acc", y: Y + 4, height: H - 8, opacity: 0.85 }, svg);
    txt(svg, X, Y - 10, "n_ctx", "a-num");
    var marks = [], i;
    for (i = 0; i < 3; i++) {
      marks.push(big(txt(svg, 60 + i * 100, 150, "", "a-label-b", "middle"), 22));
    }
    var sym = ["\u2713", "\u2702", "\u2715"];
    return function (t) {
      var k = Math.min(2, Math.floor(t * 3)), s = t * 3 - k;
      var n = cases[k] * W * ease(seg(s, 0.05, 0.35));
      var room = X + W - (X + n);
      var wantW = R * W, a = Math.min(wantW, room);
      note.setAttribute("x", X); note.setAttribute("width", n);
      var grow = ease(seg(s, 0.4, 0.75));
      ans.setAttribute("x", X + n); ans.setAttribute("width", k < 2 ? Math.max(0, a * grow) : 0);
      for (var j = 0; j < 3; j++) {
        marks[j].textContent = (j < k || (j === k && s > 0.85)) ? sym[j] : "";
      }
    };
  };

  /* 3. The slice from the first { to the last }, once for one object and once for two */
  A.scenes.cne_slice = function (svg) {
    var N = 21, CW = 14, X0 = 8, rows = [
      { y: 34, open: 6, close: 14, ok: true, br: { 6: "{", 14: "}" } },
      { y: 118, open: 4, close: 17, ok: false, br: { 4: "{", 8: "}", 12: "{", 17: "}" } }
    ];
    rows.forEach(function (row) {
      var i;
      row.band = E("rect", { "class": "a-acc", x: X0, y: row.y - 3, width: 0, height: 24, rx: 3, opacity: 0.2 }, svg);
      row.l = E("rect", { "class": "a-acc-s", x: X0, y: row.y - 4, width: CW, height: 26, rx: 3, opacity: 0 }, svg);
      row.r = E("rect", { "class": "a-acc-s", x: X0, y: row.y - 4, width: CW, height: 26, rx: 3, opacity: 0 }, svg);
      for (i = 0; i < N; i++) {
        if (row.br[i]) {
          big(txt(svg, X0 + i * (CW + 1) + CW / 2, row.y + 15, row.br[i], "a-label-b", "middle"), 18);
        } else {
          E("rect", { "class": "a-soft", x: X0 + i * (CW + 1) + 3, y: row.y + 4, width: CW - 6, height: 10, rx: 1, opacity: 0.28 }, svg);
        }
      }
      row.arrow = E("path", { "class": "a-ink", d: "M160 " + (row.y + 28) + " V" + (row.y + 40) }, svg);
      row.res = big(txt(svg, 160, row.y + 60, "", "a-label-b", "middle"), 22);
    });
    return function (t) {
      rows.forEach(function (row, k) {
        var s = (t - k * 0.5) / 0.5, xl = X0 + row.open * (CW + 1), xr = X0 + row.close * (CW + 1);
        var a = ease(seg(s, 0.05, 0.3)), b = ease(seg(s, 0.3, 0.55)), c = ease(seg(s, 0.6, 0.8));
        row.l.setAttribute("x", lerp(X0, xl, a)); row.l.setAttribute("opacity", s > 0.05 && s < 0.9 ? 1 : 0);
        row.r.setAttribute("x", lerp(X0 + (N - 1) * (CW + 1), xr, b)); row.r.setAttribute("opacity", s > 0.3 && s < 0.9 ? 1 : 0);
        row.band.setAttribute("x", xl); row.band.setAttribute("width", (xr - xl + CW) * c);
        row.arrow.setAttribute("opacity", c);
        row.res.textContent = s > 0.82 ? (row.ok ? "✓" : "✕") : "";
      });
    };
  };

  /* 4. key: value lines: the answer is accepted when at least 60 % of its lines look like fields */
  A.scenes.cne_lines = function (svg) {
    var sides = [
      { x: 10, match: [1, 1, 1, 0, 1, 1, 1, 1, 0, 1] },
      { x: 170, match: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0] }
    ];
    var RH = 12, Y0 = 12, MW = 140;
    sides.forEach(function (sd) {
      sd.rows = [];
      sd.match.forEach(function (m, i) {
        var y = Y0 + i * RH, g = {};
        if (m) {
          g.a = E("rect", { "class": "a-nlp", x: sd.x, y: y, width: 38, height: 6, rx: 1, opacity: 0.25 }, svg);
          g.b = txt(svg, sd.x + 43, y + 7, ":", "a-label-b");
          g.c = E("rect", { "class": "a-soft", x: sd.x + 52, y: y, width: 70, height: 6, rx: 1, opacity: 0.25 }, svg);
        } else {
          g.a = E("rect", { "class": "a-soft", x: sd.x, y: y, width: 120, height: 6, rx: 1, opacity: 0.25 }, svg);
        }
        sd.rows.push(g);
      });
      E("rect", { "class": "a-ink", x: sd.x, y: 160, width: MW, height: 10, rx: 2 }, svg);
      sd.fill = E("rect", { "class": "a-acc", x: sd.x, y: 160, width: 0, height: 10, rx: 2, opacity: 0.7 }, svg);
      E("line", { "class": "a-dash", x1: sd.x + MW * 0.6, x2: sd.x + MW * 0.6, y1: 154, y2: 176 }, svg);
      sd.res = big(txt(svg, sd.x + MW / 2, 192, "", "a-label-b", "middle"), 18);
    });
    return function (t) {
      sides.forEach(function (sd) {
        var p = ease(seg(t, 0.05, 0.7)) * 10, hits = 0;
        sd.rows.forEach(function (g, i) {
          var on = p > i + 0.5;
          if (on && sd.match[i]) { hits++; }
          g.a.setAttribute("opacity", on ? (sd.match[i] ? 0.9 : 0.15) : 0.25);
          if (g.c) { g.c.setAttribute("opacity", on ? 0.7 : 0.25); }
        });
        sd.fill.setAttribute("width", MW * hits / 10);
        sd.res.textContent = t > 0.82 ? (hits >= 6 ? "✓" : "✕") : "";
      });
    };
  };
})();
