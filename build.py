#!/usr/bin/env python3
"""sadt-atlas : génère l'index de recherche et la page des constats.

À relancer après toute modification des pages :  python3 build.py
Ne modifie aucune page existante ; écrit, par langue,
assets/search-index-<lang>.js, assets/constats-<lang>.json et la page des
constats : constats.html en français, findings.html dans les autres langues.
"""
import os, re, json, html, unicodedata
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


def clip(s, limit):
    """Une coupe en plein mot n'est pas une fin : on recule jusqu'a la derniere
    espace. Le thai n'en met pas entre les mots, d'ou le repli sur la coupe
    nette quand reculer couterait trop."""
    if len(s) <= limit:
        return s
    cut = s[:limit].rstrip()
    sp = cut.rfind(" ")
    if sp > limit * 0.7:
        cut = cut[:sp]
    return cut.rstrip(" ,;:(") + "…"


def clean(s, limit=None):
    s = re.sub(r"\s+", " ", s).strip()
    return clip(s, limit) if limit else s


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
        parts = rel.split("/")
        if folder == "visor" and len(parts) == 3:
            # pages VISOR d'un outil : visor/<Outil>/<Outil>.html et visor/guide/<Outil>.html
            vtool = os.path.splitext(parts[2])[0] if parts[1] == "guide" else parts[1]
            tool, cat = f"{vtool} (VISOR)", CATS.get(vtool, "")
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
                "x": clip(body, 600),
            })
        for c in p.callouts:
            txt = clean(" ".join(c["text"]))
            if not txt:
                continue
            constats.append({
                "kind": c["kind"], "tool": tool, "cat": cat, "page": title,
                "url": rel + ("#" + c["section"] if c["section"] else ""),
                "title": constat_title(clean(c["title"])),
                "text": clean(txt, 520),
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
    print(" · constats", dict(Counter(c["kind"] for c in constats)))
    return index, constats




GENERIC_TITLES = {
    "bug confirme", "bug confirme :", "defaut", "defaut confirme", "piege", "pieges",
    "verifie", "note", "attention", "avertissement", "remarque", "a savoir",
    "confirmed bug", "pitfall", "trap", "gotcha", "verified", "warning",
    "bug confirmado", "armadilha", "verificado", "nota", "atencao",
    "확인된 버그", "함정", "확인됨", "참고", "주의",
    "บั๊กที่ยืนยันแล้ว", "ข้อควรระวัง", "ตรวจสอบแล้ว", "หมายเหตุ",
}


def title_key(s):
    """Clé de comparaison d'un titre, toutes écritures confondues.

    NFD seul ne suffit pas : il éclate une syllabe coréenne en jamos qui ne se
    recomposent jamais, et il détache les voyelles thaïes, que le filtre des
    marques emporte ensuite, « บั๊กที่ยืนยันแล้ว » devenant « บกทยนยนแลว ».
    On ne retire donc que les diacritiques latins, U+0300 à U+036F, le temps
    d'assimiler « confirmé » à « confirme », puis on recompose en NFC."""
    d = unicodedata.normalize("NFD", s.lower())
    d = "".join(c for c in d if not ("\u0300" <= c <= "\u036f"
                                     and unicodedata.category(c) == "Mn"))
    return unicodedata.normalize("NFC", d).strip(" :.")


GENERIC_KEYS = {title_key(t) for t in GENERIC_TITLES}


def recapitalise(s):
    """Un titre amputé de son préfixe commence en minuscule. On lui rend sa
    capitale, sauf quand le premier mot est un identifiant : vtkICP.__call__
    s'écrit comme le code l'écrit, pas comme une phrase."""
    first = s.split(" ", 1)[0]
    if not first[:1].isalpha() or any(c in first for c in "._(0123456789"):
        return s
    return s[:1].upper() + s[1:]


def constat_title(title):
    """Un titre générique n'apprend rien : « Défaut confirmé » est déjà dit par
    la pastille à gauche de la ligne. On a longtemps promu la première phrase
    du corps à sa place, mais le corps l'imprimait ensuite en entier : la
    moitié des constats se lisaient deux fois. Et sa médiane fait 117 signes,
    c'est une phrase, pas un intitulé. On la laisse donc au corps, et la ligne
    n'a pas de titre."""
    if title_key(title) in GENERIC_KEYS:
        return ""
    # « Défaut confirmé : entrée DICOM ignorée » dit deux fois le genre, une
    # fois dans la pastille et une fois dans son propre titre. On ne garde
    # que ce que le titre apporte.
    for sep in (":", "\uff1a"):
        head, found, tail = title.partition(sep)
        if found and tail.strip() and title_key(head) in GENERIC_KEYS:
            return recapitalise(tail.strip())
    return title


KIND_LABEL = {
 "fr": {"bug": "Défaut confirmé", "warn": "Piège", "ok": "Vérifié", "note": "Note"},
 "en": {"bug": "Confirmed bug", "warn": "Pitfall", "ok": "Verified", "note": "Note"},
 "pt": {"bug": "Bug confirmado", "warn": "Armadilha", "ok": "Verificado", "note": "Nota"},
 "ko": {"bug": "확인된 버그", "warn": "함정", "ok": "확인됨", "note": "참고"},
 "es": {"bug": "Error confirmado", "warn": "Trampa", "ok": "Verificado", "note": "Nota"},
 "it": {"bug": "Bug confermato", "warn": "Insidia", "ok": "Verificato", "note": "Nota"},
 "th": {"bug": "บั๊กที่ยืนยันแล้ว", "warn": "ข้อควรระวัง", "ok": "ตรวจสอบแล้ว", "note": "หมายเหตุ"},
}
KIND_ORDER = ["bug", "warn", "ok", "note"]


CONSTAT_INTRO = {
 "fr": ("Constats", "Tout ce que la lecture du code a fait ressortir, rassemblé depuis les "
                    "{n} encarts des fiches. Relevé en documentant, pas en cherchant des bugs."),
 "en": ("Findings", "Everything reading the code turned up, gathered from the {n} callouts "
                    "across the pages. Noted while documenting, not while hunting for bugs."),
 "pt": ("Constatações", "Tudo o que a leitura do código revelou, reunido a partir dos {n} "
                        "destaques das páginas. Anotado ao documentar, não ao caçar bugs."),
 "ko": ("발견 사항", "코드를 읽으며 드러난 모든 것을 각 페이지의 강조 상자 {n}개에서 모았다. "
                  "버그를 찾으려 한 것이 아니라 문서화하면서 기록한 것이다."),
 "es": ("Hallazgos", "Todo lo que reveló la lectura del código, reunido a partir de los {n} "
                    "recuadros de las páginas. Anotado al documentar, no al buscar errores."),
 "it": ("Riscontri", "Tutto ciò che la lettura del codice ha messo in luce, raccolto dai {n} "
                    "riquadri delle pagine. Annotato mentre si documentava, non mentre si cercavano bug."),
 "th": ("ข้อค้นพบ", "ทุกสิ่งที่การอ่านโค้ดเปิดเผยออกมา รวบรวมจากกล่องเน้น {n} กล่องในทุกหน้า "
                "บันทึกไว้ระหว่างการจัดทำเอกสาร ไม่ใช่ระหว่างการไล่หาบั๊ก"),
}

# filtres de la page des constats : (outil, tous, placeholder, aria-label)
CONSTAT_FILTERS = {
 "fr": ("Outil", "tous", "filtrer le texte…", "Filtrer les constats"),
 "en": ("Tool", "all", "filter text…", "Filter the findings"),
 "pt": ("Ferramenta", "todas", "filtrar o texto…", "Filtrar as constatações"),
 "ko": ("도구", "전체", "텍스트 필터…", "발견 사항 필터"),
 "es": ("Herramienta", "todas", "filtrar el texto…", "Filtrar los hallazgos"),
 "it": ("Strumento", "tutti", "filtra il testo…", "Filtra i riscontri"),
 "th": ("เครื่องมือ", "ทั้งหมด", "กรองข้อความ…", "กรองข้อค้นพบ"),
}


def write_constats(lang, constats):
    """Page statique agrégeant tous les callouts. Aucun fetch : tout est inline,
    donc la page marche aussi en file://."""
    sidebar = nav.sidebar(lang, "atlas", "findings", 1, nav.FILES[lang]["findings"])
    kl = KIND_LABEL[lang]
    f_tool, f_all, f_ph, f_aria = CONSTAT_FILTERS[lang]

    tools = sorted({c["tool"] for c in constats})
    counts = {k: sum(1 for c in constats if c["kind"] == k) for k in KIND_ORDER}
    order = {k: i for i, k in enumerate(KIND_ORDER)}
    constats = sorted(constats, key=lambda c: (order[c["kind"]], c["tool"], c["title"] or c["text"]))

    rows = []
    for c in constats:
        titre = (f'<span class="constat-title">{html.escape(c["title"])}</span>'
                 if c["title"] else "")
        rows.append(
            f'<article class="constat" data-kind="{c["kind"]}" data-tool="{html.escape(c["tool"])}">'
            f'<div class="constat-head">'
            f'<span class="constat-kind"><span class="dot k-{c["kind"]}"></span>'
            f'{kl[c["kind"]]}</span> '
            f'<a class="constat-tool" href="{html.escape(c["url"])}">{html.escape(c["tool"])}</a>'
            f'{titre}'
            f'</div>'
            f'<p class="constat-text">{html.escape(c["text"])}</p>'
            f'</article>'
        )

    chips = "".join(
        f'<button class="chip" data-filter-kind="{k}" aria-pressed="false">'
        f'<span class="dot k-{k}"></span>{kl[k]} <b>{counts[k]}</b></button>'
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
<title>{title} · SADT Atlas</title>
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
        <h1>{title}</h1>
        <p class="lede">{lede}</p>
      </header>

      <div class="filters">
        <div class="chips">{chips}</div>
        <label class="filter-tool">{f_tool}
          <select id="tool-filter"><option value="">{f_all}</option>{opts}</select>
        </label>
        <input type="search" id="constat-search" placeholder="{f_ph}" aria-label="{f_aria}">
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
    """chemin relatif à la racine -> (lang, section, current, depth, rel) ou None,
    rel étant le chemin de la page dans sa langue."""
    parts = rel.split("/")
    if len(parts) < 2 or parts[0] not in nav.LANGS:
        return None
    lang, rest = parts[0], parts[1:]
    fl = nav.FILES[lang]
    rel = "/".join(rest)
    if len(rest) == 1:
        f = rest[0]
        cur = {"index.html": "home", fl["findings"]: "findings",
               fl["glossary"]: "glossary"}.get(f, "home")
        return lang, "atlas", cur, 1, rel
    folder, f = rest[0], rest[1]
    if folder == "visor" and len(rest) == 3:      # visor/<Outil>/<Outil>.html, visor/guide/<Outil>.html
        if rest[1] == "guide":
            return lang, "guide", "visor/" + os.path.splitext(rest[2])[0], 3, rel
        return lang, "atlas", "visor/" + rest[1], 3, rel
    if folder == "guide":
        return lang, "guide", ("home" if f == "index.html" else os.path.splitext(f)[0]), 2, rel
    if folder == "visor":
        return lang, "atlas", "visor/" + os.path.splitext(f)[0], 2, rel
    return lang, "atlas", folder, 2, rel


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
 "fr": {"h2": "Comment citer",
        "cite": "Si vous avez utilisé {tool} dans un travail de recherche, citez :",
        "software": "Rien ne décrit le module lui-même, citez donc l'extension "
                    "comme logiciel :",
        "accessed": "Ajoutez la date à laquelle vous l'avez consultée si le style "
                    "de votre revue la demande.",
        "context": "Contexte, à ne pas citer pour l'outil",
        "free": "texte intégral libre",
        "biblio": "La bibliographie complète de l'outil, ce qui a été trouvé, et ce qui a "
                  "été cherché sans rien trouver, est dans "
                  "<a href=\"{href}\">ses sources</a>."},
 "en": {"h2": "How to cite",
        "cite": "If you used {tool} in your research, cite:",
        "software": "Nothing describes the module itself, so cite the extension "
                    "as software:",
        "accessed": "Add the date you accessed it if your journal's style asks "
                    "for one.",
        "context": "Background, not a citation for the tool",
        "free": "free full text",
        "biblio": "The tool's full bibliography, what was found, and what was looked for "
                  "without success, is in <a href=\"{href}\">its sources</a>."},
 "pt": {"h2": "Como citar",
        "cite": "Se você usou o {tool} em uma pesquisa, cite:",
        "software": "Nada descreve o próprio módulo, portanto cite a extensão "
                    "como software:",
        "accessed": "Acrescente a data de acesso se o estilo da sua revista exigir.",
        "context": "Contexto, não é uma citação da ferramenta",
        "free": "texto completo gratuito",
        "biblio": "A bibliografia completa da ferramenta, o que foi encontrado, e o que foi "
                  "procurado sem sucesso, está em <a href=\"{href}\">suas fontes</a>."},
 "ko": {"h2": "인용 방법",
        "cite": "연구에서 이 도구({tool})를 사용했다면 다음을 인용하십시오:",
        "software": "모듈 자체를 다룬 문헌이 없으므로, 확장 기능을 소프트웨어로 "
                    "인용하십시오:",
        "accessed": "학술지 양식이 요구한다면 접속 날짜를 덧붙이십시오.",
        "context": "배경 문헌, 도구 자체의 인용이 아님",
        "free": "무료 전문",
        "biblio": "이 도구의 전체 참고문헌(찾아낸 것과 찾아봤지만 없었던 것)은 "
                  "<a href=\"{href}\">출처 페이지</a>에 있습니다."},
 "es": {"h2": "Cómo citar",
        "cite": "Si usó {tool} en una investigación, cite:",
        "software": "Nada describe el módulo en sí, así que cite la extensión "
                    "como software:",
        "accessed": "Añada la fecha de acceso si el estilo de su revista la exige.",
        "context": "Contexto, no es una cita de la herramienta",
        "free": "texto completo gratuito",
        "biblio": "La bibliografía completa de la herramienta, lo que se encontró y lo que se "
                  "buscó sin éxito, está en <a href=\"{href}\">sus fuentes</a>."},
 "it": {"h2": "Come citare",
        "cite": "Se hai usato {tool} nella tua ricerca, cita:",
        "software": "Nulla descrive il modulo in sé, quindi cita l'estensione "
                    "come software:",
        "accessed": "Aggiungi la data di accesso se lo stile della tua rivista la richiede.",
        "context": "Contesto, non una citazione dello strumento",
        "free": "testo completo gratuito",
        "biblio": "La bibliografia completa dello strumento, ciò che è stato trovato e ciò che è stato "
                  "cercato senza successo, si trova nelle <a href=\"{href}\">sue fonti</a>."},
 "th": {"h2": "วิธีอ้างอิง",
        "cite": "หากคุณใช้ {tool} ในงานวิจัย ให้อ้างอิง:",
        "software": "ไม่มีเอกสารที่อธิบายโมดูลนี้โดยตรง "
                    "จึงให้อ้างอิงส่วนขยายในฐานะซอฟต์แวร์:",
        "accessed": "หากรูปแบบของวารสารกำหนด ให้เพิ่มวันที่ที่คุณเข้าถึงด้วย",
        "context": "เอกสารประกอบ ไม่ใช่การอ้างอิงเครื่องมือ",
        "free": "ฉบับเต็มอ่านฟรี",
        "biblio": "บรรณานุกรมทั้งหมดของเครื่องมือนี้ (ทั้งสิ่งที่พบ และสิ่งที่ค้นแล้วไม่พบ) "
                  "อยู่ใน<a href=\"{href}\">หน้าแหล่งอ้างอิง</a>"},
}


def source_label(url):
    """De quoi étiqueter le lien d'un papier, sans dépendre de la langue."""
    if "doi.org/" in url:
        return "doi:" + url.split("doi.org/", 1)[1]
    if "arxiv.org/abs/" in url:
        return "arXiv:" + url.split("/abs/", 1)[1]
    return url.split("//", 1)[-1].split("/", 1)[0]


def papers_block(lang, tool):
    """Section « Comment citer » d'une page du Guide, depuis papers.py.

    Les entrées « self » sont ce qu'on cite pour l'outil : chacune sort sa
    référence entière dans un <pre class="cite">, donc copiable d'un clic
    puisque site.js pose un bouton sur tout `.content pre`. Les entrées
    « around » restent des lectures de contexte, en liste compacte, parce que
    ce n'est pas ce qu'on cite pour l'outil. Un module qu'aucune publication
    ne décrit renvoie sur l'extension elle-même, citée comme logiciel.
    """
    d = papers.PAPERS.get(tool)
    if not d:
        return None
    ui = PAPERS_UI[lang]
    out = ["      <!-- papers:start -->",
           f'      <h2 id="citer">{ui["h2"]}</h2>']
    note = d.get("note")
    if note:
        out.append(f'      <p>{note[lang]}</p>')

    if d["self"]:
        out.append(f'      <h3 id="a-citer">{ui["cite"].format(tool=tool)}</h3>')
        for e in d["self"]:
            ref = papers.CITATIONS.get(e["url"])
            if not ref:
                print(f"  ! {tool} : {e['url']} sans citation dans papers.CITATIONS")
                ref = e["ref"]
            extra = ""
            if e.get("free"):
                extra = f' <a href="{e["free"]}">{ui["free"]}</a>.'
            out.append(f'      <pre class="cite">{html.escape(ref, quote=False)}</pre>')
            out.append(f'      <p><a href="{e["url"]}">{source_label(e["url"])}</a>. '
                       f'{e[lang]}{extra}</p>')
    else:
        out.append(f'      <h3 id="a-citer">{ui["software"]}</h3>')
        out.append(f'      <pre class="cite">{html.escape(papers.SOFTWARE, quote=False)}</pre>')
        out.append(f'      <p>{ui["accessed"]}</p>')

    if d["around"]:
        out.append(f'      <h3 id="contexte">{ui["context"]}</h3>')
        lines = ["      <ul>"]
        for e in d["around"]:
            title = html.escape(e["title"], quote=False)
            extra = ""
            if e.get("free"):
                extra = f' <a href="{e["free"]}">{ui["free"]}</a>.'
            lines.append(
                f'        <li><strong>{html.escape(e["ref"], quote=False)}</strong>: '
                f'<a href="{e["url"]}"><em>{title}</em></a>. {e[lang]}{extra}</li>')
        lines.append("      </ul>")
        out += lines

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


VIDEO_RX = re.compile(r'\n*[ \t]*<!-- video:start -->.*?<!-- video:end -->\n*', re.S)

VIDEO_UI = {
 "fr": {"label": "En vidéo", "chan": "chaîne DCBIA Videos", "short": "aperçu",
        "min": "{m} min {s:02d}", "sec": "{s} s"},
 "en": {"label": "On video", "chan": "DCBIA Videos channel", "short": "overview",
        "min": "{m} min {s:02d}", "sec": "{s} s"},
 "pt": {"label": "Em vídeo", "chan": "canal DCBIA Videos", "short": "apresentação",
        "min": "{m} min {s:02d}", "sec": "{s} s"},
 "ko": {"label": "영상", "chan": "DCBIA Videos 채널", "short": "개요",
        "min": "{m}분 {s:02d}초", "sec": "{s}초"},
 "es": {"label": "En vídeo", "chan": "canal DCBIA Videos", "short": "presentación",
        "min": "{m} min {s:02d}", "sec": "{s} s"},
 "it": {"label": "In video", "chan": "canale DCBIA Videos", "short": "panoramica",
        "min": "{m} min {s:02d}", "sec": "{s} s"},
 "th": {"label": "วิดีโอ", "chan": "ช่อง DCBIA Videos", "short": "ภาพรวม",
        "min": "{m} นาที {s:02d} วินาที", "sec": "{s} วินาที"},
}


def video_block(lang, tool):
    """Les vidéos DCBIA de l'outil, posées en tête de sa page du Guide."""
    vids = papers.VIDEOS.get(tool)
    if not vids:
        return None
    ui = VIDEO_UI[lang]
    out = ["      <!-- video:start -->",
           '      <div class="video-box">',
           f'        <span class="vb-label">{ui["label"]}</span>',
           "        <ul>"]
    for vid, title, sec in vids:
        dur = ui["min"].format(m=sec // 60, s=sec % 60) if sec >= 60 else ui["sec"].format(s=sec)
        # sous une minute et demie, c'est une annonce : le dire plutôt que de laisser croire
        qual = f" ({ui['short']})" if sec < 90 else ""
        url = f"https://www.youtube.com/watch?v={vid}"
        t = html.escape(title, quote=False)
        # L'aperçu est une image LOCALE : rien n'est demandé à YouTube tant que
        # personne ne clique. La vignette porte le même lien que le titre, mais
        # elle est cachée aux lecteurs d'écran, qui liraient deux fois la même
        # chose. site.js y substitue le lecteur au clic.
        out += [
            '          <li class="vb-item">',
            f'            <a class="vb-shot" href="{url}" target="_blank" rel="noopener" '
            f'data-yt="{vid}" tabindex="-1" aria-hidden="true">'
            f'<img src="../../assets/video/{vid}.jpg" alt="" width="480" height="270" '
            f'loading="lazy" decoding="async"></a>',
            '            <span class="vb-text">'
            f'<a class="vb-title" href="{url}" target="_blank" rel="noopener">{t}</a>'
            f'<span class="vb-meta">{dur}{qual} · {ui["chan"]}</span></span>',
            "          </li>",
        ]
    out += ["        </ul>", "      </div>", "      <!-- video:end -->"]
    return "\n".join(out) + "\n"


def sync_videos():
    """Pose le bloc vidéo juste sous l'en-tête de chaque page du Guide concernée."""
    n = 0
    for lang in nav.LANGS:
        gdir = os.path.join(ROOT, lang, "guide")
        if not os.path.isdir(gdir):
            continue
        for f in sorted(os.listdir(gdir)):
            tool = os.path.splitext(f)[0]
            if not f.endswith(".html") or tool not in papers.VIDEOS:
                continue
            path = os.path.join(gdir, f)
            s = open(path, encoding="utf-8").read()
            new = VIDEO_RX.sub("\n", s)
            i = new.find("</header>")
            if i < 0:
                print(f"  ! {lang}/guide/{f} : pas d'en-tête, bloc vidéo non posé")
                continue
            i += len("</header>")
            new = new[:i] + "\n\n" + video_block(lang, tool) + new[i:].lstrip("\n")
            if new != s:
                open(path, "w", encoding="utf-8").write(new)
                n += 1
    print(f"vidéos : {n} pages du Guide mises à jour")


LANDING = """<!doctype html>
<html lang="en">
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
  <p>How each SlicerAutomatedDentalTools module works.</p>
  <nav class="choices" aria-label="Language">
    <a href="en/guide/index.html" hreflang="en"><b>English</b><small>Guide and Atlas</small></a>
    <a href="fr/guide/index.html" hreflang="fr"><b>Français</b><small>Guide et Atlas</small></a>
    <a href="pt/guide/index.html" hreflang="pt"><b>Português</b><small>Guia e Atlas</small></a>
    <a href="ko/guide/index.html" hreflang="ko"><b>한국어</b><small>가이드와 아틀라스</small></a>
    <a href="es/guide/index.html" hreflang="es"><b>Español</b><small>Guía y Atlas</small></a>
    <a href="it/guide/index.html" hreflang="it"><b>Italiano</b><small>Guida e Atlante</small></a>
    <a href="th/guide/index.html" hreflang="th"><b>ไทย</b><small>คู่มือและแอตลาส</small></a>
  </nav>
</div>
</body>
</html>
"""

def write_landing():
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(LANDING)
    print("index.html : page de choix de langue")


GUIDE_INTRO = {
 "fr": ("Guide d'utilisation",
        "Ce que fait chaque outil, ce qu'il faut lui donner, ce qu'il rend, sans entrer "
        "dans le code. Pour comprendre les mécanismes internes, passez à l'Atlas."),
 "en": ("User guide",
        "What each tool does, what to feed it, what it returns, without going into the "
        "code. For the internal mechanisms, switch to the Atlas."),
 "pt": ("Guia de uso",
        "O que cada ferramenta faz, o que fornecer a ela, o que ela devolve, sem entrar no "
        "código. Para os mecanismos internos, passe para o Atlas."),
 "ko": ("사용 가이드",
        "각 도구가 무엇을 하는지, 무엇을 넣어야 하는지, 무엇을 돌려주는지, 코드는 다루지 "
        "않습니다. 내부 동작이 궁금하다면 아틀라스로 넘어가십시오."),
 "es": ("Guía de uso",
        "Qué hace cada herramienta, qué hay que darle, qué devuelve, sin entrar en el "
        "código. Para los mecanismos internos, pase al Atlas."),
 "it": ("Guida all'uso",
        "Che cosa fa ciascuno strumento, che cosa fornirgli, che cosa restituisce, senza entrare "
        "nel codice. Per i meccanismi interni, passa all'Atlante."),
 "th": ("คู่มือการใช้งาน",
        "เครื่องมือแต่ละตัวทำอะไร ต้องป้อนอะไรให้ และได้อะไรกลับมา, โดยไม่ลงรายละเอียดโค้ด "
        "หากต้องการเข้าใจกลไกภายใน ให้ไปที่แอตลาส"),
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
      qu'est un réseau de neurones. Si c'est le fonctionnement interne qui vous intéresse,
      quel modèle est appelé, à quel moment, sur quelles données, c'est
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
      l'endroit précis où vous risquez de tomber dessus. Rien n'est corrigé ici : le but
      est que vous n'y perdiez pas une journée.</p>

      <h2 id="plan">Ce que vous trouverez sur chaque page</h2>
      <p>Toutes suivent le même plan, pour que vous sachiez où regarder sans tout relire :</p>
      <ul>
        <li><strong>Quand s'en servir</strong> : à quel problème l'outil répond, et les cas
        où il ne sert à rien.</li>
        <li><strong>Ce qu'il vous faut, ce que vous obtenez</strong> : les entrées
        attendues, leur format, et ce qui ressort à la fin.</li>
        <li><strong>Marche à suivre</strong> : les étapes dans l'ordre, champ par champ.</li>
        <li><strong>Si ça coince</strong> : les échecs fréquents et ce qui les provoque.</li>
        <li><strong>Comment citer</strong> : la référence à citer dans un papier quand
        l'outil en a une, et le renvoi vers la fiche Atlas.</li>
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
      what a neural network is. If what you want is the inner workings, which model is
      called, when, on what data, you want the <a href="../index.html">Atlas</a> instead:
      both sections cover the same {n} modules, each from the opposite end.</p>

      <h2 id="pourquoi">Why it exists</h2>
      <p>The extension gathers {n} modules written by different teams at different times.
      Their documentation amounts, depending on the case, to a few lines of README, a
      project page, or nothing at all. Several behave differently from what their
      publication describes: the paper documents a version the code no longer runs.</p>
      <p>This guide was written by reading each module's code, not its documentation. So it
      says what the tool actually does when you click, including when that is inconvenient:
      <strong>{warn} warnings and {bug} bugs</strong> are flagged at the exact point where
      you are likely to hit them. Nothing is fixed here: the point is that you do not lose
      a day to it.</p>

      <h2 id="plan">What every page contains</h2>
      <p>They all follow the same plan, so you know where to look without rereading:</p>
      <ul>
        <li><strong>When to use it</strong>, which problem the tool answers, and the cases
        where it is of no help.</li>
        <li><strong>What you need, what you get</strong>: the expected inputs, their
        format, and what comes out at the end.</li>
        <li><strong>Step by step</strong>: the steps in order, field by field.</li>
        <li><strong>When it goes wrong</strong>: the common failures and what causes
        them.</li>
        <li><strong>How to cite</strong>: the reference to cite in a paper where the tool
        has one, and the pointer to the Atlas page.</li>
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
 "pt": """      <h2 id="pour-qui">Para quem é este guia</h2>
      <p>Para quem abre o SlicerAutomatedDentalTools no 3D Slicer e quer usá-lo:
      clínicos, pesquisadores, estudantes. Ele não pressupõe saber ler código nem saber o
      que é uma rede neural. Se o que interessa é o funcionamento interno, qual modelo é
      chamado, quando, sobre quais dados, é o <a href="../index.html">Atlas</a> que você
      procura: as duas seções cobrem os mesmos {n} módulos, cada uma por uma ponta.</p>

      <h2 id="pourquoi">Por que ele existe</h2>
      <p>A extensão reúne {n} módulos escritos por equipes diferentes, em épocas
      diferentes. A documentação deles se resume, conforme o caso, a algumas linhas de
      README, a uma página de projeto, ou a nada. Vários se comportam de forma diferente do
      que a publicação descreve: o artigo documenta uma versão que o código não executa
      mais.</p>
      <p>Este guia foi escrito lendo o código de cada módulo, não a sua documentação. Ele
      diz, portanto, o que a ferramenta faz de fato quando você clica, inclusive quando isso
      incomoda: <strong>{warn} avisos e {bug} bugs</strong> são assinalados no ponto exato
      em que você corre o risco de tropeçar neles. Nada é corrigido aqui: o objetivo é que
      você não perca um dia com isso.</p>

      <h2 id="plan">O que você encontra em cada página</h2>
      <p>Todas seguem o mesmo plano, para que você saiba onde olhar sem reler tudo:</p>
      <ul>
        <li><strong>Quando usar</strong>: a que problema a ferramenta responde, e os casos
        em que ela não serve para nada.</li>
        <li><strong>O que você precisa, o que você obtém</strong>: as entradas esperadas,
        o formato delas, e o que sai no fim.</li>
        <li><strong>Passo a passo</strong>: as etapas em ordem, campo por campo.</li>
        <li><strong>Se algo der errado</strong>: as falhas frequentes e o que as
        provoca.</li>
        <li><strong>Como citar</strong>: a referência a citar em um artigo quando a
        ferramenta tem uma, e o link para a página do Atlas.</li>
      </ul>

      <h2 id="commencer">Por onde começar</h2>
      <p>Se você sabe qual ferramenta procura, escolha-a na lista abaixo. Senão, parta do
      que você precisa fazer:</p>
      <ul>
        <li>Comparar dois exames do mesmo paciente ao longo do tempo →
        <a href="#registration">Registro</a></li>
        <li>Isolar estruturas em um CBCT →
        <a href="#segmentation">Segmentação</a></li>
        <li>Posicionar pontos de referência anatômicos, ou reorientar um exame →
        <a href="#landmarks">Landmarks e orientação</a></li>
        <li>Medir, classificar ou prever a partir de uma forma →
        <a href="#analysis">Análise</a></li>
        <li>Recortar ou aplicar uma matriz, em lote →
        <a href="#utilities">Utilitários</a></li>
        <li>Extrair ou anonimizar texto clínico →
        <a href="#text">Texto e linguagem</a></li>
      </ul>
""",
 "ko": """      <h2 id="pour-qui">이 가이드의 대상</h2>
      <p>3D Slicer에서 SlicerAutomatedDentalTools를 열고 사용하려는 모든 분(임상의,
      연구자, 학생)을 위한 가이드입니다. 코드를 읽을 줄 알거나 신경망이 무엇인지 알 필요는
      없습니다. 내부 동작(어떤 모델이 언제, 어떤 데이터로 호출되는지)이 궁금하다면
      <a href="../index.html">아틀라스</a>를 보십시오. 두 섹션은 같은 {n}개 모듈을 서로
      반대쪽에서 다룹니다.</p>

      <h2 id="pourquoi">왜 만들었는가</h2>
      <p>이 확장 기능은 서로 다른 팀이 서로 다른 시기에 작성한 {n}개 모듈을 모아 놓은
      것입니다. 문서는 경우에 따라 README 몇 줄, 프로젝트 페이지 하나, 혹은 아예 없습니다.
      여러 모듈이 논문에 기술된 것과 다르게 동작합니다. 논문이 설명하는 버전을 코드가 더
      이상 실행하지 않기 때문입니다.</p>
      <p>이 가이드는 각 모듈의 문서가 아니라 코드를 읽고 작성했습니다. 따라서 클릭했을 때
      도구가 실제로 무엇을 하는지, 불편한 부분까지 그대로 적었습니다.
      <strong>경고 {warn}건과 버그 {bug}건</strong>을 실제로 부딪히기 쉬운 바로 그 지점에
      표시해 두었습니다. 여기서 고친 것은 없습니다: 그 때문에 하루를 허비하지 않게 하는 것이
      목적입니다.</p>

      <h2 id="plan">각 페이지의 구성</h2>
      <p>모든 페이지가 같은 구성을 따르므로 전부 다시 읽지 않고도 찾을 곳을 알 수 있습니다.</p>
      <ul>
        <li><strong>언제 쓰는가</strong>: 도구가 해결하는 문제와, 쓸모가 없는
        경우.</li>
        <li><strong>필요한 것, 얻는 것</strong>: 필요한 입력과 그 형식, 그리고 최종
        결과물.</li>
        <li><strong>사용 절차</strong>: 순서대로, 항목 하나하나.</li>
        <li><strong>문제가 생기면</strong>: 자주 일어나는 실패와 그 원인.</li>
        <li><strong>인용 방법</strong>: 도구에 논문이 있는 경우 인용할 참고문헌과
        아틀라스 페이지로 가는 링크.</li>
      </ul>

      <h2 id="commencer">어디서 시작할까</h2>
      <p>찾는 도구를 이미 알고 있다면 아래 목록에서 고르십시오. 그렇지 않다면 하려는 일에서
      출발하십시오.</p>
      <ul>
        <li>같은 환자의 두 검사를 시간에 따라 비교 →
        <a href="#registration">정합</a></li>
        <li>CBCT에서 구조물 분리 →
        <a href="#segmentation">분할</a></li>
        <li>해부학적 랜드마크 배치, 또는 스캔 방향 바로잡기 →
        <a href="#landmarks">랜드마크 &amp; 방향 정렬</a></li>
        <li>형상으로부터 측정·분류·예측 →
        <a href="#analysis">분석</a></li>
        <li>일괄 크롭 또는 행렬 적용 →
        <a href="#utilities">유틸리티</a></li>
        <li>임상 텍스트 추출 또는 익명화 →
        <a href="#text">텍스트 &amp; 언어</a></li>
      </ul>
""",
 "es": """      <h2 id="pour-qui">A quién se dirige esta guía</h2>
      <p>A cualquiera que abra SlicerAutomatedDentalTools en 3D Slicer y quiera usarlo:
      clínicos, investigadores, estudiantes. No supone saber leer código ni saber qué es
      una red neuronal. Si lo que interesa es el funcionamiento interno, qué modelo se
      llama, cuándo, sobre qué datos, lo que se busca es el <a href="../index.html">Atlas</a>:
      las dos secciones cubren los mismos {n} módulos, cada una desde el extremo opuesto.</p>

      <h2 id="pourquoi">Por qué existe</h2>
      <p>La extensión reúne {n} módulos escritos por equipos distintos en épocas
      distintas. Su documentación se reduce, según el caso, a unas pocas líneas de
      README, a una página de proyecto o a nada. Varios se comportan de forma distinta a
      lo que describe su publicación: el artículo documenta una versión que el código ya no
      ejecuta.</p>
      <p>Esta guía se escribió leyendo el código de cada módulo, no su documentación. Dice
      por tanto lo que la herramienta hace realmente cuando se hace clic, incluso cuando eso
      incomoda: <strong>{warn} advertencias y {bug} errores</strong> se señalan en el punto
      exacto en que es probable toparse con ellos. Aquí no se corrige nada: el objetivo es
      que no pierda un día por ello.</p>

      <h2 id="plan">Qué contiene cada página</h2>
      <p>Todas siguen el mismo plan, para saber dónde mirar sin releerlo todo:</p>
      <ul>
        <li><strong>Cuándo usarla</strong>: qué problema resuelve la herramienta y los casos
        en que no sirve de nada.</li>
        <li><strong>Qué necesita, qué obtiene</strong>: las entradas esperadas, su
        formato y lo que sale al final.</li>
        <li><strong>Paso a paso</strong>: los pasos en orden, campo por campo.</li>
        <li><strong>Cuando algo sale mal</strong>: los fallos frecuentes y sus
        causas.</li>
        <li><strong>Cómo citar</strong>: la referencia que se debe citar en un artículo
        cuando la herramienta tiene una, y el enlace a la página del Atlas.</li>
      </ul>

      <h2 id="commencer">Por dónde empezar</h2>
      <p>Si ya sabe qué herramienta busca, elíjala en la lista de abajo. Si no, parta de lo
      que necesita hacer:</p>
      <ul>
        <li>Comparar dos exploraciones del mismo paciente a lo largo del tiempo →
        <a href="#registration">Registro</a></li>
        <li>Aislar estructuras en un CBCT →
        <a href="#segmentation">Segmentación</a></li>
        <li>Colocar landmarks anatómicos, o devolver un escaneo a su posición vertical →
        <a href="#landmarks">Landmarks y orientación</a></li>
        <li>Medir, clasificar o predecir a partir de una forma →
        <a href="#analysis">Análisis</a></li>
        <li>Recortar o aplicar una matriz, por lotes →
        <a href="#utilities">Utilidades</a></li>
        <li>Extraer o anonimizar texto clínico →
        <a href="#text">Texto y lenguaje</a></li>
      </ul>
""",
 "it": """      <h2 id="pour-qui">A chi è rivolta questa guida</h2>
      <p>A chiunque apra SlicerAutomatedDentalTools in 3D Slicer e voglia usarlo:
      clinici, ricercatori, studenti. Non presuppone di saper leggere il codice né di sapere
      che cos'è una rete neurale. Se ti interessa il funzionamento interno, quale modello
      viene chiamato, quando, su quali dati, ti serve invece l'<a href="../index.html">Atlante</a>:
      le due sezioni coprono gli stessi {n} moduli, ciascuna dall'estremo opposto.</p>

      <h2 id="pourquoi">Perché esiste</h2>
      <p>L'estensione riunisce {n} moduli scritti da gruppi diversi in momenti diversi.
      La loro documentazione si riduce, a seconda dei casi, a qualche riga di README, a una
      pagina di progetto o a nulla. Parecchi si comportano diversamente da quanto descrive la
      loro pubblicazione: l'articolo documenta una versione che il codice non esegue più.</p>
      <p>Questa guida è stata scritta leggendo il codice di ciascun modulo, non la sua
      documentazione. Dice quindi che cosa lo strumento fa davvero quando si clicca, anche
      quando è scomodo: <strong>{warn} avvertenze e {bug} bug</strong> sono segnalati nel
      punto esatto in cui è probabile inciamparvi. Qui non si corregge nulla: lo scopo è che
      tu non perda una giornata per questo.</p>

      <h2 id="plan">Che cosa contiene ogni pagina</h2>
      <p>Seguono tutte lo stesso schema, così sai dove guardare senza rileggere tutto:</p>
      <ul>
        <li><strong>Quando usarlo</strong>: a quale problema risponde lo strumento e i casi
        in cui non serve a nulla.</li>
        <li><strong>Di che cosa hai bisogno, che cosa ottieni</strong>: gli input attesi, il
        loro formato e ciò che esce alla fine.</li>
        <li><strong>Passo dopo passo</strong>: le fasi in ordine, campo per campo.</li>
        <li><strong>Quando qualcosa va storto</strong>: i guasti frequenti e le loro
        cause.</li>
        <li><strong>Come citare</strong>: il riferimento da citare in un articolo, quando lo
        strumento ne ha uno, e il rimando alla pagina dell'Atlante.</li>
      </ul>

      <h2 id="commencer">Da dove cominciare</h2>
      <p>Se sai quale strumento cerchi, prendilo dall'elenco qui sotto. Altrimenti parti da
      ciò che devi fare:</p>
      <ul>
        <li>Confrontare due esami dello stesso paziente nel tempo →
        <a href="#registration">Registrazione</a></li>
        <li>Isolare strutture in un CBCT →
        <a href="#segmentation">Segmentazione</a></li>
        <li>Posizionare punti di repere anatomici, o rimettere dritta una scansione →
        <a href="#landmarks">Landmark e orientamento</a></li>
        <li>Misurare, classificare o predire a partire da una forma →
        <a href="#analysis">Analisi</a></li>
        <li>Ritagliare o applicare una matrice, in batch →
        <a href="#utilities">Utilità</a></li>
        <li>Estrarre o anonimizzare testo clinico →
        <a href="#text">Testo e linguaggio</a></li>
      </ul>
""",
 "th": """      <h2 id="pour-qui">คู่มือนี้เขียนให้ใคร</h2>
      <p>สำหรับทุกคนที่เปิด SlicerAutomatedDentalTools ใน 3D Slicer แล้วต้องการใช้งาน
      ไม่ว่าจะเป็นทันตแพทย์ นักวิจัย หรือนักศึกษา ไม่จำเป็นต้องอ่านโค้ดเป็น หรือรู้ว่าโครงข่ายประสาทเทียมคืออะไร
      หากสิ่งที่สนใจคือการทำงานภายใน (โมเดลใดถูกเรียก เมื่อใด กับข้อมูลใด) ให้ดูที่
      <a href="../index.html">แอตลาส</a> แทน ทั้งสองส่วนครอบคลุม {n} โมดูลเดียวกัน
      แต่มองจากคนละด้าน</p>

      <h2 id="pourquoi">ทำไมจึงมีคู่มือนี้</h2>
      <p>ส่วนขยายนี้รวม {n} โมดูลที่เขียนโดยทีมต่าง ๆ ในช่วงเวลาต่างกัน เอกสารของแต่ละโมดูล
      มีตั้งแต่ README ไม่กี่บรรทัด หน้าโครงการหนึ่งหน้า ไปจนถึงไม่มีเลย หลายโมดูลทำงานต่างจาก
      ที่บทความตีพิมพ์อธิบายไว้ เพราะบทความบรรยายเวอร์ชันที่โค้ดไม่ได้รันแล้ว</p>
      <p>คู่มือนี้เขียนจากการอ่านโค้ดของแต่ละโมดูล ไม่ใช่จากเอกสาร จึงบอกสิ่งที่เครื่องมือทำจริง
      เมื่อคุณคลิก รวมถึงเรื่องที่ไม่สะดวกด้วย: <strong>คำเตือน {warn} รายการและบั๊ก {bug} รายการ</strong>
      ถูกระบุไว้ตรงจุดที่คุณมีโอกาสเจอ ที่นี่ไม่ได้แก้ไขอะไร, เป้าหมายคือไม่ให้คุณเสียเวลาทั้งวัน
      กับเรื่องเหล่านี้</p>

      <h2 id="plan">ในแต่ละหน้ามีอะไรบ้าง</h2>
      <p>ทุกหน้าใช้โครงสร้างเดียวกัน เพื่อให้รู้ว่าต้องดูตรงไหนโดยไม่ต้องอ่านใหม่ทั้งหมด</p>
      <ul>
        <li><strong>ใช้เมื่อใด</strong>: เครื่องมือแก้ปัญหาอะไร และกรณีที่ใช้ไม่ได้ผล</li>
        <li><strong>สิ่งที่ต้องใช้ สิ่งที่จะได้</strong>: อินพุตที่ต้องการ รูปแบบไฟล์
        และผลลัพธ์ที่ได้ในตอนท้าย</li>
        <li><strong>ขั้นตอน</strong>: ขั้นตอนตามลำดับ ทีละช่อง</li>
        <li><strong>หากเกิดปัญหา</strong>: ความล้มเหลวที่พบบ่อยและสาเหตุ</li>
        <li><strong>วิธีอ้างอิง</strong>: เอกสารอ้างอิงที่ต้องใช้ในบทความเมื่อเครื่องมือมี
        และลิงก์ไปยังหน้าแอตลาส</li>
      </ul>

      <h2 id="commencer">เริ่มจากตรงไหน</h2>
      <p>หากรู้แล้วว่าต้องการเครื่องมือใด เลือกได้จากรายการด้านล่าง หากยังไม่รู้
      ให้เริ่มจากสิ่งที่ต้องทำ:</p>
      <ul>
        <li>เปรียบเทียบการตรวจสองครั้งของผู้ป่วยคนเดียวกันตามเวลา →
        <a href="#registration">การลงทะเบียนภาพ</a></li>
        <li>แยกโครงสร้างออกจาก CBCT →
        <a href="#segmentation">การแบ่งส่วน</a></li>
        <li>วางจุดสังเกตทางกายวิภาค หรือจัดภาพสแกนให้ตั้งตรง →
        <a href="#landmarks">จุดสังเกตและการจัดแนว</a></li>
        <li>วัด จำแนก หรือทำนายจากรูปทรง →
        <a href="#analysis">การวิเคราะห์</a></li>
        <li>ครอปหรือใช้เมทริกซ์แบบกลุ่ม →
        <a href="#utilities">เครื่องมือเสริม</a></li>
        <li>ดึงข้อมูลหรือลบข้อมูลระบุตัวตนจากข้อความทางคลินิก →
        <a href="#text">ข้อความและภาษา</a></li>
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
    if lang == "en":
        # VISOR : anglais seulement pour l'instant (les autres langues n'ont pas la page).
        cards.append('      <h2 id="visor">VISOR: run the tools on a server</h2>')
        cards.append('      <p>The tool pages below describe the legacy Slicer modules, and each ends with a '
                     '<em>With VISOR</em> section. This page covers the new way of running them.</p>')
        cards.append('      <div class="card-grid">')
        cards.append('        <a class="card" href="visor.html"><span class="card-name">Using VISOR</span>'
                     '<span class="card-desc">Connect Slicer to a VISOR server, run a tool, review and download the results</span></a>')
        cards.append("      </div>")
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
<title>{nav.esc(title)} · SADT Atlas</title>
<link rel="stylesheet" href="../../assets/style.css">
<script src="../../assets/site.js"></script>
</head>
<body class="guide">
<div class="layout">
{nav.sidebar(lang, "guide", "home", 2, "guide/index.html")}
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
        raise SystemExit(f"THEME inconnu : {name!r}, attendus {nav.THEMES} ou None")
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
    print(f"thème : {name or 'aucun (feuille de base seule)'}, {n} pages mises à jour")


def theme_from_argv():
    """--theme <nom> | --theme none, surcharge nav.THEME le temps d'un run."""
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
        raise SystemExit(f"thème inconnu : {v!r}, disponibles : {', '.join(nav.THEMES)}, none")
    return v


if __name__ == "__main__":
    write_landing()
    for _l in nav.LANGS:
        if os.path.isdir(os.path.join(ROOT, _l)):
            write_guide_index(_l)
    sync_nav()
    check_papers()
    sync_papers()
    sync_videos()
    for _l in nav.LANGS:
        if os.path.isdir(os.path.join(ROOT, _l)):
            _idx, _c = build_lang(_l)
            write_constats(_l, _c)
    sync_theme(theme_from_argv())   # en dernier : les pages générées viennent d'être réécrites
