# BatchDentalSeg — pipeline complet

Segmentation dento-maxillo-faciale de CT/CBCT, en lot. Le module n'est pas un
réseau : c'est une **file d'attente et un chef d'orchestre** autour de
`nnUNetv2_predict`, avec quatre bundles de poids interchangeables. Tout
l'apprentissage est hors dépôt ; ce qui est écrit ici, ce sont le choix du
modèle, les garde-fous mémoire, la remise en géométrie et les exports.

## 1. Situation dans la chaîne

**Aucun autre module du dépôt n'appelle BatchDentalSeg**, et BatchDentalSeg
n'appelle aucun autre module du dépôt. C'est un outil terminal. Il dépend en
revanche d'une **extension Slicer externe**, `NNUNet`
([SlicerNNUNetLib](https://github.com/KitwareMedical/SlicerNNUnet)), dont il
utilise trois classes.

| Appelé | Origine | Rôle |
|---|---|---|
| `SlicerNNUNetLib.InstallLogic` | extension NNUNet | `setupPythonRequirements()` : installe nnunetv2 dans le Python de Slicer |
| `SlicerNNUNetLib.Parameter` | extension NNUNet | valide l'arborescence du modèle et construit la ligne de commande |
| `SlicerNNUNetLib.SegmentationLogic` | extension NNUNet | écrit le volume en NIfTI dans un dossier temporaire, lance `nnUNetv2_predict` en `QProcess`, recharge la segmentation |
| `OpenAnatomyExport` | extension SlicerOpenAnatomy | export glTF uniquement ; installée à la volée si absente |

Le module est une **variante batch de DentalSegmentator** (extension
[gaudot/SlicerDentalSegmentator](https://github.com/gaudot/SlicerDentalSegmentator)),
dont il reprend le widget, les icônes et le mécanisme de téléchargement des
poids. Les contributeurs déclarés dans
[BATCHDENTALSEG.py:30](BATCHDENTALSEG/BATCHDENTALSEG.py#L30) mêlent l'équipe
d'origine (Dot, Gajny, Fenioux, Pelletier) et l'ajout UoM (Tulissi).

## 2. Fichiers en jeu

| Fichier | Rôle | Taille |
|---|---|---|
| [BATCHDENTALSEG.py](BATCHDENTALSEG/BATCHDENTALSEG.py) | enveloppe `ScriptedLoadableModule`, ne fait qu'instancier le widget | 83 l. |
| [SegmentationWidget.py](BATCHDENTALSEG/BATCHDENTALSEGLib/SegmentationWidget.py) | **tout** : UI, file, choix de modèle, garde mémoire, crop, labels, exports | 2940 l. |
| [Queue.py](BATCHDENTALSEG/BATCHDENTALSEGLib/Queue.py) | file persistante `QueueItem` / `SegmentationQueue` | 204 l. |
| [PythonDependencyChecker.py](BATCHDENTALSEG/BATCHDENTALSEGLib/PythonDependencyChecker.py) | téléchargement et fraîcheur des poids DentalSegmentator | 184 l. |
| [Utils.py](BATCHDENTALSEG/BATCHDENTALSEGLib/Utils.py), [Signal.py](BATCHDENTALSEG/BATCHDENTALSEGLib/Signal.py), [IconPath.py](BATCHDENTALSEG/BATCHDENTALSEGLib/IconPath.py) | helpers Qt | |
| [Resources/ML/](BATCHDENTALSEG/Resources/ML) | racine des poids ; contient en dépôt `Dataset111_453CT/.../dataset.json` et `plans.json` | |

Tout tourne dans le **Python de Slicer**. `nnUNetv2_predict` est lancé comme
**processus fils** (`QProcess`), un scan à la fois — contrairement à AMASSS, qui
appelle l'API Python nnU-Net en processus.

`Resources/ML` n'est **pas** listé dans `MODULE_PYTHON_RESOURCES` de
[CMakeLists.txt](BATCHDENTALSEG/CMakeLists.txt) : dans une extension installée,
le dossier est entièrement créé à l'exécution. Les `.pth` sont `.gitignore`.

## 3. Entrées, parcours du dossier, nommage

### 3.1 Ce qui est accepté

`listVolumes()` ([Queue.py:28](BATCHDENTALSEG/BATCHDENTALSEGLib/Queue.py#L28))
fait un `glob` **non récursif** sur quatre motifs : `*.nii`, `*.nii.gz`,
`*.gipl`, `*.gipl.gz`. Les sous-dossiers ne sont pas visités, et **le NRRD n'est
pas reconnu** — format par défaut de Slicer, et format que les autres modules du
dépôt produisent couramment.

`volumeStem()` retire le suffixe composé : `case01.nii.gz` → `case01` (un
`Path.stem` laisserait `case01.nii`).

### 3.2 La file

Une entrée = **un scan**, pas un dossier
([QueueItem](BATCHDENTALSEG/BATCHDENTALSEGLib/Queue.py#L52)) :
`inputPath`, `outputDir`, `model`, `device`, `status`, `error`, `durationSec`,
`autoCrop`. Plusieurs dossiers avec des modèles différents peuvent donc être
empilés dans une même session.

`addFolder()` saute un scan si `<outputDir>/<stem>_Segmentation.nii.gz` existe
déjà (case *Skip scans already segmented*, cochée par défaut) ou s'il est déjà
dans la file.

**Persistance** : l'état est réécrit après chaque scan dans
`<outputDir>/.batchdentalseg_queue.json`. Au rechargement, un scan resté en
`running` (Slicer tué en cours d'inférence) est **rembobiné** en `pending` et
l'index revient dessus.

`isChunkBoundary()` : tous les `chunkSize` scans (défaut 5), `_coolDown()` fait
un nettoyage profond — suppression des nœuds orphelins, `torch.cuda.empty_cache()`
+ `ipc_collect()`, `gc.collect()`.

### 3.3 Ce que voit le réseau

Le widget ne prétraite rien. `SegmentationLogic._prepareInferenceDir()` fait un
`slicer.util.exportNode(volumeNode, <tmp>/input/volume_0000.nii.gz)`, et **tout
le prétraitement est celui de nnU-Net** : transposition selon
`transpose_forward`, resampling vers le `spacing` du plan, `CTNormalization`
(clip aux percentiles 0,5 % / 99,5 % du jeu d'entraînement puis centrage-réduction
par sa moyenne et son écart-type).

Le seul prétraitement écrit dans ce dépôt est le **crop automatique** (§5.2), et
il est optionnel, réservé au rejeu après échec mémoire.

## 4. Les quatre modèles

### 4.1 Ce que sélectionne le combo

`onApplyClickedForVolume()`
([SegmentationWidget.py:1729](BATCHDENTALSEG/BATCHDENTALSEGLib/SegmentationWidget.py#L1729))
est un `if/elif` de quatre branches quasi identiques. Chacune construit le même
objet :

```python
Parameter(folds="0", modelPath=basePath, device=self.deviceComboBox.currentText)
```

| Nom dans le combo | Dossier sous `Resources/ML` | Origine des poids |
|---|---|---|
| `DentalSegmentator` | `Dataset111_453CT/nnUNetTrainer__nnUNetPlans__3d_fullres` | zip de la **dernière release** de `gaudot/SlicerDentalSegmentator`, résolue via l'API GitHub |
| `PediatricDentalsegmentator` | `Dataset001_380CT/...` | 3 fichiers depuis [releases/download/PEDIATRICDENTALSEG_MODEL](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools/releases/download/PEDIATRICDENTALSEG_MODEL/checkpoint_final.pth) |
| `NasoMaxillaDentSeg` | `Dataset001_max4/...` | [releases/download/NASOMAXILLADENTSEG_MODEL](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools/releases/download/NASOMAXILLADENTSEG_MODEL/checkpoint_final.pth) |
| `UniversalLabDentalsegmentator` | `Dataset002_380CT/...` | [releases/download/UNIVERSALLAB_MODEL](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools/releases/download/UNIVERSALLAB_MODEL/checkpoint_final.pth) |

Les trois derniers suivent le même schéma : si
`<basePath>/fold_0/checkpoint_final.pth` manque, on télécharge trois fichiers
(`checkpoint_final.pth`, `dataset.json`, `plans.json`) par
`slicer.util.downloadFile`. Pas de somme de contrôle, pas de version, pas de
reprise : un téléchargement interrompu laisse un checkpoint tronqué que le code
considérera comme présent au run suivant.

DentalSegmentator passe par un chemin à part,
[PythonDependencyChecker](BATCHDENTALSEG/BATCHDENTALSEGLib/PythonDependencyChecker.py) :
`Github().get_repo("gaudot/SlicerDentalSegmentator")`, puis **le premier asset de
la première release** listée, téléchargé en streaming et dézippé. L'URL utilisée
est mémorisée dans `Resources/ML/download_info.json`, et une release plus
récente déclenche une proposition de mise à jour. Le fichier commité dans le
dépôt pointe sur
[Dataset111_453CT_v100.zip](https://github.com/gaudot/SlicerDentalSegmentator/releases/download/v1.0.0-alpha/Dataset111_453CT_v100.zip).

### 4.2 nnU-Net, vérifié dans le code

Oui, c'est du nnU-Net v2, et pas seulement de nom. La preuve est dans la chaîne
d'appel : `Parameter.asArgList()` construit littéralement

```
nnUNetv2_predict -i <tmp>/input -o <tmp>/output
  -d Dataset111_453CT -tr nnUNetTrainer -p nnUNetPlans -c 3d_fullres
  -f 0 -npp 1 -nps 1 -step_size 0.5 -device cuda -chk checkpoint_final.pth --disable_tta
```

`-d`, `-tr`, `-p`, `-c` sont **déduits des noms de dossiers** : le dossier parent
donne le `Dataset…`, et le nom du dossier de configuration est découpé sur `__`
en (trainer, plan, configuration). D'où l'exigence
`Dataset<id>/<trainer>__<plan>__<conf>/fold_<i>/checkpoint_final.pth`.

Paramètres non exposés à l'utilisateur, valeurs par défaut de
`SlicerNNUNetLib.Parameter` : `stepSize = 0.5`, `disableTta = True` (pas
d'augmentation miroir au test), `folds = "0"` (**un seul fold**, jamais
d'ensemble), `nProcessPreprocessing = nProcessSegmentationExport = 1`, forcés à
`0` sous macOS (nnU-Net s'y bloque à l'écriture à cause du multiprocessing).

Le seul réglage offert par l'UI est le device : `cuda` / `cpu` / `mps`. Si
indisponible, une **seule** question est posée pour toute la file
(`_deviceFallbackAccepted`), et en mode *Unattended* le repli CPU est accepté
d'office.

`nnUNet_raw`, `nnUNet_preprocessed` et `nnUNet_results` sont tous pointés sur le
dossier du modèle — trois variables d'environnement de processus, écrites par
`SegmentationLogic._startInferenceProcess`. Comme `os.environ` est global, deux
inférences concurrentes dans la même session Slicer se marcheraient dessus ;
ici la file est strictement séquentielle, donc le problème ne se pose pas.

### 4.3 Architecture et plan — ce qui est vérifiable

Seul `Dataset111_453CT` (DentalSegmentator) a ses JSON dans le dépôt. Relevé de
[plans.json](BATCHDENTALSEG/Resources/ML/Dataset111_453CT/nnUNetTrainer__nnUNetPlans__3d_fullres/plans.json) :

```
UNet_class_name = PlainConvUNet     base/max features = 32 / 320
n_conv_per_stage encodeur [2,2,2,2,2,2]  décodeur [2,2,2,2,2]
pool_op_kernel_sizes = [1,1,1], 4 x [2,2,2], [2,2,1]   conv_kernel 6 x [3,3,3]
patch_size = [128, 160, 112]    spacing = [0.4492, 0.3120, 0.4492] mm
transpose_forward = transpose_backward = [1, 0, 2]     batch_size = 2, batch_dice
normalization_schemes = CTNormalization
intensités de premier plan : médiane 1317, moy. 1274, s 558, p0,5 -110, p99,5 3067
```

Ce `plans.json` est au **format nnU-Net antérieur à 2.4** (champs
`UNet_class_name` / `pool_op_kernel_sizes` à plat, pas de bloc `architecture`),
là où les bundles AMASSS utilisent le format récent. Les deux restent lisibles
par nnunetv2 courant.

Les plans des trois autres modèles ne sont **pas déterminables depuis le
dépôt** : ils arrivent avec le téléchargement. Tout ce qu'on sait d'eux vient
des dictionnaires codés en dur dans le widget (§4.4) et du README.

### 4.4 Les labels produits, par modèle

`_get_active_label_map()`
([SegmentationWidget.py:1847](BATCHDENTALSEG/BATCHDENTALSEGLib/SegmentationWidget.py#L1847))
est **la** table de référence : c'est elle qui décide des valeurs écrites dans le
NIfTI de sortie.

**DentalSegmentator et PediatricDentalsegmentator** — 5 labels identiques,
confirmés par le `dataset.json` du bundle 111 : 1 Upper Skull (maxillaire
inclus), 2 Mandible, 3 Upper Teeth, 4 Lower Teeth, 5 Mandibular canal. Ce qui les
distingue n'est donc **pas la sortie mais les données d'entraînement** : denture
permanente (`453CT`, 7 institutions) contre denture mixte (`380CT`). Le code les
traite de façon rigoureusement identique — même table de labels, mêmes couleurs,
même post-traitement ; seul `_modelBasePath` diffère.

**NasoMaxillaDentSeg** — 6 labels, le maxillaire **détaché** du crâne :
1 Upper Skull, 2 Mandible, **3 Maxilla**, 4 Upper Teeth, 5 Lower Teeth,
6 Mandibular canal.

**UniversalLabDentalsegmentator** — 55 labels : les 32 dents permanentes
numérotées une par une (1 = 3ᵉ molaire supérieure droite → 32 = 3ᵉ molaire
inférieure droite, en tournant par l'arcade supérieure puis inférieure), puis
20 dents temporaires (33 → 52), puis `Mandible` = 53, `Maxilla` = 54,
`Mandibular canal` = 55. Pas de « Upper Skull » : ce modèle ne segmente pas la
boîte crânienne, contrairement à ce qu'affiche sa description dans l'UI et à ce
que dit le README.

Les valeurs sont posées sur chaque segment via un tag `LabelValue`
(`_segmentLabelValue`), qui a **priorité sur le nom** quand il est présent.

## 5. Le cœur non appris

### 5.1 Reconstruction du label map et remise en géométrie

`_buildLabelArray()`
([SegmentationWidget.py:1912](BATCHDENTALSEG/BATCHDENTALSEGLib/SegmentationWidget.py#L1912)) :

un seul `ExportSegmentsToLabelmapNode`, avec la liste explicite des `segmentId`
(ce qui épingle la correspondance « valeur exportée *i*+1 ↔ `segIds[i]` »), puis
une LUT numpy qui remappe vers les valeurs officielles en une passe
(`lut[exported]`). La version antérieure rastérisait l'étendue complète du volume
une fois par segment : 55 rastérisations d'un CBCT pleine bouche pour
UniversalLab.

### 5.2 Crop automatique (rejeu après échec mémoire)

Optionnel, posé par *Retry failed* après confirmation explicite.
`_applyAutoCrop()`
([SegmentationWidget.py:1017](BATCHDENTALSEG/BATCHDENTALSEGLib/SegmentationWidget.py#L1017)) :

- **seuil air/tissu** tolérant à l'échelle : si `array.min() < −800`, on est en
  unités Hounsfield et le seuil est `−500` ; sinon `min + 0.15 × (p99,5 − min)` ;
- boîte englobante des voxels au-dessus du seuil, élargie de
  `_CROP_MARGIN_MM = 15.0` mm convertie en voxels par axe ;
- si plus de `_CROP_MIN_GAIN = 0.85` des voxels sont conservés, **le crop est
  abandonné** : moins de 15 % gagnés ne valent pas le risque ;
- le sous-volume garde spacing et axes, **seule l'origine bouge**
  (`ijkToRas.MultiplyPoint([i0,j0,k0,1])`). Rien n'est interpolé.

`_restoreCropToOriginalGrid()` recolle le label map dans un tableau de la taille
d'origine par un simple décalage d'indices : la sortie est donc toujours sur la
grille du scan tel qu'acquis.

### 5.3 Garde mémoire — trois lignes de défense

Le commentaire du code donne le cas réel : un scan a rempli 114 Go sur une
machine de 125 Go, s'est fait tuer par l'OOM killer, et a laissé ses workers
multiprocessing vivants avec la mémoire.

**a) Estimation a priori**, `_estimatePeakRamGb()`
([SegmentationWidget.py:1161](BATCHDENTALSEG/BATCHDENTALSEGLib/SegmentationWidget.py#L1161)).
Le volume physique du champ de vue étant indépendant du spacing, le nombre de
voxels rééchantillonnés vaut `fovMm3 / targetVoxelMm3`. Le pic est atteint dans
`convert_predicted_logits_to_segmentation_with_correct_shape`, où coexistent par
classe : l'accumulateur de fenêtre glissante (`torch.half` sur la grille
rééchantillonnée, 2 octets), sa copie float64 (`data = data.astype(float)` sur
tout le 4D d'un coup, 8 octets) et `reshaped_final` (`torch.half` sur la grille
d'origine, 2 octets). D'où
`logitsGb = (10 × C × Vresampled + 2 × C × Voriginal) / 2³⁰`, plus
`8 × (Voriginal + Vresampled)` pour les transitoires float64 de `skimage.resize`,
plus `_RAM_FIXED_OVERHEAD_GB = 4.0` (torch, poids, workers). Le `spacing` et le
nombre de labels sont lus dans le **même** dossier de configuration, pour ne pas
croiser le spacing d'un modèle avec le compte de labels d'un autre.

Budget = `RAM libre × ramLimitSpinBox` (défaut **85 %**). Au-dessus, le scan est
marqué `failed` avec le motif, sans jamais démarrer nnU-Net.

**b) Surveillance pendant l'exécution** : `_onMemCheck` échantillonne toutes les
`_RAM_SAMPLE_MS = 3000` ms ; il faut `_RAM_CONSECUTIVE_HITS = 2` dépassements
consécutifs pour tuer (un pic transitoire ne doit pas condamner un bon scan).

**c) Reprise de la mémoire** : `_killInferenceTree()` tue **l'arbre complet** —
`QProcess.kill()` n'atteint que l'enfant direct, or nnU-Net fait du
multiprocessing. `_reclaimStrayProcesses()` balaie les processus dont la ligne
de commande contient `nnunetv2_predict`, `nnunetv2/inference` ou `nnunet` et qui
n'appartiennent plus à personne. Bouton *Free memory* pour le faire à la main.

### 5.4 Détection de fin par repli

`_checkInferenceCompletionFallback()`
([SegmentationWidget.py:2514](BATCHDENTALSEG/BATCHDENTALSEGLib/SegmentationWidget.py#L2514)) :
quand la ligne « done with volume » apparaît dans la sortie de nnU-Net, un timer
vérifie toutes les 1,5 s la taille du fichier de sortie ; **deux mesures égales
consécutives** ⇒ finalisation forcée, même si le signal `finished` du `QProcess`
n'est jamais arrivé. Abandon après 40 tentatives (60 s).

Garde-fou complémentaire : un watchdog par scan
(`itemTimeoutSpinBox`, défaut **60 min**) marque le scan en échec et passe au
suivant. `_finishCurrentItem` est le **point de sortie unique**, protégé par
`_itemFinalized` contre la double avancée.

### 5.5 Correction du miroir (UniversalLab seulement)

`onResolveMirroring()`
([SegmentationWidget.py:1308](BATCHDENTALSEG/BATCHDENTALSEGLib/SegmentationWidget.py#L1308)),
bouton visible uniquement pour UniversalLab. Le réseau confond régulièrement
gauche et droite ; la correction est purement géométrique :

1. reconstruction du label map officiel (§5.1), puis coordonnée RAS *R* de
   chaque voxel de premier plan **en numpy** (`m00·x + m01·y + m02·z + m03`) — la
   version précédente appelait `vtkMatrix4x4.MultiplyPoint` une fois par voxel et
   par label ;
2. **plan sagittal** = moyenne des centroïdes *R* des quatre incisives centrales
   (labels 8, 9, 24, 25) ; si l'une manque, la correction est refusée ;
3. pour chaque label latéralisé, les voxels du mauvais côté du plan reçoivent la
   valeur du label symétrique (table construite par substitution
   `left` ↔ `right` dans le nom) ; `{53, 54, 55}` sont **protégés**.

Le résultat va dans un nouveau nœud `<nom>_Mirrored`, l'original est conservé.

### 5.6 Post-traitement absent

`_postProcessSegments()` ne fait que journaliser deux lignes ;
`_keepLargestIsland()` et `_removeSmallIsland()` (qui utiliserait
`_minimumIslandSize_mm3 = 60`) **ne sont appelées nulle part** — code mort hérité
de DentalSegmentator amont. Aucun nettoyage morphologique n'est donc appliqué :
ce qui sort est la sortie brute de nnU-Net, avec son propre post-traitement
interne s'il est présent dans le bundle.

## 6. Sorties

`onInferenceFinished` écrit **systématiquement**, quels que soient les formats
cochés, `<outputFolder>/<stem>_Segmentation.nii.gz` : carte de labels aux valeurs
de `_get_active_label_map`, sur la géométrie (spacing, origine, `IJKToRAS`) du
volume d'origine — non croppé si un crop a eu lieu. C'est ce fichier que
`expectedOutputPath()` cherche pour décider qu'un scan est déjà traité.

Formats additionnels, cases à cocher, tous écrits dans le même dossier :

| Format | Fonction | Nommage | Détails |
|---|---|---|---|
| STL, OBJ | `ExportSegmentsClosedSurfaceRepresentationToFiles` | un fichier par segment | lissage 1.0, pas de fusion |
| VTK (par label) | `_exportVTKPerLabel` | `<segNodeName>_<labelName>.vtk` | clean → `vtkWindowedSincPolyDataFilter` (60 it., `passBand` 0,05, lissage des bords/arêtes vives/non-manifold) → normales de cellules → `vtkQuadricDecimation` 40 % → **flip RAS→LPS** (`Scale(-1,-1,1)`), binaire |
| VTK (fusionné) | `_exportMergedVTK` | `<segNodeName>_merged.vtk` | `vtkDiscreteMarchingCubes` **un contour par label présent**, même chaîne de lissage, puis seuillage par label, décimation 40 %, tableau de cellules `Label` constant, concaténation, flip LPS |
| NIfTI (case) | `ExportSegmentsBinaryLabelmapRepresentationToFiles` | un `.nii.gz` **binaire par segment** | à ne pas confondre avec la carte de labels ci-dessus |
| glTF | `OpenAnatomyExport` | | facteur de décimation réglable (défaut 0,9) ; installe SlicerOpenAnatomy si besoin |

Le nom des fichiers de maillage dérive du nom du **nœud** de segmentation,
`<stem>_Segmentation`, pas du nom du scan : les noms de segments sont assainis
par `re.sub(r"[^0-9A-Za-z_-]+", "_", ...)`.

Un échec d'export de maillage **ne fait pas échouer le scan** : le NIfTI est déjà
écrit, le scan est marqué `done` avec un `export warning`.

Un bug corrigé, documenté dans le code de `_exportMergedVTK` :
`vtkDiscreteMarchingCubes.SetValue` prend un **index** de contour, pas une valeur
de label. Passer le label comme index laissait l'index 0 à la valeur de contour
0.0, donc le fond était contouré, lissé et normalé avant d'être jeté.

## 7. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Prétraitement (transposition, resampling, `CTNormalization`) | déterministe, piloté par `plans.json` | `nnUNetv2_predict`, processus fils |
| Segmentation | **réseau** `PlainConvUNet` 3D, 1 fold, sans TTA | idem |
| Crop automatique | géométrique (seuil d'air + boîte englobante) | widget, numpy |
| Remise sur la grille d'origine | décalage d'indices, aucune interpolation | widget, numpy |
| Reconstruction du label map | export unique + LUT | widget, VTK/numpy |
| Correction du miroir | géométrique (plan sagittal sur les incisives) | widget, numpy |
| Maillages | marching cubes + windowed-sinc + décimation quadrique | widget, VTK |
| Estimation et garde mémoire | arithmétique sur le FOV et les plans | widget, psutil |

Le seul apprentissage est celui, hors dépôt, des quatre checkpoints.

## 8. Environnement

Installé **une fois par session**, au premier *Apply*, par
`_runSetupThenStartQueue()`
([SegmentationWidget.py:1651](BATCHDENTALSEG/BATCHDENTALSEGLib/SegmentationWidget.py#L1651)) :

1. `pip install light-the-torch`, puis `python -m light_the_torch install torch
   torchvision` — `ltt` choisit la roue CUDA correspondant au pilote détecté,
   **aucune version n'est épinglée** ;
2. `pip install numexpr>=2.10.2` ;
3. `pip install numpy<2.0 numexpr>=2.10.2 psutil`, via `PipRunner`, un `QProcess`
   qui rend la main à l'UI ;
4. `SlicerNNUNetLib.InstallLogic().setupPythonRequirements()` : `nnunetv2`,
   hors dépôt ;
5. `PythonDependencyChecker.downloadWeightsIfNeeded()` : poids DentalSegmentator
   uniquement.

`numpy<2.0` pour la même raison que dans AMASSS : les roues torch courantes sont
compilées contre numpy 1.x.

L'extension **NNUNet doit être installée manuellement** : son absence est
détectée (`import SlicerNNUNetLib`) et produit un message demandant de
l'installer et de redémarrer. `SlicerOpenAnatomy`, elle, s'installe toute seule
au premier export glTF.

Pas d'environnement conda, pas de WSL. GPU optionnel (`cpu`, `mps` disponibles),
au prix d'« environ une heure par scan » selon le message de repli.

## 9. Pièges et points fragiles

- **Les noms de segments et la table de labels divergent pour
  NasoMaxillaDentSeg.** `_get_active_label_map` donne `Maxilla = 3`,
  `Upper Teeth = 4`, `Lower Teeth = 5`, `Mandibular canal = 6`, tandis que
  `_updateSegmentationDisplay`
  ([SegmentationWidget.py:2385](BATCHDENTALSEG/BATCHDENTALSEGLib/SegmentationWidget.py#L2385))
  renomme `Segment_1..6` avec la liste
  `["Upper Skull", "Mandible", "Upper Teeth", "Lower Teeth", "Mandibular canal", "Maxilla "]`.

  Le premier effet est **visible à l'écran**, avant toute question d'export : la
  liste n'est pas dans l'ordre de la table, donc les quatre derniers segments
  reçoivent le mauvais nom, la mauvaise couleur et la mauvaise opacité.

  | Segment | Structure réelle | Nom affiché |
  |---|---|---|
  | `Segment_3` | Maxilla | « Upper Teeth » |
  | `Segment_4` | Upper Teeth | « Lower Teeth » |
  | `Segment_5` | Lower Teeth | « Mandibular canal » |
  | `Segment_6` | Mandibular canal | « Maxilla » (avec espace final) |

  Le correctif est de réordonner la liste — et les listes `colors` et `opacities`
  qui l'accompagnent — sur `_get_active_label_map`, plutôt que de se contenter de
  retirer l'espace.

  Or le renommage a lieu **avant** la pose des tags `LabelValue`, et
  `_segmentLabelValue` retombe alors sur le nom : `Segment_3`, qui porte
  réellement le label 3 (maxillaire), est renommé « Upper Teeth » et **exporté
  avec la valeur 4**. Pire, `"Maxilla "` porte un **espace final** : la recherche
  dans la table échoue, `Segment_6` (le canal mandibulaire) est journalisé
  « unexpected segment » et **perdu** dans le NIfTI. Les deux listes
  correspondent en revanche parfaitement pour les trois autres modèles.
- **Les quatre branches de `onApplyClickedForVolume` sont du copier-coller** :
  celle d'UniversalLab nomme encore sa variable `pediatricCheckpoint` et
  journalise « Downloading pediatricdentalseg model… ». Cosmétique, mais trompeur
  en lecture de logs.
- **Télécharger les poids DentalSegmentator efface les trois autres modèles** :
  `downloadWeights()` fait `shutil.rmtree(self.destWeightFolder)` sur
  `Resources/ML`, qui contient aussi `Dataset001_380CT`, `Dataset001_max4` et
  `Dataset002_380CT`. Et `areWeightsMissing()` teste `rglob("dataset.json")`
  **n'importe où** sous `Resources/ML` : si seul le modèle pédiatrique est
  présent, le checker croit DentalSegmentator installé.
- **Résolution de release fragile** : `assets[0]` parmi tous les assets de toutes
  les releases, via un client GitHub **non authentifié** (60 requêtes/h par IP).
  Un asset ajouté en tête de la dernière release change le modèle téléchargé. Et
  **aucun contrôle d'intégrité** sur les trois checkpoints téléchargés un par un :
  un fichier tronqué est indiscernable d'un fichier complet.
- **Le NRRD n'est pas reconnu** et les sous-dossiers ne sont pas parcourus
  (`listVolumes`), alors que les autres modules du dépôt produisent volontiers du
  NRRD et des arborescences. **Collision de noms** possible : deux scans de
  dossiers différents et de même nom de base écrasent le même
  `<stem>_Segmentation.nii.gz`.
- **Un seul fold, jamais d'ensemble** (`folds="0"`) : un bundle qui publierait
  `fold_1..4` les verrait ignorés.
- **`os.environ['nnUNet_results']`** est réécrit à chaque scan par
  `SegmentationLogic` : inoffensif ici (file séquentielle), dangereux si une
  autre inférence nnU-Net tourne dans la même session Slicer.
- **Code mort** : `_saveSegmentationAsNifti`, `_postProcessSegments`,
  `_keepLargestIsland`, `_removeSmallIsland`, `onExportClicked` (le bouton
  correspondant n'est pas branché dans le layout batch).
- **`Resources/ML` n'est pas installé par CMake** : en extension packagée, les
  `dataset.json` / `plans.json` du dépôt ne sont pas là, et l'estimation mémoire
  a priori (§5.3) retourne `None` tant que les poids ne sont pas téléchargés —
  elle laisse alors passer le scan.

## 10. Littérature

**DentalSegmentator** est publié :

> Dot G., Chaurasia A., Dubois G., Savoldelli C., Haghighat S., Azimian S.,
> Rahbar Taramsari A., Sivaramakrishnan G., Issa J., Dubey A., Schouman T.,
> Gajny L. *DentalSegmentator: robust open source deep learning-based CT and CBCT
> image segmentation.* Journal of Dentistry 147:105130, 2024.
> [doi:10.1016/j.jdent.2024.105130](https://doi.org/10.1016/j.jdent.2024.105130)
> — PMID 38878813

nnU-Net v2 (v2.2 d'après la notice Zenodo des poids), **470 scans CT et CBCT** de
7 institutions à l'entraînement, 5 structures, testé en hold-out sur 256 scans
(133 internes, 123 externes) : DSC 92,2 ± 6,3 % en interne, 94,2 ± 7,4 % en
externe. Le `dataset.json` livré ici annonce `numTraining = 453`, cohérent avec
le corpus décrit. Sur ce modèle, code et papier concordent. Les poids sont aussi
publiés en CC-BY-4.0 sur [Zenodo](https://zenodo.org/records/10829675)
(DOI concept `10.5281/zenodo.10829674`) — mais ce module les prend depuis les
releases GitHub, pas depuis Zenodo.

Le socle méthodologique :

> Isensee F., Jaeger P.F., Kohl S.A.A., Petersen J., Maier-Hein K.H. *nnU-Net: a
> self-configuring method for deep learning-based biomedical image segmentation.*
> Nature Methods 18(2):203-211, 2021.
> [doi:10.1038/s41592-020-01008-z](https://doi.org/10.1038/s41592-020-01008-z)

**Les trois variantes ne sont rattachées à aucune publication dans le dépôt.**
Le [README](README.md) annonce 513 scans CBCT en denture mixte pour
PediatricDentalSegmentator et UniversalLabDentalSegmentator, et 135 scans pour
NasoMaxillaDentalSegmentator, sans référence ni jeu de test. Ces chiffres ne
sont vérifiables nulle part dans le code : les `dataset.json` correspondants
n'arrivent qu'avec le téléchargement des poids. À traiter comme des affirmations
internes tant qu'une publication ne les couvre pas.

- [gaudot/SlicerDentalSegmentator](https://github.com/gaudot/SlicerDentalSegmentator) — extension amont, et source des poids DentalSegmentator
- [KitwareMedical/SlicerNNUnet](https://github.com/KitwareMedical/SlicerNNUnet) — l'extension `NNUNet` requise
- [MIC-DKFZ/nnUNet](https://github.com/MIC-DKFZ/nnUNet)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)

Références complètes, PDF récupérés et liens à consulter : [SOURCES.md](SOURCES.md).
