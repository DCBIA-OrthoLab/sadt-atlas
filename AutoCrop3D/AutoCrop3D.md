# AutoCrop3D — pipeline complet

Découpe en lot d'un dossier de volumes selon une boîte ROI unique (ou une ROI par
patient). Aucun réseau, aucun conda, aucun GPU : c'est de la manipulation de
header ITK et un slicing numpy. Toute la difficulté est dans les conventions de
coordonnées.

## 1. Situation dans la chaîne

Rien dans le dépôt n'appelle AutoCrop3D et AutoCrop3D n'appelle rien d'autre que
Slicer. Il est déclaré dans [CMakeLists.txt:39](CMakeLists.txt#L39) et c'est tout.

En pratique il se place **en amont** des segmenteurs (AMASSS, BATCHDENTALSEG) ou
**en aval** d'eux : le mode « génération de VTK » ne se déclenche que si le nom
du fichier contient `seg`, ce qui suppose qu'on lui donne des labelmaps déjà
produites ailleurs.

| Appelé | Quand | Pourquoi |
|---|---|---|
| `slicer.modules.autocrop3d_cli` | voie par défaut | extraction d'indices, sans rééchantillonnage |
| `slicer.modules.cropvolume.logic()` | case « Use module "Crop Volume" for tilted images » | déléguer à Slicer le cas ROI tournée |

Aucun modèle, aucun `.pth`, aucun téléchargement : vérifié par grep sur
`torch|conda|\.pth|monai|nnunet` dans tout AutoCrop3D/ — zéro occurrence hors
`vtkPolyData` nommé `model`.

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [AutoCrop3D.py](AutoCrop3D/Crop_Volumes_UI/AutoCrop3D.py) | widget, validation des entrées, voie Crop Volume | Python de Slicer |
| [AutoCrop3D_CLI.py](AutoCrop3D/Crop_Volumes_CLI/AutoCrop3D_CLI.py) | la voie principale, 175 lignes, tout le crop | Python de Slicer (`SlicerMacroBuildScriptedCLI`) |
| [FilesType.py](AutoCrop3D/Crop_Volumes_CLI/Crop_Volumes_utils/FilesType.py) | `Search` (glob par extension) et `ChangeKeyDict` (appariement patient→ROI) | idem |
| [GenerateVTKfromSeg.py](AutoCrop3D/Crop_Volumes_CLI/Crop_Volumes_utils/GenerateVTKfromSeg.py) | marching cubes sur la labelmap découpée | idem |
| [CropCBCT.py](AutoCrop3D/Crop_Volumes_CLI/Crop_Volumes_utils/CropCBCT.py) | **code mort**, le dit lui-même : `!!! UNUSED !!!` | — |

Le CLI est un *scripted CLI* ([CMakeLists.txt](AutoCrop3D/Crop_Volumes_CLI/CMakeLists.txt)),
donc lancé par `slicer.cli.run` dans le Python de Slicer. Pas d'environnement
conda, contrairement à AMASSS ou ALI.

## 3. Ce qui définit la boîte de crop

Un fichier **markups ROI json** (`.mrk.json`), lu ainsi
([AutoCrop3D_CLI.py:70](AutoCrop3D/Crop_Volumes_CLI/AutoCrop3D_CLI.py#L70)) :

```python
ROI = json.load(open(ROI_Path))['markups'][0]
ROI_Center = np.array(ROI['center'])
ROI_Size   = np.array(ROI['size'])
Lower = ROI_Center - ROI_Size / 2
Upper = ROI_Center + ROI_Size / 2
```

Trois champs du json sont **ignorés**, et c'est la source principale des
surprises :

- `coordinateSystem`. Le fichier de test
  [ROI.mrk.zip](AutoCrop3D/Crop_Volumes_UI/Testing/Test_data/ROI.mrk.zip) déclare
  `"coordinateSystem": "LPS"`, ce qui est la convention du dépôt (tous les
  écrivains de markups y écrivent `"LPS"` en dur : ALI_CBCT, ASO_CBCT, AREG_CBCT,
  FlexReg, VFACE). `center` est donc en LPS, exactement ce qu'attend
  `TransformPhysicalPointToContinuousIndex` de SimpleITK. Mais **le champ n'est
  jamais lu** : une ROI sauvée en RAS donnerait un centre dont x et y ont le
  signe opposé, sans aucun message.
- `orientation` (la matrice 3×3 de la boîte). Ignorée : la boîte est supposée
  alignée sur les axes LPS. Dans le fichier de test elle vaut
  `diag(-1,-1,1)`, une rotation de 180° autour de z — sans effet sur une boîte
  centrée. Une ROI réellement tournée serait silencieusement traitée comme sa
  boîte englobante axis-aligned. C'est précisément la raison d'être de la case
  « tilted images » (§5).
- Ni segmentation ni bounding box calculée : la boîte vient **uniquement** de ce
  json. Il n'y a aucun code qui dérive une ROI d'un labelmap.

Côté volumes, `Search` accepte `.nii.gz`, `.nii`, `.nrrd.gz`, `.nrrd`,
`.gipl.gz`, `.gipl` ([AutoCrop3D_CLI.py:48](AutoCrop3D/Crop_Volumes_CLI/AutoCrop3D_CLI.py#L48)),
par un `glob.iglob(**, recursive=True)` suivi d'un `endswith`.

## 4. Comment la boîte est appliquée — extraction d'indices, pas de resampling

C'est le point à retenir : **aucune interpolation**. Le passage physique → indice
puis le découpage ([AutoCrop3D_CLI.py:77](AutoCrop3D/Crop_Volumes_CLI/AutoCrop3D_CLI.py#L77)) :

```python
Lower = np.array(img.TransformPhysicalPointToContinuousIndex(Lower)).astype(int)
Upper = np.array(img.TransformPhysicalPointToContinuousIndex(Upper)).astype(int)
for i in range(3):
    if Lower[i] > Upper[i]:
        Lower[i], Upper[i] = Upper[i], Lower[i]
Lower = [max(0, l) for l in Lower]
Upper = [min(img_size[i], u) for i, u in enumerate(Upper)]
img_roi = img[Lower[0]:Upper[0], Lower[1]:Upper[1], Lower[2]:Upper[2]]
```

**Le `swap` n'est pas cosmétique.** `TransformPhysicalPointToContinuousIndex`
applique l'inverse de la matrice de direction. Sur un volume dont les cosinus
directeurs sont négatifs sur un axe (fréquent en CBCT), le coin « bas » en
physique devient l'indice le plus grand : sans échange, la tranche serait vide.
C'est la gestion correcte de `direction`.

**Ce que l'indexation SimpleITK préserve.** Vérifié : le slicing d'une `sitk.Image`
conserve `spacing` et `direction` à l'identique et **recalcule l'origine** du
coin extrait. Sur un volume 50×60×70, spacing 0.3, origine (10,20,30),
direction `diag(-1,-1,1)`, `img[5:20,5:20,5:20]` donne origine
`(8.5, 18.5, 31.5)` — décalage de `-5·0.3` sur x et y (direction négative),
`+5·0.3` sur z. Les valeurs de voxel sont bit-à-bit identiques à l'entrée.

**Mode « Keep the same size as input »** (`box_Size == 'True'`,
[AutoCrop3D_CLI.py:107](AutoCrop3D/Crop_Volumes_CLI/AutoCrop3D_CLI.py#L107)) : on
crée une image vide de la géométrie d'origine (`sitk.Image(...)` +
`CopyInformation`), on y recolle le bloc extrait au même emplacement d'indices,
on réapplique `CopyInformation`. Géométrie strictement identique à l'entrée,
tout ce qui est hors ROI mis à 0. Noter l'inversion d'axes de
`GetArrayFromImage` (`z,y,x`), correctement gérée par le code.

**Ce qui arrive aux transformations associées : rien.** Aucun
`vtkMRMLTransformNode`, aucun `.tfm` lu ou écrit, aucun `HardenTransform`. La
géométrie est portée intégralement par le header (origine/spacing/direction) et
le décalage de crop est absorbé par l'origine. Conséquence pratique : une
matrice de recalage calculée sur le volume entier reste **valide telle quelle**
sur le volume découpé, puisque les coordonnées physiques n'ont pas bougé.

## 5. La voie alternative — le module Crop Volume de Slicer

`processCropVolume()` ([AutoCrop3D.py:915](AutoCrop3D/Crop_Volumes_UI/AutoCrop3D.py#L915)),
activée par la case « Use module "Crop Volume" for tilted images » (commit
`9d2bbe8`). Elle tourne **dans le widget**, pas dans le CLI :

```python
cropVolumeLogic = slicer.modules.cropvolume.logic()
parameters = slicer.vtkMRMLCropVolumeParametersNode()
parameters.SetInputVolumeNodeID(inputVolume.GetID())
parameters.SetROINodeID(roiNode.GetID())
parameters.SetOutputVolumeNodeID(outputVolume.GetID())
cropVolumeLogic.Apply(parameters)
```

Seuls les trois IDs sont fixés : interpolation, isotropie, échelle de spacing
restent aux valeurs par défaut du `vtkMRMLCropVolumeParametersNode`. Avec
l'interpolation active, Crop Volume **rééchantillonne** dans le repère propre de
la ROI, ce qui est justement ce qui permet de gérer une ROI tournée — au prix
d'une modification des valeurs de voxel, contrairement à la voie CLI. Les deux
voies ne produisent donc pas le même fichier, et c'est voulu.

`optionCheckBox()` masque « Keep the same size » dans ce mode, Crop Volume n'ayant
pas d'équivalent.

Cette voie charge la ROI et le volume comme nœuds MRML (`loadMarkups`,
`loadVolume`), donc **c'est elle, et elle seule, qui lit `coordinateSystem` et
`orientation`** — Slicer s'en charge à la lecture du json.

## 6. Mode batch et appariement patient ↔ ROI

Deux régimes, discriminés par `len(ROIList['.mrk.json']) > 1`
([AutoCrop3D_CLI.py:53](AutoCrop3D/Crop_Volumes_CLI/AutoCrop3D_CLI.py#L53)) :

- **une seule ROI** → appliquée à tous les volumes trouvés ;
- **plusieurs ROI** → `ChangeKeyDict` construit `{basename.split('_')[0]: chemin}`
  et chaque volume cherche sa clé ; échec → `logger.warning('No ROI for patient:')`
  et `continue`.

Les deux côtés ne calculent **pas** la clé de la même façon :

| Côté | Règle | Exemple `MA_0001_T1_Scan.nii.gz` / `MA_0001_ROI.mrk.json` |
|---|---|---|
| volume | chaîne de `.split()` sur `_Scan _scan _Seg _seg _Or _OR _MAND _MD _MAX _MX _CB _lm _T2 _T1 _Cl` puis `.split('.')[0]` | `MA_0001` |
| ROI | `basename.split('_')[0]` | `MA` |

Un nom de patient contenant un underscore casse donc l'appariement. Avec des noms
sans underscore (`MA0001_…`) tout va bien.

La progression est un simple `open(logPath,'r+').write(str(index))` à chaque
fichier ; le widget ne lit pas le contenu, seulement le `st_mtime`
([AutoCrop3D.py:574](AutoCrop3D/Crop_Volumes_UI/AutoCrop3D.py#L574)).

## 7. Génération du VTK depuis une segmentation

Déclenchée par `if "seg" in ScanOutPath.lower()`
([AutoCrop3D_CLI.py:151](AutoCrop3D/Crop_Volumes_CLI/AutoCrop3D_CLI.py#L151)) — le
test porte sur le **chemin complet de sortie**, donc un dossier parent nommé
`Segmentations/` suffit à le déclencher sur tous les fichiers. L'échec est avalé
par un `except: pass` nu.

[convertNiftiToVTK](AutoCrop3D/Crop_Volumes_CLI/Crop_Volumes_utils/GenerateVTKfromSeg.py#L16) :

1. `padding()` : `sitk.ConstantPad(img, [50,50,10], [0,0,0])`. Signature réelle
   vérifiée : `ConstantPad(image, padLowerBound, padUpperBound, constant)` — le
   troisième argument à zéro veut dire que **seule la borne inférieure est
   rembourrée**. Le commentaire « add 50 pixels around each dimension » est faux :
   une structure qui touche la face supérieure du crop restera ouverte.
   Le fichier temporaire s'appelle `image_padded.nii.gz` et est écrit **dans le
   répertoire courant du processus**, pas dans un tempdir.
2. `vtkNIFTIImageReader` → `vtkDiscreteMarchingCubes(GenerateValues(100, 1, 100))`
   → `vtkSmoothPolyDataFilter` (5 itérations, feature angle 120°, relaxation 0.6).
3. Coloration : `color_tup = LABEL_COLORS[label]` avec `label = np.max(img_arr)`,
   **la même couleur pour toutes les cellules**. Le commentaire « coloring
   according to labels » ne décrit pas le code. Et `LABEL_COLORS` ne contient que
   les clés 1–6 : un labelmap à plus de 6 classes lève un `KeyError` avalé par le
   `except: pass` de l'appelant, donc pas de VTK et pas de message.
4. `present_labels` est calculé puis jamais utilisé — code mort.

Le lecteur NIfTI de VTK n'applique ni qform ni sform (le code ne les récupère
même pas), et le padding de 50/50/10 voxels n'est jamais compensé. **Déduction**,
non testée ici : le maillage produit ne se superpose pas au volume découpé dans
Slicer.

## 8. Sorties

| Voie | Nom produit | Construction |
|---|---|---|
| CLI | `<stem>_<suffix><ext>` | `basename.split('.')[0] + "_" + suffix + key`, `key` étant l'extension de recherche (`.nii.gz`, …) |
| CLI, segmentation | `<stem>_<suffix>_vtk.vtk` | idem |
| Crop Volume | `<basename avec .nii.gz → _<suffix>.nii.gz>` | `basename.replace('.nii.gz', f'_{suffix}.nii.gz')` — **en dur sur `.nii.gz`** |

Suffixe par défaut : `cropped` ([AutoCrop3D.ui:308](AutoCrop3D/Crop_Volumes_UI/Resources/UI/AutoCrop3D.ui#L308)).
L'arborescence d'entrée est reproduite dans le dossier de sortie via
`os.path.relpath`.

Aucun fichier de transformation n'est produit.

## 9. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Lecture de la ROI | json, aucun calcul | CLI |
| Physique → indice | `TransformPhysicalPointToContinuousIndex` (ITK) | CLI |
| Découpe | slicing SimpleITK, sans interpolation | CLI |
| Découpe « tilted » | rééchantillonnage par `cropVolumeLogic.Apply` | widget |
| Surface VTK | marching cubes + laplacien | CLI |

Aucun réseau. Aucune partie de ce module n'apprend ni ne prédit quoi que ce soit.

## 10. Environnement

Rien à installer. Le module n'utilise que ce que Slicer embarque déjà :
`SimpleITK`, `numpy`, `vtk`, `qt`. `pip_install` est importé dans
[AutoCrop3D.py:11](AutoCrop3D/Crop_Volumes_UI/AutoCrop3D.py#L11) mais jamais
appelé. Pas de CUDA, pas de WSL, pas de conda.

## 11. Pièges et points fragiles

- **Dossier de ROI contenant exactement un fichier → plantage.** `ROI_dict` n'est
  construit que si `len(ROIList) > 1` ; sinon `ROI_Path` reste le **dossier** et
  `json.load(open(ROI_Path))` lève `IsADirectoryError`. La voie Crop Volume, elle,
  teste `os.path.isdir` et s'en sort.
- **Le widget et le CLI ne cherchent pas les mêmes extensions.** `CheckInput`
  ([AutoCrop3D.py:808](AutoCrop3D/Crop_Volumes_UI/AutoCrop3D.py#L808)) ne cherche
  que `.nii.gz`, `.nrrd.gz`, `.gipl.gz`. Un dossier de `.nii` ou de `.nrrd` non
  compressés est refusé par l'UI (« Wrong type of patient file detected ») alors
  que le CLI les traite parfaitement. Et comme `nbFiles` vient de cette même
  liste, le dénominateur de la barre de progression est faux dès qu'un mélange
  d'extensions est présent.
- **`coordinateSystem` et `orientation` de la ROI sont ignorés** par la voie CLI
  (§3). Boîte tournée ou ROI sauvée en RAS : résultat faux, silencieusement.
- **`.astype(int)` tronque vers zéro**, donc `Upper` perd jusqu'à un voxel par
  axe. Sans conséquence clinique, mais le crop n'est pas symétrique autour du
  centre demandé.
- **Pas de vérification que la ROI intersecte le volume.** Le bornage clampe
  `Lower ≥ 0` et `Upper ≤ size` mais rien n'interdit `Lower > Upper` après
  clamp : on obtient une image de taille nulle et l'écriture échoue dans le
  `try/except` qui journalise `Lower`/`Upper`.
- **`.replace(basename, filename)` remplace toutes les occurrences** dans le
  chemin joint ([AutoCrop3D_CLI.py:129](AutoCrop3D/Crop_Volumes_CLI/AutoCrop3D_CLI.py#L129)) :
  un dossier portant le même nom que le fichier serait renommé lui aussi.
- **Voie Crop Volume : `slicer.mrmlScene.Clear(0)` à chaque patient**
  ([AutoCrop3D.py:998](AutoCrop3D/Crop_Volumes_UI/AutoCrop3D.py#L998)) — vide
  la scène entière, y compris les données que l'utilisateur y avait chargées.
- **Voie Crop Volume : `slicer.util.saveNode` appelé depuis un `threading.Thread`**
  ([AutoCrop3D.py:979](AutoCrop3D/Crop_Volumes_UI/AutoCrop3D.py#L979)), donc accès
  MRML hors thread principal. Le `while thread.is_alive(): processEvents()` qui
  suit sérialise de fait l'exécution, ce qui masque le problème sans le corriger.
- **Voie Crop Volume : le suffixe n'est appliqué qu'aux `.nii.gz`.** Un `.nrrd`
  ressort sans suffixe, au même nom relatif.
- **Le test unitaire ne teste rien.** `test_AutoCrop3D1` est défini deux fois :
  une méthode de classe qui ne contient qu'une docstring (appelée par `runTest`),
  puis une fonction **au niveau module** ([AutoCrop3D.py:1097](AutoCrop3D/Crop_Volumes_UI/AutoCrop3D.py#L1097))
  qui contient le vrai test et n'est jamais exécutée.
- **Code mort** : [CropCBCT.py](AutoCrop3D/Crop_Volumes_CLI/Crop_Volumes_utils/CropCBCT.py)
  (signalé dans sa propre docstring), `Autofill()` qui contient encore des chemins
  absolus d'un poste de développement, `registerSampleData()` qui référence
  `AutoCrop3D2.png` — fichier absent du dépôt.

## 12. Littérature

Aucun papier ne porte sur AutoCrop3D. C'est un utilitaire de traitement par lot
écrit pour le laboratoire (Jeanne Claret, UoM/DCBIA), documenté uniquement par la
section [README.md:336](README.md#L336) et par l'aide du module
Crop Volume de Slicer, dont il reprend la sémantique :

- [Crop Volume — documentation Slicer](https://slicer.readthedocs.io/en/latest/user_guide/modules/cropvolume.html)
- [Crop Volume Sequence — documentation Slicer](https://slicer.readthedocs.io/en/latest/user_guide/modules/cropvolumesequence.html)
  (le README le cite comme la limitation qu'AutoCrop3D contourne : fichiers trop
  lourds pour être chargés en séquence)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)

Le `documentation-url` du CLI pointe vers
`https://github.com/Jeanneclre/DCBIA-code`, dépôt personnel qui n'est pas celui
du projet.

**Bibliographie complète : [SOURCES.md](SOURCES.md)** — recherche faite, résultat
négatif : aucun travail ne décrit AutoCrop3D. Deux articles récupérés dans ce
dossier le citent en une phrase comme outil utilisé.
