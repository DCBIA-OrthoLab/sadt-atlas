#!/usr/bin/env python3
"""Définition unique de la navigation de SADT Atlas.

La sidebar est identique sur une centaine de pages : la tenir à la main
garantit qu'elle divergera. build.py la réécrit dans chaque page à partir
d'ici. Ne jamais éditer une sidebar dans un .html, elle sera écrasée.
"""

import os

#: La racine du site, pour verifier qu'une page traduite existe avant de la
#: proposer dans le selecteur de langue.
ROOT = os.path.dirname(os.path.abspath(__file__))

# L'anglais est la langue source : les autres arbres en sont des traductions,
# mises à jour par lots. `python3 i18n.py stale` dit lesquelles sont en retard.
LANGS = ("en", "fr", "pt", "ko", "th", "es", "it")

# nom affiché dans le sélecteur de langue, dans sa propre langue
LANG_NAMES = {"en": "English", "fr": "Français", "pt": "Português", "ko": "한국어", "th": "ไทย", "es": "Español", "it": "Italiano"}

# ─────────────────────────────────────────────────────────────
#  THÈME : la seule variable à changer pour tester un style.
#  None = la feuille de base seule. Sinon le nom d'un fichier de
#  assets/themes/, sans l'extension. Relancer `python3 build.py`
#  après modification : il repose le lien dans toutes les pages.
#
#      THEME = None          look par défaut
#      THEME = "ardoise"     technique, sombre, chasse fixe, angles vifs
#      THEME = "papier"      éditorial, sérif, filets plutôt que cadres
#      THEME = "clinique"    applicatif, bleuté, cartes ombrées, coins ronds
#      THEME = "labo"        négatoscope : fond noir froid, accents lumineux
#      THEME = "carnet"      papier millimétré, encre, sérif, vermillon
#      THEME = "signal"      contemporain : grande typo, formes pleines, aéré
# ─────────────────────────────────────────────────────────────
THEME = "carnet"

THEMES = ("ardoise", "papier", "clinique", "labo", "carnet", "signal")



# clé de catégorie -> libellé par langue
CATS = {
    "registration": {"fr": "Recalage",               "en": "Registration",
                     "pt": "Registro",               "ko": "정합",
                     "th": "การลงทะเบียนภาพ",
                     "es": "Registro",
                     "it": "Registrazione"},
    "segmentation": {"fr": "Segmentation",           "en": "Segmentation",
                     "pt": "Segmentação",            "ko": "분할",
                     "th": "การแบ่งส่วน",
                     "es": "Segmentación",
                     "it": "Segmentazione"},
    "landmarks":    {"fr": "Landmarks & orientation","en": "Landmarks & orientation",
                     "pt": "Landmarks e orientação", "ko": "랜드마크 & 방향 정렬",
                     "th": "จุดสังเกตและการจัดแนว",
                     "es": "Landmarks y orientación",
                     "it": "Landmark e orientamento"},
    "analysis":     {"fr": "Analyse",                "en": "Analysis",
                     "pt": "Análise",                "ko": "분석",
                     "th": "การวิเคราะห์",
                     "es": "Análisis",
                     "it": "Analisi"},
    "utilities":    {"fr": "Utilitaires",            "en": "Utilities",
                     "pt": "Utilitários",            "ko": "유틸리티",
                     "th": "เครื่องมือเสริม",
                     "es": "Utilidades",
                     "it": "Utilità"},
    "text":         {"fr": "Texte & langage",        "en": "Text & language",
                     "pt": "Texto e linguagem",      "ko": "텍스트 & 언어",
                     "th": "ข้อความและภาษา",
                     "es": "Texto y lenguaje",
                     "it": "Testo e linguaggio"},
}

# (dossier, catégorie): l'ordre fait l'ordre d'affichage
TOOLS = [
    ("FlexReg",               "registration"),
    ("AREG_IOS",              "registration"),
    ("AREG_CBCT",             "registration"),
    ("AREG_IOSCBCT",          "registration"),
    ("GreedyReg",             "registration"),
    ("MRI2CBCT",              "registration"),
    ("AMASSS",                "segmentation"),
    ("BatchDentalSeg",        "segmentation"),
    ("ALI",                   "landmarks"),
    ("ASO",                   "landmarks"),
    ("VFACE",                 "analysis"),
    ("DOCShapeAXI",           "analysis"),
    ("CLIC",                  "analysis"),
    ("SurgMovPred",           "analysis"),
    ("AutoCrop3D",            "utilities"),
    ("AutoMatrix",            "utilities"),
    ("CNE",                   "text"),
    ("MedX",                  "text"),
    ("MedicalDataAnonymizer", "text"),
    ("Agent",                 "text"),
]

# Code partagé : ce n'est pas un outil. Aucune interface, aucun pipeline,
# aucun modèle -- seulement du code que les outils importent. Il n'apparaît donc
# que dans l'Atlas, qui s'adresse à qui lit le code, et jamais dans le Guide,
# qui s'adresse à qui utilise les outils. Hors de TOOLS à dessein : l'index des
# guides itère TOOLS et y fabriquerait une carte vers une page inexistante.
SHARED = ["ADTLib"]

# ordre de lecture conseillé (pour précédent/suivant)
READING = ["FlexReg", "ALI", "AMASSS", "ASO", "AREG_IOS", "AREG_CBCT", "AREG_IOSCBCT",
           "GreedyReg", "MRI2CBCT", "BatchDentalSeg", "VFACE", "DOCShapeAXI", "CLIC",
           "SurgMovPred", "AutoCrop3D", "AutoMatrix", "CNE", "MedX",
           "MedicalDataAnonymizer", "Agent"]

# VISOR : la nouvelle generation d'outils (client Slicer + serveur d'inference).
# Anglais seulement pour l'instant : les autres langues n'ont ni ces pages ni ce
# groupe dans la barre laterale (voir `sidebar`), elles seront retraduites plus tard.
# (slug de visor/<slug>.html, libelle)
VISOR_PAGES = [
    ("index",         "Overview"),
    ("architecture",  "Architecture"),
    ("run-lifecycle", "A run, step by step"),
    ("deployment",    "Packaging and deployment"),
    ("security",      "Security and privacy"),
    ("testing",       "Tests and provenance"),
]
# outils sans portage VISOR (leur fiche a une section #visor qui dit ce qui existe)
VISOR_NOT_PORTED = ["MRI2CBCT", "MedX", "MedicalDataAnonymizer"]
# outils ayant des pages VISOR (tous ceux du site, plus Crown_Seg qui n'existe qu'en VISOR)
VISOR_TOOLS = [t for t, _ in TOOLS] + ["Crown_Seg"]
# page du Guide qui explique l'usage de VISOR
VISOR_GUIDE = ("visor", "Using VISOR")

UI = {
    "fr": {
        "tagline":   "SlicerAutomatedDentalTools, outil par outil",
        "guide":     "Guide",
        "atlas":     "Atlas",
        "guide_hint":"pour utiliser les outils",
        "atlas_hint":"comment ça marche dans le code",
        "cross":     "Transverse",
        "shared":    "Code partagé",
        "findings":  "Constats",
        "glossary":  "Glossaire",
        "home":      "Accueil",
        "search":    "Rechercher…  /",
        "onpage":    "Sur cette page",
        "toindex":   "← Toutes les fiches",
    },
    "en": {
        "tagline":   "SlicerAutomatedDentalTools, tool by tool",
        "guide":     "Guide",
        "atlas":     "Atlas",
        "guide_hint":"how to use the tools",
        "atlas_hint":"how it works, step by step",
        "code":      "Code",
        "code_hint": "for developers: files, lines, arguments",
        "cross":     "Cross-cutting",
        "shared":    "Shared code",
        "findings":  "Findings",
        "glossary":  "Glossary",
        "home":      "Home",
        "search":    "Search…  /",
        "onpage":    "On this page",
        "toindex":   "← All pages",
    },
    "pt": {
        "tagline":   "SlicerAutomatedDentalTools, ferramenta por ferramenta",
        "guide":     "Guia",
        "atlas":     "Atlas",
        "guide_hint":"como usar as ferramentas",
        "atlas_hint":"como funciona no código",
        "cross":     "Transversal",
        "shared":    "Código compartilhado",
        "findings":  "Constatações",
        "glossary":  "Glossário",
        "home":      "Início",
        "search":    "Buscar…  /",
        "onpage":    "Nesta página",
        "toindex":   "← Todas as páginas",
    },
    "ko": {
        "tagline":   "SlicerAutomatedDentalTools, 도구별 해설",
        "guide":     "가이드",
        "atlas":     "아틀라스",
        "guide_hint":"도구 사용법",
        "atlas_hint":"코드 속 동작 원리",
        "cross":     "공통 주제",
        "shared":    "공통 코드",
        "findings":  "발견 사항",
        "glossary":  "용어집",
        "home":      "홈",
        "search":    "검색…  /",
        "onpage":    "이 페이지에서",
        "toindex":   "← 전체 페이지",
    },
    "th": {
        "tagline":   "SlicerAutomatedDentalTools ทีละเครื่องมือ",
        "guide":     "คู่มือ",
        "atlas":     "แอตลาส",
        "guide_hint":"วิธีใช้เครื่องมือ",
        "atlas_hint":"การทำงานภายในโค้ด",
        "cross":     "หัวข้อร่วม",
        "shared":    "โค้ดร่วม",
        "findings":  "ข้อค้นพบ",
        "glossary":  "อภิธานศัพท์",
        "home":      "หน้าแรก",
        "search":    "ค้นหา…  /",
        "onpage":    "ในหน้านี้",
        "toindex":   "← ทุกหน้า",
    },
    "es": {
        "tagline":   "SlicerAutomatedDentalTools, herramienta por herramienta",
        "guide":     "Guía",
        "atlas":     "Atlas",
        "guide_hint":"cómo usar las herramientas",
        "atlas_hint":"cómo funciona en el código",
        "cross":     "Transversal",
        "shared":    "Código compartido",
        "findings":  "Hallazgos",
        "glossary":  "Glosario",
        "home":      "Inicio",
        "search":    "Buscar…  /",
        "onpage":    "En esta página",
        "toindex":   "← Todas las páginas",
    },
    "it": {
        "tagline":   "SlicerAutomatedDentalTools, strumento per strumento",
        "guide":     "Guida",
        "atlas":     "Atlante",
        "guide_hint":"come usare gli strumenti",
        "atlas_hint":"come funziona nel codice",
        "cross":     "Trasversale",
        "shared":    "Codice condiviso",
        "findings":  "Riscontri",
        "glossary":  "Glossario",
        "home":      "Home",
        "search":    "Cerca…  /",
        "onpage":    "In questa pagina",
        "toindex":   "← Tutte le pagine",
    },
}

# noms de fichiers dépendants de la langue
FILES = {
    "fr": {"findings": "constats.html", "glossary": "glossaire.html"},
    "en": {"findings": "findings.html", "glossary": "glossary.html"},
    "pt": {"findings": "findings.html", "glossary": "glossary.html"},
    "ko": {"findings": "findings.html", "glossary": "glossary.html"},
    "th": {"findings": "findings.html", "glossary": "glossary.html"},
    "it": {"findings": "findings.html", "glossary": "glossary.html"},
    "es": {"findings": "findings.html", "glossary": "glossary.html"},
}


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def same_page(lang, other, rel):
    """Chemin de la page `rel` (relative à la racine de `lang`) dans l'arbre `other`."""
    for key, name in FILES[lang].items():
        if rel == name:
            return FILES[other][key]
    return rel


def sidebar(lang, section, current=None, depth=1, rel=None):
    """section : 'guide' | 'atlas'. current : nom d'outil, ou 'findings'/'glossary'/'home'.
    depth : 1 pour fr/x.html, 2 pour fr/ALI/x.html ou fr/guide/x.html.
    rel : chemin de la page dans sa langue ; le sélecteur mène à la même page
    dans les autres langues (à l'accueil, faute de le connaître)."""
    up = "../" * (depth - 1)          # vers la racine de la langue
    ui, fl = UI[lang], FILES[lang]
    on_code = section == "code"       # page code d'un outil : on reste dans l'atlas, la bascule en marque la 3e case
    hint_key = section
    if on_code:
        section = "atlas"

    def rel_of(tool):
        return f"guide/{tool}.html" if section == "guide" else f"{tool}/{tool}.html"

    def href(tool):
        return up + rel_of(tool)

    def vhref(tool):
        return up + (f"visor/guide/{tool}.html" if section == "guide" else f"visor/{tool}/{tool}.html")

    def link(tool, cur):
        """L'entree de barre laterale d'un outil, pour CETTE langue.

        Toutes les fiches ne sont pas traduites partout (le thai en a dix de
        moins). Rendre l'entree inerte couperait l'acces a l'outil depuis cet
        arbre ; on renvoie donc vers l'anglais en le disant, plutot que de
        laisser un lien mort ou un cul-de-sac.
        """
        r = rel_of(tool)
        if os.path.exists(os.path.join(ROOT, lang, r)):
            return f'      <li><a href="{up + r}"{cur}>{tool}</a></li>'
        return (f'      <li><a class="untranslated" href="{"../" * depth}en/{r}" '
                f'hreflang="en" title="{tool}: not translated into '
                f'{esc(LANG_NAMES[lang])} yet, this opens the English page"'
                f'{cur}>{tool}</a></li>')

    out = ['<nav class="sidebar">']
    out.append(f'    <a class="brand" href="{up}index.html">SADT Atlas'
               f'<small>{esc(ui["tagline"])}</small></a>')
    out.append('    <div class="lang-switch">')
    bits = []
    for other in LANGS:
        if other == lang:
            bits.append(f'<span class="cur">{other.upper()}</span>')
            continue
        target = same_page(lang, other, rel) if rel else "index.html"
        # Ne proposer une langue que si CETTE page y existe. Le thai, par
        # exemple, n'a pas encore toutes les fiches : un lien ferme vaut mieux
        # qu'un lien mort, et le lecteur voit que la langue existe sans tomber
        # sur une page absente.
        if not os.path.exists(os.path.join(ROOT, other, target)):
            bits.append(f'<span class="none" title="{esc(LANG_NAMES[other])}: '
                        f'not translated yet">{other.upper()}</span>')
            continue
        bits.append(f'<a href="{"../" * depth}{other}/{target}" hreflang="{other}" '
                    f'title="{esc(LANG_NAMES[other])}">{other.upper()}</a>')
    out.append("      " + "".join(bits))
    out.append('    </div>')

    # bascule Guide / Atlas: sur une page d'outil, on reste sur le même outil.
    # Quatre pages par outil : legacy ou VISOR, Guide ou Atlas.
    on_tool = current in {t for t, _ in TOOLS}
    cur_s = str(current)
    on_visor = lang == "en" and (cur_s == VISOR_GUIDE[0] or cur_s.startswith("visor/"))
    vt = cur_s[6:] if on_visor and cur_s.startswith("visor/") and cur_s[6:] in VISOR_TOOLS else None
    T = current if on_tool else vt                     # l'outil de la page, s'il y en a un
    if vt:
        sw = (("guide", f"visor/guide/{vt}.html" if vt in {t for t, _ in TOOLS} else f"guide/{VISOR_GUIDE[0]}.html"),
              ("atlas", f"visor/{vt}/{vt}.html"))
    elif on_visor:
        sw = (("guide", f"guide/{VISOR_GUIDE[0]}.html"), ("atlas", "visor/index.html"))
    else:
        sw = (("guide", f"guide/{current}.html" if on_tool else "guide/index.html"),
              ("atlas", f"{current}/{current}.html" if on_tool else "index.html"))
    # 3e case, « Code », anglais seulement et seulement si la page code de cet outil existe
    if lang == "en" and T:
        code_rel = f"visor/{T}/{T}.code.html" if on_visor else f"{T}/{T}.code.html"
        if os.path.exists(os.path.join(ROOT, lang, code_rel)):
            sw = tuple(sw) + (("code", code_rel),)
    # bascule Legacy / VISOR (anglais seulement) : AU-DESSUS de Guide / Atlas. Elle mene a la
    # page de l'autre generation pour le meme outil et la meme section.
    mode0 = "visor" if on_visor else "legacy"
    if lang == "en":
        tools_all = {t for t, _ in TOOLS}
        if T and T in tools_all:
            lg = f"guide/{T}.html" if section == "guide" else f"{T}/{T}.html"
            vi = f"visor/guide/{T}.html" if section == "guide" else f"visor/{T}/{T}.html"
        elif T:                                          # Crown_Seg : pas de page legacy
            lg = "index.html"
            vi = f"visor/{T}/{T}.html"
        elif section == "guide":
            lg, vi = "guide/index.html", f"guide/{VISOR_GUIDE[0]}.html"
        else:
            lg, vi = "index.html", "visor/index.html"
        cur_attr = ' aria-current="true"'
        on_lg = cur_attr if mode0 == "legacy" else ""
        on_vi = cur_attr if mode0 == "visor" else ""
        out.append('    <div class="sec-switch gen-switch" role="group" aria-label="Generation">')
        out.append(f'      <a href="{up}{lg}" data-gen-to="legacy"{on_lg}>Legacy</a>')
        out.append(f'      <a href="{up}{vi}" data-gen-to="visor"{on_vi}>VISOR</a>')
        out.append('    </div>')
    out.append('    <div class="sec-switch" role="group">')
    for key, r in sw:
        on = ' aria-current="true"' if (key == "code" and on_code) or (key == section and not on_code and key != "code") else ""
        # Même règle que link() : la contrepartie n'existe pas forcément dans
        # cette langue. Y pointer quand même donnait un lien mort: sur les
        # pages thaïes dont le guide manque, c'était le seul lien cassé de la
        # barre. On renvoie vers l'anglais en le disant, comme pour les fiches.
        if os.path.exists(os.path.join(ROOT, lang, r)):
            href_, extra = up + r, ""
        else:
            href_ = "../" * depth + "en/" + r
            extra = (f' class="untranslated" hreflang="en"'
                     f' title="{esc(ui[key])}: not translated into '
                     f'{esc(LANG_NAMES[lang])} yet, this opens the English page"')
        out.append(f'      <a href="{href_}"{extra}{on}>{esc(ui[key])}</a>')
    out.append('    </div>')
    # La phrase d'orientation ne se repete pas dans chaque segment : elle suit
    # le controle, et ne decrit que la section ou l'on est. Deux legendes dans
    # deux cases bordees se lisaient comme deux objets, pas comme un choix.
    out.append(f'    <p class="sec-hint">{esc(ui[hint_key + "_hint"])}</p>')

    if lang == "en":
        out.append(f'    <div class="gen-wrap" data-gen="{mode0}">')
        out.append('    <div class="gen-legacy">')
    for cat, labels in CATS.items():
        tools = [t for t, c in TOOLS if c == cat]
        if not tools:
            continue
        out.append(f'    <div class="nav-group"><h4>{esc(labels[lang])}</h4><ul>')
        for t in tools:
            cur = ' aria-current="page"' if t == current else ""
            out.append(link(t, cur))
        out.append("    </ul></div>")

    if section == "atlas" and SHARED:
        out.append(f'    <div class="nav-group"><h4>{esc(ui["shared"])}</h4><ul>')
        for t in SHARED:
            cur = ' aria-current="page"' if t == current else ""
            out.append(link(t, cur))
        out.append("    </ul></div>")

    if lang == "en":
        out.append("    </div>")   # gen-legacy
        out.append('    <div class="gen-visor">')
        out.append('    <div class="nav-group"><h4>VISOR</h4><ul>')
        if section == "atlas":
            for slug, label in VISOR_PAGES:
                cur = ' aria-current="page"' if current == f"visor/{slug}" else ""
                out.append(f'      <li><a href="{up}visor/{slug}.html"{cur}>{esc(label)}</a></li>')
        else:
            cur = ' aria-current="page"' if current == VISOR_GUIDE[0] else ""
            out.append(f'      <li><a href="{up}guide/{VISOR_GUIDE[0]}.html"{cur}>{esc(VISOR_GUIDE[1])}</a></li>')
            out.append(f'      <li><a href="{up}visor/index.html">Architecture (Atlas)</a></li>')
        out.append("    </ul></div>")
        for cat, labels in CATS.items():
            tools = [t for t, c in TOOLS if c == cat and t not in VISOR_NOT_PORTED]
            if not tools:
                continue
            out.append(f'    <div class="nav-group"><h4>{esc(labels[lang])}</h4><ul>')
            for t in tools:
                cur = ' aria-current="page"' if t == current else ""
                cur = ' aria-current="page"' if t == vt else ""
                out.append(f'      <li><a href="{vhref(t)}"{cur}>{t}</a></li>')
            if cat == "segmentation" and section == "atlas":
                cur = ' aria-current="page"' if vt == "Crown_Seg" else ""
                out.append(f'      <li><a href="{up}visor/Crown_Seg/Crown_Seg.html"{cur}>Crown_Seg</a></li>')
            out.append("    </ul></div>")
        out.append('    <div class="nav-group"><h4>Not ported to VISOR</h4><ul>')
        for t in VISOR_NOT_PORTED:
            cur = ' aria-current="page"' if t == vt else ""
            out.append(f'      <li><a href="{vhref(t)}"{cur}>{t}</a></li>')
        out.append("    </ul></div>")
        out.append("    </div>")   # gen-visor
        out.append("    </div>")   # gen-wrap

    out.append(f'    <div class="nav-group"><h4>{esc(ui["cross"])}</h4><ul>')
    for key in ("findings", "glossary"):
        cur = ' aria-current="page"' if key == current else ""
        out.append(f'      <li><a href="{up}{fl[key]}"{cur}>{esc(ui[key])}</a></li>')
    out.append("    </ul></div>")
    out.append("  </nav>")
    return "\n".join(out)


# Description d'une ligne par outil. Sert aux cartes de l'accueil et à l'index
# des guides, dans les deux langues. « atlas » décrit le mécanisme, « guide »
# décrit l'usage: ce sont deux publics.
BLURBS = {
 "FlexReg": {
   "atlas_fr": "recalage d'IOS avec patch construit à la main",
   "atlas_en": "IOS registration with a hand-drawn patch",
   "guide_fr": "Recaler deux empreintes en choisissant soi-même la zone stable",
   "guide_en": "Register two intraoral scans by picking the stable area yourself",
   "atlas_it": "registrazione di IOS con patch disegnata a mano",
   "guide_it": "Registrare due scansioni intraorali scegliendo personalmente l'area stabile",
   "atlas_pt": "registro de IOS com patch desenhado à mão",
   "guide_pt": "Registrar dois escaneamentos intraorais escolhendo você mesmo a área estável",
   "atlas_ko": "손으로 그린 패치를 이용한 IOS 정합",
   "guide_ko": "안정 영역을 직접 골라 두 구강 스캔을 정합합니다",
   "atlas_es": "registro de IOS con parche dibujado a mano",
   "guide_es": "Registrar dos escaneos intraorales eligiendo uno mismo la zona estable",
   "atlas_th": "ลงทะเบียนภาพ IOS ด้วยแพตช์ที่วาดเอง",
   "guide_th": "ลงทะเบียนภาพสแกนในช่องปากสองชุด โดยเลือกบริเวณที่คงที่เอง"},
 "AREG_IOS": {
   "atlas_fr": "recalage d'IOS avec patch prédit, version automatique de FlexReg",
   "atlas_en": "IOS registration with a predicted patch, the automatic FlexReg",
   "guide_fr": "Recaler deux empreintes du même patient, sans rien dessiner",
   "guide_en": "Register two scans of the same patient, with nothing to draw",
   "atlas_it": "registrazione di IOS con patch predetta, il FlexReg automatico",
   "guide_it": "Registrare due scansioni dello stesso paziente, senza disegnare nulla",
   "atlas_pt": "registro de IOS com patch predito, o FlexReg automático",
   "guide_pt": "Registrar dois escaneamentos do mesmo paciente, sem desenhar nada",
   "atlas_ko": "예측된 패치를 이용한 IOS 정합, FlexReg의 자동판",
   "guide_ko": "아무것도 그리지 않고 같은 환자의 두 스캔을 정합합니다",
   "atlas_es": "registro de IOS con parche predicho, el FlexReg automático",
   "guide_es": "Registrar dos escaneos del mismo paciente, sin dibujar nada",
   "atlas_th": "ลงทะเบียนภาพ IOS ด้วยแพตช์ที่ทำนาย, FlexReg แบบอัตโนมัติ",
   "guide_th": "ลงทะเบียนภาพสแกนสองชุดของผู้ป่วยคนเดียวกัน โดยไม่ต้องวาดอะไร"},
 "AREG_CBCT": {
   "atlas_fr": "recalage de CBCT T1/T2",
   "atlas_en": "T1/T2 CBCT registration",
   "guide_fr": "Superposer deux CBCT du même patient pris à deux dates",
   "guide_en": "Superimpose two CBCT scans of the same patient taken at two dates",
   "atlas_it": "registrazione di CBCT T1/T2",
   "guide_it": "Sovrapporre due CBCT dello stesso paziente eseguiti in due date",
   "atlas_pt": "registro de CBCT T1/T2",
   "guide_pt": "Sobrepor dois CBCT do mesmo paciente feitos em duas datas",
   "atlas_ko": "T1/T2 CBCT 정합",
   "guide_ko": "같은 환자를 두 시점에 찍은 CBCT 두 개를 중첩합니다",
   "atlas_es": "registro de CBCT T1/T2",
   "guide_es": "Superponer dos CBCT del mismo paciente tomados en dos fechas",
   "atlas_th": "ลงทะเบียนภาพ CBCT T1/T2",
   "guide_th": "ซ้อนภาพ CBCT สองชุดของผู้ป่วยคนเดียวกันที่ถ่ายต่างเวลา"},
 "AREG_IOSCBCT": {
   "atlas_fr": "recalage multimodal IOS ↔ CBCT",
   "atlas_en": "multimodal IOS ↔ CBCT registration",
   "guide_fr": "Poser une empreinte optique dans le repère d'un CBCT",
   "guide_en": "Place an intraoral scan into the frame of a CBCT",
   "atlas_it": "registrazione multimodale IOS ↔ CBCT",
   "guide_it": "Collocare una scansione intraorale nel sistema di riferimento di un CBCT",
   "atlas_pt": "registro multimodal IOS ↔ CBCT",
   "guide_pt": "Posicionar um escaneamento intraoral no referencial de um CBCT",
   "atlas_ko": "IOS ↔ CBCT 다중 모달 정합",
   "guide_ko": "구강 스캔을 CBCT 좌표계에 맞춰 놓습니다",
   "atlas_es": "registro multimodal IOS ↔ CBCT",
   "guide_es": "Colocar un escaneo intraoral en el sistema de referencia de un CBCT",
   "atlas_th": "ลงทะเบียนภาพข้ามรูปแบบ IOS ↔ CBCT",
   "guide_th": "วางภาพสแกนในช่องปากลงในระบบพิกัดของ CBCT"},
 "GreedyReg": {
   "atlas_fr": "recalage CBCT façon ITK-SNAP, moteur Greedy",
   "atlas_en": "ITK-SNAP-style CBCT registration, Greedy engine",
   "guide_fr": "Recaler deux CBCT avec le moteur d'ITK-SNAP",
   "guide_en": "Register two CBCT scans using the ITK-SNAP engine",
   "atlas_it": "registrazione di CBCT in stile ITK-SNAP, motore Greedy",
   "guide_it": "Registrare due CBCT con il motore di ITK-SNAP",
   "atlas_pt": "registro de CBCT ao estilo ITK-SNAP, motor Greedy",
   "guide_pt": "Registrar dois CBCT com o motor do ITK-SNAP",
   "atlas_ko": "ITK-SNAP 방식 CBCT 정합, Greedy 엔진",
   "guide_ko": "ITK-SNAP 엔진으로 CBCT 두 개를 정합합니다",
   "atlas_es": "registro de CBCT al estilo ITK-SNAP, motor Greedy",
   "guide_es": "Registrar dos CBCT con el motor de ITK-SNAP",
   "atlas_th": "ลงทะเบียนภาพ CBCT แบบ ITK-SNAP ด้วยเอนจิน Greedy",
   "guide_th": "ลงทะเบียนภาพ CBCT สองชุดด้วยเอนจินของ ITK-SNAP"},
 "MRI2CBCT": {
   "atlas_fr": "recalage IRM ↔ CBCT en un bouton, par surfaces de la base du crâne",
   "atlas_en": "one-button MRI ↔ CBCT registration of cranial-base surfaces",
   "guide_fr": "Aligner une IRM et un CBCT de l'articulation temporo-mandibulaire en un seul run",
   "guide_en": "Align an MRI and a CBCT of the temporomandibular joint in one run",
   "atlas_it": "registrazione RM ↔ CBCT con un solo pulsante delle superfici della base cranica",
   "guide_it": "Allineare una RM e un CBCT dell'articolazione temporomandibolare in un'unica esecuzione",
   "atlas_pt": "registro RM ↔ CBCT com um só botão, por superfícies da base do crânio",
   "guide_pt": "Alinhar uma RM e um CBCT da articulação temporomandibular em uma única execução",
   "atlas_ko": "두개저 표면에 대한 버튼 하나짜리 MRI ↔ CBCT 정합",
   "guide_ko": "측두하악관절의 MRI와 CBCT를 한 번의 실행으로 정렬합니다",
   "atlas_es": "registro MRI ↔ CBCT de superficies de la base del cráneo con un solo botón",
   "guide_es": "Alinear una resonancia magnética y un CBCT de la articulación temporomandibular en una sola ejecución",
   "atlas_th": "ลงทะเบียนพื้นผิวฐานกะโหลก MRI ↔ CBCT ด้วยปุ่มเดียว",
   "guide_th": "จัดแนว MRI และ CBCT ของข้อต่อขากรรไกรในการรันครั้งเดียว"},
 "AMASSS": {
   "atlas_fr": "segmentation des structures cranio-faciales sur CBCT",
   "atlas_en": "craniofacial structure segmentation on CBCT",
   "guide_fr": "Segmenter mandibule, maxillaire et autres structures d'un CBCT",
   "guide_en": "Segment mandible, maxilla and other structures from a CBCT",
   "atlas_it": "segmentazione delle strutture craniofacciali su CBCT",
   "guide_it": "Segmentare mandibola, mascella e altre strutture da un CBCT",
   "atlas_pt": "segmentação de estruturas craniofaciais em CBCT",
   "guide_pt": "Segmentar mandíbula, maxila e outras estruturas de um CBCT",
   "atlas_ko": "CBCT 두개안면 구조물 분할",
   "guide_ko": "CBCT에서 하악골, 상악골 등 구조물을 분할합니다",
   "atlas_es": "segmentación de estructuras craneofaciales en CBCT",
   "guide_es": "Segmentar mandíbula, maxilar y otras estructuras de un CBCT",
   "atlas_th": "แบ่งส่วนโครงสร้างกะโหลกและใบหน้าบน CBCT",
   "guide_th": "แบ่งส่วนขากรรไกรล่าง ขากรรไกรบน และโครงสร้างอื่นจาก CBCT"},
 "BatchDentalSeg": {
   "atlas_fr": "DentalSegmentator et variantes, en lot",
   "atlas_en": "DentalSegmentator and variants, in batch",
   "guide_fr": "Segmenter dents et os sur une série de scans, en une fois",
   "guide_en": "Segment teeth and bone across a series of scans in one run",
   "atlas_it": "DentalSegmentator e varianti, in batch",
   "guide_it": "Segmentare denti e osso su una serie di scansioni in un'unica esecuzione",
   "atlas_pt": "DentalSegmentator e variantes, em lote",
   "guide_pt": "Segmentar dentes e osso em uma série de exames, de uma vez",
   "atlas_ko": "DentalSegmentator 및 변형 모델, 일괄 처리",
   "guide_ko": "여러 스캔의 치아와 뼈를 한 번에 분할합니다",
   "atlas_es": "DentalSegmentator y variantes, por lotes",
   "guide_es": "Segmentar dientes y hueso en una serie de escaneos, en una sola ejecución",
   "atlas_th": "DentalSegmentator และรุ่นย่อย แบบกลุ่ม",
   "guide_th": "แบ่งส่วนฟันและกระดูกจากภาพสแกนหลายชุดในครั้งเดียว"},
 "ALI": {
   "atlas_fr": "placement automatique de landmarks, CBCT et IOS",
   "atlas_en": "automatic landmark placement, CBCT and IOS",
   "guide_fr": "Poser automatiquement des points de repère anatomiques",
   "guide_en": "Place anatomical landmarks automatically",
   "atlas_it": "posizionamento automatico dei landmark, CBCT e IOS",
   "guide_it": "Posizionare automaticamente i punti di repere anatomici",
   "atlas_pt": "posicionamento automático de landmarks, CBCT e IOS",
   "guide_pt": "Posicionar pontos de referência anatômicos automaticamente",
   "atlas_ko": "랜드마크 자동 배치, CBCT와 IOS",
   "guide_ko": "해부학적 랜드마크를 자동으로 배치합니다",
   "atlas_es": "colocación automática de landmarks, CBCT e IOS",
   "guide_es": "Colocar landmarks anatómicos automáticamente",
   "atlas_th": "วาง landmark อัตโนมัติ ทั้ง CBCT และ IOS",
   "guide_th": "วางจุดสังเกตทางกายวิภาคโดยอัตโนมัติ"},
 "ASO": {
   "atlas_fr": "orientation automatique des scans, CBCT et IOS",
   "atlas_en": "automatic scan orientation, CBCT and IOS",
   "guide_fr": "Remettre des scans dans une orientation commune",
   "guide_en": "Bring scans into a shared orientation",
   "atlas_it": "orientamento automatico delle scansioni, CBCT e IOS",
   "guide_it": "Portare le scansioni in un orientamento comune",
   "atlas_pt": "orientação automática dos exames, CBCT e IOS",
   "guide_pt": "Colocar exames em uma orientação comum",
   "atlas_ko": "스캔 방향 자동 정렬, CBCT와 IOS",
   "guide_ko": "여러 스캔을 공통 방향으로 맞춥니다",
   "atlas_es": "orientación automática de escaneos, CBCT e IOS",
   "guide_es": "Llevar los escaneos a una orientación común",
   "atlas_th": "จัดแนวภาพสแกนอัตโนมัติ ทั้ง CBCT และ IOS",
   "guide_th": "จัดภาพสแกนให้อยู่ในแนวเดียวกัน"},
 "VFACE": {
   "atlas_fr": "classification de l'asymétrie faciale",
   "atlas_en": "facial asymmetry classification",
   "guide_fr": "Mesurer et classer l'asymétrie faciale d'un patient",
   "guide_en": "Measure and classify a patient's facial asymmetry",
   "atlas_it": "classificazione dell'asimmetria facciale",
   "guide_it": "Misurare e classificare l'asimmetria facciale di un paziente",
   "atlas_pt": "classificação da assimetria facial",
   "guide_pt": "Medir e classificar a assimetria facial de um paciente",
   "atlas_ko": "안면 비대칭 분류",
   "guide_ko": "환자의 안면 비대칭을 측정하고 분류합니다",
   "atlas_es": "clasificación de la asimetría facial",
   "guide_es": "Medir y clasificar la asimetría facial de un paciente",
   "atlas_th": "จำแนกความไม่สมมาตรของใบหน้า",
   "guide_th": "วัดและจำแนกความไม่สมมาตรของใบหน้าผู้ป่วย"},
 "DOCShapeAXI": {
   "atlas_fr": "classification de formes 3D avec explicabilité",
   "atlas_en": "3D shape classification with explainability",
   "guide_fr": "Classer des formes 3D et voir ce qui a motivé la décision",
   "guide_en": "Classify 3D shapes and see what drove the decision",
   "atlas_it": "classificazione di forme 3D con spiegabilità",
   "guide_it": "Classificare forme 3D e vedere che cosa ha guidato la decisione",
   "atlas_pt": "classificação de formas 3D com explicabilidade",
   "guide_pt": "Classificar formas 3D e ver o que motivou a decisão",
   "atlas_ko": "설명 가능한 3D 형상 분류",
   "guide_ko": "3D 형상을 분류하고 판단 근거를 확인합니다",
   "atlas_es": "clasificación de formas 3D con explicabilidad",
   "guide_es": "Clasificar formas 3D y ver qué motivó la decisión",
   "atlas_th": "จำแนกรูปทรง 3 มิติพร้อมคำอธิบายผล",
   "guide_th": "จำแนกรูปทรง 3 มิติ และดูว่าอะไรเป็นเหตุผลของการตัดสิน"},
 "CLIC": {
   "atlas_fr": "classification et localisation des canines incluses",
   "atlas_en": "impacted canine classification and localisation",
   "guide_fr": "Repérer et classer les canines incluses sur un CBCT",
   "guide_en": "Find and classify impacted canines on a CBCT",
   "atlas_it": "classificazione e localizzazione dei canini inclusi",
   "guide_it": "Trovare e classificare i canini inclusi su un CBCT",
   "atlas_pt": "classificação e localização de caninos impactados",
   "guide_pt": "Localizar e classificar caninos impactados em um CBCT",
   "atlas_ko": "매복 견치 분류 및 위치 파악",
   "guide_ko": "CBCT에서 매복 견치를 찾아 분류합니다",
   "atlas_es": "clasificación y localización de caninos retenidos",
   "guide_es": "Encontrar y clasificar caninos retenidos en un CBCT",
   "atlas_th": "จำแนกและระบุตำแหน่งฟันเขี้ยวคุด",
   "guide_th": "ค้นหาและจำแนกฟันเขี้ยวคุดบน CBCT"},
 "SurgMovPred": {
   "atlas_fr": "prédiction de mouvement chirurgical",
   "atlas_en": "surgical movement prediction",
   "guide_fr": "Estimer le déplacement osseux attendu après chirurgie",
   "guide_en": "Estimate the expected bone movement after surgery",
   "atlas_it": "predizione del movimento chirurgico",
   "guide_it": "Stimare il movimento osseo atteso dopo l'intervento",
   "atlas_pt": "predição de movimento cirúrgico",
   "guide_pt": "Estimar o deslocamento ósseo esperado após a cirurgia",
   "atlas_ko": "수술 이동량 예측",
   "guide_ko": "수술 후 예상되는 뼈 이동량을 추정합니다",
   "atlas_es": "predicción del movimiento quirúrgico",
   "guide_es": "Estimar el movimiento óseo esperado tras la cirugía",
   "atlas_th": "ทำนายการเคลื่อนที่จากการผ่าตัด",
   "guide_th": "ประเมินการเคลื่อนที่ของกระดูกที่คาดว่าจะเกิดหลังผ่าตัด"},
 "AutoCrop3D": {
   "atlas_fr": "recadrage de volumes en lot, sans rééchantillonnage",
   "atlas_en": "batch volume cropping, without resampling",
   "guide_fr": "Recadrer une série de volumes sur une même région",
   "guide_en": "Crop a series of volumes to the same region",
   "atlas_it": "ritaglio di volumi in batch, senza ricampionamento",
   "guide_it": "Ritagliare una serie di volumi sulla stessa regione",
   "atlas_pt": "recorte de volumes em lote, sem reamostragem",
   "guide_pt": "Recortar uma série de volumes na mesma região",
   "atlas_ko": "리샘플링 없는 볼륨 일괄 크롭",
   "guide_ko": "여러 볼륨을 같은 영역으로 크롭합니다",
   "atlas_es": "recorte de volúmenes por lotes, sin remuestreo",
   "guide_es": "Recortar una serie de volúmenes a la misma región",
   "atlas_th": "ครอปวอลุ่มแบบกลุ่ม โดยไม่ resample",
   "guide_th": "ครอปวอลุ่มหลายชุดให้เป็นบริเวณเดียวกัน"},
 "AutoMatrix": {
   "atlas_fr": "application de transformations en lot",
   "atlas_en": "batch transform application",
   "guide_fr": "Appliquer des matrices de recalage à toute une série",
   "guide_en": "Apply registration matrices across a whole series",
   "atlas_it": "applicazione di trasformazioni in batch",
   "guide_it": "Applicare le matrici di registrazione a un'intera serie",
   "atlas_pt": "aplicação de transformações em lote",
   "guide_pt": "Aplicar matrizes de registro a uma série inteira",
   "atlas_ko": "변환 행렬 일괄 적용",
   "guide_ko": "정합 행렬을 전체 시리즈에 적용합니다",
   "atlas_es": "aplicación de transformaciones por lotes",
   "guide_es": "Aplicar matrices de registro a toda una serie",
   "atlas_th": "ใช้การแปลงแบบกลุ่ม",
   "guide_th": "ใช้เมทริกซ์การลงทะเบียนภาพกับทั้งชุดข้อมูล"},
 "CNE": {
   "atlas_fr": "extraction depuis des notes cliniques, llama.cpp et GGUF locaux",
   "atlas_en": "extraction from clinical notes, local llama.cpp and GGUF",
   "guide_fr": "Extraire des informations structurées de notes cliniques",
   "guide_en": "Pull structured information out of clinical notes",
   "atlas_it": "estrazione da note cliniche, llama.cpp locale e GGUF",
   "guide_it": "Estrarre informazioni strutturate dalle note cliniche",
   "atlas_pt": "extração de notas clínicas, llama.cpp e GGUF locais",
   "guide_pt": "Extrair informações estruturadas de notas clínicas",
   "atlas_ko": "임상 노트 정보 추출, 로컬 llama.cpp와 GGUF",
   "guide_ko": "임상 노트에서 구조화된 정보를 뽑아냅니다",
   "atlas_es": "extracción de notas clínicas, llama.cpp local y GGUF",
   "guide_es": "Extraer información estructurada de notas clínicas",
   "atlas_th": "ดึงข้อมูลจากบันทึกทางคลินิก ด้วย llama.cpp และ GGUF ในเครื่อง",
   "guide_th": "ดึงข้อมูลที่มีโครงสร้างออกจากบันทึกทางคลินิก"},
 "MedX": {
   "atlas_fr": "résumé de comptes rendus (BART fine-tuné) et tableau de bord",
   "atlas_en": "report summarisation (fine-tuned BART) and dashboard",
   "guide_fr": "Résumer des comptes rendus et en tirer un tableau de bord",
   "guide_en": "Summarise clinical reports and build a dashboard from them",
   "atlas_it": "riassunto di referti (BART fine-tuned) e dashboard",
   "guide_it": "Riassumere i referti clinici e costruirne una dashboard",
   "atlas_pt": "resumo de laudos (BART ajustado) e painel",
   "guide_pt": "Resumir laudos clínicos e montar um painel a partir deles",
   "atlas_ko": "보고서 요약(미세조정 BART)과 대시보드",
   "guide_ko": "임상 보고서를 요약하고 대시보드를 만듭니다",
   "atlas_es": "resumen de informes (BART ajustado) y panel de control",
   "guide_es": "Resumir informes clínicos y construir un panel de control a partir de ellos",
   "atlas_th": "สรุปรายงาน (BART ที่ปรับแต่งแล้ว) และแดชบอร์ด",
   "guide_th": "สรุปรายงานทางคลินิกและสร้างแดชบอร์ดจากรายงานเหล่านั้น"},
 "MedicalDataAnonymizer": {
   "atlas_fr": "dé-identification de documents texte, pas un anonymiseur DICOM",
   "atlas_en": "text document de-identification, not a DICOM anonymiser",
   "guide_fr": "Retirer les données personnelles d'un document texte",
   "guide_en": "Strip personal data from a text document",
   "atlas_it": "deidentificazione di documenti di testo, non è un anonimizzatore DICOM",
   "guide_it": "Rimuovere i dati personali da un documento di testo",
   "atlas_pt": "desidentificação de documentos de texto, não é um anonimizador DICOM",
   "guide_pt": "Remover dados pessoais de um documento de texto",
   "atlas_ko": "텍스트 문서 비식별화, DICOM 익명화 도구가 아님",
   "guide_ko": "텍스트 문서에서 개인정보를 제거합니다",
   "atlas_es": "desidentificación de documentos de texto, no es un anonimizador de DICOM",
   "guide_es": "Eliminar los datos personales de un documento de texto",
   "atlas_th": "ลบข้อมูลระบุตัวตนจากเอกสารข้อความ, ไม่ใช่เครื่องมือลบข้อมูล DICOM",
   "guide_th": "ลบข้อมูลส่วนบุคคลออกจากเอกสารข้อความ"},
 "Agent": {
   "atlas_fr": "lancement des autres modules depuis du langage naturel",
   "atlas_en": "launching the other modules from natural language",
   "guide_fr": "Demander en français ou en anglais quel outil lancer",
   "guide_en": "Ask in plain language which tool to run",
   "atlas_it": "avvio degli altri moduli a partire dal linguaggio naturale",
   "guide_it": "Chiedere in linguaggio semplice quale strumento eseguire",
   "atlas_pt": "acionamento dos outros módulos a partir de linguagem natural",
   "guide_pt": "Perguntar em linguagem comum qual ferramenta usar",
   "atlas_ko": "자연어로 다른 모듈 실행",
   "guide_ko": "어떤 도구를 실행할지 일상 언어로 물어봅니다",
   "atlas_es": "lanzar los demás módulos con lenguaje natural",
   "guide_es": "Pedir en lenguaje llano qué herramienta ejecutar",
   "atlas_th": "เรียกใช้โมดูลอื่นจากภาษาธรรมชาติ",
   "guide_th": "ถามเป็นภาษาธรรมดาว่าควรใช้เครื่องมือใด"},
}
