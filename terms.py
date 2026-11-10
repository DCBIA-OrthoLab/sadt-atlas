#!/usr/bin/env python3
"""Registre des termes : lie la premiere occurrence d'un terme, par section.

Lit assets/term-registry.json et enveloppe, dans les pages de son « scope »
(dossiers sous <lang>/), la premiere occurrence de chaque terme de chaque
section <h2> dans <a class="gterm" data-term="...">. La cible est :
  - sur une page atlas : la cible « code » du terme si elle existe, sinon
    l'entree du glossaire (g-<cle>) ;
  - sur une page *.code.html : la cible « atlas » du terme, si elle existe.
Les liens poses ici portent data-term : ils sont retires puis reposes a chaque
passe (idempotent). Les liens ecrits a la main (sans data-term) ne sont jamais
touches, et un terme deja lie a la main dans la section n'est pas relie.
Jamais lie : code, pre, titres, liens, svg, math, script, style, bouton,
elements caches, et tout ce qui est hors de <article class="content">.

  python3 terms.py            applique (appele par build.py)
  python3 terms.py --check    ne reecrit rien, sort 1 si une page changerait
                              ou si une cible du registre est cassee
"""
import os, re, sys, json

ROOT = os.path.dirname(os.path.abspath(__file__))
REG = os.path.join(ROOT, "assets", "term-registry.json")
SKIP = {"a", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "svg", "math",
        "script", "style", "button", "summary", "kbd", "title", "textarea"}
VOID = {"br", "hr", "img", "input", "meta", "link", "source", "wbr", "col", "area"}
TAG = re.compile(r"(<!--.*?-->|<[^>]+>)", re.S)
AUTO = re.compile(r'<a class="gterm" data-term="[^"]*" href="[^"]*" title="[^"]*">(.*?)</a>', re.S)
IDS = {}
GLOSS = set()


def ids_of(path):
    if path not in IDS:
        try:
            s = open(path, encoding="utf8").read()
        except OSError:
            s = None
        IDS[path] = None if s is None else set(re.findall(r'\sid="([^"]+)"', s))
    return IDS[path]


def load():
    reg = json.load(open(REG, encoding="utf8"))
    terms = []
    for key, t in reg["terms"].items():
        flags = re.I if t.get("nocase") else 0
        pat = "(?<![\\w.-])(?:" + "|".join(t["match"]) + ")(?![\\w-])"
        terms.append((key, re.compile(pat, flags), t))
    return reg, terms


def check_targets(reg, langs):
    """Les ids de glossaire et les cibles code/atlas existent-ils ?"""
    bad = []
    for lang in langs:
        gl = ids_of(os.path.join(ROOT, lang, "glossary.html"))
        for key, t in reg["terms"].items():
            if not t.get("code") and not t.get("atlas") and (gl is None or "g-" + key not in gl):
                bad.append("%s: g-%s absent de %s/glossary.html" % (key, key, lang))
            for fld in ("code", "atlas"):
                tgt = t.get(fld)
                if not tgt:
                    continue
                page, _, a = tgt.partition("#")
                ids = ids_of(os.path.join(ROOT, lang, page))
                if ids is None or (a and a not in ids):
                    bad.append("%s: %s %s introuvable dans %s" % (key, fld, tgt, lang))
    return bad


def pages(reg, lang):
    for sc in reg.get("scope", []):
        for dp, dirs, fs in os.walk(os.path.join(ROOT, lang, sc)):
            dirs.sort()
            for f in sorted(fs):
                if f.endswith(".html"):
                    yield os.path.join(dp, f)


def href_for(path, lang, key, t):
    base = os.path.join(ROOT, lang)
    here = os.path.relpath(path, base).replace(os.sep, "/")
    if here.endswith(".code.html"):
        tgt = t.get("atlas")
    else:
        tgt = t.get("code") or "glossary.html#g-" + key
        if not t.get("code") and key not in GLOSS:
            return None
    if not tgt or tgt.partition("#")[0] == here:
        return None
    rel = os.path.relpath(os.path.join(base, tgt.partition("#")[0]), os.path.dirname(path)).replace(os.sep, "/")
    a = tgt.partition("#")[2]
    return rel + ("#" + a if a else "")


def process(src, path, lang, terms):
    src = AUTO.sub(r"\1", src)
    m = re.search(r'<article class="content"[^>]*>', src)
    end = src.rfind("</article>")
    if not m or end < 0:
        return src
    head, body, tail = src[:m.end()], src[m.end():end], src[end:]
    manual = set(re.findall(r'href="[^"]*#(g-[^"]+)"', body))
    parts = TAG.split(body)
    stack, seen, out = [], set(), []
    for i, p in enumerate(parts):
        if i % 2:                                   # une balise
            out.append(p)
            if p.startswith("<!--"):
                continue
            tm = re.match(r"<(/?)([a-zA-Z][\w-]*)", p)
            if not tm:
                continue
            closing, name = tm.group(1) == "/", tm.group(2).lower()
            if name == "h2" and not closing:
                seen = set()
            if name in VOID or p.endswith("/>"):
                continue
            if closing:
                for k in range(len(stack) - 1, -1, -1):
                    if stack[k][0] == name:
                        del stack[k:]
                        break
            else:
                hid = bool(re.search(r"\shidden(\s|=|>|/)", p)) or "v3d-i18n" in p or "breadcrumb" in p
                stack.append((name, name in SKIP or hid))
            continue
        if not p.strip() or any(s[1] for s in stack):
            out.append(p)
            continue
        # texte courant : premiere occurrence de chaque terme encore non vu
        hits = []
        for key, rx, t in terms:
            if key in seen or "g-" + key in manual:
                continue
            mm = rx.search(p)
            if not mm:
                continue
            only = t.get("only")
            if only and os.path.relpath(path, os.path.join(ROOT, lang)).replace(os.sep, "/") not in only:
                continue
            h = href_for(path, lang, key, t)
            if h:
                hits.append((mm.start(), mm.end(), key, h))
        hits.sort()
        last, buf = 0, []
        for s, e, key, h in hits:
            if s < last:                            # chevauchement : au prochain texte
                continue
            seen.add(key)
            buf.append(p[last:s])
            buf.append('<a class="gterm" data-term="%s" href="%s" title="%s">%s</a>' % (
                key, h, "See glossary" if h.split("#")[-1] == "g-" + key else
                ("See the explanation" if path.endswith(".code.html") else "See the code"), p[s:e]))
            last = e
        buf.append(p[last:])
        out.append("".join(buf))
    return head + "".join(out) + tail


def run(check=False):
    reg, terms = load()
    GLOSS.update(k[2:] for k in ids_of(os.path.join(ROOT, "en", "glossary.html")) or [] if k.startswith("g-"))
    bad = check_targets(reg, ["en"])
    for b in bad:
        print("registre :", b)
    n = ch = 0
    for path in pages(reg, "en"):
        src = open(path, encoding="utf8").read()
        new = process(src, path, "en", terms)
        n += 1
        if new != src:
            ch += 1
            if not check:
                open(path, "w", encoding="utf8").write(new)
    print("termes : %d pages, %d %s, %d liens auto" % (
        n, ch, "a changer" if check else "mises a jour",
        sum(open(p, encoding="utf8").read().count('data-term="') for p in pages(reg, "en"))))
    return 1 if bad or (check and ch) else 0


if __name__ == "__main__":
    sys.exit(run("--check" in sys.argv))
