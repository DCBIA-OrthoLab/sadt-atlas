/* algo-Agent.js : scenes de la page Agent (VISOR et legacy).
   Aucune chaine traduisible ici : seulement des chiffres et des signes. Les couleurs sont des classes .a-*. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;

  /* Classement de douze outils par BM25 : chaque mot de la demande ajoute des points, puis on garde les 8 meilleurs */
  A.scenes.agent_bm25 = function (svg) {
    var N = 12, X0 = 26, BW = 17, GAP = 5, BASE = 150, MAXH = 92, i, w;
    var c = [
      [4, 0, 9, 1, 0, 6, 0, 2, 0, 5, 0, 1],
      [0, 3, 6, 0, 2, 0, 7, 0, 3, 4, 0, 0],
      [2, 0, 5, 0, 0, 3, 0, 1, 0, 0, 4, 2]
    ];
    var tot = [], rank = [], order;
    for (i = 0; i < N; i++) { tot[i] = c[0][i] + c[1][i] + c[2][i] + i * 0.01; }
    order = tot.map(function (v, k) { return k; }).sort(function (a, b) { return tot[b] - tot[a]; });
    for (i = 0; i < N; i++) { rank[order[i]] = i; }
    var scale = MAXH / 20;
    var bars = [];
    for (i = 0; i < N; i++) { bars.push(E("rect", { "class": "a-soft", width: BW, rx: 2 }, svg)); }
    E("line", { "class": "a-ink", x1: X0 - 6, x2: X0 + N * (BW + GAP), y1: BASE, y2: BASE }, svg);
    var chips = [];
    for (w = 0; w < 3; w++) {
      chips.push(E("rect", { "class": "a-acc", x: X0 + w * 30, y: 14, width: 24, height: 10, rx: 3 }, svg));
    }
    var cut = E("line", { "class": "a-dash", y1: 40, y2: BASE + 6 }, svg);
    var k8 = txt(svg, X0, 176, "8", "a-label-b", "start");
    var tk = txt(svg, X0 + 8 * (BW + GAP) - GAP, 176, "8 | " + (N - 8), "a-label", "end");
    k8.setAttribute("opacity", 0);
    return function (t) {
      var sums = [], k, u = ease(seg(t, 0.62, 0.84)), keep = ease(seg(t, 0.84, 0.96));
      for (i = 0; i < N; i++) {
        var s = 0;
        for (w = 0; w < 3; w++) { s += c[w][i] * ease(seg(t, 0.06 + w * 0.17, 0.2 + w * 0.17)); }
        sums[i] = s;
        var h = Math.max(0.5, s * scale);
        var x = X0 + lerp(i, rank[i], u) * (BW + GAP);
        bars[i].setAttribute("x", x); bars[i].setAttribute("height", h); bars[i].setAttribute("y", BASE - h);
        var kept = rank[i] < 8;
        bars[i].setAttribute("class", u > 0.99 && kept ? "a-acc" : "a-soft");
        bars[i].setAttribute("opacity", u > 0.99 ? (kept ? 1 : 1 - 0.7 * keep) : 0.85);
      }
      for (w = 0; w < 3; w++) {
        var on = seg(t, 0.06 + w * 0.17, 0.2 + w * 0.17);
        chips[w].setAttribute("opacity", on > 0 && on < 1 ? 1 : 0.35);
      }
      var cx = X0 + 8 * (BW + GAP) - GAP / 2;
      cut.setAttribute("x1", cx); cut.setAttribute("x2", cx); cut.setAttribute("opacity", keep);
      tk.setAttribute("opacity", keep);
    };
  };

  /* Preselection du legacy : seize outils, les trois meilleurs passent, le quatrieme est perdu pour de bon */
  A.scenes.agent_topk = function (svg) {
    var N = 16, X0 = 10, BW = 13, GAP = 5, BASE = 150, MAXH = 96, i;
    var raw = [3.1, 7.4, 1.2, 8.6, 2.2, 5.0, 0.6, 9.5, 4.1, 1.9, 6.3, 0.9, 2.8, 8.0, 3.6, 1.5];
    var order = raw.map(function (v, k) { return k; }).sort(function (a, b) { return raw[b] - raw[a]; });
    var rank = [];
    for (i = 0; i < N; i++) { rank[order[i]] = i; }
    var bars = [];
    for (i = 0; i < N; i++) { bars.push(E("rect", { "class": "a-soft", width: BW, rx: 2 }, svg)); }
    E("line", { "class": "a-ink", x1: X0 - 4, x2: X0 + N * (BW + GAP), y1: BASE, y2: BASE }, svg);
    var cut = E("line", { "class": "a-dash", y1: 30, y2: BASE + 6 }, svg);
    var lost = txt(svg, 0, 0, "×", "a-label-b", "middle");
    var three = txt(svg, X0, 176, "3", "a-label-b", "start");
    return function (t) {
      var g = ease(seg(t, 0.05, 0.4)), u = ease(seg(t, 0.42, 0.72)), keep = ease(seg(t, 0.74, 0.92));
      for (i = 0; i < N; i++) {
        var h = Math.max(0.5, raw[i] * (MAXH / 10) * g);
        var x = X0 + lerp(i, rank[i], u) * (BW + GAP);
        bars[i].setAttribute("x", x); bars[i].setAttribute("height", h); bars[i].setAttribute("y", BASE - h);
        var kept = rank[i] < 3;
        bars[i].setAttribute("class", u > 0.99 && kept ? "a-acc" : "a-soft");
        bars[i].setAttribute("opacity", u > 0.99 ? (kept ? 1 : 1 - 0.7 * keep) : 0.85);
      }
      var cx = X0 + 3 * (BW + GAP) - GAP / 2;
      cut.setAttribute("x1", cx); cut.setAttribute("x2", cx); cut.setAttribute("opacity", keep);
      var fourth = X0 + 3 * (BW + GAP) + BW / 2, h4 = raw[order[3]] * (MAXH / 10);
      lost.setAttribute("x", fourth); lost.setAttribute("y", BASE - h4 - 6); lost.setAttribute("opacity", keep);
      three.setAttribute("opacity", keep);
    };
  };

  /* Verification des valeurs proposees : une passe, un nom inconnu, un mauvais type ; la confiance est multipliee par 0,6 */
  A.scenes.agent_validate = function (svg) {
    var CX = [24, 24, 24], CY = [28, 62, 96], i;
    var chips = [], marks = [];
    for (i = 0; i < 3; i++) {
      chips.push(E("rect", { "class": "a-nlp", x: CX[i], y: CY[i], width: 60, height: 22, rx: 4 }, svg));
      marks.push(txt(svg, 0, i === 0 ? CY[i] - 5 : CY[i] + 16, "", "a-label-b", "middle"));
    }
    var gate = E("rect", { "class": "a-cell", x: 120, y: 16, width: 44, height: 110, rx: 6 }, svg);
    E("line", { "class": "a-ink", x1: 24, x2: 296, y1: 168, y2: 168 }, svg);
    var bar = E("rect", { "class": "a-seg", x: 24, y: 150, height: 12, rx: 3 }, svg);
    txt(svg, 24, 186, "1", "a-num", "start");
    var c06 = txt(svg, 24 + 272 * 0.6, 186, "0.6", "a-num", "middle");
    var tick = E("line", { "class": "a-dash", x1: 24 + 272 * 0.6, x2: 24 + 272 * 0.6, y1: 146, y2: 168 }, svg);
    var stopX = [230, 56, 56];
    return function (t) {
      for (i = 0; i < 3; i++) {
        var u = ease(seg(t, 0.08 + i * 0.05, 0.4 + i * 0.03));
        chips[i].setAttribute("x", lerp(CX[i], stopX[i], u));
        chips[i].setAttribute("opacity", i === 0 ? 1 : 1 - 0.55 * seg(t, 0.45, 0.6));
        marks[i].textContent = i === 0 ? "\u2713" : "\u00d7";
        marks[i].setAttribute("x", i === 0 ? 260 : 142);
        marks[i].setAttribute("opacity", u > 0.97 ? 1 : 0);
      }
      bar.setAttribute("width", 272 * (1 - 0.4 * ease(seg(t, 0.55, 0.85))));
      tick.setAttribute("opacity", ease(seg(t, 0.85, 0.95)));
      c06.setAttribute("opacity", ease(seg(t, 0.85, 0.95)));
    };
  };

  /* Verification du legacy : rien n'est retire. Une valeur fautive est signalee et continue son chemin ;
     un nom hors specification ne fait qu'un avertissement ; la confiance est multipliee par 0,6 des qu'une erreur existe */
  A.scenes.agent_flag = function (svg) {
    var CY = [28, 62, 96], i;
    var chips = [], marks = [];
    for (i = 0; i < 3; i++) {
      chips.push(E("rect", { "class": i === 2 ? "a-dash" : "a-nlp", x: 24, y: CY[i], width: 60, height: 22, rx: 4 }, svg));
      marks.push(txt(svg, 0, CY[i] + 16, "", "a-label-b", "middle"));
    }
    E("rect", { "class": "a-cell", x: 120, y: 16, width: 44, height: 110, rx: 6 }, svg);
    E("line", { "class": "a-ink", x1: 24, x2: 296, y1: 168, y2: 168 }, svg);
    var bar = E("rect", { "class": "a-seg", x: 24, y: 150, height: 12, rx: 3 }, svg);
    txt(svg, 24, 186, "1", "a-num", "start");
    var c06 = txt(svg, 24 + 272 * 0.6, 186, "0.6", "a-num", "middle");
    var tick = E("line", { "class": "a-dash", x1: 24 + 272 * 0.6, x2: 24 + 272 * 0.6, y1: 146, y2: 168 }, svg);
    var sym = ["\u2713", "\u00d7", "!"];
    return function (t) {
      for (i = 0; i < 3; i++) {
        var u = ease(seg(t, 0.08 + i * 0.1, 0.5 + i * 0.05));
        chips[i].setAttribute("x", lerp(24, 230, u));
        marks[i].textContent = sym[i];
        marks[i].setAttribute("x", 142);
        marks[i].setAttribute("y", CY[i] + 16);
        marks[i].setAttribute("opacity", u > 0.4 && u < 0.8 ? 1 : 0);
      }
      bar.setAttribute("width", 272 * (1 - 0.4 * ease(seg(t, 0.6, 0.85))));
      tick.setAttribute("opacity", ease(seg(t, 0.85, 0.95)));
      c06.setAttribute("opacity", ease(seg(t, 0.85, 0.95)));
    };
  };

  /* La porte d'execution : trois verifications et un seuil de confiance a 0,5 */
  A.scenes.agent_gate = function (svg) {
    var X = [44, 100, 156, 212], cls = ["a-acc", "a-seg", "a-ana", "a-soft"], i;
    var lamps = [], rims = [];
    for (i = 0; i < 4; i++) {
      rims.push(E("circle", { "class": "a-cell", cx: X[i], cy: 40, r: 15 }, svg));
      lamps.push(E("circle", { "class": cls[i], cx: X[i], cy: 40, r: 11 }, svg));
    }
    var TX0 = 44, TX1 = 276, TY = 108;
    E("line", { "class": "a-ink", x1: TX0, x2: TX1, y1: TY, y2: TY }, svg);
    var thr = TX0 + (TX1 - TX0) * 0.5;
    E("line", { "class": "a-dash", x1: thr, x2: thr, y1: TY - 18, y2: TY + 18 }, svg);
    txt(svg, thr, TY + 32, "0.5", "a-num", "middle");
    txt(svg, TX0, TY + 32, "0", "a-num", "middle");
    txt(svg, TX1, TY + 32, "1", "a-num", "middle");
    var mark = E("circle", { "class": "a-soft", cy: TY, r: 6 }, svg);
    var door = E("rect", { "class": "a-ink", x: 268, y: 14, width: 7, height: 52, rx: 2 }, svg);
    var arrow = E("path", { "class": "a-acc-s", d: "M238 40 H292 M286 35 L293 40 L286 45" }, svg);
    return function (t) {
      for (i = 0; i < 3; i++) { lamps[i].setAttribute("opacity", ease(seg(t, 0.04 + i * 0.07, 0.12 + i * 0.07))); }
      var conf = lerp(0.28, 0.82, ease(seg(t, 0.3, 0.8)));
      mark.setAttribute("cx", TX0 + (TX1 - TX0) * conf);
      var ok = conf >= 0.5;
      lamps[3].setAttribute("opacity", ok ? 1 : 0.12);
      var open = ok ? ease(seg(t, 0.56, 0.7)) : 0;
      door.setAttribute("y", lerp(14, -40, open)); door.setAttribute("opacity", 1 - 0.8 * open);
      arrow.setAttribute("opacity", open);
    };
  };

  /* La boucle de reparation du legacy : au plus deux essais, chacun demande une confirmation */
  A.scenes.agent_repair = function (svg) {
    var P = { run: [60, 120], llm: [160, 44], ok: [260, 120] }, k;
    E("path", { "class": "a-dash", d: "M60 120 L160 44 L260 120 Z" }, svg);
    var run = E("rect", { "class": "a-ink", x: P.run[0] - 22, y: P.run[1] - 16, width: 44, height: 32, rx: 6 }, svg);
    E("path", { "class": "a-ink", d: "M54 112 L54 128 L68 120 Z" }, svg);
    E("circle", { "class": "a-nlp", cx: P.llm[0], cy: P.llm[1], r: 18 }, svg);
    E("rect", { "class": "a-ink", x: P.ok[0] - 22, y: P.ok[1] - 16, width: 44, height: 32, rx: 6 }, svg);
    txt(svg, P.ok[0], P.ok[1] + 5, "✓", "a-label-b", "middle");
    var fail = txt(svg, P.run[0], P.run[1] - 24, "×", "a-label-b", "middle");
    var pk = E("circle", { "class": "a-acc", r: 6 }, svg);
    var d1 = E("circle", { "class": "a-cell", cx: 130, cy: 172, r: 7 }, svg);
    var d2 = E("circle", { "class": "a-cell", cx: 160, cy: 172, r: 7 }, svg);
    var f1 = E("circle", { "class": "a-seg", cx: 130, cy: 172, r: 5 }, svg);
    var f2 = E("circle", { "class": "a-seg", cx: 160, cy: 172, r: 5 }, svg);
    var stop = txt(svg, 230, 176, "2 / 2", "a-label-b", "middle");
    var leg = [["run", "llm"], ["llm", "ok"], ["ok", "run"]];
    function at(a, b, u) { return [lerp(P[a][0], P[b][0], u), lerp(P[a][1], P[b][1], u)]; }
    return function (t) {
      var round = t < 0.5 ? 0 : 1, local = (t - round * 0.46) / 0.46;
      var l = Math.max(0, Math.min(2.999, local * 3)), j = Math.floor(l), u = ease(l - j);
      var pos = at(leg[j][0], leg[j][1], u);
      var done = t > 0.93;
      pk.setAttribute("cx", pos[0]); pk.setAttribute("cy", pos[1]);
      pk.setAttribute("opacity", done ? 0 : 1);
      fail.setAttribute("opacity", (j === 0 && u < 0.4) || done ? 1 : 0.2);
      f1.setAttribute("opacity", t > 0.2 ? 1 : 0.15);
      f2.setAttribute("opacity", t > 0.66 ? 1 : 0.15);
      stop.setAttribute("opacity", done ? 1 : 0);
      run.setAttribute("opacity", 1);
    };
  };

  /* Arguments positionnels : un parametre manque dans la liste, tout ce qui suit glisse d'une case */
  A.scenes.agent_shift = function (svg) {
    var SX = 22, SW = 36, GAP = 4, SY = 118, VY = 30, GAPSLOT = 3, i;
    var slots = [], vals = [], num = [];
    for (i = 0; i < 7; i++) {
      var x = SX + i * (SW + GAP);
      slots.push(E("rect", { "class": i === GAPSLOT ? "a-dash" : "a-cell", x: x, y: SY, width: SW, height: 30, rx: 4 }, svg));
      txt(svg, x + SW / 2, SY + 46, String(i + 1), "a-num", "middle");
    }
    var sent = [0, 1, 2, 4, 5, 6];
    for (i = 0; i < sent.length; i++) {
      var home = SX + sent[i] * (SW + GAP);
      var v = E("rect", { "class": sent[i] < GAPSLOT ? "a-seg" : "a-acc", x: home, y: VY, width: SW, height: 30, rx: 4 }, svg);
      vals.push(v);
      num.push(txt(svg, home + SW / 2, VY + 20, String(sent[i] + 1), "a-label-b", "middle"));
    }
    var bang = txt(svg, SX + GAPSLOT * (SW + GAP) + SW / 2, SY - 8, "?", "a-label-b", "middle");
    return function (t) {
      for (i = 0; i < sent.length; i++) {
        var from = SX + sent[i] * (SW + GAP), to = SX + i * (SW + GAP);
        var u = ease(seg(t, 0.2 + i * 0.07, 0.45 + i * 0.07)), y = lerp(VY, SY, u);
        var xx = lerp(from, to, u);
        vals[i].setAttribute("x", xx); vals[i].setAttribute("y", y);
        num[i].setAttribute("x", xx + SW / 2); num[i].setAttribute("y", y + 20);
      }
      bang.setAttribute("opacity", ease(seg(t, 0.75, 0.9)));
    };
  };
})();
