#!/usr/bin/env python3
"""sadt-atlas — génère l'index de recherche et la page des constats.

À relancer après toute modification des pages :  python3 build.py
Ne modifie aucune page existante ; écrit assets/search-index.js et constats.html.
"""
import os, re, json, html
from html.parser import HTMLParser

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


def walk():
    out = []
    for dp, dirs, fs in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for f in sorted(fs):
            if f.endswith(".html") and f != "constats.html":
                out.append(os.path.join(dp, f))
    return sorted(out)


def main():
    index, constats = [], []
    for path in walk():
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
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
    with open(os.path.join(ROOT, "assets", "search-index.js"), "w", encoding="utf-8") as fh:
        fh.write("window.LT_INDEX=")
        json.dump(index, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";")
    with open(os.path.join(ROOT, "assets", "constats.json"), "w", encoding="utf-8") as fh:
        json.dump(constats, fh, ensure_ascii=False, indent=0)

    n = len(open(os.path.join(ROOT, "assets", "search-index.js"), encoding="utf-8").read())
    print(f"index de recherche : {len(index)} sections, {n/1024:.0f} Ko")
    from collections import Counter
    print("constats :", dict(Counter(c["kind"] for c in constats)), f"total {len(constats)}")
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


def write_constats(constats):
    """Page statique agrégeant tous les callouts. Aucun fetch : tout est inline,
    donc la page marche aussi en file://."""
    idx = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    sidebar = idx[idx.index('<nav class="sidebar">'):idx.index("</nav>") + 6]
    sidebar = sidebar.replace('<a href="constats.html">', '<a href="constats.html" aria-current="page">')

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

    page = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Constats — sadt-atlas</title>
<link rel="stylesheet" href="assets/style.css">
<script src="assets/site.js"></script>
</head>
<body data-cat="recalage">
<div class="layout">
{sidebar}
  <div class="main">
    <article class="content wide">
      <header class="page-head">
        <div class="breadcrumb"><a href="index.html">sadt-atlas</a></div>
        <h1>Constats</h1>
        <p class="lede">Tout ce que la lecture du code a fait ressortir, rassemblé depuis les
        {len(constats)} encarts des fiches. Relevé en documentant, pas en cherchant des bugs.</p>
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
        <a href="index.html">← Toutes les fiches</a> ·
        Page générée par <code>build.py</code> — relancer après modification des fiches.
      </footer>
    </article>
  </div>
</div>
</body>
</html>
"""
    with open(os.path.join(ROOT, "constats.html"), "w", encoding="utf-8") as fh:
        fh.write(page)
    print(f"constats.html : {len(constats)} entrées, {len(tools)} outils")


if __name__ == "__main__":
    _idx, _c = main()
    write_constats(_c)
