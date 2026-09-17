# FlexReg — pipeline complet

Recalage d'Intra Oral Scans patient par patient, avec un patch de recalage
construit à la main au lieu d'être prédit. C'est la déclinaison interactive
d'AREG_IOS.

## 1. Situation dans la chaîne

Rien dans le dépôt n'appelle FlexReg : c'est un outil terminal, piloté par
l'opérateur. Il appelle en revanche deux réseaux pré-entraînés, et il **produit
l'entrée d'AREG_IOS** — les deux outils lisent exactement le même array de points.

| Appelé | Quand | Pourquoi |
|---|---|---|
| `dentalmodelseg` (ShapeAXI / DentalModelSeg) | si le maillage n'a pas d'array `Universal_ID` | segmenter et numéroter les couronnes |
| `ALI_IOS` (poids `Lower_MG_*.pth`) | uniquement en mode arcade inférieure | placer les 13 landmarks mucogingivaux |

Côté aval, [AREG_IOS.py:191](AREG_IOS/AREG_IOS.py#L191) fait
`vtkMeshTeeth(list_teeth=[1], property="Butterfly")` et
[AREG_IOS.py:205](AREG_IOS/AREG_IOS.py#L205) la même chose sur `MGL_ARRAY_NAME` :
un patch fabriqué dans FlexReg est directement consommable par AREG_IOS, et
réciproquement. La différence est l'origine du patch : AREG_IOS le fait prédire
par un réseau ([PredPatch.py](AREG_IOS/AREG_IOS_utils/PredPatch.py), un
`MonaiUNetHRes` multi-vues), FlexReg le construit géométriquement.

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [FlexReg/FlexReg.py](FlexReg/FlexReg.py) | widget Slicer, 4400 lignes : UI, joysticks, aperçus, voie MGL complète | Python de Slicer |
| [FlexReg_CLI/FlexReg_CLI.py](FlexReg_CLI/FlexReg_CLI.py) | le CLI : butterfly, curve, delete, icp, icp_mgl | Python de Slicer via `slicer.cli.run`, **CUDA requis** |
| [FlexReg_Method/](FlexReg_CLI/FlexReg_Method) | orientation, butterfly, dilatation géodésique, ICP | idem |
| [FlexReg_utils/](FlexReg/FlexReg_utils) | aperçu butterfly (numpy CPU), patch MGL (numpy/scipy), installation pytorch3d | Python de Slicer |

Point non évident : le CLI n'est **pas** lancé dans l'environnement conda. Il
passe par `slicer.cli.run(slicer.modules.flexreg_cli, ...)`
([FlexReg.py:939](FlexReg/FlexReg.py#L939)), donc dans le Python de Slicer — d'où
l'installation de `torch` dans Slicer lui-même par `ensureBooted`. Seuls
`dentalmodelseg` et `ALI_IOS` passent par `conda run -n shapeaxi`.

`setup_cli_command()` ([FlexReg.py:1027](FlexReg/FlexReg.py#L1027)), qui lancerait
le CLI via conda, n'est appelé nulle part : code mort.

## 3. Entrées et prétraitements

**Conversion de fichier.** `ensureVtkInput()`
([FlexReg.py:3454](FlexReg/FlexReg.py#L3454)) convertit un `.stl` en `.vtk` avant
toute opération. Ce n'est pas cosmétique : `dental_model_seg.py` fait
`os.remove(args.stl)` et détruirait le fichier source si on lui passait le `.stl`.

**Flip LPS ↔ RAS.** Le CLI lit le `.vtk` (LPS), applique `Scale(-1,-1,1)` pour
travailler en RAS comme Slicer, et re-flippe avant écriture
([FlexReg_CLI.py:39](FlexReg_CLI/FlexReg_CLI.py#L39)). Tous les calculs internes
sont donc en RAS.

**Mise en repère canonique** — le prétraitement clé,
[orientation.py](FlexReg_CLI/FlexReg_Method/orientation.py) :

1. centroïdes des dents `Universal_ID` **3, 5, 12, 14** (UR6, UR4, UL4, UL6) ;
2. base locale de chaque côté : normale du plan des trois points (produit
   vectoriel de deux vecteurs vers le milieu), puis direction perpendiculaire ;
3. deux rotations successives, axe = produit vectoriel, angle = `arccos` du
   produit scalaire, via `RotationMatrix` (Rodrigues) ;
4. translation pour faire coïncider les centroïdes.

La cible est `[[-0.5,-0.5,0], [0,0,0], [0.5,-0.5,0]]` : molaire droite en `x<0`,
molaire gauche en `x>0`, prémolaires à l'origine. Résultat : **plan occlusal ≈
z=0**, **+y = antérieur**, **+x = côté gauche**. Pas de mise à l'échelle, c'est un
recalage rigide à 3 points.

Conséquence directe : tout le butterfly est ensuite un **calcul 2D dans le plan
XY**, la composante z étant simplement ignorée.

## 4. Les modèles

### 4.1 Segmentation des couronnes — DentalModelSeg

`checkSegmentation()` ([FlexReg.py:3657](FlexReg/FlexReg.py#L3657)) ne teste pas
la présence de l'array : il **tente l'orientation ci-dessus** et lit l'exception.

- `ToothNoExist` → le maillage est segmenté mais une des 4 dents repères manque →
  message, arrêt.
- `NoSegmentationSurf` → aucun array de segmentation → `shapeaxi_conda()`.

```
conda run -n shapeaxi python -m CrownSegmentationcli \
  <surf> None <out> 1 latest 0 Universal_ID 0 None <vtk_folder> <dentalmodelseg_path>
```

Les arguments dans l'ordre : surface, csv d'entrée, dossier de sortie,
`overwrite=1`, modèle `latest`, `crownsegmentation=0`, nom d'array
`Universal_ID`, `fdi=0`, suffixe, dossier vtk, chemin de l'exécutable
`dentalmodelseg` (localisé par un `which` dans l'env).

Ce qui est **vérifié depuis ce dépôt** s'arrête à la ligne de commande ci-dessus
et à son effet : la sortie est un array de points `Universal_ID` en numérotation
universelle 1–32, écrit **dans le fichier d'entrée** (`overwrite=1`).

L'architecture et les poids `latest` vivent dans le paquet pip `shapeaxi`, hors
dépôt : **non déterminable ici**. Par filiation (DentalModelSeg vient de
Fly-by-CNN) on attend un rendu multi-vues suivi d'une segmentation 2D par vue et
d'une reprojection votée sur les sommets, mais ni le nombre de caméras, ni leur
placement, ni la résolution de rendu ne sont vérifiables depuis ce dépôt — et
l'exemple d'à côté invite à la prudence : dans
[PredPatch.py](AREG_IOS/AREG_IOS_utils/PredPatch.py), le buffer nommé `ico_verts`
ne contient pas une icosphère mais **7 caméras serrées à `z=0.9`**. Ne pas
supposer une sphère de caméras sans l'avoir lue.

`downloadModel()` ([FlexReg.py:3629](FlexReg/FlexReg.py#L3629)) télécharge un
`.pth` Fly-by-CNN (`07-21-22_val-loss0.169.pth`, release 3.0) — **jamais
appelé**, code mort. Le modèle réellement utilisé est le `latest` embarqué dans
`dentalmodelseg`.

### 4.2 Landmarks mucogingivaux — ALI_IOS

`computeMGLLandmarks()` ([FlexReg.py:2517](FlexReg/FlexReg.py#L2517)) :

```
conda run -n shapeaxi python -m ALI_IOS \
  <scan> <models> None None "LL6MG LL5MG … L0MG … LR6MG" <out> 224 0 1 <log>
```

Positions : `input`, `dir_models`, `lm_type=None`, `teeth=None`,
`teeth_mg=<13 noms>`, `output_dir`, `image_size=224`, `blur_radius=0`,
`faces_per_pixel=1`, `log_path`.

ALI_IOS est également multi-vues (rendu PyTorch3D) : il place une caméra par dent
en s'appuyant sur la segmentation, rend la vue en 224×224, et le réseau sort une
carte de chaleur dont le pic donne la position du point. **Un landmark n'est
placé que si sa dent porte un label** dans `Universal_ID` / `PredictedID` — d'où
le message d'erreur de FlexReg qui renvoie à la segmentation quand ALI n'a posé
que _k_ points sur 13.

Les poids sont cherchés dans `<Documents>/SlicerDownloads/ALI/ALI_IOS/Models/Prediction`,
sous la forme `Lower_MG_*.pth` (`hasMGLModel`, [FlexReg.py:2587](FlexReg/FlexReg.py#L2587)) ;
sinon un sélecteur de dossier s'ouvre.

## 5. Le cœur algorithmique

### 5.1 Voie A — le Butterfly patch (arcade supérieure)

[make_butterfly.py](FlexReg_CLI/FlexReg_Method/make_butterfly.py). Aucun réseau,
purement géométrique.

**a) Quatre centroïdes.** L'opérateur choisit 4 dents (antérieure G/D,
postérieure G/D) ; `vtkMeanTeeth` moyenne les vertex portant ce `Universal_ID`.

**b) Trois familles de paramètres** appliquées à ces centroïdes :

| Paramètre | Effet | Détail |
|---|---|---|
| `shift_lr`, `shift_ap` | translate le patch entier | même vecteur ajouté aux 4 centroïdes ; les landmarks étant des combinaisons affines de poids somme 1, le shift ressort de l'interpolation et la **forme est inchangée** |
| `adjust` (mm) | allonge / raccourcit | décalage en ±y, **signe inversé sur les postérieures** : un adjust positif pousse les deux bouts vers l'extérieur |
| `ratio` | largeur conservée | reparamétré `r = (1-ratio)/2`, puis `landmark = (1-r)·c_propre + r·c_opposé`. `ratio=1` → landmark sur son propre centroïde (patch maximal) ; `ratio=0` → landmark à mi-chemin (patch dégénéré) |

Attention au vocabulaire : l'UI dit `top`/`bot`, le CLI dit
`anterior`/`posterior`. `lineedit_teeth_left_top` → `tooth_anterior_left`.

**c) Le contour**, quatre morceaux :

- segment antérieur et segment postérieur (`Segment2D`, pas de `0.01`) ;
- deux **Bézier quadratiques** droite et gauche, points de contrôle
  `(landmark_postérieur, milieu_postérieur, landmark_antérieur)`, puis
  **réfléchies sur la corde** (`sym = 2·proj − bezier`) pour qu'elles bombent vers
  l'extérieur de l'arcade au lieu du centre. C'est ce qui donne la forme de
  papillon.

**d) Marquage.** `torch.cdist` entre les points du contour et les vertex
**projetés en XY** ; tout vertex à moins de `radius = 0.7 mm` passe à 1.

**e) Remplissage.** `Dilation()`
([propagation.py:73](FlexReg_CLI/FlexReg_Method/propagation.py#L73)) : flood fill
**géodésique sur le maillage**, pas une dilatation morphologique. Départ au vertex
le plus proche du barycentre des 4 landmarks, propagation de voisin en voisin
(`GetPointCells` / `GetCellPoints`), **arrêt sur le contour** déjà à 1. Batché par
`nmb_treatment = 1000` sur GPU.

**f) Écriture.** L'array s'appelle `Butterfly{index}` : chaque patch a son index,
ce qui permet de les **cumuler**. En fin de CLI, tous les `Butterfly1..N` sont
fusionnés par `torch.logical_or` en un seul array `Butterfly`
([FlexReg_CLI.py:229](FlexReg_CLI/FlexReg_CLI.py#L229)) — c'est celui que l'ICP et
AREG_IOS lisent. Le résultat est réécrit **dans le fichier d'entrée**.

Le mode `delete` renumérote les arrays au-dessus de l'index supprimé puis retire
le dernier, plutôt que de laisser un trou.

**Aperçu temps réel.**
[butterfly_preview.py](FlexReg/FlexReg_utils/butterfly_preview.py) rejoue le *même*
contour en numpy pur (CPU) et remplace le flood fill par un test
point-dans-polygone (`matplotlib.path.Path`, repli numpy en crossing-number).
L'orientation et les centroïdes sont mis en cache par scan (`prepare`), donc seul
le contour est recalculé à chaque mouvement du joystick. Constantes : `CELL = 1.0`
mm pour la carte de hauteur, `LIFT = 0.4` mm au-dessus des dents,
`NB_POINTS = 120` échantillons par arête.

### 5.2 Voie B — le patch dessiné

`draw()` ([FlexReg.py:4239](FlexReg/FlexReg.py#L4239)), `type="curve"`. Une courbe
Slicer contrainte à la surface (`SetAndObserveSurfaceConstraintNode`) plus un point
milieu, sérialisés en chaînes et passés au CLI.
[draw.py](FlexReg_CLI/FlexReg_Method/draw.py) interpole linéairement entre points
consécutifs (pas `0.2`, boucle fermée), marque les vertex à moins de `1.1 mm`,
puis lance **exactement le même `Dilation()`** depuis le point milieu. La seule
différence avec le butterfly est la façon d'obtenir le contour.

La courbe est dessinée sur le modèle recentré face caméra ; avant l'envoi au CLI,
`moveCurve()` lui applique l'inverse de la matrice de recentrage pour la ramener
dans les coordonnées du fichier.

### 5.3 Voie C — le patch MGL (arcade inférieure)

Le palais donne un plateau stable en haut ; la mandibule n'en a pas. Le substitut
retenu est la **ligne mucogingivale**. Tout ce bloc est calculé **dans le widget**,
en numpy/scipy — pas de GPU, pas de CLI
([mgl_patch.py](FlexReg/FlexReg_utils/mgl_patch.py)).

**a) Nettoyage des prédictions ALI.** `DoubtfulLandmarks()` lit la `description`
qu'ALI écrit dans le json quand il a forcé un point (top-k pixels, repli sur la
dent, dent absente). D'après le commentaire du code, mesuré sur 364 prédictions :
**4.2 mm médian d'écart à la courbe des voisins, contre 1.2 mm** pour les autres.
Ces points sont écartés par défaut, la spline enjambe le trou — sauf s'il resterait
moins de 3 points. Puis `CanonicalLandmarks` (ancien nommage d'annotation →
canonique, détecté par la présence d'un `LL7MG` ou `LR7MG`) et `RecentreNames`
(le comptage reste ancré sur la ligne médiane quand un point manque en cours
d'arcade).

**b) Repère local.** `LocalFrames()` : l'axe **apical** est la troisième composante
de la **SVD** des landmarks centrés (normale du ruban de points, indépendante de
l'orientation du scan dans le monde) ; la **tangente** est `np.gradient` le long
de l'arcade ; le **buccal** est leur produit vectoriel, retourné là où il pointe
vers l'intérieur. `OrientApical` fixe le signe en s'appuyant sur les couronnes.

**c) Construction de la bande**, à chaque `compute()` :

1. offsets opérateur (buccal / apical / tangentiel) appliqués aux landmarks ;
2. `vtkParametricSpline` passant par eux, `SAMPLES_PER_SEGMENT = 25` ;
3. **chaque échantillon est snappé sur le maillage** (`vtkPointLocator`) — une
   spline interpolée sort de la surface dans les concavités interdentaires ;
4. **Dijkstra** (`scipy.sparse.csgraph`) sur le graphe d'arêtes pondéré par
   longueur réelle, multi-source depuis ces vertex, `limit` = hauteur max,
   `min_only=True`, `return_predecessors=True` → la bande **pousse le long de la
   surface**, jamais à travers (un patch vestibulaire ne peut pas ressortir en
   lingual où la crête est mince) ;
5. hauteur **interpolée linéairement entre landmarks** (`np.interp`) et
   **asymétrique** : `heights` côté couronne, `heights_down` côté vestibule, le
   côté étant décidé par le signe de la composante apicale. La hauteur retenue est
   celle du *seed* d'où le vertex a été atteint, donc deux tronçons de hauteur
   différente coexistent sans marche d'escalier ;
6. les couronnes (`Universal_ID` 18–31, `LOWER_TOOTH_LABELS`) sont **retirées** —
   elles bougent entre T1 et T2 ;
7. les landmarks eux-mêmes restent toujours dans le patch.

Bornes : `MIN_HEIGHT = 0.0`, `MAX_HEIGHT = 5.0`, `DEFAULT_HEIGHT = 2.5` mm.
Hauteur 0 partout ⇒ il ne reste que les 13 points : c'est le **cas témoin**
délibéré, pour mesurer ce que la bande apporte par rapport aux points seuls.

Le graphe d'arêtes est construit avec `np.unique(np.sort(edges))` avant le
`coo_matrix` : sans cette déduplication, les arêtes intérieures appartenant à deux
triangles seraient **additionnées** par la matrice creuse, doublant leur longueur
et divisant par deux la portée du patch.

Array de sortie : `Bottom_MGL` (`MGL_ARRAY_NAME`), aperçu dans
`Bottom_MGLPreview`.

`WriteLandmarks()` écrit les landmarks édités en **LPS**, comme les annotations
d'entraînement : le fichier produit est directement réinjectable dans le corpus.

### 5.4 La registration

`Reg.run()` ([FlexReg.py:1276](FlexReg/FlexReg.py#L1276)) relance le même CLI avec
`type = "icp"` (haut) ou `"icp_mgl"` (bas). **T2 est le mobile** (`lineedit`),
**T1 le fixe** (`path_reg`).

```python
patch_array = "Bottom_MGL" if args.type == "icp_mgl" else "Butterfly"
option = vtkMeshTeeth(list_teeth=[1], property=patch_array)
icp = ICP([vtkICP()], option=option)
output_icp = icp.run(modelNode, modelNodeT1)
```

`vtkMeshTeeth` ne construit pas un maillage malgré son nom : il extrait un **nuage
de points** ne contenant que les vertex dont l'array patch vaut 1. L'ICP tourne
donc **uniquement sur le patch**, jamais sur les dents.

```python
icp.GetLandmarkTransform().SetModeToRigidBody()   # 6 ddl, pas d'échelle
icp.SetMaximumNumberOfIterations(1000)
icp.StartByMatchingCentroidsOn()                  # initialisation
```

`vtkIterativeClosestPointTransform` standard : appariement au plus proche voisin,
estimation rigide en moindres carrés, itération. Aucun apprentissage à ce stade.

La matrice 4×4 est ensuite appliquée **au maillage T2 complet**, et à l'arcade
opposée si elle est fournie (`lower_arch`), pour qu'elle suive le même mouvement.

## 6. Post-traitements et sorties

**Le maillage.** `type` de patch → réécrit **dans le fichier d'entrée**.
`type` d'ICP → écrit dans `path_output` sous
`<nom_T2 sans extension><suffix>.vtk`, après re-flip en LPS.

**La transformation**, le passage délicat
([FlexReg_CLI.py:186](FlexReg_CLI/FlexReg_CLI.py#L186)) :

```python
flip = np.diag([-1, -1, 1, 1])
composed = flip @ matrix_array @ flip     # RAS -> LPS par conjugaison
composed_inv = np.linalg.inv(composed)    # convention ITK : fixed -> moving
sitk_tfm = sitk.AffineTransform(3)
sitk_tfm.SetMatrix(composed_inv[:3, :3].flatten())
sitk_tfm.SetTranslation(composed_inv[:3, 3])
```

Fichier `<nom_T2><suffix>.tfm`, réutilisable par les autres modules du dépôt.

**Le bouton See.** Fait tourner la *même* registration dans un
`tempfile.mkdtemp(prefix="FlexReg_see_")` effacé dès l'affichage
(`discardTempFolder`). Le nœud résultat est marqué
`SetSaveWithScene(False)` et renommé `... (preview, not saved)` : le fichier
derrière lui est sur le point de disparaître.

**L'affichage.** Layout custom `501`, T1 en `[255,51,200]/256` et T2 en
`[102,102,255]/256` dans la troisième vue 3D.

## 7. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Segmentation des couronnes | **réseau** multi-vues (DentalModelSeg) | `conda run -n shapeaxi` |
| Orientation canonique | géométrique, 4 centroïdes | CLI |
| Butterfly / curve | géométrique, Bézier + flood fill géodésique | CLI, **GPU requis** |
| Aperçu butterfly | géométrique, point-dans-polygone | widget, CPU |
| Landmarks MG | **réseau** multi-vues (ALI_IOS, `Lower_MG_*.pth`) | `conda run -n shapeaxi` |
| Bande MGL | géométrique, spline + Dijkstra | widget, CPU |
| Registration | ICP rigide classique (VTK) | CLI |

Aucune partie de FlexReg n'apprend quoi que ce soit : les deux réseaux appelés
sont pré-entraînés et servent de **fournisseurs de repères**.

## 8. Environnement

`ensureBooted()` ([FlexReg.py:181](FlexReg/FlexReg.py#L181)) centralise la
vérification, **une seule fois**, au moment où une action en a besoin — pas à
l'affichage d'un scan. Les sondes coûtent 7.6 s mesurées : 2.2 s pour
`conda --version`, 0.6 s pour le test d'environnement, 4.8 s pour l'import du
module d'installation dedans.

| Élément | Valeur | Source |
|---|---|---|
| Env conda | `shapeaxi`, partagé avec ALI, AREG, ASO, DOCShapeAXI | [FlexReg.py:880](FlexReg/FlexReg.py#L880) |
| Python | **3.12** (imposé : les wheels pytorch3d pré-compilées n'existent que pour cp310–cp313 ; shapeaxi ≥ 2.0.2 a levé le pin `grpcio` qui forçait 3.9) | idem |
| Paquets de création | `torch>=2.8,<2.13`, `ocnn==2.2.1`, `SimpleITK` | `install_shapeaxi` |
| pytorch3d + shapeaxi | installés **après** torch, par `FlexReg_utils.install_pytorch` qui lit la version de torch pour choisir la wheel | [install_pytorch.py](FlexReg/FlexReg_utils/install_pytorch.py) |
| Dans Slicer | seul `torch` est ajouté — vtk, numpy, scipy, SimpleITK sont déjà là | `ensureBooted` |
| Windows | conda via WSL (`CondaSetUpCallWsl`), plus une vérif de `libxrender1`, `libgl1`/`libgl1-mesa-glx`, `libglx-mesa0` | `check_lib_wsl` |

**numpy ne doit pas être touché** : le scipy de Slicer est compilé pour son numpy,
et remplacer numpy sous une session vivante laisse l'import scipy suivant lire un
mélange des deux (`No module named 'numpy.strings'`), ce qui tuait l'aperçu MGL.

## 9. Pièges et points fragiles

- **Le CLI exige CUDA.** `Dilation`, `drawPatch` et la fusion finale des arrays
  appellent `.cuda()` sans repli CPU. Le patch MGL, lui, est calculé côté widget
  et s'en passe — d'où le `while args.type != "icp_mgl"` qui saute la fusion pour
  l'arcade basse.
- **Le fichier d'entrée est écrasé** en mode patch, et la segmentation automatique
  l'écrase aussi (`overwrite=1`). Un `.stl` passé à `dentalmodelseg` est
  purement et simplement supprimé — c'est la raison d'être de `ensureVtkInput()`.
- **`vtkICP.__call__` retourne `source` inchangé** au lieu du maillage transformé.
  Sans effet ici car `list_icp` ne contient qu'une méthode, mais un enchaînement
  multi-étapes ne fonctionnerait pas tel quel.
- **La détection de segmentation passe par une exception.** Un maillage segmenté
  sous un autre nom d'array que `Universal_ID` déclenchera une re-segmentation
  complète.
- **`GetLabelSurface`** ([vtkSegTeeth.py:29](FlexReg_CLI/FlexReg_Method/vtkSegTeeth.py#L29))
  boucle sur les arrays et `continue` quand il trouve la préférence, au lieu de
  `break` : le nom retourné est celui du dernier array de la liste, pas forcément
  la préférence. Sans conséquence tant que `automatic_property` reste à `False`,
  ce qui est le cas partout dans FlexReg.
- **Code mort** : `downloadModel()`, `setup_cli_command()` / `find_cli_parameters()`.
- Le patch butterfly est décidé **en 2D projetée** : sur une arcade fortement
  inclinée après orientation, le contour peut accrocher des vertex éloignés en z.

## 10. Littérature

Le fondement publié est **AReg IOS: Automatic Registration on IntraOral Scans**
(Hutin, Anchling, Cevidanes et al., Lecture Notes in Computer Science, 2023) :
segmentation des couronnes par DentalModelSeg, alignement initial par centroïdes
communs, ROI palatine segmentée par analyse de forme 3D multi-vues, puis ICP.
FlexReg en est la déclinaison « l'opérateur dessine la ROI au lieu de la faire
prédire ».

Aucun papier ne porte spécifiquement sur FlexReg ni sur la variante MGL — cette
dernière semble être un développement interne non publié à ce jour. Les chiffres
cités dans le code (4.2 mm vs 1.2 mm sur 364 prédictions) ne sont sourcés nulle
part ailleurs que dans les commentaires.

- [AREG (dépôt)](https://github.com/lucanchling/AREG)
- [ALI_IOS (dépôt)](https://github.com/DCBIA-OrthoLab/ALI_IOS)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)
- [Automated Orientation and Registration of CBCT Scans, LNCS](https://link.springer.com/chapter/10.1007/978-3-031-45249-9_5)

Bibliographie détaillée, fichiers récupérés et liens à visiter :
[SOURCES.md](SOURCES.md).
