#!/usr/bin/env python3
"""sadt-atlas — génère l'index de recherche et la page des constats.

À relancer après toute modification des pages :  python3 build.py
Ne modifie aucune page existante ; écrit assets/search-index.js et constats.html.
"""
import os, re, json, html
from html.parser import HTMLParser

import nav

ROOT = os.path.dirname(os.path.abspath(__file__))
SKIP_DIRS = {"assets"}

CATS = {
    "FlexReg": "Recalage", "AREG_IOS": "Recalage", "AREG_CBCT": "Recalage",
    "AREG_IOSCBCT": "Recalage", "GreedyReg": "Recalage", "MRI2CBCT": "Recalage",
    "AMASSS": "Segmentation", "BatchDentalSeg": "Segmentation",
    "ALI": "Landmarks", "ASO": "Landmarks",
    "VFACE": "Analyse", "DOCShapeAXI": "Analyse", "CLIC": "Analyse", "SurgMovPred": "Analyse",
    "AutoCrop3D": "Utilitaires", "AutoMatrix": "Utilitaires",
    "CNE": "Texte", "MedX": "Texte", "MedicalDataAnonymizer": "Texte", "Agent": "Texte",
}
CAT_SLUG = {"Recalage":"recalage","Segmentation":"segmentation","Landmarks":"landmarks",
            "Analyse":"analyse","Utilitaires":"utilitaires","Texte":"texte"}


class Page(HTMLParser):
    """Extrait, dans <article class="content"> : le titre, les sections <h2>,
    le texte de chaque section, et les callouts avec leur type."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_article = self.in_h1 = self.in_h2 = False
        self.depth_article = 0
        self.title = ""
        self.sections = []          # {id, title, text}
        self.cur = None
        self.callouts = []          # {kind, title, text, section}
        self.call_stack = []        # (kind, depth, buf, title)
        self.in_call_title = False
        self.skip = 0               # profondeur dans un <svg> / <script>
        self.chrome = 0             # profondeur dans un bloc de navigation

    # --- helpers
    def _add(self, txt):
        if self.skip or self.chrome or not self.in_article:
            return
        if self.in_h1:
            self.title += txt
        elif self.in_h2 and self.cur is not None:
            self.cur["title"] += txt
        else:
            if self.cur is not None:
                self.cur["text"].append(txt)
        for c in self.call_stack:
            if self.in_call_title:
                c["title"] += txt
            else:
                c["text"].append(txt)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class", "")
        if tag in ("svg", "script", "style"):
            self.skip += 1
            return
        if self.chrome:
            if tag in ("div", "nav", "footer", "p"):
                self.chrome += 1
            return
        if self.skip:
            return
        if set(cls.split()) & {"breadcrumb", "meta-row", "footer", "pager"}:
            self.chrome = 1
            return
        if tag == "article" and "content" in cls:
            self.in_article = True
            self.depth_article = 1
            self.cur = {"id": "", "title": "Introduction", "text": []}
            return
        if not self.in_article:
            return
        if tag == "article":
            self.depth_article += 1
        if tag == "h1":
            self.in_h1 = True
        elif tag == "h2":
            if self.cur is not None:
                self.sections.append(self.cur)
            self.cur = {"id": a.get("id", ""), "title": "", "text": []}
            self.in_h2 = True
        elif tag == "div" and "callout" in cls.split():
            kinds = [k for k in ("bug", "warn", "ok") if k in cls.split()]
            self.call_stack.append({"kind": kinds[0] if kinds else "note",
                                    "title": "", "text": [], "depth": 1,
                                    "section": self.cur["id"] if self.cur else ""})
        elif self.call_stack and tag == "div":
            if "callout-title" in cls:
                self.in_call_title = True
            else:
                self.call_stack[-1]["depth"] += 1

    def handle_endtag(self, tag):
        if tag in ("svg", "script", "style"):
            self.skip = max(0, self.skip - 1)
            return
        if self.chrome:
            if tag in ("div", "nav", "footer", "p"):
                self.chrome -= 1
            return
        if self.skip or not self.in_article:
            return
        if tag == "h1":
            self.in_h1 = False
        elif tag == "h2":
            self.in_h2 = False
        elif tag == "div" and self.call_stack:
            if self.in_call_title:
                self.in_call_title = False
            else:
                c = self.call_stack[-1]
                c["depth"] -= 1
                if c["depth"] == 0:
                    self.call_stack.pop()
                    self.callouts.append(c)
        elif tag == "article":
            self.depth_article -= 1
            if self.depth_article == 0:
                if self.cur is not None:
                    self.sections.append(self.cur)
                self.cur = None
                self.in_article = False

    def handle_data(self, d):
        self._add(d)


def clean(s, limit=None):
    s = re.sub(r"\s+", " ", s).strip()
    return s[:limit].rstrip() + "…" if limit and len(s) > limit else s


def walk(lang):
    out = []
    for dp, dirs, fs in os.walk(os.path.join(ROOT, lang)):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for f in sorted(fs):
            if f.endswith(".html") and f not in ("constats.html", "findings.html"):
                out.append(os.path.join(dp, f))
    return sorted(out)


def build_lang(lang):
    index, constats = [], []
    for path in walk(lang):
        rel = os.path.relpath(path, os.path.join(ROOT, lang)).replace(os.sep, "/")
        folder = rel.split("/")[0] if "/" in rel else ""
        tool = folder if folder in CATS else ("Accueil" if rel == "index.html" else folder)
        cat = CATS.get(folder, "")
        p = Page()
        p.feed(open(path, encoding="utf-8").read())
        title = clean(p.title) or rel

        for s in p.sections:
            body = clean(" ".join(s["text"]))
            if not body and not s["title"]:
                continue
            index.append({
                "u": rel + ("#" + s["id"] if s["id"] else ""),
                "p": title, "t": tool, "c": cat,
                "s": clean(s["title"]) or "Introduction",
                "x": body[:600],
            })
        for c in p.callouts:
            txt = clean(" ".join(c["text"]))
            if not txt:
                continue
            constats.append({
                "kind": c["kind"], "tool": tool, "cat": cat, "page": title,
                "url": rel + ("#" + c["section"] if c["section"] else ""),
                "title": constat_label(clean(c["title"]), txt) or "—",
                "text": txt[:520],
            })

    os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
    with open(os.path.join(ROOT, "assets", f"search-index-{lang}.js"), "w", encoding="utf-8") as fh:
        fh.write("window.LT_INDEX=")
        json.dump(index, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";")
    with open(os.path.join(ROOT, "assets", f"constats-{lang}.json"), "w", encoding="utf-8") as fh:
        json.dump(constats, fh, ensure_ascii=False, indent=0)

    n = len(open(os.path.join(ROOT, "assets", f"search-index-{lang}.js"), encoding="utf-8").read())
    print(f"{lang} : index {len(index)} sections, {n/1024:.0f} Ko", end="")
    from collections import Counter
    print(" — constats", dict(Counter(c["kind"] for c in constats)))
    return index, constats




GENERIC_TITLES = {
    "bug confirme", "bug confirme :", "defaut", "defaut confirme", "piege", "pieges",
    "verifie", "note", "attention", "avertissement", "remarque", "a savoir",
}


def deaccent(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s.lower())
                   if unicodedata.category(c) != "Mn").strip(" :.")


def constat_label(title, text):
    """Un titre générique n'apprend rien sur une page qui en agrège 250 :
    on lui substitue la première phrase du corps."""
    if deaccent(title) not in GENERIC_TITLES:
        return title
    m = re.split(r"(?<=[.!?])\s+", text.strip())
    first = m[0] if m else text
    return clean(first, 110) or title


KIND_LABEL = {"bug": "Défaut confirmé", "warn": "Piège", "ok": "Vérifié", "note": "Note"}
KIND_ORDER = ["bug", "warn", "ok", "note"]


CONSTAT_INTRO = {
 "fr": ("Constats", "Tout ce que la lecture du code a fait ressortir, rassemblé depuis les "
                    "{n} encarts des fiches. Relevé en documentant, pas en cherchant des bugs."),
 "en": ("Findings", "Everything reading the code turned up, gathered from the {n} callouts "
                    "across the pages. Noted while documenting, not while hunting for bugs."),
}


def write_constats(lang, constats):
    """Page statique agrégeant tous les callouts. Aucun fetch : tout est inline,
    donc la page marche aussi en file://."""
    sidebar = nav.sidebar(lang, "atlas", "findings", 1)

    tools = sorted({c["tool"] for c in constats})
    counts = {k: sum(1 for c in constats if c["kind"] == k) for k in KIND_ORDER}
    order = {k: i for i, k in enumerate(KIND_ORDER)}
    constats = sorted(constats, key=lambda c: (order[c["kind"]], c["tool"], c["title"]))

    rows = []
    for c in constats:
        rows.append(
            f'<article class="constat" data-kind="{c["kind"]}" data-tool="{html.escape(c["tool"])}">'
            f'<div class="constat-head">'
            f'<span class="badge k-{c["kind"]}">{KIND_LABEL[c["kind"]]}</span> '
            f'<a class="constat-tool" href="{html.escape(c["url"])}">{html.escape(c["tool"])}</a>'
            f'<span class="constat-title">{html.escape(c["title"])}</span>'
            f'</div>'
            f'<p class="constat-text">{html.escape(c["text"])}</p>'
            f'</article>'
        )

    chips = "".join(
        f'<button class="chip" data-filter-kind="{k}" aria-pressed="false">'
        f'<span class="dot k-{k}"></span>{KIND_LABEL[k]} <b>{counts[k]}</b></button>'
        for k in KIND_ORDER
    )
    opts = "".join(f'<option value="{html.escape(t)}">{html.escape(t)}</option>' for t in tools)

    title, lede_t = CONSTAT_INTRO[lang]
    lede = lede_t.format(n=len(constats))
    back = nav.UI[lang]["toindex"]
    page = f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Constats — sadt-atlas</title>
<link rel="stylesheet" href="../assets/style.css">
<script src="../assets/site.js"></script>
</head>
<body data-cat="recalage">
<div class="layout">
{sidebar}
  <div class="main">
    <article class="content wide">
      <header class="page-head">
        <div class="breadcrumb"><a href="index.html">sadt-atlas</a></div>
        <h1>Constats</h1>
        <p class="lede">{lede}</p>
      </header>

      <div class="filters">
        <div class="chips">{chips}</div>
        <label class="filter-tool">Outil
          <select id="tool-filter"><option value="">tous</option>{opts}</select>
        </label>
        <input type="search" id="constat-search" placeholder="filtrer le texte…" aria-label="Filtrer les constats">
        <span class="filter-count" id="constat-count"></span>
      </div>

      <div id="constat-list">
{chr(10).join(rows)}
      </div>

      <footer class="footer">
        <a href="index.html">{back}</a> ·
        <code>build.py</code>
      </footer>
    </article>
  </div>
</div>
</body>
</html>
"""
    with open(os.path.join(ROOT, lang, nav.FILES[lang]["findings"]), "w", encoding="utf-8") as fh:
        fh.write(page)
    print(f"{lang}/{nav.FILES[lang]['findings']} : {len(constats)} entrées, {len(tools)} outils")


NAV_RX = re.compile(r'<nav class="sidebar">.*?</nav>', re.S)


def page_params(rel):
    """chemin relatif à la racine -> (lang, section, current, depth) ou None."""
    parts = rel.split("/")
    if len(parts) < 2 or parts[0] not in nav.LANGS:
        return None
    lang, rest = parts[0], parts[1:]
    fl = nav.FILES[lang]
    if len(rest) == 1:
        f = rest[0]
        cur = {"index.html": "home", fl["findings"]: "findings",
               fl["glossary"]: "glossary"}.get(f, "home")
        return lang, "atlas", cur, 1
    folder, f = rest[0], rest[1]
    if folder == "guide":
        return lang, "guide", ("home" if f == "index.html" else os.path.splitext(f)[0]), 2
    return lang, "atlas", folder, 2


def sync_nav():
    """Réécrit la sidebar de chaque page à partir de nav.py."""
    n = miss = 0
    for dp, dirs, fs in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in (".git", "assets") and not d.startswith(".")]
        for f in sorted(fs):
            if not f.endswith(".html"):
                continue
            path = os.path.join(dp, f)
            rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
            prm = page_params(rel)
            if not prm:
                continue
            s = open(path, encoding="utf-8").read()
            if "<nav class=\"sidebar\">" not in s:
                miss += 1
                continue
            new = NAV_RX.sub(lambda _m: nav.sidebar(*prm), s, count=1)
            if new != s:
                open(path, "w", encoding="utf-8").write(new)
                n += 1
    print(f"sidebar : {n} pages synchronisées" + (f", {miss} sans sidebar" if miss else ""))




LANDING = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SADT Atlas</title>
<link rel="stylesheet" href="assets/style.css">
<script src="assets/site.js"></script>
</head>
<body>
<div class="landing">
  <h1>SADT Atlas</h1>
  <p>Comment fonctionne chaque outil de SlicerAutomatedDentalTools.<br>
     How each SlicerAutomatedDentalTools module works.</p>
  <div class="choices">
    <a href="fr/index.html"><b>Français</b><small>Guide et Atlas</small></a>
    <a href="en/index.html"><b>English</b><small>Guide and Atlas</small></a>
  </div>
</div>
</body>
</html>
"""


def write_landing():
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(LANDING)
    print("index.html : page de choix de langue")


GUIDE_INTRO = {
 "fr": ("Guide d'utilisation",
        "Ce que fait chaque outil, ce qu'il faut lui donner, ce qu'il rend — sans entrer "
        "dans le code. Pour comprendre les mécanismes internes, passez à l'Atlas."),
 "en": ("User guide",
        "What each tool does, what to feed it, what it returns — without going into the "
        "code. For the internal mechanisms, switch to the Atlas."),
}


def write_guide_index(lang):
    d = os.path.join(ROOT, lang, "guide")
    os.makedirs(d, exist_ok=True)
    title, lede = GUIDE_INTRO[lang]
    ui = nav.UI[lang]
    cards = []
    for cat, labels in nav.CATS.items():
        tools = [t for t, c in nav.TOOLS if c == cat]
        if not tools:
            continue
        cards.append(f"      <h2 id=\"{cat}\">{nav.esc(labels[lang])}</h2>")
        cards.append('      <div class="card-grid">')
        for t in tools:
            b = nav.BLURBS[t][f"guide_{lang}"]
            cards.append(f'        <a class="card" href="{t}.html">'
                         f'<span class="card-name">{t}</span>'
                         f'<span class="card-desc">{nav.esc(b)}</span></a>')
        cards.append("      </div>")
    page = f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{nav.esc(title)} — SADT Atlas</title>
<link rel="stylesheet" href="../../assets/style.css">
<script src="../../assets/site.js"></script>
</head>
<body class="guide">
<div class="layout">
{nav.sidebar(lang, "guide", "home", 2)}
  <div class="main">
    <article class="content">
      <header class="page-head">
        <h1>{nav.esc(title)}</h1>
        <p class="lede">{nav.esc(lede)}</p>
      </header>
{chr(10).join(cards)}
      <footer class="footer">
        <a href="../index.html">{nav.esc(ui["toindex"])}</a>
      </footer>
    </article>
    <aside class="toc"></aside>
  </div>
</div>
</body>
</html>
"""
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page)
    print(f"{lang}/guide/index.html : {len(nav.BLURBS)} outils")


THEME_RX = re.compile(r'\n\s*<link rel="stylesheet" href="[^"]*assets/themes/[^"]*">')
BASE_RX = re.compile(r'(<link rel="stylesheet" href="((?:\.\./)*)assets/style\.css">)')


def sync_theme(name="__use_nav__"):
    """Pose (ou retire) le lien du thème juste après la feuille de base.
    Idempotent : l'ancien lien est toujours enlevé avant d'écrire le nouveau.
    `name` vient de la ligne de commande si elle en donne un, sinon de nav.THEME."""
    if name == "__use_nav__":
        name = getattr(nav, "THEME", None)
    if name and name not in nav.THEMES:
        raise SystemExit(f"THEME inconnu : {name!r} — attendus {nav.THEMES} ou None")
    n = 0
    for dp, dirs, fs in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d != ".git" and not d.startswith(".")]
        for f in sorted(fs):
            if not f.endswith(".html"):
                continue
            path = os.path.join(dp, f)
            s = open(path, encoding="utf-8").read()
            new = THEME_RX.sub("", s)
            if name:
                m = BASE_RX.search(new)
                if not m:
                    continue
                link = f'\n<link rel="stylesheet" href="{m.group(2)}assets/themes/{name}.css">'
                new = new[:m.end()] + link + new[m.end():]
            if new != s:
                open(path, "w", encoding="utf-8").write(new)
                n += 1
    print(f"thème : {name or 'aucun (feuille de base seule)'} — {n} pages mises à jour")


def theme_from_argv():
    """--theme <nom> | --theme none  — surcharge nav.THEME le temps d'un run."""
    import sys
    if "--theme" not in sys.argv:
        return "__use_nav__"
    i = sys.argv.index("--theme")
    if i + 1 >= len(sys.argv):
        raise SystemExit(f"--theme attend un nom : {', '.join(nav.THEMES)} ou none")
    v = sys.argv[i + 1]
    if v in ("none", "aucun", "default"):
        return None
    if v not in nav.THEMES:
        raise SystemExit(f"thème inconnu : {v!r} — disponibles : {', '.join(nav.THEMES)}, none")
    return v


if __name__ == "__main__":
    write_landing()
    for _l in nav.LANGS:
        if os.path.isdir(os.path.join(ROOT, _l)):
            write_guide_index(_l)
    sync_nav()
    for _l in nav.LANGS:
        if os.path.isdir(os.path.join(ROOT, _l)):
            _idx, _c = build_lang(_l)
            write_constats(_l, _c)
    sync_theme(theme_from_argv())   # en dernier : les pages générées viennent d'être réécrites
