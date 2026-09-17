# CNE — sources

Outil **non publié**. Après vérification, aucune publication ne décrit CNE, ni
les deux modèles fine-tunés qu'il télécharge. L'acronyme *Clinical Notes
Extraction* lui-même n'apparaît nulle part en dehors du dépôt.

Ce qui a été cherché, et n'a rien donné :

| Recherche | Résultat |
|---|---|
| Europe PMC `"Clinical Notes Extraction"` | 6 articles, aucun du groupe, aucun sur ce code |
| Europe PMC `(AUTH:"Cevidanes L" OR AUTH:"Prieto JC" OR AUTH:"Bianchi J") AND ("large language model" OR LLM OR Llama OR Qwen OR GPT)` | 3 articles, tous d'un autre Jonas Bianchi (santé mentale, revues Cochrane) ou sans rapport |
| Europe PMC `AUTH:"Cevidanes L" AND ("natural language processing" OR "clinical notes" OR "electronic health record" OR "large language model" OR summarization OR "text mining")` | 1 article, de 2019, sans rapport |
| API Hugging Face, auteur `dcbia` | 2 dépôts exactement, `Meta-Llama-3.1-8B-Instruct-Ortho` et `Qwen-2.5-7B-Instruct-TMJ`, créés le 24 juin 2026, `cardData: null`, **pas de README**, un seul fichier GGUF chacun, 17 et 7 téléchargements. Aucune citation, aucun lien vers un corpus ou un protocole. |

Le protocole de fine-tuning, le corpus d'annotations TMJ/Ortho et l'évaluation
restent donc **indéterminables**, exactement comme le constatait
[CNE.md](CNE.md). Le seul rattachement documenté est la lignée MedX → CNE, et
[MedX/SOURCES.md](../MedX/SOURCES.md) montre que le papier de MedX décrit un
BART, pas un Llama ni un Qwen : il ne couvre pas CNE.

## Récupéré dans ce dossier

Rien qui décrive CNE. Les fichiers ci-dessous relèvent du **voisinage** (section
suivante) et sont listés ici parce qu'ils ont été téléchargés.

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2024_Wiest_privacy_preserving_LLM.xml` / `.txt` | Wiest IC, Ferber D, Zhu J, van Treeck M, Meyer SK, Juglan R, Carrero ZI, Paech D, Kleesiek J, Ebert MP, Truhn D, Kather JN. *Privacy-preserving large language models for structured medical information retrieval.* npj Digit Med 2024;7:257. | Article (open access) | [10.1038/s41746-024-01233-2](https://doi.org/10.1038/s41746-024-01233-2) — PMC11415382 |
| `2026_Panchal_LLM_deidentification_EHR.xml` / `.txt` | Panchal O, Chang NW, Zhao ZR, Ramesh Nadar D, Dai HJ, Jonnagaddala J. *Benchmarking large language models for de-identification of electronic health record notes.* BMJ Health Care Inform 2026;33(1):e101894. | Article (open access) | [10.1136/bmjhci-2025-101894](https://doi.org/10.1136/bmjhci-2025-101894) — PMC13410914 |
| `2025_Doremus_moderate_LM_deidentification.xml` / `.txt` | Dorémus O, Russon D, Contrand B, Guerra-Adames A, Avalos-Fernandez M, Gil-Jardiné C, Lagarde E. *Harnessing Moderate-Sized Language Models for Reliable Patient Data Deidentification in Emergency Department Records: Algorithm Development, Validation, and Implementation Study.* JMIR AI 2025;4:e57828. | Article (open access) | [10.2196/57828](https://doi.org/10.2196/57828) — PMC12223680 |

Les `.txt` sont la conversion lisible du JATS ; le `.xml` est la source.

## À consulter en ligne (pas librement téléchargeable)

Aucune référence de ce type : il n'y a pas d'article payant à signaler non plus.

## Modèles, dépôts, moteur

| Objet | Où |
|---|---|
| Modèles de base | [meta-llama/Llama-3.1-8B-Instruct](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct), [Qwen/Qwen2.5-7B-Instruct](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct) |
| Dépôts fine-tunés (sans model card) | [dcbia/Qwen-2.5-7B-Instruct-TMJ](https://huggingface.co/dcbia/Qwen-2.5-7B-Instruct-TMJ), [dcbia/Meta-Llama-3.1-8B-Instruct-Ortho](https://huggingface.co/dcbia/Meta-Llama-3.1-8B-Instruct-Ortho) |
| Moteur d'inférence, format GGUF, quantification Q4_K_M | [llama-cpp-python](https://github.com/abetlen/llama-cpp-python), [llama.cpp](https://github.com/ggml-org/llama.cpp) |
| Le module | [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools) |

## Voisinage

**Aucun de ces travaux ne porte sur CNE.** Ils ne partagent ni les auteurs, ni
les modèles, ni le corpus. Ils sont réunis ici parce qu'ils décrivent le même
geste technique — faire tourner un LLM à poids ouverts *sur place*, sans envoyer
le texte du patient à un service tiers, pour en extraire des champs structurés —
et permettent de juger ce que CNE fait, faute de texte sur CNE lui-même.

- **Wiest 2024** (fichier ci-dessus) : le travail le plus proche du geste de CNE.
  Des LLM à poids ouverts déployés localement extraient des données structurées de
  rapports cliniques, avec l'argument de confidentialité comme justification du
  déploiement local. C'est le même dispositif, sur un autre domaine et d'autres
  auteurs.
- **Panchal 2026** et **Dorémus 2025** (fichiers ci-dessus) : la dé-identification
  de notes cliniques par LLM, respectivement en benchmark et en déploiement réel
  aux urgences. CNE ne dé-identifie rien — c'est précisément la question que ces
  deux articles posent et que le dépôt ne traite pas.
- Nahm WJ, Yin ES, Milam EC, Weed JG. *Local Deployment of Open-Weight Language
  Models in Dermatology: Viewpoint on Privacy, Equity, and Practical
  Implementation.* JMIR Dermatol 2026;9:e94764, [10.2196/94764](https://doi.org/10.2196/94764),
  PMC13496321, accès ouvert. Point de vue sur ce que suppose, en pratique, le
  déploiement local d'un modèle à poids ouverts dans une spécialité clinique.

Rappel, comme le disait déjà la fiche : **ne pas rattacher CNE à cette
littérature**. Rien dans le dépôt n'indique que les modèles `dcbia/*` viennent
d'un travail publié, et ces articles ne disent rien du corpus, du protocole
d'annotation ou des performances de CNE.
