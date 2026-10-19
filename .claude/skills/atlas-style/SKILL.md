---
name: atlas-style
description: Design system du site sadt-atlas, tokens CSS, conventions de mise en page, contraintes (hors ligne, cinq langues, thèmes interchangeables) et pièges connus. À charger AVANT toute modification de assets/style.css, assets/themes/*.css, ou avant d'écrire le HTML d'une fiche, d'un callout, d'un tableau ou d'un schéma SVG. Se déclenche aussi sur : « rendre le site plus joli », « revoir le CSS », « ajouter un thème », « ajouter un composant », « le tableau déborde », « le schéma est illisible ».
---

# Style de sadt-atlas

Site statique, sans build CSS, sans dépendance. Une seule feuille :
`assets/style.css`, liée en relatif par une centaine de pages. Les surcouches de
`assets/themes/` ne redéfinissent que des tokens et quelques règles de forme.

## Le registre du squelette

La feuille de base suit le langage visuel d'Apple (HIG, plus les patterns web
mesurés sur apple.com). Les quatre règles qui tiennent tout le reste sont
répétées en tête de `assets/style.css` ; en abrégé :

1. **Fond binaire.** Très clair ou presque noir, jamais un gris moyen. En
   sombre, une surface s'élève en s'éclaircissant, pas en portant une ombre.
2. **La profondeur vient de la lumière, pas des cadres.** Un filet d'un pixel,
   ou rien. Aucun liseré de couleur sur le flanc d'un bloc.
3. **Des groupes, pas des boîtes empilées.** Des lignes apparentées partagent
   UN bloc arrondi, séparées par des filets. Jamais une boîte dans une boîte.
4. **Pas d'étiquette en CAPITALES.** Petit + majuscules + interlettrage large,
   c'est la signature du gabarit générique, et c'est ce qui faisait dire du
   site qu'il avait l'air généré. Un titre de section est en casse ordinaire,
   c'est sa taille qui le classe.

La couleur appartient au contenu : `--accent` dit la famille d'outils et ne
sert qu'aux liens et à ce qui porte l'information. Le chrome reste neutre.

Le skill `apple-ui` (installé dans `~/.claude/skills/`) porte le détail :
`references/field-notes/principles.md` et `anti-patterns.md` d'abord, puis
`apple-web/site-patterns.md` pour le gabarit de documentation.

## Les quatre contraintes non négociables

1. **Hors ligne.** Aucun CDN, aucune police distante, aucun `@import` réseau. Le
   site doit s'ouvrir en `file://`. Toute proposition de Google Fonts,
   Tailwind CDN ou Font Awesome est hors sujet ici : les polices sont des piles
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
   langue viennent de `nav.py` : ne les édite jamais dans un `.html`, ils seront
   écrasés au prochain `python3 build.py`.

## Tokens

Tout est déclaré sur `:root` en haut de `assets/style.css`, puis **redéfini trois
fois** : `@media (prefers-color-scheme: dark)` sous
`:root:not([data-theme="light"])`, puis `:root[data-theme="dark"]`. Un token
ajouté doit l'être dans les trois blocs, sinon il disparaît dans un des modes.

Les blocs sombres de la base ont une spécificité de `0,1,1` : un thème qui ne
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
| Rayons | `--radius` (pré, figure, callout), `--radius-group` (un groupe de lignes, une carte), `--radius-sm` (pastille de code, champ, entrée de nav), `--radius-pill` (bouton, puce, filtre) |
| Mouvement | `--ease` (la courbe des feuilles d'iOS) |
| Curseur segmenté | `--thumb`, `--thumb-ink`, `--thumb-shadow` (la case lue de `.sec-switch`) |

**Les quatre rayons se déclarent ensemble.** Un thème qui n'en redéfinit qu'un
laisse les autres à la valeur de la base : un thème carré gardait des groupes
arrondis à 18 px et des pilules entières. Aucun rayon n'est écrit en dur dans
la feuille, justement pour qu'un thème puisse tous les atteindre.

Les ombres sont des tokens comme les autres : un thème sombre doit les
redéfinir (une ombre noire ne se voit pas sur du noir, `labo` y met un halo
coloré), et un thème plat peut les mettre à `none` (`ardoise`).

`--accent` est **réassigné par catégorie** via `body[data-cat="…"]`. Un composant
qui utilise `var(--accent)` prend donc automatiquement la couleur de sa famille
d'outils. C'est le mécanisme central du site : ne le contourne pas en nommant
`--accent-seg` directement dans une règle générique.

Pour teinter, toujours `color-mix(in srgb, var(--accent) N%, transparent)`, pas
une couleur figée, sinon le thème et le mode sombre décrochent.

## Composants existants

Avant d'en inventer un, vérifie qu'il n'existe pas : `.callout` (+ `.warn`,
`.bug`, `.ok`), `.badge` (+ `.predit`, `.calcule`, `.cli`, `.paper`),
`.card` / `.card-grid`, `.io-card` / `.io-grid`, `.steps`, `.deep-link`,
`.video-box`, `figure.diagram`, `figure.shot`, `.table-wrap`,
`#constat-list` / `.constat` / `.constat-kind`, `.chip`, `.pager`, `.gloss`,
`.sec-switch` / `.sec-hint`, `.lang-switch`, `.landing .choices`, `.meta-row`.

Trois d'entre eux ne sont pas ce que leur nom suggère :

- **`.badge` n'est pas une étiquette cadrée** : c'est une pastille de couleur
  (`::after`, remis en tête par `order`) suivie d'un mot. Jamais la couleur
  seule. Les variantes `.cli` et `.neutral` nomment une chose plutôt qu'elles
  ne signalent un état : elles n'ont pas de pastille.
- **`.constat` n'est pas une carte** : c'est une ligne de `#constat-list`, qui
  est le groupe. Trois cent soixante et onze cartes à liseré, c'était la page
  la plus bruyante du site.
- **`.table-wrap` est nu** : ni fond, ni cadre, ni rayon. Le tableau repose
  déjà sur la surface de la page ; un filet appuyé sous la tête et des filets
  légers entre les lignes suffisent.

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
- **Une piste de grille bornée par `--measure` réclame sa largeur maximale**
  quelle que soit la place offerte : `minmax(0, min(100%, var(--measure)))`,
  pas `minmax(0, var(--measure))`.
- **Chrome sans tête plafonne la fenêtre à 500 px CSS.** Une capture demandée
  à 390 px rend en fait 500 px et se fait recadrer : le contenu paraît coupé
  alors qu'il ne déborde pas. Pour un vrai 390, `--force-device-scale-factor=2`
  avec une fenêtre de 780. Et pour forcer le thème de couleurs,
  `--blink-settings=preferredColorScheme=0` (sombre) ou `=1` (clair) : **toute
  autre valeur est ignorée**, la page rend en clair, et on croit à un bug du
  thème.

## Le contrat d'un thème

Un thème est une surcouche de tokens plus quelques règles de forme. Ce qu'il
doit honorer, vérifié sur les six :

- **Les quatre rayons**, ensemble (voir Tokens).
- **Les groupes, pas les anciennes boîtes.** La liste à viser est la même
  partout : `.card, .io-grid, .deep-link, .video-box, .formula, figure.diagram,
  #constat-list, .toc-m, .viewer3d .v3d-parts, .landing .choices`. Un thème
  les remplit (`labo`, `signal`), les pose en relief (`clinique`), les cerne
  (`ardoise`, `carnet`) ou les aplatit sous un filet (`papier`), mais il les
  traite ensemble, sinon la page se lit comme deux grammaires cousues.
- **Un tableau cerné veut une marge intérieure.** `.table-wrap` est nu dans la
  base ; dès qu'un thème lui donne un cadre ou une ombre, il lui faut un
  `padding`, sinon le texte touche le trait.
- **`.main` porte la surface de lecture** (`--bg-elev`). Deux thèmes doivent la
  reprendre : `carnet` la remet à `transparent`, sans quoi elle recouvre le
  quadrillage qui est tout le thème ; `clinique` la met à `--bg` pour que ses
  cartes blanches se détachent.
- **En sombre, `--shadow-sm` est un liseré clair**, pas une ombre : une ombre
  noire ne se voit pas sur du noir. Un thème qui redéfinit ses ombres sombres
  en ombres portées perd l'élévation de ses surfaces.
- **Une couleur écrite dans une règle de composant est hors d'atteinte d'un
  thème.** Le curseur de `.sec-switch` valait `#48484a` en dur dans un bloc
  `@media (prefers-color-scheme: dark)` de la base : spécificité `0,3,1`,
  contre `0,2,1` pour la règle d'un thème, qui perdait donc en sombre. Trois
  thèmes sur six voyaient leur curseur remplacé par ce gris. La règle passe
  par `--thumb` / `--thumb-ink` / `--thumb-shadow`, et un thème les pose dans
  ses blocs de tokens plutôt que d'écrire une règle de plus.
- **Un token posé sur `:root` seul se fait battre en sombre.** Les blocs
  sombres de la base ont une spécificité de `0,1,1`. Tout token qu'un thème
  veut changer va dans **chacun** de ses blocs, pas seulement le premier.
- **Un thème sombre par défaut doit redéfinir TOUTE la palette dans son bloc
  `:root[data-theme="light"]`**, pas seulement `--accent`. `ardoise` n'avait que
  lui : sur une fiche de segmentation le lien tombait à 2,3 contre 1, et un
  callout ouvrait un rectangle brun foncé au milieu d'une page blanche.
- **Un signe accentué se juge en grille, pas à l'unité.** `carnet` donnait aux
  cartes un filet de 3 px en tête : juste pour une carte isolée, intenable sur
  l'index du Guide, qui en aligne douze sous un titre qui porte déjà un trait
  accentué. Avant d'ajouter une marque de couleur à un composant, compte
  combien d'exemplaires la page la plus dense en montre.
- **Se relire dans le mode inverse.** Les quatre thèmes clairs en sombre, les
  deux sombres via la bascule. C'est là que les blocs oubliés se voient.

## Le visualiseur 3D (AMASSS)

`assets/amasss-3d.js` : WebGL2 écrit à la main, sans dépendance. Présent sur
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

Elle est chargée par `<script>` et non par `fetch()`, pour la même raison :
même parti pris que `search-index-*.js`. Source : la prédiction AMASSS sur le
scan de test **publié** (`MG_test_scan`, release AMASSS_CBCT v1.0.1). **Aucune
donnée patient** : la géométrie part dans un dépôt distant, et une surface
crânienne est potentiellement ré-identifiante. `SKIN` est écarté : c'est le
visage. Ne remplace jamais cette source par une sortie de cohorte clinique.

**La simulation d'une passe.** Cocher des structures puis « Run » rejoue ce que
fait le module : un réseau binaire PAR structure, chargé puis appliqué, en
boucle (`AMASSS_CLI.py`, « 1 binary network per structure », « checkpoint
loaded S times »). Le balayage qui révèle chaque pièce est la fenêtre glissante
de nnU-Net rendue visible. Décocher tout ne produit rien, et le dit : c'est le
comportement réel, pas un message d'erreur.

Les libellés de la simulation sont du **texte dans la page**
(`<span class="v3d-i18n" hidden>`), relus par le script. Aucune chaîne
traduisible ne vit dans le JS : sinon `i18n.py` ne la verrait jamais.

Pièges de ce coin-là :

- `MODEL` dans le JS et `centroidOf()` appliquent le **même** redressement
  (x,y,z) → (x, z, −y). S'ils divergent, la caméra vise une pièce et le crâne
  en montre une autre.
- Les couleurs sont `LABEL_COLORS` d'`AMASSS_CLI.py`, pas des couleurs
  décoratives : c'est l'intérêt de les montrer. `UAW` y vaut `(0,0,0)` :
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
390 px de large (tiroir, tableaux qui défilent). Attention aux deux pièges de
Chrome sans tête, plus haut : le plancher de 500 px, et les valeurs de
`preferredColorScheme`.

Pour essayer un thème sans réécrire les trois cent trente pages, poser son
`<link>` dans une copie jetable de la page plutôt que de lancer
`build.py --theme` :

```bash
sed 's|<script src=|<link rel="stylesheet" href="../../assets/themes/labo.css">\n<script src=|' \
  en/AREG_CBCT/AREG_CBCT.html > en/AREG_CBCT/.essai.html
# capture, puis rm en/AREG_CBCT/.essai.html
```

## Les skills de design intégrées

`artifact-design`, `dataviz`, `artifact-diagramming` et `artifact-capabilities`
sont fournies par Claude Code lui-même : elles sont disponibles sans rien
installer. `apple-ui` est installée à part, dans `~/.claude/skills/` : c'est
elle qui porte le registre du squelette décrit en tête. Elles visent les artifacts publiés ; **leurs conseils de polices
distantes et de CDN ne s'appliquent pas ici** (contrainte 1). Ce qui se
transpose : l'échelle typographique, les règles de contraste, et pour `dataviz`
le choix des couleurs catégorielles, la palette d'accents ci-dessus en est
déjà une, accessible dans les deux modes. Charge `dataviz` avant d'ajouter un
graphique, `artifact-diagramming` avant un nouveau schéma SVG.
