# VFACE — pipeline complet

Classification automatique de l'asymétrie faciale squelettique sur CBCT. VFACE
n'apprend rien et ne segmente rien lui-même : c'est un **orchestrateur** qui
enchaîne six autres modules du dépôt, en extrait des mesures linéaires et
angulaires, et finit par trois classifieurs LightGBM. C'est le module le plus
haut de la chaîne — l'arbre d'appels est l'information centrale.

Le principe clinique tient en une phrase : **le T2 est le miroir du patient
lui-même**. Il n'y a pas de second scan. Le scan est orienté, mirroré par
rapport au plan mid-sagittal, recalé sur l'original, et tout ce qui est mesuré
est un écart entre le patient et son propre reflet.

## 1. Situation dans la chaîne

Rien dans le dépôt n'appelle VFACE : [CMakeLists.txt:54](CMakeLists.txt#L54)
l'ajoute comme module terminal. Il appelle en revanche huit processus, dont
sept sont d'autres modules de l'extension. Tout est construit en une passe par
`CreateListProcess()`
([createlistprocess.py:117](VFACE/VFACE_utils/createlistprocess.py#L117)), qui
retourne une **liste de dictionnaires** `{Process, Parameter, Module, Display,
Review*}` ; le widget la déroule un élément à la fois.

| Appelé | Module Slicer | Rôle dans VFACE |
|---|---|---|
| MRI2CBCT resample | `mri2cbct_resample_cbct_mri` | rééchantillonnage 0.3 mm iso + recentrage |
| ASO PRE | `pre_aso_cbct` | centrage géométrique, écrit un `.tfm` |
| ALI-CBCT | `ali_cbct` | landmarks (orientation puis mesures) |
| ASO SEMI | `semi_aso_cbct` | orientation sur un gold standard |
| AMASSS | `amasss_cli` | masques osseux CB / MAND / MAX |
| AutoMatrix | `automatrix_cli` | application du miroir et des matrices AREG |
| AREG-CBCT | `areg_cbct` | recalage voxel Elastix rigide |
| VFACE_CLI | `vface_cli` | classification LightGBM |

Trois étapes sont des **fonctions Python** exécutées dans le thread principal
de Slicer, pas des CLI : `run_aq3dc`, `run_bds` (BatchDentalSegmentator /
nnU-Net), `batch_process` (heatmaps), plus `derive_landmarks` et `postprocess`.
`executeProcess()` ([VFACE.py:2443](VFACE/VFACE.py#L2443)) distingue les deux
par une batterie de neuf tests (`test1`..`test9`) sur le type de l'objet.

### L'arbre d'appels, mode « Full pipeline » + « Asymmetry Assesment » + « Quantitative + Visualization »

```
T1 (CBCT brut)
 ├─ resample 0.3mm iso, centré           -> T1 Resample/CBCT
 ├─ PRE_ASO x2 (MAX, CB)                 -> Centered T1 Scans/{MAX,CB} (+ .tfm)
 ├─ ALI (6 lm MAX) ─ SEMI_ASO(occlusal+midsag) -> Oriented T1 Scans/MAX
 ├─ ALI (7 lm CB)  ─ SEMI_ASO(Frankfort+midsag) -> Oriented T1 Scans/CB
 ├─ AMASSS CBMASK,MANDMASK (sur CB) et MAXMASK (sur MAX) -> T1 Masks
 ├─ AutoMatrix(Matrix_mirror.tfm) sur les scans orientés -> T2_Scan/{CB,MAX}
 ├─ AREG x3 (CB, MAX, MAND)              -> Registered Scan/<region>/<pat>_OutReg/
 ├─ ALI (tous les landmarks, sur CB)     -> T1 Landmarks/CB
 ├─ derive_landmarks (CB -> MAX, rigide) -> T1 Landmarks/MAX
 ├─ AutoMatrix miroir sur les landmarks  -> Mirrored Landmarks/{CB,MAX}
 ├─ AutoMatrix matrices AREG x3          -> Mirrored & Registered Landmarks/{CB,MAND,MAX}
 ├─ AQ3DC x3 (CB, MAND, MAX)             -> Measurements/Measurements_*.xlsx
 ├─ postprocess                          -> Measurements/PostProcess_Measurements.xlsx
 ├─ VFACE_CLI (LightGBM)                 -> Classification/Classification.xlsx
 ├─ BDS x5 (nnU-Net)                     -> VTK Files/{T1 CB,T1 MAX,T2 CB,T2 MAND,T2 MAX}
 └─ ModelToModel Distance x3             -> Heatmaps/
```

Le PDF [Janson module.pdf](VFACE/Resources/Janson%20module.pdf) est le schéma
de ce pipeline (extractible avec `pdftotext`), utile pour lire le code.

### Les quatre combos qui changent le plan

| Combo | Valeurs | Effet sur `CreateListProcess` |
|---|---|---|
| `comboBox3` « Where start? » | Full pipeline / File already Oriented / File already Registered | saute le bloc resample+ASO, ou tout le bloc amont jusqu'au recalage |
| `comboBox4` « Analysis Type » | Asymmetry Assesment / Longitudinal studies | miroir + classification, ou vrai T2 et **pas** de classification |
| `comboBox2` « Mode » | Quantitative / Visualization / les deux | active le bloc mesures, le bloc heatmaps, ou les deux |
| `comboBox` « Registration Type » | AREG / CMFReg | **seul effet réel** : `CMFReg` ajoute un miroir des masques dans `T2_Masks` |

**`CMFReg` est un cul-de-sac** : le dossier `T2_Masks`
([createlistprocess.py:518](VFACE/VFACE_utils/createlistprocess.py#L518)) n'est
lu par aucune étape en aval, et le recalage passe de toute façon par
`areg_cbct`. Choisir CMFReg ne change que le temps de calcul.

## 2. Fichiers en jeu

| Fichier | Lignes | Rôle |
|---|---|---|
| [VFACE/VFACE.py](VFACE/VFACE.py) | 2977 | widget : UI, pauses de revue, navigation batch, exécution séquentielle, nettoyage |
| [createlistprocess.py](VFACE/VFACE_utils/createlistprocess.py) | 2636 | **le plan de pipeline**, + `derive_landmarks`, `reorganizeStat`, `postprocess`, heatmaps |
| [functionaq3dc.py](VFACE/VFACE_utils/functionaq3dc.py) | 2484 | copie vendue du module AQ3DC ; seule `AQ3DCLogic` sert |
| [segmentation_logic.py](VFACE/VFACE_utils/segmentation_logic.py) | 1051 | pilotage de nnU-Net via `SlicerNNUNetLib`, exports VTK |
| [Measure.py](VFACE/VFACE_utils/Measure.py) | 956 | **les formules** : `Distance`, `Angle`, `Diff2Measure` |
| [review_steps.py](VFACE/VFACE_utils/review_steps.py) | 249 | catalogue des pauses, et `restrictStepToPatients` |
| [_batch_worker.py](VFACE/VFACE_utils/_batch_worker.py) | 235 | un sous-processus par paire de maillages pour la heatmap |
| [VFACE_CLI/VFACE_CLI.py](VFACE_CLI/VFACE_CLI.py) | 291 | chargement joblib + `predict` LightGBM |

**Où ça tourne.** Aucun environnement conda : tout est dans le Python de
Slicer. Les CLI passent par `slicer.cli.run` ; les étapes Python tournent
*dans* le thread principal (la fenêtre se fige, d'où le message explicite posé
avant, [VFACE.py:2482](VFACE/VFACE.py#L2482)). Seules deux dépendances sont
installées par `CheckDependency()` ([VFACE.py:1062](VFACE/VFACE.py#L1062)) :
`joblib` et `lightgbm`. `pytorch` et nnU-Net viennent de
`SlicerNNUNetLib`. CUDA : `run_bds` passe `device="cuda"` en dur
([createlistprocess.py:1553](VFACE/VFACE_utils/createlistprocess.py#L1553)),
avec repli CPU géré par `Parameter.isSelectedDeviceAvailable()`.

## 3. Entrées et prétraitements

**Entrée** : un dossier de CBCT T1, un par patient (`.nii`, `.nii.gz`, `.nrrd`,
`.nrrd.gz`, `.gipl`, `.gipl.gz`). Pas de segmentation, pas de landmark : VFACE
part du volume brut. `checkInputFolder()`
([VFACE.py:1221](VFACE/VFACE.py#L1221)) refuse de démarrer sur un dossier vide.

**Identité patient** : `patientIdFromFileName`
([functionaq3dc.py:1369](VFACE/VFACE_utils/functionaq3dc.py#L1369)) coupe le nom
sur `_Scan`, `_Or`, `_MAND`, `_MD`, `_MAX`, `_MX`, `_CB`, `_lm`, `_T2`, `_T1`,
`_Cl`, `.`. Le même enchaînement est dupliqué trois fois dans
`createlistprocess` (marqué `TIMEPOINT-SUFFIX`) : **seuls `_T1`/`_T2` sont
reconnus**, un `_T3` casse l'appariement en silence.

**Rééchantillonnage** : spacing `[0.3, 0.3, 0.3]`, `resample_size = "None"`,
`center = "True"` — la taille propre du volume est conservée, seul le spacing
change. Sortie dans `<out>/T1 Resample/CBCT`.

**Centrage** (`pre_aso_cbct`, `model_folder=False`) : purement géométrique,
translation du centre du volume à l'origine, plus un `.tfm` écrit à côté
([PRE_ASO_CBCT.py:217](ASO_CBCT/PRE_ASO_CBCT/PRE_ASO_CBCT.py#L217)). Aucun
réseau n'intervient ici.

**Orientation** : deux repères distincts, construits sur le *même* scan centré.

| Repère | Landmarks demandés à ALI | Gold standard | Suffixe |
|---|---|---|---|
| MAX | `ANS, IF, PNS, UL6O, UR1O, UR6O` | `Occlusal and Midsagittal Plane` | `_MAX_Or` |
| CB | `Ba, LPo, N, RPo, S, LOr, ROr` | `Frankfurt Horizontal and Midsagittal Plane` | `_CB_Or` |

`semi_aso_cbct` fait une init à 3 landmarks puis un
`vtkIterativeClosestPointTransform` rigide (1000 itérations,
`StartByMatchingCentroidsOn`) des landmarks du patient sur ceux du gold
([utils.py:620](ASO_CBCT/ASO_CBCT_utils/utils.py#L620)), et écrit
`<pat>_<suffixe>_transform.tfm` = l'inverse de (ASO ∘ centrage). Après quoi le
**plan mid-sagittal est en x = 0**, ce qui est la condition de validité du
miroir.

**Le miroir**. `Matrix_mirror.tfm` (release `AutoMatrixMirror`) est
`AffineTransform` de paramètres `-1 0 0 0 1 0 0 0 1`, translation nulle : une
réflexion pure d'axe x en LPS, c'est-à-dire la symétrie par rapport au plan
mid-sagittal. AutoMatrix l'applique aux volumes par `sitk.ResampleImageFilter`
et aux `.mrk.json` par `transform.GetInverse().TransformPoint`
([Automatrix_CLI.py:171](Automatrix_CLI/Automatrix_CLI.py#L171)).

**Système de coordonnées** : tout est en **LPS**. ALI écrit
`"coordinateSystem": "LPS"` ([io.py:36](ALI_CBCT/ALI_CBCT_utils/io.py#L36)),
`derive_landmarks` aussi, et `createDictPatient` lit le champ `position` brut
sans conversion. Les signes des composantes de mesure en découlent directement
(§5.1). Les seuls flips RAS↔LPS du module sont dans
`saveAdjustedRegistration()` (revue manuelle) et dans les exports VTK de
`segmentation_logic` (`Scale(-1,-1,1)` avant écriture).

## 4. Les modèles appelés

VFACE ne contient qu'un seul modèle en propre, les LightGBM. Les autres sont
ceux des modules amont, téléchargés par `DownloadAllFiles()`
([VFACE.py:950](VFACE/VFACE.py#L950)).

| Modèle | Origine | Nature |
|---|---|---|
| ALI-CBCT | release `v0.1-v2.0_models` (7 zips : Cranial Base, Lower Bones 1/2, Upper Bones v2, dents) | agents RL, `DNet` = `monai DenseNet` ([brain.py:48](ALI_CBCT/ALI_CBCT_utils/brain.py#L48)) |
| AMASSS | `AMASSS_CBCT/AMASSS_Models.zip` | UNet 3D, sortie label map |
| DentalSegmentator | `Dataset111_453CT_v100.zip` (SlicerDentalSegmentator v1.0.0-alpha) | nnU-Net 3d_fullres, fold 0 |
| `sym_asymm.txt`, `mand_asym.txt`, `max_asym.txt` | release `VFACE/V_FACE_Models.zip` | **LightGBM**, pickles joblib |

### 4.1 ALI-CBCT

Agents par renforcement : un agent par landmark, déplacement dans un voisinage
`agent_FOV = [64,64,64]`, deux échelles `spacing = [1, 0.3]` mm,
`speed_per_scale = [1,1]`, `spawn_radius = 10`. Six mouvements possibles
(`MOVEMENT_MATRIX_6`,
[constants.py:22](ALI_CBCT/ALI_CBCT_utils/constants.py#L22)). Sortie : un
`.mrk.json` par groupe anatomique (`CB`, `U`, `L`, `CI`), nommé
`<scan>_lm_Pred_<groupe>.mrk.json`.

Les landmarks demandés pour les mesures sont l'**union dédupliquée** des
colonnes `Point 1` / `Point 2 / Line` des listes MAND et CB
([createlistprocess.py:141](VFACE/VFACE_utils/createlistprocess.py#L141)) —
`dict.fromkeys` évite qu'un landmark partagé déclenche deux agents.

### 4.2 AMASSS — les masques

Deux appels : `CBMASK,MANDMASK` sur le scan CB-orienté, `MAXMASK` sur le scan
MAX-orienté, `merge="SEPARATE"`, `genVtk=False`, `prediction_ID="seg"`. Noms
produits : `<base>_seg_<STRUCT>MASK.nii.gz`
([AMASSS_CLI.py:601](AMASSS_CLI/AMASSS_CLI.py#L601)). Ces masques ne servent
qu'à **masquer l'image fixe du recalage**, pas à mesurer.

### 4.3 BDS / DentalSegmentator — les surfaces

`run_bds` appelle `run_dental_segmentation(model="DentalSegmentator",
device="cuda", export_formats = VTK | VTK_MERGED)`. nnU-Net produit un label
map à 5 classes (`Upper Skull`, `Mandible`, `Upper Teeth`, `Lower Teeth`,
`Mandibular canal`,
[segmentation_logic.py:600](VFACE/VFACE_utils/segmentation_logic.py#L600)),
converti en surfaces :

- `_exportMergedVTK` : `vtkDiscreteMarchingCubes` (un contour par valeur de
  label **présente**, indexé par position et non par valeur — le commentaire du
  code explique le bug corrigé), `vtkWindowedSincPolyDataFilter` 60 itérations
  passband 0.05, normales par cellule, `vtkQuadricDecimation` 0.4 par label,
  puis IJK→RAS→LPS avant écriture ;
- `_exportVTKPerLabel` : même chaîne sur la représentation « Closed surface »
  de chaque segment, un fichier par structure.

Les poids ne sont pas dans le dépôt : seuls `dataset.json` et `plans.json` sont
versionnés, et `PythonDependencyChecker` teste la présence de
`Dataset111_453CT/nnUNetTrainer__nnUNetPlans__3d_fullres/fold_0/checkpoint_final.pth`
avant de télécharger l'URL de
[download_info.json](VFACE/Resources/ML/download_info.json) (~220 Mo).
Les trois autres modèles proposés (`PediatricDentalsegmentator`,
`NasoMaxillaDentSeg`, `UniversalLabDentalsegmentator`) ont leur code de
téléchargement mais **ne sont jamais sélectionnés** par VFACE : code mort ici,
et leurs chemins `Path(__file__).parent/"Resources"` sont d'ailleurs faux d'un
niveau (`VFACE_utils/Resources/...`), contrairement au chemin corrigé du modèle
par défaut ([segmentation_logic.py:457](VFACE/VFACE_utils/segmentation_logic.py#L457)).

### 4.4 Le recalage — AREG-CBCT

`VoxelBasedRegistration` masque le T1 par le masque AMASSS correspondant puis
lance **Elastix rigide** (`make_rigid_param_map_deterministic`,
[utils.py:527](AREG_CBCT/AREG_CBCT_utils/utils.py#L527)) : 3 résolutions,
pyramide `8,8 4,4 2,2`, `AdvancedMattesMutualInformation` 64 bins,
`ConjugateGradient` 1500 itérations, `ImageSampler = Grid`,
`NumberOfThreads = 1` (déterminisme). Aucun apprentissage.

Sorties : `Registered Scan/<Cranial Base|Maxilla|Mandible>/<pat>_OutReg/`
contenant `<pat>_<CB|MAX|MAND>Scan_Reg.nii.gz` et
`<pat>_<CB|MAX|MAND>_Reg_matrix.tfm`.

Détail fragile : le choix du masque se fait par mot-clé dans le nom de fichier
(`CB`→`["cb"]`, `MAND`→`["mand","md"]`, `MAX`→`["max","mx"]`) et **premier
trouvé gagne** ([utils.py:160](AREG_CBCT/AREG_CBCT_utils/utils.py#L160)). Or
`<pat>_CB_Or_seg_MANDMASK.nii.gz` contient aussi « cb ». Ce n'est que l'ordre
alphabétique (`CBMASK` < `MANDMASK`) qui empêche le recalage de base du crâne
d'être masqué par la mandibule. Un renommage casse ça.

## 5. Le cœur algorithmique — les mesures

### 5.1 Les huit types de mesure

Tous instanciés par `AQ3DCLogic.createMeasurement`
([functionaq3dc.py:1995](VFACE/VFACE_utils/functionaq3dc.py#L1995)), à partir de
la colonne `Type of measurement` du xlsx — comparaison par **égalité exacte de
chaîne**. Les positions sont en LPS (`x` = gauche, `y` = postérieur,
`z` = supérieur).

| Type (chaîne exacte) | Entrées | Formule ([Measure.py](VFACE/VFACE_utils/Measure.py)) |
|---|---|---|
| `Distance between 2 points T1` / `T2` | P1, P2 au même temps | `d = p2 − p1` ; `(lr, ap, si) = (−dx, −dy, dz)` ; `3D = ‖d‖` ; arrondi 3 décimales |
| `Distance between 2 points T1 T2` | P1 @T1, P2 @T2 | identique, mais **croisée** entre les deux nuages : c'est la mesure d'asymétrie |
| `Distance point line T1` / `T2` | P, ligne (L1, L2) | `d = rejet(P − L2, L1 − L2)` = composante orthogonale à la ligne ; si `L1 ≈ L2` (`atol=1e-5`), `d = P − L1` |
| `Distance point line T1 T2` | deux mesures | `Diff2Measure` : `lr/ap/si` de T2 **moins** ceux de T1 ; `3D` recalculé comme `‖(lr,ap,si)‖` |
| `Angle between 2 lines T1` / `T2` | 2 lignes, même temps | voir ci-dessous |
| `Angle between 2 lines T1 T2` | 2 lignes T1, 2 lignes T2 | `Diff2Measure` composante à composante |
| `Angle line T1 and line T2` | ligne @T1, ligne @T2 | même calcul d'angle, lignes issues de temps différents |

**Formule d'angle** (`Angle.__computeAngles`,
[Measure.py:664](VFACE/VFACE_utils/Measure.py#L664)). `u = p2 − p1`,
`v = p4 − p3`. Pour chaque axe `a` de `[2, 0, 1]` — respectivement **yaw**
(plan axial), **pitch** (plan sagittal), **roll** (plan coronal) :

1. on supprime la composante `a` (projection 2D), on normalise ;
2. `θ = degrees(arctan2(‖u × v‖, u · v))` ;
3. si `p2 == p3` (les deux lignes partagent leur sommet) : `θ ← 180 − θ` — c'est
   ce qui transforme `RCo-RGo / RGo-Me` en angle goniaque anatomique ;
4. signe : `z = u_x·v_y − u_y·v_x` ; pour l'axe yaw le signe suit `z`, pour
   pitch et roll il est **inversé**.

Le bloc `complement_checkbox` (complément à 180°) est commenté :
[Measure.py:679](VFACE/VFACE_utils/Measure.py#L679).

**Sens des composantes**. `manageMeaningComponent()` remplit des étiquettes
(`R`/`L`, `A`/`P`, `S`/`I` pour le squelettique ; `M`/`D`, `B`/`L`, `E`/`I`
pour les dents ; `ClockWise`/`CounterC` pour les angles T1↔T2). Les
`*_Component` retournés sont des **valeurs absolues** ; c'est `reorganizeStat`
([createlistprocess.py:1597](VFACE/VFACE_utils/createlistprocess.py#L1597)) qui
leur rend un signe à partir de l'étiquette.

**Deux conventions opposées y cohabitent** : pour une ligne squelettique
`Vertical = −|si|` quand le sens est `S` (supérieur), alors que pour une ligne
dentaire `Vertical = −|si|` quand le sens est `I`. À vérifier avant de
réutiliser ces colonnes.
Un angle `Angle between 2 lines T1` ne passe dans aucune branche de
`manageMeaningComponent` (ni dentaire, ni T1↔T2) : ses étiquettes restent vides
et sa valeur reste **non signée**.

### 5.2 La liste par défaut (`DefaultList.zip`)

Hors dépôt, téléchargée par le bouton *Default* dans
`<Documents>/SlicerDownloads/V_FACE/DefaultList`. Le nom du fichier décide de
son rôle (`SplitMeasurements`,
[createlistprocess.py:1829](VFACE/VFACE_utils/createlistprocess.py#L1829)) :
`CB`/`CRANIAL`, `MAND`/`MANDIBLE`, `MAX`/`MAXILLA`, `FEAT`/`FEATURE`.

| Fichier | Contenu |
|---|---|
| `CB_measurement.xlsx` | 26 distances + 4 angles |
| `MAND_measurement.xlsx` | 15 distances (sous-ensemble de CB) |
| `MAX_measurement.xlsx` | 7 distances (sous-ensemble de CB) |
| `features.xlsx` | l'en-tête : `ID` + 14 features + `Asymmetry`, `Mand`, `Max` |

Les **16 distances T1↔T2** de CB (= asymétrie directe) : `RFZyg/LFZyg`,
`ROr/LOr`, `A/A`, `ANS/ANS`, `IF/IF`, `RInfOr/LInfOr`, `RMZyg/LMZyg`,
`RPF/LPF`, `UR6MB/UL6MB`, `B/B`, `Pog/Pog`, `Me/Me`, `RGo/LGo`, `RCo/LCo`,
`RAF/LAF`, `LR6MB/LL6MB`. Noter le motif : un point médian est comparé à
**lui-même** dans le miroir (`A/A`, `B/B`, `Me/Me`), un point latéral est
comparé à son **homologue controlatéral** (`RGo/LGo`) puisque le miroir a
échangé les côtés.

Les **10 distances T1 seules** sont des longueurs anatomiques classiques :
`RCo-Pog`, `LCo-Pog`, `RGo-Pog`, `LGo-Pog`, `RCo-RGo`, `LCo-LGo`, `RAF-RCo`,
`LAF-LCo`, `UR6MB-LR6MB`, `UL6MB-LL6MB`.

Les **4 angles** : `RCo-RGo / RGo-Me` et `LCo-LGo / LGo-Me` (angles goniaques,
T1 seul, sommet partagé donc complémentés à 180°) ; `LAF-RAF / RAF-LAF` et
`LPF-RPF / RPF-LPF` en `Angle line T1 and line T2`. **L'inversion de l'ordre
des points dans la ligne T2 est délibérée** : le miroir ayant échangé gauche et
droite, écrire `RAF-LAF` côté T2 remet les deux vecteurs quasi colinéaires, et
l'angle mesuré tend vers 0 pour un patient symétrique.

**Piège** : `create_list_landmark`
([createlistprocess.py:2054](VFACE/VFACE_utils/createlistprocess.py#L2054)) fait
`pd.read_excel(path)` **sans `sheet_name=None`** : seule la première feuille est
lue. Un landmark qui n'apparaîtrait que dans la feuille `Angle between 2 lines`
ne serait jamais demandé à ALI. Ça ne se voit pas avec la liste par défaut
parce que ses 9 landmarks d'angle figurent tous dans la feuille de distances.

### 5.3 `derive_landmarks` — les landmarks MAX sans second passage d'ALI

[createlistprocess.py:1428](VFACE/VFACE_utils/createlistprocess.py#L1428). ALI
n'est lancé qu'une fois, dans le repère CB. Les landmarks du repère MAX sont
obtenus par composition rigide :

```python
to_centred   = sitk.ReadTransform(<pat>_CB_Or_transform.tfm)
from_centred = sitk.ReadTransform(<pat>_MAX_Or_transform.tfm).GetInverse()
moved = from_centred.TransformPoint(to_centred.TransformPoint(p))
```

Les deux `.tfm` d'ASO partagent le même scan centré comme référence, donc le
centrage se simplifie et la composition est exacte. Gain : quelques minutes par
patient, et **un seul point d'édition manuelle** — corriger un landmark à la
pause `t1_landmarks` se propage automatiquement au repère MAX. Le regroupement
en fichiers de sortie reprend `GROUP_LABELS` d'ALI, lu par `ast.parse` sur
[constants.py](ALI_CBCT/ALI_CBCT_utils/constants.py) pour éviter d'importer
torch ([createlistprocess.py:1373](VFACE/VFACE_utils/createlistprocess.py#L1373)).

### 5.4 `reorganizeStat` puis `postprocess` — de la mesure à la feature

`run_aq3dc` produit une ligne par (patient × mesure) avec 16 colonnes
(`R-L Component/Meaning`, `A-P`, `S-I`, `3D Distance`, `Yaw`, `Pitch`, `Roll`).
`reorganizeStat` aplatit ça en colonnes signées `Transverse`, `AP`,
`Vertical`, `3D`, `Yaw`, `Pitch`, `Roll`, plus `BL`, `MD`, `Rotation`,
`Arch`, `Segment` pour les lignes dentaires. Les colonnes intégralement `"x"`
sont supprimées, donc `Measurements_MAND.xlsx` et `Measurements_MAX.xlsx` n'ont
pas de colonnes angulaires.

`postprocess` ([createlistprocess.py:2540](VFACE/VFACE_utils/createlistprocess.py#L2540))
fait le chemin inverse : il **décode chaque nom de colonne de `features.xlsx`**
pour savoir quelle ligne de quel xlsx aller lire.

```
CB_LPF_RPF/RPF_LPF_Roll
└┬┘ └──────┬────────┘└┬─┘
 │         │          └ composante  ("RL"->Transverse, "IS"->Vertical, "AP", Pitch, Yaw, Roll)
 │         └ landmarks ("/" -> libellé d'angle "LPF-RPF / RPF-LPF")
 └ fichier source (CB, MAND, MAX)
```

Quand le reste contient plus de 2 segments, la feature est une **moyenne** :
`CB_RAF_RCo_LAF_LCo_AP` = moyenne des composantes AP de `RAF - RCo` et
`LAF - LCo`. Sortie : `Measurements/PostProcess_Measurements.xlsx`, une ligne
par patient, colonnes `Asymmetry`/`Mand`/`Max` vides.

## 6. Le classifieur

`VFACE_CLI` charge trois pickles joblib
([VFACE_CLI.py:62](VFACE_CLI/VFACE_CLI.py#L62)). Ce sont des
**`lightgbm.sklearn.LGBMClassifier`** — pas un réseau, pas un arbre de règles
écrit à la main — vérifiés en les dépicklant :

| Modèle | Hyperparamètres | Features | Arbres retenus |
|---|---|---|---|
| `sym_asymm.txt` | `gbdt`, `objective=binary`, `num_leaves=31`, `learning_rate=0.03`, `n_estimators=5000`, `class_weight=balanced`, `random_state=42`, pas de régularisation | 14 | **459** |
| `mand_asym.txt` | idem | 7 | **3** |
| `max_asym.txt` | idem | 7 | **11** |

Les 5000 estimateurs annoncés ne sont jamais atteints (early stopping à
l'entraînement). Les sous-modèles sont donc minuscules : 3 et 11 arbres de 5 à
7 feuilles.

**Les 14 features** et l'importance en gain du modèle principal :

| Feature | Gain |
|---|---|
| `CB_Me_Me_RL` | 3640 |
| `MAND_RCo_RGo_LCo_LGo_IS` | 1378 |
| `CB_Pog_Pog_RL` | 348 |
| `CB_B_B_RL` | 72 |
| `CB_LAF_RAF/RAF_LAF_Yaw` | 58 |
| `MAX_RPF_LPF_AP` | 15 |
| `CB_LPF_RPF/RPF_LPF_Yaw` | 10 |
| `CB_LPF_RPF/RPF_LPF_Roll` | 8 |
| `MAX_RPF_LPF_IS` | 8 |
| `MAX_RPF_LPF_RL` | 6 |
| `CB_RPF_LPF_IS` | 6 |
| `MAND_Me_Me_RL` | 4 |
| `MAX_ANS_ANS_RL` | 2 |
| `CB_RAF_RCo_LAF_LCo_AP` | 2 |

Le modèle repose donc à ~90 % sur **deux mesures** : la déviation transverse du
menton (`Me` contre son miroir) et la différence verticale entre les deux
branches montantes.

**Chaînage des trois modèles** (`classify_symmetry`,
[VFACE_CLI.py:134](VFACE_CLI/VFACE_CLI.py#L134)) :

1. les colonnes contenant `/` sont renommées par `clean_name` (`/` → `_`), ce
   qui fait coïncider `CB_LAF_RAF/RAF_LAF_Yaw` avec le `feature_name_` stocké
   dans le modèle, `CB_LAF_RAF_RAF_LAF_Yaw` ;
2. `model_sym_asym.predict(df[feature_name_])` → `Asymmetry` ∈
   {`"Asymmetric"` (classe 0), `"Symmetric"` (classe 1)} ;
3. `Mand` et `Max` sont initialisés à `"False"`, puis **seuls les cas
   asymétriques** passent dans `mand_asym` (7 features, dont 5 du bloc CB) et
   `max_asym` (7 features), chacun renvoyant `"True"`/`"False"` ;
4. les deux sous-modèles sont indépendants : les deux peuvent valoir `"True"`
   (asymétrie mandibulaire **et** maxillaire), aucun n'est exclusif.

Sortie : `Classification/Classification.xlsx` = le tableau de features augmenté
des trois colonnes. C'est le livrable final.

## 7. La revue manuelle et la navigation batch

### 7.1 Les pauses

Ajoutées par le commit `2609bc4`. Une étape du plan peut porter des clés
`Review*` ; le widget s'arrête à la fin de l'étape, charge les résultats dans la
scène, et attend. Le catalogue est dans
[review_steps.py](VFACE/VFACE_utils/review_steps.py), séparé du pipeline pour
que le panneau puisse lister les pauses avant même que `CreateListProcess` ait
créé le moindre dossier.

| Id | Étiquette | Nature | Disponible si |
|---|---|---|---|
| `t1_landmarks_orientation_max` | landmarks d'orientation maxillaire | **éditable** | Full pipeline |
| `t1_oriented_max` | orientation maxillaire | vue seule | Full pipeline |
| `t1_landmarks_orientation_cb` | landmarks d'orientation base du crâne | **éditable** | Full pipeline |
| `t1_oriented_cb` | orientation base du crâne | vue seule | Full pipeline |
| `t1_masks` | masques osseux | vue seule | sauf « already Registered » |
| `mirror_masks` | masques mirrorés | vue seule | asymétrie + CMFReg |
| `mirror_scans` | scans mirrorés | vue seule | asymétrie |
| `registration_cb` / `_max` / `_mand` | recalages | **ajustable** | sauf « already Registered » |
| `t1_landmarks` | tous les landmarks de mesure | **éditable** | quantification |
| `bone_surfaces` | surfaces BDS (`_merged` seulement) | vue seule | visualisation |

Trois natures, trois comportements :

- **`VIEW`** : chargement et affichage, rien n'est réécrit.
- **`LANDMARKS`** : `loadEditableMarkups` force `SetLocked(False)` sur le nœud
  et sur chaque point, et rend l'affichage visible — ALI écrit ses points
  verrouillés et cachés. Les positions de départ sont mémorisées ; au
  `Continue`, `savePauseEdits` ne réécrit **que** les fichiers dont au moins un
  point a bougé ([VFACE.py:2095](VFACE/VFACE.py#L2095)).
- **`REGISTRATION`** : `setUpAdjustment` superpose le scan recalé en
  demi-opacité sur le T1, l'attache à un `vtkMRMLLinearTransformNode` avec
  poignées d'interaction. Au `Continue`, `saveAdjustedRegistration`
  ([VFACE.py:2126](VFACE/VFACE.py#L2126)) convertit le déplacement RAS en LPS
  (`flip = diag(-1,-1,1)`, `lps = flip @ ras @ flip`) et le **compose dans le
  `.tfm` d'AREG lui-même** :
  `sitk.CompositeTransform([areg, nudge.GetInverse()])`, parce qu'AutoMatrix en
  aval ne sait appliquer qu'une seule matrice. Le volume corrigé est ensuite
  durci et réécrit.

Deux contraintes d'ordonnancement importantes dans le plan :
le bloc quantification est placé **avant** le bloc visualisation, pour que la
seule pause éditable utile (`t1_landmarks`) n'arrive pas après cinq
segmentations nnU-Net ; et `enterPauseForReview` ne charge rien directement —
il arme un `QTimer.singleShot(0, self.beginReview)`, parce qu'on est dans un
callback d'observateur VTK où la boucle Qt ne tourne pas et où lire un volume
remplirait le pipe stdout de Slicer sans lecteur (même famille de bug que
`_briefCliOutput` et `outputToFile`).

`buildPauseQueue` ([VFACE.py:1713](VFACE/VFACE.py#L1713)) filtre les fichiers
trouvés par **identité patient**, jamais par date : un dossier de sortie
réutilisé contient les patients d'anciens runs. `belongsToRun` accepte un id
qui prolonge un id attendu à une frontière `_` (les heatmaps sortent en
`C_0001_Mandible_ModelDistance`). Si le filtre vide complètement la revue alors
que des fichiers existaient, il est **désarmé** plutôt que de sauter une pause
demandée.

### 7.2 Navigation batch : ce qui existe

Contrairement à ce qu'indique une note de projet plus ancienne, le portage
depuis AREG **a été fait** (`2609bc4`, branche `vface-review-rebuild`) :

- `Previous patient` / `Next patient` ([VFACE.py:2324](VFACE/VFACE.py#L2324)),
  qui sauvegardent l'édition en cours avant de changer de patient ;
- nom du patient et position `i / n` dans `reviewPatientLabel` ;
- **flagging** : `onReviewToggleFlag` marque le patient courant dans
  `self.review_flagged` ;
- **rollback sélectif** : `onReviewGoBack`
  ([VFACE.py:2351](VFACE/VFACE.py#L2351)) remonte à l'étape corrigeable la plus
  proche (`previousCorrectableStep`, qui ne s'arrête que sur `LANDMARKS` ou
  `REGISTRATION`), réinjecte les étapes intermédiaires en tête de
  `list_process`, et les **restreint aux patients marqués** via
  `restrictStepToPatients` — un dossier temporaire de liens symboliques
  (`shutil.copy` en repli), arborescence préservée ;
- `review_flagged_carry` transmet la liste des patients rejoués à la
  reconstruction de la file de revue suivante, pour que les autres gardent
  leurs résultats acceptés ;
- `clearReviewTempFolders` nettoie les dossiers de liens en fin de run.

Le bouton `Continue` est nommé `Next step` : déplacer entre patients et avancer
le run sont deux actions distinctes.

### 7.3 Navigation batch : ce qui manque réellement

Le trou est dans **`INPUT_KEYS`**
([review_steps.py:162](VFACE/VFACE_utils/review_steps.py#L162)) :

```python
INPUT_KEYS = ("input", "input_patient", "input_matrix")
```

Seuls ALI, PRE_ASO, SEMI_ASO (`input`) et AutoMatrix (`input_patient`,
`input_matrix`) sont narrowables. Manquent, pour le pipeline VFACE :
`inputVolume` (AMASSS), `t1_folder` / `t2_folder` / `mask_folder_t1` (AREG),
`input_folder_CBCT` (resample), `input_path` (BDS), `t1_path` / `t2_path`
(AQ3DC), `t1_dir` / `t2_dir` (heatmaps), `source_folder` &co
(`derive_landmarks`). AREG, lui, couvre `inputVolume`, `t1_folder`, `t2_folder`,
`T1`, `T2`, `IOS_folder`, `CBCT_folder`, `input_folder_CBCT`
([Review.py:717](AREG/AREG_Method/Review.py#L717)).

Conséquences concrètes :

- rollback depuis `t1_masks` → l'ASO est rejoué pour le seul patient marqué,
  mais les **deux AMASSS repartent sur tout le lot** (l'étape la plus lente) ;
- rollback depuis `registration_max` ou `_mand` → le recalage Elastix est
  rejoué pour tout le lot ;
- rollback depuis `bone_surfaces` → les cinq BDS repartent sur tout le lot.

À noter avant de « corriger » ça : narrower AQ3DC / `postprocess` /
la classification serait **nuisible**, parce que ces étapes écrivent un xlsx
agrégé reconstruit de zéro — les restreindre effacerait les lignes des patients
non marqués. Le correctif propre est d'ajouter les clés de volume/scan, pas
toutes les clés de dossier.

Deux autres limites, moindres :

- `previousCorrectableStep` cherche l'étape courante dans `executed_steps` **par
  identité** ; après un premier rollback, l'historique contient à la fois les
  étapes d'origine et leurs copies restreintes, et un second rollback rejoue une
  liste plus longue que nécessaire ;
- le compteur affiché (`Paused at step N/M`) n'est pas rembobiné par un
  rollback : `NumberProcess` augmente, `ActualProcess` ne redescend pas.

VFACE n'a pas non plus l'équivalent de `_normalisedId` / `_matchAcrossNaming`
d'AREG (appariement `P1` ↔ `P_0001`), mais ça ne lui sert pas : il n'a qu'une
modalité.

## 8. Post-traitements et sorties

| Dossier sous `OutputFolder` | Contenu | Survit au nettoyage |
|---|---|---|
| `T1 Resample/CBCT` | volumes 0.3 mm centrés | non |
| `Centered T1 Scans/{CB,MAX}` | volumes centrés + `.tfm` de centrage | non |
| `Oriented T1 Scans/{CB,MAX}` | `<pat>_{CB,MAX}_Or.nii.gz`, `_transform.tfm`, `_lm_*.mrk.json` | non |
| `T1 Masks` | `<base>_seg_{CB,MAND,MAX}MASK.nii.gz` | non |
| `T2_Scan/{CB,MAX}` ou `T2 Centered` | le miroir (ou le vrai T2 en longitudinal) | non |
| `T2_Masks` | masques mirrorés, **inutilisés** (CMFReg) | non |
| `Registered Scan/<region>/<pat>_OutReg/` | scan recalé + `_Reg_matrix.tfm` | non |
| `T1 Landmarks/{CB,MAX}` | `.mrk.json` ALI et dérivés | non |
| `Mirrored Landmarks/{CB,MAX}` | suffixe `_mir` | non |
| `Mirrored & Registered Landmarks/{CB,MAND,MAX}` | suffixes `_CB_reg`, `_MAND_reg`, `_MAX_reg` | non |
| `Measurements` | `Measurements_{CB,MAND,MAX}.xlsx`, `PostProcess_Measurements.xlsx` | **oui** si Quantitative |
| `Classification` | `Classification.xlsx` | **oui** si Quantitative |
| `VTK Files/{T1 CB,T1 MAX,T2 CB,T2 MAND,T2 MAX}` | surfaces BDS, LPS | **oui** si Visualization |
| `Heatmaps` | `<pat>_<zone>_ModelDistance.vtk` | **oui** si Visualization |

**Les heatmaps** (`batch_process`,
[createlistprocess.py:2219](VFACE/VFACE_utils/createlistprocess.py#L2219)) sont
des `vtkDistancePolyDataFilter` signés entre la surface T1 et la surface T2
appariée, en trois zones (`merged` CB, `Mandible`, `Upper_Skull`). Chaque paire
tourne dans **son propre processus** (`_batch_worker.py`) parce que le filtre
VTK alloue des locators côté C++ que `gc.collect()` ne rend pas ; jusqu'à
`min(4, cpu_count // 2)` workers en parallèle, timeout 600 s, stdout/stderr vers
des fichiers (jamais des pipes — un worker bavard bloquerait). Au-delà de 1 M de
points cumulés le worker décime à 0.5, au-delà de 2 M à 0.7, calcule la distance
sur les maillages décimés puis **réinterpole** sur le maillage original par
`vtkPointLocator`. L'array de sortie s'appelle `Distance`.

**Le nettoyage et son piège.** `OnEndProcess`
([VFACE.py:2766](VFACE/VFACE.py#L2766)), si « Keep Intermediate files » n'est
pas coché, supprime **tous les sous-dossiers** de `OutputFolder` sauf la liste
ci-dessus. Deux bugs ont été corrigés là et méritent d'être connus :

```python
output = (self._parameterNode.OutputFolder or "").strip()
if not output or not os.path.isabs(output) or not os.path.isdir(output):
    raise ValueError(...)   # rien n'est nettoyé
```

`Path("")` vaut `Path(".")`, et `iterdir()` parcourait alors le répertoire
courant de Slicer : un run sans dossier de sortie défini **vidait
l'arborescence de travail** de tous ses sous-dossiers. Et le test portait sur
`"Quantification"` alors que le menu dit `"Quantitative"`, si bien que le
nettoyage effaçait `Measurements` et `Classification` — les résultats
eux-mêmes. Les fichiers à la racine du dossier de sortie ne sont jamais
supprimés (seul `item.is_dir()` est traité).

## 9. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Rééchantillonnage, centrage | géométrique | CLI MRI2CBCT / ASO |
| Landmarks (orientation et mesures) | **réseau** (agents RL, DenseNet monai) | CLI ALI-CBCT |
| Orientation sur gold standard | ICP rigide VTK sur landmarks | CLI ASO SEMI |
| Masques osseux | **réseau** (UNet 3D AMASSS) | CLI AMASSS |
| Miroir | matrice fixe `diag(-1,1,1)` | CLI AutoMatrix |
| Recalage | Elastix rigide, MI, 3 résolutions | CLI AREG |
| Landmarks MAX | composition rigide de deux `.tfm` | Python, widget |
| Surfaces osseuses | **réseau** (nnU-Net DentalSegmentator) | Python, widget, CUDA |
| Mesures linéaires / angulaires | géométrique, numpy | Python, widget |
| Heatmaps | `vtkDistancePolyDataFilter` | sous-processus |
| Classification | **LightGBM** ×3 | CLI VFACE |

## 10. Pièges et points fragiles

- **`derive_landmarks` ne peut pas fonctionner hors « Full pipeline ».** En mode
  « File already Oriented » / « already Registered », `SplitOriented`
  ([createlistprocess.py:1877](VFACE/VFACE_utils/createlistprocess.py#L1877)) ne
  copie que les `.nii*` / `.nrrd*` vers `Oriented T1 Scans/`, **pas les
  `.tfm`**. L'étape « Deriving T1 Landmarks (MAX) » log alors
  `missing an orientation transform` pour chaque patient, `T1 Landmarks/MAX`
  reste vide, `Measurements_MAX.xlsx` aussi, et la classification manque de
  cinq features sur quatorze.
- **`CMFReg` ne change pas le recalage**, il ajoute seulement un dossier
  `T2_Masks` que rien ne lit (§1).
- **Suffixes `_T1`/`_T2` en dur**, trois copies marquées `TIMEPOINT-SUFFIX` dans
  `createlistprocess`. Un `_T3` casse l'appariement sans erreur. La note de
  référence est au-dessus de `GetPatients` dans
  [AREG_CBCT/AREG_CBCT_utils/utils.py:70](AREG_CBCT/AREG_CBCT_utils/utils.py#L70).
- **Sélection du masque par mot-clé** : `CBMASK` ne l'emporte sur `MANDMASK`
  que par l'ordre alphabétique (§4.4).
- **`_index_measurements` garde la première ligne** d'un libellé de landmarks
  répété. Deux mesures de types différents sur le même couple de points
  (p. ex. `B/B` en T1 et en T1↔T2) se masqueraient l'une l'autre.
- **`writeMeasurementExcel` écrit sans `index=False`** : les xlsx portent une
  colonne `Unnamed: 0` parasite.
- **Les listes de mesures sont appariées par nom de fichier** (`CB`, `MAND`,
  `MAX`, `FEAT` en majuscules dans le nom). Un fichier nommé
  `MAX_and_MAND.xlsx` tomberait dans la première branche qui matche.
- **Les étapes Python gèlent l'interface.** Pas de thread : `startPythonProcess`
  appelle la fonction directement, avec redirection de fd 1 et 2 vers un fichier
  temporaire (`outputToFile`,
  [VFACE.py:2537](VFACE/VFACE.py#L2537)) — torch et nnU-Net écrivent depuis le
  C, où remplacer `sys.stdout` ne suffirait pas.
- **Le paramètre `spacing` est passé comme liste Python** (`[0.3,0.3,0.3]`) à un
  paramètre déclaré `<string>` dans le XML, et le CLI fait `spacing.split(",")`.
  Ça marche par la sérialisation de Slicer, et c'est ce que fait aussi MRI2CBCT,
  mais c'est implicite.
- **Code mort notable** : tout le widget `AQ3DCWidget` (~1200 lignes de
  [functionaq3dc.py](VFACE/VFACE_utils/functionaq3dc.py), jamais instancié hors
  test) ; `Measure.isUtilMeasure` (l'appel est commenté,
  [functionaq3dc.py:2182](VFACE/VFACE_utils/functionaq3dc.py#L2182)) ;
  `check_skeletal` et `SKELETAL_LM_RL` dans
  [Measure.py](VFACE/VFACE_utils/Measure.py) ; `GetDictPatients` /
  `GetMatrixPatients` ; les variables `T1`/`T2` calculées et jamais utilisées
  dans `reorganizeStat` ; l'initialisation de `keep_sign` en `QCheckBox` dans
  `run_aq3dc` (la valeur est déjà `True`, jamais `None`) ; `VFACELogic.process`,
  `VFACETest` et `registerSampleData` (gabarit Slicer, les URLs
  `VFACE1`/`VFACE2` pointent sur des données de test génériques) ; les trois
  modèles de segmentation alternatifs de
  [segmentation_logic.py](VFACE/VFACE_utils/segmentation_logic.py).
- **Le bouton « Test Files »** télécharge l'archive d'AREG
  (`Or_FullyAuto.zip`), supprime son T2 (VFACE fabrique le sien) et pointe
  l'entrée sur le T1. Il n'existe pas d'archive de test propre à VFACE.

## 11. Littérature

Le travail publié correspondant est **« Automated classification of skeletal
facial asymmetry in CBCT using a reproducible 3D Slicer workflow for
patient-specific decision support »**, SPIE Medical Imaging 2026, vol. 13929,
art. 139292J, [doi:10.1117/12.3087010](https://doi.org/10.1117/12.3087010)
([page SPIE](https://spie.org/medical-imaging/presentation/Automated-classification-of-skeletal-facial-asymmetry-in-CBCT-using-a/13929-89)).
Le résumé public décrit 170 patients de classe III, et la même chaîne amont :
prétraitement standardisé, **mirroring**, recalage voxel, extraction de mesures
anatomiques.

**Le code diverge du papier sur la dernière étape.** Le résumé décrit une
approche **non supervisée** — réduction de dimension (PCA, t-SNE, UMAP) puis
*Spectral Clustering*, UMAP+RBF donnant le meilleur score de silhouette. Le
module, lui, embarque **trois classifieurs supervisés LightGBM binaires**
entraînés sur 14 features fixes. Les deux ne sont pas le même modèle ; rien
dans le dépôt ne relie les étiquettes d'entraînement des LightGBM aux clusters
du papier, et le script d'entraînement n'est pas versionné.

Pour les briques amont, les références sont celles de leurs modules :

- [AMASSS / ALI-CBCT — Automated Orientation and Registration of CBCT Scans (LNCS)](https://link.springer.com/chapter/10.1007/978-3-031-45249-9_5)
- [SlicerDentalSegmentator](https://github.com/gaudot/SlicerDentalSegmentator) (poids `Dataset111_453CT`)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)

Bibliographie détaillée, fichiers récupérés et liens à visiter :
[SOURCES.md](SOURCES.md).
