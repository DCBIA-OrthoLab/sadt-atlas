# CNE — pipeline complet

**Avertissement de périmètre.** Contrairement à AutoCrop3D et AutoMatrix, CNE
n'est pas un utilitaire géométrique : il ne touche ni volume, ni maillage, ni
coordonnée. C'est un **module d'inférence LLM** qui lit des notes cliniques en
texte libre et écrit des paires clé–valeur. Le cœur du module est un modèle
quantifié GGUF chargé par `llama-cpp-python` dans le Python de Slicer.

## 0. L'acronyme

Le dépôt n'explicite l'acronyme nulle part dans une documentation : le README ne
contient aucune section CNE (il documente toujours MedX, que CNE remplace, cf.
[CMakeLists.txt:42](CMakeLists.txt#L42) « Replaced by CNE »). L'aide du module
([CNE.py:147](CNE/CNE.py#L147)) dit seulement « This tool helps to create
summaries of clinical notes ».

En revanche deux lignes de log, et elles seules, donnent l'expansion :
`logger.info("CNE (Clinical Notes Extraction)")`
([CNE.py:329](CNE/CNE.py#L329) et [CNE.py:606](CNE/CNE.py#L606)), et le CLI
publie le même nom au superviseur Slicer :
`<filter-name>Clinical Notes Extraction</filter-name>`
([CNE_CLI.py:91](CNE_CLI/CNE_CLI.py#L91)). **CNE = Clinical Notes Extraction**,
attesté par le code et par rien d'autre.

## 1. Situation dans la chaîne

Module terminal. Rien ne l'appelle, il n'appelle aucun autre module du dépôt.
Déclaré en [CMakeLists.txt:51](CMakeLists.txt#L51).

Il **remplace la moitié « Summarization » de MedX**. MedX/ et MedX_CLI/ sont
toujours dans l'arbre mais désactivés du build
([CMakeLists.txt:42-44](CMakeLists.txt#L42)) ; la moitié « Dashboard » de MedX
(`dashboard.png` + `patient_data.csv`) n'a **pas** d'équivalent dans CNE et
disparaît donc de l'extension compilée.

| Différence avec MedX Summarize | MedX | CNE |
|---|---|---|
| Moteur | `transformers` + `torch` | `llama_cpp` (llama.cpp) |
| Modèle | BART seq2seq, `.safetensors`, release GitHub `MedX/BART.zip` | Llama-3.1-8B ou Qwen-2.5-7B quantifiés GGUF, Hugging Face |
| Découpage des notes | `create_chunks_from_paragraphs(max_chunk_size=3500)` puis concaténation des résumés | **aucun** : la note entière en un seul message |
| Décodage | beam search 4, `no_repeat_ngram_size=3`, `repetition_penalty=2.0`, `temperature=0.6`, `top_p=0.95` | `temperature=0.1`, `max_tokens=500` |
| Agrégation par patient | oui, `patient_id = file_name.split("_")[0]` | non, un fichier = une sortie |

L'instruction système est littéralement recopiée de MedX :
`"Using the following note, extract structured key-value pairs about the patient's symptoms and diagnoses:"`
([CNE_CLI.py:22](CNE_CLI/CNE_CLI.py#L22) vs
[MedX_Summarize.py:50](MedX_CLI/MedX_Summarize/MedX_Summarize.py#L50)).

## 2. Fichiers en jeu

| Fichier | Rôle | Où ça tourne |
|---|---|---|
| [CNE.py](CNE/CNE.py) | widget : dépendances, téléchargement du modèle, lancement du CLI | Python de Slicer |
| [CNE_CLI.py](CNE_CLI/CNE_CLI.py) | extraction de texte + inférence llama.cpp | Python de Slicer (`SlicerMacroBuildScriptedCLI`) |
| [CNE.ui](CNE/Resources/UI/CNE.ui) | deux `ctkPathLineEdit` en mode `Dirs`, deux radios TMJ/Ortho | — |
| [Resources/testfiles/](CNE/Resources/testfiles) | 4 notes d'exemple (2 TMJ, 2 Ortho), en clair dans le dépôt | — |

Pas de conda. Le CLI est un *scripted CLI*, donc lancé par `slicer.cli.run` dans
le Python de Slicer — c'est dans cet interpréteur que `llama-cpp-python` est
installé et que le modèle est chargé en mémoire.

## 3. Dépendances, installées à la demande

`check_dependencies()` ([CNE.py:83](CNE/CNE.py#L83)) est appelé **au clic sur
Apply**, pas au chargement du module. Il teste trois imports et, s'il en manque,
demande confirmation avant `slicer.util.pip_install` :

| Import testé | Paquet installé | Usage |
|---|---|---|
| `llama_cpp` | `llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu` | inférence |
| `fitz` | `pymupdf` | extraction de texte PDF |
| `docx` | `python-docx` | extraction de texte Word |

Deux points à connaître :

- `install_function` ([CNE.py:44](CNE/CNE.py#L44)) force `CC=gcc` et `CXX=g++`
  pendant l'installation puis restaure les valeurs d'origine — c'est pour le cas
  où pip doit compiler `llama-cpp-python` depuis les sources. Sur Windows ces
  valeurs sont inutilisables.
- L'index supplémentaire pointe explicitement vers les **wheels CPU**. Or le CLI
  demande `n_gpu_layers=-1` avec le commentaire « Use GPU if available »
  ([CNE_CLI.py:162](CNE_CLI/CNE_CLI.py#L162)) : avec une build CPU-only ce
  paramètre est sans effet. En pratique l'inférence tourne sur CPU, et un modèle
  7–8 B quantifié Q4 y coûte plusieurs dizaines de secondes par note.

Le CLI re-teste les trois imports au démarrage et `sys.exit(1)` si l'un manque
([CNE_CLI.py:99-115](CNE_CLI/CNE_CLI.py#L99)) — redondant, mais sans danger
puisque le CLI partage l'interpréteur du widget.

## 4. Les modèles

Aucun poids n'est dans le dépôt. `getModelPath()`
([CNE.py:478](CNE/CNE.py#L478)) télécharge le GGUF à la demande, par
`urllib.request.urlretrieve` avec une `QProgressDialog`, dans
`<Documents>/SlicerDownloads/CNE/model/`.

| Mode UI | `repo_id` | Fichier demandé | Nom local | `n_ctx` |
|---|---|---|---|---|
| TMJ | `dcbia/Qwen-2.5-7B-Instruct-TMJ` | `qwen-ft-q4_k_m.gguf` | `Qwen-2.5-7B-TMJ.gguf` | **6144** |
| Ortho | `dcbia/Meta-Llama-3.1-8B-Instruct-Ortho` | `model-q4_0.gguf` | `Meta-Llama-3.1-8B-Ortho.gguf` | **2048** |

URL construite : `https://huggingface.co/{repo_id}/resolve/main/{fileName}`.

**Le téléchargement Ortho est cassé.** Vérifié par l'API Hugging Face : le dépôt
`dcbia/Meta-Llama-3.1-8B-Instruct-Ortho` ne contient que `.gitattributes` et
`model-q4_k_m.gguf`. Le fichier `model-q4_0.gguf` demandé par le code n'existe
pas — l'URL renvoie **HTTP 404**, l'URL en `q4_k_m` renvoie 200. `urlretrieve`
lève, le fichier partiel est supprimé, et l'utilisateur voit « Download failed or
was cancelled ». Le mode TMJ, lui, est correct (`qwen-ft-q4_k_m.gguf` → 200).

Les deux dépôts Hugging Face n'ont **aucune model card** : ni licence, ni jeu
d'entraînement, ni méthode de fine-tuning publiés. Architectures de base
identifiables par les tags (Llama-3.1-8B-Instruct et Qwen2 7B), quantification
Q4_K_M dans les deux cas. Ce qui distingue les deux modèles fine-tunés — corpus
d'annotations, schéma de sortie appris, protocole — n'est **pas déterminable
depuis le dépôt ni depuis Hugging Face**.

## 5. Entrées et prétraitements

`SUPPORTED_EXTENSIONS = (".txt", ".pdf", ".docx")`. Le balayage est
**non récursif** : `glob.glob(os.path.join(notesFolder_input, f"*{ext}"))`
([CNE_CLI.py:133](CNE_CLI/CNE_CLI.py#L133)) — contrairement à tous les autres
modules du dépôt qui utilisent `iglob(**, recursive=True)`. Un dossier de
sous-dossiers par patient ne donnera rien.

Extraction du texte ([CNE_CLI.py:73](CNE_CLI/CNE_CLI.py#L73)) :

| Format | Extracteur | Détail |
|---|---|---|
| `.pdf` | `fitz.open` puis `"\n".join(page.get_text() for page in doc)` | pas d'OCR : un PDF scanné ressort vide |
| `.docx` | `docx.Document`, `paragraph.text` | **les tableaux sont perdus** (`doc.paragraphs` ne les parcourt pas) |
| `.txt` | `open(..., encoding="utf-8")` | un fichier en `cp1252` lève `UnicodeDecodeError`, attrapé par la boucle et compté en échec |

`clean_text()` ([CNE_CLI.py:40](CNE_CLI/CNE_CLI.py#L40)) est le seul
prétraitement, et il est motivé dans le code : normaliser ce qui varie entre
exports PDF/Word mais n'apparaissait jamais dans les notes texte
d'entraînement — apostrophes et guillemets typographiques vers ASCII, tiret
demi-cadratin et cadratin vers `-`, espace insécable vers espace, puis
effondrement des lignes vides consécutives. Objectif explicite : que le modèle
voie le même texte quel que soit le format source.

Aucune anonymisation, aucun filtrage PHI. Les notes de test du dépôt sont
pseudonymisées à la main (`B_001`, `[DOCTOR]`, `Dr. XXX`) mais rien dans le code
ne le garantit pour les données de l'utilisateur. Le module
[Medical_Data_Anonymizer_Module](Medical_Data_Anonymizer_Module) existe
séparément et n'est pas chaîné à CNE.

## 6. L'inférence

Une seule passe par fichier, aucun découpage
([CNE_CLI.py:192](CNE_CLI/CNE_CLI.py#L192)) :

```python
messages = []
if notesType.upper() == "TMJ":
    messages.append({"role": "system", "content": INSTRUCTION_TMJ})
messages.append({"role": "user", "content": clinical_text})

output = llm.create_chat_completion(messages=messages, max_tokens=500, temperature=0.1)
```

À noter :

- **Le mode Ortho n'envoie aucune instruction.** Seule la note brute part comme
  message utilisateur ; c'est le fine-tuning du modèle Llama-Ortho qui est censé
  porter la tâche. Le mode TMJ, lui, conserve l'instruction héritée de MedX.
- `create_chat_completion` applique le *chat template* embarqué dans le GGUF.
  Les deux modèles sont tagués `conversational` sur Hugging Face, donc le
  template existe ; il n'est ni visible ni contrôlable depuis le dépôt.
- `temperature=0.1` et pas de `seed` : la sortie est quasi déterministe mais pas
  reproductible à l'identique.
- **Pas de garde sur la longueur.** `n_ctx` vaut 6144 (TMJ) ou 2048 (Ortho) et
  `max_tokens=500` est prélevé dessus. Une note dépassant le budget fait lever
  llama.cpp ; l'exception est attrapée par fichier, journalisée, et le fichier
  est ajouté à `failed_files`. Le budget Ortho est particulièrement serré :
  ~1500 tokens de note utile. La note de test
  [TMJ_note1.txt](CNE/Resources/testfiles/input_TMJ/TMJ_note1.txt) fait environ
  4 400 caractères, ce qui passe en TMJ.
- Le chargement du modèle est encadré par une redirection de `stderr` vers
  `/dev/null` via `os.dup2` ([CNE_CLI.py:155](CNE_CLI/CNE_CLI.py#L155)), pour
  masquer le bavardage de llama.cpp qui sinon polluerait le canal d'erreur que
  Slicer interprète comme un échec du CLI.

## 7. Post-traitement de la réponse

Le modèle est censé répondre en JSON ; le code ne le lui impose pas (pas de
`response_format`, pas de grammaire GBNF) et se contente de **repêcher** le JSON
dans le texte ([CNE_CLI.py:207](CNE_CLI/CNE_CLI.py#L207)) :

```python
start_idx = ai_response.find('{')
end_idx   = ai_response.rfind('}') + 1
data = json.loads(ai_response[start_idx:end_idx])
if "extraction" in data:
    data = data["extraction"]
for key, value in data.items():
    formatted_response += f"{key} : {value}\n"
```

Donc : première accolade ouvrante jusqu'à la dernière fermante, déballage d'un
éventuel niveau `extraction`, puis aplatissement en lignes `clé : valeur`. Si le
parse échoue **ou** s'il n'y a pas d'accolade, la réponse brute du modèle est
écrite telle quelle. Le fichier de sortie ne dit pas dans lequel des deux cas on
se trouve.

Conséquences : le découpage naïf `find('{')`…`rfind('}')` casse dès que la
réponse contient plusieurs objets JSON, et une valeur imbriquée (liste, dict) est
rendue par son `repr` Python dans le fichier texte.

## 8. Sorties

Un fichier texte par note d'entrée, dans le dossier de sortie :

```
Extraction_<nom de la note sans extension>.txt
```

Contenu : des lignes `clé : valeur`, ou la réponse brute du modèle en cas
d'échec de parse. Pas de CSV, pas de json, pas d'agrégation par patient — le
tableau de bord de MedX n'a pas été repris.

Le dossier de sortie est créé par `os.makedirs(..., exist_ok=True)` côté widget
([CNE.py:578](CNE/CNE.py#L578)).

## 9. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Extraction de texte PDF/Word | PyMuPDF / python-docx | CLI |
| Normalisation typographique | table de remplacement fixe, 7 entrées | CLI |
| Extraction des paires clé–valeur | **LLM**, Qwen-2.5-7B-TMJ ou Llama-3.1-8B-Ortho, GGUF Q4 | CLI, `llama_cpp` en process |
| Mise en forme | `find('{')` / `json.loads` / boucle d'aplatissement | CLI |

Tout le contenu clinique de la sortie vient du modèle. Il n'y a aucune règle,
aucun dictionnaire de termes, aucune validation de schéma : ce que le modèle
écrit est ce qui est sauvegardé.

## 10. Environnement

| Élément | Valeur | Source |
|---|---|---|
| Interpréteur | Python de Slicer, pas de conda | `SlicerMacroBuildScriptedCLI`, [CMakeLists.txt](CNE_CLI/CMakeLists.txt) |
| Paquets installés à la volée | `llama-cpp-python` (index CPU), `pymupdf`, `python-docx` | [CNE.py:93-100](CNE/CNE.py#L93) |
| GPU | demandé (`n_gpu_layers=-1`) mais l'installation impose une build CPU | §3 |
| Poids | ~4,4 Go (TMJ) / ~4,9 Go (Ortho), `<Documents>/SlicerDownloads/CNE/model/` | [CNE.py:500](CNE/CNE.py#L500) |
| RAM | non contrainte dans le code ; un Q4_K_M 7–8 B demande environ 5–6 Go résidents en plus de Slicer | déduction |

## 11. Pièges et points fragiles

- **Le modèle Ortho ne se télécharge pas** : nom de fichier erroné, HTTP 404 (§4).
  Correction : `model-q4_0.gguf` → `model-q4_k_m.gguf`.
- **Les dossiers de sortie des fichiers de test n'existent pas.**
  `copyTestFiles()` ([CNE.py:409](CNE/CNE.py#L409)) copie `input_<type>` **et**
  `output_<type>`, mais [Resources/testfiles/](CNE/Resources/testfiles) ne
  contient que les deux dossiers `input_`. Le `shutil.copytree` du dossier de
  sortie est sauté avec un warning et l'UI se voit remplir un chemin de sortie
  qui n'existe pas encore.
- **Balayage non récursif** du dossier d'entrée (§5).
- **Aucune limite de longueur** avant l'appel : une note trop longue échoue au
  lieu d'être découpée, alors que MedX découpait (§6). C'est une régression
  fonctionnelle du remplacement.
- **Le mode Ortho n'envoie aucune instruction système** (§6) : si le modèle n'est
  pas celui attendu, la sortie n'a aucune raison d'être du JSON.
- **Aucune contrainte de format de sortie** : pas de grammaire GBNF ni de
  `response_format`, alors que llama.cpp les propose. Le post-traitement est donc
  un repêchage heuristique (§7).
- **Radio button ni TMJ ni Ortho** → `notesType = ""`
  ([CNE.py:382](CNE/CNE.py#L382)) → dans `getModelPath`, `repo_id` n'est jamais
  affecté et l'`UnboundLocalError` remonte en « Failed to load model ». Le cas ne
  devrait pas arriver (`setExclusive(True)` et défaut TMJ), mais rien ne le
  bloque.
- **Casse incohérente** : `notesType == "TMJ"` fixe `n_ctx`, `notesType.upper() == "TMJ"`
  fixe l'instruction. Un `notesType` en minuscules donnerait l'instruction TMJ
  avec le contexte de 2048.
- **Aucune trace de provenance** : le fichier `Extraction_*.txt` ne mentionne ni
  le modèle, ni sa version, ni la date. Deux exécutions avec des modèles
  différents produisent des fichiers indistinguables.
- **PHI** : rien n'anonymise, rien n'avertit. Les notes sont lues en clair,
  passent par un modèle local (donc pas d'exfiltration réseau — c'est le seul
  garde-fou, et il est structurel plutôt que délibéré).
- **Métadonnées du CLI restées au gabarit** :
  [CNE_CLI.xml](CNE_CLI/CNE_CLI.xml) décrit encore « Apply a Gaussian blur to an
  image », attribue le module à « Andras Lasso (PerkLab) », et ses `<index>`
  valent 0, 2, 3, 4 — l'index 1 manque.
- **`onCliProgress`** ([CNE.py:594](CNE/CNE.py#L594)) lit `caller.GetProgress()`
  et n'en fait rien ; elle n'est d'ailleurs connectée à aucun observateur. Code
  mort. L'avancement réel passe par les balises `<filter-progress>` du CLI, lues
  par le `qSlicerCLIProgressBar`.

## 12. Littérature

Aucune publication n'est citée dans le dépôt pour CNE, et les deux dépôts
Hugging Face `dcbia/*` sont publiés sans model card ni référence. Le protocole
de fine-tuning, le corpus d'annotations TMJ/Ortho et l'évaluation ne sont
**pas déterminables depuis le dépôt**.

Ce qui est vérifiable :

- La lignée MedX → CNE, documentée uniquement par
  [CMakeLists.txt:42](CMakeLists.txt#L42) et la section MedX du
  [README.md:425](README.md#L425), qui décrit encore l'ancien pipeline BART et le
  dashboard disparu.
- Les modèles de base :
  [Meta-Llama-3.1-8B-Instruct](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct),
  [Qwen2.5-7B-Instruct](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct).
- Les dépôts fine-tunés :
  [dcbia/Qwen-2.5-7B-Instruct-TMJ](https://huggingface.co/dcbia/Qwen-2.5-7B-Instruct-TMJ),
  [dcbia/Meta-Llama-3.1-8B-Instruct-Ortho](https://huggingface.co/dcbia/Meta-Llama-3.1-8B-Instruct-Ortho).
- Le moteur : [llama-cpp-python](https://github.com/abetlen/llama-cpp-python),
  [llama.cpp](https://github.com/ggml-org/llama.cpp) (format GGUF, quantification
  Q4_K_M).
- [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)

Ne pas rattacher CNE à la littérature générale sur l'extraction d'information
clinique par LLM : rien dans le dépôt n'indique que les modèles utilisés ici
proviennent d'un travail publié.

Ce qui a été cherché pour arriver à ce constat, et le voisinage récupéré :
[SOURCES.md](SOURCES.md).
