# ASO — pipeline complet

Mise en orientation standardisée de CBCT et d'Intra Oral Scans. ASO ne segmente
rien et ne recale pas deux temps entre eux : il cherche **une rotation rigide qui
amène un scan dans le repère d'un cas de référence** (le « gold »), et il
l'applique. Un seul widget Slicer, deux backends géométriquement distincts.

## 1. Situation dans la chaîne

Rien dans le dépôt n'appelle ASO. En revanche ASO appelle trois outils, et
**AREG_IOS consomme directement sa sortie** : [AREG_IOS.py:324](AREG_IOS/AREG_IOS.py#L324)
va chercher `<patient>_SegOr.tfm` dans les dossiers T1 et T2, exactement le nom
écrit par [PRE_ASO_IOS.py:422](ASO_IOS/PRE_ASO_IOS/PRE_ASO_IOS.py#L422), et
compose `inv(areg_matrix @ inv(matrix_aso))` pour rendre une matrice totale
scan brut → recalé.

| Appelé | Quand | Comment |
|---|---|---|
| `slicer.modules.pre_aso_cbct` | CBCT, mode Fully-Automated seulement | `slicer.cli.run` |
| `slicer.modules.ali_cbct` | CBCT, mode Fully-Automated seulement | `slicer.cli.run` |
| `slicer.modules.semi_aso_cbct` | CBCT, **les deux** modes | `slicer.cli.run` |
| `CrownSegmentationcli` (ShapeAXI / DentalModelSeg) | IOS, mode Fully-Automated | `conda run -n shapeaxi` |
| `slicer.modules.pre_aso_ios` | IOS, mode Fully-Automated | `slicer.cli.run` |
| `slicer.modules.semi_aso_ios` | IOS, mode Semi-Automated | `slicer.cli.run` |

**ALI_IOS n'est jamais appelé.** `Auto_IOS.getALIModelList()`
([IOS.py:161](ASO/ASO_Method/IOS.py#L161)) existe et pointe une release de poids,
mais `SearchModelALI` est gardé par `if self.type == "CBCT"`
([ASO.py:961](ASO/ASO.py#L961), [ASO.py:1030](ASO/ASO.py#L1030)) et `SwitchMode`
cache le champ dans les deux modes IOS. En IOS, les repères d'ancrage ne sont pas
des landmarks prédits mais des **centroïdes de dents**.

`CrownSegmentationcli` n'est pas dans ce dépôt : il vient de SlicerDentalModelSeg.
`slicer.modules.crownsegmentationcli` est évalué dans `Auto_IOS.Process`
([IOS.py:304](ASO/ASO_Method/IOS.py#L304)), donc l'extension doit être installée
même si le module n'est finalement pas lancé par `slicer.cli.run` (voir §5.1).

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [ASO/ASO.py](ASO/ASO.py) | widget, 2590 lignes : UI, téléchargements, chaînage des CLI, conda | Python de Slicer |
| [ASO_Method/CBCT.py](ASO/ASO_Method/CBCT.py) | `Semi_CBCT` / `Auto_CBCT` : listes de landmarks, paramètres des CLI | idem |
| [ASO_Method/IOS.py](ASO/ASO_Method/IOS.py) | `Semi_IOS` / `Auto_IOS` : bypass segmentation, paramètres | idem |
| [PRE_ASO_CBCT.py](ASO_CBCT/PRE_ASO_CBCT/PRE_ASO_CBCT.py) | recentrage du volume | CLI, Python de Slicer |
| [SEMI_ASO_CBCT.py](ASO_CBCT/SEMI_ASO_CBCT/SEMI_ASO_CBCT.py) | l'orientation CBCT proprement dite | idem |
| [ASO_CBCT_utils/utils.py](ASO_CBCT/ASO_CBCT_utils/utils.py) | 1045 lignes : fusion json, tri des landmarks, InitICP, ICP, resampling | idem |
| [PRE_ASO_IOS.py](ASO_IOS/PRE_ASO_IOS/PRE_ASO_IOS.py) | orientation IOS par centroïdes de dents | idem |
| [SEMI_ASO_IOS.py](ASO_IOS/SEMI_ASO_IOS/SEMI_ASO_IOS.py) | orientation IOS par landmarks fournis | idem |
| [ASO_IOS_utils/](ASO_IOS/ASO_IOS_utils) | `PrePreAso`, `ICP`, `vtkMeanTeeth`, lecture/écriture de maillages | idem |

Aucun de ces CLI ne tourne dans l'environnement conda : tous passent par
`slicer.cli.run`, donc dans le Python de Slicer. Seul `dentalmodelseg` passe par
`conda run -n shapeaxi` ([ASO.py:1417](ASO/ASO.py#L1417)). **Aucun CLI d'ASO
n'exige CUDA** — c'est du VTK et du SimpleITK.

## 3. Le principe géométrique commun

La cible n'est pas un repère analytique (« plan occlusal = z=0 ») mais **un cas
patient de référence**, téléchargé depuis une release : scan + fiducials pour le
CBCT, deux maillages + deux json pour l'IOS. Le choix du repère est donc déporté
dans les données : `Occlusal and Midsagittal Plane` ou
`Frankfurt Horizontal and Midsagittal Plane`
([CBCT.py:68](ASO/ASO_Method/CBCT.py#L68)) sont deux gold différents, le même code
donnant deux orientations différentes.

Dans les deux backends l'estimation suit le même schéma en deux temps :

1. **Une initialisation à 3 points** — une translation puis deux rotations
   d'axes construits à la main, jamais un Procrustes/Kabsch en moindres carrés ;
2. **un `vtkIterativeClosestPointTransform` en mode `RigidBody`** sur les nuages
   de points d'ancrage, pour raffiner.

C'est le point à retenir : la matrice n'est **pas** une solution optimale au sens
des moindres carrés sur N correspondances. Elle est construite par rotations
successives sur un triplet choisi, puis polie par un ICP qui, lui, ré-apparie les
points **par plus proche voisin** et non par étiquette.

## 4. ASO_CBCT

### 4.1 Les deux modes

| | Semi-Automated | Fully-Automated |
|---|---|---|
| Entrée | scans **+** fiducials `.mrk.json` | scans seuls (ou DICOM) |
| Étapes | `SEMI_ASO_CBCT` | `PRE_ASO_CBCT` → `ALI_CBCT` → `SEMI_ASO_CBCT` |
| Dossier de travail | **le dossier de l'utilisateur** | deux `slicer.util.tempDirectory()` |

Le mode automatique n'est donc que le mode semi précédé d'une fabrication des
landmarks manquants ([CBCT.py:489](ASO/ASO_Method/CBCT.py#L489)).

### 4.2 PRE_ASO_CBCT — recentrage, plus de réseau

Malgré son nom et ses six arguments, ce CLI ne fait plus qu'une chose
([PRE_ASO_CBCT.py:163](ASO_CBCT/PRE_ASO_CBCT/PRE_ASO_CBCT.py#L163)) :

```python
T = -np.array(img.TransformContinuousIndexToPhysicalPoint(np.array(img.GetSize()) / 2.0))
translation = sitk.TranslationTransform(3); translation.SetOffset(T.tolist())
img_trans = ResampleImage(img, translation.GetInverse())
```

`ResampleImage` garde la taille (`ratio = 1`), l'espacement et la direction, et
pose `new_origin = orig_origin - orig_center`. Le transform appliqué annulant
exactement ce décalage, **aucune interpolation réelle n'a lieu** : seule l'origine
physique bouge, le volume se retrouve centré sur l'origine du monde. C'est le
prérequis de §4.4, où la rotation est appliquée autour de l'origine.

Les arguments `model_folder`, `SmallFOV` et `temp_folder` sont parsés et jamais
utilisés. `PreASOResample`
([ResamplePreASO.py:199](ASO_CBCT/ASO_CBCT_utils/ResamplePreASO.py#L199), un
resampling 128³ isotrope) est importé mais jamais appelé, et `DenseNet`
([Net.py:39](ASO_CBCT/ASO_CBCT_utils/Net.py#L39), un `DenseNet169` monai 3D
régressant un vecteur de direction unitaire par perte cosinus) est commenté dans
[`__init__.py`](ASO_CBCT/ASO_CBCT_utils/__init__.py#L12). **Il n'y a plus aucun
réseau de pré-orientation dans ASO_CBCT** : le code de son entraînement reste, les
poids `PreASOModels.zip` sont toujours téléchargés et validés
([CBCT.py:133](ASO/ASO_Method/CBCT.py#L133), `TestModel` exige un `.ckpt`), pour
rien.

Sortie : le volume recentré sous son nom d'origine, et
`<nom sans extension>.tfm` contenant la translation `T` — **non inversée**, alors
que c'est `translation.GetInverse()` qui a été appliquée au volume.

`convertdicom2nifti` ([utils.py:504](ASO_CBCT/ASO_CBCT_utils/utils.py#L504)) tente
`sitk.ImageSeriesReader` puis retombe sur `dicom2nifti`. Ce repli est cassé :
il appelle `search(output_folder, "nii.gz")`, or `search`
([utils.py:189](ASO_CBCT/ASO_CBCT_utils/utils.py#L189)) est déclaré
`def search(self, path, *args)` — le premier argument est absorbé par `self`,
`args` est vide, le dict retourné est vide et l'accès `["nii.gz"]` lève un
`KeyError`.

### 4.3 ALI_CBCT — le fournisseur de landmarks

Appelé sur le dossier temporaire, en entrée comme en sortie, avec des constantes
codées en dur ([CBCT.py:515](ASO/ASO_Method/CBCT.py#L515)) : `spacing="[1,0.3]"`,
`speed_per_scale="[1,1]"`, `agent_FOV="[64,64,64]"`, `spawn_radius="10"`, et
`lm_type` reformaté en liste Python littérale par `format_lm_string`
([CBCT.py:481](ASO/ASO_Method/CBCT.py#L481)). ALI_CBCT est un système d'**agents
de recherche** à deux échelles (1 mm puis 0.3 mm, FOV 64³ voxels autour de
l'agent) ; il écrit **un json par groupe anatomique**,
`<id>_lm_Pred_<groupe>.mrk.json`
([environment.py:138](ALI_CBCT/ALI_CBCT_utils/environment.py#L138)), en **LPS**.
Les poids sont des `<Landmark>_Net*.pth` téléchargés un par landmark depuis
`ALI_CBCT/releases/download/models_v01/<LM>.zip`.

C'est la raison d'être de `MergeJson`
([utils.py:65](ASO_CBCT/ASO_CBCT_utils/utils.py#L65)), premier appel de
SEMI_ASO_CBCT : recoller les jsons par groupe en un `<patient>_lm_MERGED.mrk.json`
— **et supprimer les fichiers sources** (`os.remove`).

### 4.4 SEMI_ASO_CBCT — l'orientation

**a) Élagage des landmarks aberrants.** `GetLandmarkToRemove`
([utils.py:413](ASO_CBCT/ASO_CBCT_utils/utils.py#L413)) compare la **matrice
complète des distances** et la **matrice des directions** entre tous les
landmarks du scan et celles du gold. Constantes réelles : écart de distance
> 15 mm, écart angulaire > 0.4 rad (et `-1` si < 0.1 rad, c'est-à-dire qu'une
paire très cohérente compense une paire douteuse). Un landmark est écarté si son
compte total dépasse le nombre de landmarks, ou si son seul compte angulaire
dépasse la moitié. L'analyse porte sur **tous** les landmarks du json, pas
seulement ceux cochés.

**b) Le triplet optimal.** `FindOptimalLandmarks`
([utils.py:161](ASO_CBCT/ASO_CBCT_utils/utils.py#L161)) tire au hasard des
triplets `(A, B, C)`, exécute l'initialisation pour chacun et garde celui qui
minimise la distance moyenne finale. Bornes : `n(n-1)(n-2)` triplets distincts ou
**2500 tirages**, ce qui arrive en premier.

**c) L'initialisation**, `InitICP`
([utils.py:649](ASO_CBCT/ASO_CBCT_utils/utils.py#L649)) :

1. translation amenant `A_source` sur `A_target` ;
2. rotation d'axe `cross(v2, v1)` et d'angle `arccos` du produit scalaire, où
   `v1 = abs(B - A)` côté source et `v2 = abs(B - A)` côté cible — les
   **valeurs absolues** composante par composante, ce qui replie les deux vecteurs
   dans l'octant positif et n'est pas l'angle entre les vecteurs réels ;
3. troisième rotation dont l'**axe est `abs(B - A)` lui-même**, pas un produit
   vectoriel : c'est un roulis autour de l'axe qu'on vient d'aligner, dont
   l'angle est calculé sur `C`.

`RotationMatrix` ([utils.py:921](ASO_CBCT/ASO_CBCT_utils/utils.py#L921)) est la
formule de Rodrigues par quaternion, identique à celle de FlexReg et d'ASO_IOS.
Point crucial : `TransformMatrix = RotationTransformMatrix  # @ TranslationTransformMatrix`
— la translation de l'étape 1 est **volontairement exclue** de la matrice
retournée. Elle sert à calculer les rotations, pas à déplacer le volume.

**d) L'ICP.** `ICP_Transform` ([utils.py:620](ASO_CBCT/ASO_CBCT_utils/utils.py#L620))
convertit les deux dictionnaires en `vtkPolyData` de sommets et lance un
`vtkIterativeClosestPointTransform` : `SetModeToRigidBody()`,
`SetMaximumNumberOfIterations(1000)`, `StartByMatchingCentroidsOn()`. Sa
translation est ensuite écrasée : `TransformMatrixBis[:3, 3] = [0, 0, 0]`.

**e) Composition.** `TransformList` accumule `[translation, R2, R3, R_icp]`, puis
([utils.py:803](ASO_CBCT/ASO_CBCT_utils/utils.py#L803)) :

```python
for i in range(len(TransformList) - 1, 0, -1):   # s'arrête à 1 : la translation est jetée
    TransformSITK.AddTransform(TransformList[i])
TransformSITKFinal = sitk.CompositeTransform(TransformSITK)
TransformSITKFinal.AddTransform(input_transform)   # le .tfm de PRE_ASO
TransformSITKFinal = TransformSITKFinal.GetInverse()
TransformSITK = TransformSITK.GetInverse()
```

**Le résultat final est donc une rotation pure autour de l'origine du monde.**
C'est cohérent parce que PRE_ASO_CBCT a centré le volume sur cette origine — et
c'est précisément ce qui manque au mode semi.

`ResampleImage` ([utils.py:835](ASO_CBCT/ASO_CBCT_utils/utils.py#L835)) fait
`SetReferenceImage(image)` : **même grille, même taille, même espacement**,
interpolation linéaire, `DefaultPixelValue = 0`. Le volume tourne dans sa boîte
existante, rien n'est ré-échantillonné à une résolution différente et ce qui sort
du FOV est perdu.

**f) Sorties**, dans `output_folder` avec la même arborescence relative que
l'entrée :

| Fichier | Contenu |
|---|---|
| `<patient>_<suffix>.nii.gz` | volume ré-orienté, **toujours `.nii.gz`** quel que soit le format d'entrée |
| `<patient>_lm_<suffix>.mrk.json` | landmarks tournés, écrits par `WriteJson` en **LPS** |
| `<patient>_<suffix>_transform.tfm` | `TransformSITKFinal`, convention ITK (fixed → moving) |

Les trois écritures sont gardées par `if not os.path.exists(...)` : **relancer sur
un dossier de sortie non vide ne réécrit rien** et se termine en succès.

## 5. ASO_IOS

### 5.1 Mode automatique — centroïdes de couronnes

**a) Bypass de la segmentation.** `__BypassCrownseg__`
([IOS.py:196](ASO/ASO_Method/IOS.py#L196)) ouvre chaque maillage et cherche un
array `PredictedID`, `UniversalID` ou `Universal_ID`. Les déjà segmentés sont
copiés directement dans le dossier **de sortie** de la segmentation avec le
suffixe `_Seg` ; les autres partent vers le dossier d'entrée à segmenter, les
formats exotiques étant convertis en `.vtk` au passage.

**b) DentalModelSeg**, via conda ([IOS.py:275](ASO/ASO_Method/IOS.py#L275)) :

```
conda run -n shapeaxi python -m CrownSegmentationcli \
  None <csv> <out> 0 latest 0 Universal_ID 0 Seg <vtk_folder> <dentalmodelseg_path>
```

Ordre des arguments : `surf`, `input_csv`, `out`, `overwrite`, `model`,
`crown_segmentation`, `array_name`, `fdi`, `suffix`, `vtk_folder`,
`dentalmodelseg_path`. **`overwrite = "0"` et `suffix = "Seg"`** : contrairement à
FlexReg, ASO n'écrase pas le fichier d'entrée, il produit un `<nom>_Seg.vtk` dans
un dossier temporaire. Le réseau est le même (Fly-by-CNN multi-vues, numérotation
universelle 1–32 dans `Universal_ID`), embarqué dans le paquet pip `shapeaxi` :
architecture et poids `latest` non déterminables depuis ce dépôt.

Le `dentalmodelseg_path` calculé dans `Process` est mort : `run_conda_tool`
([ASO.py:1417](ASO/ASO.py#L1417)) le remplace par le résultat d'un
`which dentalmodelseg` dans l'environnement. La branche `if os.path.isfile(path_input)`
([IOS.py:266](ASO/ASO_Method/IOS.py#L266)) est morte elle aussi — `path_input` est
toujours un dossier créé par `os.makedirs` — et référence un `self.input` qui
n'existe pas. `path_preor` est créé et jamais utilisé.

L'exécution est **synchrone et bloquante** : `run_conda_tool` boucle sur
`process.is_alive()` en appelant `slicer.app.processEvents()`, suit l'avancement
en relisant le log, puis retire l'étape de la file avant que `onPredictButton` ne
lance `slicer.cli.run` sur la suivante.

**c) `PrePreAso` — l'orientation**, le cœur
([pre_icp.py:103](ASO_IOS/ASO_IOS_utils/pre_icp.py#L103)). `organizeLandmark` ([pre_icp.py:43](ASO_IOS/ASO_IOS_utils/pre_icp.py#L43)) trie les
3 ou 4 dents choisies en `(gauche, milieu(x), droite)` en exploitant la
numérotation universelle : sur l'arcade haute (1–16) le numéro croît de la droite
vers la gauche, donc `max → gauche` ; sur l'arcade basse (17–32) c'est l'inverse.

`vtkMeanTeeth` ([icp.py:415](ASO_IOS/ASO_IOS_utils/icp.py#L415)) moyenne les
sommets portant chaque `Universal_ID`. Avec 4 dents, les deux centroïdes du milieu
sont moyennés entre eux → on retombe toujours sur **trois points**.

`make_vector` construit, pour chaque triplet, une base locale :
`normal = cross(m→d, m→g)` (normale du plan des trois points), `perpen` = direction
droite→gauche, `direction = cross(normal, perpen)`. Puis :

1. rotation d'axe `cross(normal_source, normal_target)` et d'angle
   `arccos(dot)` — le plan des trois centroïdes du scan est amené sur celui du gold ;
2. `direction_source` est tournée par cette matrice, puis une seconde rotation
   d'axe `cross(direction_source, direction_target)` fixe le roulis dans ce plan ;
3. translation faisant coïncider les **barycentres** des deux triplets.

Aucune mise à l'échelle. La matrice 4×4 est retournée en même temps que le
maillage transformé.

**d) Le raffinement.** `ICP([InitIcp(), vtkICP()], option=vtkMeanTeeth(dents))`
([PRE_ASO_IOS.py:292](ASO_IOS/PRE_ASO_IOS/PRE_ASO_IOS.py#L292)). L'`option` est
appliquée aux deux maillages avant l'enchaînement : **l'ICP ne voit que les 3 ou
4 centroïdes**, jamais la géométrie des couronnes. `InitIcp`
([icp.py:136](ASO_IOS/ASO_IOS_utils/icp.py#L136)) est la transposition en classe du
`InitICP` d'ASO_CBCT — mêmes `abs()`, même axe de roulis, même
`FindOptimalLandmarks` à 2500 tirages. `vtkICP` est le même
`vtkIterativeClosestPointTransform` rigide, mais à **100 itérations** au lieu de
1000, et sa translation n'est pas écrasée.

Détail révélateur : `InitIcp.__call__` fait `np.save` de `source` et `target` dans
`ASO_IOS_utils/cache/`, et `FindOptimalLandmarks` **recharge le `.npy` à chaque
itération** au lieu de copier le dict en mémoire — contournement d'une mutation,
au prix d'une écriture dans l'arborescence installée du module (les deux `.npy`
ont été versionnés puis retirés, commit `a334a10`).

La matrice finale est `output_icp["matrix"] @ matrix` : ICP après PrePreAso.

### 5.2 Mode semi — landmarks fournis

[SEMI_ASO_IOS.py](ASO_IOS/SEMI_ASO_IOS/SEMI_ASO_IOS.py). Même machinerie, `option`
devient `SelectKey(liste_de_landmarks)` ([icp.py:480](ASO_IOS/ASO_IOS_utils/icp.py#L480)) :
un simple filtre de clés sur les dictionnaires de landmarks. Plus de `PrePreAso`,
plus de segmentation — `InitIcp` puis `vtkICP` sur les landmarks nommés.

Les noms de landmarks sont fabriqués par produit cartésien dans l'UI :
`{dent}{repère}` avec repère ∈ `O, MB, DB` (occlusaux) ou `CB, CL, OIP, R, RIP`
(cervicaux), puis `listlandmark2diclandmark` les répartit par arcade sur la seule
initiale `U`/`L` ([utils.py:272](ASO_IOS/ASO_IOS_utils/utils.py#L272)).

La matrice obtenue sur les landmarks est ensuite appliquée au maillage complet.

### 5.3 L'occlusion

Case à cocher qui force une seule arcade
([ASO.py:1850](ASO/ASO.py#L1850)) : l'arcade choisie pilote l'orientation, et
**la même matrice est appliquée à l'arcade opposée** (`file[jaw.inv()]`,
[PRE_ASO_IOS.py:473](ASO_IOS/PRE_ASO_IOS/PRE_ASO_IOS.py#L473)) pour préserver le
rapport d'occlusion. L'appariement haut/bas se fait par nom de fichier, via
`Files_vtk_link` / `Files_vtk_json_semilink`
([data_file.py](ASO_IOS/ASO_IOS_utils/data_file.py)) : les marqueurs reconnus
sont `Upper`/`_U_` et `Lower`/`_L_`. `UpperOrLower`
([utils.py:180](ASO_IOS/ASO_IOS_utils/utils.py#L180)) **retourne `"Lower"` par
défaut** quand aucun marqueur n'est trouvé : un fichier mal nommé est
silencieusement traité comme mandibulaire.

### 5.4 Sorties IOS

| Fichier | Écrit par | Contenu |
|---|---|---|
| `<nom_entrée><suffix>.vtk` | `WriteSurf` | maillage orienté, extension forcée à `.vtk` si inconnue |
| `<patient>_SegOr.tfm` | `saveMatrixAsTfm` | **auto seulement**, nom figé quel que soit le suffixe |
| `matrix_<name>.npy` | `np.save` | **semi seulement**, matrice 4×4 brute |
| `<nom>Error.txt` | `WritefileError` | dans le sous-dossier `Error/` du dossier de sortie |

Avec le suffixe par défaut `Or` et le `_Seg` ajouté par la segmentation, un fichier
`P01_U.vtk` ressort en `P01_U_SegOr.vtk` — le nom qu'attend AREG_IOS.

`saveMatrixAsTfm` ([utils.py:300](ASO_IOS/ASO_IOS_utils/utils.py#L300)) inverse la
matrice (convention ITK fixed → moving) et l'écrit en `AffineTransform`. **Aucune
conjugaison LPS↔RAS** : ASO_IOS ne flippe jamais rien, les maillages sont lus et
réécrits dans les coordonnées du fichier (LPS pour un `.vtk`), et la matrice est
exprimée dans ce même repère. C'est cohérent de bout en bout avec AREG_IOS, qui la
relit telle quelle.

## 6. Comparaison avec l'orientation de FlexReg

[FlexReg_Method/orientation.py](FlexReg_CLI/FlexReg_Method/orientation.py) et
[ASO_IOS_utils/pre_icp.py](ASO_IOS/ASO_IOS_utils/pre_icp.py) sont **le même
algorithme, copié**. `make_vector` est identique au caractère près ; le corps de
`orientation()` et celui de `PrePreAso()` ne diffèrent que par trois points :

| | ASO_IOS `PrePreAso` | FlexReg `orientation` |
|---|---|---|
| Cible | les **centroïdes du maillage gold**, lus avec le même `vtkMeanTeeth` | trois points en dur, `[[-0.5,-0.5,0], [0,0,0], [0.5,-0.5,0]]` |
| Dents | 3 ou 4 choisies par l'opérateur, triées par `organizeLandmark` | **3, 5, 12, 14** en dur (UR6, UR4, UL4, UL6) |
| Retour | `(maillage, matrice)` | `maillage` seul |

`transformation.py` est également dupliqué entre les deux (mêmes `RotationMatrix`,
`TransformSurf`, `TransformDict`, au formatage près), et `icp.py` d'ASO_IOS
contient les classes dont `FlexReg_Method/util.py` reprend `vtkTeeth`,
`vtkMeanTeeth` et `vtkMeshTeeth`.

Conséquence pratique : FlexReg produit un repère **canonique et reproductible**
(plan occlusal ≈ z=0, +y antérieur), ce qui lui permet ensuite de raisonner en 2D
dans le plan XY. ASO_IOS produit une orientation **relative à un patient de
référence** — aucune garantie que le plan occlusal tombe sur z=0, et pas de
raffinement ICP dans FlexReg là où ASO en ajoute un.

## 7. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Recentrage CBCT | géométrique (translation) | `PRE_ASO_CBCT` |
| Landmarks CBCT (mode auto) | **réseau**, agents de recherche multi-échelle | `ALI_CBCT` |
| Élagage des landmarks aberrants | géométrique, distances + angles | `SEMI_ASO_CBCT` |
| Triplet optimal + rotations | géométrique, recherche aléatoire ≤ 2500 tirages | `SEMI_ASO_CBCT` / `PRE_ASO_IOS` |
| Raffinement | ICP rigide VTK | idem |
| Segmentation des couronnes IOS | **réseau** multi-vues (DentalModelSeg) | `conda run -n shapeaxi` |
| Centroïdes de dents | géométrique, moyenne de sommets | `PRE_ASO_IOS` |
| Orientation IOS | géométrique, 2 rotations + translation | `PrePreAso` |

Les deux réseaux appelés sont pré-entraînés et ne servent qu'à **fournir des
points d'ancrage**. Le pré-orienteur appris d'ASO_CBCT (`DenseNet169`) a été
débranché.

## 8. Environnement

Deux régimes distincts, et c'est une source de confusion.

**Les CLI** tournent dans le Python de Slicer. `install_function`
([ASO.py:69](ASO/ASO.py#L69)) y `pip_install` ce qui manque : `itk`,
`torch==2.2.0`, `pytorch_lightning`, `dicom2nifti==2.6.2`, `pydicom==3.0.2` et
`monai` en 1.3.2 (Python ≥ 3.10) ou 0.7.0 sinon.

`torch`, `pytorch_lightning` et `monai` ne servent qu'à `Net.py` et à ALI_CBCT :
en mode semi-CBCT et en IOS, ASO les installe pour rien, avec le risque d'écraser
la version de torch d'un autre module (le dialogue le dit : « Doing it could break
other modules »).

**L'environnement conda** n'est monté que pour le mode IOS automatique, par
`onCheckRequirements` ([ASO.py:1867](ASO/ASO.py#L1867)) :

| Élément | Valeur | Source |
|---|---|---|
| Env | `shapeaxi`, partagé avec ALI, AREG, FlexReg, DOCShapeAXI | [ASO.py:2415](ASO/ASO.py#L2415) |
| Python | **3.12** | [ASO.py:2417](ASO/ASO.py#L2417) |
| Création | `torch>=2.8,<2.13`, `ocnn==2.2.1`, `SimpleITK` | `install_shapeaxi` |
| pytorch3d + shapeaxi | wheels pré-compilées choisies d'après la version de torch installée | [install_pytorch.py](ASO/ASO_Method/install_pytorch.py) |
| Windows | conda via WSL (`CondaSetUpCallWsl`) + vérification de `libxrender1`, `libgl1`/`libgl1-mesa-glx`, `libglx-mesa0` | `check_lib_wsl` |

`install_pytorch.py` résout le tag de build (`0.7.9+pt2110cu128` = torch 2.11.0,
CUDA 12.8) depuis l'index PEP 503
`https://ImageMindAnalytics.github.io/pytorch3d-wheels/simple/` : installer un
wheel dont le tag ne correspond pas au torch présent produit un `undefined symbol`
à l'import. Aucun GPU n'est requis par ASO lui-même ; il l'est par
`dentalmodelseg`.

## 9. Pièges et points fragiles

- **Le mode semi-CBCT est cassé en l'état.**
  [SEMI_ASO_CBCT.py:113](ASO_CBCT/SEMI_ASO_CBCT/SEMI_ASO_CBCT.py#L113) exige
  `data["tfm"]`, introduit par le commit `1bfb51f` en même temps que la sortie de
  matrice. Ce `.tfm` n'existe que parce que PRE_ASO_CBCT l'écrit — or le mode semi
  ne lance pas PRE_ASO_CBCT et travaille sur le dossier brut de l'utilisateur.
  Résultat : `KeyError` sur tout patient dont le dossier ne contient pas déjà un
  `.tfm`, capturé et journalisé en « missing required files », le patient étant
  compté en échec sans interrompre les autres. Le mode ne fonctionne donc que si
  un `.tfm` traîne à côté du scan — typiquement après un passage préalable en
  mode Fully, puisque
  [PRE_ASO_CBCT.py:217](ASO_CBCT/PRE_ASO_CBCT/PRE_ASO_CBCT.py#L217) écrit le sien
  dans le dossier du scan. Vérifié : `GetPatients`
  ([utils.py:1042](ASO_CBCT/ASO_CBCT_utils/utils.py#L1042)) ne remplit la clé
  `tfm` que si un fichier `.tfm` est présent dans l'arborescence d'entrée.
- **Et même sans ça, le mode semi n'a pas de recentrage.** L'orientation étant une
  rotation pure autour de l'origine du monde (§4.4e), un volume non centré part
  hors de son propre FOV, `DefaultPixelValue = 0`.
- **`MergeJson` supprime des fichiers dans le dossier d'entrée.** En mode semi,
  `input_dir` est le dossier de l'utilisateur : tous ses `.mrk.json` sans `MERGED`
  dans le nom sont fusionnés puis **effacés**
  ([utils.py:111](ASO_CBCT/ASO_CBCT_utils/utils.py#L111)).
- **Le système de coordonnées des json n'est jamais vérifié.**
  `LoadJsonLandmarks` lit `position` brut ; ALI et ASO écrivent du LPS, mais un
  fiducial exporté en RAS depuis Slicer sera lu avec x et y inversés, sans
  avertissement.
- **Minimum de landmarks incohérent.** L'UI exige 3 landmarks cochés
  (`TestCheckbox`, [CBCT.py:85](ASO/ASO_Method/CBCT.py#L85)) mais `ICP` abandonne
  dès `len(list_landmark) <= 3` ([utils.py:754](ASO_CBCT/ASO_CBCT_utils/utils.py#L754)).
  Il en faut donc 4, et davantage si l'élagage en retire.
- **L'ICP ré-apparie par plus proche voisin.** `vtkIterativeClosestPointTransform`
  ignore les étiquettes : sur des landmarks proches deux à deux (les paires
  gauche/droite), il peut consolider un appariement croisé que l'initialisation
  avait déjà mis de travers.
- **Les `abs()` de `InitICP`.** Les vecteurs sont repliés dans l'octant positif
  avant le calcul d'angle, dans les deux backends. Le triplet retenu étant celui
  qui minimise l'erreur *mesurée*, la recherche compense — mais il n'y a rien à
  conclure de la géométrie de l'étape prise isolément.
- **Rien n'est réécrit si le fichier existe.** Les trois sorties CBCT sont gardées
  par `if not os.path.exists`. Une seconde passe après correction d'un paramètre
  ne produit aucun effet visible et se termine en succès.
- **Les identifiants patient divergent entre ASO et AREG.**
  `PatientNumber` ([utils.py:295](ASO_IOS/ASO_IOS_utils/utils.py#L295)) coupe sur
  `_U`/`_L`, tandis qu'AREG_IOS reconstruit `patient_id.split("_")[0]`
  ([AREG_IOS.py:321](AREG_IOS/AREG_IOS.py#L321)). Un nom du type `P01_T1_U.vtk`
  donne `P01_T1` d'un côté et `P01` de l'autre : le `.tfm` d'ASO n'est pas
  retrouvé, et AREG se contente d'un `logger.warning`. Accessoirement il y a
  **deux `PatientNumber`** dans ce fichier, celui de la ligne 229 (premier groupe
  de chiffres) étant masqué par celui de la ligne 295.
- **Code mort** : `Net.py` (`DenseNet`) et `PreASOResample` côté CBCT ; le
  `search` à `self` fantôme ; `DisplayALIIOS` ; `Files_vtk_json_link` ;
  `vtkMiddleTeeth` ; `npSameNumberPoint` (branche `source.shape[0] < target.shape[0]`
  qui référence un `target_points` non défini) ; le fichier orphelin
  [LinearTransform_t.tfm](ASO_CBCT/LinearTransform_t.tfm), référencé nulle part.
- **Le `.tfm` de PRE_ASO_CBCT est écrit non inversé** alors que c'est son inverse
  qui a été appliqué au volume. Il est ensuite composé puis inversé en bloc dans
  SEMI_ASO_CBCT ; à vérifier avant de réutiliser ce fichier isolément.
- **Les suffixes de temps.** `PatientScanLandmark`
  ([CBCT.py:36](ASO/ASO_Method/CBCT.py#L36)) ne coupe que sur `_T1`/`_T2` ; un
  `_T3` casse l'appariement. Le commentaire est déjà en place dans le code.

## 10. Littérature

Le papier de référence pour ASO_CBCT est **Automated Orientation and Registration
of Cone-Beam Computed Tomography Scans** (Anchling, Hutin, Cevidanes et al.,
Lecture Notes in Computer Science, 2023). Sa description correspond au code : ALI_CBCT
identifie les landmarks quelle que soit l'orientation d'entrée, puis l'orientation
est obtenue « en alignant d'abord 3 landmarks choisis aléatoirement, puis en
raffinant par ICP ». Erreurs annoncées : < 3° et < 2 mm par rapport à des experts.
Le papier ne mentionne pas le pré-orienteur `DenseNet`, cohérent avec le fait
qu'il ne soit plus branché.

Pour ALI_CBCT lui-même : **Automatic landmark identification in cone-beam computed
tomography** (Gillot et al., *Orthodontics & Craniofacial Research*, 2023).

**ASO_IOS n'a pas de papier propre.** Le texte publié le plus proche est
*AReg IOS: Automatic Registration on IntraOral Scans* (Hutin, Anchling, Cevidanes
et al., LNCS 2023), qui décrit l'alignement initial par centroïdes de dents
communs — c'est-à-dire exactement `PrePreAso`. Le reste (choix des dents par
l'opérateur, raffinement ICP sur 3 centroïdes, mode occlusion) est un
développement interne non publié.

- [ASO (dépôt d'origine, Anchling)](https://github.com/lucanchling/ASO)
- [ASO (DCBIA-OrthoLab)](https://github.com/DCBIA-OrthoLab/ASO)
- [Automated Orientation and Registration of CBCT Scans, LNCS](https://link.springer.com/chapter/10.1007/978-3-031-45249-9_5)
- [PubMed 38770027](https://pubmed.ncbi.nlm.nih.gov/38770027/)
- [Automatic landmark identification in CBCT, Gillot 2023](https://onlinelibrary.wiley.com/doi/10.1111/ocr.12642)
- [Projet ASO_CBCT, NA-MIC Project Week 38](https://projectweek.na-mic.org/PW38_2023_GranCanaria/Projects/ASO_CBCT/)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)

Références complètes, PDF récupérés et liens à consulter : [SOURCES.md](SOURCES.md).
