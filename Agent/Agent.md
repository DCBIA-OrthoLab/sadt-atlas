# Agent — pipeline complet

Assistant en langage naturel qui choisit un module de l'extension, en extrait les
paramètres, construit la ligne de commande et la lance. Tout tourne en local :
un LLM 8B servi par Ollama, plus un petit cross-encoder pour présélectionner les
outils candidats. Aucun réseau de neurones médical n'est appelé ici — l'Agent ne
fait que du routage et du remplissage de formulaire.

## 1. Situation dans la chaîne

**Personne n'appelle Agent.** Un `grep` sur `slicer.modules.agent` ne trouve
aucun appelant hors du module lui-même. C'est un point d'entrée terminal.

Dans le sens sortant, deux niveaux :

| Appelé | Comment | Où |
|---|---|---|
| Agent_CLI | `slicer.cli.run(slicer.modules.agent_cli, ...)` ([Agent.py:798](Agent/Agent.py#L798)) | processus CLI séparé, Python de Slicer |
| le module cible (ALI_CBCT.py, AMASSS_CLI.py, …) | `subprocess.run(cli_args)` ([Agent.py:962](Agent/Agent.py#L962)) | processus fils du widget, Python de Slicer |
| Ollama | client python `ollama`, HTTP sur `127.0.0.1:11434` | serveur local, lancé/installé par le module |

L'inventaire des cibles est purement déclaratif : il vit dans
[manifest.yaml](Agent_CLI/manifest.yaml), un YAML de 23 entrées `scripts`.
L'Agent ne découvre rien tout seul, il ne connaît que ce fichier.

`AgentLogic.process()` ([Agent.py:1315](Agent/Agent.py#L1315)) est du **code
mort** : il relance le CLI avec seulement `folders` et `prompt` (il manque
`modeagent` et `temp_folder`, tous deux obligatoires côté XML) et lit
`GetOutputText()` immédiatement après un `wait=False`. Jamais appelé.
[Agent_CLI/Resources/UI/Agent_CLI.ui](Agent_CLI/Resources/UI/Agent_CLI.ui) est
également inerte : un module CLI ne charge pas de `.ui`.

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [Agent/Agent.py](Agent/Agent.py) | widget : chat, drop zone, installation d'Ollama, confirmation, exécution réelle, boucle de réparation | Python de Slicer |
| [Agent_CLI/Agent_CLI.py](Agent_CLI/Agent_CLI.py) | routage + extraction ; **imprime du JSON sur stdout**, n'exécute rien | processus CLI, Python de Slicer |
| [Agent_CLI_utils/utils.py](Agent_CLI/Agent_CLI_utils/utils.py) | manifeste, cross-encoder, appel Ollama, résolution de chemin, fabrication de la commande | idem |
| [parameter_extraction_improved.py](Agent_CLI/Agent_CLI_utils/parameter_extraction_improved.py) | construction du prompt d'extraction, rien d'autre | idem |
| [parameter_validator.py](Agent_CLI/Agent_CLI_utils/parameter_validator.py) | coercition de types, vérifs required / enum / range / extension | idem |
| [manifest.yaml](Agent_CLI/manifest.yaml) | les 23 outils adressables, leurs paramètres, leur ordre positionnel | donnée |

Pas de conda, pas de CUDA obligatoire. L'ensemble du module tourne dans le Python
de Slicer ; le seul GPU sollicité l'est indirectement, par le serveur Ollama.

## 3. Les modèles

### 3.1 Le LLM — qwen3:8b via Ollama

Une seule constante, dupliquée aux deux bouts :
`DEFAULT_MODEL = "qwen3:8b"` ([utils.py:21](Agent_CLI/Agent_CLI_utils/utils.py#L21))
et `MODEL_NAME = "qwen3:8b"` ([Agent.py:18](Agent/Agent.py#L18)).
`get_router_model()` honore une variable d'environnement `ROUTER_MODEL` qui
permet de substituer n'importe quel modèle Ollama sans toucher au code.

Le **même modèle sert aux trois appels** : routage, extraction de paramètres,
réparation. Aucun modèle spécialisé, aucun fine-tuning.

| Point | Valeur | Source |
|---|---|---|
| Moteur d'inférence | **Ollama** (donc llama.cpp en dessous), API HTTP locale | `import ollama`, port 11434 |
| Format des poids | **GGUF** — imposé par Ollama, pas de checkpoint transformers | déduit du moteur |
| Téléchargement | `ollama pull qwen3:8b` depuis le registre ollama.com | [Agent.py:1266](Agent/Agent.py#L1266), et repli automatique dans `chat_with_auto_pull` |
| Taille / quantification | tag par défaut : **5.2 Go, Q4_K_M, 8.19 G paramètres** | non déterminable depuis le dépôt : lu sur [ollama.com/library/qwen3](https://ollama.com/library/qwen3) |
| CPU ou GPU | **décidé par Ollama, pas par le code** | voir ci-dessous |

Le module ne passe jamais de directive de device. C'est le binaire Ollama qui
décide, et le code en tire une conséquence explicite : sur Linux, un Ollama
installé par **snap** est sandboxé, ne voit pas le GPU NVIDIA et retombe sur CPU
— **80–90 s par réponse** pour un 8B, chiffre mesuré et inscrit dans le code
([Agent.py:1231](Agent/Agent.py#L1231)). Le module détecte `/snap/` dans le
`realpath` du binaire et avertit, sans pouvoir corriger (le serveur snap tient
déjà le port 11434, et le retirer demande sudo).

Quand aucun Ollama n'est trouvé, `install_official_ollama()`
([Agent.py:101](Agent/Agent.py#L101)) télécharge l'archive portable officielle
dans `~/.slicer_agent/ollama` (surchargeable par `SLICER_AGENT_HOME`) :
`ollama-linux-{amd64,arm64}.tgz`, `ollama-windows-{amd64,arm64}.zip`, ou
`Ollama-darwin.zip` extrait avec `ditto` puis dé-quarantainé avec `xattr`. Ces
archives embarquent les bibliothèques CUDA/Metal, d'où le choix délibéré de ne
pas utiliser `curl | sudo sh` (pas de mot de passe root depuis la GUI) ni le
paquet snap. `LD_LIBRARY_PATH` est pointé sur `<install>/lib/ollama` pour que le
binaire trouve ses propres libs ([Agent.py:56](Agent/Agent.py#L56)).

Deux réglages d'appel seulement, dans `chat_with_auto_pull`
([utils.py:96](Agent_CLI/Agent_CLI_utils/utils.py#L96)) :

- `keep_alive="30m"` au lieu des 5 min par défaut, pour ne pas recharger 5 Go en
  VRAM entre deux messages ;
- `format="json"` pour le routeur, l'extraction et la réparation (contrainte de
  grammaire côté Ollama) — **pas** pour le mode consultant.

Aucun `temperature`, `seed`, `num_ctx` ni `think` n'est passé. qwen3 étant un
modèle à raisonnement hybride, le mode consultant peut donc laisser passer du
texte de réflexion selon la version d'Ollama ; le seul post-traitement est
`output.replace("*","").replace("#","")`
([Agent_CLI.py:215](Agent_CLI/Agent_CLI.py#L215)), qui supprime le markdown
en supprimant les caractères.

Si le modèle n'est pas présent, `chat_with_auto_pull` intercepte le message
`not found`, lance `ollama.pull(model, stream=True)` en imprimant la progression,
puis rejoue le chat. Toute autre erreur est relancée telle quelle.

### 3.2 Le cross-encoder — ms-marco-MiniLM-L-6-v2

C'est le seul vrai réseau chargé dans le processus.
`CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")`
([utils.py:53](Agent_CLI/Agent_CLI_utils/utils.py#L53)), via
`sentence-transformers` — donc poids **transformers/safetensors** téléchargés
depuis le Hub Hugging Face et mis en cache dans `~/.cache/huggingface`.

MiniLM 6 couches, 22,7 M paramètres, distillé de `MiniLM-L12-H384-uncased`,
entraîné sur MS MARCO Passage Ranking. Ce n'est **pas** un modèle d'embeddings :
il n'y a pas de vecteurs ni de similarité cosinus. La requête et le document
sont concaténés et passés ensemble dans le transformer, qui sort **un scalaire
de pertinence** non borné (typiquement −10 à +10). Le device est celui que
`sentence-transformers` choisit tout seul selon le wheel torch installé.

Le cache `_cross_encoder_model` ne sert à rien en pratique : Agent_CLI.py est un
**processus neuf à chaque requête**, donc le modèle est rechargé à chaque
message. Le commentaire du code l'admet.

En cas d'échec de chargement, le repli est silencieux et brutal : `scripts[:k]`,
c'est-à-dire **les trois premiers outils du manifeste** (ali_cbct, ali_ios,
amasss_cli) quelle que soit la question ([utils.py:90](Agent_CLI/Agent_CLI_utils/utils.py#L90)).

## 4. Le routage

Deux étages, et le LLM n'intervient qu'au second.

**Étage 1 — présélection par cross-encoder.**
`cross_encoder_retrieve_candidates(manifest, prompt, k=3)` construit un document
par outil :

```python
docs.append(f"{s['name']}: {s['description']} (tags: {tags})")
scores = model.predict([(user_text, doc) for doc in docs])
ranked = sorted(zip(scores, scripts), reverse=True)
return [s for _, s in ranked[:k]]
```

23 paires scorées, tri décroissant, **top-3 en dur** (`k=3` n'est jamais
paramétré). Le champ `priority` du manifeste (valeurs 1 à 23) n'est **jamais
lu** — la ligne qui le lirait est commentée
([utils.py:216](Agent_CLI/Agent_CLI_utils/utils.py#L216)). Le bon outil qui
sortirait 4ᵉ est définitivement perdu ; le LLM ne le verra jamais.

**Étage 2 — choix par le LLM.** Le prompt système
([Agent_CLI.py:105](Agent_CLI/Agent_CLI.py#L105)) :

```
You are a tool router. Output ONLY one JSON object.
Schema:
{"tool": string|null, "confidence": number, "reason": string}

Rules:
- Choose tool ONLY from the candidate list provided by the user message.
- If none match, set tool = null and confidence <= 0.4.
- Do not invent tool names.
- Keep reason short (max 1 sentence).
```

Le message utilisateur est `USER_REQUEST: <prompt>` suivi de
`CANDIDATES (choose exactly one name from this list):` et du bloc construit par
`build_candidates_block` : une ligne par candidat,
`i) nom — description (tronquée à 140 caractères) | tags: t1, t2, … (8 max)`.

Trois choses à retenir :

- **Le contexte des dossiers n'est pas donné au routeur.** `folders_context`
  n'est ajouté qu'au prompt d'extraction.
- **L'historique de conversation est injecté entre le système et l'utilisateur**
  (`*history`), et il contient les bulles de chat brutes du widget
  (« After reflection, I would like to run … »). Le routeur JSON reçoit donc de
  la prose d'interface comme tours « assistant ».
- **`confidence` et `reason` ne servent à rien.** `confidence` est parsée,
  arrondie, sérialisée dans le JSON de sortie sous `tool_confidence`… et jamais
  relue par le widget. Aucun seuil nulle part. La consigne « confidence ≤ 0.4 »
  n'est pas une contrainte, juste une suggestion au modèle.

Le seul filet est textuel : `if selected_tool and selected_tool != "null" and
selected_tool != "None"`. Un nom d'outil halluciné qui ne serait pas dans le
manifeste passe ce test, puis fait échouer `build_cli_args` avec un `KeyError`,
attrapé par le `try` global de `main()` et renvoyé comme `{"error": …}`.

`tools = build_tool_spec(manifest)` ([Agent_CLI.py:72](Agent_CLI/Agent_CLI.py#L72))
est calculé puis **jamais utilisé** : code mort, avec toute la gestion de
l'« ancienne structure » (`patterns`, `defaults`) qu'aucune entrée du manifeste
actuel n'utilise.

## 5. L'extraction des paramètres

Un second appel LLM, un outil déjà choisi, dans `extract_parameters`
([utils.py:220](Agent_CLI/Agent_CLI_utils/utils.py#L220)).

**Masquage des paramètres techniques.** Les paramètres nommés `temp_fold`,
`tmp_folder`, `temp_folder`, `log_path` ou `logPath` sont retirés de la spec
avant de construire le prompt — inutile de demander au modèle d'inventer un
dossier temporaire. Ils sont réinjectés après coup avec la valeur
`input.temp_folder`, c'est-à-dire le `slicer.util.tempDirectory()` créé par le
widget à chaque clic ([Agent_CLI.py:153](Agent_CLI/Agent_CLI.py#L153)), et
retirés de `missing_required`.

**Le prompt d'extraction** ([parameter_extraction_improved.py:40](Agent_CLI/Agent_CLI_utils/parameter_extraction_improved.py#L40))
liste chaque paramètre sous la forme
`- nom (type) [REQUIRED|optional] (encode: …): description`, puis impose sept
règles : format des listes selon `encode` (`comma_no_brackets`,
`space_separated`, `comma_separated`, `python_literal`), booléens et nombres en
JSON nu, « si le nom contient *folder* ou *dir*, donner un dossier sans nom de
fichier », et surtout :

```
7. ONLY extract parameters mentioned in the user request
   - Do NOT invent values
   - Leave unmentioned optional parameters absent
```

Sortie imposée :
`{"extracted": {...}, "confidence": 0.0-1.0, "missing_required": [...], "notes": "..."}`.
Le `missing_required` produit par le modèle est ignoré — c'est le validateur qui
fait foi.

**La résolution des chemins est entièrement déléguée au LLM.** Le widget passe la
liste des éléments déposés dans la drop zone, jointe par des virgules
([Agent.py:790](Agent/Agent.py#L790)) ; le CLI la redécoupe sur `,` et
l'enrobe :

```
FOLDERS_CONTEXT:
<un chemin par ligne>

Rules:
- Treat FOLDERS_CONTEXT as the source of truth for paths.
- If a required path parameter is missing, try to infer it from FOLDERS_CONTEXT.
- If multiple candidates exist, pick the most specific match and explain briefly in 'reason'.
```

Ce bloc est **concaténé au prompt utilisateur**, pas passé séparément. Il n'y a
ni appariement heuristique, ni inspection du contenu des dossiers, ni
vérification d'existence : c'est au modèle de deviner lequel des chemins déposés
est le T1, lequel est le T2, lequel est le dossier de modèles. Un chemin
contenant une virgule est coupé en deux par le `split(",")`.

**La validation** ([parameter_validator.py](Agent_CLI/Agent_CLI_utils/parameter_validator.py))
enchaîne six passes : required manquants, coercition de type
(`bool`/`int`/`float`/`list`/`path`/`string`), syntaxe de chemin, `choices`,
`min`/`max`, paramètres hors spec. Deux détails utiles :

- `encode: lower_str_bool` force la chaîne `"true"`/`"false"` en minuscules,
  parce que plusieurs CLI comparent l'argument brut sans `.lower()` — `str(True)`
  donnerait `"True"` et ne matcherait jamais.
- `_check_paths` ne vérifie **que** deux choses : que `Path(str(value))` ne lève
  pas (il ne lève quasiment jamais) et qu'un paramètre dont le nom contient
  `folder`/`dir` ne finit pas par une extension connue. **L'existence du chemin
  n'est jamais testée.**

Le résultat de la validation est presque entièrement jeté : `errors` et
`warnings` ne remontent nulle part. Leur seul effet est
`final_confidence = confidence * 0.6` si invalide — et cette confiance n'est
lue par personne. Seuls `params` et `missing_required` survivent.

## 6. Construction et exécution de la commande

**Oui, le module est réellement lancé.** Sans ambiguïté.

Le CLI ne fait que **construire** la commande. `build_cli_args`
([utils.py:350](Agent_CLI/Agent_CLI_utils/utils.py#L350)) fusionne les valeurs
par défaut du manifeste avec les paramètres extraits, puis :

```python
return [sys.executable, tool_path] + cli
```

`sys.executable` est l'interpréteur du processus Agent_CLI, donc le Python de
Slicer. Pour `cli_style: positional` (21 outils sur 23), les valeurs sont
concaténées dans l'ordre de déclaration du manifeste — `positional_order` est
supporté mais **aucune entrée ne le renseigne**. Pour tout autre `cli_style`, on
tombe dans la branche `--flag valeur`, en itérant sur `merged` : les paramètres
hallucinés hors spec y sont donc bel et bien émis.

La liste est renvoyée au widget dans le champ `command` du JSON. C'est
`AgentWidget` qui exécute, et seulement si `missing_required == []` :

1. bulle de chat « After reflection, I would like to run X » ;
2. **`QMessageBox.question`** listant `clé=valeur` pour chaque paramètre
   ([Agent.py:864](Agent/Agent.py#L864)) ;
3. sur Yes → `runToolWithRepair` → `subprocess.run(cli_args, capture_output=True)`.

Si `missing_required` n'est pas vide, l'agent ne lance rien : il affiche la liste
des manquants et les valeurs déjà connues, et attend un message de suivi (que
l'historique de conversation permettra de raccrocher).

`subprocess.run` est **synchrone et sur le thread GUI** : Slicer est gelé
pendant toute la durée du job — ce qui, pour une segmentation AMASSS ou un
recalage AREG, se compte en dizaines de minutes.

## 7. La boucle de réparation

Sur code de retour non nul, `runToolWithRepair`
([Agent.py:943](Agent/Agent.py#L943)) demande au LLM de corriger les paramètres,
au plus `MAX_REPAIR_ATTEMPTS = 2` fois. `build_repair_prompt`
([utils.py:282](Agent_CLI/Agent_CLI_utils/utils.py#L282)) envoie les définitions
de paramètres, les valeurs utilisées, la commande complète et les **2000 derniers
caractères de stderr**, et demande de ne renvoyer que les paramètres à changer.

Ce chemin-là tourne **dans le processus Slicer**, pas dans le CLI : `_proposeRepair`
ajoute le dossier d'Agent_CLI à `sys.path` et réimporte
`Agent_CLI_utils` pour ne pas dupliquer la logique. La correction repasse par
`ParameterValidator` puis `build_cli_args`, un diff `ancien -> nouveau` est
affiché, et **une nouvelle confirmation Yes/No** est exigée. Si le diff est vide,
la boucle s'arrête.

`_suggestFixFor` ([Agent.py:903](Agent/Agent.py#L903)) complète avec un
diagnostic par mots-clés, non-LLM : modèle Ollama absent, `ModuleNotFoundError`,
`NameError: name 'nn' is not defined` (régression connue de
`transformers>=4.53.0`, huggingface/transformers#43784), `Numpy is not available`
(ABI numpy 2 contre les wheels torch), ou échec de connexion Ollama.

## 8. Les modules adressables — et leur état réel

Les 23 entrées de [manifest.yaml](Agent_CLI/manifest.yaml). La colonne de droite
compare l'ordre positionnel du manifeste à la signature `argparse` réelle du
script cible, vérifiée fichier par fichier.

| Outil (manifest) | Script cible | Params manifeste / réels | Verdict |
|---|---|---|---|
| ali_cbct | [ALI_CBCT.py](ALI_CBCT/ALI_CBCT.py) | 6 / 10 | manquent `spacing`, `speed_per_scale`, `agent_fov`, `spawn_radius` |
| ali_ios | [ALI_IOS.py](ALI_IOS/ALI_IOS.py) | 6 / 10 | décalage dès la position 5 (`teeth_mg` absent) |
| amasss_cli | [AMASSS_CLI.py](AMASSS_CLI/AMASSS_CLI.py) | 5 / 12 | le script refuse : « Expected 13 arguments » |
| areg_cbct | [AREG_CBCT.py](AREG_CBCT/AREG_CBCT.py) | 7 / 10 | `DCMInput` atterrit dans `add_name` |
| areg_ios | [AREG_IOS.py](AREG_IOS/AREG_IOS.py) | 6 / 7 requis | `suffix` absent → `log_path` lu comme suffixe |
| autocrop3d | [AutoCrop3D_CLI.py](AutoCrop3D/Crop_Volumes_CLI/AutoCrop3D_CLI.py) | 5 / 6 | `suffix` absent → décalage |
| automatrix | [Automatrix_CLI.py](Automatrix_CLI/Automatrix_CLI.py) | 7 / 9 | `suffix` et `matrix_name` absents |
| batchdentalseg | [BATCHDENTALSEG.py](BATCHDENTALSEG/BATCHDENTALSEG.py) | `cli_style: ui_module` | **module Slicer scripté, aucun `__main__`** — injouable |
| clic | [CLIC.py](CLIC/CLIC.py) | `cli_style: ui_module` | idem, importe `slicer`, `qt`, `CondaSetUp` |
| docshapeaxi | [DOCShapeAXI_CLI.py](DOCShapeAXI_CLI/DOCShapeAXI_CLI.py) | 8 / 8 | **signature correcte** |
| flexreg | [FlexReg_CLI.py](FlexReg_CLI/FlexReg_CLI.py) | 21 / 23 | `shift_lr`, `shift_ap` absents |
| medx_dashboard | [MedX_Dashboard.py](MedX_CLI/MedX_Dashboard/MedX_Dashboard.py) | 2 / 3 | `log_path` absent |
| medx_summarize | [MedX_Summarize.py](MedX_CLI/MedX_Summarize/MedX_Summarize.py) | 4 / 4 | **signature correcte** |
| mri2cbct_approx | [MRI2CBCT_APPROX.py](MRI2CBCT_CLI/MRI2CBCT_APPROX/MRI2CBCT_APPROX.py) | 3 / 5 | `model_folder`, `tmp_folder` absents |
| mri2cbct_reg | [MRI2CBCT_REG.py](MRI2CBCT_CLI/MRI2CBCT_REG/MRI2CBCT_REG.py) | 4 / 6 | `normalization`, `tempo_fold` absents |
| mri2cbct_lr_crop | [MRI2CBCT_LR_CROP.py](MRI2CBCT_CLI/MRI2CBCT_LR_CROP/MRI2CBCT_LR_CROP.py) | 4 / 4 | **signature correcte** |
| mri2cbct_orient_center | [MRI2CBCT_ORIENT_CENTER_MRI.py](MRI2CBCT_CLI/MRI2CBCT_ORIENT_CENTER_MRI/MRI2CBCT_ORIENT_CENTER_MRI.py) | 4 / 4 | **signature correcte** |
| mri2cbct_resample | [MRI2CBCT_RESAMPLE_CBCT_MRI.py](MRI2CBCT_CLI/MRI2CBCT_RESAMPLE_CBCT_MRI/MRI2CBCT_RESAMPLE_CBCT_MRI.py) | 10 / 10 | **signature correcte** |
| mri2cbct_tmj_crop | [MRI2CBCT_TMJ_CROP.py](MRI2CBCT_CLI/MRI2CBCT_TMJ_CROP/MRI2CBCT_TMJ_CROP.py) | 6 / 6 | **signature correcte** |
| pre_aso_cbct | [PRE_ASO_CBCT.py](ASO_CBCT/PRE_ASO_CBCT/PRE_ASO_CBCT.py) | 5 / 6 | `SmallFOV` absent (position 4) |
| pre_aso_ios | [PRE_ASO_IOS.py](ASO_IOS/PRE_ASO_IOS/PRE_ASO_IOS.py) | 7 / 9 | `add_inname`, `folder_error` absents |
| semi_aso_cbct | [SEMI_ASO_CBCT.py](ASO_CBCT/SEMI_ASO_CBCT/SEMI_ASO_CBCT.py) | 4 / 5 | `add_inname` absent |
| semi_aso_ios | [SEMI_ASO_IOS.py](ASO_IOS/SEMI_ASO_IOS/SEMI_ASO_IOS.py) | 7 / 9 | `add_inname`, `folder_error` absents |

**6 signatures sur 23 sont correctes.** Comme aucun paramètre n'est nommé côté
CLI (tout est positionnel), une signature trop courte ne donne pas une erreur
franche mais un **décalage silencieux** : sur `areg_ios`, le chemin du fichier de
log part comme suffixe de nom de fichier.

Absents du manifeste, donc inaccessibles à l'Agent : VFACE, GreedyReg, CNE,
AREG_IOSCBCT, SurgMovPred, Medical_Data_Anonymizer.

### Le chemin des scripts ne se résout pas

Problème plus fondamental que les signatures. Le manifeste ne donne que des noms
nus (`path: "ALI_CBCT.py"`). `resolve_tool_path`
([utils.py:143](Agent_CLI/Agent_CLI_utils/utils.py#L143)) cherche, dans l'ordre :
`$AGENT_CLI_TOOLS_DIR/<nom>`, `<manifest_dir>/CLI files/<nom>`,
`<manifest_dir>/<nom>`, puis `<ancêtre>/CLI files/<nom>` en remontant 4 niveaux.

**Il n'existe aucun dossier `CLI files` dans SlicerAutomatedDentalTools.** Le
commentaire du code cite le layout `AI_Agent/Agent_CLI/ + .../CLI files/`, celui
du dépôt d'origine dont Agent_CLI a été extrait. Ici, chaque script vit dans le
dossier de son propre module (`ALI_CBCT/ALI_CBCT.py`, …). Aucun candidat ne
matche, la fonction retourne `candidates[0]` « pour que le message d'erreur
pointe un chemin debuggable », soit `<Agent_CLI>/CLI files/ALI_CBCT.py`.

Conséquence : **sans `AGENT_CLI_TOOLS_DIR`, l'Agent ne peut lancer aucun module.**
`subprocess.run` ne lève pas (l'exécutable, `sys.executable`, existe) ; c'est
Python qui sort en code 2 sur un fichier introuvable, ce qui déclenche la boucle
de réparation — laquelle, en corrigeant des *paramètres*, ne peut structurellement
rien y faire, et brûle deux allers-retours LLM.

Et même chemins résolus, une partie des cibles échouerait : `DOCShapeAXI_CLI.py`
importe `shapeaxi`, `MRI2CBCT_TMJ_CROP.py` importe `nnunetv2`. Ces paquets vivent
dans des environnements conda que leurs modules Slicer respectifs invoquent par
`conda run -n …` ou `CondaSetUpCall`. L'Agent, lui, lance tout avec
`sys.executable`, c'est-à-dire le Python de Slicer, **jamais conda**.

## 9. Les deux modes

| Mode (combo `comboBox`) | Sortie d'Agent_CLI | Exécution |
|---|---|---|
| `Agent (Automated)` | JSON `{tool, tool_confidence, parameters_confidence, parameters, missing_required, command}` | oui, après confirmation |
| `Ask (Interactive)` | texte libre | **aucune** |

En mode `Ask`, `build_candidates_block(..., include_parameters=True)` ajoute à
chaque ligne `| parameters:<liste YAML brute de dicts>` — le repr Python de la
structure du manifeste est injecté tel quel dans le prompt système d'un
« expert medical image analysis consultant ». Aucun `format="json"`, la réponse
est affichée après suppression des `*` et des `#`.

Le README appelle ce mode « Consultant », l'UI dit « Ask (Interactive) ». Le code
ne teste que `== "Agent (Automated)"`, donc n'importe quelle autre valeur tombe
en mode consultant.

## 10. Garde-fous

Ce qui existe :

- **Une confirmation modale obligatoire** avant chaque exécution, listant tous
  les paramètres, et **une seconde** avant chaque tentative de réparation.
- **Blocage sur paramètres requis manquants** : rien n'est lancé tant que
  `missing_required` n'est pas vide.
- **Coercition de types** et vérification `choices` / `min` / `max` /
  extension-sur-dossier.
- **Masquage des dossiers temporaires**, remplis depuis
  `slicer.util.tempDirectory()` plutôt que par le modèle.
- **Bornage** : `MAX_REPAIR_ATTEMPTS = 2`, historique tronqué à
  `MAX_HISTORY_ENTRIES = 40` tours.
- **`try` global** dans `main()` : stdout reste toujours du JSON parsable, la
  traceback part sur stderr.

Ce qui n'existe pas :

- **Aucun seuil de confiance.** `tool_confidence` et `parameters_confidence` sont
  calculés et sérialisés, puis ignorés. Un routage à 0.1 est traité comme un
  routage à 0.95.
- **Aucune vérification d'existence des chemins.** Un chemin halluciné passe
  validation, passe la confirmation (l'opérateur doit le repérer à l'œil dans la
  boîte de dialogue), et n'échoue qu'au lancement du module cible.
- **Les erreurs du validateur ne sont jamais affichées.** `errors`, `warnings` et
  `extra_params` sont produits puis jetés.
- **Aucune protection sur les dossiers de sortie.** Si le modèle choisit comme
  `output_folder` un dossier de données d'entrée, rien ne s'y oppose. Plusieurs
  CLI du dépôt écrasent leur fichier d'entrée.
- **Les paramètres hors spec ne sont pas filtrés** en mode `--flag`.
- **`log_path` reçoit un dossier**, pas un fichier : les noms `log_path` et
  `logPath` sont dans la liste des paramètres remplacés par
  `input.temp_folder`. Les CLI qui ouvrent ce chemin en écriture échoueront.
- **Aucune liste blanche d'exécutables.** `subprocess.run` prend la liste telle
  que construite. La protection réelle est que `tool_path` vient du manifeste,
  pas du LLM — le modèle contrôle les *valeurs*, pas le binaire.

## 11. Environnement

`CheckDependencies` ([Agent.py:1141](Agent/Agent.py#L1141)) fait un
`slicer.util.pip_install` dans le Python de Slicer, **dans cet ordre, qui
compte** :

| Paquet | Raison du pin |
|---|---|
| `ollama` | client python seulement — pip ne fournit pas le serveur |
| `pyyaml` | lecture du manifeste |
| `transformers<4.53.0` | régression `NameError: name 'nn' is not defined` dans `integrations/accelerate.py`, casse l'import du cross-encoder |
| `numpy<2` | numpy ≥ 2 casse l'ABI des wheels torch pip (`RuntimeError: Numpy is not available`) |
| `sentence-transformers` | tire torch ; installé en dernier pour ne pas remonter les pins |

Agent_CLI.py tourne dans un processus séparé mais **partage les site-packages de
Slicer**, d'où l'installation côté widget. Aucun environnement conda n'est créé
ni utilisé.

Le serveur Ollama est vérifié par une simple sonde socket sur
`127.0.0.1:11434` (`_ollama_responding`, timeout 0.5 s), relancé si besoin par
`Popen([binary, "serve"])` avec attente jusqu'à ~30 s par pas de 500 ms en
gardant l'UI vivante. `ensure_agent_ollama_running()` est rappelé **avant chaque
message** ([Agent.py:772](Agent/Agent.py#L772)), parce qu'un serveur lancé par le
module ne survit pas au redémarrage de Slicer.

Windows : `CREATE_NO_WINDOW` pour ne pas faire clignoter une console. Pas de WSL,
contrairement au reste du dépôt.

## 12. Pièges et points fragiles

- **`resolve_tool_path` ne trouve rien dans ce dépôt** (§8). C'est le blocage
  numéro un. Correctifs possibles : créer un dossier `CLI files` avec des liens,
  définir `AGENT_CLI_TOOLS_DIR`, ou mettre des chemins relatifs au dépôt dans le
  manifeste et étendre la recherche.
- **17 signatures sur 23 sont fausses**, et le décalage est silencieux.
- **`batchdentalseg` et `clic` ne sont pas des CLI.** Le `cli_style: ui_module`
  n'est traité nulle part : il tombe dans la branche `--flag`, laquelle produit
  une commande qui ne peut pas fonctionner sur un module Slicer scripté.
- **`input.folders.split(",")`** casse tout chemin contenant une virgule, aussi
  bien pour la liste de dossiers que pour le `join(",")` côté widget.
- **Le cross-encoder est rechargé à chaque message** (processus neuf), et son
  échec dégrade vers les trois premiers outils du manifeste sans que l'opérateur
  en soit informé.
- **`k=3` en dur.** 23 outils, 3 candidats : un mauvais scoring du cross-encoder
  est irrattrapable par le LLM.
- **`priority` est inerte**, ce qui rend le classement du manifeste trompeur.
- **`subprocess.run` bloque le thread GUI** pendant toute l'exécution du module.
- **L'historique mélange prose d'UI et contexte de routage** : les bulles de chat
  sont renvoyées telles quelles comme tours `assistant` à un routeur contraint en
  JSON.
- **`OnRetrieveButton` reconstruit l'historique en découpant sur les émojis**
  `👨:` / `🤖:` ([Agent.py:1126](Agent/Agent.py#L1126)) : un message contenant
  ces caractères désynchronise l'alternance.
- **Détection de thème par échantillonnage de pixels** (`widget.grab()`,
  luminance du pixel (5,5)), parce que `QPalette` renvoie les couleurs du thème
  clair même en thème sombre dans Slicer ([Agent.py:656](Agent/Agent.py#L656)).
  Fonctionne, mais dépend du moment du premier rendu — d'où le
  `QTimer.singleShot(0, ...)` du `setup`.
- **Code mort** : `AgentLogic.process()`, `build_tool_spec()` (et tout le support
  `patterns`/`defaults`), `ValidationReport`, `positional_order`, le champ
  `examples` du manifeste, `_cross_encoder_model`,
  [Agent_CLI/Resources/UI/Agent_CLI.ui](Agent_CLI/Resources/UI/Agent_CLI.ui).
- **`extract_parameters` retourne 4 valeurs** alors que son annotation en déclare
  3.

## 13. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Présélection des 3 candidats | **réseau** (cross-encoder MiniLM-L6, 22,7 M) | processus Agent_CLI, CPU ou GPU selon torch |
| Choix final de l'outil | **LLM** qwen3:8b, JSON contraint | serveur Ollama |
| Extraction des paramètres | **LLM** qwen3:8b, JSON contraint | serveur Ollama |
| Résolution des chemins | **LLM**, depuis `FOLDERS_CONTEXT` | serveur Ollama |
| Validation / coercition | déterministe, Python pur | Agent_CLI |
| Dossiers temporaires | déterministe, `slicer.util.tempDirectory()` | widget |
| Construction de la commande | déterministe, ordre du manifeste | Agent_CLI |
| Réparation après échec | **LLM** qwen3:8b, depuis stderr | processus Slicer |
| Diagnostic d'erreur d'environnement | mots-clés, pas de LLM | widget |

## 14. Littérature

**Aucun papier.** Ni sur ce module, ni sur l'approche. Une recherche sur
SlicerAutomatedDentalTools + agent LLM ne remonte que la documentation du dépôt
et de la littérature générale sur les LLM en dentisterie, sans rapport avec ce
code. Les seules références externes réelles sont celles des deux modèles
utilisés, tous deux génériques et non entraînés pour ce domaine :

- [Qwen3 sur Ollama](https://ollama.com/library/qwen3) — modèle de routage et
  d'extraction
- [cross-encoder/ms-marco-MiniLM-L-6-v2](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2)
  — reranker MS MARCO utilisé pour la présélection
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)

L'historique git du module tient en trois commits (`aa3330d` ADD: Add the new
agentic module, `b463312`, `2a91e33`) : c'est un ajout récent, importé d'un dépôt
`AI_Agent` séparé — d'où la désynchronisation entre le manifeste et les
signatures réelles des CLI de ce dépôt-ci.

**Bibliographie complète : [SOURCES.md](SOURCES.md)** — recherche faite, résultat
négatif sur le plan des publications, mais un **rapport NA-MIC Project Week PW45
(Boston, 2026) signé par les auteurs du module** a été retrouvé et récupéré dans ce
dossier, avec les papiers des deux modèles (Qwen3, MiniLM/MS MARCO) et de la méthode
cross-encoder.
