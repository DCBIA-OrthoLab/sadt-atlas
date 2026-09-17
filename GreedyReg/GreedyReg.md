# GreedyReg — pipeline complet

Recalage de CBCT T1/T2 en appelant le binaire **greedy** d'ITK-SNAP en sous-processus.
Aucun réseau n'est entraîné ni appelé dans le chemin principal : le seul réseau du
module sert à l'initialisation « distante » et c'est ALI_CBCT, emprunté tel quel.

## 1. Situation dans la chaîne

Rien dans le dépôt n'appelle GreedyReg. C'est un outil terminal, piloté par l'opérateur,
et il ne produit l'entrée d'aucun autre module.

| Appelé | Comment | Quand |
|---|---|---|
| [GreedyReg_CLI](GreedyReg_CLI/GreedyReg_CLI.py) | `slicer.cli.run(slicer.modules.greedyreg_cli, …)` | tout recalage automatique, mono-cas ou batch |
| binaire `greedy` | `subprocess.run` **depuis le CLI** | deux invocations par cas (recalage puis rééchantillonnage) |
| [ALI_CBCT](ALI_CBCT/ALI_CBCT.py) | `slicer.cli.run(slicer.modules.ali_cbct, …)` | mode « Distant Registration » uniquement |

Le module Slicer ne lance jamais `greedy` lui-même : il assemble les paramètres
([Logic.py:286](GreedyReg/GreedyReg_Method/Logic.py#L286)) et laisse le CLI faire.
La docstring de `GreedyRegLogic` l'affirme explicitement et c'est vérifié : aucun
`subprocess` dans le widget hors téléchargement du binaire.

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [GreedyReg/GreedyReg.py](GreedyReg/GreedyReg.py) | widget, 1704 lignes dont ~700 de UI Qt (molette de rotation, overlay de slice, feuilles de style) | Python de Slicer |
| [GreedyReg_Method/Logic.py](GreedyReg/GreedyReg_Method/Logic.py) | téléchargement du binaire, paramètres CLI, appariement, Kabsch, parsing ALI | Python de Slicer |
| [GreedyReg_CLI/GreedyReg_CLI.py](GreedyReg_CLI/GreedyReg_CLI.py) | boucle sur les paires, construit et lance les deux commandes `greedy` | `python-real`, c'est-à-dire **le Python de Slicer** |
| `GreedyReg_CLI/bin/<plateforme>/greedy` | l'exécutable, **absent du dépôt**, téléchargé à la demande | natif |

Point important pour un repreneur : il n'y a **pas d'environnement conda**. Le commentaire
de [Logic.py:76](GreedyReg/GreedyReg_Method/Logic.py#L76) le dit — le CLI tourne dans le
Python de Slicer, donc un `slicer.util.pip_install` fait depuis le widget est
immédiatement visible du sous-processus. Pas de GPU non plus : greedy est CPU.

Les deux premières lignes de [GreedyReg.py](GreedyReg/GreedyReg.py#L1) effacent le
`__pycache__` du module à chaque import — reliquat de développement.

## 3. Le binaire greedy : d'où il vient

`greedyBinaryPath()` cherche `GreedyReg_CLI/bin/{linux|mac|windows}/greedy[.exe]`.
S'il manque, un bandeau rouge propose `downloadGreedyBinary()`
([Logic.py:106](GreedyReg/GreedyReg_Method/Logic.py#L106)) qui va chercher une archive
**ITK-SNAP 4.2.2** sur SourceForge et n'en extrait que `bin/greedy` :

| Plateforme | Source | Extraction |
|---|---|---|
| Linux | `itksnap-4.2.2-20241202-Linux-x86_64.tar.gz` | `tarfile`, membre `…/bin/greedy`, `chmod 755` |
| macOS (arm64) | `itksnap-4.2.2-20241202-MacOS-arm64.tar.gz` | idem |
| Windows | `itksnap-4.2.2-20241202-win64-AMD64.exe` (installeur NSIS) | 7-Zip si présent, sinon **installation silencieuse** puis désinstallation |

Le chemin Windows est le plus fragile et le code le documente bien
([Logic.py:161](GreedyReg/GreedyReg_Method/Logic.py#L161)) : `/D=` de NSIS ne supporte
pas les guillemets, donc l'installation se fait dans `%SystemDrive%\_greedyreg_nsis_tmp`
(chemin sans espace), on copie `greedy.exe`, puis `Uninstall.exe /S`.

Aucune vérification d'intégrité (pas de somme de contrôle) sur l'archive téléchargée.

## 4. Les trois modes, et ce qui les distingue réellement

| Mode | Ce qui est calculé | Qui le calcule | Sortie |
|---|---|---|---|
| **Manual Alignment** | rien : l'opérateur bouge un `vtkMRMLLinearTransformNode` | widget | matrice dans la scène, servant d'`-ia` |
| **Automatic Registration** | affine ou rigide par optimisation d'une métrique d'intensité | binaire `greedy` via le CLI | `.nii.gz` recalé + `.mat` |
| **Distant Registration** | rigide en fermé (SVD/Kabsch) sur 3–5 landmarks prédits | widget + ALI_CBCT | **seulement** une matrice, à raffiner ensuite |

**Le mot « Distant » ne désigne pas du calcul à distance.** Le panneau s'intitule
« Distant Registration (Large Misalignment) » : il s'agit de deux scans *éloignés
géométriquement* (grand désalignement initial). Tout tourne en local.
**Aucun réseau, aucun socket, aucun chiffrement, aucune attestation** : il n'y a pas
une seule requête sortante dans le module hors `urllib.request.urlretrieve` vers
SourceForge (binaire greedy) et vers les releases GitHub du dépôt (poids ALI).
Le seul contact avec l'extérieur est donc le téléchargement d'outils, jamais l'envoi
de données patient.

### 4.1 Mode manuel

Deux jeux de commandes agissent sur le **même** nœud de transformation :

- six `ctkSliderWidget` (rotations ±180°, translations ±200 mm), composées dans cet
  ordre : `Translate` puis `RotateX`, `RotateY`, `RotateZ`
  ([GreedyReg.py:1192](GreedyReg/GreedyReg.py#L1192)) ;
- « Center T2 on T1 » : translation pure entre les centres des deux volumes, calculés
  en IJK puis passés en RAS par `GetIJKToRASMatrix`
  ([Logic.py:381](GreedyReg/GreedyReg_Method/Logic.py#L381)) ;
- les poignées natives de Slicer (`SetEditorScalingEnabled(False)` → jamais d'échelle) ;
- un prototype assumé, « Sensitivity Demo » : une molette Qt reparentée sur les vues
  Red/Yellow/Green. L'axe de rotation dépend de la vue (Red→Z, Yellow→X, Green→Y),
  le glissé hors molette translate dans le plan de coupe (0.5 mm/pixel × gain),
  et la taille de la molette suit le zoom (`baseFov / fovMean`, borné à 0.55–1.90).
  Le commentaire [GreedyReg.py:499](GreedyReg/GreedyReg.py#L499) explique pourquoi :
  les poignées natives recalculent leur delta depuis la souris brute, donc amortir la
  matrice après coup n'a aucun effet visible.

Le volume mobile n'est **pas** durci avant l'export : `slicer.util.exportNode(node, path)`
a `world=False` par défaut (vérifié dans `slicer/util.py`), donc la transformation
manuelle atteint greedy **uniquement** par le fichier `-ia`. Voir §9 pour le problème
de convention que cela pose.

### 4.2 Mode automatique

`onRunRegistration()` ([GreedyReg.py:1204](GreedyReg/GreedyReg.py#L1204)) fabrique une
arborescence dans `tempfile.mkdtemp()` : `T1/`, `T2/`, `INIT/`, `MASK/`, `OUTPUT/`,
exporte les deux volumes sous le faux identifiant `CASE0001`, écrit l'init, puis
appelle le CLI en **mode batch d'une seule paire**. Le mono-cas n'a pas de chemin de
code propre : c'est le batch avec un dossier d'un fichier.

Un `QTimer` de 1 s interroge le `cliNode` ; à la fin, le volume recalé est chargé
depuis le dossier temporaire. Ce dossier n'est **jamais effacé** (aucun `rmtree` dans
le widget) : les résultats survivent jusqu'au nettoyage système, ce dont dépend
d'ailleurs le bouton « Save Registered Volume », qui se contente d'un `shutil.copy`.

### 4.3 Mode distant

`onRunDistantRegistration()` ([GreedyReg.py:1406](GreedyReg/GreedyReg.py#L1406)) :

1. une seule région est retenue, par ordre de priorité **base crânienne > mandibule >
   maxillaire** (`_selectedDistantRegion`, [GreedyReg.py:1397](GreedyReg/GreedyReg.py#L1397)) :
   cocher plusieurs cases n'additionne pas les landmarks, la première trouvée gagne ;
2. les deux volumes sont exportés en `.nii.gz` dans un dossier temporaire ;
3. une **file de jobs** ALI est construite : un job par (scan × sous-dossier de modèles),
   exécutés en série par chaînage d'observateurs `ModifiedEvent`
   ([GreedyReg.py:1493](GreedyReg/GreedyReg.py#L1493)) ;
4. les json de sortie sont relus, coordonnées **LPS → RAS** (`[-x, -y, z]`,
   [Logic.py:517](GreedyReg/GreedyReg_Method/Logic.py#L517)) ;
5. si ≥ 3 landmarks sont communs aux deux scans, `rigidFromLandmarks()` calcule un
   rigide par SVD ; sinon échec explicite.

Régions et landmarks (`REGION_CONFIG`, [Logic.py:20](GreedyReg/GreedyReg_Method/Logic.py#L20)) :

| Région | Landmarks | Dossiers de poids |
|---|---|---|
| `MANDMASK` | RGo, LGo, Gn, Me, Pog | `Lower_Bones_1`, `Lower_Bones_2` |
| `MAXMASK` | A, ANS, LOr, ROr, PNS | `Upper_Bones_v2` |
| `CBMASK` | S, N, RPo, LPo | `Cranial_Base` |

Les poids viennent de la release `v0.1-v2.0_models` du dépôt, un `.zip` par dossier,
extraits sous `Documents/SlicerDownloads/GreedyReg/ALIModels/<dossier>/`.

**Le réseau appelé.** ALI_CBCT ne produit pas de heatmap : c'est de l'**apprentissage
par renforcement**. Un agent par landmark navigue dans le volume, observe un cube de
`agent_FOV = [64,64,64]` voxels, et choisit un déplacement parmi `MOVEMENTS` ; le réseau
`DNet` (couche de transition à 1024 canaux, `out_channels = len(MOVEMENTS["id"])`) est
rechargé par landmark depuis les `.pth` du dossier ([ALI_CBCT.py:159](ALI_CBCT/ALI_CBCT.py#L159)).
Paramètres imposés par GreedyReg ([Logic.py:471](GreedyReg/GreedyReg_Method/Logic.py#L471)) :
`spacing = [1, 0.3]` mm (recherche grossière puis fine), `speed_per_scale = [1,1]`,
`spawn_radius = 10`, `DCMInput = false`.

**Le calcul rigide** ([Logic.py:535](GreedyReg/GreedyReg_Method/Logic.py#L535)) est un
Kabsch classique : centrage, `H = movingᵀ·fixed`, SVD, `R = Vᵀ·Uᵀ`, correction de
réflexion si `det(R) < 0`, `t = c_fixed − R·c_moving`. La matrice obtenue va donc de
**mobile vers fixe, en RAS** — exactement la convention d'un nœud de transformation
Slicer, où elle est posée telle quelle.

Le message de fin est honnête : *« Distant registration complete! Now run Automatic
Registration to refine »*. Ce mode ne recale pas, il initialise.

## 5. La ligne de commande greedy

`buildRegistrationCommand()` ([GreedyReg_CLI.py:100](GreedyReg_CLI/GreedyReg_CLI.py#L100))
produit toujours exactement ceci, aucune option n'est exposée en dehors de la métrique
et du nombre de degrés de liberté :

```
greedy -d 3 -a \
  -m NMI | -m NCC 4x4x4 | -m SSD \
  -i <T1.nii.gz> <T2.nii.gz> \
  -o <ID>_warp.mat \
  -n 100x100x50x25 \
  -e 0.5 \
  -search 100 10 20 \
  -dof 6|12 \
  -ia <init.mat> \
  [-gm <mask binarisé>]
```

| Flag | Valeur | Signification (doc greedy) |
|---|---|---|
| `-d 3` | fixe | dimension de l'image |
| `-a` | fixe | **mode affine/rigide**. Le mode difféomorphe de greedy, qui est son mode par défaut et sa raison d'être, n'est jamais utilisé ici |
| `-m NMI` | index 0 (défaut UI) | information mutuelle normalisée, pour intensités hétérogènes |
| `-m NCC 4x4x4` | index 1 | corrélation croisée locale, rayon **en voxels** |
| `-m SSD` | index 2 | somme des carrés des différences, même modalité |
| `-i fixe mobile` | T1 puis T2 | ordre imposé : `-i <fixed> <moving>` |
| `-o` | `<ID>_warp.mat` | matrice affine 4×4 (texte) |
| `-n 100x100x50x25` | fixe | **4 niveaux** de pyramide multi-résolution, 100/100/50/25 itérations du plus grossier au plus fin (le défaut de greedy est `100x100`, 2 niveaux) |
| `-e 0.5` | fixe | pas de temps — **sans effet en mode affine** : la doc greedy dit noir sur blanc « `-s` and `-e` have no effect » pour `-a`. Ligne morte |
| `-search 100 10 20` | fixe | recherche aléatoire de 100 transformations rigides avant l'optimisation : σ_angle = 10°, σ_offset = 20 (voxels selon la prose de la doc, unités physiques selon son texte d'usage — l'ambiguïté est dans greedy, pas ici) |
| `-dof 6` / `12` | combo « Rigid »/« Affine » | 6 = rigide, 12 = affine complet. `-dof 7` (rigide + échelle uniforme) n'est pas proposé |
| `-ia` | toujours fourni | matrice d'initialisation. Jamais `-ia-identity`, jamais `-ia-image-centers` |
| `-gm` | si masque | masque **du volume fixe** : les gradients de la métrique ne sont calculés que dedans |

Puis un second appel, systématique, en mode rééchantillonnage :

```
greedy -d 3 -rf <T1> -rm <T2> <ID>_registered.nii.gz -r <ID>_warp.mat
```

`-rf` définit l'espace de référence (le fixe), `-rm` la paire entrée/sortie. Le volume
de sortie est donc **le T2 d'origine rééchantillonné dans la grille du T1**, interpolation
linéaire (défaut de `-ri`). Chaque appel est borné par `timeout = 600 s`.

## 6. Entrées, appariement, masques, initialisation

**Appariement.** `ID_PATTERN = ^([A-Za-z]+\d+)` appliqué au nom de fichier, en
majuscules ([GreedyReg_CLI.py:37](GreedyReg_CLI/GreedyReg_CLI.py#L37)). `A01_t1.nii.gz`
→ identifiant `A01`. Une paire existe si le même identifiant est trouvé dans le dossier
T1 et dans le dossier T2 ; masques (`.nii`/`.nii.gz`) et inits (`.mat`) sont optionnels
et rattachés par le même identifiant. Un fichier `01_T1.nii.gz` (chiffres d'abord) ou
`Patient-01.nii.gz` n'est jamais apparié, **silencieusement**.

`findBatchPairs()` dans le widget duplique cette logique pour le libellé « Found N pairs » ;
le commentaire prévient que les deux implémentations doivent rester synchronisées.

**Masque.** Exporté depuis un `vtkMRMLSegmentationNode` ou un labelmap vers `.nii.gz`,
puis binarisé côté CLI : `(get_fdata() > 0).astype(float32)`
([GreedyReg_CLI.py:92](GreedyReg_CLI/GreedyReg_CLI.py#L92)). Tous les segments d'une
segmentation multi-labels sont donc fusionnés en un seul masque. C'est le seul usage
réel de `nibabel`, avec l'application d'affine du batch distant.

**Initialisation.** Sans fichier d'init, `writeIdentityInit()` écrit l'identité avec
`matrix[0,3] = 0.001` — un micron de translation. Le commentaire explique le pourquoi :
« so Greedy doesn't treat it as identity ». Ce comportement n'est documenté nulle part
côté greedy ; c'est un contournement empirique, à considérer comme tel.

**Aucun prétraitement d'intensité** : pas de normalisation, pas de recadrage, pas de
rééchantillonnage préalable, pas de conversion d'orientation. Les NIfTI sont passés
tels quels, et greedy travaille dans l'espace physique RAS des en-têtes.

## 7. Le mode batch

Deux batchs indépendants, qui ne font pas la même chose.

**Batch automatique** ([GreedyReg.py:1537](GreedyReg/GreedyReg.py#L1537)). Le widget ne
boucle pas : il lance **un seul** `GreedyReg_CLI` sur les dossiers, et c'est le CLI qui
itère (`main()`, [GreedyReg_CLI.py:141](GreedyReg_CLI/GreedyReg_CLI.py#L141)), en émettant
des balises `<filter-progress>` / `<filter-comment>` lues par l'infrastructure CLI de
Slicer. Le dossier de sortie est **le dossier T2 lui-même**. Aucun masque n'est binarisé
en amont, aucun init n'est passé (`initFolder=""`) : le batch part toujours de
l'identité nudgée. Premier cas en échec → `sys.exit(1)` → tout le batch s'arrête.

**Batch distant** ([GreedyReg.py:1606](GreedyReg/GreedyReg.py#L1606)). Là, le widget
boucle cas par cas, avec une file ALI par paire. Le résultat n'est pas un volume recalé
mais un **en-tête réécrit** ([GreedyReg.py:1690](GreedyReg/GreedyReg.py#L1690)) :

```python
newAffine[:3, :3] = R @ movingImg.affine[:3, :3]
newAffine[:3, 3]  = R @ movingImg.affine[:3, 3] + t
nib.save(nib.Nifti1Image(movingImg.get_fdata(), newAffine, movingImg.header), out)
```

Les voxels ne bougent pas, seule l'affine voxel→monde change. C'est correct : l'affine
NIfTI est en RAS, comme la matrice de Kabsch. Sortie : `<ID>_t2_aligned.nii.gz`, écrite
**dans le dossier T2**. Greedy n'est pas appelé du tout dans ce batch.

## 8. Sorties

| Fichier | Contenu | Où |
|---|---|---|
| `<ID>_registered.nii.gz` | T2 rééchantillonné dans la grille T1 | mono-cas : dossier temporaire ; batch : dossier T2 |
| `<ID>_warp.mat` | matrice affine 4×4 greedy | idem |
| `<ID>_t2_aligned.nii.gz` | T2 voxels inchangés, affine corrigée | dossier T2 (batch distant) |

**Format de la transformation, et la conversion qui n'existe pas.** `<ID>_warp.mat`
est un fichier **texte de quatre lignes**, dans la convention greedy : une matrice 4×4
qui envoie les coordonnées **RAS du fixe vers les coordonnées RAS du mobile**
(`[ras(mobile);1] = M · [ras(fixe);1]`, doc greedy, section « Affine mode »).

Le bouton « Save Transform Matrix » fait un `shutil.copy` brut de ce fichier
([GreedyReg.py:1288](GreedyReg/GreedyReg.py#L1288)). **Il n'y a aucune conversion vers
`.tfm` ni vers quoi que ce soit d'ITK dans tout le module.** Un repreneur doit le savoir :

- ce n'est pas un fichier de transformation ITK (`TxtTransform`), donc il ne se charge
  pas comme transformation dans Slicer malgré son extension `.mat` ;
- une transformation ITK/Slicer sur disque est en **LPS**, celle-ci est en **RAS** :
  il faut conjuguer par `diag(-1,-1,1,1)` en plus d'un éventuel inverse ;
- la conversion attendue passe par `c3d_affine_tool` (recommandé par la doc greedy),
  ou par le même code que [FlexReg_CLI.py:186](FlexReg_CLI/FlexReg_CLI.py#L186), qui
  fait exactement ça pour ses propres matrices.

Comparé à FlexReg, qui produit un `.tfm` SimpleITK réutilisable par les autres modules
du dépôt, GreedyReg est un cul-de-sac : sa matrice n'est consommée par personne.

## 9. Convention d'initialisation : très probable inversion

Le mode manuel écrit dans `<ID>_init.mat` la matrice du nœud de transformation Slicer,
telle quelle ([Logic.py:277](GreedyReg/GreedyReg_Method/Logic.py#L277)).

- Cette matrice est un `MatrixTransformToParent` appliqué au volume **mobile** : elle
  envoie les coordonnées propres du mobile vers le monde, donc **mobile → fixe**.
- `-ia` attend une matrice de la même nature que celle produite par `-o`, donc
  **fixe → mobile**.

Les deux sont inverses l'une de l'autre. Le pré-alignement manuel est donc très
vraisemblablement fourni à greedy à l'envers (rotation transposée, translation de signe
opposé). Le reste du dépôt connaît la convention : [FlexReg_CLI.py:186](FlexReg_CLI/FlexReg_CLI.py#L186)
inverse explicitement, avec le commentaire « convention ITK : fixed -> moving ».

Pourquoi ça ne se voit pas toujours : `-search 100 10 20` échantillonne 100 rigides
aléatoires avant l'optimisation et 4 niveaux de pyramide pardonnent beaucoup. Un
mauvais point de départ ralentit et fragilise, il n'interdit pas de converger.
À vérifier par un test simple (translation pure de 20 mm en X, comparer l'init écrit
et la matrice renvoyée) avant de corriger.

## 10. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Pré-alignement manuel | interaction, aucune inférence | widget |
| Centrage T2 sur T1 | géométrique (centres d'images) | widget |
| Recalage rigide/affine | **optimisation d'intensité** (NMI/NCC/SSD, LBFGS côté greedy) | binaire natif, CPU |
| Rééchantillonnage | interpolation linéaire | binaire natif |
| Landmarks du mode distant | **réseau**, apprentissage par renforcement (ALI_CBCT, `DNet`) | `slicer.cli.run(ali_cbct)`, GPU si dispo |
| Rigide sur landmarks | géométrique, SVD/Kabsch | widget (numpy) |
| Binarisation du masque | seuillage `> 0` | CLI (nibabel) |

## 11. Environnement

| Élément | Valeur | Source |
|---|---|---|
| Interpréteur | Python de Slicer, pour le widget **et** le CLI (`#!/usr/bin/env python-real`) | [GreedyReg_CLI.py:1](GreedyReg_CLI/GreedyReg_CLI.py#L1) |
| Dépendance du CLI | `nibabel` seul, installé par `ensureNibabelInstalled()` après confirmation | [Logic.py:82](GreedyReg/GreedyReg_Method/Logic.py#L82) |
| Dépendances du mode distant | `itk`, `dicom2nifti==2.6.2`, `pydicom==3.0.2`, `monai` (`1.3.2` si Python ≥ 3.10, sinon `0.7.0`) | [Logic.py:336](GreedyReg/GreedyReg_Method/Logic.py#L336) |
| torch | **supposé déjà présent** par la chaîne NNUNet/PyTorch de l'extension, jamais installé ici | commentaire [Logic.py:331](GreedyReg/GreedyReg_Method/Logic.py#L331) |
| GPU | inutile pour greedy ; utile pour ALI (`torch.cuda.empty_cache()` côté ALI) | — |
| conda / WSL | **aucun**, contrairement à la plupart des modules du dépôt | — |

Les versions épinglées de `pydicom`/`dicom2nifti` ne sont pas cosmétiques : le commit
`b25a83e` (« Keep pydicom 3 and dicom2nifti 2.6.2 so Slicer DICOM modules still load »)
indique qu'un autre choix casse les modules DICOM de Slicer.

## 12. Pièges et points fragiles

- **Le batch écrit ses sorties dans le dossier d'entrée T2.** `A01_registered.nii.gz`
  et `A01_t2_aligned.nii.gz` correspondent tous deux à l'identifiant `A01` selon
  `ID_PATTERN`. Au second lancement, le dictionnaire `{id: chemin}` ne garde qu'une
  entrée par identifiant, **celle rencontrée en dernier dans `os.listdir`** : on peut
  donc recaler le résultat du run précédent, de manière non déterministe. Il n'y a
  aucun filtre d'exclusion sur les suffixes produits.
- **Le `.mat` produit n'est pas une transformation Slicer** (§8) : RAS, sens
  fixe→mobile, format texte brut.
- **L'init du mode manuel est probablement inversé** (§9).
- **`-e 0.5` est un no-op** en mode affine. Confusion possible pour qui croit régler
  un pas d'optimisation.
- **Bouton mort** : « Save Registered Volume » du panneau Distant lit
  `self._distantResult`, qui n'est **jamais** assigné — il répondra toujours
  « No result to save! ». Le mode distant ne produit d'ailleurs pas de volume.
- **Cases à cocher trompeuses** dans le mode distant : les trois structures sont des
  cases indépendantes mais `_selectedDistantRegion()` en retourne une seule, par ordre
  de priorité fixe. Cocher « Mandibule + Maxillaire » ne combine pas les 10 landmarks.
- **Échec ALI silencieux** : ALI_CBCT loggue les problèmes de poids en avertissement et
  sort en code 0. Le code s'en protège en imprimant systématiquement `GetOutputText()`
  ([GreedyReg.py:1508](GreedyReg/GreedyReg.py#L1508)), mais l'utilisateur ne voit que
  « only 0 matched landmarks ».
- **Les dossiers temporaires ne sont jamais nettoyés** côté widget (`mkdtemp` ×3, aucun
  `rmtree`). Le CLI, lui, nettoie bien son `caseTmpDir` par cas.
- **Un échec arrête tout le batch** (`sys.exit(1)` dans la boucle du CLI), sans reprise
  ni liste des cas restants.
- **Masque multi-segments aplati** par le `> 0`, et le masque doit être dans l'espace
  du **fixe** : `-gm` s'applique au fixe, ce que l'UI indique (« Mask (T1) ») mais que
  rien ne vérifie.
- **Métadonnées du module non renseignées** : `contributors = ["Your Lab"]`,
  `acknowledgementText = ""`.
- Le widget contient environ 500 lignes de feuilles de style et de widgets Qt
  (`StandaloneRotationWheel`, `SliceTranslationOverlay`) explicitement qualifiés de
  prototype dans les commentaires ; ils modifient le même nœud de transformation que
  les curseurs, donc les deux jeux de commandes se marchent dessus sans se resynchroniser
  (les curseurs ne sont pas remis à jour après un mouvement de molette).

## 13. Littérature

Le moteur est publié, le module ne l'est pas.

- **greedy** : outil de Paul Yushkevich (PICSL, UPenn), intégré à ITK-SNAP. La
  référence usuelle pour le citer est
  [Venet, Pati, Yushkevich, Bakas, *Accurate and Robust Alignment of Variable-Stained
  Histologic Images Using a General-Purpose Greedy Diffeomorphic Registration Tool*
  (arXiv:1904.11929)](https://arxiv.org/abs/1904.11929).
  Documentation : [greedy.readthedocs.io](https://greedy.readthedocs.io/en/latest/reference.html),
  code : [pyushkevich/greedy](https://github.com/pyushkevich/greedy).
  Attention : le papier et l'outil portent sur le recalage **difféomorphe** ; GreedyReg
  n'utilise que le mode affine/rigide (`-a`), qui n'en est que l'étape d'initialisation.
- **ALI_CBCT** :
  [Gillot et al., *Automatic landmark identification in cone-beam computed tomography*,
  Orthodontics & Craniofacial Research, 2023](https://onlinelibrary.wiley.com/doi/10.1111/ocr.12642) —
  agents virtuels naviguant dans un espace volumétrique multi-échelle, erreur moyenne
  annoncée de 1.54 ± 0.87 mm sur 32 landmarks. Dépôt d'origine :
  [Maxlo24/ALI_CBCT](https://github.com/Maxlo24/ALI_CBCT).
- **GreedyReg lui-même** : aucune publication. L'approche « pré-alignement manuel puis
  affine par intensité, avec masque » est celle du panneau *Registration* d'ITK-SNAP,
  dont ce module est une transposition dans Slicer ; c'est la seule filiation
  revendiquable depuis le code.

**Bibliographie complète : [SOURCES.md](SOURCES.md)** — références vérifiées,
fichiers récupérés dans ce dossier (papier greedy, papier ALI_CBCT), et la
distinction, détaillée, entre ce que le papier greedy décrit et ce que ce module
exécute réellement.
