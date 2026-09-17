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
python3 -m http.server 8080
# puis http://127.0.0.1:8080
```

`index.html` s'ouvre aussi directement en `file://`, la recherche comprise.

## Ce qu'il y a dedans

| | |
|---|---|
| [`index.html`](index.html) | l'accueil : ordre de lecture, les 20 outils, la matrice des appels |
| `<Outil>/<Outil>.html` | la fiche pipeline, longue et détaillée |
| `<Outil>/SOURCES.html` | la bibliographie de l'outil, avec les DOI |
| [`constats.html`](constats.html) | les 250 encarts des fiches agrégés et filtrables |
| [`glossaire.html`](glossaire.html) | 47 termes définis tels qu'employés ici |
| `assets/` | une feuille de style, un script, l'index de recherche |
| `build.py` | régénère index de recherche, constats et glossaire |
| `*.md` | les sources markdown d'origine, conservées à côté des pages |

Après avoir modifié une fiche :

```bash
python3 build.py
```

`search-index.js`, `constats.html` et `glossaire.html` sont versionnés à dessein — un
clone doit fonctionner sans rien exécuter.

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

Deux chantiers identifiés, pas encore commencés.

### 1. Version anglaise

Tout est en français aujourd'hui. Une version anglaise est prévue — c'est la langue du
dépôt documenté et de son public.

À trancher avant de commencer : deux arborescences (`fr/`, `en/`) avec un sélecteur de
langue, ou un seul jeu de pages et une bascule côté client. La première est plus simple
et référençable ; la seconde évite de dupliquer les schémas SVG, qui portent du texte.

### 2. Couche utilisateur

Les fiches actuelles s'adressent à quelqu'un qui va lire ou modifier le code. Les
**utilisateurs** des outils ont besoin d'autre chose : à quoi sert ce module, quelles
données lui donner, comment lire ce qui sort, quels pièges éviter — sans internes.

Deux formes possibles, à trancher :

- **un résumé en tête de chaque fiche**, avant le pipeline. Une seule page par outil,
  pas de contenu à synchroniser, mais la fiche s'alourdit et l'utilisateur doit
  s'arrêter au bon endroit ;
- **des pages séparées**, par exemple `<Outil>/guide.html`, liées depuis la fiche.
  Chaque public a sa page et son ton, au prix de deux documents à tenir à jour par
  outil — et d'un risque de dérive entre les deux.

Un troisième point, plus petit, reste ouvert : les flèches ne sont étiquetées que sur
6 des 55 schémas. Le reste demande de comprendre chaque pipeline, donc se fait fiche
par fiche.
