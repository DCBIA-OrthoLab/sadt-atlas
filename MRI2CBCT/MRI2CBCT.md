# MRI2CBCT — pipeline complet

Recalage rigide multimodal IRM → CBCT de l'ATM. Six étapes indépendantes, chacune
avec son bouton et son CLI, qui se terminent par un elastix rigide en information
mutuelle. Le seul réseau du module est un nnU-Net qui segmente le condyle **sur le
CBCT** : il ne participe pas au recalage, il fournit un point d'ancrage et une
boîte de recadrage.

## 1. Situation dans la chaîne

Rien dans le dépôt n'appelle MRI2CBCT, et MRI2CBCT n'appelle aucun autre module de
l'extension. Il se déclare dépendant de **SlicerNNUNet**
([MRI2CBCT.py:150](MRI2CBCT/MRI2CBCT.py#L150)) mais ne l'importe jamais : c'est
l'exécutable `nnUNetv2_predict` qui est lancé en sous-processus.

| Appelé | Comment | Quand |
|---|---|---|
| 6 CLI `MRI2CBCT_*` du dépôt | `slicer.cli.run` | un par bouton |
| `nnUNetv2_predict` | `subprocess.run` depuis le CLI | Approximate et TMJ Crop |
| `slicer.modules.fiducialregistration` | `slicer.cli.runSync` | fin de l'approximation automatique |

Le commentaire en tête de
[MRI2CBCT_CLI_utils/\_\_init\_\_.py](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/__init__.py)
annonce que `resample_images` est consommé par AREG_IOSCBCT et VFACE : un grep sur
tout le dépôt ne trouve **aucun** appelant hors de MRI2CBCT_CLI. L'import paresseux
reste utile (il évite de tirer `torchreg` pour un simple resample), la justification
citée ne l'est plus.

## 2. Fichiers en jeu

| Fichier | Rôle |
|---|---|
| [MRI2CBCT/MRI2CBCT.py](MRI2CBCT/MRI2CBCT.py) | widget, 2400 l. : UI, tables orientation / normalisation / resample, enchaînement des CLI |
| [MRI2CBCT_utils/](MRI2CBCT/MRI2CBCT_utils) | une classe `Method` par bouton : validation des chemins, construction du dict de paramètres |
| [ManualApprox_MRI2CBCT.py](MRI2CBCT/MRI2CBCT_utils/ManualApprox_MRI2CBCT.py) | approximation manuelle (port de GreedyReg), **entièrement côté widget** |
| [MRI2CBCT_CLI_utils/](MRI2CBCT_CLI/MRI2CBCT_CLI_utils) | le code réel : orientation, resample, inversion, normalisation, masque, segmentation, elastix |

**Tout tourne dans le Python de Slicer**, aucun `conda run` nulle part, contrairement
à FlexReg/AREG_IOS. `install_function()`
([MRI2CBCT.py:78](MRI2CBCT/MRI2CBCT.py#L78)) fait du `pip_install` dans Slicer
lui-même et est rappelée en tête de chaque action. CUDA est optionnel :
`nnunet_predict` teste `torch.cuda.is_available()` et repasse en `-device cpu`
([condyle_segmentation.py:55](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/condyle_segmentation.py#L55)).

| CLI | Appelé par | Rôle |
|---|---|---|
| [MRI2CBCT_ORIENT_CENTER_MRI](MRI2CBCT_CLI/MRI2CBCT_ORIENT_CENTER_MRI/MRI2CBCT_ORIENT_CENTER_MRI.py) | `orientCenterMRI` | réécrit direction / spacing Z / origine de l'en-tête |
| [MRI2CBCT_LR_CROP](MRI2CBCT_CLI/MRI2CBCT_LR_CROP/MRI2CBCT_LR_CROP.py) | `lrCropMRI2CBCT` | coupe le volume en deux moitiés gauche/droite |
| [MRI2CBCT_RESAMPLE_CBCT_MRI](MRI2CBCT_CLI/MRI2CBCT_RESAMPLE_CBCT_MRI/MRI2CBCT_RESAMPLE_CBCT_MRI.py) | `resampleMRICBCT` | resample T1/T2 de IRM, CBCT et Seg |
| [MRI2CBCT_APPROX](MRI2CBCT_CLI/MRI2CBCT_APPROX/MRI2CBCT_APPROX.py) | `approximateMRI` | segmente le condyle, écrit deux points + une rotation en JSON |
| [MRI2CBCT_TMJ_CROP](MRI2CBCT_CLI/MRI2CBCT_TMJ_CROP/MRI2CBCT_TMJ_CROP.py) | `tmjCropMRI2CBCT` | boîte 400³ autour du condyle, recadre CBCT/IRM/Seg |
| [MRI2CBCT_REG](MRI2CBCT_CLI/MRI2CBCT_REG/MRI2CBCT_REG.py) | `registration_MR2CBCT` | inversion, normalisation, masque, elastix |

Les paramètres passent par `slicer.cli.run`, qui sérialise une liste ou un tuple en
`str(value)` amputé de ses crochets (`slicer/cli.py:setNodeParameters`) — d'où les
`split(',')` et le `re.findall(r'\d+')` côté CLI.

## 3. L'ordre du pipeline, et ce qui est vraiment obligatoire

```
[orientation/centrage IRM] → [L/R crop] → resample → approximation → [TMJ crop] → registration
```

Six boutons indépendants : rien dans le code ne contrôle l'ordre ni la provenance
des fichiers. La seule contrainte dure est celle du recalage.

| Étape | Statut | Pourquoi |
|---|---|---|
| Orientation / centrage IRM | **de fait obligatoire** | elastix part sans transformation initiale et à une seule résolution |
| L/R crop | optionnelle | acquisitions bilatérales ; produit les suffixes `left`/`right` que le resample relit |
| Resample | **obligatoire en pratique** | IRM et CBCT doivent partager un spacing comparable ; c'est aussi là que se fait le centrage |
| Approximation (auto ou manuelle) | **de fait obligatoire** | fournit l'alignement grossier qu'elastix ne trouve pas seul |
| TMJ crop | optionnelle | réduit le champ |
| Registration | le but | exige CBCT + IRM + **une segmentation CBCT** |

« De fait obligatoire » se lit dans le code : `ElastixReg` est appelé avec
`initial_transform=None` et `NumberOfResolutions = 1`
([AREG_MRI.py:61](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/AREG_MRI.py#L61)), et le message
d'erreur de `process_images` dit *« PLEASE MAKE SURE THE IMAGES ARE OF SIMILAR SIZE,
ORIENTATION, AND APPROXIMATED »*. Les entrées du recalage suivent en outre une
convention de nommage stricte, vérifiée par `get_corresponding_file`
([AREG_MRI.py:98](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/AREG_MRI.py#L98)) :
`<ID>_CBCT*.nii.gz`, `<ID>_MR*.nii.gz` ou `<ID>_MRI*.nii.gz`, masque
`<ID>_CBCT*.nii.gz`. Seul le `.nii.gz` est accepté, jamais le `.nii`.

## 4. Orientation et centrage de l'IRM

[MRI2CBCT_ORIENT_CENTER_MRI.py](MRI2CBCT_CLI/MRI2CBCT_ORIENT_CENTER_MRI/MRI2CBCT_ORIENT_CENTER_MRI.py),
`modify_image_properties`. **Aucun resampling : réécriture d'en-tête.** Le tableau
de voxels n'est pas touché, seuls `Direction`, `Spacing[2]` et `Origin` changent.

1. `SetDirection(new_direction)` — matrice 3×3 issue de la table de cases à cocher,
   aplatie en ligne par `getCheckboxValuesOrient`
   ([MRI2CBCT.py:847](MRI2CBCT/MRI2CBCT.py#L847)) ; défaut `(0,0,-1, 1,0,0, 0,-1,0)`
   ([MRI2CBCT.py:866](MRI2CBCT/MRI2CBCT.py#L866)), la valeur commentée
   « USE THIS DIRECTION FOR MRI » en bas du CLI. La table impose un unique ±1 par
   ligne et par colonne : seules les 48 matrices de permutation signées sont
   atteignables.
2. `Spacing[2]` est remplacé par `acquisition_z_spacing` si **Bilateral MRI** est
   coché (défaut 3.0 mm, lu au besoin dans le tag DICOM `0018,0088` puis `0018,0050`
   du nœud choisi, [MRI2CBCT.py:733](MRI2CBCT/MRI2CBCT.py#L733)) ; sinon la chaîne
   `"None"` est passée et le spacing d'origine tient. C'est le contournement des
   acquisitions bilatérales dont l'espacement inter-coupes est perdu à la conversion
   NIfTI.
3. Nouvelle origine : `[(size[i]*spacing[i])/2]` permutée en `[o[2], -o[0], o[1]]`,
   commentée « FOR MRI ». Cette permutation est **couplée à la matrice par défaut** :
   changer la direction sans la changer décentre le volume.

Sortie : `<id>_OR.nii` ou `<id>_OR.nii.gz`, selon l'extension d'entrée.

## 5. Cropping

### 5.1 L/R crop — [LR_crop.py](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/LR_crop.py)

Purement géométrique, `sitk.RegionOfInterest`, moitié/moitié.

- **IRM** : coupe sur l'axe **Z** (`size[2]//2`) ; moitié basse → `_cropLeft`,
  moitié haute → `_cropRight`.
- **CBCT et Seg** : coupe sur l'axe **X**, avec échange des deux moitiés si
  `direction[0,0] < 0`, puis les noms sont **volontairement croisés** (la moitié
  `left` est écrite dans `_cropRight` et réciproquement) sous un
  `# TODO: Check why left is right and why right is left`
  ([LR_crop.py:64](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/LR_crop.py#L64)).

Sorties dans `<output>/CBCT`, `/MRI`, `/Seg`. Les suffixes `left`/`right` sont
ensuite relus par le resample, par simple `in input_path.lower()`.

### 5.2 TMJ crop — [MRI2CBCT_TMJ_CROP.py](MRI2CBCT_CLI/MRI2CBCT_TMJ_CROP/MRI2CBCT_TMJ_CROP.py)

1. `GetPatients` apparie CBCT / IRM / Seg par identifiant
   ([TMJ_crop.py:24](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/TMJ_crop.py#L24) : longue chaîne
   de `split` sur `_Scan`, `_T1`, `_CBCT`, `_crop`…). Une segmentation ne crée jamais
   un patient à elle seule ; un patient sans les trois est ignoré.
2. `segment_condyle` (§6) → masque binaire dans le repère de la moitié de CBCT.
3. Boîte englobante : `MARGIN = 3` voxels, **mais** `FIXED_BBOX_VOXELS = [400,400,400]`
   est actif, donc la marge est morte — la boîte est un cube de 400 voxels centré sur
   le **centroïde du masque**, clampé sur le volume.
4. Les 8 coins passent en monde via `cbct_half.affine` ; le CBCT complet et l'IRM
   sont recadrés à cette boîte monde, chacun sur sa propre grille
   (`crop_by_world_corners` repasse par l'affine inverse de chaque image).
5. Le CBCT et la segmentation sont **rééchantillonnés sur la grille de l'IRM
   recadrée** (`nibabel.processing.resample_from_to`, `order=1` pour le CBCT,
   `order=0` pour les labels).

Sorties : `MRI/<id>_MRI_TMJ_crop<side>.nii.gz`, `CBCT/<id>_CBCT_TMJ_crop<side>.nii.gz`,
`CBCT seg/<id>_Seg_TMJ_crop<side>.nii.gz`, `CBCT seg/<id>_Mask_TMJ_crop<side>.nii.gz`,
`Mask/<id>_Mask_TMJ_<side>.nii.gz` (masque brut, inspection). `<id>` est le **premier
token** du nom CBCT (`stem.split(".")[0].split("_")[0]`). Un patient est sauté si
`MRI/<id>_MRI_TMJ_crop*.nii.gz` existe déjà.

## 6. Le réseau : segmentation du condyle

[condyle_segmentation.py](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/condyle_segmentation.py),
partagé mot pour mot entre TMJ crop et Approximate. **Seul réseau du module. Il n'y
a aucune segmentation IRM.**

| Élément | Valeur |
|---|---|
| Architecture | nnU-Net v2, plan `nnUNetResEncUNetXLPlans`, config `3d_fullres`, fold 0 |
| Dataset | `Dataset001_myseg` |
| Poids | `checkpoint_final.pth`, plus `dataset.json` et `plans.json` |
| URL | `github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools/releases/download/TMJ_CROP_MODEL/…` ([MRI2CBCT.py:1249](MRI2CBCT/MRI2CBCT.py#L1249)) |
| Emplacement | `<Documents>/SlicerDownloads/MRI2CBCT/MRI2CBCT_CBCT/ML/Dataset001_myseg/nnUNetTrainer__nnUNetResEncUNetXLPlans__3d_fullres/fold_0/` |
| Exécution | `subprocess.run(["nnUNetv2_predict", …, "--disable_tta", "--save_probabilities", "-f", "0"])` |
| Entrée / sortie | une moitié de CBCT `<name>_0000.nii.gz` → une carte de labels `<name>.nii.gz` |

L'architecture exacte et le prétraitement nnU-Net (normalisation d'intensité,
spacing cible, taille de patch) vivent dans les `plans.json` / `dataset.json`
téléchargés : **non déterminable depuis le dépôt**. Le code ne prétraite rien
lui-même, il délègue tout à nnU-Net. `os.environ['nnUNet_results']` est déduit en
remontant deux niveaux depuis le dossier du trainer.

**Prétraitement propre au module**, `detect_side_and_half`
([condyle_segmentation.py:84](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/condyle_segmentation.py#L84)) :
le centre de masse des voxels non nuls de l'IRM est comparé **en coordonnées monde**
au centre du CBCT (`cog_w[0] > cbct_mid_w[0]` → côté `Right`). Le CBCT est coupé en
deux sur l'axe d'index 0, la moitié retenue étant choisie d'après le signe de
`affine[:3,0][0]` — donc indépendamment du sens de stockage des voxels. But :
présenter au réseau le même champ de vue qu'à l'entraînement.

**Post-traitement** :

```python
mask = pred if pred.max() > 1 else (pred > PROBA_THR)   # PROBA_THR = 0.02
mask = biggest_cc(mask)                                  # scipy.ndimage.label
```

`nnUNetv2_predict` écrit une carte de labels (les probabilités partent dans un
`.npz` jamais relu), donc `pred.max()` vaut 1 et la branche réellement empruntée est
le seuil à 0.02, c'est-à-dire « label ≠ 0 » ; `PROBA_THR` n'aurait d'effet que sur
une carte de probabilités. La plus grosse composante connexe est conservée : le
résultat est un **condyle unique, binaire**.

## 7. Resampling

[MRI2CBCT_RESAMPLE_CBCT_MRI.py](MRI2CBCT_CLI/MRI2CBCT_RESAMPLE_CBCT_MRI/MRI2CBCT_RESAMPLE_CBCT_MRI.py)
+ [resample.py](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/resample.py). Six dossiers d'entrée :
IRM/CBCT/Seg × T1/T2. `create_csv` inventorie récursivement `.nii`, `.nii.gz`,
`.nrrd`, `.nrrd.gz`, `.gipl`, `.gipl.gz` et note taille et spacing de chacun.

Défauts de la table ([MRI2CBCT.py:543](MRI2CBCT/MRI2CBCT.py#L543)) : **443 × 443 × 119**
coupes, spacing **0.3 × 0.3 × 0.3 mm**, chaque ligne désactivable par « Keep the same
size / spacing as the input scan » (la chaîne `"None"` est alors passée au CLI).

| Entrée | `resample_size` | Interpolation | Remarque |
|---|---|---|---|
| IRM | celui de la table | linéaire | `iso_spacing=True` sert en fait de drapeau **`isMRI`** |
| CBCT | forcé à `"None"` | linéaire | seul le spacing change, la taille propre est conservée |
| Seg | forcé à `"None"` | **plus proche voisin** (`linear=False`) | |

Le forçage est commenté l.163 : imposer au CBCT la taille de l'IRM recadrerait le
crâne entier aux dimensions du petit volume IRM.

Dans `resample_fn` :

- `fit_spacing=True` (taille cible donnée) → `output_spacing = sp·si/o_si`, l'étendue
  physique est conservée ; écrasé ensuite si un spacing explicite est fourni.
- `center` → `output_origin -= (taille_physique_sortie − taille_physique_entrée)/2`,
  l'offset étant d'abord multiplié par la matrice de direction pour l'IRM.
- **Miroir** : si IRM **et** nom contenant `right` **et** `center` faux, le volume est
  retourné en Z (`sitk.Flip [False,False,True]`) avant resample puis re-retourné
  après. Le côté vient du nom de fichier produit par le L/R crop.
- `DefaultPixelValue` = **minimum du volume d'entrée**, pas 0 : le padding reprend le
  fond réel.
- La branche `iso_spacing == "True"` compare un booléen à une chaîne : morte.

Sorties dans `<output>/MRI`, `/CBCT`, `/Seg`, **noms inchangés**. Le chemin de sortie
est `file_path.replace(dirname(file_path), output)` : toute arborescence d'entrée est
aplatie, deux homonymes de sous-dossiers différents s'écrasent silencieusement.

## 8. L'approximation

Deux voies coexistent dans la même section de l'UI, écrivant dans le **même** dossier
`<output>/first_approximation/` sous les **mêmes** noms de fichiers.

### 8.1 Voie automatique

Le CLI [MRI2CBCT_APPROX](MRI2CBCT_CLI/MRI2CBCT_APPROX/MRI2CBCT_APPROX.py) **ne recale
rien** : il produit une paire de points et une rotation, le widget finit le travail
(le CLI n'a pas accès aux modules de Slicer). `approximation()`
([approximate.py:77](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/approximate.py#L77)), par paire
CBCT/IRM (dossiers, ou fichier unique si les deux entrées sont des fichiers — mode
« Scene Volume ») :

1. `segment_condyle` → masque du condyle sur la bonne moitié de CBCT ;
2. **point CBCT** = centroïde des voxels du masque, passé en monde RAS par
   `cbct_half.affine` ;
3. **point IRM** = `world_center_of_mass`, centre de masse des voxels non nuls de
   l'IRM entière, en RAS ;
4. **rotation** = `compute_rotation_correction`
   ([approx_utils.py:38](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/approx_utils.py#L38)) : les
   deux images passent par `nib.as_closest_canonical`, la partie 3×3 de chaque affine
   est orthogonalisée par SVD (`U @ Vt`), retour de `R_cbct @ R_mri.T`. Après
   recanonisation les repères sont déjà quasi RAS : cette rotation ne rattrape que le
   résidu non aligné sur les axes ;
5. `mri_point_rotated = R @ mri_point` ;
6. écriture de `first_approximation/points/<id>_approx_points.json` : `patient_id`,
   `side`, `cbct_point_ras`, `mri_point_rotated_ras`, `rotation_ras`, `mri_path`,
   `cbct_path`.

Puis `finalizeApproximation()`
([Approx_MRI2CBCT.py:119](MRI2CBCT/MRI2CBCT_utils/Approx_MRI2CBCT.py#L119)),
déclenchée depuis `onProcessUpdate` sur `module_name == "MRI2CBCT approximation"`
([MRI2CBCT.py:2166](MRI2CBCT/MRI2CBCT.py#L2166)) : deux fiducials d'**un seul point**
(fixe = point CBCT, mobile = point IRM tourné) sont passés au module
`fiducialregistration` de Slicer en `transformType = "Translation"` ; la matrice 4×4
RAS est assemblée (bloc 3×3 = rotation du JSON, colonne 3 = translation) ; le volume
IRM est chargé, placé sous cette transformation, `hardenTransform`, écrit.

Autrement dit : **rotation issue des en-têtes, translation issue d'un appariement
centroïde-du-condyle ↔ centre-de-masse-de-l'IRM.** Le réseau ne sert qu'à fournir le
point CBCT.

### 8.2 Voie manuelle

[ManualApprox_MRI2CBCT.py](MRI2CBCT/MRI2CBCT_utils/ManualApprox_MRI2CBCT.py), injectée
dans la section Approximate par `injectUI`. Port de GreedyReg, tout dans le widget.

- 6 sliders : rotations X/Y/Z (−180…180°), translations X/Y/Z (−200…200 mm).
  `onManualTransformChanged` construit un `vtkTransform` : `Translate` puis
  `RotateX/Y/Z`. `vtkTransform` étant en **PreMultiply**, la matrice finale est
  `T·Rx·Ry·Rz` : la rotation se fait **autour de l'origine du repère RAS**, pas autour
  du centre du volume — d'où l'importance des étapes de centrage amont.
- « Center MRI on CBCT » ajoute à la translation l'écart des centres des `GetRASBounds`.
- « Enable Interactive Tool » active les poignées natives de Slicer, translation et
  rotation autorisées, **échelle désactivée** (`SetEditorScalingEnabled(False)`), et
  affiche le `qMRMLTransformDisplayNodeWidget` du module Transforms.
- « Confirm & Save Alignment » clone l'IRM, durcit la transformation, écrit le volume,
  puis écrit le `.tfm` **à la main**.

### 8.3 Ce que l'approximation donne au recalage

Rien de formel : aucun paramètre n'est transmis à elastix. Elle produit un **volume
IRM déjà déplacé**, et c'est ce volume-là que l'opérateur doit désigner comme dossier
IRM du recalage. Le `.tfm` n'est jamais relu par le module.

| Voie | Volume | Transformation | Convention du `.tfm` |
|---|---|---|---|
| auto | `<mri_basename>_approximate.nii.gz` | `<patient_id>_MRI_approximate.tfm` | `slicer.util.saveNode` (Slicer gère RAS→LPS) |
| manuelle | `<mri_basename>_approximate.nii.gz` | `<mri_basename>_approximate.tfm` | `flip @ M @ flip`, `flip = diag(-1,-1,1,1)`, **sans inversion** |

Ni la même convention, ni la même règle de nommage (voir §12).

## 9. Normalisation

Table 4 colonnes × 2 lignes (IRM, CBCT) : `Normalization Min/Max`,
`Percentile Min/Max`. Deux jeux de défauts, `DefaultNorm`
([MRI2CBCT.py:1157](MRI2CBCT/MRI2CBCT.py#L1157)) :

| Préréglage | IRM `[min, max, p_low, p_high]` | CBCT `[min, max, p_low, p_high]` |
|---|---|---|
| **Default 1** (appliqué à l'ouverture) | `[0, 100, 0, 100]` | `[0, 75, 10, 95]` |
| **Default 2** | `[0, 100, 10, 95]` | `[0, 100, 10, 95]` |

Les deux rôles sont distincts
([normalize_percentile.py](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/normalize_percentile.py)) :

- **les percentiles définissent la fenêtre d'intensité**. `np.percentile` est calculé
  sur **tout le tableau, fond compris** — pas sur les voxels non nuls. Sur un CBCT
  majoritairement composé d'air, `p10` tombe dans le fond et `p95` écrête les
  structures les plus denses.
- **`min_norm` / `max_norm` définissent l'intervalle de sortie** :

```python
normalized = np.clip((array - lo) / (hi - lo), 0, 1)
scaled     = normalized * (max_norm - min_norm) + min_norm
```

Avec **Default 1**, l'IRM est en percentiles `[0, 100]` — donc une pure normalisation
min–max sans écrêtage, remise sur `[0, 100]` — tandis que le CBCT est fenêtré entre
son p10 et son p95 puis ramené sur `[0, 75]`, volontairement plus bas que l'IRM. Avec
**Default 2** les deux modalités reçoivent le même traitement.

Il n'y a **qu'une seule méthode** de normalisation dans le code : pas de choix
d'algorithme, seulement ces quatre nombres par modalité. `CheckNormalization`
([Reg_MRI2CBCT.py:54](MRI2CBCT/MRI2CBCT_utils/Reg_MRI2CBCT.py#L54)) ne vérifie que
`max > min` sur les deux paires. `normalize()` ne traite que les `.nii.gz` (un `.nii`
est ignoré sans message) et écrit `<nom>_percentile=[lo,hi]_norm=[min,max].nii.gz` :
les noms de fichiers grossissent à chaque étape, crochets et virgules compris.

## 10. Le recalage

[MRI2CBCT_REG.py](MRI2CBCT_CLI/MRI2CBCT_REG/MRI2CBCT_REG.py) enchaîne 6 étapes,
chacune dans son sous-dossier de `folder_general` :

| # | Étape | Sortie |
|---|---|---|
| 1 | inversion d'intensité de l'IRM | `a01_MRI_inv/` |
| 2 | normalisation IRM | `a2_MRI_inv_norm/percentile=[…]_norm=[…]/` |
| 3 | masquage de l'IRM par la **segmentation CBCT** | `a3_MRI_inv_norm_mask/…` |
| 4 | normalisation CBCT | `b2_CBCT_norm/…` |
| 5 | masquage du CBCT par la même segmentation | `b3_CBCT_norm_mask_l2/…` |
| 6 | elastix | `mri=inv+norm[…]+p[…]_cbct=norm[…]+p[…]+mask/` |

**Inversion** ([mri_inverse.py:19](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/mri_inverse.py#L19)) :
`inverted = max_intensity − array`, puis les voxels qui valaient 0 sont remis à 0.
L'os, sombre en IRM, devient clair comme en CBCT : la relation d'intensité entre les
deux modalités devient à peu près monotone. Suffixe `_inv`, `os.listdir` donc non
récursif.

**Masquage** ([apply_mask.py](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/apply_mask.py)) : les
**deux** modalités sont masquées par le **même** fichier, la segmentation CBCT
(`cbct_label2`), avec `seg_label = 1`. Si la valeur 1 est présente, la segmentation
est binarisée `array == 1` ; sinon le masque sert tel quel. Un masque de taille
différente est rééchantillonné sur la grille de l'image en plus proche voisin. Un
fichier dont le nom ne contient ni `_CBCT` ni `_MR` est ignoré. **Le résultat est
casté en `sitk.sitkInt16`** : les valeurs normalisées flottantes sont tronquées à
l'entier — il ne reste que 76 niveaux distincts pour un CBCT normalisé sur `[0, 75]`.

**Elastix**, `ElastixReg`
([AREG_MRI.py:49](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/AREG_MRI.py#L49)) :

```python
elastix_object = itk.ElastixRegistrationMethod.New(fixed_image, moving_image)
parameter_object.AddParameterMap(parameter_object.GetDefaultParameterMap("rigid"))
parameter_object.SetParameter("ErodeMask", "true")
parameter_object.SetParameter("WriteResultImage", "false")
parameter_object.SetParameter("MaximumNumberOfIterations", "10000")
parameter_object.SetParameter("NumberOfResolutions", "1")
parameter_object.SetParameter("NumberOfSpatialSamples", "10000")
```

**Fixe = le CBCT normalisé masqué. Mobile = l'IRM inversée, normalisée, masquée.** Le
CBCT brut n'est jamais lu : `cbct_folder` ne sert qu'à énumérer les patients.

Tout le reste vient du parameter map `rigid` par défaut d'ITKElastix, qu'il faut
aller lire ailleurs pour connaître l'algorithme réel. Valeurs effectives :

| Paramètre | Valeur | Origine |
|---|---|---|
| `Transform` | `EulerTransform` (rigide, 6 ddl) | défaut |
| `Metric` | **`AdvancedMattesMutualInformation`** | défaut |
| `NumberOfHistogramBins` | 32 (défaut elastix, absent du map) | défaut |
| `Optimizer` | `AdaptiveStochasticGradientDescent` | défaut |
| `ImageSampler` | `RandomCoordinate`, `NewSamplesEveryIteration = true` | défaut |
| `Registration` | `MultiResolutionRegistration`, pyramides `*SmoothingImagePyramid` | défaut |
| `NumberOfResolutions` | **1** (défaut 4) | surchargé |
| `MaximumNumberOfIterations` | **10000** (défaut 256) | surchargé |
| `NumberOfSpatialSamples` | **10000** (défaut 2048) | surchargé |
| `Interpolator` / `ResampleInterpolator` | `LinearInterpolator` / `FinalBSplineInterpolator` ordre 3 | défaut |
| `AutomaticParameterEstimation`, `AutomaticScalesEstimation` | `true` | défaut |
| `MaximumNumberOfSamplingAttempts` | 8 | défaut |

Donc : **information mutuelle de Mattes**, comme attendu en multimodal, une seule
résolution, 10 000 itérations, 10 000 échantillons tirés au hasard et renouvelés à
chaque itération, pas de transformation initiale. `ErodeMask = "true"` est inerte :
`SetFixedMask` / `SetMovingMask` ne sont jamais appelés, le masquage ayant été fait en
amont en mettant les voxels à zéro.

`MatrixRetrieval` reconstruit un `sitk.Euler3DTransform` à partir des 6
`TransformParameters` (3 angles, 3 translations) ; `ComputeFinalMatrix` recompose une
liste ici longue de un, donc sans effet.

**Application** ([AREG_MRI.py:231](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/AREG_MRI.py#L231)) :

```python
transformed_mri = sitk.Resample(original_mri_sitk, original_mri_sitk,
                                transform, sitk.sitkLinear, 0.0, ...)
```

La transformation est appliquée à l'**IRM originale**, pas à l'IRM masquée, et la
géométrie de référence est **celle de l'IRM**, pas celle du CBCT : le volume de sortie
reste sur la grille IRM, et ce qui sort du champ de vue d'origine après déplacement
est perdu.

Sorties dans le dossier `mri=…_cbct=…` : `<nom_IRM_original>_reg.nii.gz` et
`<nom_IRM_original>_reg_transform.tfm` (transformation ITK, LPS, relisible
directement par SimpleITK). Si « Keep the temporary folder » est décoché, les 5
dossiers intermédiaires et leurs parents sont supprimés en fin de CLI.

## 11. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Orientation / centrage IRM | réécriture d'en-tête, matrice choisie à la main | CLI |
| L/R crop, resample | index médian, `sitk.ResampleImageFilter` | CLI |
| Détection du côté, découpe en moitié | comparaison de centres de masse en monde | CLI |
| Segmentation du condyle | **réseau** nnU-Net v2 `3d_fullres` ResEnc XL | sous-processus `nnUNetv2_predict` |
| Point CBCT, boîte TMJ 400³ | centroïde du masque prédit | CLI |
| Point IRM, rotation | centre de masse + SVD des affines | CLI |
| Translation d'approximation | `fiducialregistration` de Slicer, 1 point | widget |
| Approximation manuelle | sliders / poignées, opérateur | widget |
| Inversion, normalisation, masquage | numpy / SimpleITK | CLI |
| Recalage | **elastix rigide, Mattes MI** | CLI |

Aucun apprentissage n'a lieu à l'exécution : le seul réseau est pré-entraîné et sert
de détecteur de repère anatomique.

## 12. Pièges et points fragiles

- **`install_function()` échoue systématiquement.** La liste des dépendances
  ([MRI2CBCT.py:96](MRI2CBCT/MRI2CBCT.py#L96)) contient `('nnunet_version', "==2.8.0")` ;
  ce paquet n'existe pas sur PyPI (AMASSS déclare correctement `('nnunetv2','2.8.0')`).
  `check_lib_installed` renvoie donc toujours `False` : dialogue d'installation à
  chaque action, `pip_install` qui lève, `errorDisplay`, retour `False` — **valeur que
  tous les appelants ignorent**, l'action continue.
- **Le centre de rotation d'elastix est perdu.** `MatrixRetrieval` lit
  `TransformParameters` mais pas le `CenterOfRotationPoint` que porte aussi le
  parameter map de sortie ; le `sitk.Euler3DTransform` reconstruit tourne autour de
  l'origine. La transformation écrite et appliquée ne coïncide avec celle estimée par
  elastix que si ce centre est à l'origine. Code copié tel quel depuis
  [AREG_CBCT/AREG_CBCT_utils/utils.py:830](AREG_CBCT/AREG_CBCT_utils/utils.py#L830) :
  le problème est partagé.
- **Deux conventions de `.tfm` pour la même étape.** L'approximation manuelle écrit
  `flip @ M @ flip` sans inverser
  ([ManualApprox_MRI2CBCT.py:472](MRI2CBCT/MRI2CBCT_utils/ManualApprox_MRI2CBCT.py#L472)),
  là où FlexReg écrit `inv(flip @ M @ flip)` pour la même conversion — la convention
  ITK étant fixe → mobile. La voie automatique passe par `slicer.util.saveNode`, qui
  applique la bonne convention.
- **« Confirm & Save » plante si le volume vient de la scène** : `onConfirm` fait
  `os.path.basename(self._mri_path)` alors que `_mri_path` est remis à `None` dès que
  le volume est choisi par le `qMRMLNodeComboBox`
  ([ManualApprox_MRI2CBCT.py:247](MRI2CBCT/MRI2CBCT_utils/ManualApprox_MRI2CBCT.py#L247)).
  Seul « Load from Folders Above » fonctionne.
- **Le gestionnaire d'erreur du resample plante aussi** :
  `logger.warning(e, file=sys.stderr)`
  ([resample.py:240](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/resample.py#L240)) —
  `Logger.warning` n'accepte pas `file=`, l'exception rattrapée devient un `TypeError`
  non rattrapé.
- **T2 sans T1 casse le resample** : `mri_output_folder` / `cbct_output_folder` ne sont
  définis que dans la branche T1
  ([MRI2CBCT_RESAMPLE_CBCT_MRI.py:157](MRI2CBCT_CLI/MRI2CBCT_RESAMPLE_CBCT_MRI/MRI2CBCT_RESAMPLE_CBCT_MRI.py#L157)) → `NameError`.
- **Suffixes `_T1`/`_T2` en dur** dans `extract_patient_id`
  ([TMJ_crop.py:24](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/TMJ_crop.py#L24)) et `GetPatients`
  ([utils_CBCT.py:41](MRI2CBCT/MRI2CBCT_utils/utils_CBCT.py#L41)) : un `_T3` casse
  l'appariement. Note partagée avec AREG_CBCT.
- **Gauche et droite inversées à dessein** dans `crop_cbct`, sans raison élucidée
  (`TODO`) ; toute la chaîne aval (miroir au resample, détection du côté) dépend de ces
  noms.
- **La permutation d'origine de l'orientation est écrite pour la matrice par défaut** :
  une autre direction dans la table décentre le volume.
- **Aplatissement des sous-dossiers au resample** : homonymes écrasés sans message.
- **La barre de progression** est annoncée non fonctionnelle pour le TMJ crop
  (`labelBarNotWorking`).

### Code mort

- `run_script_get_transformation` et `run_script_crop_volumes`
  ([MRI2CBCT_APPROX.py:63](MRI2CBCT_CLI/MRI2CBCT_APPROX/MRI2CBCT_APPROX.py#L63)) ne
  sont jamais appelées ; `main()` n'exécute que la première étape, et les paramètres
  XML `mean_folder` / `ROI_file` sont commentés. L'import
  `from MRI2CBCT_CLI_utils import approximation, get_transformation, crop_volume`
  subsiste et force le chargement de `crop_approximation`, donc de `torch`, `sklearn`
  et `torchreg` — exactement ce que l'import paresseux du `__init__` visait à éviter.
- [crop_approximation.py](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/crop_approximation.py)
  (359 l.) et [nmi.py](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/nmi.py) (155 l.) sont
  l'**ancienne** approximation : `torchreg.AffineRegistration` rigide (échelles
  `(4,2)`, itérations `(100,30)`, Adam) pilotée par une NMI gaussienne différentiable
  (`nbins=64`), avec une recherche d'hyperparamètres `ParameterSampler` sur 40 tirages
  (`learning_rate ∈ logspace(-5,-3,10)`, `sigma ∈ logspace(-2,-1,4)`). Remplacée par la
  voie condyle + fiducial au commit `2e79862`. Plus aucun appelant.
- [utils_CBCT.py](MRI2CBCT/MRI2CBCT_utils/utils_CBCT.py) en entier : atteignable
  seulement par `NumberScan()`, jamais appelée. Idem `getGPUUsage()`, `getModelUrl()`
  (renvoie `{"MeanCBCT": "xxx", "ROI": "xxx"}`), `TestScanDCM`, `getTestFileListDCM`.
- `MRI2CBCTLogic.process()` et `MRI2CBCTTest` : boilerplate de seuillage du gabarit
  Slicer, sans rapport avec le module.
- `predict_entry_point` importé en tête de
  [MRI2CBCT_TMJ_CROP.py](MRI2CBCT_CLI/MRI2CBCT_TMJ_CROP/MRI2CBCT_TMJ_CROP.py#L5) et
  jamais utilisé — mais il impose `nnunetv2` importable dans Slicer alors que la
  prédiction passe par un sous-processus.
- `run_resample` existe en double :
  [resample.py:243](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/resample.py#L243) et une copie dans
  [MRI2CBCT_RESAMPLE_CBCT_MRI.py:32](MRI2CBCT_CLI/MRI2CBCT_RESAMPLE_CBCT_MRI/MRI2CBCT_RESAMPLE_CBCT_MRI.py#L32) ;
  c'est la copie locale qui sert.
- `downloadModel()` prétend dans sa docstring utiliser `getModelUrl` ; elle télécharge
  un `TestFile.zip` codé en dur, pour les quatre boutons « Test File ».

## 13. Environnement

| Élément | Valeur |
|---|---|
| Interpréteur | Python de Slicer, partout (`slicer.cli.run`, `#!/usr/bin/env python-real`) |
| Conda | aucun |
| GPU | optionnel, repli CPU automatique dans nnU-Net ([condyle_segmentation.py:55](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/condyle_segmentation.py#L55)) |
| torch | `2.2.0`, index `download.pytorch.org/whl/cu118` ([MRI2CBCT.py:117](MRI2CBCT/MRI2CBCT.py#L117)) |
| numpy | épinglé **1.26.4** ; `numexpr==2.9.0` |
| pydicom | épinglé **3.0.2** — le rétrograder casse `dicomweb-client`, `highdicom` et tous les modules DICOM de Slicer ([MRI2CBCT.py:83](MRI2CBCT/MRI2CBCT.py#L83)) |
| dicom2nifti | `2.6.2` |
| Recalage | `itk-elastix` (0.19.2 dans Slicer 5.12) |
| Autres | `einops`, `nibabel`, `pandas`, `scikit-learn`, `torchreg`, `SimpleITK`, `psutil` |
| nnU-Net | attendu via l'extension **SlicerNNUNet** ; l'entrée pip est erronée (§12) |

Les CLI en sous-dossier sont enregistrés via un dossier plat de liens symboliques,
d'où le `os.path.realpath(__file__)` avant le `sys.path.append("..")` en tête de
chacun : sans lui, `MRI2CBCT_CLI_utils` est introuvable en développement.

## 14. Littérature

Le papier correspondant est **Novel CBCT-MRI Registration Approach for Enhanced
Analysis of Temporomandibular Degenerative Joint Disease**, Leroux G. *et al.*,
*Clinical Image-Based Procedures* (CLIP 2024), LNCS vol. 15196, Springer. Le résumé
décrit la séquence implémentée ici : orientation automatique, resampling, inversion
de l'IRM, normalisation, puis recalage rigide par information mutuelle.

Deux divergences entre le papier et l'état actuel du code : l'approximation du dépôt
à l'époque était la voie `torchreg` + NMI de
[crop_approximation.py](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/crop_approximation.py), depuis
remplacée par nnU-Net condyle + `fiducialregistration` ; et ni la segmentation du
condyle ni le crop TMJ ne figurent dans le résumé publié. Le README du dépôt annonce
d'ailleurs encore *« Currently, cropping is done using the AutoCrop method. In the
future, this step will be replaced by a trained model »* — c'est fait.

- [Novel CBCT-MRI Registration Approach… (CLIP 2024, LNCS 15196)](https://link.springer.com/chapter/10.1007/978-3-031-73083-2_7)
- [MRI and CBCT image registration of TMJ: a systematic review](https://journalotohns.biomedcentral.com/articles/10.1186/s40463-016-0144-4)
- [Three-Dimensional Assessment of TMJ Using MRI-CBCT Image Registration (PLOS ONE)](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0169555)
- [Aligning MRI and CBCT for Advanced TMJ Diagnostics (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12360114/)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)

**Bibliographie complète : [SOURCES.md](SOURCES.md)** — références vérifiées,
fichiers récupérés dans ce dossier (dont l'article de Caleme *et al.* 2025 en texte
intégral et deux rapports NA-MIC Project Week), et ce qu'il reste à consulter en
ligne. On y trouve aussi la seule évaluation chiffrée publiée du pipeline
(sub-millimétrique, 98,75 % de réussite, Gaydamour *et al.*, CLIP 2025).
