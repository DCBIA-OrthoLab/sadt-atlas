# AREG_IOS — pipeline complet

Recalage longitudinal T1/T2 d'Intra Oral Scans. Même principe que
[FlexReg.md](../FlexReg/FlexReg.md) — un ICP rigide restreint à une région stable — mais la
région est **prédite par un réseau** au lieu d'être dessinée par l'opérateur, et
le traitement est **par lots de dossiers** au lieu d'être patient par patient.

Deux modes coexistent dans le même CLI :

- **Butterfly** — arcade supérieure, patch palatin prédit par un `MonaiUNetHRes`
  multi-vues ;
- **MGL** — arcade inférieure, bande géodésique autour de la ligne
  mucogingivale, construite à partir des 13 landmarks MG prédits par ALI_IOS.
  C'est le même code que la voie MGL de FlexReg, recopié dans le CLI.

## 1. Situation dans la chaîne

AREG_IOS est un CLI. Son seul appelant dans le dépôt est le module AREG, via
[IOS.py](AREG/AREG_Method/IOS.py). Il n'appelle lui-même aucun autre module :
tout ce dont il a besoin (segmentation, orientation, landmarks) est produit
**en amont** par les étapes que l'orchestrateur empile devant lui.

| Mode AREG | Étapes empilées avant AREG_IOS | Source |
|---|---|---|
| `Auto_IOS` / Butterfly | `CrownSegmentationcli` T1 et T2 → `PRE_ASO_IOS` T1 et T2 | [IOS.py:594](AREG/AREG_Method/IOS.py#L594) |
| `Semi_IOS` / Butterfly | rien : les scans doivent déjà porter `Universal_ID` et être orientés | [IOS.py:743](AREG/AREG_Method/IOS.py#L743) |
| `Auto_IOS` / MGL | `CrownSegmentationcli` T1 et T2 → `ALI_IOS` T1 et T2 | [IOS.py:40](AREG/AREG_Method/IOS.py#L40) |
| `Semi_IOS` / MGL | idem : MGL segmente aussi, car ALI ne place rien sans labels de dents | [IOS.py:743](AREG/AREG_Method/IOS.py#L743) |

Le choix Butterfly/MGL est une combo box du widget
([AREG.py:660](AREG/AREG.py#L660)), lue par `isMGLRegistration()`
([AREG.py:753](AREG/AREG.py#L753)) et transmise en `reg_type`.

Côté amont conceptuel, **FlexReg produit exactement la même entrée** : un array
de points 0/1 nommé `Butterfly` ou `Bottom_MGL`. Un scan patché à la main dans
FlexReg passe tel quel dans l'ICP d'AREG_IOS.

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [AREG_IOS/AREG_IOS.py](AREG_IOS/AREG_IOS.py) | le CLI, 451 lignes : boucle Butterfly, `RunMGL`, écriture des `.tfm` | env conda `shapeaxi` |
| [AREG_IOS_utils/PredPatch.py](AREG_IOS/AREG_IOS_utils/PredPatch.py) | inférence du patch palatin + post-traitement morphologique | idem, **CUDA obligatoire** |
| [AREG_IOS_utils/net.py](AREG_IOS/AREG_IOS_utils/net.py) | `MonaiUNetHRes` : rendu PyTorch3D + UNet MONAI | idem |
| [AREG_IOS_utils/dataset.py](AREG_IOS/AREG_IOS_utils/dataset.py) | appariement T1/T2, orientation canonique, normalisation, tenseurs | idem |
| [AREG_IOS_utils/mgl_patch.py](AREG_IOS/AREG_IOS_utils/mgl_patch.py) | bande MGL : spline, snap, Dijkstra par tas binaire | idem, CPU |
| [AREG_IOS_utils/ICP.py](AREG_IOS/AREG_IOS_utils/ICP.py) | `vtkIterativeClosestPointTransform` enveloppé | idem, CPU |
| [AREG_IOS_utils/post_process.py](AREG_IOS/AREG_IOS_utils/post_process.py) | `RemoveIslands`, `DilateLabel`, `ErodeLabel` sur le graphe du maillage | idem, CPU pur Python |
| [AREG_IOS_utils/vtkSegTeeth.py](AREG_IOS/AREG_IOS_utils/vtkSegTeeth.py) | extraction du nuage de points du patch | idem |

**Contrairement à FlexReg**, AREG_IOS ne passe pas par `slicer.cli.run` malgré
son `.xml` de CLI Slicer. `run_conda_tool("areg")`
([AREG.py:2667](AREG/AREG.py#L2667)) construit :

```
conda run -n shapeaxi python -m AREG_IOS "<T1>" "<T2>" "<output>" "<model>" \
  "<suffix>" "<log_path>" "<areg_mode>" ["<reg_type>" "<patch_radius>" "<lm_T1>" "<lm_T2>"]
```

Les valeurs sont ajoutées **dans l'ordre d'itération du dictionnaire** de
paramètres — d'où les commentaires « Key order matters » dans
[IOS.py](AREG/AREG_Method/IOS.py). Le module est trouvé parce que
`give_pythonpath_windows()` ([AREG.py:3190](AREG/AREG.py#L3190)) pousse les
`searchPaths` de Slicer dans le `PYTHONPATH` de l'environnement conda.

Conséquence : [AREG_IOS.xml](AREG_IOS/AREG_IOS.xml) est **mort**. Il ne déclare
que 7 paramètres, saute l'index 4, et ignore `reg_type`, `patch_radius`,
`lm_T1`, `lm_T2`. Il ne sert qu'à enregistrer `slicer.modules.areg_ios` pour que
l'orchestrateur puisse référencer l'objet module.

## 3. Entrées et prétraitements

### 3.1 Appariement T1/T2

`Sort()` ([dataset.py:98](AREG_IOS/AREG_IOS_utils/dataset.py#L98)) et
`sort()` ([dataset.py:267](AREG_IOS/AREG_IOS_utils/dataset.py#L267)) :

1. `glob` sur les deux dossiers, filtré sur `.vtk .vtp .stl .obj` (les `.tfm`
   sont exclus explicitement) ;
2. les fichiers sont classés Upper/Lower par recherche de sous-chaîne :
   `["Lower","_L","L_","Mandibule","Md"]` et `["Upper","_U","U_","Maxilla","Mx"]` ;
3. l'appariement se fait en **supprimant littéralement la sous-chaîne `T1` / `T2`**
   du basename et en comparant les chaînes restantes ;
4. le couplage Upper↔Lower d'un même patient se fait en retirant en plus les
   mots Upper/Lower et en comparant.

Hypothèses non négociables : le nom contient `T1` ou `T2` littéralement, et un
marqueur d'arcade. Un `_T4` ne s'apparie à rien (le commentaire
`TIMEPOINT-SUFFIX` dans [AREG_IOS.py:318](AREG_IOS/AREG_IOS.py#L318) renvoie à la
note centrale de [AREG_CBCT/AREG_CBCT_utils/utils.py:83](AREG_CBCT/AREG_CBCT_utils/utils.py#L83)).

`SortLower()` ([dataset.py:173](AREG_IOS/AREG_IOS_utils/dataset.py#L173)) est la
variante MGL : glob **récursif** (`**/*`), parce que `CrownSegmentationcli`
écrit dans un sous-dossier nommé d'après le csv (`liste_csv_file_T1_Seg`), et
elle apparie les arcades basses seules, sans exiger la paire haute
correspondante.

### 3.2 Orientation canonique (Butterfly seulement)

`DatasetPatch.__getitem__` ([dataset.py:39](AREG_IOS/AREG_IOS_utils/dataset.py#L39))
appelle `orientation()` ([orientation.py:42](AREG_IOS/AREG_IOS_utils/orientation.py#L42))
avec la cible `[[-0.5,-0.5,0], [0,0,0], [0.5,-0.5,0]]` et les dents
**`["3","8","9","14"]` = UR6, UR1, UL1, UL6**.

C'est le même algorithme que [FlexReg.md](../FlexReg/FlexReg.md) §3 (deux rotations de
Rodrigues successives + translation), mais sur des **repères différents** :
FlexReg utilise 3, 5, 12, 14 (UR6, UR4, UL4, UL6), AREG_IOS utilise les molaires
et les **incisives centrales**, dont il moyenne les deux centroïdes pour obtenir
le point milieu. Résultat identique en nature : plan occlusal ≈ `z=0`,
`+y` antérieur, `+x` côté gauche.

Le repère est **direct avec x = gauche patient et y = antérieur**, donc
`z = x × y` pointe vers l'inférieur pour un maxillaire — les 7 caméras placées
en `z ≈ +0.9` regardent donc l'arcade **depuis la face occlusale**, côté palais.
(Déduction géométrique à partir de la cible, pas une affirmation du code.)

L'échec d'orientation **n'arrête pas la prédiction** : `NoSegmentationSurf` et
`ToothNoExist` sont attrapées, un warning est écrit, et le réseau tourne sur le
scan tel quel. Le message d'erreur dit « UR6, UR1, UL1 or UR6 » — coquille, il
faut lire UL6.

### 3.3 Normalisation

`ScaleSurf()` ([transformation.py:181](AREG_IOS/AREG_IOS_utils/transformation.py#L181))
recentre sur le centre de la bounding box et applique
`scale = 1 / ||bounds_max − centre||`. Puis `ComputeNormals` (normales de
points, `SplittingOff` — **indispensable**, sinon l'ordre et le nombre des
vertex changent).

Les trois tenseurs :

| Tenseur | Contenu | Forme | dtype |
|---|---|---|---|
| `V` | vertex après orientation + normalisation | `(N_v, 3)` | float32 |
| `F` | triangles, colonne 0 du `GetPolys()` retirée | `(N_f, 3)` | int64 |
| `CN` | normales encodées couleur : `(n·0.5+0.5)·255` puis `/255` | `(N_v, 3)` | float32 |

Malgré son nom, `CN` (« color normal ») est bien une couleur **par vertex** —
`GetColorArray` ([utils.py:83](AREG_IOS/AREG_IOS_utils/utils.py#L83)) boucle sur
les points, pas sur les cellules. L'aller-retour par des entiers 0–255 quantifie
les normales sur 8 bits ; c'est volontaire, l'entraînement a vu la même chose.

**Point important** : le réseau est nourri de la surface orientée/normalisée,
mais l'array de labels est écrit sur la surface **brute**
(`dataset.getUpperSurf(idx, time)`, lue indépendamment). Les deux ont le même
ordre de vertex, donc l'indexation est valide, et l'ICP tourne dans les
coordonnées du fichier d'entrée — pas dans le repère canonique.

## 4. Le modèle — MonaiUNetHRes

Fichier de poids : un `.ckpt` unique dans le dossier modèle, sélectionné par
`getModel(..., extension="ckpt")` ([IOS.py:266](AREG/AREG_Method/IOS.py#L266)).
Source : `AREG_model.zip`, release
[HUTIN1/AREG v1.0.0](https://github.com/HUTIN1/AREG/releases/download/v1.0.0/AREG_model.zip)
([IOS.py:272](AREG/AREG_Method/IOS.py#L272)). Chargé par
`torch.load(path)["state_dict"]` — checkpoint PyTorch Lightning.

### 4.1 Architecture

[net.py:61](AREG_IOS/AREG_IOS_utils/net.py#L61). Un `LightningModule` qui
contient **le rendu et le réseau** :

| Élément | Valeur |
|---|---|
| Backbone | `monai.networks.nets.UNet`, `spatial_dims=2` |
| Canaux | `channels=(16, 32, 64, 128, 256)`, `strides=(2,2,2,2)`, `num_res_units=2` |
| Entrée | `in_channels=4` — RGB des normales + 1 canal de profondeur |
| Sortie | `out_channels=2` — fond / patch |
| Enveloppe | `TimeDistributed` : replie l'axe des vues dans le batch, applique l'UNet, redéplie |
| Perte (entraînement) | `monai.losses.DiceCELoss(include_background=False, to_onehot_y=True, softmax=True)` |

C'est donc un **UNet 2D ordinaire** ; tout ce qui est « 3D » est dans le rendu.
Le `HRes` du nom ne correspond à rien de particulier dans le code.

Le bloc `inspect.signature(DiceCELoss.__init__)` choisit entre `weight` et
`ce_weight` selon la version de MONAI installée. `class_weights` est toujours
`None` en inférence, donc ce bloc ne sert qu'à réimporter le checkpoint sans
planter.

### 4.2 Le rendu multi-vues

`setup_ico_verts()` ([net.py:114](AREG_IOS/AREG_IOS_utils/net.py#L114)) —
**7 positions de caméra**, malgré le nom `ico_verts` ce n'est pas une
icosphère :

```
[0, 0, 0.9]  [0.2, 0, 0.9]  [-0.2, 0, 0.9]  [0, 0.2, 0.9]
[0, -0.2, 0.9]  [-0.2, -0.2, 0.9]  [0.2, -0.2, 0.9]
```

Sept points serrés à `z = 0.9`, tous regardant l'origine
(`look_at_rotation`, `T = -Rᵀ·C`). Ce n'est **pas** un fly-by sur la sphère
comme DentalModelSeg ou ALI : c'est une vue occlusale légèrement décalée sept
fois, ce qui n'a de sens que parce que le scan a été mis en repère canonique
juste avant.

`setup_render()` ([net.py:132](AREG_IOS/AREG_IOS_utils/net.py#L132)) :

| Paramètre | Valeur |
|---|---|
| `image_size` | **320** |
| `blur_radius` | 0 |
| `faces_per_pixel` | 1 |
| `max_faces_per_bin` | 200000 |
| `perspective_correct` | True |
| Caméra | `FoVPerspectiveCameras` par défaut (fov 60°) |
| Éclairage | `AmbientLights` + `HardPhongShader` |

Pour chaque caméra, `render()` ([net.py:184](AREG_IOS/AREG_IOS_utils/net.py#L184))
produit :

- `images[..., 0:3]` — le rendu Phong de la texture `TexturesVertex(CN)`, donc
  les normales ;
- `zbuf` — la carte de profondeur du rasterizer, concaténée en 4ᵉ canal ;
- `pix_to_face` — pour chaque pixel, **l'indice de la face touchée**, ou `-1`
  si le rayon ne touche rien.

Formes finales : `X (1, 7, 4, 320, 320)`, `PF (1, 7, 1, 320, 320)`,
`x (1, 7, 2, 320, 320)`.

`PF` est le pivot de tout le mécanisme : c'est le **lien pixel → face** qui
permet de reprojeter une segmentation 2D sur le maillage sans jamais faire de
lancer de rayon inverse. Le rasterizer est appelé deux fois (`self.renderer(...)`
puis `self.renderer.rasterizer(...)`) — le second appel, sans `R`/`T`, refait
la rastérisation avec la caméra par défaut du rasterizer. Cela fonctionne
parce que `MeshRenderer.__call__` a déjà poussé `R`/`T` dans les `kwargs` de la
caméra, mais c'est du travail dupliqué à chaque vue.

### 4.3 De la prédiction 2D au label par vertex

[PredPatch.py:36](AREG_IOS/AREG_IOS_utils/PredPatch.py#L36) :

```python
x, X, PF = self.model((V, F, CN))
x = self.softmax(x * (PF >= 0))          # softmax dim=2, sur les 2 canaux
P_faces = torch.zeros(2, F.shape[1])
for pf, pred in zip(PF.squeeze(), x.squeeze(0)):   # boucle sur les 7 vues
    P_faces[:, pf] += pred
P_faces = torch.argmax(P_faces, dim=0)
V_labels_prediction[F[0, :, 0]] = P_faces
```

Trois choses à comprendre :

1. **Le masque de fond.** `x * (PF >= 0)` annule les logits des pixels vides.
   Après softmax ils valent `(0.5, 0.5)` — pas 0. Ils contribuent donc un
   demi-vote aux deux classes, ce qui s'annule à l'`argmax` mais dilue les
   votes réels. Les faces d'indice `-1` (le fond) écrivent dans
   `P_faces[:, -1]`, c'est-à-dire **la dernière face du maillage**, qui reçoit
   ainsi du bruit.
2. **L'accumulation n'accumule pas vraiment.** `P_faces[:, pf] += pred` est un
   `index_put_` sans `accumulate=True` : quand plusieurs pixels d'une même vue
   tombent sur la même face (le cas général, une face couvre plusieurs pixels),
   **une seule contribution survit**, non déterministe. La somme sur les 7 vues,
   elle, fonctionne (7 itérations de boucle Python distinctes).
3. **Le vote face → vertex est dégénéré.** `V_labels_prediction[F[0,:,0]] = P_faces`
   n'écrit que sur le **premier vertex de chaque triangle**. Un vertex qui n'est
   jamais en position 0 dans sa liste de faces reste à 0. Le patch sort donc
   troué par construction — et c'est le post-traitement morphologique qui
   répare, pas un raffinement cosmétique.

Puis `torch.where(>= 1, 1, 0)`, `numpy_to_vtk`, array nommé **`Butterfly`**,
ajouté aux `PointData` de la surface brute.

### 4.4 Post-traitement

[post_process.py](AREG_IOS/AREG_IOS_utils/post_process.py), appelé dans l'ordre
exact suivant ([PredPatch.py:77](AREG_IOS/AREG_IOS_utils/PredPatch.py#L77)) :

| Appel | Paramètres réels | Effet |
|---|---|---|
| `RemoveIslands(surf, arr, 33, 500, ignore_neg1=True)` | label **33** | **aucun** : l'array ne contient que 0 et 1. Code mort. |
| `RemoveIslands(..., label, 200, ignore_neg1=True)` pour `label` ∈ {0, 1} | `min_count=200` | toute composante connexe de moins de 200 vertex est réétiquetée avec le label majoritaire de son voisinage |
| `DilateLabel(..., 1, iterations=2, dilateOverTarget=False, target=None)` | 2 itérations | passe à 1 tout voisin d'un vertex à 1 |
| `ErodeLabel(..., 1, iterations=2, target=None)` | 2 itérations | rend à leur voisin les vertex à 1 qui touchent un vertex à 0 |

Dilatation puis érosion de même rayon = **fermeture morphologique sur le graphe
d'arêtes** : les trous laissés par le vote sur le premier vertex se bouchent,
la frontière revient à peu près où elle était.

La connexité est celle des cellules incidentes (`GetPointCells` puis
`GetCellPoints`), donc un voisinage à 1 anneau. Tout est en Python pur, appel
VTK par appel VTK, sur ~100 000 vertex : c'est le poste de calcul dominant après
l'inférence. `NeighborLabel` utilise
`max(neighbor_labels, key=neighbor_labels.count)`, quadratique.

## 5. Le mode MGL — arcade inférieure

Le palais donne un plateau stable en haut ; la mandibule n'en a pas. Le
substitut est la ligne mucogingivale. Ce mode est **le portage CLI de la voie C
de FlexReg** (cf. [FlexReg.md](../FlexReg/FlexReg.md) §5.3) et il ne fait intervenir
**aucun réseau AREG** : le `.ckpt` palatin n'est même pas chargé
(`parameter_reg["model"] = "None"`, [IOS.py:92](AREG/AREG_Method/IOS.py#L92), et
`RunMGL` retourne avant `PredPatch`).

### 5.1 Les landmarks

`MGLProcess()` ([IOS.py:40](AREG/AREG_Method/IOS.py#L40)) empile deux appels
ALI_IOS (T1 puis T2), sauf si l'utilisateur a fourni un dossier de landmarks :

```
conda run -n shapeaxi python -m ALI_IOS \
  <input> <dir_models> None None \
  "LL6MG LL5MG LL4MG LL3MG LL2MG LL1MG L0MG LR1MG LR2MG LR3MG LR4MG LR5MG LR6MG" \
  <output_dir> 224 0 1 <log_path>
```

13 points, `image_size=224`, `blur_radius=0`, `faces_per_pixel=1`. Les deux
timepoints écrivent dans **le même dossier temporaire**, et
`FindLandmarkFile()` ([AREG_IOS.py:88](AREG_IOS/AREG_IOS.py#L88)) retrouve le
json par le stem du scan : d'abord `<stem>_Lower_MG_Pred.json` (la convention
d'ALI, [ALI_IOS.py:610](ALI_IOS/ALI_IOS.py#L610)), sinon n'importe quel json du
dossier contenant le stem.

### 5.2 DropDoubtfulLandmarks

[mgl_patch.py:61](AREG_IOS/AREG_IOS_utils/mgl_patch.py#L61). ALI écrit dans le
champ `description` du markup la façon dont il a obtenu un point dégradé :
« cameras aimed from an arch fit, tooth not segmented », « forced (confidence
x.xxx) », « fallback (nothing predicted on the mesh) »
([ALI_IOS.py:547](ALI_IOS/ALI_IOS.py#L547)). Tout point portant une
`description` non vide est écarté.

Justification du code (mesurée sur 364 prédictions, non publiée ailleurs) :
**4.2 mm médian d'écart à la courbe des voisins, contre 1.2 mm** pour les
autres. Garde-fou : si moins de 3 points survivraient, on garde tout.

`OrderedMGLandmarks` accepte aussi le nommage historique sans suffixe `MG`
(`MGL_ORDER_LEGACY`), et tolère les manquants tant qu'il en reste 3.

### 5.3 MGLPatch

[mgl_patch.py:227](AREG_IOS/AREG_IOS_utils/mgl_patch.py#L227) :

1. `SplineThroughLandmarks` — `vtkParametricSpline` ouverte,
   `SetUResolution(300)` (`DEFAULT_SAMPLES`) ;
2. `SnapToSurface` — chaque échantillon est ramené sur le vertex le plus proche
   (`vtkPointLocator`), doublons supprimés. Une spline interpolée sort de la
   surface dans les concavités interdentaires ;
3. `GrowBand` — **Dijkstra multi-source** sur le graphe d'arêtes, pondéré par la
   longueur euclidienne réelle, implémenté au tas binaire (`heapq`), arrêt à
   `radius` mm. Distance **géodésique**, pas euclidienne : une bande vestibulaire
   ne peut pas ressortir en lingual là où la crête est plus mince que le rayon ;
4. les couronnes sont retirées : `LOWER_TOOTH_LABELS = range(18, 32)` sur
   `Universal_ID`, `PredictedID` ou `UniversalID` (premier trouvé). Sans
   segmentation, warning et on garde tout ;
5. array de sortie : **`Bottom_MGL`** (`MGL_ARRAY_NAME`), le même nom que dans
   FlexReg.

Cas particulier `radius == 0` : ni bande ni spline, le patch se réduit aux 13
vertex snappés des landmarks. C'est le **cas témoin** assumé, pour mesurer ce
que la bande apporte par rapport aux points seuls.

Différences avec la version FlexReg ([FlexReg.md](../FlexReg/FlexReg.md) §5.3) :

| | FlexReg (`FlexReg/FlexReg_utils/mgl_patch.py`) | AREG_IOS (`AREG_IOS/AREG_IOS_utils/mgl_patch.py`) |
|---|---|---|
| Solveur | `scipy.sparse.csgraph.dijkstra`, `min_only=True` | `heapq` maison |
| Repère local | `LocalFrames` par SVD, offsets buccal/apical/tangentiel | **absent** |
| Hauteur | asymétrique, interpolée entre landmarks (`np.interp`) | **une seule valeur**, `radius` |
| Échantillons | `SAMPLES_PER_SEGMENT = 25` | `DEFAULT_SAMPLES = 300` au total |
| Bornes | 0 – 5 mm | 0 – 20 mm (`MGL_MAX_RADIUS`, [AREG.py:39](AREG/AREG.py#L39)) |
| Aperçu | oui (`Bottom_MGLPreview`) | non |

Autrement dit AREG_IOS a la version **simplifiée** : bande symétrique de hauteur
constante, sans réglage fin. Ce sont deux fichiers distincts qui ont divergé, pas
un module partagé.

### 5.4 La boucle MGL

`RunMGL()` ([AREG_IOS.py:111](AREG_IOS/AREG_IOS.py#L111)) : pour chaque paire
basse, patch sur T1 **et** sur T2, ICP, écriture des deux. Si aucune paire ne
passe, une `RuntimeError` est levée avec la première erreur — un run qui réussit
en laissant le dossier de sortie vide envoyait l'utilisateur chercher au mauvais
endroit.

## 6. L'ICP

Identique dans les deux modes, seul l'array change
([AREG_IOS.py:191](AREG_IOS/AREG_IOS.py#L191) et
[AREG_IOS.py:204](AREG_IOS/AREG_IOS.py#L204)) :

```python
option = vtkMeshTeeth(list_teeth=[1], property="Butterfly")   # ou MGL_ARRAY_NAME
icp = ICP([vtkICP()], option=option)
output_icp = icp.run(surf_T2, surf_T1)     # source = T2 mobile, target = T1 fixe
```

`vtkMeshTeeth.__call__` ([vtkSegTeeth.py:87](AREG_IOS/AREG_IOS_utils/vtkSegTeeth.py#L87))
ne construit pas de maillage malgré son nom : il retourne un `vtkPolyData`
constitué uniquement de **vertex isolés**, ceux dont l'array vaut 1. `list_teeth=[1]`
ne désigne donc pas la dent n°1 mais **la valeur 1 du masque**.

L'ICP sur ce nuage
([ICP.py:94](AREG_IOS/AREG_IOS_utils/ICP.py#L94)) :

```python
icp.GetLandmarkTransform().SetModeToRigidBody()   # 6 ddl, pas d'échelle
icp.SetMaximumNumberOfIterations(1000)
icp.StartByMatchingCentroidsOn()
```

Strictement le même bloc que FlexReg. Aucune dent n'entre dans l'appariement :
ce sont précisément les structures qui bougent entre T1 et T2.

`ICP.run` retourne un dictionnaire dont seuls `matrix` et `source_Or`
(= `ApplyTransform(source, matrix)`, donc la surface T2 **complète** transformée)
sont consommés. Comme dans FlexReg, `vtkICP.__call__` retourne `source`
**non transformé** au lieu du résultat : sans effet ici car `list_icp` ne
contient qu'une méthode, mais un enchaînement multi-étapes serait faux.

## 7. Post-traitements et sorties

`WriteSurf(surf, output_folder, name, inname)`
([utils.py:159](AREG_IOS/AREG_IOS_utils/utils.py#L159)) écrit
`<nom sans extension><suffix><extension>`.

| Fichier | Contenu | Mode |
|---|---|---|
| `<T1><suffix>.vtk` | T1 inchangé géométriquement, **avec** l'array `Butterfly` ou `Bottom_MGL` | les deux |
| `<T2><suffix>.vtk` | T2 recalé | les deux |
| `<Lower_T1><suffix>.vtk` | arcade basse T1, copiée telle quelle | Butterfly, si paire basse |
| `<Lower_T2><suffix>.vtk` | arcade basse T2, à laquelle la **matrice de l'arcade haute** est appliquée | Butterfly, si paire basse |
| `<pid>_T1_SegOr.tfm` | copie de `<pid>_SegOr.tfm` écrit par PRE_ASO_IOS | `areg_mode == "Auto_IOS"` seulement |
| `<pid>_T2_SegOr<suffix>.tfm` | matrice composée | idem |

La composition ([transformation.py:80](AREG_IOS/AREG_IOS_utils/transformation.py#L80)) :

```python
final_matrix = np.linalg.inv(areg_matrix @ np.linalg.inv(matrix_aso))
```

`matrix_aso` est la matrice d'orientation écrite par PRE_ASO_IOS
([PRE_ASO_IOS.py:422](ASO_IOS/PRE_ASO_IOS/PRE_ASO_IOS.py#L422)). L'inversion
finale est la convention ITK (*fixed → moving*). Contrairement à FlexReg, il n'y
a **pas de conjugaison par `diag(-1,-1,1,1)`** : les surfaces sont lues et
écrites telles quelles, aucun flip RAS/LPS n'est fait dans AREG_IOS.

En mode `Semi_IOS`, le bloc `.tfm` n'est pas exécuté du tout : la branche
`if args.areg_mode == "Auto_IOS"` ([AREG_IOS.py:315](AREG_IOS/AREG_IOS.py#L315))
est la seule. **Le mode MGL ne produit aucun `.tfm`**, quel que soit
`areg_mode`, puisque `RunMGL` retourne avant.

Le fichier `log_path` reçoit un simple compteur d'entier, relu par
`DisplayAREGIOS` ([Progress.py:92](AREG/AREG_Method/Progress.py#L92)) qui divise
par `nb_patients × 3` pour la barre de progression.

## 8. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Segmentation des couronnes | **réseau** multi-vues (DentalModelSeg, `latest`) | `conda run -n shapeaxi -m CrownSegmentationcli` |
| Orientation ASO (Butterfly, Auto) | géométrique + ICP sur fichier gold | `slicer.cli.run(pre_aso_ios)` |
| Orientation canonique interne | géométrique, 4 centroïdes, 2 rotations | CLI, dans `DatasetPatch` |
| Rendu 7 vues | géométrique (PyTorch3D) | CLI, **GPU** |
| Patch palatin | **réseau** UNet 2D MONAI sur les 7 vues | CLI, **GPU** |
| Reprojection + vote | géométrique (`pix_to_face`, argmax) | CLI, GPU |
| Fermeture morphologique | géométrique, graphe d'arêtes | CLI, CPU |
| Landmarks MG | **réseau** multi-vues (ALI_IOS, `Lower_MG_*.pth`) | `conda run -n shapeaxi -m ALI_IOS` |
| Bande MGL | géométrique, spline + Dijkstra | CLI, CPU |
| Registration | ICP rigide VTK | CLI, CPU |

## 9. FlexReg vs AREG_IOS — le tableau

Même sortie, mêmes arrays, mêmes ICP. La ligne de partage est : **qui décide de
la forme du patch**.

| Étape | FlexReg | AREG_IOS |
|---|---|---|
| Granularité | un patient, interactif | dossiers T1/T2, batch |
| Où tourne le calcul lourd | Python de Slicer (`slicer.cli.run`) | env conda (`python -m AREG_IOS`) |
| Segmentation des couronnes | réseau, à la demande si l'array manque | réseau, étape empilée par AREG |
| Orientation | géométrique, dents 3/5/12/14, dans le CLI | ASO (amont) **puis** géométrique, dents 3/8/9/14, dans le dataset |
| **Patch haut** | **construit à la main** : 4 centroïdes, Bézier réfléchies sur la corde, flood fill géodésique GPU | **prédit** : 7 vues 320², UNet MONAI 2D, reprojection `pix_to_face`, vote, fermeture |
| Réglages du patch haut | `shift_lr`, `shift_ap`, `adjust`, `ratio`, index cumulables | aucun |
| Aperçu temps réel | oui, numpy CPU, point-dans-polygone | non |
| **Patch bas** | MGL : SVD pour le repère, hauteurs asymétriques interpolées, offsets, Dijkstra scipy | MGL : bande symétrique de hauteur constante, Dijkstra heapq |
| Landmarks MG | ALI, édités et nettoyés dans le widget | ALI, nettoyés par `DropDoubtfulLandmarks` dans le CLI |
| Patch alternatif | courbe dessinée à la souris (`type="curve"`) | — |
| Array produit | `Butterfly` (fusion `Butterfly1..N`), `Bottom_MGL` | `Butterfly`, `Bottom_MGL` |
| ICP | `vtkICP`, rigide, 1000 it., centroïdes | **identique** |
| Flip LPS↔RAS | oui, explicite dans le CLI | **non** |
| `.tfm` de sortie | toujours, par conjugaison + inversion | seulement en `Auto_IOS`, composé avec la matrice ASO |
| Fichier d'entrée | **écrasé** en mode patch | jamais modifié |

À retenir : AREG_IOS remplace **une seule étape** de FlexReg par un réseau — la
délimitation du patch palatin. Tout le reste est le même code ou son cousin
direct.

## 10. Environnement

| Élément | Valeur | Source |
|---|---|---|
| Env conda | `shapeaxi`, partagé avec ALI, ASO, FlexReg, DOCShapeAXI | [AREG.py:3104](AREG/AREG.py#L3104) |
| Python | 3.12 | [AREG.py:3106](AREG/AREG.py#L3106) |
| Création de l'env | `torch>=2.8,<2.13`, `ocnn==2.2.1`, `SimpleITK` | [AREG.py:3132](AREG/AREG.py#L3132) |
| pytorch3d + shapeaxi | installés après torch par [install_pytorch.py](AREG/AREG_Method/install_pytorch.py) | [AREG.py:3139](AREG/AREG.py#L3139) |
| Côté Slicer (IOS) | `tqdm`, `vtk`, `pandas`, `monai==1.3.2` | [AREG.py:1448](AREG/AREG.py#L1448) |
| Windows | conda dans WSL, plus `libxrender1`, `libgl1`/`libgl1-mesa-glx`, `libglx-mesa0` | `check_lib_wsl`, [AREG.py:3161](AREG/AREG.py#L3161) |
| GPU | `torch.device("cuda")` en dur dans `PredPatch.__init__` | [PredPatch.py:31](AREG_IOS/AREG_IOS_utils/PredPatch.py#L31) |

`check_deps.ensure_compatible()`
([check_deps.py:171](AREG_IOS/AREG_IOS_utils/check_deps.py#L171)) tourne au tout
début du CLI : il supprime un `image.so` cassé de torchvision, et réinstalle
torchvision via `pip` si la paire torch/torchvision ne figure pas dans sa table
de compatibilité codée en dur (2.1→0.16.0 … 2.7→0.23.0). **Une table qui
s'arrête à torch 2.7 alors que l'env installe `torch>=2.8`** : pour torch 2.8+,
`get_compatible_torchvision` retourne `None`, `is_compatible` vaut `True` par
défaut et rien n'est touché. C'est le comportement souhaitable, mais par
accident.

## 11. Pièges et points fragiles

- **`isLowerUpper()` teste le chemin complet**, pas le basename
  ([dataset.py:241](AREG_IOS/AREG_IOS_utils/dataset.py#L241) ; appelée avec
  `file` plein chemin depuis `Sort` et `SortLower`). Un dossier contenant `_U`,
  `L_`, `Md`… reclasse toutes les arcades. Et les mots sont testés
  **sensibles à la casse** ici, alors que `Method.IsLower` côté widget
  ([IOS.py:141](AREG/AREG_Method/IOS.py#L141)) passe le basename en minuscules :
  les deux ne classent pas pareil.
- **Le vote face→vertex n'écrit que sur `F[:,0]`**, et
  `P_faces[:, pf] += pred` n'accumule pas les pixels d'une même face. Ce sont
  des faits du code, pas des conjectures ; le patch est réparé après coup par la
  fermeture morphologique.
- **`RemoveIslands(..., 33, 500, ...)`** ne peut rien faire : code mort.
- **`check_platform()` cherche `'Microsoft'` avec une majuscule**
  ([AREG_IOS.py:45](AREG_IOS/AREG_IOS.py#L45)). WSL2 annonce
  `microsoft-standard-WSL2` en minuscules, donc la branche WSL n'est
  probablement jamais prise, et c'est le `else` (imports par le package) qui
  tourne. Tant mieux : la branche WSL mélange
  `from AREG_IOS_utils.transformation import ...` et
  `from AREG_IOS.AREG_IOS_utils.transformation import ...`, ce qui exige que
  la racine du dépôt **et** `AREG_IOS/` soient tous deux dans le `PYTHONPATH`.
- **Le `.tfm` de T1 est souvent introuvable.** AREG_IOS cherche
  `<patient_id_short>_SegOr.tfm` où `patient_id_short = name_t2.split("_T2")[0].split("_")[0]`,
  alors que PRE_ASO_IOS l'a nommé d'après `PatientNumber()` =
  `basename.split('_U')[0].split('_L')[0]`
  ([utils.py:295](ASO_IOS/ASO_IOS_utils/utils.py#L295)). Les deux ne coïncident
  que si le marqueur d'arcade précède le timepoint (`P001_Upper_T1.vtk` ✔,
  `P001_T1_Upper.vtk` ✘). L'échec est un warning, pas une erreur.
- **`WriteSurf` utilise toujours `vtkPolyDataWriter`** mais conserve l'extension
  d'entrée : un `.stl` en entrée ressort en `.stl` contenant du VTK legacy.
- **`os.mkdir`** (pas `makedirs`) dans `WriteSurf` : un dossier de sortie
  imbriqué inexistant fait échouer l'écriture.
- **`DatasetPatch.isLower()` teste `is not None`, pas la longueur.** Si
  `Sort` retourne une liste basse vide, `lower` vaut `True` et chaque accès
  lève une `IndexError`, rattrapée en warning.
- **`sort()` et `insideLower()` utilisent `continue` là où `break` était
  attendu** : `sort()` peut apparier un même T1 à plusieurs T2 si les noms
  collapsent.
- **L'orientation ratée n'interrompt rien.** Un scan non segmenté part quand
  même au réseau, dans un repère quelconque, avec 7 caméras qui regardent du
  mauvais côté. Le patch sera silencieusement faux.
- **[AREG_IOS.xml](AREG_IOS/AREG_IOS.xml) est désynchronisé du CLI** (index 4
  manquant, 4 paramètres MGL absents). Sans conséquence tant que le lancement
  passe par conda, mais toute tentative de repasser par `slicer.cli.run`
  cassera.
- **`patch_radius` est clampé à [0, 20] mm côté widget**
  ([AREG.py:734](AREG/AREG.py#L734)) alors que FlexReg s'arrête à 5 mm. Au-delà
  de la hauteur de gencive attachée, la bande déborde sur des tissus mobiles.

## 12. Littérature

Le fondement publié est **AReg IOS: Automatic Registration on IntraOral Scans**
(Hutin, Anchling, Cevidanes et al., *Lecture Notes in Computer Science*, 2023,
MICCAI) : segmentation des couronnes par DentalModelSeg, alignement initial par
centroïdes communs, ROI palatine segmentée par analyse de forme 3D multi-vues,
puis ICP.

Deux écarts entre le papier et le code de ce dépôt :

- le papier décrit un **alignement initial par centroïdes de couronnes
  communes** ; dans le code, ce rôle est tenu par `PRE_ASO_IOS` en amont plus
  `StartByMatchingCentroidsOn()` de VTK, il n'y a pas d'étape d'alignement par
  centroïdes dans AREG_IOS lui-même ;
- la **voie MGL n'existe pas dans le papier**. C'est un développement interne
  postérieur, non publié à ce jour, et les chiffres cités dans son code
  (4.2 mm vs 1.2 mm sur 364 prédictions) ne sont sourcés nulle part ailleurs
  que dans les commentaires.

- [AREG (dépôt d'origine)](https://github.com/lucanchling/AREG)
- [HUTIN1/AREG — release des poids](https://github.com/HUTIN1/AREG/releases/tag/v1.0.0)
- [Automated Orientation and Registration of CBCT Scans, LNCS](https://link.springer.com/chapter/10.1007/978-3-031-45249-9_5)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)
- [Bridging the gap: enabling PyTorch3D and advanced dental imaging tools on Windows through WSL2](https://www.researchgate.net/publication/390709249_Bridging_the_gap_enabling_PyTorch3D_and_advanced_dental_imaging_tools_on_Windows_through_WSL2)

Bibliographie détaillée, fichiers récupérés et liens à visiter :
[SOURCES.md](SOURCES.md).
