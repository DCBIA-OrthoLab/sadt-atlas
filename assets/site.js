/* sadt-atlas — thème, sommaire, recherche, confort de lecture.
   Aucune dépendance. Fonctionne en file:// comme en http://. */
(function () {
  "use strict";

  var KEY = "sadt_atlas_theme";
  var root = document.documentElement;
  var LANG = (root.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
  if (["en", "fr", "pt", "ko", "th"].indexOf(LANG) < 0) LANG = "en";

  var T = {
    fr: { dark: "☾ sombre", light: "☀ clair", onpage: "Sur cette page",
          copy: "copier", copied: "copié", failed: "échec",
          search: "Rechercher…  /", searchAria: "Rechercher dans le site",
          noResult: "Aucun résultat.", noIndex: "Index introuvable — lancer <code>python3 build.py</code>.",
          prev: "← précédent", next: "suivant →", top: "↑ haut",
          toTop: "Revenir en haut", skip: "Aller au contenu",
          anchor: "Lien vers cette section", reading: "Ordre de lecture conseillé",
          menu: "Ouvrir le menu" },
    en: { dark: "☾ dark", light: "☀ light", onpage: "On this page",
          copy: "copy", copied: "copied", failed: "failed",
          search: "Search…  /", searchAria: "Search the site",
          noResult: "No results.", noIndex: "Index not found — run <code>python3 build.py</code>.",
          prev: "← previous", next: "next →", top: "↑ top",
          toTop: "Back to top", skip: "Skip to content",
          anchor: "Link to this section", reading: "Suggested reading order",
          menu: "Open the menu" },
    pt: { dark: "☾ escuro", light: "☀ claro", onpage: "Nesta página",
          copy: "copiar", copied: "copiado", failed: "falhou",
          search: "Buscar…  /", searchAria: "Buscar no site",
          noResult: "Nenhum resultado.", noIndex: "Índice não encontrado — rode <code>python3 build.py</code>.",
          prev: "← anterior", next: "próximo →", top: "↑ topo",
          toTop: "Voltar ao topo", skip: "Ir para o conteúdo",
          anchor: "Link para esta seção", reading: "Ordem de leitura sugerida",
          menu: "Abrir o menu" },
    ko: { dark: "☾ 어둡게", light: "☀ 밝게", onpage: "이 페이지에서",
          copy: "복사", copied: "복사됨", failed: "실패",
          search: "검색…  /", searchAria: "사이트 검색",
          noResult: "결과 없음.", noIndex: "색인이 없습니다 — <code>python3 build.py</code>를 실행하십시오.",
          prev: "← 이전", next: "다음 →", top: "↑ 위로",
          toTop: "맨 위로", skip: "본문으로 건너뛰기",
          anchor: "이 섹션 링크", reading: "권장 읽기 순서",
          menu: "메뉴 열기" },
    th: { dark: "☾ มืด", light: "☀ สว่าง", onpage: "ในหน้านี้",
          copy: "คัดลอก", copied: "คัดลอกแล้ว", failed: "ล้มเหลว",
          search: "ค้นหา…  /", searchAria: "ค้นหาในเว็บไซต์",
          noResult: "ไม่พบผลลัพธ์", noIndex: "ไม่พบดัชนี — รัน <code>python3 build.py</code>",
          prev: "← ก่อนหน้า", next: "ถัดไป →", top: "↑ บนสุด",
          toTop: "กลับขึ้นบนสุด", skip: "ข้ามไปยังเนื้อหา",
          anchor: "ลิงก์ไปยังหัวข้อนี้", reading: "ลำดับการอ่านที่แนะนำ",
          menu: "เปิดเมนู" }
  }[LANG];
  try { var saved = localStorage.getItem(KEY); if (saved) root.setAttribute("data-theme", saved); } catch (e) {}

  /* Ordre de lecture conseillé, pour le précédent/suivant. */
  var READING = [
    ["FlexReg", "FlexReg/FlexReg.html"],
    ["ALI", "ALI/ALI.html"],
    ["AMASSS", "AMASSS/AMASSS.html"],
    ["ASO", "ASO/ASO.html"],
    ["AREG_IOS", "AREG_IOS/AREG_IOS.html"],
    ["AREG_CBCT", "AREG_CBCT/AREG_CBCT.html"],
    ["AREG_IOSCBCT", "AREG_IOSCBCT/AREG_IOSCBCT.html"],
    ["GreedyReg", "GreedyReg/GreedyReg.html"],
    ["MRI2CBCT", "MRI2CBCT/MRI2CBCT.html"],
    ["BatchDentalSeg", "BatchDentalSeg/BatchDentalSeg.html"],
    ["VFACE", "VFACE/VFACE.html"],
    ["DOCShapeAXI", "DOCShapeAXI/DOCShapeAXI.html"],
    ["CLIC", "CLIC/CLIC.html"],
    ["SurgMovPred", "SurgMovPred/SurgMovPred.html"],
    ["AutoCrop3D", "AutoCrop3D/AutoCrop3D.html"],
    ["AutoMatrix", "AutoMatrix/AutoMatrix.html"],
    ["CNE", "CNE/CNE.html"],
    ["MedX", "MedX/MedX.html"],
    ["MedicalDataAnonymizer", "MedicalDataAnonymizer/MedicalDataAnonymizer.html"],
    ["Agent", "Agent/Agent.html"]
  ];

  /* Profondeur réelle, lue sur le href de la feuille de style :
     fr/index.html -> 1, fr/ALI/ALI.html -> 2. */
  function depth() {
    var h = document.querySelector('link[rel="stylesheet"]').getAttribute("href");
    return (h.match(/\.\.\//g) || []).length;
  }
  function up(n) { var s = ""; for (var i = 0; i < n; i++) s += "../"; return s; }
  /* vers la racine du site (assets/) */
  function rel(p) { return up(depth()) + p; }
  /* vers la racine de la langue (fr/ ou en/) */
  function relLang(p) { return up(Math.max(0, depth() - 1)) + p; }
  /* section courante, d'après le chemin */
  function section() {
    return /\/guide\//.test(location.pathname) ? "guide" : "atlas";
  }

  var pageBarSec = null;   /* <span> de la section courante dans la barre collante */

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }


  /* ---------------- Barre et tiroir (petits écrans) ---------------- */
  function mobileNav() {
    var side = document.querySelector(".sidebar");
    if (!side || document.querySelector(".mbar")) return;

    var bar = document.createElement("div");
    bar.className = "mbar";
    bar.innerHTML =
      '<button class="mbar-burger" type="button" aria-expanded="false" ' +
      'aria-controls="sadt-nav" aria-label="' + T.menu + '">' +
      "<span></span><span></span><span></span></button>" +
      '<span class="mbar-title"></span>';
    if (!side.id) side.id = "sadt-nav";

    var cur = document.querySelector('.sidebar a[aria-current="page"]');
    var h1 = document.querySelector(".content h1");
    var t = cur ? cur.textContent : (h1 ? h1.textContent.split("—")[0] : "SADT Atlas");
    bar.querySelector(".mbar-title").textContent = t.trim();
    document.body.insertBefore(bar, document.body.firstChild);

    var veil = document.createElement("div");
    veil.className = "mveil";
    document.body.appendChild(veil);

    var burger = bar.querySelector(".mbar-burger");
    function open(on) {
      document.body.classList.toggle("nav-open", on);
      burger.setAttribute("aria-expanded", on ? "true" : "false");
      /* le focus entre dans le tiroir sans ouvrir le clavier ni cercler un lien */
      if (on) { side.setAttribute("tabindex", "-1"); side.focus(); }
      else { burger.focus(); }
    }
    burger.addEventListener("click", function () {
      open(!document.body.classList.contains("nav-open"));
    });
    veil.addEventListener("click", function () { open(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Esc") open(false);
    });
    /* suivre un lien referme le tiroir */
    side.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (a) open(false);
    });
  }

  /* Sommaire repliable, posé dans le contenu : le sommaire latéral
     disparaît sous 1100 px, et une page sans sommaire n'est pas navigable. */
  function tocMobile() {
    var content = document.querySelector(".content");
    if (!content || content.querySelector(".toc-m")) return;
    var hs = content.querySelectorAll("h2[id]");
    if (hs.length < 2) return;

    var d = document.createElement("details");
    d.className = "toc-m";
    var sum = document.createElement("summary");
    sum.textContent = T.onpage;
    d.appendChild(sum);

    var ul = document.createElement("ul");
    hs.forEach(function (h) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent.replace(/^\s*[¶#]\s*/, "").replace(/^\s*\d+\.\s*/, "");
      a.addEventListener("click", function () { d.open = false; });
      li.appendChild(a);
      ul.appendChild(li);
    });
    d.appendChild(ul);

    var head = content.querySelector(".page-head");
    if (head && head.nextSibling) content.insertBefore(d, head.nextSibling);
    else content.insertBefore(d, content.firstChild);
  }

  /* ---------------- Thème ---------------- */
  function themeToggle() {
    var btn = document.createElement("button");
    btn.className = "theme-toggle";
    btn.type = "button";
    function isDark() {
      return root.getAttribute("data-theme") === "dark" ||
        (!root.hasAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    function sync() { btn.textContent = isDark() ? T.light : T.dark; }
    btn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      sync();
    });
    sync();
    document.body.appendChild(btn);
  }

  /* ---------------- Sommaire + scrollspy ---------------- */
  function toc() {
    var box = document.querySelector(".toc");
    var content = document.querySelector(".content");
    if (!box || !content || box.querySelector("a")) return;
    var hs = content.querySelectorAll("h2[id]");
    if (!hs.length) return;
    var ul = document.createElement("ul");
    var links = [];
    hs.forEach(function (h) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent.replace(/^\s*[¶#]\s*/, "").replace(/^\s*\d+\.\s*/, "");
      li.appendChild(a); ul.appendChild(li);
      links.push(a);
    });
    var t = document.createElement("h4"); t.textContent = T.onpage;
    box.appendChild(t); box.appendChild(ul);

    if (!("IntersectionObserver" in window)) return;
    var seen = new Map();
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0); });
      var best = null, bestV = 0;
      seen.forEach(function (v, k) { if (v > bestV) { bestV = v; best = k; } });
      if (!best) return;
      links.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + best;
        a.classList.toggle("active", on);
        if (on && pageBarSec) pageBarSec.textContent = a.textContent;
      });
    }, { rootMargin: "-10% 0px -70% 0px", threshold: [0, 0.25, 0.6, 1] });
    hs.forEach(function (h) { obs.observe(h); });
  }

  /* ---------------- Ancres permalien ---------------- */
  function anchors() {
    document.querySelectorAll(".content h2[id], .content h3[id]").forEach(function (h) {
      var a = document.createElement("a");
      a.className = "anchor"; a.href = "#" + h.id; a.textContent = "¶";
      a.setAttribute("aria-label", T.anchor);
      h.insertBefore(a, h.firstChild);
    });
  }

  /* ---------------- Copier le code ---------------- */
  function copyButtons() {
    document.querySelectorAll(".content pre").forEach(function (pre) {
      if (pre.parentNode.classList.contains("pre-wrap")) return;
      var wrap = document.createElement("div");
      wrap.className = "pre-wrap";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      var b = document.createElement("button");
      b.className = "copy-btn"; b.type = "button"; b.textContent = T.copy;
      b.addEventListener("click", function () {
        var txt = pre.innerText;
        var done = function () { b.textContent = T.copied; b.classList.add("done");
          setTimeout(function () { b.textContent = T.copy; b.classList.remove("done"); }, 1400); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(done, function () { b.textContent = T.failed; });
        } else {
          var ta = document.createElement("textarea");
          ta.value = txt; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); done(); } catch (e) { b.textContent = T.failed; }
          document.body.removeChild(ta);
        }
      });
      wrap.appendChild(b);
    });
  }

  /* ---------------- Précédent / suivant ---------------- */
  function pager() {
    var cur = document.querySelector('.sidebar a[aria-current="page"]');
    if (!cur) return;
    var name = cur.textContent.trim();
    var i = READING.findIndex(function (e) { return e[0] === name; });
    if (i < 0) return;
    var art = document.querySelector(".content");
    var foot = art.querySelector(".footer");
    var nav = document.createElement("nav");
    nav.className = "pager";
    nav.setAttribute("aria-label", T.reading);
    function card(entry, dir, cls) {
      var a = document.createElement("a");
      var target = section() === "guide" ? "guide/" + entry[0] + ".html" : entry[1];
      a.className = cls; a.href = relLang(target);
      a.innerHTML = '<span class="p-dir">' + dir + '</span><span class="p-name">' + entry[0] + "</span>";
      return a;
    }
    if (i > 0) nav.appendChild(card(READING[i - 1], T.prev, "prev"));
    else nav.appendChild(document.createElement("span"));
    if (i < READING.length - 1) nav.appendChild(card(READING[i + 1], T.next, "next"));
    if (foot) art.insertBefore(nav, foot); else art.appendChild(nav);
  }

  /* ---------------- Recherche ---------------- */
  function search() {
    var side = document.querySelector(".sidebar");
    if (!side) return;
    var box = document.createElement("div");
    box.className = "search";
    box.innerHTML = '<input type="search" placeholder="' + T.search + '" aria-label="' + T.searchAria + '" autocomplete="off">' +
                    '<div class="search-results" role="listbox"></div>';
    var brand = side.querySelector(".brand");
    brand.parentNode.insertBefore(box, brand.nextSibling);
    var input = box.querySelector("input");
    var out = box.querySelector(".search-results");
    var loaded = false, loading = false, sel = -1;

    function load(cb) {
      if (loaded) return cb();
      if (loading) return;
      loading = true;
      var s = document.createElement("script");
      s.src = rel("assets/search-index-" + LANG + ".js");
      s.onload = function () { loaded = true; loading = false; cb(); };
      s.onerror = function () { loading = false; out.innerHTML = '<div class="search-empty">' + T.noIndex + "</div>"; };
      document.head.appendChild(s);
    }

    function norm(s) {
      /* retire les accents latins, puis recompose : NFD seul éclaterait le hangûl
         en jamos, et le surlignage ne retrouverait plus le terme dans le texte */
      return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
    }
    function highlight(text, terms) {
      var esc = text.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; });
      terms.forEach(function (t) {
        if (t.length < 2) return;
        var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
        esc = esc.replace(re, "<mark>$1</mark>");
      });
      return esc;
    }

    function run() {
      var q = input.value.trim();
      if (q.length < 2) { out.innerHTML = ""; sel = -1; return; }
      load(function () {
        var terms = norm(q).split(/\s+/).filter(Boolean);
        var hits = [];
        (window.LT_INDEX || []).forEach(function (r) {
          var hayT = norm(r.t + " " + r.s + " " + r.p);
          var hayX = norm(r.x);
          var score = 0, ok = true;
          terms.forEach(function (t) {
            var a = hayT.indexOf(t), b = hayX.indexOf(t);
            if (a < 0 && b < 0) { ok = false; return; }
            if (norm(r.t) === t) score += 60;
            if (a >= 0) score += 24 - Math.min(a, 20);
            if (b >= 0) score += 6;
          });
          if (ok) hits.push([score, r]);
        });
        hits.sort(function (a, b) { return b[0] - a[0]; });
        if (!hits.length) { out.innerHTML = '<div class="search-empty">' + T.noResult + "</div>"; return; }
        out.innerHTML = hits.slice(0, 20).map(function (h) {
          var r = h[1];
          var ctx = r.x;
          var pos = norm(ctx).indexOf(terms[0]);
          if (pos > 60) ctx = "…" + ctx.slice(pos - 40);
          return '<a href="' + relLang(r.u) + '" role="option">' +
            '<span class="r-tool">' + highlight(r.t, terms) + "</span> " +
            '<span class="r-sec">› ' + highlight(r.s, terms) + "</span>" +
            '<span class="r-ctx">' + highlight(ctx.slice(0, 120), terms) + "</span></a>";
        }).join("");
        sel = -1;
      });
    }

    var timer;
    input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(run, 110); });
    input.addEventListener("focus", function () { load(function () {}); });
    input.addEventListener("keydown", function (e) {
      var items = out.querySelectorAll("a");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!items.length) return;
        e.preventDefault();
        sel += e.key === "ArrowDown" ? 1 : -1;
        if (sel < 0) sel = items.length - 1;
        if (sel >= items.length) sel = 0;
        items.forEach(function (a, i) { a.classList.toggle("sel", i === sel); });
        items[sel].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        if (sel >= 0 && items[sel]) { e.preventDefault(); window.location.href = items[sel].href; }
      } else if (e.key === "Escape") {
        input.value = ""; out.innerHTML = ""; input.blur();
      }
    });
    document.addEventListener("click", function (e) { if (!box.contains(e.target)) out.innerHTML = ""; });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== input &&
          !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault(); input.focus();
      }
    });
  }

  /* ---------------- Filtres de la page Constats ---------------- */
  function constats() {
    var list = document.getElementById("constat-list");
    if (!list) return;
    var items = Array.prototype.slice.call(list.querySelectorAll(".constat"));
    var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
    var toolSel = document.getElementById("tool-filter");
    var text = document.getElementById("constat-search");
    var count = document.getElementById("constat-count");
    var kinds = new Set();

    function apply() {
      var t = toolSel.value;
      var q = text.value.trim().toLowerCase();
      var n = 0;
      items.forEach(function (el) {
        var ok = (!kinds.size || kinds.has(el.dataset.kind)) &&
                 (!t || el.dataset.tool === t) &&
                 (!q || el.textContent.toLowerCase().indexOf(q) >= 0);
        el.hidden = !ok;
        if (ok) n++;
      });
      count.textContent = n + " / " + items.length;
    }
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var k = c.dataset.filterKind;
        if (kinds.has(k)) { kinds.delete(k); c.setAttribute("aria-pressed", "false"); }
        else { kinds.add(k); c.setAttribute("aria-pressed", "true"); }
        apply();
      });
    });
    toolSel.addEventListener("change", apply);
    text.addEventListener("input", apply);
    apply();
  }

  /* ---------------- Barre de page collante ---------------- */
  function pageBar() {
    var head = document.querySelector(".page-head");
    var h1 = head && head.querySelector("h1");
    if (!head || !h1) return;

    var cur = document.querySelector('.sidebar a[aria-current="page"]');
    var name = cur ? cur.textContent.trim() : h1.textContent.trim().split("—")[0].trim();

    var crumb = head.querySelector(".breadcrumb");
    var cat = "";
    if (crumb) {
      var bits = crumb.textContent.split("›").map(function (x) { return x.trim(); });
      cat = bits.length > 1 ? bits[1] : "";
    }

    var bar = document.createElement("div");
    bar.className = "page-bar";
    bar.innerHTML =
      '<div class="pb-inner">' +
      (cat ? '<span class="pb-cat">' + cat + "</span>" : "") +
      '<a class="pb-name" href="#contenu"></a>' +
      '<span class="pb-sep" hidden>›</span>' +
      '<span class="pb-sec"></span>' +
      '<button class="pb-top" type="button" title="' + T.toTop + '">' + T.top + "</button>" +
      "</div>";
    bar.querySelector(".pb-name").textContent = name;
    document.body.appendChild(bar);

    var sep = bar.querySelector(".pb-sep");
    var secEl = bar.querySelector(".pb-sec");
    /* Proxy : afficher le séparateur dès qu'une section est connue. */
    pageBarSec = {
      set textContent(v) { secEl.textContent = v; sep.hidden = !v; },
      get textContent() { return secEl.textContent; }
    };

    bar.querySelector(".pb-top").addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        bar.classList.toggle("on", !entries[0].isIntersecting);
      }, { threshold: 0 }).observe(head);
    } else {
      window.addEventListener("scroll", function () {
        bar.classList.toggle("on", window.scrollY > head.offsetHeight);
      }, { passive: true });
    }
  }

  /* ---------------- Lien d'évitement ---------------- */
  function skipLink() {
    var art = document.querySelector(".content");
    if (!art) return;
    if (!art.id) art.id = "contenu";
    var a = document.createElement("a");
    a.className = "skip-link"; a.href = "#contenu"; a.textContent = T.skip;
    document.body.insertBefore(a, document.body.firstChild);
  }

  ready(function () {
    /* Chaque bloc est isolé : une exception dans l'un ne doit pas empêcher
       les suivants de s'exécuter. Le sommaire et la navigation passent avant
       les agréments (barre collante, copie, recherche). */
    var steps = [
      ["mobileNav", mobileNav], ["skipLink", skipLink],
      ["anchors", anchors], ["tocMobile", tocMobile], ["toc", toc],
      ["theme", themeToggle], ["pager", pager], ["pageBar", pageBar],
      ["copy", copyButtons], ["search", search], ["constats", constats]
    ];
    for (var i = 0; i < steps.length; i++) {
      try {
        steps[i][1]();
      } catch (e) {
        if (window.console && console.warn) {
          console.warn("[sadt-atlas] « " + steps[i][0] + " » a échoué :", e);
        }
      }
    }
  });
})();
