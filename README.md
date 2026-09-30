# SADT Atlas

Comment fonctionne réellement chaque outil de
[SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools),
outil par outil, **lu dans le code** plutôt que dans la documentation.

Une fiche par outil, orientée pipeline : ce qui est calculé, ce qui est prédit par un
réseau, à quel moment le modèle est appelé, quels sont les prétraitements, ce qui sort.

> Ce n'est ni la documentation officielle de l'extension, ni un manuel utilisateur.
> C'est un relevé daté — septembre 2026 — de ce que fait le code à cette date.

## Consulter

Site statique, sans dépendance, sans étape de compilation.

```bash
python3 serve.py
```

Sert le site sur **toutes les interfaces**, filtré par une liste blanche d'adresses
définie dans [`serve.conf`](serve.conf) : la machine elle-même, tout le tailnet
Tailscale, et les hôtes du réseau UNC repris des alias `ssh*` de `~/.bashrc`.

Le fichier est **relu à chaud** : ajoute une adresse, enregistre, et la règle
s'applique à la requête suivante — aucun redémarrage. Une ligne invalide est
signalée dans le journal sans faire tomber la liste. Le contenu du site étant lu
sur disque à chaque requête, une page régénérée par `build.py` est visible
immédiatement.

> Ce filtre est **applicatif, pas un pare-feu** : il répond 403 aux adresses non
> listées, mais le port reste ouvert sur les interfaces. Pour un vrai cloisonnement,
> doubler d'une règle `ufw`/`iptables`.

Pour un usage purement local, `python3 -m http.server 8080` fait toujours l'affaire,
et `index.html` s'ouvre aussi en `file://`, la recherche comprise.

## Ce qu'il y a dedans

Le site a **deux moitiés** et **cinq langues** : anglais, français, portugais
(brésilien), coréen et thaï.

- Le **Guide** s'adresse à qui utilise les outils : à quoi ça sert, quoi fournir,
  quoi vérifier. Aucun détail d'implémentation.
- L'**Atlas** s'adresse à qui lit ou modifie le code : le pipeline complet, ce qui
  est prédit, ce qui est calculé, et ce que la lecture a fait ressortir.

```
index.html              choix de la langue
assets/                 style, script, index de recherche (partagés)
<Outil>/                sources : le .md d'origine, les articles récupérés
en/  fr/  pt/  ko/  th/
├── index.html          accueil de l'Atlas
├── findings.html       constats.html en français
├── glossary.html       glossaire.html en français
├── guide/
│   ├── index.html      accueil du Guide
│   └── <Outil>.html    un guide par outil
└── <Outil>/
    ├── <Outil>.html    la fiche pipeline
    └── SOURCES.html    la bibliographie, avec les DOI
```

Les sources markdown et les articles restent **à la racine** : ils ne sont d'aucune
langue. Seules les pages rendues se dédoublent.

| | |
|---|---|
| [`assets/themes/`](assets/themes/) | surcouches de style interchangeables — voir ci-dessous |
| [`nav.py`](nav.py) | **définition unique de la navigation**, et la variable `THEME`. La sidebar est identique sur une centaine de pages : ne l'édite jamais dans un `.html`, elle sera écrasée |
| [`build.py`](build.py) | réécrit les sidebars, génère l'index de recherche, les constats et les index de guides, par langue |
| [`i18n.py`](i18n.py) | suivi des traductions : quelles pages sont en retard sur l'anglais, et contrôle de structure |
| [`i18n.json`](i18n.json) | empreinte de la version anglaise sur laquelle chaque page traduite est alignée |

Après avoir modifié une fiche :

```bash
python3 build.py
```

Les fichiers générés sont versionnés à dessein — un clone doit fonctionner sans rien
exécuter.

### Changer de style

La feuille de base `assets/style.css` est entièrement tokenisée : couleurs, polices,
rayons, largeurs sont des variables CSS. Un thème est une **surcouche** qui redéfinit
ces variables et quelques règles de forme — il ne duplique rien.

Pour en essayer un, une seule ligne dans `nav.py` :

```python
THEME = None          # feuille de base seule
THEME = "ardoise"     # technique, sombre, chasse fixe, angles vifs
THEME = "papier"      # éditorial, sérif, filets plutôt que cadres
THEME = "clinique"    # applicatif, bleuté, cartes ombrées, coins ronds
THEME = "labo"        # négatoscope : fond noir froid, accents lumineux, halos
THEME = "carnet"      # papier millimétré, encre, sérif, vermillon
THEME = "signal"      # contemporain : grande typo, formes pleines, beaucoup d'air
```

puis `python3 build.py`, qui pose ou retire le lien dans les 141 pages.

Pour comparer sans éditer le fichier, l'option a priorité le temps d'un run :

```bash
python3 build.py --theme papier     # essayer
python3 build.py --theme none       # revenir au défaut
```

Chaque thème gère ses propres variantes claire et sombre.

**La sidebar ne se modifie que dans `nav.py`.** `build.py` la réécrit ensuite dans
chaque page. C'est ce qui évite qu'une centaine de copies divergent.

## Langues

**L'anglais est la langue source.** Les modifications se font dans `en/` seulement ;
`fr/`, `pt/`, `ko/` et `th/` sont des traductions, remises à niveau par lots, pas à chaque
changement. Entre deux lots elles sont en retard, et c'est voulu.

```bash
python3 i18n.py stale            # par langue : pages anglaises modifiées depuis la dernière traduction
python3 i18n.py check pt         # structure identique à l'anglais : balises, ids, liens, code
python3 i18n.py stamp pt         # après traduction : enregistrer que pt/ est à jour
```

L'empreinte ignore ce que `build.py` réécrit (sidebar, références, vidéos) : seul un
changement de contenu rédigé rend une page « en retard ».

Ce qui n'est pas dans les pages se traduit dans le code : libellés de navigation et
résumés d'outils dans `nav.py`, notes bibliographiques dans `papers.py`, textes des
pages générées dans `build.py`, libellés d'interface dans `assets/site.js`.

Ajouter une langue : l'ajouter à `LANGS` et `LANG_NAMES` dans `nav.py`, puis compléter
chaque dictionnaire indexé par langue (`grep -n '"pt"' *.py assets/site.js` les
liste tous), traduire les pages, et `python3 i18n.py stamp <langue>`.

## Conventions des fiches

- **Prédit vs calculé** est l'axe central. Les badges le marquent partout, et les
  schémas encadrent en violet toute étape où un réseau intervient.
- **Les encarts** distinguent le défaut confirmé dans le code (rouge), le piège
  (orange), le fait vérifié (vert) et la note. Ils alimentent `constats.html`.
- **Les divergences code/papier** sont signalées en tête des fiches concernées :
  plusieurs modules ne font pas ce que leur publication décrit.
- **Les schémas** sont du SVG écrit à la main, sans bibliothèque, thémés par classes
  pour rester lisibles en clair comme en sombre.

## Les articles ne sont pas dans le dépôt

Les 29 PDF récupérés pèsent 90 Mo et sont du contenu d'éditeur : ils sont exclus par
`.gitignore` et restent sur disque. Chaque `SOURCES.html` donne le DOI ou le lien
canonique, ce qui suffit à les retrouver. Les `.xml` (JATS) et `.txt` sont, eux, encore
versionnés — même nature de contenu, décision à trancher.

Rien n'a été obtenu en contournant un péage : arXiv, PLOS, PMC/NCBI, HAL, dépôts
institutionnels et versions déposées par les auteurs.

## Feuille de route

Les deux chantiers annoncés sont **en cours**. L'arbitrage est tranché :

- **langues** — une arborescence par langue, plutôt qu'une bascule côté client.
  Les 55 schémas SVG portent du texte : un arbre par langue permet de le traduire
  vraiment, et chaque page garde une URL propre.
- **couche utilisateur** — des pages séparées, regroupées sous `guide/`, plutôt qu'un
  encart en tête de fiche. Les deux publics n'ont ni le même besoin ni le même ton, et
  le renvoi de l'un vers l'autre suffit à les relier.

Restent ouverts :

- **Les flèches des schémas** ne sont étiquetées que sur 6 des 55. Le reste demande de
  comprendre chaque pipeline, donc se fait fiche par fiche.
- **Le nom `AREG` employé seul** n'est lié nulle part : il désigne la famille de
  modules, et il n'existe pas de fiche `AREG`, seulement `AREG_CBCT`, `AREG_IOS` et
  `AREG_IOSCBCT`.
- **Les `.xml` et `.txt`** des articles sont encore versionnés alors que les PDF ne le
  sont plus. Même nature de contenu, 6,5 Mo : décision à prendre.
