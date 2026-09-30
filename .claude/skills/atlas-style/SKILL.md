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

## Le visualiseur 3D (AMASSS)

`assets/amasss-3d.js` — WebGL2 écrit à la main, sans dépendance. Présent sur
`en/AMASSS/AMASSS.html` et `en/guide/AMASSS.html`.

**La liste est le contenu, le canvas est un supplément.** Les structures sont
un `<ol class="v3d-parts">` en HTML : traduit par `i18n.py`, indexé par la
recherche, imprimable. Sans WebGL2 le canvas ne s'affiche jamais (`.v3d-stage`
est en `display:none` jusqu'à ce que le script ajoute `.v3d-on`) et la page
reste entière. N'inverse jamais ce rapport en déplaçant du texte dans le JS.

**Pourquoi pas three.js** : son `GLTFLoader` passe par `fetch()`, bloqué en
`file://`. Il faudrait lui passer les buffers à la main de toute façon, et il
resterait 600 Ko de bibliothèque pour une orbite et un picking.

**La géométrie** vient de `assets/amasss-mesh.js`, régénéré à la main :

```bash
/opt/SlicerProd/Slicer-*/bin/PythonSlicer amasss_mesh.py
```

Elle est chargée par `<script>` et non par `fetch()`, pour la même raison —
même parti pris que `search-index-*.js`. Source : la prédiction AMASSS sur le
scan de test **publié** (`MG_test_scan`, release AMASSS_CBCT v1.0.1). **Aucune
donnée patient** : la géométrie part dans un dépôt distant, et une surface
crânienne est potentiellement ré-identifiante. `SKIN` est écarté — c'est le
visage. Ne remplace jamais cette source par une sortie de cohorte clinique.

**La simulation d'une passe.** Cocher des structures puis « Run » rejoue ce que
fait le module : un réseau binaire PAR structure, chargé puis appliqué, en
boucle (`AMASSS_CLI.py` — « 1 binary network per structure », « checkpoint
loaded S times »). Le balayage qui révèle chaque pièce est la fenêtre glissante
de nnU-Net rendue visible. Décocher tout ne produit rien, et le dit : c'est le
comportement réel, pas un message d'erreur.

Les libellés de la simulation sont du **texte dans la page**
(`<span class="v3d-i18n" hidden>`), relus par le script. Aucune chaîne
traduisible ne vit dans le JS — sinon `i18n.py` ne la verrait jamais.

Pièges de ce coin-là :

- `MODEL` dans le JS et `centroidOf()` appliquent le **même** redressement
  (x,y,z) → (x, z, −y). S'ils divergent, la caméra vise une pièce et le crâne
  en montre une autre.
- Les couleurs sont `LABEL_COLORS` d'`AMASSS_CLI.py`, pas des couleurs
  décoratives : c'est l'intérêt de les montrer. `UAW` y vaut `(0,0,0)` —
  affiché en gris-bleu, et la légende le dit.
- Le taux de décimation se calcule **après** le retrait des composantes
  connexes, sinon le budget de triangles annoncé n'est pas celui obtenu.
- `r` et `e` dans le payload sont des **demi-étendues**, pas des dimensions
  pleines. Émettre une dimension et la consommer comme un rayon plaçait la
  caméra deux fois trop loin, et gonflait le cadrage d'ensemble au-delà de 1.
- Les animations se calent sur le **temps écoulé cumulé**, jamais sur le nombre
  d'images ni sur deux horodatages absolus : sinon elles durent deux secondes
  sur une bonne carte et quinze sur un rendu logiciel.
- Le picking ignore le scan d'entrée et toute structure non encore produite :
  on ne clique que ce qui existe.
- On garde toutes les composantes au-dessus d'un seuil, jamais « la plus
  grosse » : les vertèbres cervicales sont plusieurs pièces séparées.

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
