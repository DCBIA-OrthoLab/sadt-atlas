#!/usr/bin/env python3
"""Suivi des traductions de SADT Atlas.

L'anglais (en/) est la langue source. Les autres arbres (fr/, pt/, ko/) en
sont des traductions, mises à jour par lots, pas à chaque modification.

    python3 i18n.py stale              pages anglaises modifiées depuis la
                                       dernière traduction, par langue
    python3 i18n.py stamp pt [page…]   enregistre que ces pages pt/ sont à
                                       jour avec l'anglais actuel (toutes si
                                       aucune page n'est donnée)
    python3 i18n.py check pt [page…]   compare la structure de chaque page
                                       traduite à sa source anglaise

L'empreinte d'une page anglaise ignore ce que build.py réécrit (sidebar,
références, vidéos) : seul le contenu rédigé compte. Les empreintes sont dans
i18n.json, versionné.
"""
import hashlib, json, os, re, sys
from html.parser import HTMLParser

import nav

ROOT = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(ROOT, "i18n.json")
SOURCE = "en"

# Pages générées par build.py : rien à traduire à la main.
GENERATED = {"findings.html", "guide/index.html"}

# Blocs réécrits par build.py, exclus de l'empreinte et de la comparaison.
STRIP = [re.compile(r'<nav class="sidebar">.*?</nav>', re.S),
         re.compile(r'<!-- papers:start -->.*?<!-- papers:end -->', re.S),
         re.compile(r'<!-- video:start -->.*?<!-- video:end -->', re.S),
         re.compile(r'\n\s*<link rel="stylesheet" href="[^"]*assets/themes/[^"]*">')]

# Attributs dont la valeur est du texte à traduire.
TEXT_ATTRS = {"title", "alt", "aria-label", "placeholder", "content"}


def rename(lang, rel):
    """Chemin d'une page source dans l'arbre `lang` (seul fr/ renomme deux pages)."""
    for key, name in nav.FILES[SOURCE].items():
        if rel == name:
            return nav.FILES[lang][key]
    return rel


def pages():
    out = []
    base = os.path.join(ROOT, SOURCE)
    for dp, dirs, fs in os.walk(base):
        for f in fs:
            if f.endswith(".html"):
                rel = os.path.relpath(os.path.join(dp, f), base).replace(os.sep, "/")
                if rel not in GENERATED:
                    out.append(rel)
    return sorted(out)


def stripped(path):
    s = open(path, encoding="utf-8").read()
    for rx in STRIP:
        s = rx.sub("", s)
    return s


def digest(rel):
    return hashlib.sha256(stripped(os.path.join(ROOT, SOURCE, rel)).encode()).hexdigest()[:16]


def load():
    if os.path.exists(STATE):
        return json.load(open(STATE, encoding="utf-8"))
    return {}


def save(state):
    with open(STATE, "w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False, indent=1, sort_keys=True)
        fh.write("\n")


def cmd_stale():
    state = load()
    src = pages()
    total = 0
    for lang in nav.LANGS:
        if lang == SOURCE:
            continue
        done = state.get(lang, {})
        missing = [p for p in src if not os.path.exists(os.path.join(ROOT, lang, rename(lang, p)))]
        stale = [p for p in src if p not in missing and done.get(p) != digest(p)]
        print(f"{lang} : {len(src) - len(stale) - len(missing)}/{len(src)} à jour", end="")
        print(f", {len(stale)} en retard, {len(missing)} absentes" if stale or missing else "")
        for p in stale:
            print(f"   ~ {p}")
        for p in missing:
            print(f"   + {p}")
        total += len(stale) + len(missing)
    return 1 if total else 0


def cmd_stamp(lang, only):
    state = load()
    done = state.setdefault(lang, {})
    n = 0
    for p in only or pages():
        if not os.path.exists(os.path.join(ROOT, lang, rename(lang, p))):
            print(f"  ! {lang}/{p} absente, non enregistrée")
            continue
        done[p] = digest(p)
        n += 1
    save(state)
    print(f"{lang} : {n} pages enregistrées à jour")


class Shape(HTMLParser):
    """Squelette d'une page : balises, attributs non textuels, contenu du code."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.seq, self.code, self.buf, self.depth = [], [], [], 0

    def handle_starttag(self, tag, attrs):
        keep = tuple(sorted((k, v) for k, v in attrs if k not in TEXT_ATTRS and k != "lang"))
        self.seq.append((tag, keep))
        if tag in ("code", "pre"):
            self.depth += 1

    def handle_endtag(self, tag):
        if tag in ("code", "pre") and self.depth:
            self.depth -= 1
            if not self.depth:
                self.code.append("".join(self.buf).strip())
                self.buf = []

    def handle_data(self, d):
        if self.depth:
            self.buf.append(d)


def shape(path, lang=SOURCE):
    s = stripped(path)
    # glossaire.html, constats.html : ramener les liens aux noms anglais
    for key, name in nav.FILES[lang].items():
        s = s.replace(f'href="{name}', f'href="{nav.FILES[SOURCE][key]}')
        s = s.replace(f'/{name}', f'/{nav.FILES[SOURCE][key]}')
    p = Shape()
    p.feed(s)
    return p


def cmd_check(lang, only):
    bad = 0
    for rel in only or pages():
        src = os.path.join(ROOT, SOURCE, rel)
        dst = os.path.join(ROOT, lang, rename(lang, rel))
        if not os.path.exists(dst):
            print(f"  + {lang}/{rel} absente")
            bad += 1
            continue
        a, b = shape(src), shape(dst, lang)
        errs, warns = [], []
        if len(a.seq) != len(b.seq):
            errs.append(f"{len(a.seq)} balises en anglais, {len(b.seq)} ici")
        for i, (x, y) in enumerate(zip(a.seq, b.seq)):
            if x != y:
                errs.append(f"balise n°{i} : attendu {x}, trouvé {y}")
                break
        if a.code != b.code:
            for x, y in zip(a.code, b.code):
                if x != y:
                    # un espace réservé traduit (<nom>) est légitime : à relire, pas bloquant
                    warns.append(f"code différent : {x[:60]!r} → {y[:60]!r}")
                    break
            else:
                errs.append(f"{len(a.code)} blocs de code en anglais, {len(b.code)} ici")
        if f'<html lang="{lang}">' not in open(dst, encoding="utf-8").read():
            errs.append(f'<html lang="{lang}"> manquant')
        if errs:
            bad += 1
            print(f"  ✗ {lang}/{rel}")
            for e in errs + warns:
                print(f"      {e}")
        elif warns:
            print(f"  ~ {lang}/{rel}")
            for w in warns:
                print(f"      {w}")
    n = len(only or pages())
    print(f"{lang} : {n - bad}/{n} pages conformes à la structure anglaise")
    return 1 if bad else 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("stale", "stamp", "check"):
        raise SystemExit(__doc__)
    if a[0] == "stale":
        sys.exit(cmd_stale())
    if len(a) < 2 or a[1] not in nav.LANGS or a[1] == SOURCE:
        raise SystemExit(f"langue attendue parmi {[l for l in nav.LANGS if l != SOURCE]}")
    if a[0] == "stamp":
        cmd_stamp(a[1], a[2:])
    else:
        sys.exit(cmd_check(a[1], a[2:]))
