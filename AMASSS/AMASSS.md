# AMASSS — pipeline complet

Segmentation automatique multi-structures de CBCT crânio-faciaux. Une structure
anatomique = un réseau binaire. Le backend est **nnU-Net v2**, appelé par l'API
Python : il n'y a plus, dans le code actuel, ni réseau monai, ni
`sliding_window_inference` écrit à la main, ni prétraitement d'intensité maison.

## 1. Situation dans la chaîne

AMASSS est à la fois un module terminal (le widget AMASSS) et une **brique
réutilisée par trois autres outils**, qui appellent tous le même CLI via
`slicer.modules.amasss_cli`.

| Appelant | Fichier | Usage |
|---|---|---|
| widget AMASSS | [AMASSS.py:1638](AMASSS/AMASSS.py#L1638) | segmentation pilotée par l'opérateur |
| AREG_CBCT (semi-auto, fully-auto, orienté) | [CBCT.py:341](AREG/AREG_Method/CBCT.py#L341), [470](AREG/AREG_Method/CBCT.py#L470), [555](AREG/AREG_Method/CBCT.py#L555), [840](AREG/AREG_Method/CBCT.py#L840), [918](AREG/AREG_Method/CBCT.py#L918) | deux rôles distincts : **masques** de recalage (`merge=SEPARATE`, `genVtk=False`) avant AREG, puis **segmentations** livrables après |
| VFACE | [createlistprocess.py:126](VFACE/VFACE_utils/createlistprocess.py#L126) | segmentation dans la chaîne d'analyse d'asymétrie |

AMASSS n'appelle rien d'autre : pas de sous-processus conda, pas d'autre module.
Son unique dépendance externe est le paquet pip `nnunetv2`, importé
**paresseusement** dans les fonctions qui l'utilisent.

Distinction importante pour AREG : les codes `CBMASK` / `MANDMASK` / `MAXMASK`
ne sont pas des post-traitements des segmentations `CB` / `MAND` / `MAX`, ce sont
**des modèles entraînés séparément**, sur d'autres données et à une autre
résolution (§4).

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [AMASSS/AMASSS.py](AMASSS/AMASSS.py) | widget Slicer, 1654 lignes dont ~450 de feuilles de style clair/sombre | Python de Slicer |
| [AMASSS_CLI/AMASSS_CLI.py](AMASSS_CLI/AMASSS_CLI.py) | toute la logique : découverte des modèles, inférence, assemblage des sorties | Python de Slicer, via `slicer.cli.run` |
| [AMASSS_CLI/AMASSS_CLI.xml](AMASSS_CLI/AMASSS_CLI.xml) | déclaration des **12 paramètres positionnels** | — |

Le CLI **n'est pas** lancé dans un environnement conda : `slicer.cli.run` le
démarre dans le Python de Slicer, et depuis le portage de septembre 2026
([109e1ed](AMASSS_CLI/AMASSS_CLI.py)) l'inférence nnU-Net tourne **dans ce
processus**, et non plus dans un `nnUNetv2_predict` fils.

CUDA n'est pas requis : `ResolveDevice()`
([AMASSS_CLI.py:81](AMASSS_CLI/AMASSS_CLI.py#L81)) retombe sur CPU en le
signalant. En pratique le CPU est inutilisable sur un batch (le resampling
scipy mono-cœur domine, cf. §5.1).

**Les arguments sont positionnels et lus par index** dans `sys.argv`
([AMASSS_CLI.py:922](AMASSS_CLI/AMASSS_CLI.py#L922)), sans `argparse` malgré
l'import. L'ordre du XML fait donc foi : `inputVolume` (fichier **ou** dossier),
`modelDirectory`, `skullStructure` (codes séparés par virgule), `merge`
(`MERGE` / `SEPARATE` / les deux, découpé sur `[, ]+`), `genVtk`,
`save_in_folder`, `output_folder`, `vtk_smooth`, `prediction_ID` (défaut `Pred`),
`temp_fold` (**effacé au démarrage**), `SegmentInput`, `DCMInput` (**jamais
utilisé**).

Le widget construit aussi `param["highDefinition"]`
([AMASSS.py:935](AMASSS/AMASSS.py#L935)) : **ce paramètre n'existe pas dans le
XML**, il est silencieusement jeté. Voir §9.

## 3. Entrées et prétraitements

### 3.1 Découverte des fichiers

`main()` accepte un fichier ou un dossier, parcouru en **`os.walk` récursif**
([AMASSS_CLI.py:676](AMASSS_CLI/AMASSS_CLI.py#L676)) — nécessaire parce qu'AREG
écrit ses scans recalés dans `<output>/<Region>/<patient>_OutReg/`. Extensions
retenues : `.nii`, `.nii.gz`, `.nrrd`, `.nrrd.gz`. Deux filtres : tout nom
contenant `MASK` est ignoré, et si `isSegmentInput` est faux, tout nom contenant
`_<prediction_ID>_` l'est aussi — c'est la sortie d'un passage précédent, la
re-segmenter donnerait un masque vide.

Le widget, lui, compte les fichiers avec une liste d'extensions **différente**
(`.gipl` inclus) et des exceptions `["Seg","seg","Pred"]`
([AMASSS.py:682](AMASSS/AMASSS.py#L682)) : le compteur « Number of scans to
process » et ce que le CLI traite peuvent diverger.

### 3.2 Conversion

`PrepareScanForNnunet()` ([AMASSS_CLI.py:557](AMASSS_CLI/AMASSS_CLI.py#L557))
copie chaque scan dans un dossier unique `<temp>/nnunet_input/` sous le nom
`p_<NNN>_0000.nii.gz` (`NNN` = index à trois chiffres, l'ordre de découverte).
Un `.nii.gz` est copié tel quel ; **tout le reste est relu et réécrit par
SimpleITK**. Ce n'est pas cosmétique : la version antérieure faisait un
`shutil.copy` d'un NRRD vers un nom `.nii.gz`, et le lecteur de nnU-Net choisit
son format sur l'extension — le NRRD, format par défaut de Slicer, était donc en
pratique cassé. Le type de voxel est laissé intact, nnU-Net castant en float32
lui-même.

### 3.3 Ce qu'AMASSS ne fait plus

Aucune normalisation d'intensité, aucun fenêtrage, aucun resampling **n'est
écrit dans ce dépôt**. `CorrectHisto()`
([AMASSS_CLI.py:271](AMASSS_CLI/AMASSS_CLI.py#L271)) subsiste, corps vidé : elle
lit l'image, la caste en float32 et la retourne — ni percentiles, ni clipping, ni
écriture, malgré sa signature `(min_porcent, max_porcent, i_min, i_max)`. **Elle
n'est appelée nulle part** : code mort.

Tout le prétraitement effectif est celui de nnU-Net, décrit par le `plans.json`
de chaque modèle (§4.2) : resampling vers le spacing cible, puis
`CTNormalization` (clip aux percentiles 0,5 % / 99,5 % des intensités de
premier plan du jeu d'entraînement, puis centrage-réduction par la moyenne et
l'écart-type de ce même jeu). Les valeurs par modèle sont dans le `plans.json`
du bundle, pas dans le dépôt.

## 4. Les modèles

### 4.1 Le bundle et sa découverte

`FindModelFolder()` ([AMASSS_CLI.py:89](AMASSS_CLI/AMASSS_CLI.py#L89)) cherche,
pour chaque code de structure :

```
<modelDirectory>/<CODE>/**/<Dataset...>__nnUNetPlans__3d_fullres/fold_0/checkpoint_final.pth
```

Un candidat n'est accepté qu'une fois le checkpoint `fold_0` **confirmé
présent**, sinon la structure est déclarée indisponible et le run continue avec
les autres. La découverte a lieu **une seule fois pour tout le run**.

Téléchargement : le bouton *Download latest models* ouvre simplement un
navigateur ([AMASSS.py:738](AMASSS/AMASSS.py#L738)) sur `MODEL_LINK`, la page
[releases/tag/AMASSS_CBCT](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools/releases/tag/AMASSS_CBCT) —
**aucun téléchargement automatique** côté AMASSS. L'archive est
[AMASSS_Models.zip](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools/releases/download/AMASSS_CBCT/AMASSS_Models.zip),
que AREG ([CBCT.py:124](AREG/AREG_Method/CBCT.py#L124),
[617](AREG/AREG_Method/CBCT.py#L617)) et VFACE
([VFACE.py:959](VFACE/VFACE.py#L959)), eux, téléchargent bien. ALI passe encore
par un dépôt personnel, [lucanchling/AMASSS_CBCT
v1.0.2](https://github.com/lucanchling/AMASSS_CBCT/releases/tag/v1.0.2)
(`AMASSS_Models.zip` + `Masks_Models.zip`,
[CBCT.py:107](ALI/ALI_Method/CBCT.py#L107)). Le README pointe encore vers
`ALL_NEW_MODELS.zip` et une ligne commentée vers `ALL_MODELS.zip` : reliques de
l'époque monai, ces archives contenaient des `.pth` bruts.

### 4.2 Ce que contient réellement le bundle

Relevé sur le bundle décompressé (`AMASSS_Models.zip`, hors dépôt) : **neuf
dossiers**, un par code, chacun contenant
`Dataset001_myseg/nnUNetTrainer__nnUNetPlans__3d_fullres/` avec `dataset.json`,
`plans.json` et `fold_0/checkpoint_final.pth`. Un seul fold.

Deux familles, distinguées par leur `plans.json` : **full-FOV** (`MAND`, `MAX`,
`CB`, `CV`, `UAW`, `SKIN`) à 0,4 mm isotrope, patch 128³, `numTraining = 76` ; et
**masques** (`CBMASK`, `MANDMASK`, `MAXMASK`) à 0,3 mm isotrope, patch
112 × 160 × 128, `numTraining = 50`.

Architecture, identique aux deux familles (champ `architecture` du `plans.json`) :

```
dynamic_network_architectures.architectures.unet.PlainConvUNet
n_stages = 6            features_per_stage = [32, 64, 128, 256, 320, 320]
kernel_sizes = 6 x [3,3,3]          n_conv_per_stage = [2,2,2,2,2,2]
n_conv_per_stage_decoder = [2,2,2,2,2]
norm_op = InstanceNorm3d (eps 1e-5, affine)   conv_bias = True
```

Ce n'est **pas** un `monai.networks.nets.UNet` : ni `channels`, ni `strides`, ni
`num_res_units` n'apparaissent nulle part. `PlainConvUNet` est le U-Net
convolutionnel que nnU-Net configure lui-même, sans blocs résiduels ; les
`strides` viennent du plan (`[1,1,1]` puis 5 × `[2,2,2]` en full-FOV, dernier
étage `[1,2,2]` pour les masques, à cause de l'anisotropie du patch).
`batch_size = 2`, `use_mask_for_norm = [false]` partout.

**Chaque modèle est binaire.** Les `dataset.json` ne déclarent que
`{background: 0, <une structure>: 1}` — et pour les six modèles full-FOV le nom
du label est resté `"Skin"` par copier-coller, y compris pour `MAND` ou `CB`. Ce
nom n'est jamais lu : la sortie est binarisée par `(arr > 0)`
([AMASSS_CLI.py:586](AMASSS_CLI/AMASSS_CLI.py#L586)) et c'est le CLI qui attribue
la valeur finale.

### 4.3 Structures et labels

`LABELS["LARGE"]` ([AMASSS_CLI.py:43](AMASSS_CLI/AMASSS_CLI.py#L43)) fait foi pour
les sorties fusionnées, et `LABEL_COLORS` donne la couleur des surfaces :

| Label | Code | Structure | Couleur RVB |
|---|---|---|---|
| 1 | `MAND` | Mandible | 216, 101, 79 |
| 2 | `CB` | Cranial base | 128, 174, 128 |
| 3 | `UAW` | Upper airway | 0, 0, 0 (noir) |
| 4 | `MAX` | Maxilla | 230, 220, 70 |
| 5 | `CV` | Cervical vertebra | 111, 184, 210 |
| 6 | `SKIN` | Skin | 172, 122, 101 |
| 7, 8, 9 | `CBMASK`, `MANDMASK`, `MAXMASK` | masques de recalage | blanc (`LABEL_COLORS` s'arrête à 6) |

Codes **sans modèle dans le bundle** : `RC` (canal radiculaire), `TEETH`, `MCAN`.
Les deux derniers sont désactivés dans l'UI (`UNAVAILABLE_MODELS`) ; `RC` non, il
est même dans `DEFAULT_SELECT` ([AMASSS.py:256](AMASSS/AMASSS.py#L256)) — coché
par défaut, il finit dans `missing_structures` avec un `logger.warning`.

`LABELS["SMALL"]` (`MAND:1, RC:2, MAX:4`), `MODELS_GROUP`
([AMASSS_CLI.py:256](AMASSS_CLI/AMASSS_CLI.py#L256)) — qui décrivait les modèles
multi-classes de l'ancienne version, `FF` sortant MAND/CB/UAW/MAX/CV en un seul
réseau — et `NTRANSLATE` ne sont plus lus nulle part : **code mort**.

### 4.4 L'inférence

Aucun `sliding_window_inference` n'est écrit ici : c'est nnU-Net qui gère la
fenêtre glissante, à partir du `patch_size` de son plan. Le seul paramètre que le
CLI choisit est le pas.

`BuildPredictor()` ([AMASSS_CLI.py:114](AMASSS_CLI/AMASSS_CLI.py#L114)) fixe
`tile_step_size = 0.5` (50 % de chevauchement, codé en dur dans la signature),
`use_gaussian = True` (pondération gaussienne des patches),
`use_mirroring = False` (équivalent de `--disable_tta` : pas d'augmentation
miroir au test), `device` issu de `ResolveDevice()`, et `verbose` /
`verbose_preprocessing` / `allow_tqdm` à `False`. Le kwarg
`perform_everything_on_device` (renommé depuis `perform_everything_on_gpu` en
cours de série 2.x) est **choisi par introspection** de la signature.

`PredictFolder()` ([AMASSS_CLI.py:206](AMASSS_CLI/AMASSS_CLI.py#L206)) charge le
checkpoint (`initialize_from_trained_model_folder(..., use_folds=(0,),
checkpoint_name="checkpoint_final.pth")`) puis appelle
**`predict_from_files_sequential`** sur le dossier entier. Trois choix
structurants, tous commentés dans le code :

1. **Chemin explicite du modèle**, pas de `nnUNet_results`. `os.environ` est
   global au processus : deux runs AMASSS simultanés s'écrasaient mutuellement
   leur chemin de modèle.
2. **Boucle par structure, pas par scan** : tous les scans dans un seul dossier
   d'entrée, une prédiction de dossier par structure. Le checkpoint est chargé
   `S` fois au lieu de `N × S`.
3. **Version séquentielle** : `predict_from_files` fait du `spawn`, et sous
   Slicer un worker ré-importe ce module et repaie tout l'import de torch ;
   il lui faudrait de plus son propre contexte CUDA pour le resampling GPU.

La progression reste comptée en pas `scan × structure`
([AMASSS_CLI.py:815](AMASSS_CLI/AMASSS_CLI.py#L815)) pour ne pas changer
l'échelle attendue par les widgets, alors que le travail est groupé par
structure : la barre avance par paliers de `scan_count`.

Une structure qui échoue est enregistrée dans `failed_structures` et le run
continue ; le run n'échoue que si **toutes** échouent.

## 5. Le cœur algorithmique (non appris)

### 5.1 Resampling sur GPU

`EnableGpuResampling()` ([AMASSS_CLI.py:150](AMASSS_CLI/AMASSS_CLI.py#L150)) est
la principale optimisation du CLI. D'après le commentaire du code, le resampling
scipy mono-cœur pèse **environ sept fois** le coût du réseau.

Le mécanisme : nnU-Net résout ses fonctions de resampling **par leur nom**, via
`recursive_find_resampling_fn_by_name`, à partir du dict de configuration.
Réécrire les deux noms redirige les deux extrémités, sans monkeypatch :

```python
configuration["resampling_fn_data"]          = "resample_torch_fornnunet"
configuration["resampling_fn_probabilities"] = "resample_torch_fornnunet"
configuration[f"{key}_kwargs"] = {"is_seg": False, "device": torch.device(device), "mode": "linear"}
```

Trois garde-fous : la substitution n'a lieu que si les deux clés valent
exactement `resample_data_or_seg_to_shape` (un plan qui demande autre chose est
laissé intact) ; `PlansManager` distribue un `deepcopy`, donc muter le dict ne
touche ni les plans partagés ni un run concurrent ; les deux propriétés sont des
`@property @lru_cache`, d'où le `getattr(manager_class, key).fget.cache_clear()`,
sans lequel une valeur lue avant la bascule survivrait. Différence numérique
assumée : les données passent de l'ordre 3 à l'ordre 1 (torch n'a pas
d'interpolation cubique 3D) ; les probabilités étaient déjà en ordre 1.

**Repli automatique** sur `torch.cuda.OutOfMemoryError` → `empty_cache()` puis
rejeu de la structure avec le resampler scipy
([AMASSS_CLI.py:244](AMASSS_CLI/AMASSS_CLI.py#L244)) : la version cloud a un
argument `gpu_resampling` explicite, impossible ici, la liste de paramètres étant
figée par le XML et ses appelants.

### 5.2 Assemblage et écriture

`AssembleScanOutputs()` ([AMASSS_CLI.py:575](AMASSS_CLI/AMASSS_CLI.py#L575)),
par scan : lecture de `p_<NNN>.nii.gz` dans chaque dossier `pred_<STRUCT>`
(absent → avertissement, structure sautée), binarisation `(arr > 0)`, puis

- **SEPARATE** si demandé *ou* s'il n'y a qu'une structure (un « merged » d'une
  seule structure n'est que cette structure) ;
- **MERGE** si demandé et ≥ 2 structures : `np.where(mask == 1, label, merged)`
  dans l'ordre de `merging_order` =
  `["SKIN","CV","UAW","CB","MAX","MAND","CAN","RC","CBMASK","MANDMASK","MAXMASK"]`.
  **C'est un ordre de priorité** : la dernière structure écrite écrase les
  précédentes sur les voxels partagés. `"CAN"` n'existe dans aucun dictionnaire
  (le code du canal est `MCAN`), entrée morte ; `.get(struct, 1)` ferait tomber
  un code inconnu sur le label 1.

`SaveSeg()` ([AMASSS_CLI.py:524](AMASSS_CLI/AMASSS_CLI.py#L524)) caste en int16,
recopie **explicitement** spacing, direction et origine du scan de référence,
puis passe par `MatchReferenceGeometry()`
([AMASSS_CLI.py:502](AMASSS_CLI/AMASSS_CLI.py#L502)), qui ne resample (plus
proche voisin) que si la géométrie diffère — no-op dans le cas normal. La version
antérieure écrivait un volume temporaire et le relisait pour forcer la géométrie :
deux allers-retours gzip d'un CBCT complet par structure, pour rien.

### 5.3 Post-traitement : ce qu'il n'y a plus

Aucun remplissage de trous, aucune sélection de composante connexe, aucune
morphologie n'est appliquée. Deux fonctions subsistent, **appelées nulle part** :

- `CleanArray()` ([AMASSS_CLI.py:422](AMASSS_CLI/AMASSS_CLI.py#L422)) — dilatation
  binaire de rayon `r`, `BinaryFillhole`, érosion de rayon `r`, puis
  `cc3d.connected_components` et conservation de la plus grosse composante ;
- `CropSkin()` ([AMASSS_CLI.py:489](AMASSS_CLI/AMASSS_CLI.py#L489)) — remplissage,
  érosion d'épaisseur `thickness`, différence des deux pour ne garder que la
  coque, puis plus grosse composante.

Dans la version monai, `CleanArray(sep_arr, 2)` était appliquée à toutes les
structures sauf `CV` et `RC`, et `CropSkin(sep_arr, 5)` à la peau. Le portage
nnU-Net a supprimé ces appels : le nettoyage repose entièrement sur le
post-traitement interne de nnU-Net (le `postprocessing.pkl` du bundle, s'il
existe). `cc3d` reste importé pour ces deux fonctions mortes, et `Write()`
([AMASSS_CLI.py:287](AMASSS_CLI/AMASSS_CLI.py#L287)) l'est aussi.

### 5.4 Génération des surfaces VTK

`SavePredToVTK()` ([AMASSS_CLI.py:305](AMASSS_CLI/AMASSS_CLI.py#L305)), appelée
depuis `SaveSeg` quand `genVtk` est vrai. Par label : écriture d'un NRRD
temporaire `<temp>/temp.nrrd` du masque binaire, `vtkNrrdReader` →
`vtkDiscreteMarchingCubes` avec `GenerateValues(1, 1, 1)` (un seul contour de
valeur 1 — d'où le passage par un masque binaire plutôt que par la carte de
labels) → `vtkSmoothPolyDataFilter` à `vtk_smooth` itérations (5 partout dans le
dépôt) → `vtkUnsignedCharArray` « Colors », **une couleur constante par cellule**
tirée de `LABEL_COLORS`.

Deux modes, choisis sur le suffixe `_MERGED` du nom de fichier : en **merged**,
boucle sur `np.unique(arr)` et concaténation par `vtkAppendPolyData` en **un
seul** `.vtk` ; en **séparé**, `struct = base.split('_')[-1]` — le code de
structure est **re-extrait du nom de fichier** pour retrouver la couleur.

Les maillages sont écrits **dans le système de coordonnées de l'image**, sans
flip LPS/RAS : ce sont des `vtkPolyData` issus des indices du NRRD.

## 6. Post-traitements et sorties

Nommage — `base` = nom du scan sans extension, `ext` = extension d'origine :

| Mode | Fichier | Contenu |
|---|---|---|
| SEPARATE | `<base>_<prediction_ID>_<STRUCT><ext>` | masque binaire int16, un par structure |
| MERGE | `<base>_<prediction_ID>_MERGED<ext>` | carte de labels int16 selon `LABELS["LARGE"]` |
| `genVtk` | `<même nom>.vtk` | surface(s) colorée(s) |

`save_in_folder` ⇒ le tout va dans
`<output_folder>/<base>_<prediction_ID>_SegOut/` ; sinon directement dans
`<output_folder>`.

Le dossier temporaire est **effacé puis recréé au démarrage et à la fin**.
`nnunet_input` est supprimé dès la fin des inférences, avant l'assemblage —
sinon un batch garderait une copie NIfTI complète de chaque CBCT jusqu'au bout ;
les prédictions d'un scan sont supprimées au fil de l'assemblage.

Côté widget, `OnEndProcess()` ([AMASSS.py:1089](AMASSS/AMASSS.py#L1089)) charge
les `.vtk` du dossier de sortie dans la scène (opacité 0,1 pour la peau, 0,2 pour
mandibule/maxillaire si un canal radiculaire est présent). Ce chargement n'a lieu
que si `vtk_output_folder` est non nul, donc **seulement** pour une entrée
« fichier unique » sauvegardée dans son dossier d'origine avec la case surface
cochée ([AMASSS.py:944](AMASSS/AMASSS.py#L944)). `LOADED_VTK_FILES` est un
**global de module** : les nœuds y restent référencés toute la session, même
après fermeture de la scène.

## 7. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Prétraitement (resampling, `CTNormalization`) | déterministe, piloté par `plans.json` | nnU-Net, in-process |
| Segmentation de chaque structure | **réseau** `PlainConvUNet` 3D, un par structure, binaire | nnU-Net, in-process, GPU si dispo |
| Fenêtre glissante, gaussienne, pas 0,5 | déterministe | nnU-Net |
| Resampling de sortie | déterministe, torch (GPU) ou scipy | nnU-Net, resampler substitué par AMASSS |
| Binarisation + fusion par labels | géométrique trivial (`np.where`) | CLI |
| Recalage de géométrie sur le scan | ITK, plus proche voisin, no-op en pratique | CLI |
| Surfaces VTK | marching cubes + lissage laplacien | CLI |
| Nettoyage morphologique | **supprimé du pipeline** (code mort) | — |

## 8. Environnement

Tout tourne dans le Python de Slicer. L'installation est déclenchée par le
bouton *Predict* ([AMASSS.py:851](AMASSS/AMASSS.py#L851)), pas à l'ouverture du
module, et passe par une boîte de dialogue de confirmation.

| Paquet | Version imposée | Raison lisible dans le code |
|---|---|---|
| `torch`, `torchvision`, `torchaudio` | `>=2.2.0` (roues CUDA) | index `download.pytorch.org/whl/cu118` ou `cu121` selon la version CUDA détectée |
| `nnunetv2` | `2.8.0` | backend d'inférence |
| `numpy` | **`1.26.4`** (`NUMPY_PINNED_VERSION`) | torch 2.2.0 est compilé contre numpy 1.x ; numpy ≥ 2 casse tout import torch avec `_ARRAY_API not found` |
| `pydicom` | `3.0.2` | **ne pas rétrograder** : pydicom 2.x casse `dicomweb-client` et `highdicom`, donc tous les modules DICOM de Slicer |
| `dicom2nifti` | `2.6.2` | compatibilité avec pydicom 3 |
| `itk`, `blosc2`, `einops`, `nibabel` | libre | dépendances de nnU-Net |

`fix_numpy_version()` ([AMASSS.py:55](AMASSS/AMASSS.py#L55)) est rappelée **après**
toutes les installations : pip résout chaque install indépendamment, et
`nnunetv2` (qui demande `numpy>=1.24`) peut tirer numpy 2.x au passage.

Sous Windows, `check_lib_installed()` compare les suffixes `cuXXX` des trois
paquets torch et ne valide l'installation que s'ils concordent ; la détection de
version CUDA plafonne à `cu121` et retombe sur `cu118` en dessous de 12.1.

Pas de WSL, pas de conda : contrairement aux modules IOS (FlexReg, AREG_IOS,
ALI_IOS), AMASSS n'utilise aucun environnement externe.

## 9. Pièges et points fragiles

- **`highDefinition` / « small FOV » ne fait plus rien de ce qu'il prétend.**
  La case `smallFOVCheckBox` bascule la liste des structures proposées vers
  `GROUPS_HD_SEG` ([AMASSS.py:747](AMASSS/AMASSS.py#L747)) — mandibule,
  maxillaire, dents, canal radiculaire, canal mandibulaire, dont trois n'ont pas
  de modèle. Le flag `param["highDefinition"]` **n'est pas déclaré dans le XML**,
  `slicer.cli.run` le jette, et le CLI n'a de toute façon plus aucun chemin
  `SMALL` (spacing `[0.16, 0.16, 0.32]` et `MODELS_GROUP["SMALL"]` ont disparu
  avec le portage). Cocher la case ne change que la liste de cases à cocher.
- **`isDCMInput` est lu puis ignoré** : `dicom2nifti` est importé en tête de
  fichier et jamais utilisé, aucune conversion DICOM → NIfTI n'existe dans le
  CLI, alors que l'UI propose « DICOM Files » comme type d'entrée. Une entrée
  DICOM ne produit rien — aucun fichier n'a d'extension reconnue.
- **`RC` coché par défaut sans modèle disponible** : `DEFAULT_SELECT` inclut
  « Root canal », le bundle publié n'a pas de dossier `RC`. Échec silencieux.
- **Écrasement du dossier temporaire.** `temp_fold` est `rmtree` sans condition
  au démarrage ([AMASSS_CLI.py:648](AMASSS_CLI/AMASSS_CLI.py#L648)), et widget,
  AREG et VFACE passent tous `<Documents>/Slicer_temp_AMASSS` : **deux runs
  concurrents s'effacent mutuellement leur dossier de travail**.
- **Index de case fragile** : la correspondance `p_NNN` → fichier ne vit que dans
  `scan_records`, en mémoire ; un crash en cours d'assemblage laisse des
  prédictions anonymes dans le dossier temporaire.
- **`struct = base.split('_')[-1]`** dans `SavePredToVTK` : un `prediction_ID`
  ou un nom de scan contenant un underscore après le code de structure fait
  lever un `KeyError` sur `LABELS["LARGE"][struct]`.
- **Divergence de comptage** entre le widget (extensions `.gipl` incluses,
  exceptions `Seg`/`seg`/`Pred`) et le CLI (`.gipl` non reconnu, exception sur
  `_<prediction_ID>_` et `MASK`).
- **`cleanup()` du widget** ([AMASSS.py:1348](AMASSS/AMASSS.py#L1348)) fait
  `shutil.rmtree(os.path.join("..", "temp"))` : chemin relatif au répertoire
  courant de Slicer, sans rapport avec `temp_fold`. L'exception est avalée.
- **Code mort à connaître** — CLI : `CorrectHisto`, `CleanArray`, `CropSkin`,
  `Write`, `MODELS_GROUP`, `LABELS["SMALL"]`, `NTRANSLATE`. Widget :
  `GetSegGroup`, `createProgressDialog`, `UpdateRunBtn` (qui lirait
  `self.scan_ready`, **jamais défini** → `AttributeError`), `self.center_all`,
  `self.save_adjusted` et leurs deux cases à cocher, rendues visibles et jamais
  lues.

## 10. Littérature

AMASSS est publié, une fois :

> Gillot M., Baquero B., Le C., Deleat-Besson R., Bianchi J., Ruellas A., …,
> Cevidanes L., Prieto J.C. *Automatic multi-anatomical skull structure
> segmentation of cone-beam computed tomography scans using 3D UNETR.*
> PLOS ONE 17(10):e0275033, 2022.
> [doi:10.1371/journal.pone.0275033](https://doi.org/10.1371/journal.pone.0275033)
> — PMID 36223330, [PMC9555672](https://pmc.ncbi.nlm.nih.gov/articles/PMC9555672/)

**Le code a divergé du papier, complètement.** Le papier décrit un **UNETR**
(encodeur transformer + décodeur convolutionnel, bibliothèque MONAI) : patches
128³, `feature_size=16`, `hidden_size=768`, `mlp_dim=3072`, 12 têtes d'attention,
dropout 5 %, entraîné sur 618 CBCT de 7 centres pour **cinq** structures, avec
resampling isotrope **0,4 mm** et ajustement de contraste par histogramme cumulé
aux percentiles 1 % / 99 %. Dice rapportés : peau 0,971, mandibule 0,962,
maxillaire 0,853, base du crâne 0,788, vertèbre cervicale 0,760.

C'est ce que faisait la version historique du CLI — `Create_UNETR(...)`,
`sliding_window_inference(input_img, [128,128,128], nbr_GPU_worker, net,
overlap=precision/100, sw_device=DEVICE, ...)`, `CorrectHisto` +
`ScaleIntensityd(0,1)` + `Spacingd(pixdim=[0.4,0.4,0.4])` ou `[0.16,0.16,0.32]`
en haute définition, puis `CleanArray`/`CropSkin` — lisible dans le dépôt
jusqu'au commit `61bbb15` « ENH: AMASSS with nnunet ». Le spacing haute
définition et le `precision` de l'UI étaient des paramètres du code, pas du
papier ; un `Create_SwinUNETR(feature_size=48)` y coexistait, commenté.

Le code actuel n'a plus rien de cela : **nnU-Net v2, `PlainConvUNet`, un réseau
binaire par structure**. Le spacing 0,4 mm survit, mais vient du `plans.json` des
poids ; la voie haute définition et le post-traitement morphologique ont disparu.
**Aucune publication ne décrit la version nnU-Net d'AMASSS** : citer le papier
PLOS ONE pour décrire le module tel qu'il tourne aujourd'hui revient à décrire
une architecture qui n'est plus exécutée.

- [nnU-Net (Nat Methods, 2021)](https://doi.org/10.1038/s41592-020-01008-z)
- [UNETR: Transformers for 3D Medical Image Segmentation (WACV 2022)](https://arxiv.org/abs/2103.10504)
- [Maxlo24/AMASSS_CBCT (dépôt d'origine)](https://github.com/Maxlo24/AMASSS_CBCT)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)

Références complètes, PDF récupérés et liens à consulter : [SOURCES.md](SOURCES.md).
