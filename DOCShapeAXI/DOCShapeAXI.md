# DOCShapeAXI — pipeline complet

*Dental Oral and Craniofacial Shape Analysis eXplainability and Interpretability.*
Classification de maillages `.vtk` par un réseau **à deux branches** (nuage de
points à attention multi-têtes + rendu multi-vues EfficientNet-B0), suivie
systématiquement d'une passe **Grad-CAM** dont le résultat est écrit comme
scalaire par point sur le maillage.

Un seul geste utilisateur : choisir un type de données, un dossier d'entrée, un
dossier de sortie. Le reste — quel checkpoint, quelle architecture, combien de
classes — est déduit du type de données.

## 1. Situation dans la chaîne

Autonome : rien dans le dépôt n'appelle DOCShapeAXI. Les maillages d'entrée sont
supposés déjà segmentés et extraits ailleurs (AMASSS pour les condyles,
segmentation d'airway, etc.) ; **le module ne produit pas ses propres surfaces**.

| Appelé | Quand | Comment |
|---|---|---|
| [DOCShapeAXI_CLI](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py) | à chaque tâche | `conda run -n shapeaxi python -m DOCShapeAXI_CLI <8 args>` |
| [model_path.json](DOCShapeAXI_CLI/model_path.json) sur `raw.githubusercontent.com` | au début du CLI, si le `.ckpt` manque | `requests.get` puis `urlretrieve` |
| paquet pip `shapeaxi` | tout le temps | `saxi_nets_lightning`, `saxi_dataset`, `saxi_transforms`, `saxi_gradcam`, `post_process`, `utils` |
| [DOCShapeAXI_utils.install_pytorch](DOCShapeAXI/DOCShapeAXI_utils/install_pytorch.py) | si pytorch3d absent | `conda run -n shapeaxi python -m DOCShapeAXI_utils.install_pytorch <pip>` |

L'environnement `shapeaxi` est **partagé** avec FlexReg, ALI, AREG et ASO :
toute modification de version s'y répercute.

Le json des modèles est lu **sur la branche `main` de GitHub**, pas dans la copie
locale ([DOCShapeAXI_CLI.py:118](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L118)) : une
version installée peut télécharger des poids publiés après elle.

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [DOCShapeAXI/DOCShapeAXI.py](DOCShapeAXI/DOCShapeAXI.py) | widget : conda, choix du modèle, barre de progression, ~180 lignes de style sombre | Python de Slicer |
| [DOCShapeAXI_CLI.py](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py) | **prédiction + explicabilité**, 307 lignes | env conda `shapeaxi`, GPU si dispo |
| [model_path.json](DOCShapeAXI_CLI/model_path.json) | 5 checkpoints et leurs URLs | — |
| [install_pytorch.py](DOCShapeAXI/DOCShapeAXI_utils/install_pytorch.py) | choix de la wheel pytorch3d selon le torch installé, puis `shapeaxi>=2.0.2` | env conda |

Le gros du travail est dans le paquet pip `shapeaxi`, hors dépôt. Les détails
d'architecture ci-dessous ont été lus dans l'installation réelle
(`shapeaxi/saxi_nets_lightning.py`, `saxi_layers.py`, `saxi_nets.py`,
`saxi_dataset.py`, `saxi_transforms.py`, `saxi_gradcam.py`) et recoupés avec les
hyperparamètres stockés dans le checkpoint `condyles_4_class.ckpt` lui-même.

## 3. Entrées et prétraitements

### 3.1 Le CSV

Le CLI liste `args.input_dir` à plat, garde les `.vtk`, et écrit
`<output_dir>/files_<data_type>.csv` avec l'en-tête `surf` et **un nom de fichier
par ligne** (`csv_edit`, [DOCShapeAXI_CLI.py:102](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L102)).
Les chemins sont relatifs ; `SaxiDataset` les joint à `mount_point = input_dir`.

`data_type` contient des espaces (« Mandibular Condyle »), donc le csv s'appelle
`files_Mandibular Condyle.csv`. Le csv n'est **régénéré que s'il n'existe pas**
([DOCShapeAXI_CLI.py:282](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L282)) : ajouter des
maillages dans le dossier d'entrée sans vider le dossier de sortie ne les fait
pas traiter.

### 3.2 La normalisation géométrique

`EvalTransform` → `UnitSurfTransform` → `utils.GetUnitSurf` → `ScaleSurf` :

1. centre = milieu de la **bounding box** (pas le centroïde) ;
2. translation des points vers ce centre ;
3. facteur d'échelle `1 / ||bounds_max - centre||`, appliqué uniformément.

Le maillage tient donc dans la sphère unité, indépendamment de sa taille réelle.
**Toute information d'échelle absolue est perdue** — un petit condyle et un gros
condyle de même forme sont identiques pour le réseau.

Point à connaître : `saxi_predict` lit `model.hparams.scale_factor` (0.0507 dans
le checkpoint des condyles) et le passe à `EvalTransform(scale_factor)`
([DOCShapeAXI_CLI.py:206](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L206)), mais
`UnitSurfTransform.__call__` appelle `utils.GetUnitSurf(surf)` **sans le
transmettre** quand l'entrée est un `vtkPolyData`. Le facteur d'échelle appris à
l'entraînement est donc **silencieusement ignoré à l'inférence**, remplacé par une
normalisation par sujet. C'est un bug du paquet `shapeaxi`, pas du dépôt, mais il
change le prétraitement réel. `saxi_gradcam` construit d'ailleurs son dataset
avec `EvalTransform()` sans argument : les deux passes sont finalement cohérentes
entre elles.

### 3.3 Ce que le DataLoader rend

`SaxiDataset(..., CN=True, class_column=None, scalar_column=None)` →
`(V, F, CN)` par sujet :

- `V` : sommets `(1, Nv, 3)` après normalisation ;
- `F` : triangles `(1, Nf, 3)` ;
- `CN` : **normales encodées en couleur**, `utils.ComputeNormals` puis
  `GetColorArray(surf,"Normals")` divisé par 255 → `(1, Nv, 3)` dans [0,1].

Aucun scalaire du maillage n'est lu (`surf_property=None`) : **seules la
géométrie et les normales entrent**. `batch_size=1`, pas de padding, donc des
maillages de tailles différentes passent sans souci.

## 4. Les modèles

### 4.1 La table de décision

`find_model_name()` / `find_nn_type()`
([DOCShapeAXI.py:1012](DOCShapeAXI/DOCShapeAXI.py#L1012)) — le mot-clé testé est
un **token** du libellé du combo (`self.data_type.split(' ')`) :

| Data type (combo) | Token | Tâche | `model` | `nn` | `num_classes` |
|---|---|---|---|---|---|
| Mandibular Condyle | `Condyle` | severity | `condyles_4_class` | `SaxiMHAFBClassification` | 4 |
| Nasopharynx Airway Obstruction | `Airway` | binary | `airways_2_class` | `SaxiMHAFBClassification` | 2 |
| Nasopharynx Airway Obstruction | `Airway` | severity | `airways_4_class` | `SaxiMHAFBClassification` | 4 |
| Nasopharynx Airway Obstruction | `Airway` | regression | `airways_4_regress` | `SaxiMHAFBRegression` | 1 |
| Alveolar Bone Defect in Cleft | `Cleft` | severity | `clefts_4_class` | `SaxiMHAFBClassification` | 4 |

Seul le cas *Airway* enchaîne **trois exécutions complètes** du CLI
(binary, severity, regression) ; les deux autres n'en font qu'une, en `severity`
([DOCShapeAXI.py:627](DOCShapeAXI/DOCShapeAXI.py#L627)).

URLs, toutes dans la release `shapeaxi-ckpt-v1` :
`.../releases/download/shapeaxi-ckpt-v1/{airways_2_class, airways_4_class,
airways_4_regress, cleft_4_class, condyles_4_class}.ckpt`. Noter l'asymétrie :
la clé json est `clefts_4_class` mais le fichier distant s'appelle
`cleft_4_class.ckpt`. Le checkpoint est copié **dans le dossier de sortie**
(`<output_dir>/<model>.ckpt`), pas dans un cache : chaque nouveau dossier de
sortie re-télécharge 72 Mo.

### 4.2 L'architecture réellement utilisée

Ce n'est **pas** un PointNet, et pas non plus le fly-by-CNN à ResNet-18 du papier
ShapeAXI original. `SaxiMHAFBClassification` (*MHA Fly-By*) a **deux branches
fusionnées tardivement**. Valeurs confirmées par les `hyper_parameters` du
checkpoint `condyles_4_class.ckpt` :

**Branche A — nuage de points.**

- `sample_points_from_meshes(X_mesh, 4096)` (pytorch3d) : échantillonnage
  uniforme de **4096 points** sur la surface ;
- `MHAEncoder` : `Linear(3→256)`, puis 4 étages `sample_levels = [4096, 2048,
  512, 128]`. À chaque étage, `MHA_KNN` (attention multi-têtes restreinte aux
  **K=128** plus proches voisins, 256 têtes) puis un `FeedForward` résiduel
  (hidden 64). Entre les étages, sous-échantillonnage aléatoire vers le niveau
  suivant, avec report des indices pour accumuler un **poids par point d'origine**
  (`x_w`) ;
- `Linear(256→256)`, `FeedForward`, puis `SelfAttention` (attention additive
  `Linear(256→64) → tanh → Linear(64→1) → sigmoid`, normalisée puis somme
  pondérée) qui **réduit les 128 tokens à un vecteur de 256**.

**Branche B — multi-vues.**

- caméras aux sommets d'un **icosaèdre subdivisé** (`subdivision_level=2`,
  `radius=1.35`). Le buffer `ico_verts` du checkpoint a la forme `(42, 3)` :
  **42 vues** par sujet ;
- rendu pytorch3d : `FoVPerspectiveCameras`, `look_at_rotation` vers l'origine,
  `AmbientLights` (pas d'ombrage directionnel), `HardPhongShader`,
  `RasterizationSettings(image_size=224, blur_radius=0, faces_per_pixel=1,
  max_faces_per_bin=200000)` ;
- chaque vue est un tenseur **4 canaux** : RGB (les normales-couleur posées comme
  `TexturesVertex`) **+ le z-buffer**. D'où `in_channels=4` ;
- `TimeDistributed(EfficientNetBN('efficientnet-b0', spatial_dims=2,
  in_channels=4, num_classes=256))` de MONAI : les 42 vues sont aplaties dans la
  dimension batch, passées dans le même CNN, puis remises en `(1, 42, 256)` ;
- `FeedForward`, `nn.MultiheadAttention(256, 256 têtes, batch_first=True)` en
  auto-attention sur les 42 vues, puis `SelfAttention` → un vecteur de 256.

**Fusion.** `torch.cat([x_points, x_views], dim=1)` → 512, puis
`fc = Linear(512, num_classes)`. En régression, `Linear(512, 1)` et perte MSE.

Le rendu est refait à chaque passe : il n'y a pas de cache d'images.

### 4.3 Ce que le réseau sort littéralement, et comment on en tire une classe

```python
x = model(X_pc, X_views)                       # (1, num_classes) — logits bruts
if args.nn == 'SaxiMHAFBClassification':
    x = softmax(x).detach()
    x = torch.argmax(x, dim=1, keepdim=True)   # l'entier de classe
predictions.append(x)
```

([DOCShapeAXI_CLI.py:227](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L227))

- classification : **seul l'`argmax` est conservé**. Les probabilités softmax
  sont calculées puis jetées ; aucune mesure de confiance ne sort du module ;
- régression : la valeur brute du `Linear(512,1)` est écrite telle quelle (ratio
  d'obstruction, échelle 0–100 à l'entraînement) ;
- le `softmax` est de toute façon sans effet sur l'`argmax`.

Détail d'entraînement visible dans le code amont : en classification, la cible
n'est pas un one-hot mais des **probabilités de classe douces**
(`soft_class_probabilities` : gaussiennes centrées sur `[12.5, 37.5, 62.5, 87.5]`
avec `widths = 12.5`). Les 4 classes de sévérité sont donc en réalité des
**quartiles d'une grandeur continue** 0–100, ce qui explique qu'un modèle de
régression existe sur le même jeu airway.

## 5. Le mécanisme d'explicabilité

C'est la partie la plus spécifique du module, et elle tourne **systématiquement**
après la prédiction — ni option, ni case à cocher
(`saxi_gradcam`, [DOCShapeAXI_CLI.py:126](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L126)).

**a) La couche ciblée.**

```python
target_layer = getattr(model.convnet.module, '_blocks')
mv_cam = LayerGradCam(model, target_layer[-1], device_ids=[0])
```

`model.convnet.module` est l'EfficientNet-B0 ; `_blocks[-1]` est son **dernier
bloc MBConv**. Conséquence majeure : **la saillance ne décrit que la branche
multi-vues**. La branche nuage de points, qui contribue à la moitié du vecteur
fusionné, n'apparaît nulle part dans la carte. Le `x_w` (poids par point) que
l'encodeur sait produire n'est ni récupéré ni écrit.

**b) Une carte par classe.** Boucle `for class_idx in range(num_classes)` avec
`mv_cam.attribute(inputs=(X_pc, X_views), target=class_idx,
attr_dim_summation=False)` : Captum rétropropage le logit de la classe `class_idx`
jusqu'aux activations du bloc, multiplie par les gradients moyennés, et rend un
tenseur à la résolution de la carte d'activation (7×7 pour EfficientNet-B0 sur
224×224), **pour les 42 vues à la fois**. `attr_dim_summation=False` garde la
dimension canal, refermée juste après par `mv_att.sum(dim=1)`.

**c) Remise à l'échelle** (`scale_cam_image`,
[DOCShapeAXI_CLI.py:43](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L43), adaptée de
pytorch-grad-cam) : `cv2.resize` vers **224×224**, écrêtage aux **percentiles 1
et 99**, puis remise affine dans **[-1, 1]**. L'écrêtage par percentiles évite
qu'un pixel aberrant écrase toute la dynamique ; la sortie est donc signée, pas
une probabilité.

**d) Reprojection sur le maillage** (`gradcam_process`, dans `shapeaxi`) — le
cœur du mécanisme :

```python
P_faces = torch.zeros(1, F.shape[1])
V_gcam  = -1 * torch.ones(V.shape[1])
for pf, gc in zip(PF.squeeze(), GCAM):          # une vue à la fois
    P_faces[:, pf] = torch.maximum(P_faces[:, pf], gc)
faces_pid0 = F[0, :, 0].to(torch.int64)
V_gcam[faces_pid0] = P_faces
V_gcam[V_gcam < 0] = 0
```

- `PF` est le `pix_to_face` du rasterizer : pour chaque pixel de chaque vue,
  l'indice du triangle visible. La valeur du pixel est donc rapatriée **sur la
  face** ;
- l'agrégation inter-vues est un **maximum**, pas une moyenne : une région vue une
  seule fois et jugée saillante garde sa valeur ;
- le passage face → point est brutal : la valeur de chaque face est écrite sur
  **son premier sommet** (`F[0,:,0]`). Les sommets jamais utilisés comme premier
  point d'un triangle restent à -1, puis sont **remis à 0**. La carte est donc
  parsemée de zéros structurels ;
- les faces jamais rasterisées (intérieur, occlusions permanentes) restent à 0.

**e) Lissage puis écriture.**

```python
surf.GetPointData().AddArray(mv_att_upscaled)
psp.MedianFilter(surf, mv_att_upscaled)
utils.WriteSurf(surf, out_surf_path)
```

`MedianFilter` remplace chaque valeur par la médiane de ses voisins topologiques
(1 passe, en place) : c'est ce qui rattrape en partie les trous laissés par le
report « premier sommet ». Il modifie le `vtkDataArray` **déjà ajouté** au
maillage, donc c'est bien la version filtrée qui est écrite.

Le nom du tableau est fixé dans `gradcam_process` :

| Cas | Nom du scalaire |
|---|---|
| `num_classes > 1` | `grad_cam_target_class_0`, `_1`, … |
| régression (`num_classes == 1`) | `grad_cam_max` (`target_class` reste `None`) |

Le fichier est **réécrit à chaque itération de classe**, en accumulant les
tableaux : le `.vtk` final porte les N cartes. C'est ce que le README fait
sélectionner dans le module *Models* → *Scalars* → *Active Scalar*, avec la table
`ColdToHotRainbow`.

## 6. Post-traitements et sorties

| Fichier | Contenu |
|---|---|
| `<output>/<model>.ckpt` | le checkpoint téléchargé, laissé sur place |
| `<output>/files_<data_type>.csv` | la liste des `.vtk` |
| `<output>/files_<data_type>_prediction.csv` | le csv d'entrée + une colonne `<task>_prediction` par tâche |
| `<output>/explainability/<task>/<nom>.vtk` | copie du maillage + N tableaux `grad_cam_*` |
| `<log_path>` | `"<task>,<predict\|explainability>,<index>,<num_classes>"` |

L'accumulation des colonnes est voulue
([DOCShapeAXI_CLI.py:240](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L240)) : si le csv de
prédiction existe déjà, il est **relu** et sert de base, ce qui fait qu'un jeu
airway finit avec `binary_prediction`, `severity_prediction` et
`regression_prediction` côte à côte. Corollaire : relancer sur le même dossier
de sortie écrase les colonnes en place et n'efface jamais les anciennes.

Le log est un **fichier d'une seule ligne réécrite** (`'w+'` à chaque sujet) ;
le widget surveille sa `mtime` et remet la barre à zéro quand le champ
`predict`/`explainability` change ([DOCShapeAXI.py:694](DOCShapeAXI/DOCShapeAXI.py#L694)).

## 7. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Normalisation sphère unité | géométrique (bbox + échelle) | `shapeaxi` |
| Normales-couleur | géométrique (VTK) | `shapeaxi` |
| Échantillonnage 4096 points | stochastique (pytorch3d) | GPU |
| Rendu 42 vues 224×224 RGB+z | rasterisation pytorch3d | GPU |
| Classe / ratio | **réseau** : MHAEncoder + EfficientNet-B0 + attention | GPU |
| Carte Grad-CAM | **dérivée du réseau** (Captum, branche multi-vues seule) | GPU |
| Reprojection face → sommet, max inter-vues | géométrique | GPU/CPU |
| Filtre médian sur le maillage | géométrique, voisinage topologique | CPU |

Deux sources d'aléa à l'inférence : l'échantillonnage des 4096 points
(`torch.randint` dans `MHAEncoder.sample_points` **et** dans
`sample_points_from_meshes`) n'est pas seedé. Deux exécutions peuvent donner
deux cartes de saillance légèrement différentes, et dans les cas limites deux
classes différentes.

## 8. Environnement

| Élément | Valeur | Source |
|---|---|---|
| Env conda | `shapeaxi`, **partagé** avec ALI/AREG/ASO/FlexReg | [DOCShapeAXI.py:801](DOCShapeAXI/DOCShapeAXI.py#L801) |
| Python | **3.12** | [DOCShapeAXI.py:842](DOCShapeAXI/DOCShapeAXI.py#L842) |
| Création de l'env | `torch>=2.8,<2.13`, `ocnn==2.2.1`, `SimpleITK` | idem |
| pytorch3d | wheel choisie d'après `torch.__version__` + CUDA, depuis `https://ImageMindAnalytics.github.io/pytorch3d-wheels/simple/` | [install_pytorch.py:24](DOCShapeAXI/DOCShapeAXI_utils/install_pytorch.py#L24) |
| shapeaxi | `shapeaxi>=2.0.2`, installé **après** pytorch3d | [install_pytorch.py:186](DOCShapeAXI/DOCShapeAXI_utils/install_pytorch.py#L186) |
| Rustine | `patch_dentalmodelseg()` réécrit `saxi_nets.DentalModelSeg` → `saxi_nets_lightning.DentalModelSeg` dans le paquet installé | [install_pytorch.py:210](DOCShapeAXI/DOCShapeAXI_utils/install_pytorch.py#L210) |
| GPU | pas obligatoire (`torch.device('cuda' if …)`) mais `LayerGradCam(..., device_ids=[0])` suppose un GPU 0 | [DOCShapeAXI_CLI.py:148](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L148) |

L'ordre d'installation est contraint : `shapeaxi` déclare `pytorch3d`, absent de
PyPI, donc pip échoue si on le demande dans un env nu — d'où la création de l'env
avec `torch` seul, puis `install_pytorch` qui lit la version de torch pour choisir
la wheel, puis `shapeaxi`. `verify_gpu()` va jusqu'à exécuter un `knn_points` réel
sur le GPU : une wheel qui importe mais ne contient pas les kernels de
l'architecture détectée est repérée là, et non au milieu du pipeline.

`check_if_pytorch3d()` ([DOCShapeAXI.py:844](DOCShapeAXI/DOCShapeAXI.py#L844))
teste `import pytorch3d.renderer` **et** l'accès à
`shapeaxi.dental_model_seg.saxi_nets_lightning.DentalModelSeg` : la sonde couvre
donc aussi la rustine ci-dessus.

## 9. Pièges et points fragiles

- **Le CLI est écrit pour l'API shapeaxi 1.0.x, l'environnement installe 2.0.2.**
  C'est le point à vérifier en premier si le module ne tourne plus :

  | | shapeaxi 1.0.10 | shapeaxi 2.0.2 |
  |---|---|---|
  | signature | `forward(self, X_pc, X_views)` | `forward(self, X_mesh)` |
  | retour | `x` | `x, x_w, X` |
  | hparam du nombre de classes | `out_classes` | `num_classes` |

  Le CLI fait `model(X_pc, X_views)` et utilise le retour comme un tenseur
  ([DOCShapeAXI_CLI.py:227](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L227)) : sur 2.0.2
  c'est un `TypeError` (3 arguments positionnels). Et les checkpoints publiés
  portent `out_classes`, que le `__init__` de 2.0.2 ne lit plus — le
  `load_from_checkpoint` échouerait avant même le forward. Autrement dit :
  **ce module attend une version épinglée `shapeaxi<2` que le script
  d'installation n'installe pas**. Soit épingler, soit porter le CLI vers la
  nouvelle API (passer `X_mesh`, dépaqueter le triplet) et régénérer les
  checkpoints.
- **`strict=False`** sur `load_from_checkpoint`
  ([DOCShapeAXI_CLI.py:198](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L198)) : des poids
  manquants ou en trop passent en silence. Un modèle partiellement chargé prédit
  quand même.
- **Le téléchargement du modèle est conditionné à l'existence du dossier de
  sortie** (`if os.path.exists(args.output_dir): if not os.path.exists(...)`,
  [DOCShapeAXI_CLI.py:277](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L277)). Si le dossier
  n'existe pas, le téléchargement est **sauté** et l'erreur tombe plus loin, au
  chargement du checkpoint. Le CLI ne crée jamais `output_dir`.
- **`process.log` est écrit dans l'arborescence du module**
  (`os.path.dirname(__file__)`, [DOCShapeAXI.py:811](DOCShapeAXI/DOCShapeAXI.py#L811)),
  et le fichier vide [DOCShapeAXI/process.log](DOCShapeAXI/process.log) est
  versionné dans le dépôt. Sur une installation en lecture seule (`/opt`,
  `Program Files`), la création du `DOCShapeAXILogic` lève une exception.
- **`gradcam_save()`** ([DOCShapeAXI_CLI.py:62](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L62))
  appelle `shutil.copy` alors que `shutil` **n'est pas importé** dans le fichier.
  Sans effet : la fonction n'est jamais appelée. Même chose pour les classes
  `MultiHead` et `SelfAttention` définies en tête du CLI
  ([:84](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L84), [:93](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L93)),
  jamais instanciées, et pour l'import `subprocess`.
- **Le facteur d'échelle appris est ignoré** (cf. §3.2). Si un jour
  `UnitSurfTransform` transmet son `scale_factor`, le prétraitement changera sans
  que rien ne bouge dans ce dépôt.
- **Aucune confiance n'est reportée** : seule la classe `argmax` sort. Pour un
  outil dont le nom contient « explainability », c'est l'angle mort — la carte de
  saillance dit *où* le réseau a regardé, jamais *à quel point il hésitait*.
- **La saillance ne couvre qu'une des deux branches** (cf. §5a). Une décision
  prise majoritairement sur la géométrie du nuage de points produira une carte
  multi-vues peu informative, sans que rien ne le signale.
- **`num_workers=4`** dans le DataLoader d'explicabilité
  ([DOCShapeAXI_CLI.py:144](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py#L144)) alors que la
  prédiction n'en utilise aucun : quatre processus lisent les `.vtk` en parallèle
  pendant que le GPU rend 42 vues.
- **La sélection du modèle passe par les mots du libellé du combo.** Renommer
  « Mandibular Condyle » en « Condyles » dans le `.ui` casse `find_model_name`,
  qui rendrait `(None, None)` et, à l'appel suivant, un `TypeError` sur
  `os.path.join(output_dir, None + '.ckpt')`.
- `check_input_parameters` ([DOCShapeAXI.py:469](DOCShapeAXI/DOCShapeAXI.py#L469))
  teste deux fois la même condition, la branche `else` (« Unknown error ») est
  inatteignable.
- `count_num_subjects` ne compte que les `.vtk` du premier niveau — cohérent avec
  `csv_edit`, mais aucun des deux n'est récursif.
- `DOCShapeAXI/__pycache__/DOCShapeAXI.cpython-312.pyc` est versionné.

## 10. Littérature

Trois références, à ne pas confondre :

**1. Le cadre.** *ShapeAXI: Shape Analysis Explainability and Interpretability*,
Prieto, Miranda, Gurgel, Anchling, Hutin, Barone, Al Turkestani, Aliaga, Yatabe,
Bianchi, Cevidanes — **Proc. SPIE Medical Imaging, avril 2024**,
DOI [10.1117/12.3007053](https://doi.org/10.1117/12.3007053). Il rapporte 79.78 %
sur les condyles et 81.58 % sur la sévérité des fentes — précisément deux des
trois jeux supportés ici.

**Le code diverge du papier.** Le papier décrit un rendu multi-vues sur
subdivision d'icosaèdre traité par **ResNet-18** + attention additive. Les
checkpoints distribués ici sont des `SaxiMHAFB*` : **EfficientNet-B0** sur 42 vues
**plus une seconde branche nuage de points** à attention KNN, absente du papier.
Ne pas présenter les chiffres du papier SPIE comme ceux des modèles téléchargés.

**2. Le jeu airway.** *Explainable Artificial Intelligence to Quantify Adenoid
Hypertrophy-related Upper Airway Obstruction using 3D Shape Analysis*, Mattos et
al., **J Dent 2025**. Celui-là décrit exactement l'architecture du code :
branche multi-vues EfficientNet-B0 pré-entraînée ImageNet + attention
multi-têtes, branche nuage de points de **4096 points** à attention KNN, et
explicabilité par « SurfGradCAM » — le mécanisme du §5. Les trois tâches
(4 classes, binaire, régression du ratio d'obstruction) correspondent aux trois
checkpoints `airways_*`. AUC 0.77–0.94, R = 0.854 pour le ratio.

**3. L'origine du module Slicer** : [lucieDLE/DOC-ShapeAXI](https://github.com/lucieDLE/DOC-ShapeAXI),
cité par le [README.md](README.md#L603).

Rien n'est publié sur le jeu *Alveolar Bone Defect in Cleft* au-delà de
l'expérience « cleft severity » du papier SPIE.

- [ShapeAXI (SPIE 2024, texte intégral)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11085013/)
- [Explainable AI to Quantify Adenoid Hypertrophy-related Upper Airway Obstruction (J Dent 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12089392/)
- [ShapeAXI (dépôt)](https://github.com/DCBIA-OrthoLab/ShapeAXI)
- [DOC-ShapeAXI (dépôt d'origine)](https://github.com/lucieDLE/DOC-ShapeAXI)
- [Grad-CAM (Selvaraju et al., 2016)](https://arxiv.org/abs/1610.02391)
- [Captum — LayerGradCam](https://captum.ai/api/layer.html#gradcam)

Bibliographie complète, fichiers récupérés et liens éditeur : [SOURCES.md](SOURCES.md).
Elle corrige un point ci-dessus : le jeu *Alveolar Bone Defect in Cleft* a bien
sa publication propre (Miranda et al., Sci Rep 2023).
