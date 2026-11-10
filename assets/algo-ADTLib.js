/* algo-ADTLib.js : scene de la page ADTLib (legacy).
   Aucune chaine traduisible ici : seulement des chiffres et des signes. Couleurs : classes .a-* uniquement. */
(function () {
  "use strict";
  var A = window.Algo, E = A.E, ease = A.ease, seg = A.seg, lerp = A.lerp, txt = A.txt;

  /* Slicer multiplie la valeur imprimee par 100 : 0.42 fait avancer une barre, 2 devient 200 et sert de signal */
  A.scenes.adtlib_progress = function (svg) {
    var BX = 190, BW = 110, i;
    txt(svg, 16, 40, "0.42", "a-label-b", "start");
    E("path", { "class": "a-ink", d: "M52 36 H92 M87 32 L93 36 L87 40" }, svg);
    txt(svg, 72, 28, "× 100", "a-num", "middle");
    E("rect", { "class": "a-cell", x: BX, y: 28, width: BW, height: 16, rx: 4 }, svg);
    var fill = E("rect", { "class": "a-acc", x: BX, y: 28, height: 16, rx: 4 }, svg);
    var v1 = txt(svg, 112, 40, "42", "a-label-b", "start");
    txt(svg, BX, 62, "0", "a-num", "start"); txt(svg, BX + BW, 62, "100", "a-num", "end");
    E("line", { "class": "a-dash", x1: 16, x2: 304, y1: 84, y2: 84 }, svg);
    txt(svg, 16, 126, "2", "a-label-b", "start");
    E("path", { "class": "a-ink", d: "M52 122 H92 M87 118 L93 122 L87 126" }, svg);
    txt(svg, 72, 114, "× 100", "a-num", "middle");
    var v2 = txt(svg, 112, 126, "200", "a-label-b", "start");
    var cnt = [];
    for (i = 0; i < 3; i++) {
      E("rect", { "class": "a-cell", x: 190 + i * 38, y: 108, width: 30, height: 24, rx: 4 }, svg);
      cnt.push(E("rect", { "class": "a-seg", x: 194 + i * 38, y: 112, width: 22, height: 16, rx: 3 }, svg));
    }
    var spike = E("polyline", { "class": "a-nlp-s", fill: "none" }, svg);
    var base = 176;
    E("line", { "class": "a-ink", x1: 16, x2: 304, y1: base, y2: base }, svg);
    return function (t) {
      var u = ease(seg(t, 0.05, 0.45));
      fill.setAttribute("width", Math.max(0.01, BW * 0.42 * u));
      v1.setAttribute("opacity", u > 0.9 ? 1 : 0.25);
      var p = seg(t, 0.5, 0.95), k = Math.floor(p * 3.001);
      v2.setAttribute("opacity", p > 0 ? 1 : 0.25);
      for (i = 0; i < 3; i++) { cnt[i].setAttribute("opacity", k > i ? 1 : 0.1); }
      /* trace 0, 2, 0 pour chaque patient : la valeur ne notifie le panneau que lorsqu'elle change */
      var pts = [], x = 16, step = 288 / 6, j;
      pts.push(x + "," + base);
      for (j = 0; j < 3; j++) {
        var on = p * 3 > j;
        pts.push((x + (2 * j + 0.2) * step) + "," + base);
        pts.push((x + (2 * j + 0.5) * step) + "," + (on ? base - 26 : base));
        pts.push((x + (2 * j + 1) * step) + "," + base);
      }
      spike.setAttribute("points", pts.join(" "));
    };
  };
})();
