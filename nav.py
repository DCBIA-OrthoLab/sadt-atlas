#!/usr/bin/env python3
"""Définition unique de la navigation de SADT Atlas.

La sidebar est identique sur une centaine de pages : la tenir à la main
garantit qu'elle divergera. build.py la réécrit dans chaque page à partir
d'ici. Ne jamais éditer une sidebar dans un .html, elle sera écrasée.
"""

# L'anglais est la langue source : les autres arbres en sont des traductions,
# mises à jour par lots. `python3 i18n.py stale` dit lesquelles sont en retard.
LANGS = ("en", "fr", "pt", "ko", "th")

# nom affiché dans le sélecteur de langue, dans sa propre langue
LANG_NAMES = {"en": "English", "fr": "Français", "pt": "Português", "ko": "한국어", "th": "ไทย"}

# ─────────────────────────────────────────────────────────────
#  THÈME — la seule variable à changer pour tester un style.
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
THEME = None

THEMES = ("ardoise", "papier", "clinique", "labo", "carnet", "signal")



# clé de catégorie -> libellé par langue
CATS = {
    "registration": {"fr": "Recalage",               "en": "Registration",
                     "pt": "Registro",               "ko": "정합",
                     "th": "การลงทะเบียนภาพ"},
    "segmentation": {"fr": "Segmentation",           "en": "Segmentation",
                     "pt": "Segmentação",            "ko": "분할",
                     "th": "การแบ่งส่วน"},
    "landmarks":    {"fr": "Landmarks & orientation","en": "Landmarks & orientation",
                     "pt": "Landmarks e orientação", "ko": "랜드마크 & 방향 정렬",
                     "th": "จุดสังเกตและการจัดแนว"},
    "analysis":     {"fr": "Analyse",                "en": "Analysis",
                     "pt": "Análise",                "ko": "분석",
                     "th": "การวิเคราะห์"},
    "utilities":    {"fr": "Utilitaires",            "en": "Utilities",
                     "pt": "Utilitários",            "ko": "유틸리티",
                     "th": "เครื่องมือเสริม"},
    "text":         {"fr": "Texte & langage",        "en": "Text & language",
                     "pt": "Texto e linguagem",      "ko": "텍스트 & 언어",
                     "th": "ข้อความและภาษา"},
}

# (dossier, catégorie) — l'ordre fait l'ordre d'affichage
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

# ordre de lecture conseillé (pour précédent/suivant)
READING = ["FlexReg", "ALI", "AMASSS", "ASO", "AREG_IOS", "AREG_CBCT", "AREG_IOSCBCT",
           "GreedyReg", "MRI2CBCT", "BatchDentalSeg", "VFACE", "DOCShapeAXI", "CLIC",
           "SurgMovPred", "AutoCrop3D", "AutoMatrix", "CNE", "MedX",
           "MedicalDataAnonymizer", "Agent"]

UI = {
    "fr": {
        "tagline":   "SlicerAutomatedDentalTools, outil par outil",
        "guide":     "Guide",
        "atlas":     "Atlas",
        "guide_hint":"pour utiliser les outils",
        "atlas_hint":"comment ça marche dans le code",
        "cross":     "Transverse",
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
        "atlas_hint":"how it works in the code",
        "cross":     "Cross-cutting",
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
        "findings":  "ข้อค้นพบ",
        "glossary":  "อภิธานศัพท์",
        "home":      "หน้าแรก",
        "search":    "ค้นหา…  /",
        "onpage":    "ในหน้านี้",
        "toindex":   "← ทุกหน้า",
    },
}

# noms de fichiers dépendants de la langue
FILES = {
    "fr": {"findings": "constats.html", "glossary": "glossaire.html"},
    "en": {"findings": "findings.html", "glossary": "glossary.html"},
    "pt": {"findings": "findings.html", "glossary": "glossary.html"},
    "ko": {"findings": "findings.html", "glossary": "glossary.html"},
    "th": {"findings": "findings.html", "glossary": "glossary.html"},
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

    def href(tool):
        return f"{up}guide/{tool}.html" if section == "guide" else f"{up}{tool}/{tool}.html"

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
        bits.append(f'<a href="{"../" * depth}{other}/{target}" hreflang="{other}" '
                    f'title="{esc(LANG_NAMES[other])}">{other.upper()}</a>')
    out.append("      " + "".join(bits))
    out.append('    </div>')

    # bascule Guide / Atlas — sur une page d'outil, on reste sur le même outil
    on_tool = current in {t for t, _ in TOOLS}
    sw = (("guide", f"{up}guide/{current}.html" if on_tool else f"{up}guide/index.html"),
          ("atlas", f"{up}{current}/{current}.html" if on_tool else f"{up}index.html"))
    out.append('    <div class="sec-switch">')
    for key, path in sw:
        on = ' aria-current="true"' if key == section else ""
        out.append(f'      <a href="{path}"{on}><b>{esc(ui[key])}</b>'
                   f'<small>{esc(ui[key + "_hint"])}</small></a>')
    out.append('    </div>')

    for cat, labels in CATS.items():
        tools = [t for t, c in TOOLS if c == cat]
        if not tools:
            continue
        out.append(f'    <div class="nav-group"><h4>{esc(labels[lang])}</h4><ul>')
        for t in tools:
            cur = ' aria-current="page"' if t == current else ""
            out.append(f'      <li><a href="{href(t)}"{cur}>{t}</a></li>')
        out.append("    </ul></div>")

    out.append(f'    <div class="nav-group"><h4>{esc(ui["cross"])}</h4><ul>')
    for key in ("findings", "glossary"):
        cur = ' aria-current="page"' if key == current else ""
        out.append(f'      <li><a href="{up}{fl[key]}"{cur}>{esc(ui[key])}</a></li>')
    out.append("    </ul></div>")
    out.append("  </nav>")
    return "\n".join(out)


# Description d'une ligne par outil. Sert aux cartes de l'accueil et à l'index
# des guides, dans les deux langues. « atlas » décrit le mécanisme, « guide »
# décrit l'usage — ce sont deux publics.
BLURBS = {
 "FlexReg": {
   "atlas_fr": "recalage d'IOS avec patch construit à la main",
   "atlas_en": "IOS registration with a hand-drawn patch",
   "guide_fr": "Recaler deux empreintes en choisissant soi-même la zone stable",
   "guide_en": "Register two intraoral scans by picking the stable area yourself",
   "atlas_pt": "registro de IOS com patch desenhado à mão",
   "guide_pt": "Registrar dois escaneamentos intraorais escolhendo você mesmo a área estável",
   "atlas_ko": "손으로 그린 패치를 이용한 IOS 정합",
   "guide_ko": "안정 영역을 직접 골라 두 구강 스캔을 정합합니다",
   "atlas_th": "ลงทะเบียนภาพ IOS ด้วยแพตช์ที่วาดเอง",
   "guide_th": "ลงทะเบียนภาพสแกนในช่องปากสองชุด โดยเลือกบริเวณที่คงที่เอง"},
 "AREG_IOS": {
   "atlas_fr": "recalage d'IOS avec patch prédit — version automatique de FlexReg",
   "atlas_en": "IOS registration with a predicted patch — the automatic FlexReg",
   "guide_fr": "Recaler deux empreintes du même patient, sans rien dessiner",
   "guide_en": "Register two scans of the same patient, with nothing to draw",
   "atlas_pt": "registro de IOS com patch predito — o FlexReg automático",
   "guide_pt": "Registrar dois escaneamentos do mesmo paciente, sem desenhar nada",
   "atlas_ko": "예측된 패치를 이용한 IOS 정합 — FlexReg의 자동판",
   "guide_ko": "아무것도 그리지 않고 같은 환자의 두 스캔을 정합합니다",
   "atlas_th": "ลงทะเบียนภาพ IOS ด้วยแพตช์ที่ทำนาย — FlexReg แบบอัตโนมัติ",
   "guide_th": "ลงทะเบียนภาพสแกนสองชุดของผู้ป่วยคนเดียวกัน โดยไม่ต้องวาดอะไร"},
 "AREG_CBCT": {
   "atlas_fr": "recalage de CBCT T1/T2",
   "atlas_en": "T1/T2 CBCT registration",
   "guide_fr": "Superposer deux CBCT du même patient pris à deux dates",
   "guide_en": "Superimpose two CBCT scans of the same patient taken at two dates",
   "atlas_pt": "registro de CBCT T1/T2",
   "guide_pt": "Sobrepor dois CBCT do mesmo paciente feitos em duas datas",
   "atlas_ko": "T1/T2 CBCT 정합",
   "guide_ko": "같은 환자를 두 시점에 찍은 CBCT 두 개를 중첩합니다",
   "atlas_th": "ลงทะเบียนภาพ CBCT T1/T2",
   "guide_th": "ซ้อนภาพ CBCT สองชุดของผู้ป่วยคนเดียวกันที่ถ่ายต่างเวลา"},
 "AREG_IOSCBCT": {
   "atlas_fr": "recalage multimodal IOS ↔ CBCT",
   "atlas_en": "multimodal IOS ↔ CBCT registration",
   "guide_fr": "Poser une empreinte optique dans le repère d'un CBCT",
   "guide_en": "Place an intraoral scan into the frame of a CBCT",
   "atlas_pt": "registro multimodal IOS ↔ CBCT",
   "guide_pt": "Posicionar um escaneamento intraoral no referencial de um CBCT",
   "atlas_ko": "IOS ↔ CBCT 다중 모달 정합",
   "guide_ko": "구강 스캔을 CBCT 좌표계에 맞춰 놓습니다",
   "atlas_th": "ลงทะเบียนภาพข้ามรูปแบบ IOS ↔ CBCT",
   "guide_th": "วางภาพสแกนในช่องปากลงในระบบพิกัดของ CBCT"},
 "GreedyReg": {
   "atlas_fr": "recalage CBCT façon ITK-SNAP, moteur Greedy",
   "atlas_en": "ITK-SNAP-style CBCT registration, Greedy engine",
   "guide_fr": "Recaler deux CBCT avec le moteur d'ITK-SNAP",
   "guide_en": "Register two CBCT scans using the ITK-SNAP engine",
   "atlas_pt": "registro de CBCT ao estilo ITK-SNAP, motor Greedy",
   "guide_pt": "Registrar dois CBCT com o motor do ITK-SNAP",
   "atlas_ko": "ITK-SNAP 방식 CBCT 정합, Greedy 엔진",
   "guide_ko": "ITK-SNAP 엔진으로 CBCT 두 개를 정합합니다",
   "atlas_th": "ลงทะเบียนภาพ CBCT แบบ ITK-SNAP ด้วยเอนจิน Greedy",
   "guide_th": "ลงทะเบียนภาพ CBCT สองชุดด้วยเอนจินของ ITK-SNAP"},
 "MRI2CBCT": {
   "atlas_fr": "recalage multimodal IRM ↔ CBCT",
   "atlas_en": "multimodal MRI ↔ CBCT registration",
   "guide_fr": "Aligner une IRM et un CBCT de l'articulation temporo-mandibulaire",
   "guide_en": "Align an MRI and a CBCT of the temporomandibular joint",
   "atlas_pt": "registro multimodal RM ↔ CBCT",
   "guide_pt": "Alinhar uma RM e um CBCT da articulação temporomandibular",
   "atlas_ko": "MRI ↔ CBCT 다중 모달 정합",
   "guide_ko": "측두하악관절의 MRI와 CBCT를 정렬합니다",
   "atlas_th": "ลงทะเบียนภาพข้ามรูปแบบ MRI ↔ CBCT",
   "guide_th": "จัดแนว MRI และ CBCT ของข้อต่อขากรรไกร"},
 "AMASSS": {
   "atlas_fr": "segmentation des structures cranio-faciales sur CBCT",
   "atlas_en": "craniofacial structure segmentation on CBCT",
   "guide_fr": "Segmenter mandibule, maxillaire et autres structures d'un CBCT",
   "guide_en": "Segment mandible, maxilla and other structures from a CBCT",
   "atlas_pt": "segmentação de estruturas craniofaciais em CBCT",
   "guide_pt": "Segmentar mandíbula, maxila e outras estruturas de um CBCT",
   "atlas_ko": "CBCT 두개안면 구조물 분할",
   "guide_ko": "CBCT에서 하악골, 상악골 등 구조물을 분할합니다",
   "atlas_th": "แบ่งส่วนโครงสร้างกะโหลกและใบหน้าบน CBCT",
   "guide_th": "แบ่งส่วนขากรรไกรล่าง ขากรรไกรบน และโครงสร้างอื่นจาก CBCT"},
 "BatchDentalSeg": {
   "atlas_fr": "DentalSegmentator et variantes, en lot",
   "atlas_en": "DentalSegmentator and variants, in batch",
   "guide_fr": "Segmenter dents et os sur une série de scans, en une fois",
   "guide_en": "Segment teeth and bone across a series of scans in one run",
   "atlas_pt": "DentalSegmentator e variantes, em lote",
   "guide_pt": "Segmentar dentes e osso em uma série de exames, de uma vez",
   "atlas_ko": "DentalSegmentator 및 변형 모델, 일괄 처리",
   "guide_ko": "여러 스캔의 치아와 뼈를 한 번에 분할합니다",
   "atlas_th": "DentalSegmentator และรุ่นย่อย แบบกลุ่ม",
   "guide_th": "แบ่งส่วนฟันและกระดูกจากภาพสแกนหลายชุดในครั้งเดียว"},
 "ALI": {
   "atlas_fr": "placement automatique de landmarks, CBCT et IOS",
   "atlas_en": "automatic landmark placement, CBCT and IOS",
   "guide_fr": "Poser automatiquement des points de repère anatomiques",
   "guide_en": "Place anatomical landmarks automatically",
   "atlas_pt": "posicionamento automático de landmarks, CBCT e IOS",
   "guide_pt": "Posicionar pontos de referência anatômicos automaticamente",
   "atlas_ko": "랜드마크 자동 배치, CBCT와 IOS",
   "guide_ko": "해부학적 랜드마크를 자동으로 배치합니다",
   "atlas_th": "วาง landmark อัตโนมัติ ทั้ง CBCT และ IOS",
   "guide_th": "วางจุดสังเกตทางกายวิภาคโดยอัตโนมัติ"},
 "ASO": {
   "atlas_fr": "orientation automatique des scans, CBCT et IOS",
   "atlas_en": "automatic scan orientation, CBCT and IOS",
   "guide_fr": "Remettre des scans dans une orientation commune",
   "guide_en": "Bring scans into a shared orientation",
   "atlas_pt": "orientação automática dos exames, CBCT e IOS",
   "guide_pt": "Colocar exames em uma orientação comum",
   "atlas_ko": "스캔 방향 자동 정렬, CBCT와 IOS",
   "guide_ko": "여러 스캔을 공통 방향으로 맞춥니다",
   "atlas_th": "จัดแนวภาพสแกนอัตโนมัติ ทั้ง CBCT และ IOS",
   "guide_th": "จัดภาพสแกนให้อยู่ในแนวเดียวกัน"},
 "VFACE": {
   "atlas_fr": "classification de l'asymétrie faciale",
   "atlas_en": "facial asymmetry classification",
   "guide_fr": "Mesurer et classer l'asymétrie faciale d'un patient",
   "guide_en": "Measure and classify a patient's facial asymmetry",
   "atlas_pt": "classificação da assimetria facial",
   "guide_pt": "Medir e classificar a assimetria facial de um paciente",
   "atlas_ko": "안면 비대칭 분류",
   "guide_ko": "환자의 안면 비대칭을 측정하고 분류합니다",
   "atlas_th": "จำแนกความไม่สมมาตรของใบหน้า",
   "guide_th": "วัดและจำแนกความไม่สมมาตรของใบหน้าผู้ป่วย"},
 "DOCShapeAXI": {
   "atlas_fr": "classification de formes 3D avec explicabilité",
   "atlas_en": "3D shape classification with explainability",
   "guide_fr": "Classer des formes 3D et voir ce qui a motivé la décision",
   "guide_en": "Classify 3D shapes and see what drove the decision",
   "atlas_pt": "classificação de formas 3D com explicabilidade",
   "guide_pt": "Classificar formas 3D e ver o que motivou a decisão",
   "atlas_ko": "설명 가능한 3D 형상 분류",
   "guide_ko": "3D 형상을 분류하고 판단 근거를 확인합니다",
   "atlas_th": "จำแนกรูปทรง 3 มิติพร้อมคำอธิบายผล",
   "guide_th": "จำแนกรูปทรง 3 มิติ และดูว่าอะไรเป็นเหตุผลของการตัดสิน"},
 "CLIC": {
   "atlas_fr": "classification et localisation des canines incluses",
   "atlas_en": "impacted canine classification and localisation",
   "guide_fr": "Repérer et classer les canines incluses sur un CBCT",
   "guide_en": "Find and classify impacted canines on a CBCT",
   "atlas_pt": "classificação e localização de caninos impactados",
   "guide_pt": "Localizar e classificar caninos impactados em um CBCT",
   "atlas_ko": "매복 견치 분류 및 위치 파악",
   "guide_ko": "CBCT에서 매복 견치를 찾아 분류합니다",
   "atlas_th": "จำแนกและระบุตำแหน่งฟันเขี้ยวคุด",
   "guide_th": "ค้นหาและจำแนกฟันเขี้ยวคุดบน CBCT"},
 "SurgMovPred": {
   "atlas_fr": "prédiction de mouvement chirurgical",
   "atlas_en": "surgical movement prediction",
   "guide_fr": "Estimer le déplacement osseux attendu après chirurgie",
   "guide_en": "Estimate the expected bone movement after surgery",
   "atlas_pt": "predição de movimento cirúrgico",
   "guide_pt": "Estimar o deslocamento ósseo esperado após a cirurgia",
   "atlas_ko": "수술 이동량 예측",
   "guide_ko": "수술 후 예상되는 뼈 이동량을 추정합니다",
   "atlas_th": "ทำนายการเคลื่อนที่จากการผ่าตัด",
   "guide_th": "ประเมินการเคลื่อนที่ของกระดูกที่คาดว่าจะเกิดหลังผ่าตัด"},
 "AutoCrop3D": {
   "atlas_fr": "recadrage de volumes en lot, sans rééchantillonnage",
   "atlas_en": "batch volume cropping, without resampling",
   "guide_fr": "Recadrer une série de volumes sur une même région",
   "guide_en": "Crop a series of volumes to the same region",
   "atlas_pt": "recorte de volumes em lote, sem reamostragem",
   "guide_pt": "Recortar uma série de volumes na mesma região",
   "atlas_ko": "리샘플링 없는 볼륨 일괄 크롭",
   "guide_ko": "여러 볼륨을 같은 영역으로 크롭합니다",
   "atlas_th": "ครอปวอลุ่มแบบกลุ่ม โดยไม่ resample",
   "guide_th": "ครอปวอลุ่มหลายชุดให้เป็นบริเวณเดียวกัน"},
 "AutoMatrix": {
   "atlas_fr": "application de transformations en lot",
   "atlas_en": "batch transform application",
   "guide_fr": "Appliquer des matrices de recalage à toute une série",
   "guide_en": "Apply registration matrices across a whole series",
   "atlas_pt": "aplicação de transformações em lote",
   "guide_pt": "Aplicar matrizes de registro a uma série inteira",
   "atlas_ko": "변환 행렬 일괄 적용",
   "guide_ko": "정합 행렬을 전체 시리즈에 적용합니다",
   "atlas_th": "ใช้การแปลงแบบกลุ่ม",
   "guide_th": "ใช้เมทริกซ์การลงทะเบียนภาพกับทั้งชุดข้อมูล"},
 "CNE": {
   "atlas_fr": "extraction depuis des notes cliniques, llama.cpp et GGUF locaux",
   "atlas_en": "extraction from clinical notes, local llama.cpp and GGUF",
   "guide_fr": "Extraire des informations structurées de notes cliniques",
   "guide_en": "Pull structured information out of clinical notes",
   "atlas_pt": "extração de notas clínicas, llama.cpp e GGUF locais",
   "guide_pt": "Extrair informações estruturadas de notas clínicas",
   "atlas_ko": "임상 노트 정보 추출, 로컬 llama.cpp와 GGUF",
   "guide_ko": "임상 노트에서 구조화된 정보를 뽑아냅니다",
   "atlas_th": "ดึงข้อมูลจากบันทึกทางคลินิก ด้วย llama.cpp และ GGUF ในเครื่อง",
   "guide_th": "ดึงข้อมูลที่มีโครงสร้างออกจากบันทึกทางคลินิก"},
 "MedX": {
   "atlas_fr": "résumé de comptes rendus (BART fine-tuné) et tableau de bord",
   "atlas_en": "report summarisation (fine-tuned BART) and dashboard",
   "guide_fr": "Résumer des comptes rendus et en tirer un tableau de bord",
   "guide_en": "Summarise clinical reports and build a dashboard from them",
   "atlas_pt": "resumo de laudos (BART ajustado) e painel",
   "guide_pt": "Resumir laudos clínicos e montar um painel a partir deles",
   "atlas_ko": "보고서 요약(미세조정 BART)과 대시보드",
   "guide_ko": "임상 보고서를 요약하고 대시보드를 만듭니다",
   "atlas_th": "สรุปรายงาน (BART ที่ปรับแต่งแล้ว) และแดชบอร์ด",
   "guide_th": "สรุปรายงานทางคลินิกและสร้างแดชบอร์ดจากรายงานเหล่านั้น"},
 "MedicalDataAnonymizer": {
   "atlas_fr": "dé-identification de documents texte — pas un anonymiseur DICOM",
   "atlas_en": "text document de-identification — not a DICOM anonymiser",
   "guide_fr": "Retirer les données personnelles d'un document texte",
   "guide_en": "Strip personal data from a text document",
   "atlas_pt": "desidentificação de documentos de texto — não é um anonimizador DICOM",
   "guide_pt": "Remover dados pessoais de um documento de texto",
   "atlas_ko": "텍스트 문서 비식별화 — DICOM 익명화 도구가 아님",
   "guide_ko": "텍스트 문서에서 개인정보를 제거합니다",
   "atlas_th": "ลบข้อมูลระบุตัวตนจากเอกสารข้อความ — ไม่ใช่เครื่องมือลบข้อมูล DICOM",
   "guide_th": "ลบข้อมูลส่วนบุคคลออกจากเอกสารข้อความ"},
 "Agent": {
   "atlas_fr": "lancement des autres modules depuis du langage naturel",
   "atlas_en": "launching the other modules from natural language",
   "guide_fr": "Demander en français ou en anglais quel outil lancer",
   "guide_en": "Ask in plain language which tool to run",
   "atlas_pt": "acionamento dos outros módulos a partir de linguagem natural",
   "guide_pt": "Perguntar em linguagem comum qual ferramenta usar",
   "atlas_ko": "자연어로 다른 모듈 실행",
   "guide_ko": "어떤 도구를 실행할지 일상 언어로 물어봅니다",
   "atlas_th": "เรียกใช้โมดูลอื่นจากภาษาธรรมชาติ",
   "guide_th": "ถามเป็นภาษาธรรมดาว่าควรใช้เครื่องมือใด"},
}
