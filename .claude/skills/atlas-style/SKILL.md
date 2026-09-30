---
name: atlas-style
description: Design system du site sadt-atlas — tokens CSS, conventions de mise en page, contraintes (hors ligne, cinq langues, thèmes interchangeables) et pièges connus. À charger AVANT toute modification de assets/style.css, assets/themes/*.css, ou avant d'écrire le HTML d'une fiche, d'un callout, d'un tableau ou d'un schéma SVG. Se déclenche aussi sur : « rendre le site plus joli », « revoir le CSS », « ajouter un thème », « ajouter un composant », « le tableau déborde », « le schéma est illisible ».
---

# Style de sadt-atlas

Site statique, sans build CSS, sans dépendance. Une seule feuille :
`assets/style.css`, liée en relatif par une centaine de pages. Les surcouches de
`assets/themes/` ne redéfinissent que des tokens et quelques règles de forme.

## Les quatre contraintes non négociables

1. **Hors ligne.** Aucun CDN, aucune police distante, aucun `@import` réseau. Le
   site doit s'ouvrir en `file://`. Toute proposition de Google Fonts,
   Tailwind CDN ou Font Awesome est hors sujet ici — les polices sont des piles
   système (`--sans`, `--mono`).
2. **Cinq langues** : en, fr, pt, ko, th. Le coréen et le thaï cassent les
   règles de césure latines (voir `:lang(ko)` en fin de feuille). Toute règle
   de `word-break` / `overflow-wrap` doit être vérifiée sur `ko/` et `th/`.
3. **Six thèmes** chargés APRÈS la base. Un thème doit pouvoir tout changer en
   ne touchant que des tokens : ne code jamais une couleur en dur dans une
   règle de composant, passe par une variable.

   | Thème | Registre |
   |---|---|
   | `papier` | éditorial, sérif chaud, filets plutôt que cadres |
   | `clinique` | applicatif, bleuté, cartes ombrées, coins ronds |
   | `ardoise` | technique, sombre, chasse fixe, angles vifs, **plat** (ombres neutralisées) |
   | `labo` | négatoscope : noir froid, accents lumineux, halos colorés par catégorie |
   | `carnet` | papier millimétré tracé en CSS, encre, sérif Charter, vermillon |
   | `signal` | contemporain : grande échelle typo, formes pleines, pilules, beaucoup d'air |

   Un thème s'active par `THEME` dans `nav.py` puis `python3 build.py`, ou le
   temps d'un essai par `python3 build.py --theme <nom>` (`--theme none` revient
   au défaut). Ajouter un thème = créer le `.css`, l'ajouter à `THEMES` dans
   `nav.py`, et le documenter dans le README.
4. **Le HTML est généré.** La sidebar, la barre de page et le sélecteur de
   langue viennent de `nav.py` — ne les édite jamais dans un `.html`, ils seront
   écrasés au prochain `python3 build.py`.

## Tokens

Tout est déclaré sur `:root` en haut de `assets/style.css`, puis **redéfini trois
fois** : `@media (prefers-color-scheme: dark)` sous
`:root:not([data-theme="light"])`, puis `:root[data-theme="dark"]`. Un token
ajouté doit l'être dans les trois blocs, sinon il disparaît dans un des modes.

Les blocs sombres de la base ont une spécificité de `0,1,1` — un thème qui ne
redéfinit ses couleurs que sur `:root` (`0,0,1`) se fera battre en mode sombre.
C'est pourquoi chaque thème **répète la même structure de blocs**, et pourquoi
un thème sombre par défaut (`ardoise`, `labo`) ajoute en plus un bloc
`:root[data-theme="light"]` pour sa variante claire.

| Famille | Tokens |
|---|---|
| Surfaces | `--bg`, `--bg-elev`, `--bg-sunken` |
| Texte | `--text`, `--text-soft`, `--text-faint` |
| Traits | `--border`, `--border-strong` |
| Accents par catégorie | `--accent` (recalage), `--accent-seg`, `--accent-lmk`, `--accent-ana`, `--accent-util`, `--accent-nlp` |
| Sémantique | `--warn-*`, `--bug-*`, `--ok-*`, `--info-*` (chacun `-bg`, `-br`, `-tx`) |
| Mesure | `--measure` (76ch, 68ch dans le Guide), `--sidebar-w`, `--toc-w`, `--mbar-h` |
| Profondeur | `--shadow-sm`, `--shadow-md` |

Les ombres sont des tokens comme les autres : un thème sombre doit les
redéfinir (une ombre noire ne se voit pas sur du noir — `labo` y met un halo
coloré), et un thème plat peut les mettre à `none` (`ardoise`).

`--accent` est **réassigné par catégorie** via `body[data-cat="…"]`. Un composant
qui utilise `var(--accent)` prend donc automatiquement la couleur de sa famille
d'outils. C'est le mécanisme central du site : ne le contourne pas en nommant
`--accent-seg` directement dans une règle générique.

Pour teinter, toujours `color-mix(in srgb, var(--accent) N%, transparent)` — pas
une couleur figée, sinon le thème et le mode sombre décrochent.

## Composants existants

Avant d'en inventer un, vérifie qu'il n'existe pas : `.callout` (+ `.warn`,
`.bug`, `.ok`), `.badge` (+ `.predit`, `.calcule`, `.cli`, `.paper`, `.k-*`),
`.card` / `.card-grid`, `.io-card` / `.io-grid`, `.steps`, `.deep-link`,
`.video-box`, `figure.diagram`, `figure.shot`, `.table-wrap`, `.constat`,
`.chip`, `.pager`, `.gloss`.

## Pièges connus, déjà payés

- **Ne jamais casser un identifiant de code.** `ALI.py:999` coupé en `ALI.py:9`
  + `99` est illisible et non copiable. Les `code` dans un tableau restent
  entiers (`word-break: normal`) et c'est `.table-wrap` qui défile. La règle
  `overflow-wrap: anywhere` ne s'applique qu'au code **en prose**, où la mesure
  est large.
- **Un schéma rétréci n'est pas un schéma.** `figure.diagram` déborde de la
  colonne de texte jusqu'à la largeur de `.main` et impose un `min-width` :
  au-dessous, il défile au lieu de devenir microscopique.
- **`transition` se déclare sur l'état de repos, pas sur `:hover`.** Sinon
  l'animation ne joue qu'à l'entrée et claque à la sortie.
- **`@media (hover: none)`** : tout ce qui n'apparaît qu'au survol (bouton
  copier, ancres) doit avoir un repli tactile, sinon c'est un bouton absent.
- **`.content.wide`** (page des constats) passe la grille à 1320 px. Le texte
  courant doit alors être borné séparément, sinon les lignes font 150 signes.
- Sous 820 px, la sidebar devient un tiroir (`body.nav-open`) et `.page-bar`
  disparaît au profit de `.mbar`. Toute barre fixe ajoutée doit se placer dans
  cet empilement de `z-index` : mbar 70, thème 75, tiroir 65, voile 60,
  recherche 60, page-bar 40, filtres 20.

## Après modification

```bash
python3 build.py     # régénère l'index de recherche et les constats
```

Le CSS seul n'a pas besoin de `build.py`, mais toute édition d'une fiche oui.

Vérifier le rendu réellement, pas de tête :

```bash
google-chrome --headless --disable-gpu --hide-scrollbars \
  --window-size=1440,2000 --screenshot=/tmp/shot.png \
  "file://$PWD/en/AREG_CBCT/AREG_CBCT.html"
```

Trois gabarits à regarder à chaque fois : une fiche Atlas dense (tableaux +
schéma + callouts), la page `findings.html` (grille large), et une fiche en
390 px de large (tiroir, tableaux qui défilent).

## Les skills de design intégrées

`artifact-design`, `dataviz`, `artifact-diagramming` et `artifact-capabilities`
sont fournies par Claude Code lui-même — elles sont disponibles sans rien
installer. Elles visent les artifacts publiés ; **leurs conseils de polices
distantes et de CDN ne s'appliquent pas ici** (contrainte 1). Ce qui se
transpose : l'échelle typographique, les règles de contraste, et pour `dataviz`
le choix des couleurs catégorielles — la palette d'accents ci-dessus en est
déjà une, accessible dans les deux modes. Charge `dataviz` avant d'ajouter un
graphique, `artifact-diagramming` avant un nouveau schéma SVG.
