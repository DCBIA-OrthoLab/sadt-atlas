# CLIC — pipeline complet

*Classification and Localization of Impacted Canines.* Segmentation d'instances
2D coupe par coupe d'un CBCT par un **Mask R-CNN torchvision**, dont la classe
prédite encode la position intra-osseuse de la canine incluse : **buccale,
bicorticale, palatine**.

Le nom du module promet deux tâches ; le code n'a **qu'un seul réseau**. Il n'y a
ni réseau de classification séparé, ni réseau de localisation séparé, ni tête de
régression de coordonnées. La classification, c'est le label d'instance
(`pr["labels"]`) ; la localisation, c'est le masque (`pr["masks"]`) — les deux
sortent de la même passe Mask R-CNN. Tout ce qui suit part de là.

## 1. Situation dans la chaîne

Autonome dans les deux sens : aucun module du dépôt n'appelle CLIC, et CLIC
n'appelle aucun autre module du dépôt. Il n'appelle rien d'autre que son propre
runner :

| Appelé | Quand | Comment |
|---|---|---|
| [clic_runner.py](CLIC/runner/clic_runner.py) | une fois par scan | `CondaSetUpCall.condaRunFilePython(runner, ["--params_json=…"], "clic_env")` |
| release `CLIC_model/final_model.pth` | bouton *Download Model* | `requests.get`, écrit dans `~/Documents/CLIC_Models` |

**On part du CBCT brut.** Pas de segmentation préalable, pas de landmarks, pas
d'orientation : le module lit un `.nii`/`.nii.gz` et rend un label map. Il ne
dépend d'AMASSS, d'ASO ni d'ALI d'aucune façon.

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [CLIC/CLIC.py](CLIC/CLIC.py) | widget, 622 lignes dont ~230 de feuille de style sombre et ~50 de rustines conda | Python de Slicer |
| [CLIC/runner/clic_runner.py](CLIC/runner/clic_runner.py) | **tout le traitement**, 110 lignes | env conda `clic_env`, GPU si disponible |
| [CLIC/Resources/UI/CLIC.ui](CLIC/Resources/UI/CLIC.ui) | l'interface | — |

Pas de CLI Slicer, pas de `.xml`, pas de `MedX_Method`-like : le widget écrit un
JSON de paramètres dans `slicer.app.temporaryPath` et lance le runner comme un
script Python autonome dans l'environnement conda.

Le widget importe `CondaSetUp` **au niveau du module**
([CLIC.py:18](CLIC/CLIC.py#L18)) sans le déclarer dans `parent.dependencies` :
sans SlicerConda installé, CLIC ne se charge pas du tout, sans message utile.

Il instancie toujours `CondaSetUpCall()` ([CLIC.py:62](CLIC/CLIC.py#L62)), jamais
`CondaSetUpCallWsl` : contrairement à MedX, DOCShapeAXI et les autres, **CLIC
n'a pas de voie WSL**. Sous Windows il appellera le chemin Unix de SlicerConda,
et l'ordre des arguments de `condaRunFilePython` diffère entre les deux classes
(`(file, args, env)` côté Unix, `(file, env, args)` côté WSL) — la liste d'args
partirait comme nom d'environnement. Le module est de fait Linux-only, malgré le
README.

## 3. Entrées et prétraitements

### 3.1 Collecte des scans

`_collect_scans()` ([CLIC.py:316](CLIC/CLIC.py#L316)) accepte
`.nii`, `.nii.gz`, `.nrrd`, `.mha`, `.mhd`, et suit une règle à deux temps :

1. s'il existe des **sous-dossiers** contenant au moins un fichier valide, il
   retourne la liste de ces **sous-dossiers** ;
2. sinon, la liste des fichiers valides du dossier.

Le cas 1 produit des `Path` de répertoires, passés tels quels comme
`input_path` au runner, qui fait `nib.load(str(inp))` : échec immédiat. Le cas
nominal est donc un dossier plat de `.nii.gz`.

Par ailleurs le runner n'utilise que **nibabel** : `.nrrd`, `.mha`, `.mhd` sont
acceptés par le filtre du widget et illisibles par le runner.

### 3.2 Le prétraitement réel du volume

Il tient en trois lignes ([clic_runner.py:88](CLIC/runner/clic_runner.py#L88)) :

```python
sl = _norm(vol[..., z])                                    # min-max de la coupe
t  = torch.from_numpy(sl).unsqueeze(0).repeat(3, 1, 1).float().to(device)
pr = model([t])[0]
```

Autrement dit :

- **découpage en coupes axiales** selon le 3ᵉ axe du tableau nibabel, dans
  l'ordre de stockage du fichier — pas selon une orientation anatomique
  recalculée. Aucune réorientation RAS/LPS n'est faite, le code ne regarde jamais
  `nii.affine` sauf pour le réécrire ;
- **normalisation min-max par coupe** (`_norm`,
  [clic_runner.py:53](CLIC/runner/clic_runner.py#L53)) : `(x - min) / (max - min)`,
  et une coupe constante devient zéro. Pas de fenêtrage Hounsfield, pas de
  clipping de percentiles, pas de statistiques volumiques : **chaque coupe a son
  propre contraste**, une coupe qui ne contient que de l'air est étirée sur toute
  la dynamique ;
- **réplication en 3 canaux** pour respecter l'entrée RGB du backbone ImageNet ;
- **aucun crop, aucune ROI, aucun resampling explicite**, aucune mise à l'échelle
  de voxel.

Le seul redimensionnement vient de torchvision lui-même : le
`GeneralizedRCNNTransform` embarqué dans le modèle standardise par les moyennes
ImageNet (`[0.485,0.456,0.406]` / `[0.229,0.224,0.225]`) et redimensionne pour
que le petit côté vaille **800 px**, plafonné à **1333 px** sur le grand côté.
C'est un défaut de torchvision, pas un choix inscrit dans le dépôt — un CBCT
512×512 est donc agrandi à 800×800 avant le backbone.

## 4. Le modèle

### 4.1 Architecture

`_blank_model(nc)` ([clic_runner.py:44](CLIC/runner/clic_runner.py#L44)), appelé
avec `nc = 4` :

```python
m = maskrcnn_resnet50_fpn(weights=None)
m.roi_heads.box_predictor  = FastRCNNPredictor(in_f, nc)
m.roi_heads.mask_predictor = MaskRCNNPredictor(in_fm, 256, nc)
```

- **backbone** : ResNet-50 + FPN (`_resnet_fpn_extractor`, 5 niveaux) ;
- **RPN** puis **ROI heads** : tête boîte (`FastRCNNPredictor` : `cls_score`
  4 classes, `bbox_pred` 16 sorties) et tête masque (`MaskRCNNPredictor`, couche
  cachée 256, 4 canaux de sortie, masques 28×28 par ROI) ;
- `weights=None` mais `weights_backbone` garde son défaut
  `ResNet50_Weights.IMAGENET1K_V1` : **la construction télécharge les poids
  ImageNet du ResNet-50** (puis `load_state_dict` les écrase). Premier lancement
  hors ligne = échec. Effet de bord utile : comme `is_trained` vaut `True`, la
  normalisation est `FrozenBatchNorm2d` et non `BatchNorm2d`, ce qui doit
  correspondre au modèle d'entraînement pour que les clés du `state_dict`
  coïncident.

**4 classes = fond + 3.** La correspondance label → nom n'existe que dans le
widget, dans `_legend()` ([CLIC.py:361](CLIC/CLIC.py#L361)) :

| Label | Signification | Couleur |
|---|---|---|
| 1 | Buccal | vert `(0,1,0)` |
| 2 | Bicortical | jaune `(1,1,0)` |
| 3 | Palatal | brun `(.6,.4,.2)` |

Le runner ne connaît pas ces noms : il écrit les entiers 1, 2, 3.

### 4.2 Les poids

URL en dur ([CLIC.py:333](CLIC/CLIC.py#L333)) :

```
https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools/releases/download/CLIC_model/final_model.pth
```

Destination `~/Documents/CLIC_Models/final_model.pth`. Le runner ne cherche pas
ce nom : il prend `sorted(model_dir.glob("*.pth"))[0]`
([clic_runner.py:76](CLIC/runner/clic_runner.py#L76)), **le premier `.pth` par
ordre alphabétique**. Deux modèles dans le dossier et c'est le nom de fichier qui
décide. `IndexError` non gérée si le dossier est vide.

Le fichier est un `state_dict` nu (`model.load_state_dict(torch.load(...))`), pas
un checkpoint Lightning : ni hyperparamètres, ni classes, ni version. Le jeu
d'entraînement, le nombre de coupes annotées et les métriques ne sont pas
déterminables depuis le dépôt.

### 4.3 Ce que le réseau produit littéralement

Pour chaque coupe, `model([t])[0]` rend le dictionnaire torchvision standard :

| Clé | Forme | Contenu |
|---|---|---|
| `boxes` | `(N,4)` | boîtes `x1,y1,x2,y2` dans le repère redimensionné, ramenées à la taille d'origine par le transform |
| `labels` | `(N,)` | entier 1..3 |
| `scores` | `(N,)` | score de la classe, décroissant |
| `masks` | `(N,1,H,W)` | **probabilité par pixel**, float dans [0,1] |

avec les seuils par défaut de torchvision en amont : `box_score_thresh=0.05`,
`box_nms_thresh=0.5`, `box_detections_per_img=100`.

### 4.4 Passage des sorties réseau au label map

Deux seuils, tous deux en dur
([clic_runner.py:93](CLIC/runner/clic_runner.py#L93)) :

```python
keep = pr["scores"] >= 0.7                     # confiance d'instance
for mk, lb in zip((pr["masks"][keep] > .5).squeeze(1).cpu().numpy(),
                  pr["labels"][keep].cpu().numpy()):
    seg[..., z][mk] = int(lb)
```

- **0.7** sur le score d'instance ;
- **0.5** sur la probabilité de masque, qui binarise ;
- l'affectation est un **écrasement**, pas un vote : si deux instances se
  recouvrent, celle qui est traitée **en dernier** (donc le score le plus bas,
  puisque torchvision trie par score décroissant) gagne le pixel. Un différend
  buccal/palatin sur un même voxel est arbitré par le plus faible score ;
- rien ne restreint le nombre d'instances par coupe, ni à une canine, ni à deux.

**Aucune cohérence 3D n'est imposée.** Chaque coupe est classée indépendamment ;
il n'y a ni lissage inter-coupes, ni composante connexe, ni vote majoritaire sur
la pile. Deux coupes voisines peuvent porter deux classes différentes pour la
même dent. Un repreneur qui veut « la classe du patient » doit l'agréger
lui-même — le module ne la produit pas.

## 5. Le cœur algorithmique

Il n'y a pas de partie non-apprise, hors seuillage : pas d'ICP, pas de
morphologie, pas d'extraction de composantes, pas de mesure. Le runner entier
est : charger le modèle, boucler sur Z, seuiller, écrire. La totalité de la
décision est dans le Mask R-CNN.

## 6. Post-traitements et sorties

```python
out_dir  = out_root / inp.stem
out_path = out_dir / f"{inp.stem}_{suffix}.nii.gz"
nib.save(nib.Nifti1Image(seg.astype(np.int16), nii.affine, nii.header), out_path)
```

- un **sous-dossier par scan**, nommé d'après le scan ;
- suffixe issu de `suffixLineEdit`, par défaut `"seg"` ;
- `Path.stem` sur `X.nii.gz` vaut **`X.nii`** : le dossier s'appelle `X.nii` et
  le fichier `X.nii_seg.nii.gz`. C'est laid mais sans conséquence fonctionnelle ;
- `affine` et `header` sont **repris du volume d'entrée** : le label map est
  superposable sans recalage. Le `header` d'origine décrit un type de données
  flottant alors que les données sont `int16` ; `Nifti1Image` réajuste le
  `dtype` du header à l'écriture ;
- le type est `int16` avec les valeurs 0/1/2/3.

Côté widget, le chargement du résultat passe par la file `ui_q` : l'action
`"segmentation"` appelle `slicer.util.loadSegmentation(path)` puis `_legend()`,
qui colore les segments **par ordre d'index** (`cols.get(i+1, …)`) et non par
valeur de label. Si une classe est absente du volume, les couleurs glissent.
`_legend()` dessine aussi trois `vtkTextActor` dans les vues Red/Yellow/Green,
marqués par un attribut `_leg` pour être retirés au rafraîchissement suivant.

## 7. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Normalisation min-max par coupe | arithmétique, 2 lignes | `clic_env` |
| Redimensionnement 800/1333 + standardisation ImageNet | déterministe, **interne à torchvision** | `clic_env` |
| Détection, classification, masque | **réseau** : Mask R-CNN ResNet50-FPN, 4 classes | `clic_env`, GPU si dispo |
| Seuils 0.7 / 0.5 et report dans le volume | arithmétique | `clic_env` |
| Couleurs et légende | Slicer | widget |

Tout le contenu clinique — *est-ce une canine incluse, et de quel côté de la
corticale* — sort du seul réseau. Il n'y a aucune vérification a posteriori.

## 8. Environnement

| Élément | Valeur | Source |
|---|---|---|
| Env conda | **`clic_env`** (propre à CLIC) | [CLIC.py:120](CLIC/CLIC.py#L120) |
| Python | **3.9** | [CLIC.py:167](CLIC/CLIC.py#L167) |
| Création | `numpy<2.0.0`, `scipy`, `nibabel`, `requests` | idem |
| Ensuite, par pip | `torch==2.2.0`, `torchvision==0.17.0`, `torchaudio==2.2.0` depuis l'index **cu118** | [CLIC.py:182](CLIC/CLIC.py#L182) |
| Puis | `pip install 'numpy<2.0'` une seconde fois | [CLIC.py:204](CLIC/CLIC.py#L204) |
| GPU | facultatif, repli CPU automatique | [clic_runner.py:73](CLIC/runner/clic_runner.py#L73) |

`_ensure_env()` ([CLIC.py:158](CLIC/CLIC.py#L158)) est rejoué **à chaque clic sur
Predict** : les deux `pip install` repartent, même quand tout est déjà en place
(pip rend la main vite mais interroge le réseau). `self._env_ready` est positionné
et jamais relu.

Le second `pip install` passe `"'numpy<2.0'"` — guillemets simples compris dans
la chaîne. Selon la façon dont SlicerConda assemble la commande (`shell=True`
avec une chaîne côté Unix), l'argument peut arriver correctement déquoté ou non.
La détection d'échec, elle, cherche `"error"` ou `"failed"` dans la sortie
renvoyée : n'importe quel avertissement pip contenant ces mots fait échouer la
préparation.

### La rustine conda

`CLICWidget.__init__` ([CLIC.py:62](CLIC/CLIC.py#L62)–[112](CLIC/CLIC.py#L112))
remplace à chaud `getCondaExecutable` et `getCondaPath` de SlicerConda :

1. corrige un `/bin/bin/` dupliqué dans le chemin ;
2. sinon, `shutil.which("conda")` ;
3. sinon, **`/home/luciacev/anaconda3/bin/conda` en dur**.

Et `fixed_getCondaPath` retourne **`/home/luciacev/anaconda3` dès que ce dossier
existe**, avant même de considérer le chemin configuré par l'utilisateur. Un
chemin d'une machine de développement précise est donc versionné dans le dépôt et
prioritaire sur la configuration SlicerConda. À traiter comme une dette, pas
comme un comportement voulu.

## 9. Pièges et points fragiles

- **La barre de progression et le chargement automatique du résultat sont
  cassés.** Le runner émet ses marqueurs via `logger.info`, avec le formateur
  `'%(name)s - %(levelname)s - (%(filename)s:%(lineno)d) - %(message)s'`
  ([clic_runner.py:39](CLIC/runner/clic_runner.py#L39)). Les lignes reçues
  ressemblent à `CLIC_runner - INFO - (clic_runner.py:60) - [SEG] /chemin`, donc
  les tests `ln.startswith("[PROGRESS]")` et `ln.startswith("[SEG]")`
  ([CLIC.py:268](CLIC/CLIC.py#L268)) ne sont **jamais vrais**. Conséquences : la
  barre reste à zéro et la segmentation produite **n'est jamais chargée dans
  Slicer** — elle est pourtant bien écrite sur disque. Le passage de `print` à
  `logging` a cassé le protocole que décrit encore l'en-tête du runner
  ([clic_runner.py:12-16](CLIC/runner/clic_runner.py#L12)). Correctif minimal :
  parser avec `"[SEG]" in ln` et couper à partir du marqueur.
- **Rien n'est incrémental de toute façon.** `condaRunFilePython` fait un
  `subprocess.run(...).stdout` et rend `f"Result: {result.stdout}"` : toute la
  sortie arrive **en un bloc, à la fin du scan**. Même marqueurs réparés, la
  progression sauterait de 0 à 100 % par scan.
- **Le bouton Cancel ne fait rien** : `_on_cancel` ([CLIC.py:288](CLIC/CLIC.py#L288))
  se contente d'écrire une ligne de log. Il ne touche ni `cancel_evt`, ni le
  sous-processus.
- **Sans dossier de sortie choisi, le runner plante.** Le widget écrit toujours
  la clé `"output_dir"` dans le JSON, à `None` si l'opérateur n'a rien choisi ;
  `P.get("output_dir", inp.parent)` rend alors `None` — la valeur par défaut ne
  s'applique pas, la clé existe — et `Path(None)` lève un `TypeError`. La case
  *Save Predictions in Input Folder* du `.ui` n'est **connectée à rien**.
- **`self.output_dir` n'est pas converti en `str` pour le JSON** : c'est déjà une
  chaîne côté `_browse`, mais `model_folder` aussi — cohérent, sauf que
  `input_path` est un `Path` converti explicitement. À surveiller en cas de refonte.
- **La boucle d'attente bloque Slicer** : `_on_predict` tourne dans un
  `while not cancel_evt.wait(0.05)` avec `processEvents()`, le thread worker
  attend le sous-processus. L'UI répond, mais le bouton *Predict* est le seul
  point de sortie.
- **Normalisation par coupe** : la classe prédite sur une coupe dépend du
  contraste local recalculé, pas des unités Hounsfield. Deux acquisitions de
  champs de vue différents ne présentent pas la même image au réseau.
- Le `.ui` déclare **deux `QTextEdit` nommés `logTextEdit`**
  ([CLIC.ui:343](CLIC/Resources/UI/CLIC.ui#L343) et
  [353](CLIC/Resources/UI/CLIC.ui#L353)) : `childWidgetVariables` n'en retient
  qu'un, l'autre reste vide à l'écran.
- **Code mort** : `_clean_env()` ([CLIC.py:39](CLIC/CLIC.py#L39)),
  `initializeParameterNode` (`pass`), `_updateAllLabelsColor`,
  `_updateDynamicWidgetsColor`, `_updateMRMLNodeComboBoxColor`, les imports
  `glob`, `subprocess`, `urllib.request`, `Optional`,
  [testing/test_CanineSegmentation.py](CLIC/testing/test_CanineSegmentation.py)
  (fichier vide), et l'import `torch` inutilisé de
  [MedX_Dashboard.py](MedX_CLI/MedX_Dashboard/MedX_Dashboard.py) — mentionné ici
  parce que le même copier-coller traîne dans plusieurs modules.
- `CLIC/__pycache__/CLIC.cpython-312.pyc` est versionné dans le dépôt.

## 10. Littérature

**Aucun papier ne porte sur CLIC.** Le travail correspondant est annoncé sous le
titre *Interpretable Deep Learning for the Detection and Classification of
Impacted Canines and severity of root resorption* (Tulissi, Cevidanes, Prieto),
présenté à la **NA-MIC Project Week 43 (Montréal, 2025)** — un projet en cours,
pas une publication. Le code d'origine vient du dépôt personnel
`ashmoy/maskRcnn`, d'où proviennent aussi les scans de test cités par le README
(`MN138.nii`, `UM06.nii`).

À ne pas confondre avec les travaux voisins, qui n'ont pas produit ce code :

- la localisation buccal/palatin de canines incluses est traditionnellement faite
  **sur panoramique**, avec un CNN de classification d'images (et non un Mask
  R-CNN sur CBCT) ;
- plusieurs équipes publient de la **segmentation 3D** de canines incluses sur
  CBCT (U-Net/nnU-Net volumétrique), sans classification de la position
  corticale.

La spécificité de CLIC — une classe *bicorticale* en plus du couple
buccal/palatin, prédite coupe par coupe en 2D sur du CBCT — n'est décrite dans
aucun de ces papiers. Ne pas présenter leurs chiffres comme ceux de ce module.

- [NA-MIC Project Week 43 (2025)](https://projectweek.na-mic.org/PW43_2025_Montreal/)
- [Mask R-CNN (He et al., 2017)](https://arxiv.org/abs/1703.06870)
- [torchvision — maskrcnn_resnet50_fpn](https://pytorch.org/vision/stable/models/generated/torchvision.models.detection.maskrcnn_resnet50_fpn.html)
- [Buccal or palatal? AI-based localization of impacted maxillary canines using panoramic radiographs (BMC Med Imaging, 2025)](https://link.springer.com/article/10.1186/s12880-025-02143-9)
- [Deep learning-based 3D automatic segmentation of impacted canines in CBCT scans (BMC Oral Health, 2025)](https://link.springer.com/article/10.1186/s12903-025-07117-5)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)

Bibliographie détaillée, fichiers récupérés et liens à visiter :
[SOURCES.md](SOURCES.md).
