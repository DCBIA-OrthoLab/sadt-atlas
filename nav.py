#!/usr/bin/env python3
"""Définition unique de la navigation de SADT Atlas.

La sidebar est identique sur une centaine de pages : la tenir à la main
garantit qu'elle divergera. build.py la réécrit dans chaque page à partir
d'ici. Ne jamais éditer une sidebar dans un .html, elle sera écrasée.
"""

LANGS = ("fr", "en")

# clé de catégorie -> libellé par langue
CATS = {
    "registration": {"fr": "Recalage",               "en": "Registration"},
    "segmentation": {"fr": "Segmentation",           "en": "Segmentation"},
    "landmarks":    {"fr": "Landmarks & orientation","en": "Landmarks & orientation"},
    "analysis":     {"fr": "Analyse",                "en": "Analysis"},
    "utilities":    {"fr": "Utilitaires",            "en": "Utilities"},
    "text":         {"fr": "Texte & langage",        "en": "Text & language"},
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
        "lang_other":"English",
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
        "lang_other":"Français",
    },
}

# noms de fichiers dépendants de la langue
FILES = {
    "fr": {"findings": "constats.html", "glossary": "glossaire.html"},
    "en": {"findings": "findings.html", "glossary": "glossary.html"},
}


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def sidebar(lang, section, current=None, depth=1):
    """section : 'guide' | 'atlas'. current : nom d'outil, ou 'findings'/'glossary'/'home'.
    depth : 1 pour fr/x.html, 2 pour fr/ALI/x.html ou fr/guide/x.html."""
    up = "../" * (depth - 1)          # vers la racine de la langue
    ui, fl = UI[lang], FILES[lang]
    other = "en" if lang == "fr" else "fr"
    to_other = "../" * depth + other + "/index.html"

    def href(tool):
        return f"{up}guide/{tool}.html" if section == "guide" else f"{up}{tool}/{tool}.html"

    out = ['<nav class="sidebar">']
    out.append(f'    <a class="brand" href="{up}index.html">SADT Atlas'
               f'<small>{esc(ui["tagline"])}</small></a>')
    out.append('    <div class="lang-switch">')
    out.append(f'      <span class="cur">{lang.upper()}</span>'
               f'<a href="{to_other}" title="{esc(ui["lang_other"])}">{other.upper()}</a>')
    out.append('    </div>')

    # bascule Guide / Atlas
    out.append('    <div class="sec-switch">')
    for key, path in (("guide", f"{up}guide/index.html"), ("atlas", f"{up}index.html")):
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
   "guide_en": "Register two intraoral scans by picking the stable area yourself"},
 "AREG_IOS": {
   "atlas_fr": "recalage d'IOS avec patch prédit — version automatique de FlexReg",
   "atlas_en": "IOS registration with a predicted patch — the automatic FlexReg",
   "guide_fr": "Recaler deux empreintes du même patient, sans rien dessiner",
   "guide_en": "Register two scans of the same patient, with nothing to draw"},
 "AREG_CBCT": {
   "atlas_fr": "recalage de CBCT T1/T2",
   "atlas_en": "T1/T2 CBCT registration",
   "guide_fr": "Superposer deux CBCT du même patient pris à deux dates",
   "guide_en": "Superimpose two CBCT scans of the same patient taken at two dates"},
 "AREG_IOSCBCT": {
   "atlas_fr": "recalage multimodal IOS ↔ CBCT",
   "atlas_en": "multimodal IOS ↔ CBCT registration",
   "guide_fr": "Poser une empreinte optique dans le repère d'un CBCT",
   "guide_en": "Place an intraoral scan into the frame of a CBCT"},
 "GreedyReg": {
   "atlas_fr": "recalage CBCT façon ITK-SNAP, moteur Greedy",
   "atlas_en": "ITK-SNAP-style CBCT registration, Greedy engine",
   "guide_fr": "Recaler deux CBCT avec le moteur d'ITK-SNAP",
   "guide_en": "Register two CBCT scans using the ITK-SNAP engine"},
 "MRI2CBCT": {
   "atlas_fr": "recalage multimodal IRM ↔ CBCT",
   "atlas_en": "multimodal MRI ↔ CBCT registration",
   "guide_fr": "Aligner une IRM et un CBCT de l'articulation temporo-mandibulaire",
   "guide_en": "Align an MRI and a CBCT of the temporomandibular joint"},
 "AMASSS": {
   "atlas_fr": "segmentation des structures cranio-faciales sur CBCT",
   "atlas_en": "craniofacial structure segmentation on CBCT",
   "guide_fr": "Segmenter mandibule, maxillaire et autres structures d'un CBCT",
   "guide_en": "Segment mandible, maxilla and other structures from a CBCT"},
 "BatchDentalSeg": {
   "atlas_fr": "DentalSegmentator et variantes, en lot",
   "atlas_en": "DentalSegmentator and variants, in batch",
   "guide_fr": "Segmenter dents et os sur une série de scans, en une fois",
   "guide_en": "Segment teeth and bone across a series of scans in one run"},
 "ALI": {
   "atlas_fr": "placement automatique de landmarks, CBCT et IOS",
   "atlas_en": "automatic landmark placement, CBCT and IOS",
   "guide_fr": "Poser automatiquement des points de repère anatomiques",
   "guide_en": "Place anatomical landmarks automatically"},
 "ASO": {
   "atlas_fr": "orientation automatique des scans, CBCT et IOS",
   "atlas_en": "automatic scan orientation, CBCT and IOS",
   "guide_fr": "Remettre des scans dans une orientation commune",
   "guide_en": "Bring scans into a shared orientation"},
 "VFACE": {
   "atlas_fr": "classification de l'asymétrie faciale",
   "atlas_en": "facial asymmetry classification",
   "guide_fr": "Mesurer et classer l'asymétrie faciale d'un patient",
   "guide_en": "Measure and classify a patient's facial asymmetry"},
 "DOCShapeAXI": {
   "atlas_fr": "classification de formes 3D avec explicabilité",
   "atlas_en": "3D shape classification with explainability",
   "guide_fr": "Classer des formes 3D et voir ce qui a motivé la décision",
   "guide_en": "Classify 3D shapes and see what drove the decision"},
 "CLIC": {
   "atlas_fr": "classification et localisation des canines incluses",
   "atlas_en": "impacted canine classification and localisation",
   "guide_fr": "Repérer et classer les canines incluses sur un CBCT",
   "guide_en": "Find and classify impacted canines on a CBCT"},
 "SurgMovPred": {
   "atlas_fr": "prédiction de mouvement chirurgical",
   "atlas_en": "surgical movement prediction",
   "guide_fr": "Estimer le déplacement osseux attendu après chirurgie",
   "guide_en": "Estimate the expected bone movement after surgery"},
 "AutoCrop3D": {
   "atlas_fr": "recadrage de volumes en lot, sans rééchantillonnage",
   "atlas_en": "batch volume cropping, without resampling",
   "guide_fr": "Recadrer une série de volumes sur une même région",
   "guide_en": "Crop a series of volumes to the same region"},
 "AutoMatrix": {
   "atlas_fr": "application de transformations en lot",
   "atlas_en": "batch transform application",
   "guide_fr": "Appliquer des matrices de recalage à toute une série",
   "guide_en": "Apply registration matrices across a whole series"},
 "CNE": {
   "atlas_fr": "extraction depuis des notes cliniques, llama.cpp et GGUF locaux",
   "atlas_en": "extraction from clinical notes, local llama.cpp and GGUF",
   "guide_fr": "Extraire des informations structurées de notes cliniques",
   "guide_en": "Pull structured information out of clinical notes"},
 "MedX": {
   "atlas_fr": "résumé de comptes rendus (BART fine-tuné) et tableau de bord",
   "atlas_en": "report summarisation (fine-tuned BART) and dashboard",
   "guide_fr": "Résumer des comptes rendus et en tirer un tableau de bord",
   "guide_en": "Summarise clinical reports and build a dashboard from them"},
 "MedicalDataAnonymizer": {
   "atlas_fr": "dé-identification de documents texte — pas un anonymiseur DICOM",
   "atlas_en": "text document de-identification — not a DICOM anonymiser",
   "guide_fr": "Retirer les données personnelles d'un document texte",
   "guide_en": "Strip personal data from a text document"},
 "Agent": {
   "atlas_fr": "lancement des autres modules depuis du langage naturel",
   "atlas_en": "launching the other modules from natural language",
   "guide_fr": "Demander en français ou en anglais quel outil lancer",
   "guide_en": "Ask in plain language which tool to run"},
}
