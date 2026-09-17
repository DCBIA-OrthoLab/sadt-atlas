# AREG_IOSCBCT — pipeline complet

Recalage **multimodal** : poser un Intra Oral Scan dans le repère d'un CBCT du
même patient. Rien à voir avec [AREG_IOS.md](../AREG_IOS/AREG_IOS.md), qui est longitudinal
(T1 → T2, même modalité) : ici les deux nuages viennent de capteurs différents,
et il n'existe pas de « patch stable » commun.

Deux mises en correspondance successives, **aucun réseau à l'intérieur du
CLI** :

1. **12 landmarks occlusaux** prédits des deux côtés par deux réseaux
   différents (ALI_CBCT sur le volume, ALI_IOS sur le maillage) → transformation
   rigide de Procrustes (`vtkLandmarkTransform`) qui sert de pré-alignement ;
2. **ICP** de la surface IOS sur une **isosurface du CBCT extraite par marching
   cubes au seuil 400**.

Le CLI lui-même est donc entièrement géométrique. L'intelligence est en amont,
dans les modules que l'orchestrateur empile devant lui.

## 1. Situation dans la chaîne

[AREG_IOSCBCT.py](AREG_IOSCBCT/AREG_IOSCBCT.py) est appelé uniquement par
[AREG/AREG_Method/IOSCBCT.py](AREG/AREG_Method/IOSCBCT.py), qui définit trois
modes. Il n'appelle rien.

| Mode | Classe | Étapes empilées avant AREG_IOSCBCT |
|---|---|---|
| Registration | `Reg_IOSCBCT` ([IOSCBCT.py:392](AREG/AREG_Method/IOSCBCT.py#L392)) | **aucune** : l'utilisateur fournit IOS, CBCT et les deux dossiers de landmarks |
| Semi-Automated | `Semi_IOSCBCT` ([IOSCBCT.py:157](AREG/AREG_Method/IOSCBCT.py#L157)) | `CrownSegmentationcli` → `ALI_CBCT` → `ALI_IOS` |
| Fully-Automated | `Auto_IOSCBCT` ([IOSCBCT.py:469](AREG/AREG_Method/IOSCBCT.py#L469)) | 7 étapes, cf. §2 |

C'est donc bien **un orchestrateur avec un CLI terminal mince**. Le vrai
pipeline est la liste de processus construite par `Process()`.

### Séquence complète du mode Fully-Automated

[IOSCBCT.py:605](AREG/AREG_Method/IOSCBCT.py#L605). Les deux modalités sont
préparées séparément puis remises en contact au dernier moment.

| # | Module | Entrée | Sortie | Rôle |
|---|---|---|---|---|
| 1 | `MRI2CBCT_resample_cbct_mri` | CBCT bruts | `<out>/CBCT Resampled/CBCT` | rééchantillonnage isotrope `spacing=[0.3,0.3,0.3]`, `center=True` |
| 2 | `PRE_ASO_CBCT` | ↑ | `<out>/PRE ASO CBCT` | pré-orientation du CBCT (modèles `PreASO`) |
| 3 | `ALI_CBCT` | ↑ | idem | landmarks d'orientation (`N S Ba RPo…` ou `IF ANS PNS UR1O UR6O UL6O` selon la référence) |
| 4 | `SEMI_ASO_CBCT` | ↑ | `<out>/Oriented CBCT` | orientation finale sur fichier gold, suffixe `Or` |
| 5 | `CrownSegmentationcli` | IOS bruts | `<out>/Seg IOS` | `Universal_ID`, `model=latest`, `suffix=Seg` |
| 6 | `PRE_ASO_IOS` | ↑ | `<out>/PRE ASO IOS` | orientation de l'IOS sur le gold, dents `UR6,UR4,UL4,UL6`, suffixe `Or` |
| 7 | `ALI_CBCT` (2ᵉ passe) | `Oriented CBCT` | `<out>/CBCT Landmarks` | **les 12 landmarks de recalage** |
| 8 | `ALI_IOS` | `PRE ASO IOS` | `<out>/IOS Landmarks` | **les 12 mêmes landmarks, côté IOS** |
| 9 | `AREG_IOSCBCT` | tout ce qui précède | `<out>/Registered IOS` | landmark transform + ICP |

Le mode Semi saute 1–4 et 6 : il segmente l'IOS, puis lance directement les
deux ALI et le recalage. Son `IOS_folder` pointe sur
`<out>/Seg IOS/liste_csv_file_Seg`, le sous-dossier que `CrownSegmentationcli`
crée d'après le basename du csv qu'on lui a passé
([IOSCBCT.py:368](AREG/AREG_Method/IOSCBCT.py#L368)).

### Les 12 landmarks communs

Identiques des deux côtés, c'est le pivot de tout le recalage :

```
LL1O LL3O LL6O LR1O LR3O LR6O UL1O UL3O UL6O UR1O UR3O UR6O
```

Suffixe `O` = point **occlusal** de la dent. Côté CBCT ils sont passés à
`ALI_CBCT` en `lm_type`, côté IOS à `ALI_IOS` en `teeth` avec `lm_type='O'`,
`image_size=224`, `blur_radius=0`, `faces_per_pixel=1`
([IOSCBCT.py:335](AREG/AREG_Method/IOSCBCT.py#L335) et
[IOSCBCT.py:839](AREG/AREG_Method/IOSCBCT.py#L839)).

Les deux familles de réseaux sont donc :

| Réseau | Nature | Poids |
|---|---|---|
| DentalModelSeg | multi-vues sur maillage, embarqué dans le paquet pip `shapeaxi` | `latest`, hors dépôt |
| ALI_CBCT | agents de renforcement dans le volume, `spacing=[1,0.3]`, `speed_per_scale=[1,1]`, `agent_FOV=[64,64,64]`, `spawn_radius=10` | release `v0.1-v2.0_models` (Cranial_Base, Upper/Lower Teeth…) |
| ALI_IOS | multi-vues 224² par dent, pic de heatmap | [ALIDDM v1.0.3 Models.zip](https://github.com/baptistebaquero/ALIDDM/releases/download/v1.0.3/Models.zip) |

Le CLI AREG_IOSCBCT, lui, **ne charge aucun poids**.

## 2. Où ça tourne

| Élément | Valeur |
|---|---|
| Exécution | `slicer.cli.run(slicer.modules.areg_ioscbct, ...)` — **Python de Slicer**, pas conda |
| Exception | l'étape `CrownSegmentationcli` passe par `run_conda_tool("seg")` ([AREG.py:1611](AREG/AREG.py#L1611)) |
| Dépendances installées dans Slicer | `pyvista==0.47.3`, `scipy`, `numpy`, `SimpleITK` ([AREG.py:1458](AREG/AREG.py#L1458)) |
| GPU | **non requis** dans le CLI : aucun `torch` importé |
| Passage des paramètres | via [AREG_IOSCBCT.xml](AREG_IOSCBCT/AREG_IOSCBCT.xml), 5 positionnels, celui-ci **est à jour** |

```
IOS_folder  CBCT_folder  IOS_lm_folder  CBCT_lm_folder  output
```

C'est la différence structurelle avec AREG_IOS : AREG_IOS est un module conda
lancé à la main par `python -m`, AREG_IOSCBCT est un vrai CLI Slicer.

## 3. Appariement des fichiers

`getPatients()` ([AREG_IOSCBCT.py:339](AREG_IOSCBCT/AREG_IOSCBCT.py#L339))
balaie les quatre dossiers et construit une clé `<patient_id>_<timepoint>`.

| Extraction | Regex | Remarque |
|---|---|---|
| Timepoint | `[Tt]([0-2])` | **T0, T1, T2 uniquement**. Un `_T3` ne matche rien → patient ignoré silencieusement |
| Arcade | `(?:^\|_)(?:u\|upper)(?=_\|\.\|$)` et idem `l/lower` | la lettre doit être un token délimité. Un `u` isolé au milieu du nom ne compte plus — sinon `P001_T1_L_Surface.vtk` était lu « upper » et recalé contre les mauvais landmarks |
| Patient | `([A-Za-z]+)[_]?([0-9]+)[_]?[Tt][0-2]` | lettres + chiffres collés |
| Normalisation | underscores supprimés, zéros de tête retirés | `P_0001`, `P001`, `P00001` → `P1` |

Extensions attendues : **IOS `.vtk` seulement**, **CBCT `.nii.gz` seulement**,
landmarks `.json`.

Chaque patient doit fournir **sept** entrées : `ios_upper`, `ios_lower`, `cbct`,
`ios_lm_upper`, `ios_lm_lower`, `cbct_lm_upper`, `cbct_lm_lower`. Une clé
manquante lève un `KeyError` dans la boucle principale, attrapé par le
`try/except` par patient → le patient est simplement sauté avec un log d'erreur.

La même normalisation d'identifiant est réimplémentée côté widget dans
`Review._normalisedId()` ([Review.py:210](AREG/AREG_Method/Review.py#L210)),
précisément pour retrouver le CBCT d'origine en face d'un IOS recalé dont le nom
a été normalisé.

## 4. Mise en correspondance des deux modalités

Réponse courte aux trois hypothèses possibles : **landmarks communs pour le
pré-alignement, puis ICP sur une surface extraite du CBCT par seuillage**. Il
n'y a **pas** de segmentation des dents côté CBCT, et la segmentation côté IOS
ne sert qu'à permettre à ALI_IOS de viser ses caméras dent par dent.

### 4.1 La surface CBCT

`load_data()` ([AREG_IOSCBCT.py:315](AREG_IOSCBCT/AREG_IOSCBCT.py#L315)) :

```python
image = sitk.ReadImage(scan_path)
ijk_to_lps = np.eye(4)
ijk_to_lps[:3, :3] = direction @ np.diag(spacing)
ijk_to_lps[:3, 3]  = origin
vol = pv.wrap(sitk.GetArrayFromImage(image).transpose(2, 1, 0))
cbct_raw_mesh = vol.contour(isosurfaces=[400])
cbct_surface  = cbct_raw_mesh.transform(ijk_to_lps, inplace=False)
```

- `GetArrayFromImage` donne `(z,y,x)`, le `transpose(2,1,0)` remet en `(x,y,z)`
  pour que `pv.wrap` produise une `ImageData` d'espacement unité en indices ;
- `contour(isosurfaces=[400])` = **marching cubes à la valeur 400**. Unité
  implicite : HU si le CBCT est calibré. Ce seuil est **codé en dur** et capture
  l'os **et** l'émail, sans distinction ;
- la matrice `ijk_to_lps` reconstruite à la main ramène l'isosurface en
  coordonnées physiques **LPS**.

C'est cohérent avec le reste : `ALI_CBCT` et `ALI_IOS` écrivent tous deux
`"coordinateSystem": "LPS"` ([io.py:36](ALI_CBCT/ALI_CBCT_utils/io.py#L36),
[io.py:85](ALI_IOS/ALI_IOS_utils/io.py#L85)), et les `.vtk` sont en LPS. Aucun
flip n'est donc nécessaire, et aucun n'est fait.

### 4.2 Appariement des landmarks par label

`_pair_landmarks()` ([AREG_IOSCBCT.py:54](AREG_IOSCBCT/AREG_IOSCBCT.py#L54)) ne
garde que les labels **présents des deux côtés**, dans l'ordre des labels IOS,
et logue ceux qui manquent au CBCT.

C'est une correction importante : `vtkLandmarkTransform` exige autant de points
source que cible ; avec des listes de tailles différentes il écrit une erreur
sur stderr et **retourne l'identité**, donc le pré-alignement disparaissait sans
que rien ne le dise. Et apparier par position deux listes partielles alignait
des points qui n'ont rien à voir.

### 4.3 Le pré-alignement rigide

`align_by_landmarks()` ([AREG_IOSCBCT.py:108](AREG_IOSCBCT/AREG_IOSCBCT.py#L108)) :

```python
landmark_transform = vtk.vtkLandmarkTransform()
landmark_transform.SetSourceLandmarks(points_moving)   # IOS
landmark_transform.SetTargetLandmarks(points_fixed)    # CBCT
landmark_transform.SetModeToRigidBody()                # 6 ddl, pas d'échelle
```

Deux garde-fous, tous deux avec repli sur l'identité (`vtk.vtkMatrix4x4()`
neuve) et un warning explicite :

| Garde-fou | Constante | Justification du code |
|---|---|---|
| Nombre de paires | `MIN_LANDMARK_PAIRS = 3` | un point = translation pure, deux points laissent une rotation libre autour de l'axe |
| Résidu RMS | `MAX_LANDMARK_RESIDUAL_MM = 10.0`, surchargeable par la variable d'environnement `AREG_MAX_LANDMARK_RESIDUAL` | une transformation rigide conserve les distances : un gros résidu prouve que les deux jeux ne décrivent pas la même anatomie |

`_alignment_residual()` ([AREG_IOSCBCT.py:67](AREG_IOSCBCT/AREG_IOSCBCT.py#L67))
applique la matrice à chaque landmark mobile et calcule le RMS des écarts.

Retourne le maillage transformé, la matrice, et **les landmarks IOS transformés**
— ces derniers sont ce qui finira dans le json de sortie.

### 4.4 L'ICP

`run_icp_point_to_plane()`
([AREG_IOSCBCT.py:163](AREG_IOSCBCT/AREG_IOSCBCT.py#L163)), appelé avec
`max_dist=1.0` (la valeur par défaut `1.5` n'est jamais utilisée).

| Paramètre | Valeur | Effet |
|---|---|---|
| `max_iterations` | 2000 | |
| `max_dist` | 1.0 mm | correspondances plus éloignées rejetées (`valid_mask`) |
| `rmse_threshold` | 1e-8 | convergence sur la variation du RMSE des inliers |
| `fitness_threshold` | 1e-8 | convergence sur la variation du taux d'inliers |
| Arrêt supplémentaire | `< 3` correspondances valides | |
| Structure | `scipy.spatial.cKDTree` sur les points **fixes**, construit **une fois** hors boucle | |
| Requête | `kdtree.query(..., k=1, workers=-1)` | parallélisée sur tous les cœurs ; c'est le coût dominant |

À chaque itération : correspondances au plus proche voisin, filtrage par
`max_dist`, puis estimation rigide **par SVD de Kabsch** sur les centroïdes
recentrés, avec correction du déterminant (`Vt[-1,:] *= -1` si `det(R) < 0`)
pour interdire les réflexions. La transformation est composée à gauche
(`transformation = delta @ transformation`) et **réappliquée aux points
d'origine** à chaque tour, ce qui évite l'accumulation d'erreur.

**La fonction ne fait pas ce que son nom dit.** Elle s'appelle
`run_icp_point_to_plane`, elle calcule bien `fixed_normals` par
`compute_normals(inplace=True)` sur une copie du maillage fixe — et **ne s'en
sert jamais**. Le critère minimisé est `‖R·s + t − d‖²`, c'est-à-dire du
**point-à-point** classique. Les normales sont calculées puis jetées à chaque
appel, deux fois par patient, sur une isosurface de marching cubes qui peut
faire des centaines de milliers de faces.

**Ce que l'ICP recale, exactement** : le maillage IOS complet (chaque vertex est
un point mobile) contre **toute** l'isosurface à 400 — os alvéolaire, émail,
corticale, artefacts, bruit du seuillage. Il n'y a aucune restriction aux dents,
aucun masque, aucun poids. Ce qui rend le résultat exploitable est uniquement la
combinaison *bon pré-alignement par les landmarks* + *fenêtre de correspondance
de 1 mm*, qui élimine de fait tout ce qui n'est pas juste sous la surface
occlusale.

Les deux arcades sont recalées **indépendamment** contre la même isosurface,
avec deux matrices distinctes `mat_icp_upper` et `mat_icp_lower` — l'occlusion
relative n'est pas contrainte.

## 5. Sorties

`save_registered_ios()` ([AREG_IOSCBCT.py:272](AREG_IOSCBCT/AREG_IOSCBCT.py#L272))
et `apply_matrix_and_save_landmarks()`
([AREG_IOSCBCT.py:278](AREG_IOSCBCT/AREG_IOSCBCT.py#L278)), tous dans
`<output>` (= `<folder_output>/Registered IOS` dans les modes Semi et Auto) :

| Fichier | Contenu |
|---|---|
| `<pid>_Reg_U.vtk` | IOS supérieur, landmark transform **puis** ICP appliqués |
| `<pid>_Reg_L.vtk` | idem inférieur |
| `<pid>_lm_Reg_U.mrk.json` | **le json CBCT**, dont chaque `position` est remplacée par celle du landmark IOS recalé de même label |
| `<pid>_lm_Reg_L.mrk.json` | idem |

`<pid>` est l'identifiant **normalisé** (`P1`, pas `P_0001`) : les noms de
sortie ne ressemblent donc pas aux noms d'entrée, d'où `_matchAcrossNaming()`
dans [Review.py:226](AREG/AREG_Method/Review.py#L226).

Les json de sortie sont un choix discutable : le conteneur vient du CBCT
(display, ids, ordre) mais les coordonnées viennent de l'IOS.
`_write_positions()` ([AREG_IOSCBCT.py:81](AREG_IOSCBCT/AREG_IOSCBCT.py#L81))
apparie **par label**, et **supprime** les control points CBCT sans homologue
IOS plutôt que de les laisser à leur position d'origine. L'ancienne version
indexait par position : un CBCT à un landmark contre six côté IOS écrivait les
coordonnées de `UL1O` sous le label `UR6O`.

**Aucun `.tfm` n'est produit.** Ni la matrice landmark, ni la matrice ICP ne
sont écrites sur disque ; seules les géométries transformées le sont. C'est
assumé au niveau du widget : la fiche de revue `ioscbct_registration` est de
type `VIEW` et non `REGISTRATION`, avec le texte « This step writes no matrix,
so the result cannot be moved here »
([Review.py:680](AREG/AREG_Method/Review.py#L680)) — l'opérateur ne peut donc
pas corriger le recalage à la souris comme il le fait pour AREG_IOS ou AREG_CBCT.

Si aucun patient n'a pu être recalé, `main()` lève une `RuntimeError`
([AREG_IOSCBCT.py:577](AREG_IOSCBCT/AREG_IOSCBCT.py#L577)) : la boucle
`try/except/continue` sortait sinon en code 0 avec un dossier de sortie vide, et
Slicer annonçait le pipeline comme réussi.

## 6. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Rééchantillonnage CBCT | géométrique | `slicer.cli.run(mri2cbct_resample_cbct_mri)` |
| Pré-orientation CBCT | **réseau** (PreASO) | `slicer.cli.run(pre_aso_cbct)` |
| Landmarks CBCT (×2 passes) | **réseau** (ALI_CBCT, agents RL) | `slicer.cli.run(ali_cbct)` |
| Orientation CBCT | géométrique, fichier gold | `slicer.cli.run(semi_aso_cbct)` |
| Segmentation des couronnes IOS | **réseau** (DentalModelSeg) | `conda run -n shapeaxi` |
| Orientation IOS | géométrique, 4 centroïdes + ICP gold | `slicer.cli.run(pre_aso_ios)` |
| Landmarks IOS | **réseau** (ALI_IOS multi-vues) | `slicer.cli.run(ali_ios)` |
| Isosurface CBCT | géométrique, marching cubes à 400 | CLI |
| Pré-alignement | géométrique, Procrustes rigide VTK | CLI |
| ICP | géométrique, Kabsch/SVD itéré, KD-tree | CLI |

Autrement dit : **le CLI AREG_IOSCBCT n'apprend ni ne prédit rien**. Il consomme
deux jeux de landmarks prédits ailleurs et une isosurface seuillée.

## 7. Pièges et points fragiles

- **Le seuil 400 est codé en dur** et n'est jamais exposé. Sur un CBCT non
  calibré en HU, ou avec une reconstruction différente, l'isosurface capture
  autre chose et l'ICP recale contre du bruit. C'est le paramètre le plus
  susceptible de devoir bouger d'un centre à l'autre.
- **`run_icp_point_to_plane` est du point-à-point.** Les normales sont
  calculées et jetées. Soit le nom est faux, soit l'implémentation est
  incomplète — dans les deux cas un repreneur qui compte sur le point-à-plan
  (meilleure convergence sur des surfaces lisses, moins de glissement
  tangentiel) sera déçu.
- **Deux modalités, un seul CBCT par clé patient**, mais **deux arcades
  obligatoires**. Un patient dont seule l'arcade haute a été scannée lève un
  `KeyError` et disparaît du run avec un simple log.
- **Le CBCT doit être `.nii.gz`.** `NumberScan` côté widget compte pourtant
  `.nrrd .nii .gipl` et leurs variantes `.gz`
  ([IOSCBCT.py:32](AREG/AREG_Method/IOSCBCT.py#L32)) : la barre de progression
  peut annoncer des patients que le CLI ne verra jamais.
- **Timepoints limités à T0–T2** par `[Tt]([0-2])` — voir le commentaire
  `TIMEPOINT-SUFFIX` à
  [AREG_IOSCBCT.py:372](AREG_IOSCBCT/AREG_IOSCBCT.py#L372) et la note centrale
  dans [AREG_CBCT/AREG_CBCT_utils/utils.py:83](AREG_CBCT/AREG_CBCT_utils/utils.py#L83).
- **Collision d'identifiants après normalisation** : `P001` et `P1` deviennent
  la même clé, donc le même patient. Rien ne le détecte dans `getPatients` ;
  seul le widget, plus tard, prévient qu'il y a plusieurs candidats
  ([Review.py:243](AREG/AREG_Method/Review.py#L243)).
- **Code mort** : `load_data()` calcule `lm_cbct_U/L` et `lm_ios_U/L` par
  `get_landmarks()` (indexation **positionnelle**, sans labels), et les quatre
  sont écrasés immédiatement par `_pair_landmarks()`
  ([AREG_IOSCBCT.py:507](AREG_IOSCBCT/AREG_IOSCBCT.py#L507)). Seul
  `cbct_surface` sert. Idem : `DisplayAREGIOSCBCT` est **définie deux fois**
  dans [Progress.py](AREG/AREG_Method/Progress.py) (lignes 135 et 182), la
  seconde masque la première ; et `PatientScanLandmark`
  ([IOSCBCT.py:40](AREG/AREG_Method/IOSCBCT.py#L40)) n'est appelée nulle part.
- **`DisplayAREGIOSCBCT(0)`** est instanciée avec `nb_progress_total = 0` dans
  les trois modes : `self.progress / 0` → `ZeroDivisionError` si la barre est
  mise à jour. Elle ne l'est qu'à la condition
  `progress == 200 and updateProgessBar == False`, ce qui explique qu'on ne
  s'en aperçoive pas.
- **`fitness` et `inlier_rmse` sont lues après la boucle ICP**. Avec
  `max_iterations = 0` (impossible ici, mais fragile) ou une sortie au premier
  `break` sur `< 3` correspondances, elles sont définies — mais le code ne s'en
  protège pas.
- **Le pré-alignement peut être silencieusement l'identité.** Il est loggé en
  warning, jamais en erreur : un run entier peut n'avoir bénéficié d'aucun
  pré-alignement et sortir quand même des fichiers. Vérifier les lignes
  `Skipping the pre-alignment` du log avant d'exploiter un lot.
- **`pyvista` est installé dans le Python de Slicer**, en version épinglée
  `0.47.3`. C'est une dépendance lourde qui n'est là que pour ce module
  (`pv.wrap`, `contour`, `transform`, `read`, `save`) et pourrait être remplacée
  par du VTK direct, déjà présent.

## 8. Littérature

**Aucun papier ne porte sur AREG_IOSCBCT tel qu'implémenté ici.** La lignée
publiée par le groupe couvre l'orientation et le recalage CBCT
([Automated Orientation and Registration of CBCT Scans, LNCS 2023](https://link.springer.com/chapter/10.1007/978-3-031-45249-9_5))
et le recalage IOS longitudinal (AReg IOS, LNCS 2023) ; les modules de landmarks
qu'il consomme ont chacun le leur
([ALI_CBCT](https://onlinelibrary.wiley.com/doi/10.1111/ocr.12642)). La partie
multimodale IOS↔CBCT semble être un assemblage interne non publié.

Le voisinage méthodologique dans la littérature — à titre de comparaison, pas
comme description de ce code :

- [Novel Procedure for Automatic Registration between CBCT and Intraoral Scan Data Supported with 3D Segmentation](https://pmc.ncbi.nlm.nih.gov/articles/PMC10669060/) :
  même problème, mais **avec** segmentation des dents des deux côtés, puis
  RANSAC + ICP. Erreur rapportée 0.234 ± 0.019 mm. AREG_IOSCBCT prend
  explicitement le chemin plus léger : landmarks au lieu de segmentation
  volumique, isosurface seuillée au lieu de dents segmentées.
- [Automatic multimodal registration of CBCT and intraoral scans: a systematic review and meta-analysis](https://link.springer.com/article/10.1007/s00784-025-06183-x) :
  revue systématique, situe les approches géométriques (fiables, peu coûteuses)
  face aux approches apprises.
- [Fully automatic integration of dental CBCT images and full-arch intraoral impressions](https://arxiv.org/pdf/2112.01784) :
  variante avec identification dent par dent et correction d'erreur de stitching.

Références du dépôt :

- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)
- [AREG (dépôt d'origine)](https://github.com/lucanchling/AREG)
- [ALIDDM — poids ALI_IOS](https://github.com/baptistebaquero/ALIDDM/releases/tag/v1.0.3)

Bibliographie détaillée, fichiers récupérés et liens à visiter :
[SOURCES.md](SOURCES.md).
