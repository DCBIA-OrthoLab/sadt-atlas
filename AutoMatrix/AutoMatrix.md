# AutoMatrix — pipeline complet

Application en lot d'une ou plusieurs transformations ITK à un dossier de
volumes et de fichiers de landmarks. Aucun réseau, aucun conda, aucun GPU :
`sitk.ReadTransform` + `sitk.ResampleImageFilter`, et un appariement
fichier ↔ matrice par découpage de noms. Tout l'intérêt de la fiche est dans les
conventions de transformation et dans l'écart entre ce que l'UI promet et ce que
le CLI fait réellement.

## 1. Situation dans la chaîne

AutoMatrix n'est appelé par aucun autre module du dépôt. Il est en revanche
**consommateur** des `.tfm` produits par les modules de recalage :

| Producteur | Fichier produit | Type de transformation |
|---|---|---|
| [AREG_CBCT.py:157](AREG_CBCT/AREG_CBCT.py#L157) | `<out>/<Région>/<patient>_OutReg/<patient>_<CB\|MAND\|MAX><add_name>_matrix.tfm` | affine / rigide |
| [SEMI_ASO_CBCT.py:176](ASO_CBCT/SEMI_ASO_CBCT/SEMI_ASO_CBCT.py#L176) | `<patient>_<add_name>_transform.tfm` | **`sitk.CompositeTransform`** ([utils.py:802](ASO_CBCT/ASO_CBCT_utils/utils.py#L802)) |
| [AREG_MRI.py:227](MRI2CBCT_CLI/MRI2CBCT_CLI_utils/AREG_MRI.py#L227) | `<mri>_reg_transform.tfm` | composite |
| [Review.py:499](AREG/AREG_Method/Review.py#L499) et [VFACE.py:2168](VFACE/VFACE.py#L2168) | recalage + nudge manuel | `CompositeTransform([areg, nudge.GetInverse()])` |
| [FlexReg_CLI.py:186](FlexReg_CLI/FlexReg_CLI.py#L186) | `<T2><suffix>.tfm` | affine, déjà conjuguée RAS→LPS et inversée |

La case « From AReg » de l'UI code en dur la convention de nommage d'AREG_CBCT
(§6), y compris la valeur **par défaut** d'un champ texte d'un autre module.

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [AutoMatrix.py](AutoMatrix/AutoMatrix.py) | widget : sélecteurs, validation, mirror, barre de progression | Python de Slicer |
| [applyMatrix.py](AutoMatrix/AutoMatrix_Method/applyMatrix.py) | `Automatrix_Method` : construit le dict de paramètres du CLI | idem |
| [General_tools.py](AutoMatrix/AutoMatrix_Method/General_tools.py) | `search` et `GetPatients` — **copie** de celles du CLI, utilisée seulement pour compter | idem |
| [Automatrix_CLI.py](Automatrix_CLI/Automatrix_CLI.py) | tout le travail réel, 341 lignes | Python de Slicer, `SlicerMacroBuildScriptedCLI` |

`AutoMatrixLogic.process()` ([AutoMatrix.py:1094](AutoMatrix/AutoMatrix.py#L1094))
est un `pass` : la logique est entièrement dans `Automatrix_Method`. Pas de
conda, pas de CUDA — vérifié par grep, aucune occurrence de `torch`, `conda` ou
`.pth` dans AutoMatrix/ et Automatrix_CLI/.

## 3. Formats de transformation lus — et ceux qui ne le sont pas

L'UI ([AutoMatrix.py:1012](AutoMatrix/AutoMatrix.py#L1012)) et le README
annoncent `.npy`, `.h5`, `.tfm`, `.mat`, `.txt`. `GetPatients` les collecte tous.
Puis le CLI fait, sans distinction
([Automatrix_CLI.py:285](Automatrix_CLI/Automatrix_CLI.py#L285)) :

```python
try:
    tfm = sitk.ReadTransform(matrix)
except Exception as e:
    logger.error(f"ERROR reading transform {matrix}: {e}")
    continue
```

`sitk.ReadTransform` ne connaît que les *TransformIO* d'ITK. Testé avec le
SimpleITK 2.5.5 de Slicer 5.12 :

| Extension | Résultat réel |
|---|---|
| `.tfm`, `.txt` | OK **si et seulement si** c'est un *Insight Transform File V1.0*. Un fichier texte contenant une matrice 4×4 brute est rejeté : `ITK ERROR: Tags must be delimited` |
| `.h5`, `.hdf5` | OK (HDF5TransformIO) |
| `.mat` | OK (MatlabTransformIO) |
| `.npy` | **KO** : `Could not create Transform IO object for reading file` |

Le support `.npy` est donc **cassé** : chaque `.npy` produit une ligne d'erreur
et est sauté. C'est une régression introduite par le passage au CLI (commit
`7bc362b`) : la version widget lisait `np.load(matrix)` et construisait un
`vtkMRMLTransformNode` (branche `extension_mat == ".npy"`, visible avec
`git show 7bc362b^:AutoMatrix/AutoMatrix.py`).
Même chose pour « matrices texte » : ce n'est pas un format de matrice, c'est le
format texte d'ITK.

Une lecture réussie donne un `sitk.Transform` dont le type concret est conservé —
`isinstance(tfm, sitk.CompositeTransform)` fonctionne, vérifié.

## 4. La convention de transformation — le point qui casse tout

### 4.1 Sens de la transformation

ITK est **fixed → moving** : un `sitk.Transform` passé à un resampler mappe le
point physique de **sortie** vers le point physique d'**entrée** où aller
échantillonner. Le contenu visible bouge donc selon `T⁻¹`.

Le code exploite cela des deux côtés, et c'est cohérent :

- **Volumes** ([Automatrix_CLI.py:209](Automatrix_CLI/Automatrix_CLI.py#L209)) :
  `resampler.SetTransform(transform)` — la transformation est passée telle
  quelle, le contenu se déplace de `T⁻¹`.
- **Landmarks** ([Automatrix_CLI.py:176](Automatrix_CLI/Automatrix_CLI.py#L176)) :
  ```python
  tfm_inverted = transform.GetInverse()
  point['position'] = list(tfm_inverted.TransformPoint(point['position']))
  ```
  On applique explicitement `T⁻¹` au point, donc il se déplace comme le contenu
  du volume.

**Conséquence à retenir** : une même `.tfm` appliquée au scan et à ses landmarks
les déplace du même mouvement. C'est la propriété qui rend le module utilisable,
et c'est aussi le seul endroit où une inversion apparaît dans le code.

`GetInverse()` peut lever `RuntimeError` (transformation non inversible :
déplacement dense, B-spline). Le cas est attrapé et le fichier de landmarks est
simplement sauté avec un warning — le volume correspondant, lui, aura été
transformé. Les deux sorties peuvent donc se désynchroniser silencieusement.

### 4.2 RAS / LPS : où se fait le flip — nulle part

**Il n'y a aucun flip dans AutoMatrix.** C'est correct, et voici pourquoi :

- Les `.tfm` ITK sont en **LPS** par construction.
- `sitk.ReadImage` / `WriteImage` travaillent en **LPS**. Les deux côtés
  concordent, rien à faire pour les volumes.
- Les `.mrk.json` du dépôt sont écrits en **LPS** en dur, partout :
  [ALI_CBCT/io.py:36](ALI_CBCT/ALI_CBCT_utils/io.py#L36),
  [ASO_CBCT/utils.py:278](ASO_CBCT/ASO_CBCT_utils/utils.py#L278),
  [AREG_CBCT/utils.py:373](AREG_CBCT/AREG_CBCT_utils/utils.py#L373),
  [ALI_IOS/io.py:85](ALI_IOS/ALI_IOS_utils/io.py#L85),
  [mgl_patch.py:193](FlexReg/FlexReg_utils/mgl_patch.py#L193),
  [VFACE](VFACE/VFACE_utils/functionaq3dc.py#L1733). C'est aussi le défaut de
  Slicer à l'écriture. Donc `point['position']` est déjà en LPS et l'appliquer
  directement à une transformation ITK est juste.

Le fragile est que **le champ `coordinateSystem` n'est jamais lu**. FlexReg le
fait ([FlexReg.py:2434](FlexReg/FlexReg.py#L2434)) ; AutoMatrix non. Un json
déclarant `"coordinateSystem": "RAS"` — ce qu'écrivent des annotations plus
anciennes ou d'autres outils — sera transformé avec x et y de signe opposé, sans
message. Le fichier de sortie conservera d'ailleurs son `coordinateSystem: RAS`
d'origine, puisque le json est relu et réécrit tel quel.

Pour mémoire, les modules qui *produisent* les matrices font le flip chez eux :
[FlexReg_CLI.py:186](FlexReg_CLI/FlexReg_CLI.py#L186) calcule
`flip @ M @ flip` avec `flip = np.diag([-1,-1,1,1])` puis inverse, avant
d'écrire le `.tfm`. AutoMatrix consomme le résultat de ce travail et n'a donc
rien à refaire.

### 4.3 Composition

**Il n'y en a pas.** Quand un patient a plusieurs matrices, la boucle
([Automatrix_CLI.py:283](Automatrix_CLI/Automatrix_CLI.py#L283)) applique chacune
**au fichier d'entrée original**, indépendamment, et produit une sortie par
matrice. Il n'y a aucun enchaînement.

La seule composition qui existe est celle qu'ITK a déjà faite : un `.tfm`
contenant plusieurs transformations est relu comme un `sitk.CompositeTransform`
et appliqué comme un tout.

### 4.4 Harden

Aucun. Il n'y a plus de `vtkMRMLTransformNode` dans le pipeline. La version
pré-CLI en créait un et faisait `model.SetAndObserveTransformNodeID(...)` puis
`model.HardenTransform()` avant `slicer.util.exportNode(..., world=True)`. Tout
ce bloc a disparu. La méthode `saveOutput` du widget
([AutoMatrix.py:861](AutoMatrix/AutoMatrix.py#L861)) qui appelait `exportNode`
est toujours là mais n'est plus appelée : **code mort**.

## 5. Types de données traités

`GetPatients` collecte `.vtk .vtp .stl .off .obj .nii .nii.gz .nrrd .mrk.json`
([Automatrix_CLI.py:72](Automatrix_CLI/Automatrix_CLI.py#L72)). Le CLI ne
distingue ensuite que deux cas :

```python
is_landmark = scan.endswith(".mrk.json")
...
image = sitk.ReadImage(scan)     # tout le reste
```

**Les maillages ne sont plus traités.** Testé : `sitk.ReadImage` sur un
`vtkPolyData` écrit en `.vtk` échoue avec
`sitk::ERROR: Unable to determine ImageIO reader`. Idem pour `.stl`, `.obj`,
`.off`, `.vtp`. L'exception est attrapée
([Automatrix_CLI.py:310](Automatrix_CLI/Automatrix_CLI.py#L310)), journalisée en
`ERROR processing ...`, et le fichier est sauté. Pourtant l'UI les propose
encore, `CheckGoodEntre` les valide, le compteur de progression les compte, et le
[README.md:422](README.md#L422) annonce toujours le support IOS.

C'est la seconde régression du passage au CLI : la version widget chargeait les
maillages avec `slicer.util.loadModel` et faisait un vrai `HardenTransform`.
Un `.vtk` *structured points* (image, pas surface) passerait, lui, via VTKImageIO.

| Type | Lu par | Transformé par | Écrit par |
|---|---|---|---|
| `.nii`, `.nii.gz`, `.nrrd` | `sitk.ReadImage` | `ResampleImageFilter` | `sitk.WriteImage` |
| `.mrk.json` | `json.load`, `markups[0]['controlPoints']` | `T⁻¹.TransformPoint` point par point | `json.dump(indent=2)` |
| `.vtk .vtp .stl .off .obj` | — | — | — (échec silencieux) |

Pour les landmarks, seul `markups[0]` est traité et seuls les points dont
`positionStatus == 'defined'` sont bougés ; les autres sont laissés en place,
donc dans l'ancien repère.

## 6. Rééchantillonnage et image de référence

```python
resampler.SetInterpolator(sitk.sitkNearestNeighbor if is_seg else sitk.sitkLinear)
resampler.SetDefaultPixelValue(0)
resampler.SetReferenceImage(reference)
```

L'interpolateur vient de la case « Check this box if using segmentations »
(`is_seg`). Voisin le plus proche pour une labelmap, linéaire sinon — correct, et
c'est l'utilisateur qui doit le déclarer, rien n'est détecté automatiquement.

La grille de sortie est choisie ainsi
([Automatrix_CLI.py:191](Automatrix_CLI/Automatrix_CLI.py#L191) et
[:301](Automatrix_CLI/Automatrix_CLI.py#L301)), par priorité décroissante :

1. **Transformation composite** → la référence est devinée à partir du chemin de
   la **matrice** : `matrix.replace("_transform.tfm", ".nii.gz")`, repli en
   `.nii`. Ce n'est pas un bug : ASO_CBCT écrit `<patient>_<add>_transform.tfm`
   et `<patient>_<add>.nii.gz` **dans le même dossier**, donc le scan orienté
   voisin de la matrice est exactement la bonne grille. Si le fichier est absent,
   warning et repli sur l'image d'entrée.
2. **Nom de matrice contenant `mirror`** (insensible à la casse) → la référence
   est forcée à l'image d'entrée, le fichier de référence de l'UI est ignoré.
   Dispatch sur le nom de fichier.
3. **Fichier de référence fourni** (`reference_file != "None"`, valeur par défaut
   du champ, [AutoMatrix.ui:255](AutoMatrix/Resources/UI/AutoMatrix.ui#L255)) →
   sa géométrie est imposée à toutes les sorties.
4. Sinon l'image d'entrée elle-même : **taille, spacing, origine et direction
   inchangés**. Une transformation qui sort le contenu du champ de vue le fait
   disparaître, rempli par `DefaultPixelValue = 0`.

La branche `reference is None` de `ResampleImage`
([Automatrix_CLI.py:215](Automatrix_CLI/Automatrix_CLI.py#L215)) est
**inatteignable** — l'appelant passe toujours une référence. Elle est en plus
fausse : elle fait `new_origin = transform.TransformPoint(image.GetOrigin())`
alors que la convention du resampler demanderait `T⁻¹`.

## 7. Le mode Mirror

`Mirror()` ([AutoMatrix.py:304](AutoMatrix/AutoMatrix.py#L304)) télécharge
`Mirror.zip` depuis une release GitHub personnelle
(`GaelleLeroux/DCBIA_Apply_matrix`), la dézippe dans
`<Documents>/SlicerDownloads/Mirror_matrix/` et remplit le champ matrice avec
`Mirror/Matrix_mirror.tfm`. Contenu réel du fichier :

```
#Insight Transform File V1.0
Transform: AffineTransform_double_3_3
Parameters: -1 0 0 0 1 0 0 0 1 0 0 0
FixedParameters: 0 0 0
```

Soit `diag(-1, 1, 1)` en LPS, centre à l'origine : une **réflexion par rapport au
plan x_LPS = 0**. Comme x_LPS pointe vers la gauche du patient, c'est bien
l'échange gauche/droite — mais par rapport au plan sagittal **de l'origine du
repère monde**, pas par rapport au plan sagittal du patient. Un patient non
centré ressort translaté en plus d'être miroité, ce qu'un recalage ultérieur doit
rattraper.

Le déterminant vaut −1. Pour un volume, `ResampleImageFilter` s'en accommode sans
problème. Pour un maillage, cela inverserait l'orientation des faces et les
normales — question sans objet ici puisque les maillages ne sont plus traités.

Le mode force `ComboBoxMatrix` en « File », le suffixe à `_mir`, et décoche
`checkBoxMatrixName`.

## 8. Appariement fichier ↔ matrice

`GetPatients` ([Automatrix_CLI.py:60](Automatrix_CLI/Automatrix_CLI.py#L60))
construit `{clé_patient: {'scan': [...], 'matrix': [...]}}`. La clé est obtenue
par une chaîne de `.split()` qui **n'est pas la même des deux côtés** :

| | Jetons retirés (dans l'ordre) |
|---|---|
| scan | `_Seg _seg _Scan _scan _Or _OR _MAND _MD _MAX _MX _CB _lm _T2 _T1 _Cl _MR`, puis `.split('.')[0]`, puis `_T0`…`_T49` |
| matrice | `_SegOr _Left _left _Right _right _Or _OR _MAND _MD _MAX _MX _CB _lm _T2 _T1 _Cl _MA _Mir _mir _Mirror _mirror _MR`, puis `.split('.')[0]`, puis `_T0`…`_T49` |

Les listes divergent : la matrice retire `_MA`, `_Left`/`_Right`, les variantes
de `_Mir` et `_SegOr` ; le scan retire `_Seg`, `_Scan`, `_lm`. D'où l'exigence du
README : le nom du patient d'abord, un underscore, puis le reste. L'exemple
`patient1_T1_MA.nii.gz` ↔ `patient1_left_MA.tfm` marche parce que `_T1` tronque
côté scan et `_left` côté matrice. En revanche `patient1_MA.nii.gz` sans
horodatage donne la clé `patient1_MA` côté scan et `patient1` côté matrice :
**aucune matrice ne sera appariée**, sans message.

Quand le chemin matrice est un **fichier** et non un dossier, il est attaché à
tous les patients ([Automatrix_CLI.py:167](Automatrix_CLI/Automatrix_CLI.py#L167)).

**Code dupliqué et déjà divergent.** `GetPatients` existe en deux exemplaires
identiques à un jeton près : la version CLI retire `_SegOr` en tête de chaîne,
[General_tools.py:249](AutoMatrix/AutoMatrix_Method/General_tools.py#L249) non.
Or c'est la copie `General_tools` qui alimente `NbScan`, donc le dénominateur de
la barre de progression peut différer du nombre réellement traité.

### La voie « From AReg »

`suffix_map` ([Automatrix_CLI.py:227](Automatrix_CLI/Automatrix_CLI.py#L227))
court-circuite tout l'appariement pour les fichiers de landmarks :

```python
suffix_map = {
    "_CB": ("Cranial Base", "CBReg_matrix.tfm"),
    "_L":  ("Maxilla",      "MAXReg_matrix.tfm"),
    "_U":  ("Mandible",     "MANDReg_matrix.tfm"),
}
matrix_path = os.path.join(args.matrix_lineEdit, subdir,
                           f"{patient_id}_OutReg", f"{patient_id}_{matrix_filename}")
```

Trois problèmes, tous vérifiables :

1. **`_L` et `_U` sont inversés** par rapport à la convention du reste du dépôt.
   [AREG_IOS/dataset.py:231](AREG_IOS/AREG_IOS_utils/dataset.py#L231) et
   [AREG/IOS.py:122](AREG/AREG_Method/IOS.py#L122) définissent
   `Lower = ["Lower", "_L", "L_", "Mandibule", "Md"]` et
   `Upper = ["Upper", "_U", "U_", "Maxilla", "Mx"]`. Ici `_L` pointe vers Maxilla
   et `_U` vers Mandible.
2. **`matrix_lineEdit` n'existe pas** dans l'`argparse` du CLI
   ([Automatrix_CLI.py:329](Automatrix_CLI/Automatrix_CLI.py#L329) : les
   arguments sont `input_patient, input_matrix, reference_file, suffix,
   matrix_name, fromAreg, output_folder, log_path, is_seg`). Cette branche lève
   donc `AttributeError` dès qu'elle est prise.
3. **Elle n'est jamais prise** : `CheckBoxSuffixBased` (libellé « From AReg ») est
   masqué au `setup` par `self.ui.CheckBoxSuffixBased.setVisible(False)`
   ([AutoMatrix.py:296](AutoMatrix/AutoMatrix.py#L296)), donc `fromAreg` vaut
   toujours `"False"`. Code mort — ce qui explique pourquoi 1 et 2 n'ont jamais
   été remarqués.

Le nom `MAXReg_matrix.tfm` correspond quand même à la réalité d'AREG_CBCT, qui
écrit `patient + "_" + reg_type + add_name + "_matrix.tfm"` avec `add_name`
valant `Reg` par défaut ([AREG.ui:571](AREG/Resources/UI/AREG.ui#L571)) :
la voie dépend donc de la valeur par défaut d'un champ texte éditable d'un autre
module.

## 9. Sorties

```python
matrix_suffix = f"_{Path(matrix).stem}" if args.matrix_name == "True" else ""
out_suffix    = f"{args.suffix}{matrix_suffix}"
out_file      = outpath.split(extension_scan)[0] + out_suffix + extension_scan
```

L'arborescence d'entrée est reproduite dans le dossier de sortie
(`scan.replace(input_patient, output_folder)`). Suffixe par défaut `_apply`,
`checkBoxMatrixName` **coché par défaut**
([AutoMatrix.ui:342](AutoMatrix/Resources/UI/AutoMatrix.ui#L342)).

Attention, le README est périmé sur ce point : il annonce
`patient1_T1_MA_apply_matrix1.nii.gz`. L'ancienne version extrayait la partie du
nom de matrice située après la clé patient (`basename.split(ext)[0].split(key)[1]`) ;
le CLI utilise `Path(matrix).stem` **entier**. La sortie réelle pour
`patient1_MAXReg_matrix.tfm` est donc
`patient1_T1_MA_apply_patient1_MAXReg_matrix.nii.gz`.

**Décocher « Add matrix name » avec plusieurs matrices par patient fait que les
sorties s'écrasent les unes les autres** : même nom de fichier pour chaque
matrice.

Aucun `.tfm` n'est produit : AutoMatrix consomme des transformations, il n'en
écrit pas.

## 10. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Lecture de transformation | ITK TransformIO | CLI |
| Appariement fichier ↔ matrice | découpage de chaînes | CLI (et une copie divergente dans le widget) |
| Volumes | `sitk.ResampleImageFilter`, linéaire ou plus proche voisin | CLI |
| Landmarks | `T⁻¹.TransformPoint` par point | CLI |
| Matrice miroir | `.tfm` fixe téléchargé, `diag(-1,1,1)` | release GitHub |

Aucun réseau de neurones nulle part.

## 11. Environnement

Rien à installer : `SimpleITK`, `numpy`, `vtk`, `qt` sont déjà dans Slicer. Pas
de conda, pas de CUDA. Le seul accès réseau est le téléchargement de la matrice
miroir, et uniquement si la case Mirror est cochée.

La barre de progression n'est pas alimentée par un fichier de log malgré le
paramètre `log_path` : `DisplayAutomatrix.isProgress`
([Progress.py:39](AutoMatrix/AutoMatrix_Method/Progress.py#L39)) teste le mtime
de `log_path`, mais **le CLI n'écrit jamais dans ce fichier**. L'avancement passe
en réalité par la séquence `<filter-progress>0 / 2 / 0</filter-progress>` émise
par le CLI après chaque scan ([Automatrix_CLI.py:314](Automatrix_CLI/Automatrix_CLI.py#L314))
et le `if kwds["progress"] == 200` de `isProgress` — un protocole indirect, fragile,
qui dépend d'un `time.sleep(0.2)` entre chaque impression.

## 12. Pièges et points fragiles

- **`.npy` ne fonctionne pas** (§3), bien qu'annoncé par l'UI et le README.
- **Les maillages ne fonctionnent plus** (§5), bien qu'annoncés par l'UI et le
  README. Régression du commit `7bc362b`.
- **`.txt` n'accepte pas une matrice 4×4 brute** (§3), seulement le format texte
  d'ITK.
- **`coordinateSystem` des landmarks n'est jamais lu** (§4.2).
- **Pas de composition** : N matrices pour un patient donnent N fichiers, pas un
  enchaînement (§4.3).
- **Sorties écrasées** si `checkBoxMatrixName` est décoché avec plusieurs
  matrices (§9).
- **`OnEndProcess` divise par `self.nb_scans`** ([AutoMatrix.py:953](AutoMatrix/AutoMatrix.py#L953))
  sans garde : un dossier d'entrée vide provoque `ZeroDivisionError` à la fin du
  traitement.
- **`CheckGoodEntre` est logiquement faux**
  ([AutoMatrix.py:1013](AutoMatrix/AutoMatrix.py#L1013)) : le test des extensions
  est `len(dico['.vtk'])==0 and len(dico['.vtp']) and len(dico['.stl']) and …`,
  où seul le premier terme est une comparaison. Les suivants sont des entiers
  évalués en booléen, donc l'avertissement « Folder empty or wrong type » ne
  s'affiche que dans une conjonction improbable. Un dossier réellement vide passe
  la validation.
- **`onPredictButton` n'arrête pas sur erreur** : `TestProcess` retourne un
  tuple `(ok, out)`, le `isinstance(error, str)` de
  [AutoMatrix.py:766](AutoMatrix/AutoMatrix.py#L766) est donc toujours faux et le
  traitement démarre même avec des champs vides.
- **`.split(extension_scan)[0]`** coupe à la **première** occurrence : un chemin
  dont un dossier contient la même sous-chaîne que l'extension serait tronqué.
- **Landmarks non `defined`** laissés dans l'ancien repère, mélangés aux points
  transformés dans le même fichier (§5).
- **Voie « From AReg » morte et cassée** (§8).
- **Code mort** : `saveOutput` / `UpdateProgressBar` / `UpdateTime` du widget,
  `AutoMatrixLogic.process`, la branche `reference is None` de `ResampleImage`,
  `registerSampleData` qui référence des `.png` absents.
- Les métadonnées de [Automatrix_CLI.xml](Automatrix_CLI/Automatrix_CLI.xml) sont
  restées celles du gabarit Slicer (`FirstName LastName (Institution)`,
  `NIH grant NXNNXXNNNNNN-NNXN`).

## 13. Littérature

Aucun papier ne porte sur AutoMatrix : c'est un utilitaire d'application en lot
écrit pour le laboratoire (Gaëlle Leroux, UoM/DCBIA). Le contenu scientifique est
entièrement dans les modules qui *produisent* les matrices — AREG, ASO, MRI2CBCT,
FlexReg — et se lit dans leurs fiches respectives.

Pour la convention de transformation, la référence à jour est la documentation
d'ITK / Slicer plutôt qu'un article :

- [Transforms — Slicer user guide](https://slicer.readthedocs.io/en/latest/user_guide/modules/transforms.html)
  (sens fixed→moving, RAS de Slicer vs LPS d'ITK)
- [Coordinate systems — Slicer developer guide](https://slicer.readthedocs.io/en/latest/user_guide/coordinate_systems.html)
- [SimpleITK — Transforms and Resampling](https://simpleitk.readthedocs.io/en/master/link_ImageRegistrationMethod1_docs.html)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)
- [DCBIA_Apply_matrix](https://github.com/GaelleLeroux/DCBIA_Apply_matrix) —
  dépôt d'origine, qui héberge encore la matrice miroir et les jeux de test cités
  par le README

**Bibliographie complète : [SOURCES.md](SOURCES.md)** — recherche faite, résultat
négatif : aucun travail ne décrit AutoMatrix, et aucun ne le cite. Rien n'a été
récupéré dans ce dossier, parce qu'il n'y a rien à récupérer.
