# AREG_CBCT — pipeline complet

Recalage T1/T2 de CBCT sur une région de référence osseuse (base du crâne,
mandibule ou maxillaire). Le recalage lui-même est **entièrement classique** :
un elastix rigide, aucun réseau. Tout ce qui est appris dans la chaîne est en
amont — segmentation des masques (AMASSS), landmarks d'orientation (ALI_CBCT).

## 1. Situation dans la chaîne

[AREG/AREG.py](AREG/AREG.py) est un widget unique qui pilote trois modalités :
CBCT ([CBCT.py](AREG/AREG_Method/CBCT.py)), IOS ([IOS.py](AREG/AREG_Method/IOS.py))
et IOS-sur-CBCT ([IOSCBCT.py](AREG/AREG_Method/IOSCBCT.py)). Il ne calcule rien :
chaque `Method.Process()` retourne une **liste de dictionnaires de steps**, et le
widget les exécute l'un après l'autre.

Un step est toujours de la forme :

```python
{"Process": slicer.modules.areg_cbct,   # module CLI Slicer
 "Parameter": {...},                    # dict passé tel quel à slicer.cli.run
 "Module": "AREG_CBCT for Mandible",    # libellé affiché
 "ReviewId": "cbct_registration",       # pause de revue éventuelle
 "ReviewFolder": ".../Mandible",
 "ReviewReferenceFolder": "<dossier T1>",
 "Display": DisplayAREGCBCT(nb_scan)}   # traduction progression -> barre
```

Appels sortants du mode CBCT, dans l'ordre d'exécution :

| Module appelé | Modes | Rôle |
|---|---|---|
| `pre_aso_cbct` ([PRE_ASO_CBCT.py](ASO_CBCT/PRE_ASO_CBCT/PRE_ASO_CBCT.py)) | les 3 | centrer T2 (et T1 en mode Orientation) |
| `ali_cbct` ([ALI_CBCT.py](ALI_CBCT/ALI_CBCT.py)) | Orientation seul | placer 6 ou 7 landmarks sur T1 |
| `semi_aso_cbct` ([SEMI_ASO_CBCT.py](ASO_CBCT/SEMI_ASO_CBCT/SEMI_ASO_CBCT.py)) | Orientation seul | orienter T1 sur un gold standard (ICP landmarks) |
| `amasss_cli` ([AMASSS_CLI.py](AMASSS_CLI/AMASSS_CLI.py)) | Fully-Auto, Orientation | produire les **masques** de la région de référence sur T1 |
| `areg_cbct` ([AREG_CBCT.py](AREG_CBCT/AREG_CBCT.py)) | les 3 | **le recalage**, une fois par région cochée |
| `amasss_cli` | les 3 (optionnel) | segmentations finales T1 et T2 recalé |

Rien dans le dépôt n'appelle AREG : c'est un outil terminal. Ses `.tfm` sont en
revanche réutilisables par [AutoMatrix](AutoMatrix/AutoMatrix.py) et les modules d'analyse.

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [AREG/AREG.py](AREG/AREG.py) | widget, 3336 lignes : UI, enchaînement des steps, pauses de revue, installation des libs | Python de Slicer |
| [AREG/AREG_Method/CBCT.py](AREG/AREG_Method/CBCT.py) | les 3 modes CBCT, construction des listes de steps, appariement T1/T2 | idem |
| [AREG/AREG_Method/Review.py](AREG/AREG_Method/Review.py) | pauses de revue : file de patients, chargement, écriture des corrections, rollback | idem |
| [AREG/AREG_Method/Progress.py](AREG/AREG_Method/Progress.py) | traduction `<filter-progress>` → barre | idem |
| [AREG_CBCT/AREG_CBCT.py](AREG_CBCT/AREG_CBCT.py) | le CLI : boucle patients, écriture des sorties | **processus séparé**, `python-real` de Slicer |
| [AREG_CBCT/AREG_CBCT_utils/utils.py](AREG_CBCT/AREG_CBCT_utils/utils.py) | appariement, masquage, elastix, matrices | idem |

Contrairement à la voie IOS, **rien du CBCT ne passe par conda** : `AREGLogic`
et son env `shapeaxi` ([AREG.py:3087](AREG/AREG.py#L3087)) ne servent qu'à IOS.
Le CBCT est lancé par `slicer.cli.run` ([AREG.py:1552](AREG/AREG.py#L1552),
[AREG.py:1804](AREG/AREG.py#L1804)) et les paquets sont `pip_install`és dans
Slicer lui-même. **Aucun GPU n'est requis par AREG_CBCT** (AMASSS, lui, en veut un).

`import slicer` dans [AREG_CBCT.py:6](AREG_CBCT/AREG_CBCT.py#L6) n'est jamais
utilisé ; `LoadOnlyLandmarks`, `applyTransformLandmarks` et `WriteJson` sont
importés et jamais appelés — restes du paramètre `reg_lm`, commenté dans
[AREG_CBCT.xml](AREG_CBCT/AREG_CBCT.xml).

## 3. Les trois modes et la chaîne exacte

Le mode est choisi par `CbModeType` ; `SwitchType()`
([AREG.py:930](AREG/AREG.py#L930)) instancie la classe correspondante. Les trois
partagent la même fin de chaîne — centrage T2, AREG par région, AMASSS final — et
ne diffèrent que par l'amont :

| Mode | Classe | Amont | Masques T1 |
|---|---|---|---|
| Semi-Automated | `Semi_CBCT` ([CBCT.py:266](AREG/AREG_Method/CBCT.py#L266)) | rien | **fournis par l'opérateur** (champ « T1 Masks ») |
| Fully-Automated | `Auto_CBCT` ([CBCT.py:446](AREG/AREG_Method/CBCT.py#L446)) | rien | AMASSS `CBMASK`/`MANDMASK`/`MAXMASK`, écrits **dans le dossier T1 d'entrée** |
| Orientation & Registration | `Or_Auto_CBCT` ([CBCT.py:731](AREG/AREG_Method/CBCT.py#L731)) | PRE_ASO → ALI_CBCT → SEMI_ASO sur T1, vers `<dossier T1>Or` | AMASSS sur `<dossier T1>Or` |

La région de référence est un **choix de l'opérateur**, pas une déduction :
cases à cocher « Regions of Reference for Registration » = Cranial Base,
Mandible, Maxilla ([CBCT.py:198](AREG/AREG_Method/CBCT.py#L198)), traduites en
`CB` / `MAND` / `MAX` par `TranslateModels`. Cocher deux régions lance **deux
recalages indépendants**, chacun avec son dossier de sortie.

## 4. Entrées, appariement, prétraitements

**Formats.** `.nii.gz`, `.nii`, `.nrrd`, `.nrrd.gz`, `.gipl`, `.gipl.gz`. En
entrée DICOM, `convertdicom2nifti` ([utils.py:720](AREG_CBCT/AREG_CBCT_utils/utils.py#L720))
convertit un sous-dossier par patient via `sitk.ImageSeriesReader`, repli
`dicom2nifti`, vers `<dossier>/NIFTI/<patient>.nii.gz`.

**Appariement T1/T2** — `GetPatients`
([utils.py:91](AREG_CBCT/AREG_CBCT_utils/utils.py#L91)). L'identifiant patient
est ce qui reste du nom de fichier après une chaîne de `split()` sur une liste
fixe de marqueurs (`_Scan`, `_Or`, `_MAND`, `_CB`, `_lm`, `_T2`, `_T1`, `_Cl`…).
Puis :

- fichier image dont le nom contient `mask`, `seg` ou `pred` → segmentation ;
- sinon → `scanT1` / `scanT2` ;
- si `segmentationType` est donné, une seconde passe cherche dans
  `mask_folder_t1` (ou à défaut le dossier T1) les fichiers dont le nom contient
  `cb`, `mand`/`md`, ou `max`/`mx` selon la région, et **le premier trouvé
  gagne**. Cette passe ne vérifie pas que le fichier est un masque : un scan
  nommé `P1_T1_MAX.nii.gz` serait pris pour la segmentation.

Le T2 est lu avec `segmentationType=None` : **seul le fixe est masqué**, jamais
le mobile.

**Centrage de T2** — `pre_aso_cbct`. Malgré son nom et son paramètre
`model_folder` pointant sur `Models/Orientation/PreASO`, ce CLI **n'utilise
aucun réseau** : il calcule `T = -centre_physique_de_l_image`
([PRE_ASO_CBCT.py:163](ASO_CBCT/PRE_ASO_CBCT/PRE_ASO_CBCT.py#L163)), resample
avec l'inverse et écrit la `TranslationTransform` en `.tfm` à côté. La prédiction
de direction par un `DenseNet` existait, commentée, et a été supprimée
(commit `4296774`). Les arguments `model_folder` et `SmallFOV` sont **morts**,
mais les poids PreASO sont toujours téléchargés.

**Masquage du fixe** — `MaskedImage`
([utils.py:584](AREG_CBCT/AREG_CBCT_utils/utils.py#L584)) :

```python
fixed_seg_sitk.SetOrigin(fixed_image_sitk.GetOrigin())   # origine forcée
fixed_image_masked = applyMask(fixed_image_sitk, fixed_seg_sitk, label=SegLabel)
sitk.WriteImage(sitk.Cast(fixed_image_masked, sitk.sitkInt16),
                os.path.join(temp_folder, "fixed_image_masked.nii.gz"))
```

`applyMask` binarise si un label est demandé, sinon passe le masque tel quel à
`sitk.Mask` (tout voxel non nul est conservé). Le fichier temporaire porte
**toujours le même nom** : le dossier temporaire est unique pour la totalité du
batch ([CBCT.py:306](AREG/AREG_Method/CBCT.py#L306)), donc chaque patient écrase
le précédent — sans conséquence en séquentiel, fatal si le CLI était parallélisé.

`SegLabel` est en pratique toujours `None` : le combo `LabelSelectcomboBox` est
masqué en dur ([AREG.py:548](AREG/AREG.py#L548)) et `SegmentationLabels` reste
`[0]`, que le CLI retraduit en `None`. `GetSegmentationLabel`
([CBCT.py:177](AREG/AREG_Method/CBCT.py#L177)), qui lisait les labels présents
dans le masque, n'est appelé nulle part : **code mort**.

## 5. Le cœur algorithmique — le recalage

Tout est dans `VoxelBasedRegistration`
([utils.py:598](AREG_CBCT/AREG_CBCT_utils/utils.py#L598)) :

1. lecture du mobile T2 en `itk.F` ;
2. masquage du fixe T1 (ci-dessus), relecture en `itk.F` ;
3. **un seul** `ElastixReg(fixed_image_masked, moving_image, initial_transform=None)` ;
4. `MatrixRetrieval` → transform SimpleITK ;
5. `ComputeFinalMatrix([t])` → `Euler3DTransform` ;
6. resampling du T2.

La bibliothèque est **itk-elastix** (`itk.ElastixRegistrationMethod`), pas
SimpleITK ni ANTs. Paramètres, tous explicites dans
`make_rigid_param_map_deterministic` ([utils.py:527](AREG_CBCT/AREG_CBCT_utils/utils.py#L527)),
au-dessus de la `"rigid"` par défaut d'elastix :

| Paramètre | Valeur | Commentaire |
|---|---|---|
| Transform | `EulerTransform` (défaut du map `rigid`) | 6 ddl, pas d'échelle |
| `Metric` | `AdvancedMattesMutualInformation`, 64 bins | information mutuelle |
| `Optimizer` | `ConjugateGradient` | pas de descente stochastique |
| `MaximumNumberOfIterations` | **1500** | par niveau |
| `MaximumStepLength` / `MinimumStepLength` | 2.0 / 0.001 | |
| `ValueTolerance` / `GradientTolerance` | 1e-6 / 1e-6 | |
| `NumberOfResolutions` | **3** | pyramide lissante fixe et mobile |
| `ImagePyramidSchedule` | `8 8 / 4 4 / 2 2` | **seulement 2 valeurs par niveau pour un volume 3D** |
| `ImageSampler` | `Grid` | échantillonnage déterministe |
| `NewSamplesEveryIteration` | `false` | |
| `NumberOfSpatialSamples` | 30000 | ignoré par le sampler `Grid` (commentaire du code) |
| `NumberOfThreads` | 1 | déterminisme au prix de la vitesse |
| `AutomaticTransformInitialization` | `true` | pré-alignement des centres |
| `AutomaticScalesEstimation` | `true` | |
| `ErodeMask` | `true` | |
| `Interpolator` | `LinearInterpolator` | |

**Il n'y a plus d'étape grossière.** Le paramètre `ApproxReg` de la case
« Include Approximation Step » descend jusqu'à `VoxelBasedRegistration(approx=...)`
et n'y est **jamais lu** : `ElastixApprox` et `make_rigid_param_map_stochastic`
(sampler `RandomCoordinate`, 10000 samples, `AdaptiveStochasticGradientDescent`,
2 niveaux, sur les images **non masquées**) ont été supprimés par le commit
`350a8de` du 23/09/2025, tout comme l'usage de `initial_transform` dans
`ElastixReg` ([utils.py:573](AREG_CBCT/AREG_CBCT_utils/utils.py#L573)), appelé
avec `None` partout. Le seul « coarse to fine » restant est la pyramide à 3
niveaux ; le pré-alignement grossier est assuré par le centrage PRE_ASO de T2 et
par `AutomaticTransformInitialization`.

**Récupération de la matrice** — `MatrixRetrieval`
([utils.py:830](AREG_CBCT/AREG_CBCT_utils/utils.py#L830)) lit
`TransformParameters` : 3 angles puis 3 translations, reversés dans un
`sitk.Euler3DTransform`. `ComputeFinalMatrix`
([utils.py:851](AREG_CBCT/AREG_CBCT_utils/utils.py#L851)) compose la liste
(rotations multipliées, translations **additionnées**) — avec une liste d'un
seul élément, c'est une recopie. Le code de composition n'est donc jamais
exercé, et l'addition des translations ne serait de toute façon valide que si
les rotations intermédiaires étaient l'identité.

**Resampling** — `ResampleImage`
([utils.py:472](AREG_CBCT/AREG_CBCT_utils/utils.py#L472)) : interpolation
linéaire, `DefaultPixelValue = 0`, et `SetReferenceImage(image)` où `image` est
**le mobile lui-même**. Le volume recalé conserve donc la grille de T2 (taille,
spacing, origine), pas celle de T1. Sortie castée en `int16`.

## 6. Ce qui tourne en amont : arguments exacts

**AMASSS — masques de recalage** ([CBCT.py:456](AREG/AREG_Method/CBCT.py#L456)) :

```python
{"inputVolume": <dossier T1>,                  # ou <dossier T1>Or
 "modelDirectory": <model_folder_1>/AMASSS_Models,
 "skullStructure": "CBMASK,MANDMASK,MAXMASK",  # selon les cases cochées
 "merge": "SEPARATE", "genVtk": False, "save_in_folder": False,
 "output_folder": <dossier T1>,                # à côté des scans
 "vtk_smooth": 5, "prediction_ID": "seg",
 "temp_fold": <Documents>/Slicer_temp_AMASSS,
 "SegmentInput": False, "DCMInput": False}
```

Le nom écrit est `<base>_seg_<STRUCT>.<ext>`
([AMASSS_CLI.py:600](AMASSS_CLI/AMASSS_CLI.py#L600)) — donc `P1_T1_seg_MANDMASK.nii.gz`,
que la seconde passe de `GetPatients` retrouve par le mot-clé `mand`. AMASSS est
aujourd'hui un **nnU-Net v2** appelé en process
([AMASSS_CLI.py:54](AMASSS_CLI/AMASSS_CLI.py#L54)), avec un modèle distinct
par groupe (`FF`, `SKIN`, `CBMASK`, `MANDMASK`, `MAXMASK`).

**AMASSS — segmentations finales.** Deux steps, `inputVolume = <dossier T1>`
puis `inputVolume = <dossier de sortie>`, `genVtk=True`, `merge` selon la case
« Merge Segmentations », `save_in_folder=True` en mode Semi et `False` ailleurs.
Le second parcourt récursivement l'arborescence `<Region>/<patient>_OutReg/` et
saute ses propres sorties grâce au suffixe `_seg_`.

**ALI_CBCT** (mode Orientation seulement, [CBCT.py:756](AREG/AREG_Method/CBCT.py#L756)) :

```python
{"input": <temp>, "dir_models": <model_folder_3>,
 "lm_type": "'N', 'S', 'Ba', 'RPo', 'LPo', 'LOr', 'ROr'",
 "output_dir": <temp>, "temp_fold": <Documents>/Slicer_temp_ALI,
 "DCMInput": False, "spacing": "[1,0.3]", "speed_per_scale": "[1,1]",
 "agent_FOV": "[64,64,64]", "spawn_radius": "10"}
```

Agents de renforcement multi-échelle (1 mm puis 0.3 mm), FOV 64³ voxels,
réseau `DNet` = `DenseNet` MONAI 3D (`growth_rate=34`, blocs `(6,12,24,16)`)
suivi d'un MLP à 6 sorties = les 6 directions de déplacement
([brain.py:48](ALI_CBCT/ALI_CBCT_utils/brain.py#L48)). La liste dépend du plan de
référence : `IF ANS PNS UR1O UR6O UL6O` (occlusal) ou `N S Ba RPo LPo LOr ROr`
(Frankfort).

**SEMI_ASO_CBCT** : `gold_folder` = `<model_folder_2>/<référence>`,
`output_folder` = `<dossier T1>Or`, `add_inname` = `"Or"`. Alignement par
`vtkIterativeClosestPointTransform` rigide sur les landmarks (1000 itérations,
`StartByMatchingCentroidsOn`), après élimination des landmarks aberrants.

## 7. Sorties

Écrites par [AREG_CBCT.py:152](AREG_CBCT/AREG_CBCT.py#L152) :

```
<output>/<Cranial Base|Mandible|Maxilla>/<patient>_OutReg/
    <patient>_<CB|MAND|MAX>Scan<add_name>.nii.gz    # T2 recalé, int16
    <patient>_<CB|MAND|MAX><add_name>_matrix.tfm    # la transformation
```

Le nom du sous-dossier vient de `translate()`
([utils.py:714](AREG_CBCT/AREG_CBCT_utils/utils.py#L714)) : `CB` → `Cranial Base`.
`add_name` est concaténé **sans séparateur**.

Conventions du `.tfm` : `sitk.WriteTransform` d'un `Euler3DTransform`, donc
**LPS** et convention ITK (le transform va de l'espace de sortie vers l'espace
d'entrée). Aucun flip n'est nécessaire dans le CLI, tout y est SimpleITK/elastix ;
le seul endroit de la chaîne CBCT qui conjugue par `diag(-1,-1,1,1)` est la
correction manuelle, qui part d'une matrice Slicer en RAS
([Review.py:489](AREG/AREG_Method/Review.py#L489)).

Le `.tfm` de centrage écrit par PRE_ASO à côté du T2 centré n'est **pas composé**
avec celui d'AREG : pour ramener le T2 d'origine sur T1, il faut enchaîner les
deux fichiers à la main.

## 8. Les pauses de revue et la navigation batch

Ajoutées par le commit `2609bc4` (« Pause VFACE at chosen steps »… et AREG avant
lui). L'opérateur coche dans « Review and manual adjustment » les étapes où le
run doit s'arrêter ; la sélection est mémorisée dans `QSettings` sous
`AREG/ReviewSteps` ([AREG.py:1922](AREG/AREG.py#L1922)).

**Les points d'arrêt disponibles en CBCT** (`getReviewSteps`, [CBCT.py:258](AREG/AREG_Method/CBCT.py#L258)),
et ce qu'ils permettent (`CATALOGUE`, [Review.py:568](AREG/AREG_Method/Review.py#L568)) :

| Id | Après | Nature |
|---|---|---|
| `cbct_landmarks_orientation` | ALI_CBCT (mode Orientation) | **éditable** : les points se déplacent et sont réécrits |
| `cbct_oriented` | SEMI_ASO | vue seule |
| `cbct_masks` | AMASSS masques | vue seule |
| `cbct_centered_t2` | PRE_ASO T2 | vue seule |
| `cbct_registration` | **AREG_CBCT** | **ajustable** : on déplace le scan recalé |
| `cbct_segmentation` | AMASSS final T2 | vue seule |

**Mécanique de la pause.** `markProcessesForReview`
([AREG.py:1936](AREG/AREG.py#L1936)) pose `ReviewPause=True` sur les steps dont
le `ReviewId` est coché. À la fin d'un CLI, `enterReviewPause`
([AREG.py:1949](AREG/AREG.py#L1949)) renvoie `True` et diffère `beginReview` par
`QTimer.singleShot(0, ...)` — obligatoire : on est dans un callback d'observateur
VTK, où la boucle Qt ne tourne pas et où charger un volume remplirait le pipe de
stdout que Slicer ne draine plus.

`ReviewSession.build` ([Review.py:118](AREG/AREG_Method/Review.py#L118)) construit
la file : un item par patient trouvé dans `ReviewFolder`, restreint aux patients
de **ce** run (`runPatientIds()` lit le dossier T1 d'entrée — un dossier de sortie
réutilisé contient les résultats de mois de travail). Pour AREG, `ReviewFolder`
est scopé à `<output>/<Région>` : sinon la pause de la mandibule afficherait aussi
la base du crâne, et le déplacement de l'opérateur serait replié dans la première
matrice venue.

Pour `cbct_registration`, le scan recalé est chargé au-dessus du T1
(`foregroundOpacity=0.5`) et rattaché à un `vtkMRMLLinearTransformNode` avec ses
poignées d'interaction ([Review.py:366](AREG/AREG_Method/Review.py#L366)). À la
sortie, `_saveAdjustment` ([Review.py:457](AREG/AREG_Method/Review.py#L457))
convertit le déplacement RAS en LPS (`flip @ ras @ flip`), l'inverse, et écrit
`sitk.CompositeTransform([original, nudge.GetInverse()])` **dans le .tfm
existant** — ce qui vient après applique une seule matrice par patient et ne sait
pas chaîner. Le scan est ensuite durci et réécrit sur place
([Review.py:510](AREG/AREG_Method/Review.py#L510)). Si la matrice est l'identité
à 1e-9 près, rien n'est écrit.

**Navigation batch** :

- *Previous / Next patient* ([AREG.py:2117](AREG/AREG.py#L2117)) : parcourent la
  file sans jamais avancer le run ; `saveEdits()` est appelé avant chaque
  changement, donc les corrections sont conservées.
- *Flag* ([AREG.py:2131](AREG/AREG.py#L2131)) : marque un patient « à refaire ».
  Le bouton n'apparaît que s'il existe une étape corrigeable en arrière.
- *Go back* ([AREG.py:2138](AREG/AREG.py#L2138)) : `previousCorrectableStep()`
  ([AREG.py:2052](AREG/AREG.py#L2052)) remonte `executed_steps` jusqu'au dernier
  step de type `LANDMARKS` ou `REGISTRATION` — les étapes en lecture seule sont
  sautées. Les steps intermédiaires sont **rejoués uniquement pour les patients
  marqués** : `restrictStepToPatients` ([Review.py:727](AREG/AREG_Method/Review.py#L727))
  crée un dossier temporaire ne contenant que ces patients, en **liens
  symboliques** (un CBCT pèse 200 Mo), arborescence préservée, puis réécrit la
  clé d'entrée du step (`t1_folder`, `t2_folder`, `input`, `inputVolume`… :
  `INPUT_KEYS`, [Review.py:717](AREG/AREG_Method/Review.py#L717)). Les steps
  narrowed sont insérés en tête de `list_Processes_Parameters`. Les liens sont
  effacés en fin de run par `clearReviewTempFolders`.
- *Next step* ([AREG.py:2181](AREG/AREG.py#L2181)) : sauvegarde le patient
  courant, journalise combien de patients ont été acceptés sans être ouverts, et
  reprend le run.

`ReviewMatrixFolder` et `ReviewKind` sont lus par `Review.build` mais **définis
nulle part** : points d'extension inutilisés (la matrice est donc toujours
cherchée dans le `ReviewFolder` lui-même).

## 9. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Centrage T1/T2 (PRE_ASO) | géométrique, translation du centre | CLI Slicer |
| Landmarks d'orientation (ALI_CBCT) | **réseau** DenseNet 3D, agents RL multi-échelle | CLI Slicer, CUDA si dispo |
| Orientation (SEMI_ASO) | ICP rigide VTK sur landmarks | CLI Slicer |
| Masques de région de référence (AMASSS) | **réseau** nnU-Net v2 3d_fullres | CLI Slicer, GPU |
| **Recalage T1/T2 (AREG_CBCT)** | **elastix rigide, information mutuelle** | CLI Slicer, CPU |
| Segmentations finales (AMASSS) | **réseau** nnU-Net v2 | CLI Slicer, GPU |
| Correction manuelle | transform Slicer composé dans le .tfm | widget |

**AREG_CBCT ne contient aucun réseau** : pas de `torch`, pas de `monai`, pas de
`.pth`. Le seul apprentissage de la chaîne sert à produire le masque qui délimite
la région de référence et, en mode Orientation, les landmarks.

## 10. Environnement

Tout est installé dans le Python de Slicer par `install_function`
([AREG.py:86](AREG/AREG.py#L86)) au clic sur le bouton de lancement, après une
boîte de dialogue de confirmation :

`itk==5.4.0`, **`itk-elastix==0.19.2`** (le moteur de recalage),
`dicom2nifti==2.6.2`, `torch==2.2.0` (wheel `cu118` sous Windows),
`monai==1.3.2`, `nnunetv2>=2.8.0` et `torchvision` (**Linux/macOS seulement**),
`numpy<2.0.0` re-forcé après coup si numpy ≥ 2 est détecté, plus
`connected-components-3d`, `einops`, `nibabel`, `pandas`. `pydicom` est épinglé
à `==3.0.2`, la version de Slicer : le rétrograder casse `dicomweb-client` et
`highdicom`, donc tous les modules DICOM de Slicer.

`check_lib_installed` ([AREG.py:68](AREG/AREG.py#L68)) **ne compare pas les
versions** : la contrainte est ignorée dès que le paquet est présent, quelle que
soit sa version.

## 11. Pièges et points fragiles

**Les suffixes `_T1` / `_T2`.** Le commit `05d1fec` a marqué chaque site par le
mot-clé `TIMEPOINT-SUFFIX`. La note de référence est au-dessus de `GetPatients`
([utils.py:68](AREG_CBCT/AREG_CBCT_utils/utils.py#L68)). Le problème : l'id
patient est le reste du nom après découpe d'une liste fixe de marqueurs, et les
seuls points temporels de cette liste sont `_T1` et `_T2`. Un `P001_T3.nii.gz`
garde l'id `P001_T3`, ne s'apparie avec rien, et la paire est **silencieusement
ignorée** — pas d'exception. Le point temporel réel ne vient pas du nom mais de
l'argument `time_point`, c'est-à-dire du dossier ; seule l'extraction de l'id est
en cause. Les sites, dans le périmètre AREG :

| Fichier | Ligne | Forme |
|---|---|---|
| [AREG_CBCT/AREG_CBCT_utils/utils.py](AREG_CBCT/AREG_CBCT_utils/utils.py#L91) | 101 | chaîne de `split()`, scans et landmarks |
| [AREG_CBCT/AREG_CBCT_utils/utils.py](AREG_CBCT/AREG_CBCT_utils/utils.py#L139) | 144 | la même, recopiée pour la passe masques |
| [AREG/AREG_Method/CBCT.py](AREG/AREG_Method/CBCT.py#L1009) | 1014 | copie côté widget (comptage, `TestScan`) |
| [AREG/AREG_Method/Review.py](AREG/AREG_Method/Review.py#L28) | 39 | `patientIdFromFileName`, liste étendue (`_Center`, `_Pred`, `_U`, `_L`…) |
| [AREG_IOS/AREG_IOS.py](AREG_IOS/AREG_IOS.py#L318) | 318 | suppose que le scan T2 est nommé `_T2` |
| [AREG_IOSCBCT/AREG_IOSCBCT.py](AREG_IOSCBCT/AREG_IOSCBCT.py#L372) | 376 | regex `[Tt][0-2]` : un `_T3` ne matche rien, le patient est sauté |

Hors AREG, les mêmes chaînes vivent dans [ASO/ASO_Method/CBCT.py](ASO/ASO_Method/CBCT.py#L42),
[MRI2CBCT/MRI2CBCT_utils/utils_CBCT.py](MRI2CBCT/MRI2CBCT_utils/utils_CBCT.py#L41),
[MRI2CBCT_CLI/MRI2CBCT_CLI_utils/TMJ_crop.py](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/TMJ_crop.py#L21)
et deux fois dans [VFACE/VFACE_utils/createlistprocess.py](VFACE/VFACE_utils/createlistprocess.py#L2099).
La correction proposée dans la note est `re.sub(r"_[Tt]\d+$", "", ...)` appliquée
partout, **en respectant l'ordre des découpes** (un marqueur long doit être coupé
avant un marqueur court qui matcherait dedans). Elle n'est pas faite
délibérément : la réponse supportée aujourd'hui est de renommer les entrées.

**Le centre de rotation d'elastix est perdu.** `MatrixRetrieval` ne lit que
`TransformParameters` et **jamais `CenterOfRotationPoint`**. Un `EulerTransform`
elastix vaut `R·(x − c) + t + c` ; le `sitk.Euler3DTransform` reconstruit a son
centre à l'origine et vaut `R·x + t`. Les deux ne coïncident que si `c` est
l'origine ou si `R = I`. Comme `AutomaticTransformInitialization` est actif et
que le centre de rotation est dérivé de l'image **fixe** (T1, qui n'est centrée
que dans le mode Orientation), l'écart `(I − R)·c` n'est pas nul en général.
Et l'écart ne se limite pas au `.tfm` : le volume de sortie **n'est pas l'image
résultat d'elastix**, il est reconstruit par
`ResampleImage(sitk.ReadImage(moving_image_path), transform)`
([utils.py:686](AREG_CBCT/AREG_CBCT_utils/utils.py#L686)) à partir de cette même
matrice. `.tfm` et volume recalé sont donc cohérents entre eux, mais tous deux
s'écartent de ce qu'elastix a effectivement optimisé.

`CenterOfRotationPoint` n'apparaît **nulle part dans le dépôt** (vérifié par grep),
et `MatrixRetrieval` est **dupliqué à l'identique** dans
[MRI2CBCT_CLI/MRI2CBCT_CLI_utils/AREG_MRI.py:78](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/AREG_MRI.py#L78) :
le même écart s'applique au recalage IRM↔CBCT.

Hypothèse à tester plutôt qu'à croire : si le module donne malgré tout des
résultats corrects en pratique, c'est vraisemblablement parce que les volumes
arrivent déjà proches de l'origine — PRE_ASO recentre le T2 et ASO oriente le T1 —
de sorte que `c ≈ 0` et que `(I − R)·c` reste petit. Cela rend le résultat
dépendant d'un centrage préalable qui n'est garanti nulle part. Mesurer l'écart
sur un cas réel avant de conclure.

**Autres points :**

- `ApproxReg` / « Include Approximation Step » ne fait **rien** depuis septembre
  2025. La case reste cochée par défaut dans l'UI.
- Le dossier `<dossier T2>_Center` est créé **à côté du dossier d'entrée** de
  l'utilisateur, comme `<dossier T1>Or`. PRE_ASO saute les fichiers déjà
  présents : un second run avec des entrées modifiées réutilise les anciens.
- En mode Fully-Auto, AMASSS écrit les masques **dans le dossier T1 d'entrée**.
  À la pause `cbct_registration`, `ReviewReferenceFolder` étant ce même dossier,
  tous les masques du patient sont chargés dans la scène en plus du scan.
- Le fichier `fixed_image_masked.nii.gz` est réécrit pour chaque patient dans le
  même dossier temporaire.
- `SwitchType` ([AREG.py:1030](AREG/AREG.py#L1030)) réaffiche le sélecteur
  NIFTI/DCM après que `SwitchModeCBCT` l'a masqué : le résultat net est que
  **l'entrée DICOM n'est offerte qu'en mode Orientation**, à l'inverse de ce que
  `SwitchModeCBCT` semble vouloir. Et dans ce mode, `DCMInput` est passé au step
  AREG dont les dossiers contiennent déjà du NIfTI.
- `startStep` est appelé deux fois pour le premier step en CBCT
  ([AREG.py:1542](AREG/AREG.py#L1542) puis [AREG.py:1557](AREG/AREG.py#L1557)) :
  `executed_steps` contient un doublon, que `previousCorrectableStep` absorbe
  parce qu'il cherche la **dernière** occurrence.
- Le `.tfm` corrigé manuellement devient un `CompositeTransform`, pas un
  `Euler3DTransform` : un consommateur qui suppose une transformation simple
  peut ne pas le relire.
- Code mort relevé : `TestReference` ([CBCT.py:61](AREG/AREG_Method/CBCT.py#L61),
  qui appellerait `NumberScan` avec un seul argument et lèverait un `TypeError`),
  `GetSegmentationLabel`, `getGPUUsage`, `GetMatrixPatients` et `ModifiedDictPatients`
  (aucun appelant ne passe `matrix_folder` ni `todo_str`), `ElastixReg(initial_transform=...)`,
  et `DisplayAREGIOSCBCT` défini deux fois dans
  [Progress.py](AREG/AREG_Method/Progress.py#L135).

## 12. Littérature

Le papier de référence est **Anchling, Hutin, Huang, Barone, Roberts, Miranda,
Gurgel, Al Turkestani, Tinawi, Bianchi, Yatabe, Ruellas, Prieto, Cevidanes,
« Automated Orientation and Registration of Cone-Beam Computed Tomography
Scans », LNCS 14242, 2023, p. 43-58** —
[Springer](https://link.springer.com/chapter/10.1007/978-3-031-45249-9_5),
[PMC11104011](https://pmc.ncbi.nlm.nih.gov/articles/PMC11104011/).
Précision annoncée : < 3° et < 2 mm par rapport aux experts, moins de 5 min par cas.

**Le code diverge du papier sur trois points vérifiés :**

1. le papier décrit un recalage en deux temps — « VBR entre les images complètes,
   puis avec l'image masquée comme étape de raffinement », 10 000 itérations sur
   la passe masquée. Le code n'a plus qu'une passe masquée à 1500 itérations ;
2. le papier annonce **SimpleElastix** ; le code utilise `itk-elastix`
   (`itk.ElastixRegistrationMethod`) ;
3. le papier obtient les masques par **AMASSS / UNETR MONAI** ; AMASSS est
   aujourd'hui un **nnU-Net v2**.

Sur la question de fond — superposition voxel-based sur la base du crâne — la
référence historique du laboratoire est Cevidanes et al., *Superimposition of 3D
cone-beam CT models of orthognathic surgery patients* (2005,
[PubMed 16227481](https://pubmed.ncbi.nlm.nih.gov/16227481/)).

À ne pas confondre avec
[Accuracy and Reproducibility of Voxel Based Superimposition…, PLOS One 2011](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0016520),
qui n'est **pas** du laboratoire : il est de Nada, Maal, Kuijpers-Jagtman et al.
(Radboud UMC, Nimègue). C'est une validation indépendante de la méthode, ce qui
lui donne plus de poids, pas moins — mais l'attribuer au groupe serait une
erreur.

Dépôts : [lucanchling/AREG](https://github.com/lucanchling/AREG),
[DCBIA-OrthoLab/SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools).
Les pauses de revue et la navigation batch ne sont décrites dans aucune
publication : développement interne.

Références complètes, PDF récupérés et liens à consulter : [SOURCES.md](SOURCES.md).
