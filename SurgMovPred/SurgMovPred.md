# SurgMovPred — pipeline complet

Prédiction des mouvements chirurgicaux d'une chirurgie orthognathique à partir d'un
**tableur de mesures céphalométriques**. Aucun réseau de neurones, aucune image, aucun
maillage : 112 régresseurs scikit-learn empilés, un par valeur à prédire, appliqués
ligne par ligne à un fichier Excel/CSV.

## 1. Situation dans la chaîne

Outil isolé. Rien dans le dépôt ne l'appelle, et il n'appelle rien du dépôt : il ne lit
ni volume, ni maillage, ni landmarks. Son entrée est un dossier de tableurs, sa sortie
un autre tableur.

| Appelé | Comment |
|---|---|
| [SurgMovPred_CLI](SurgMovPred_CLI/SurgMovPred_CLI.py) | `slicer.cli.run(slicer.modules.surgmovpred_cli, …)` ([SurgMovPred.py:842](SurgMovPred/SurgMovPred.py#L842)) |

Le module n'est pas branché sur la scène MRML : aucun `vtkMRMLNode` n'est créé, lu ou
transformé. C'est une interface de lancement au-dessus d'un script pandas.

Traces de copier-coller depuis le module CNE (résumé de notes cliniques), à ne pas
prendre pour la réalité du pipeline : `helpText` dit *« This tool helps to create
summaries of clinical notes »*, le `parameterNodeWrapper` est documenté avec
`notesFolder_input` / `modelType` / `notesType`, et `process()` nomme encore ses
arguments `notesFolder_input` / `notesFolder_output`
([SurgMovPred.py:236](SurgMovPred/SurgMovPred.py#L236), [SurgMovPred.py:815](SurgMovPred/SurgMovPred.py#L815)).

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [SurgMovPred/SurgMovPred.py](SurgMovPred/SurgMovPred.py) | widget : 3 sélecteurs de dossier, téléchargement des modèles et des fichiers de test, installation des dépendances, ~400 lignes de QSS | Python de Slicer |
| [SurgMovPred_CLI/SurgMovPred_CLI.py](SurgMovPred_CLI/SurgMovPred_CLI.py) | tout le traitement : lecture, nettoyage des noms de colonnes, `predict`, écriture | Python de Slicer (CLI scripté) |
| [Resources/UI/SurgMovPred.ui](SurgMovPred/Resources/UI/SurgMovPred.ui) | 3 champs (`inputFolderLineEdit`, `modelFolderLineEdit`, `outputFolderLineEdit`) + 4 boutons | — |

Trois paramètres positionnels seulement (`inputFolder`, `modelPath`, `outputFolder`,
[SurgMovPred_CLI.xml](SurgMovPred_CLI/SurgMovPred_CLI.xml)) : rien n'est réglable,
ni seuil, ni sélection de cibles, ni option de classe squelettique.

## 3. Entrée et prétraitements

**Format accepté.** `load_data_from_directory()`
([SurgMovPred_CLI.py:141](SurgMovPred_CLI/SurgMovPred_CLI.py#L141)) ramasse tous les
`*.csv`, `*.xlsx`, `*.ods` du dossier (extension en minuscules **et** en majuscules),
les lit (`read_csv`, `read_excel`, `read_excel(engine='odf')`) et les **concatène**
(`pd.concat(..., ignore_index=True)`). Pas de récursion dans les sous-dossiers. Pour un
classeur Excel, seule la **première feuille** est lue — le fichier de test officiel en
contient sept (`all_data`, `demographics`, `Invivo_ceph`, `surgical_mov`, `dolp_ceph_T0`,
`dolp_ceph_T1`, `dolp_ceph_total`), et c'est `all_data` qui est en première position.

**Normalisation des noms de colonnes**, `clean_name()`
([SurgMovPred_CLI.py:39](SurgMovPred_CLI/SurgMovPred_CLI.py#L39)), appliquée à l'entrée
pour retomber sur l'orthographe utilisée à l'entraînement :

1. suppression de `"`, `\`, `[`, `]` ;
2. tout caractère hors `[0-9a-zA-Z_']` devient `_` — **l'apostrophe est délibérément
   conservée** (commentaire du code : pour `Jarabak's` et `SM_A'_CP`) ;
3. écrasement des `_` répétés, suppression aux extrémités ;
4. `"total"` → `"Total"` ;
5. préfixe `f_` si le nom commence par un chiffre.

Ce nettoyage explique les noms réels des features : `SM-A-FH  ` (avec deux espaces en
fin, dans le fichier de test) devient `SM_A_FH`, `Jarabak's ratio  ` devient
`Jarabak's_ratio`, `FMA(MP-FH) Ang_2D` devient `FMA_MP_FH_Ang_2D`.

**Identifiant patient.** `find_id_column()`
([SurgMovPred_CLI.py:81](SurgMovPred_CLI/SurgMovPred_CLI.py#L81)) teste 8 motifs
insensibles à la casse (`#`, `id`, `patient id`, `patient number`, `subject`, …) puis,
en dernier recours, toute colonne contenant à la fois « patient » et « id ». Dans le
fichier de test, la colonne est `#`. En cas d'échec, la colonne `IDPatient` de sortie
est remplie de `pd.NA` avec un simple avertissement.

**Normalisation des valeurs.** Chaque paquet de modèle embarque **son propre**
`StandardScaler` (centrage + réduction, `with_mean=True`, `with_std=True`), appliqué
juste avant la prédiction ([SurgMovPred_CLI.py:237](SurgMovPred_CLI/SurgMovPred_CLI.py#L237)).
Aucune imputation : une valeur manquante se propage en `NaN` jusqu'à la sortie.

**Tolérance sur le suffixe `_T0`** ([SurgMovPred_CLI.py:223](SurgMovPred_CLI/SurgMovPred_CLI.py#L223)) :
si le modèle attend `X_T0` et que la colonne s'appelle `X`, elle est acceptée. C'est le
seul assouplissement ; toute autre feature manquante fait **sauter le modèle entier**
avec un avertissement, et la colonne correspondante est absente du résultat.

## 4. Les modèles

Les poids ne sont **pas dans le dépôt**. `onDownloadDefaultModel()`
([SurgMovPred.py:782](SurgMovPred/SurgMovPred.py#L782)) télécharge et dézippe :

```
https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools/releases/download/SurgMovPred/all_models.zip
  -> Documents/SlicerDownloads/SurgMovPred/Models/all_models/
```

**706 Mo**, 112 dossiers, un `stacking_package.pkl` de ~13 Mo chacun.
`load_all_model_packages()` fait un `Path.glob("**/stacking_package.pkl")` récursif et
indexe par `package['target_name']` : pointer le sélecteur sur `all_models/` charge les
112 modèles, pointer sur un sous-dossier n'en charge qu'un. L'aide du CLI mentionne des
dossiers `saved_models/class_1`, `saved_models/class_None` — **cette hiérarchie par
classe squelettique n'existe pas dans l'archive publiée**, qui est plate.

### 4.1 Contenu d'un paquet

Chaque `.pkl` est un dict `joblib` à quatre clés, utilisées telles quelles par
[SurgMovPred_CLI.py:212](SurgMovPred_CLI/SurgMovPred_CLI.py#L212) :

| Clé | Contenu |
|---|---|
| `target_name` | nom de la cible, p. ex. `Mx_ALL_APoint_P-/A+_Pred` (forme brute, avec `-`, `/`, `+`) |
| `features_names` | liste ordonnée de **145** noms de features |
| `scaler` | `sklearn.preprocessing.StandardScaler` ajusté |
| `model` | `sklearn.ensemble.StackingRegressor` ajusté |

Ces informations ont été relevées directement dans
`all_models/Mn_MB_Genioplasty_Total_Pred/stacking_package.pkl` et
`all_models/Mx_ALL_APoint_P-_A_Pred/stacking_package.pkl` (inspection du flux pickle,
sans exécution). Les 145 features sont identiques dans les deux paquets ; rien ne
garantit formellement que ce soit le cas des 110 autres, mais leurs tailles quasi
identiques (13.17–13.19 Mo) le suggèrent fortement.

### 4.2 L'architecture

Pas de réseau. Un **empilement (stacking) à trois régresseurs de base et un
méta-régresseur linéaire**, sérialisé avec `_sklearn_version = 1.6.1` :

| Rôle | Estimateur | Paramètres lisibles dans le pickle |
|---|---|---|
| base `multitask_elasticnet` | `ElasticNetCV` | grille de `l1_ratio`, `n_alphas`, `eps`, `selection='cyclic'` |
| base `lgbm` | `lightgbm.sklearn.LGBMRegressor` | `boosting_type='gbdt'`, `objective='regression'`, `num_leaves=31` |
| base `gaussian_process` | `GaussianProcessRegressor` | noyau `Product(ConstantKernel, RBF)`, `optimizer='fmin_l_bfgs_b'`, `normalize_y` |
| méta | `LinearRegression` | `stack_method='predict'`, `passthrough=False` |

`passthrough=False` signifie que le méta-modèle ne voit **que** les trois prédictions
des modèles de base, pas les 145 features d'origine. `stack_method='predict'` : une
valeur scalaire par modèle de base, donc une régression linéaire à trois entrées.

Le poids dominant du fichier (13 Mo pour 145 features) vient du `GaussianProcessRegressor`,
qui conserve sa matrice d'entraînement, et du booster LightGBM.

L'entraînement n'est pas dans le dépôt : pas de script, pas de jeu de données, pas de
métriques, pas de graine. **Non déterminable depuis le dépôt** : taille de la cohorte,
protocole de validation, performance par cible.

### 4.3 Les 145 features

Quatre familles, reconstituées depuis `features_names` et recoupées avec la feuille
`all_data` du fichier de test :

| Famille | Nombre | Exemples |
|---|---|---|
| Positions de points par rapport aux trois plans de référence — **FH** (horizontale de Francfort), **MSP** (plan sagittal médian), **CP** (plan coronal) | ~76 | `SM_A_FH`, `SM_GoL_MSP`, `SM_PNS_CP`, `SM_CoR_FH` |
| Points de tissus mous, marqués par l'apostrophe | ~20 | `SM_N'_FH`, `SM_Sn'_MSP`, `SM_ULip'_FH`, `SM_Pg'_MSP` |
| Mesures céphalométriques 2D classiques | ~12 | `SNA`, `SM_ANB_signed`, `SM_Witts`, `LAFH`, `Jarabak's_ratio`, `UAFH_LAFH`, `FMA_MP_FH_Ang_2D`, `IMPA_L1_MP_Ang_2D`, `U1_to_SN_Ang_2D`, `SM_Mx_Width`, `SM_Mn_Width`, `OP_to_FH_Ang_2D` |
| Mesures occlusales/dentaires, en deux jeux suffixés `_T0` et `_Total` | 2 × ~18 | `MxMn_Overjet_R_T0` / `MxMn_Overjet_R_Total`, `MxMn_Molar_Relationship_L_T0`, `Mn_Gonions_to_Midline_Distances_R_Total` |

Ce que les deux jeux `_T0` / `_Total` signifient exactement n'est documenté nulle part
dans le dépôt. Le nommage (`T0` = avant, `Total` = variation totale) et le fait qu'ils
soient tous deux en **entrée** suggèrent que le modèle reçoit l'état pré-chirurgical
*et* le résultat occlusal visé, pour en déduire les déplacements osseux à réaliser —
c'est une **déduction**, pas une affirmation du code.

Les colonnes `Gender`, `Surg`, `Genio`, `3piece`, `assymetry`, `Skl_Cl_2` du fichier de
test ne figurent pas dans les 145 features des deux paquets inspectés : elles sont lues
puis ignorées.

### 4.4 Ce qui est prédit

112 cibles = **28 structures × 4 composantes**.

Composantes, d'après les noms de cibles : `P-/A+` (postérieur négatif / antérieur
positif), `R-/L+` (droite négatif / gauche positif), `Down+` (vertical, bas positif),
et `Total`. Les trois premières sont donc les composantes signées d'un vecteur de
déplacement dans le repère céphalométrique (CP, MSP, FH), la quatrième très
probablement sa norme — **déduit du nommage, l'unité (mm) n'est écrite nulle part**.

Les 28 structures :

| Segment | Points |
|---|---|
| Maxillaire, `Mx_ALL_*` (10) | APoint, ANS, PNS, U3CanineTip L/R, U6MesialCuspTip L/R, UpperIncisorTip L/R, UpperIncisorTipMidpoint |
| Mandibule, `Mn_ALL_*` (17) | BPoint, Gnathion, Menton, Pogonion, Gonion L/R, ChinSideCut L/R, MandibleBackCut L/R, L3CanineTip L/R, L6MesialCuspTip L/R, LowerIncisorTip L/R, LowerIncisorTipMidpoint |
| Génioplastie, `Mn_MB_Genioplasty` (1) | — |

`ALL` désigne le segment osseux entier (maxillaire ou mandibule mobilisés en bloc),
`MB` le segment de génioplastie. On prédit donc le déplacement **de points repères
solidaires de chaque segment**, pas une transformation rigide : rien n'impose aux 10
points du maxillaire d'être cohérents entre eux (voir §7).

## 5. Le cœur du traitement

`predict_all_targets()` ([SurgMovPred_CLI.py:194](SurgMovPred_CLI/SurgMovPred_CLI.py#L194)),
en entier :

```python
for target_name, pack in packages.items():
    X_target = df_cleaned[[feature_source[f] for f in pack['features_names']]]
    X_target.columns = pack['features_names']
    X_scaled = pack['scaler'].transform(X_target)
    predictions_by_target[target_name] = pack['model'].predict(
        pd.DataFrame(X_scaled, columns=..., index=df_cleaned.index))
```

Aucune post-correction, aucun bornage, aucune cohérence inter-cibles, aucun intervalle
de confiance — le `GaussianProcessRegressor` sait produire un écart-type, il n'est pas
demandé. Chaque cible est traitée indépendamment, et un `try/except` par cible : une
cible qui plante n'interrompt pas les autres, sa colonne disparaît simplement.

Les 112 modèles sont chargés en mémoire d'un coup (`load_all_model_packages`), soit
**~1.5 Go de RAM** avant même de lire les données.

## 6. Sorties

`save_results()` écrit deux fichiers, même contenu, dans le dossier de sortie :

| Fichier | Contenu |
|---|---|
| `predictions_outputs.xlsx` | une ligne par patient d'entrée, colonne `IDPatient` puis une colonne par cible prédite |
| `predictions_outputs.csv` | idem |

`index=True` dans les deux cas : l'index pandas (0, 1, 2…) devient une colonne sans nom.
Les noms de colonnes sont les `target_name` bruts des paquets, donc avec `/` et `+`
(`Mx_ALL_APoint_P-/A+_Pred`).

**Il n'y a aucune réapplication du résultat.** Rien ne construit de matrice, ne déplace
un maillage, ne crée un nœud Slicer, n'ouvre une vue : la prédiction s'arrête au
tableur. La question « comment la prédiction est-elle réappliquée pour produire un
résultat visualisable » n'a pas de réponse dans ce dépôt — c'est à l'opérateur de
reporter les valeurs dans son logiciel de planification.

## 7. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Nettoyage des noms de colonnes, détection de l'ID | déterministe (regex) | CLI |
| Standardisation | `StandardScaler` appris | CLI |
| Prédiction des 112 déplacements | **appris** : stacking ElasticNetCV + LightGBM + GP, méta `LinearRegression` | CLI, CPU |
| Consolidation en une transformation de segment | **inexistant** | — |

Le dernier point mérite d'être souligné pour un repreneur : les 10 points du maxillaire
sont prédits par 40 modèles indépendants. Rien ne garantit que les déplacements prédits
soient compatibles avec un mouvement de corps rigide du bloc maxillaire ; un
post-traitement (ajustement d'un rigide aux moindres carrés sur les points prédits)
serait le complément naturel, et il n'existe pas.

## 8. Environnement

Tout tourne dans le Python de Slicer. `check_dependencies()`
([SurgMovPred.py:156](SurgMovPred/SurgMovPred.py#L156)) est appelé à **chaque** clic sur
Apply :

| Élément | Valeur |
|---|---|
| Paquets | `pandas`, `joblib`, `openpyxl`, `scikit-learn`, `lightgbm` |
| Absent de la liste | `odfpy` — pourtant nécessaire à `read_excel(engine='odf')` pour les `.ods` annoncés |
| numpy | `slicer.util.pip_install("numpy==2.4.0")` **inconditionnel**, à chaque Apply |
| macOS | `ensure_mac_openmp()` télécharge `libomp.dylib` depuis `mac.r-project.org` et le dépose dans le dossier `cli-modules` de Slicer, puis le charge en `RTLD_GLOBAL` — LightGBM en a besoin |
| Compilation | `CC=gcc` / `CXX=g++` forcés pendant les `pip_install`, restaurés ensuite |

L'installation se fait sans conda, sans GPU, sans torch.

Le CLI neutralise `InconsistentVersionWarning` de scikit-learn
([SurgMovPred_CLI.py:19](SurgMovPred_CLI/SurgMovPred_CLI.py#L19)) : les paquets ont été
sérialisés avec scikit-learn 1.6.1 et sont dépicklés avec la version installée, quelle
qu'elle soit. Le commentaire assume le risque (« models are tested for compatibility
before being shipped »).

## 9. Pièges et points fragiles

- **`pip_install("numpy==2.4.0")` à chaque exécution.** Remplacer numpy sous une session
  Slicer vivante est exactement ce qui casse l'import de scipy ailleurs dans l'extension
  (le scipy de Slicer est compilé pour son numpy). C'est de loin le point le plus
  dangereux du module, et il est déclenché par le bouton principal.
- **Bouton « test files » inopérant** : `DownloadTestFiles()`
  ([SurgMovPred.py:763](SurgMovPred/SurgMovPred.py#L763)) télécharge bien `TestFiles.zip`,
  mais ne renseigne les champs d'entrée/sortie que
  `if os.path.exists(.../V_FACE/DefaultList)` — un reste de copier-coller du module
  VFACE. Sans les données de test de VFACE, l'archive est téléchargée puis ignorée.
- **`.ods` annoncé, `odfpy` non installé** par `check_dependencies` (il l'est en
  revanche par le module Anonymizer, ce qui peut masquer le problème sur un poste où
  les deux ont servi).
- **Une feature manquante = un modèle silencieusement sauté.** Le log dit
  « Model 'X' skipped: missing N input feature(s) », mais le fichier de sortie, lui, a
  juste une colonne en moins. Un tableur mal nommé peut produire un
  `predictions_outputs.xlsx` avec zéro colonne de prédiction et aucun échec.
- **Concaténation aveugle des fichiers d'entrée** : deux tableurs de colonnes
  différentes donnent des `NaN`, et `model.predict` sur des `NaN` lève — l'erreur est
  attrapée par cible, donc le résultat est partiel sans que rien ne soit très visible.
- **Une seule feuille Excel lue.** Un classeur dont la première feuille n'est pas celle
  des données produit un résultat vide.
- **1.5 Go de modèles chargés systématiquement**, même pour une seule ligne à prédire,
  même si l'opérateur ne s'intéresse qu'à une cible.
- **Aucune incertitude en sortie** alors qu'un des trois modèles de base est un
  processus gaussien.
- **Pas de cohérence rigide entre les points d'un même segment** (§7).
- Le `helpText`, le docstring du parameter node et les noms d'arguments de `process()`
  décrivent un tout autre outil (résumé de notes cliniques).

## 10. Littérature

**Aucun papier ne porte sur SurgMovPred.** Ni le dépôt, ni la release, ni le README ne
citent de référence, et une recherche sur le nom du module ne renvoie rien. Le module
n'apparaît même pas dans le README de l'extension.

Le contexte publié, à ne pas confondre avec la description de ce code :

- [Machine-learning-based approach for predicting postoperative skeletal changes for
  orthognathic surgical planning (PubMed 35132764)](https://pubmed.ncbi.nlm.nih.gov/35132764/) —
  le problème posé est le même (prédire les déplacements squelettiques post-opératoires
  à partir de mesures pré-opératoires), mais rien n'indique que ce soit le travail
  derrière ces poids.
- [Oliveira, Cevidanes, Bianchi et al., *Artificial intelligence as a prediction tool
  for orthognathic surgery assessment*, Orthodontics & Craniofacial Research, 2024](https://onlinelibrary.wiley.com/doi/10.1111/ocr.12805) —
  même équipe (UNC/Pacific), mais cible différente : prédire le *besoin* de chirurgie
  à partir de téléradiographies de profil, pas les mouvements.
- [Prediction of orthognathic surgery plan from 3D cephalometric analysis via deep
  learning (PMC10024836)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10024836/) — même
  objectif, approche par apprentissage profond ; SurgMovPred, lui, est un modèle
  tabulaire classique.

Les outils sous-jacents, eux, sont documentés :
[`StackingRegressor`](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.StackingRegressor.html)
et [LightGBM](https://lightgbm.readthedocs.io/).

Bibliographie détaillée, fichiers récupérés et liens à visiter :
[SOURCES.md](SOURCES.md) — dont la page NA-MIC Project Week 45 (Boston, 2026)
consacrée à ce module, seule source primaire retrouvée.
