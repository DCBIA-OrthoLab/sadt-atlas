#!/usr/bin/env python3
"""sadt-atlas — génère l'index de recherche et la page des constats.

À relancer après toute modification des pages :  python3 build.py
Ne modifie aucune page existante ; écrit assets/search-index.js et constats.html.
"""
import os, re, json, html
from html.parser import HTMLParser

import nav
import papers

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




PAPERS_RX = re.compile(r'\n*[ \t]*<!-- papers:start -->.*?<!-- papers:end -->\n*', re.S)

PAPERS_UI = {
 "fr": {"h2": "Pour aller plus loin",
        "self": "Sur {tool} lui-même",
        "around": "Autour de la méthode",
        "free": "texte intégral libre",
        "biblio": "La bibliographie complète de l'outil — ce qui a été trouvé, et ce qui a "
                  "été cherché sans rien trouver — est dans "
                  "<a href=\"{href}\">ses sources</a>."},
 "en": {"h2": "Further reading",
        "self": "On {tool} itself",
        "around": "Around the method",
        "free": "free full text",
        "biblio": "The tool's full bibliography — what was found, and what was looked for "
                  "without success — is in <a href=\"{href}\">its sources</a>."},
}


def papers_block(lang, tool):
    """Section « Pour aller plus loin » d'une page du Guide, depuis papers.py."""
    d = papers.PAPERS.get(tool)
    if not d:
        return None
    ui = PAPERS_UI[lang]
    out = ["      <!-- papers:start -->",
           f'      <h2 id="lire-plus">{ui["h2"]}</h2>']
    note = d.get("note")
    if note:
        out.append(f'      <p>{note[lang]}</p>')

    def items(entries):
        lines = ["      <ul>"]
        for e in entries:
            title = html.escape(e["title"], quote=False)
            extra = ""
            if e.get("free"):
                extra = f' <a href="{e["free"]}">{ui["free"]}</a>.'
            lines.append(
                f'        <li><strong>{html.escape(e["ref"], quote=False)}</strong> — '
                f'<a href="{e["url"]}"><em>{title}</em></a>. {e[lang]}{extra}</li>')
        lines.append("      </ul>")
        return lines

    if d["self"]:
        out.append(f'      <h3 id="sur-outil">{ui["self"].format(tool=tool)}</h3>')
        out += items(d["self"])
    if d["around"]:
        out.append(f'      <h3 id="autour">{ui["around"]}</h3>')
        out += items(d["around"])
    out.append("      <p>" + ui["biblio"].format(href=f"../{tool}/SOURCES.html") + "</p>")
    out.append("      <!-- papers:end -->")
    return "\n".join(out) + "\n"


def sync_papers():
    """Écrit, dans chaque page du Guide, la section des références de papers.py.

    Bloc délimité par <!-- papers:start/end -->, donc réécrit sans dupliquer.
    Posé juste avant le lien « Comment ça marche vraiment » vers l'Atlas.
    """
    n = 0
    for lang in nav.LANGS:
        gdir = os.path.join(ROOT, lang, "guide")
        if not os.path.isdir(gdir):
            continue
        for f in sorted(os.listdir(gdir)):
            tool = os.path.splitext(f)[0]
            if not f.endswith(".html") or tool not in papers.PAPERS:
                continue
            path = os.path.join(gdir, f)
            s = open(path, encoding="utf-8").read()
            blk = papers_block(lang, tool)
            new = PAPERS_RX.sub("", s)
            i = new.find('      <a class="deep-link"')
            if i < 0:
                print(f"  ! {lang}/guide/{f} : pas de deep-link, section non posée")
                continue
            new = new[:i].rstrip() + "\n\n" + blk + "\n" + new[i:]
            if new != s:
                open(path, "w", encoding="utf-8").write(new)
                n += 1
    print(f"références : {n} pages du Guide mises à jour")


def check_papers():
    """Aucune URL citée qui ne soit déjà dans la bibliographie de l'outil."""
    bad = []
    for tool, d in papers.PAPERS.items():
        known = set()
        for p in (os.path.join(ROOT, tool, "SOURCES.md"),
                  os.path.join(ROOT, "fr", tool, "SOURCES.html")):
            if os.path.exists(p):
                t = open(p, encoding="utf-8").read()
                known |= {u.rstrip(".,;") for u in re.findall(r'https?://[^\s\)\]\|>"]+', t)}
        for e in d["self"] + d["around"]:
            for u in (e["url"], e.get("free")):
                if u and u not in known:
                    bad.append((tool, u))
    for tool, u in bad:
        print(f"  ! {tool} : {u} absente de la bibliographie")
    print(f"références : {len(bad)} URL hors bibliographie")


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
    <a href="fr/guide/index.html"><b>Français</b><small>Guide et Atlas</small></a>
    <a href="en/guide/index.html"><b>English</b><small>Guide and Atlas</small></a>
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


def guide_callouts(lang):
    """Compte les avertissements posés dans les pages du Guide."""
    d = os.path.join(ROOT, lang, "guide")
    warn = bug = 0
    for f in os.listdir(d):
        if not f.endswith(".html") or f == "index.html":
            continue
        t = open(os.path.join(d, f), encoding="utf-8").read()
        warn += len(re.findall(r'<div class="callout warn"', t))
        bug += len(re.findall(r'<div class="callout bug"', t))
    return warn, bug


GUIDE_ABOUT = {
 "fr": """      <h2 id="pour-qui">À qui s'adresse ce guide</h2>
      <p>À qui ouvre SlicerAutomatedDentalTools dans 3D Slicer et veut s'en servir :
      cliniciens, chercheurs, étudiants. Il ne suppose de savoir ni lire du code, ni ce
      qu'est un réseau de neurones. Si c'est le fonctionnement interne qui vous intéresse —
      quel modèle est appelé, à quel moment, sur quelles données — c'est
      l'<a href="../index.html">Atlas</a> qu'il vous faut : les deux sections couvrent les
      mêmes {n} modules, chacune par un bout opposé.</p>

      <h2 id="pourquoi">Pourquoi il existe</h2>
      <p>L'extension rassemble {n} modules écrits par des équipes différentes, à des
      époques différentes. Leur documentation tient selon les cas en quelques lignes de
      README, en une page de projet, ou en rien du tout. Plusieurs se comportent autrement
      que ce que leur publication décrit : le papier date d'une version que le code
      n'exécute plus.</p>
      <p>Ce guide a été écrit en lisant le code de chaque module, pas sa documentation. Il
      dit donc ce que l'outil fait réellement quand vous cliquez, y compris quand c'est
      gênant : <strong>{warn} avertissements et {bug} bugs</strong> sont signalés à
      l'endroit précis où vous risquez de tomber dessus. Rien n'est corrigé ici — le but
      est que vous n'y perdiez pas une journée.</p>

      <h2 id="plan">Ce que vous trouverez sur chaque page</h2>
      <p>Toutes suivent le même plan, pour que vous sachiez où regarder sans tout relire :</p>
      <ul>
        <li><strong>Quand s'en servir</strong> — à quel problème l'outil répond, et les cas
        où il ne sert à rien.</li>
        <li><strong>Ce qu'il vous faut, ce que vous obtenez</strong> — les entrées
        attendues, leur format, et ce qui ressort à la fin.</li>
        <li><strong>Marche à suivre</strong> — les étapes dans l'ordre, champ par champ.</li>
        <li><strong>Si ça coince</strong> — les échecs fréquents et ce qui les provoque.</li>
        <li><strong>Pour aller plus loin</strong> — les publications derrière l'outil quand
        il y en a, et le renvoi vers la fiche Atlas.</li>
      </ul>

      <h2 id="commencer">Par où commencer</h2>
      <p>Si vous savez quel outil vous cherchez, prenez-le dans la liste plus bas. Sinon,
      partez de ce que vous avez à faire :</p>
      <ul>
        <li>Comparer deux examens du même patient dans le temps →
        <a href="#registration">Recalage</a></li>
        <li>Isoler des structures dans un CBCT →
        <a href="#segmentation">Segmentation</a></li>
        <li>Poser des repères anatomiques, ou remettre un scan d'aplomb →
        <a href="#landmarks">Landmarks &amp; orientation</a></li>
        <li>Mesurer, classer ou prédire à partir d'une forme →
        <a href="#analysis">Analyse</a></li>
        <li>Recadrer ou appliquer une matrice, en série →
        <a href="#utilities">Utilitaires</a></li>
        <li>Extraire ou anonymiser du texte clinique →
        <a href="#text">Texte &amp; langage</a></li>
      </ul>
""",
 "en": """      <h2 id="pour-qui">Who this guide is for</h2>
      <p>Anyone who opens SlicerAutomatedDentalTools in 3D Slicer and wants to use it:
      clinicians, researchers, students. It assumes no ability to read code and no idea
      what a neural network is. If what you want is the inner workings — which model is
      called, when, on what data — you want the <a href="../index.html">Atlas</a> instead:
      both sections cover the same {n} modules, each from the opposite end.</p>

      <h2 id="pourquoi">Why it exists</h2>
      <p>The extension gathers {n} modules written by different teams at different times.
      Their documentation amounts, depending on the case, to a few lines of README, a
      project page, or nothing at all. Several behave differently from what their
      publication describes: the paper documents a version the code no longer runs.</p>
      <p>This guide was written by reading each module's code, not its documentation. So it
      says what the tool actually does when you click, including when that is inconvenient:
      <strong>{warn} warnings and {bug} bugs</strong> are flagged at the exact point where
      you are likely to hit them. Nothing is fixed here — the point is that you do not lose
      a day to it.</p>

      <h2 id="plan">What every page contains</h2>
      <p>They all follow the same plan, so you know where to look without rereading:</p>
      <ul>
        <li><strong>When to use it</strong> — which problem the tool answers, and the cases
        where it is of no help.</li>
        <li><strong>What you need, what you get</strong> — the expected inputs, their
        format, and what comes out at the end.</li>
        <li><strong>Step by step</strong> — the steps in order, field by field.</li>
        <li><strong>When it goes wrong</strong> — the common failures and what causes
        them.</li>
        <li><strong>Further reading</strong> — the publications behind the tool where there
        are any, and the pointer to the Atlas page.</li>
      </ul>

      <h2 id="commencer">Where to start</h2>
      <p>If you know which tool you are after, take it from the list below. Otherwise start
      from what you have to do:</p>
      <ul>
        <li>Compare two scans of the same patient over time →
        <a href="#registration">Registration</a></li>
        <li>Isolate structures in a CBCT →
        <a href="#segmentation">Segmentation</a></li>
        <li>Place anatomical landmarks, or put a scan back upright →
        <a href="#landmarks">Landmarks &amp; orientation</a></li>
        <li>Measure, classify or predict from a shape →
        <a href="#analysis">Analysis</a></li>
        <li>Crop or apply a matrix, in batch →
        <a href="#utilities">Utilities</a></li>
        <li>Extract or anonymise clinical text →
        <a href="#text">Text &amp; language</a></li>
      </ul>
""",
}


def write_guide_index(lang):
    d = os.path.join(ROOT, lang, "guide")
    os.makedirs(d, exist_ok=True)
    title, lede = GUIDE_INTRO[lang]
    ui = nav.UI[lang]
    _w, _b = guide_callouts(lang)
    about = GUIDE_ABOUT[lang].format(n=len(nav.TOOLS), warn=_w, bug=_b)
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

{about}
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
    check_papers()
    sync_papers()
    for _l in nav.LANGS:
        if os.path.isdir(os.path.join(ROOT, _l)):
            _idx, _c = build_lang(_l)
            write_constats(_l, _c)
    sync_theme(theme_from_argv())   # en dernier : les pages générées viennent d'être réécrites
