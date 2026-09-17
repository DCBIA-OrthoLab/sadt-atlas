# MedX — pipeline complet

Extraction d'indicateurs cliniques TMD à partir de notes rédigées en langage
naturel, par un LLM local, puis agrégation de la cohorte en une planche de
figures. Aucune image médicale n'entre dans ce module : les entrées sont des
`.pdf`, `.docx` et `.txt`.

Le README est laconique (« summarize clinical notes and generate a comprehensive
comorbidity dashboard ») ; tout ce qui suit vient du code.

## 1. Situation dans la chaîne

MedX est **autonome dans les deux sens** : rien dans le dépôt ne l'appelle, et il
n'appelle aucun autre module du dépôt. Grep sur `MedX` hors de `MedX/` et
`MedX_CLI/` ne rend que la table des matières du [README.md](README.md) et le
[CMakeLists.txt](CMakeLists.txt) racine.

Deux voies indépendantes, deux onglets, deux CLI :

| Voie | Bouton | Exécutable appelé | Où |
|---|---|---|---|
| Summarization | `SummarizeButton` | `python -m MedX_Summarize` | `conda run -n summaries` |
| Dashboard | `DashboardButton` | `slicer.modules.medx_dashboard` | Python de Slicer, via `slicer.cli.run` |

La voie Dashboard consomme la sortie de la voie Summarization (dossier de `.txt`),
mais rien ne les enchaîne : l'opérateur relance à la main.

**Aucun appel réseau vers un LLM.** Pas d'endpoint, pas de clé d'API, pas
d'`ollama`, pas d'`openai` — vérifié par grep sur tout `MedX/` et `MedX_CLI/`.
Le seul trafic sortant est le téléchargement des poids depuis une release GitHub.

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [MedX/MedX.py](MedX/MedX.py) | widget, 1552 lignes dont ~200 de feuille de style sombre ; gestion conda, barre de progression, téléchargement | Python de Slicer |
| [MedX_Method/summarize.py](MedX/MedX_Method/summarize.py), [dashboard.py](MedX/MedX_Method/dashboard.py) | validation des chemins, construction du dict de paramètres | idem |
| [MedX_Method/Method.py](MedX/MedX_Method/Method.py), [Progress.py](MedX/MedX_Method/Progress.py) | classes de base abstraites (recopiées d'ASO/AREG) | idem |
| [MedX_Summarize.py](MedX_CLI/MedX_Summarize/MedX_Summarize.py) | boucle d'inférence BART | env conda `summaries` |
| [MedX_CLI_utils/utils.py](MedX_CLI/MedX_CLI_utils/utils.py) | lecture pdf/docx, découpage en chunks, chargement du modèle | idem |
| [MedX_Dashboard.py](MedX_CLI/MedX_Dashboard/MedX_Dashboard.py) | point d'entrée du dashboard | Python de Slicer |
| [display_figure.py](MedX_CLI/MedX_CLI_utils/display_figure.py) | parsing des résumés → DataFrame → figure matplotlib (689 lignes) | idem |
| [dashboard_utils.py](MedX_CLI/MedX_CLI_utils/dashboard_utils.py) | les 56 champs attendus, et un agrégateur par panneau | idem |

Asymétrie importante : **la summarization ne passe pas par `slicer.cli.run`**.
`onSummarizeButton` ([MedX.py:845](MedX/MedX.py#L845)) construit le `list_Processes_Parameters`
comme les autres modules, mais ignore l'entrée `"Process"` et appelle
`run_conda_tool()` ([MedX.py:1079](MedX/MedX.py#L1079)), qui fabrique
`conda run -n summaries python -m MedX_Summarize <args positionnels>`.
Le CLI Slicer `MedX_Summarize` déclaré dans
[MedX_Summarize.xml](MedX_CLI/MedX_Summarize/MedX_Summarize.xml) ne sert donc
qu'à faire installer le fichier au bon endroit et à lui donner un
`slicer.modules.medx_summarize` — jamais exécuté comme CLI Slicer.

Le dashboard, lui, passe bien par `slicer.cli.run`
([MedX.py:938](MedX/MedX.py#L938)) : il tourne dans le Python de Slicer et exige
donc `pandas`, `matplotlib` et `numpy<2.0.0` **dans Slicer**, installés par
`install_function()` ([MedX.py:89](MedX/MedX.py#L89)) après confirmation.

Pas de GPU requis : le CLI de summarization prend `cuda` s'il est là
([MedX_Summarize.py:32](MedX_CLI/MedX_Summarize/MedX_Summarize.py#L32)), sinon CPU.

## 3. Entrées et prétraitements

### 3.1 Regroupement par patient

`process_notes()` ([MedX_Summarize.py:67](MedX_CLI/MedX_Summarize/MedX_Summarize.py#L67))
parcourt le dossier à plat (`os.listdir`, pas de récursion), ne garde que
`.pdf`, `.docx`, `.txt`, et regroupe par **`file_name.split("_")[0]`**. Tout ce
qui précède le premier underscore est l'identifiant patient ; plusieurs notes du
même patient sont **concaténées** en un seul texte avant inférence.

Le comptage de la barre de progression, lui, utilise `Method.search()` qui est
**récursif** (`glob.iglob(..., recursive=True)`,
[Method.py:115](MedX/MedX_Method/Method.py#L115)). Sur une arborescence à
sous-dossiers, le dénominateur compte plus de fichiers que le CLI n'en traite.

### 3.2 Extraction du texte

| Format | Fonction | Bibliothèque |
|---|---|---|
| `.pdf` | `extract_text_from_pdf` | PyMuPDF (`fitz`), concaténation de `page.get_text()` |
| `.docx` | `extract_text_from_word` | `python-docx`, un `\n` par paragraphe |
| `.txt` | lecture directe | — |

`clean_text()` ne remplace que deux caractères : `’` → `'` et `–` → `-`.

### 3.3 Découpage en chunks — la partie la plus travaillée

`split_text_by_paragraphs()` ([utils.py:83](MedX_CLI/MedX_CLI_utils/utils.py#L83))
puis `create_chunks_from_paragraphs()` ([utils.py:128](MedX_CLI/MedX_CLI_utils/utils.py#L128)).

Quatre en-têtes de section sont reconnus en dur :

```python
section_headers = ["CLINICAL EXAMINATION", "CLINICAL EVALUATION",
                   "RADIOGRAPHIC EXAMINATION", "RADIOGRAPHIC EVALUATION"]
```

Règles, dans l'ordre :

1. découpage sur double saut de ligne, début de liste numérotée (`\n(?=\d+\.\s)`),
   puce (`-`, `*`), ou en-tête de section ;
2. un paragraphe de moins de 150 caractères est **recollé au précédent** (les
   items de liste restent avec leur intitulé) ;
3. une section entière (en-tête + paragraphes suivants jusqu'au prochain en-tête)
   est traitée comme un bloc **indivisible tant qu'elle tient** dans le chunk :
   c'est l'invariant du découpage, une section clinique ne doit pas être coupée
   en deux prompts ;
4. si elle ne tient pas, repli paragraphe par paragraphe, puis phrase par phrase
   (`re.split(r'(?<=[.!?])\s+')`).

**Taille de chunk : 3500 caractères**, passée par `generate_combined_summary`
([MedX_Summarize.py:29](MedX_CLI/MedX_Summarize/MedX_Summarize.py#L29)) — la
valeur par défaut de `create_chunks_from_paragraphs` (1800) n'est jamais utilisée.
3500 caractères ≈ 900 tokens BPE, sous la limite de 1024 du modèle, mais la
tokenisation est de toute façon tronquée à `max_length=1024`.

## 4. Le modèle

### 4.1 Ce qui est réellement chargé

`load_model_and_tokenizer()` ([utils.py:22](MedX_CLI/MedX_CLI_utils/utils.py#L22)) :

```python
tokenizer = BartTokenizer.from_pretrained(model_path)
model = BartForConditionalGeneration.from_pretrained(model_path)
```

Rien d'autre. Pas de `peft`, pas de quantification, malgré `peft` et
`bitsandbytes` dans la liste des paquets installés dans l'environnement
([MedX.py:849](MedX/MedX.py#L849)) — ces deux-là, plus `evaluate` et
`scikit-learn`, sont des reliquats de l'entraînement.

### 4.2 Les poids

URL : `https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools/releases/download/MedX/BART.zip`
([summarize.py:43](MedX/MedX_Method/summarize.py#L43)), 1.51 Go.

L'archive contient un dossier Hugging Face standard : `config.json`,
`generation_config.json`, `model.safetensors` (1.63 Go décompressé, fp32),
`merges.txt`, `vocab.json`, `special_tokens_map.json`, `tokenizer_config.json`.

Le `config.json` (lu dans l'archive) donne l'architecture exacte :

| Champ | Valeur |
|---|---|
| `_name_or_path` | **`facebook/bart-large-cnn`** |
| `architectures` | `BartForConditionalGeneration` |
| encodeur / décodeur | 12 + 12 couches, `d_model=1024`, 16 têtes, FFN 4096 |
| `max_position_embeddings` | **1024** |
| `vocab_size` | 50264 |
| `torch_dtype` | float32 |
| `transformers_version` | 4.49.0 |

C'est donc un **fine-tune de BART-large-CNN** (~406 M paramètres), pas un modèle
entraîné de zéro. Le `task_specific_params.summarization` hérité de l'original
(`max_length=142, min_length=56`) est intégralement écrasé au moment de la
génération.

Le fichier de configuration porte encore `_num_labels: 3` et des `LABEL_0..2` :
vestige du checkpoint amont, sans effet sur `BartForConditionalGeneration`.

### 4.3 Le prompt et la génération

Un appel de génération **par chunk**
([MedX_Summarize.py:50](MedX_CLI/MedX_Summarize/MedX_Summarize.py#L50)) :

```python
prompt = f"Using the following note, extract structured key-value pairs about the patient's symptoms and diagnoses:\n\n{chunk}"
inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
summary_ids = model.generate(inputs["input_ids"], generation_config=generation_config)
```

| Paramètre | Valeur |
|---|---|
| `max_length` | 1024 (= `model_max_tokens`) |
| `min_length` | 50 |
| `num_beams` | 4 |
| `no_repeat_ngram_size` | 3 |
| `repetition_penalty` | 2.0 |
| `length_penalty` | 1.0 |
| `do_sample` | **True** |
| `temperature` | 0.6 |
| `top_p` | 0.95 |

Beam search **et** échantillonnage simultanés (`num_beams=4` + `do_sample=True`)
→ `transformers` bascule en *beam sample* : la sortie n'est pas déterministe,
deux exécutions sur la même note ne donnent pas le même résumé. Aucune graine
n'est fixée.

BART n'est pas un modèle instruction-tuned : la phrase d'instruction est
simplement préfixée au texte source. Elle n'a d'effet que si le fine-tune a été
fait avec ce même préfixe — invérifiable depuis le dépôt.

Ce que le réseau produit littéralement : **du texte libre**, une séquence
décodée par `tokenizer.decode(..., skip_special_tokens=True)`. Le format
`clé: valeur` n'est jamais contraint ni vérifié à ce stade ; c'est une propriété
apprise, pas une garantie. Les résumés des chunks sont concaténés par une ligne
de 100 tirets.

Il n'existe **aucune passe de validation** du couple clé/valeur côté CLI :
`extract_key_value_pairs()` et `save_dict_to_csv()`
([utils.py:227](MedX_CLI/MedX_CLI_utils/utils.py#L227)) sont du **code mort**,
jamais importés (le `__init__.py` ne les réexporte pas).

## 5. Le cœur algorithmique — le dashboard

Aucun apprentissage ici, que du parsing et du matplotlib.

### 5.1 Résumé texte → DataFrame

`read_summaries()` ([display_figure.py:33](MedX_CLI/MedX_CLI_utils/display_figure.py#L33))
ne lit que les fichiers finissant par `_summary.txt`, clé = `split("_")[0]`.

`initialize_key_value_summary()` ([dashboard_utils.py:343](MedX_CLI/MedX_CLI_utils/dashboard_utils.py#L343))
crée un dict de **56 clés**, toutes typées `str`, toutes initialisées à `""` :
`patient_age`, `headache_intensity`, `disc_displacement`, `muscle_pain_score`,
`sleep_disorder_type`, `cpap_used`, `pain_onset_date`… C'est **le schéma cible**
du module, et le seul endroit du dépôt où il est écrit.

`update_dictionary()` ([display_figure.py:69](MedX_CLI/MedX_CLI_utils/display_figure.py#L69))
parcourt le résumé ligne à ligne, `line.split(":")` — une ligne qui ne donne pas
exactement deux morceaux est ignorée (donc toute valeur contenant un `:` est
perdue). Les `;` de la valeur deviennent des `,`. Une clé hors des 56 est
ignorée.

La fusion des valeurs successives (le même champ revient dans plusieurs chunks)
est la partie subtile :

- valeur existante vide → remplacement ;
- valeur déjà présente → rien ;
- une valeur existante qui est une **sous-chaîne** de la nouvelle est remplacée
  par la nouvelle (on garde la formulation la plus détaillée) ;
- sinon la nouvelle valeur est ajoutée, séparateur `" | "`, sauf si elle est
  déjà contenue dans un morceau existant.

La branche booléenne (`if current_value in {"True", "False"}`) est **morte** :
les valeurs sont initialisées à `""` et le modèle écrit `true`/`false` en
minuscules, comme le montre le CSV d'exemple
[dashboard_full_dataframe.csv](MedX_CLI/dashboard_full_dataframe.csv).

`process_summaries()` convertit ensuite 6 champs en numérique via
`extract_numbers()` : `patient_age`, `headache_intensity`,
`average_daily_pain_intensity`, `diet_score`, `tmj_pain_rating`,
`disability_rating`. La règle : s'il y a un `/`, on prend le nombre avant le
premier `/` (« 7/10 » → 7) ; sinon **la moyenne de tous les nombres trouvés**
(« 8-9 » → 8.5, d'où les `9.5` et `41.0` du CSV d'exemple).

### 5.2 Les agrégateurs

Un par panneau, tous dans [dashboard_utils.py](MedX_CLI/MedX_CLI_utils/dashboard_utils.py),
tous en regex sur du texte libre :

| Fonction | Ce qu'elle calcule |
|---|---|
| `set_age_data` | `pd.cut` sur `[0,19,40,100]` → `12-19 / 20-40 / 40+` |
| `set_sleep_data` | binaire : `unknown` vs tout le reste (donc `""` compte comme « avec trouble ») |
| `set_tenderness_data` | `true` si au moins un des 3 champs tenderness/stiffness/soreness n'est ni `false`, ni `unknown`, ni vide |
| `set_left_stick_data` | moyenne ± écart-type des 5 scores cliniques numériques |
| `set_middle_stick_data` | `(\d+)\s*mm` sur `maximum_opening` et `maximum_opening_without_pain` |
| `set_right_stick_data` | localisation des céphalées par synonymes (`frontal/forehead/temple`, `temporal/side of head`, …) |
| `set_joint_pain_data` | TMJ / Neck / Shoulder / Back, TMJ testé en premier avec les variantes left/right |
| `set_upper_donuts_data` | 6 booléens (`earache`, `tinnitus`, `vertigo`, `hearing_loss`, jaw, santé mentale) |
| `set_muscle_pain_data` | 5 niveaux, l'ordre des tests compte : « mild to moderate » et « moderate to severe » sont testés **avant** « mild » et « moderate » |
| `extract_months_from_pain_onset` | « 1 year and 9 months ago » → 21 mois |
| `set_disc_displacement_data` | `left.*without reduction` / `left.*with reduction` / `left` / rien, idem à droite |

Deux fragilités de fond dans ces agrégateurs :

- `set_upper_donuts_data` compare `df[metric] == "true"` (minuscule) mais
  `set_disc_displacement_data` et `set_muscle_pain_data` appliquent `.lower()`
  d'abord. Un modèle qui écrirait `True` ferait tomber les donuts à 0 %
  silencieusement.
- Les pourcentages sont **toujours divisés par `len(df)`**, jamais par le nombre
  de valeurs renseignées : un champ absent compte comme un négatif.

`set_migraine_data` contient un `return` inatteignable après le premier
([dashboard_utils.py:81](MedX_CLI/MedX_CLI_utils/dashboard_utils.py#L81)) : ancienne
version à 5 catégories, laissée en place.

`set_disc_displacement_data` est appelée
([display_figure.py:208](MedX_CLI/MedX_CLI_utils/display_figure.py#L208)) mais
**ses deux résultats ne sont jamais tracés** : calcul mort.

### 5.3 La figure

`generate_dashboard_figure()` : `figsize=(22,14)`, gridspec 2×2
(`width_ratios=[3,1.5]`, `height_ratios=[1,1.5]`), subdivisé en panneaux :
camemberts âge / troubles du sommeil / tenderness en haut à gauche, six donuts
à droite, barres des scores cliniques ± SD et ouverture maximale en bas, puis
distribution de la douleur musculaire, aires de douleur articulaire, et âge
croisé avec l'ancienneté de la douleur.

Curiosité à connaître avant d'y toucher
([display_figure.py:179](MedX_CLI/MedX_CLI_utils/display_figure.py#L179)) : la
fonction reçoit `output_folder` en argument, puis le **relit par introspection**
de sa propre frame (`inspect.getargvalues`) pour le réassigner à lui-même.
C'est un no-op ; le paramètre suffisait.

## 6. Post-traitements et sorties

| Voie | Fichier | Contenu |
|---|---|---|
| Summarize | `<output>/<patient_id>_summary.txt` | texte libre, chunks séparés par 100 tirets |
| Summarize | `<log_path>` | un entier : le nombre de patients traités |
| Dashboard | `<output>/dashboard.png` | la planche 22×14 pouces |
| Dashboard | `<output>/patient_data.csv` | le DataFrame 56 colonnes |
| Dashboard | `<output>/dashboard_full_dataframe.csv` | **le même DataFrame**, écrit une seconde fois depuis `generate_dashboard_figure` |

Le `log_path` est `<tempDirectory>/process.log`
([MedX.py:384](MedX/MedX.py#L384)) ; le widget en surveille la `mtime` et lit la
première ligne (`onCondaProcessUpdate`, [MedX.py:1125](MedX/MedX.py#L1125)).

Si la case *Load in 3D Slicer* est cochée, `showDashboardImageInSliceView()`
([MedX.py:952](MedX/MedX.py#L952)) charge le PNG comme volume et bascule le
layout en `SlicerLayoutOneUpRedSliceView`.

## 7. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Extraction pdf/docx/txt | déterministe (PyMuPDF, python-docx) | env `summaries` |
| Découpage en chunks | déterministe, regex + heuristique de sections | env `summaries` |
| Extraction des 56 indicateurs | **réseau** : BART-large-CNN fine-tuné, génération libre | env `summaries`, GPU si dispo |
| Parsing `clé: valeur` + fusion | déterministe | Python de Slicer |
| Agrégats de cohorte | déterministe, regex + pandas | Python de Slicer |
| Figure | matplotlib | Python de Slicer |

Un seul réseau dans tout le module, et il est **génératif** : c'est lui qui
décide du format de sortie. Toute la chaîne aval suppose qu'il produit des
lignes `clé: valeur` dont les clés appartiennent aux 56 attendues.

## 8. Environnement

| Élément | Valeur | Source |
|---|---|---|
| Env conda | **`summaries`** (propre à MedX, pas `shapeaxi`) | [MedX.py:1364](MedX/MedX.py#L1364) |
| Python | 3.12 | [MedX.py:1388](MedX/MedX.py#L1388) |
| Paquets de l'env | `transformers`, `torch`, `pymupdf`, `python-docx`, `evaluate`, `scikit-learn`, `peft`, `bitsandbytes`, `matplotlib` | [MedX.py:849](MedX/MedX.py#L849) |
| Dans Slicer (dashboard) | `numpy<2.0.0`, `pandas`, `matplotlib` | [MedX.py:903](MedX/MedX.py#L903) |
| Windows | conda via WSL (`CondaSetUpCallWsl`), vérif `libxrender1`, `libgl1`/`libgl1-mesa-glx`, `libglx-mesa0` | `check_lib_wsl` |

`check_cli_script()` ([MedX.py:1457](MedX/MedX.py#L1457)) teste
`import MedX_Summarize` dans l'env et, en cas d'échec, y pousse le `PYTHONPATH`
de Slicer (`conda env config vars set`). Malgré son nom,
`give_pythonpath_windows` tourne aussi sous Linux.

`condaRunCommand()` ([MedX.py:1462](MedX/MedX.py#L1462)) est une copie de
SlicerConda modifiée pour garder le `Popen` sous la main
(`preexec_fn=os.setsid`) et pouvoir tuer le groupe de processus depuis
`cancel_process()`.

## 9. Pièges et points fragiles

- **Le bouton *Download* ne télécharge rien.** `setup()` crée
  `<Documents>/SlicerDownloads/MedX` ([MedX.py:394](MedX/MedX.py#L394)), puis
  `downloadModel` appelle `DownloadUnzip(directory=SlicerDownloadPath,
  folder_name=SlicerDownloadPath)`. `os.path.join` d'un chemin absolu rend ce
  chemin absolu, donc `out_path` = le dossier déjà créé, et le
  `if not os.path.exists(out_path)` ([MedX.py:770](MedX/MedX.py#L770)) saute tout
  le bloc. Résultat : un avertissement « Folder must have model for » et un
  `lineEdit` vide. Il faut récupérer le `BART.zip` à la main.
- **Le résultat de la vérification d'environnement est ignoré.**
  `check_env = self.onCheckRequirements(list_libs)` puis plus aucune lecture de
  `check_env` ([MedX.py:860](MedX/MedX.py#L860)) : la summarization part même si
  conda n'est pas configuré.
- **La barre de progression du dashboard ne bouge jamais.**
  [MedX_Dashboard.py](MedX_CLI/MedX_Dashboard/MedX_Dashboard.py) reçoit
  `log_path` et ne l'écrit pas. `DisplayMedX.isProgress` attend une modification
  de ce fichier.
- **`OnEndProcess` divise par `self.nb_scans`** ([MedX.py:1289](MedX/MedX.py#L1289)) :
  `ZeroDivisionError` sur un dossier d'entrée vide.
- **Génération non déterministe** (`do_sample=True` + beams, pas de seed) : deux
  runs donnent deux résumés, donc deux dashboards.
- **Tout repose sur `split("_")[0]`.** Un fichier `BLANC_Jean_2021.pdf` et un
  fichier `BLANC_2022.docx` sont le même patient ; `2021-05-12_B082.pdf` a pour
  identifiant `2021-05-12`.
- **Les valeurs contenant un `:` sont perdues** au parsing (`len(key_value) != 2`).
- **Chemins en dur d'une machine de développement** en tête de
  [dashboard_utils.py](MedX_CLI/MedX_CLI_utils/dashboard_utils.py#L18) et de
  [display_figure.py](MedX_CLI/MedX_CLI_utils/display_figure.py#L1) : ils
  mentionnent un dossier `Qwen1.5B_full_V3/predictions_500`. Les résumés qui ont
  servi à mettre au point le dashboard — et le
  [dashboard_full_dataframe.csv](MedX_CLI/dashboard_full_dataframe.csv) de 500
  lignes versionné dans le dépôt — ont donc été produits par un **Qwen 1.5B**,
  pas par le BART distribué. Les deux formats de sortie sont supposés
  interchangeables ; rien ne le garantit.
- **Code mort** : `extract_key_value_pairs`, `save_dict_to_csv`,
  `MedX_Summarize.xml` en tant que CLI Slicer, `set_disc_displacement_data`
  (calculée, jamais tracée), `registerSampleData` (pointe sur les volumes
  d'exemple du template Slicer), `MedXLogic.process()` (`pass`),
  `updateParameterNodeFromGUI` (référence `self.ui.inputSelector`, absent du
  `.ui`), `saveOutput`, `UpdateTime`, `UpdateProgressBar` (qui affiche
  « Matrix applied with success », copié d'un autre module).
- `peft` et `bitsandbytes` sont installés dans l'environnement et jamais importés :
  ~2 Go de dépendances inutiles.

## 10. Littérature

Le papier correspondant est **AI-Driven Multimodal TMJ Patient Modeling: From
Unstructured Notes to Precision Treatment** (2025, Springer LNCS). Il décrit le
fine-tuning de **BART** et de **DeepSeek-R1** sur **1 813 segments annotés issus
de 500 dossiers TMD**, pour extraire **56 indicateurs cliniques** — le nombre
exact de clés de `initialize_key_value_summary()` — et l'alimentation d'un
dashboard patient et cohorte. Le papier conclut que BART bat DeepSeek sur la
précision d'extraction des champs malgré un ROUGE légèrement inférieur ; c'est
cohérent avec le fait que le module distribue un BART.

Écarts entre le papier et le code du dépôt :

- le papier situe la summarization dans un cadre multimodal (MRI et CBCT
  recalés) ; **rien de cela n'est dans MedX**, qui ne lit que du texte ;
- les commentaires de développement pointent un **Qwen 1.5B**, troisième modèle
  non mentionné dans le résumé du papier ;
- les métriques du papier ne sont reproductibles par aucun script du dépôt
  (`evaluate` et `scikit-learn` sont installés mais inutilisés).

- [AI-Driven Multimodal TMJ Patient Modeling (Springer)](https://link.springer.com/chapter/10.1007/978-3-032-05479-1_5)
- [facebook/bart-large-cnn (modèle amont)](https://huggingface.co/facebook/bart-large-cnn)
- [BART: Denoising Sequence-to-Sequence Pre-training (Lewis et al., 2019)](https://arxiv.org/abs/1910.13461)
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)

Bibliographie complète, fichiers récupérés et liens éditeur : [SOURCES.md](SOURCES.md).
