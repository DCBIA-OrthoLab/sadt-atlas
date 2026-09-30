#!/usr/bin/env python3
"""Fabrique du MathML pour les formules de l'Atlas.

POURQUOI PAS KaTeX NI MathJax. Le site doit s'ouvrir hors ligne, sans CDN
(README, contrainte 1). Vendoriser KaTeX, ce serait 300 Ko plus ses polices
dans un depot qui n'a aucune dependance. Le MathML est natif dans les
navigateurs actuels : rien a charger, le texte reste selectionnable, il suit
la taille de police du lecteur et il s'imprime.

Ce module n'est pas un convertisseur LaTeX general -- ce serait un projet a
lui seul. C'est un jeu de combinateurs pour les formules qu'on ecrit
vraiment ici. Verifie rendu : hauteur de bloc 50.8 px sur une matrice 2x2.
"""

def _j(parts):
    return "".join(parts)

def i(x):    return "<mi>%s</mi>" % x               # identifiant
def n(x):    return "<mn>%s</mn>" % x               # nombre
def o(x):    return "<mo>%s</mo>" % x               # operateur
def t(x):    return "<mtext>%s</mtext>" % x         # texte
def row(*p): return "<mrow>%s</mrow>" % _j(p)
def sub(a, b):   return "<msub>%s%s</msub>" % (a, b)
def sup(a, b):   return "<msup>%s%s</msup>" % (a, b)
def frac(a, b):  return "<mfrac>%s%s</mfrac>" % (a, b)
def sqrt(a):     return "<msqrt>%s</msqrt>" % a
def over(a, b):  return "<mover>%s%s</mover>" % (a, b)
def paren(*p):
    return row('<mo stretchy="true" fence="true">(</mo>', _j(p),
               '<mo stretchy="true" fence="true">)</mo>')
def bracket(*p):
    return row('<mo stretchy="true" fence="true">[</mo>', _j(p),
               '<mo stretchy="true" fence="true">]</mo>')

def vec(name):
    """Un vecteur : fleche au-dessus, comme dans le code source."""
    return over(i(name), o("&#x2192;"))

def norm(x):
    return row(o("&#x2225;"), x, o("&#x2225;"))

def absv(x):
    """Valeur absolue COMPOSANTE PAR COMPOSANTE -- le point crucial d'ASO."""
    return row(o("|"), x, o("|"))

def matrix(rows, delim="["):
    """Les delimiteurs sont explicitement etirables : sans `stretchy`, le
    navigateur laisse un crochet de taille normale a cote d'une matrice
    3x3."""
    body = _j("<mtr>%s</mtr>" % _j("<mtd>%s</mtd>" % c for c in r) for r in rows)
    close = {"[": "]", "(": ")", "|": "|"}[delim]
    fence = '<mo stretchy="true" fence="true">%s</mo>'
    return row(fence % delim, "<mtable>%s</mtable>" % body, fence % close)

def block(*p, **kw):
    """Une formule en bloc, avec un intitule facultatif au-dessus."""
    label = kw.get("label")
    m = '<math display="block">%s</math>' % row(*p)
    if label:
        return '<figure class="formula"><figcaption>%s</figcaption>%s</figure>' % (label, m)
    return '<div class="formula">%s</div>' % m

def inline(*p):
    return '<math>%s</math>' % row(*p)
