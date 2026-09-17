# Agent — sources

**Non publié.** Aucun article ne porte sur ce module ni sur son approche. Il existe
en revanche une trace officielle qu'il fallait trouver : un **rapport de projet
NA-MIC Project Week** (PW45, Boston, 2026) signé par ses auteurs, récupéré ici. Il
décrit le module dans son intention, pas dans son état — il annonce `llama3:latest`
là où le code fixe `qwen3:8b`, et son « prochain pas » (intégration du LLM,
déploiement dans Slicer) est déjà fait dans le dépôt. Les autres références utiles
sont purement techniques : le modèle servi par Ollama, le cross-encoder de
présélection, et le jeu de données dont il vient.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2026_NAMIC_PW45_ai_agent_slicer_dental_tools.md` | Dumont P., Buisson A., Prieto J.C., Cevidanes L., Pieper S. *AI-Agent for SlicerAutomatedDentalTools.* 45e NA-MIC Project Week, Boston, 2026. Financement NIDCR R01DE024450. | Rapport de projet NA-MIC | [projectweek.na-mic.org/PW45_2026_Boston](https://projectweek.na-mic.org/PW45_2026_Boston/Projects/AiAgentForSlicerautomateddentaltools/) |
| `2025_QwenTeam_Qwen3_technical_report.pdf` | Qwen Team. *Qwen3 Technical Report.* arXiv:2505.09388, 14 mai 2025. Le modèle de routage et d'extraction (`qwen3:8b`, tag Ollama par défaut : 5,2 Go, Q4_K_M, 8,19 G paramètres). | Rapport technique / preprint arXiv | [arXiv:2505.09388](https://arxiv.org/abs/2505.09388) |
| `2020_Wang_MiniLM_self_attention_distillation.pdf` | Wang W., Wei F., Dong L., Bao H., Yang N., Zhou M. *MiniLM: Deep Self-Attention Distillation for Task-Agnostic Compression of Pre-Trained Transformers.* arXiv:2002.10957v2, 2020 ; NeurIPS 2020. L'**architecture** de `ms-marco-MiniLM-L-6-v2` (6 couches, 22,7 M paramètres, distillé de `MiniLM-L12-H384-uncased`). | Preprint arXiv / actes | [arXiv:2002.10957](https://arxiv.org/abs/2002.10957) |
| `2019_Nogueira_passage_reranking_BERT.pdf` | Nogueira R., Cho K. *Passage Re-ranking with BERT.* arXiv:1901.04085, 2019. La **méthode** du cross-encoder : scorer directement la paire (requête, passage), qui est exactement ce que fait `cross_encoder_retrieve_candidates` sur les fiches du manifeste. | Preprint arXiv | [arXiv:1901.04085](https://arxiv.org/abs/1901.04085) |
| `2016_Bajaj_MS_MARCO_dataset.pdf` | Bajaj P., Campos D., Craswell N., Deng L., Gao J., Liu X., Majumder R., McNamara A., Mitra B., Nguyen T., Rosenberg M., Song X., Stoica A., Tiwary S., Wang T. *MS MARCO: A Human Generated MAchine Reading COmprehension Dataset.* arXiv:1611.09268v3, 2018. Le jeu d'entraînement du reranker : 1,01 M de questions issues des journaux de requêtes Bing, 8,84 M de passages web. | Preprint arXiv | [arXiv:1611.09268](https://arxiv.org/abs/1611.09268) |
| `2019_Reimers_SentenceBERT_siamese_networks.pdf` | Reimers N., Gurevych I. *Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks.* arXiv:1908.10084, 2019 ; EMNLP-IJCNLP 2019. La référence de **`sentence-transformers`**, la bibliothèque qui fournit la classe `CrossEncoder` employée par le module. | Preprint arXiv / actes | [arXiv:1908.10084](https://arxiv.org/abs/1908.10084) |

## À consulter en ligne (pas librement téléchargeable)

Rien. Aucun travail payant n'a été identifié sur ce module.

Fiches des modèles, à lire en complément :
[ollama.com/library/qwen3](https://ollama.com/library/qwen3) (tags, tailles,
quantifications) et
[huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2).

## Voisinage

Aucun de ces travaux **ne décrit ce module**.

- **MS MARCO** (Bajaj, récupéré) : le reranker a été entraîné à classer des
  passages web pour des requêtes Bing. Ici on lui donne des fiches de modules
  Slicer et des prompts d'opérateur — un domaine et un registre pour lesquels il
  n'a **pas** été entraîné, et dont aucune évaluation n'existe dans le dépôt.
- **Qwen3** (récupéré) : rapport technique du modèle générique. Ni le prompt
  système du module, ni son format de sortie JSON contraint, ni sa boucle de
  réparation n'y figurent — et aucun `temperature`, `seed`, `num_ctx` ni `think`
  n'est passé par le code.
- **Ollama** et **llama.cpp**, le serveur et le moteur d'inférence effectivement
  utilisés : aucune publication. [ollama.com](https://ollama.com) ·
  [github.com/ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp).
- **Autre agent, autre projet** : Tu P., Dominguez M., Kikinis R., Pieper S.,
  Kim S., *Interactive Workflow Replay and Step-Back Navigation for Slicer Agent*,
  45e NA-MIC Project Week, Boston, 2026
  ([lien](https://projectweek.na-mic.org/PW45_2026_Boston/Projects/InteractiveWorkflowReplayAndStepBackNavigationForSlicerAgent/)).
  Il porte sur [puxuntu/Slicer_agent](https://github.com/puxuntu/Slicer_agent),
  un agent qui génère et exécute du Python dans la scène Slicer — **un autre code,
  une autre équipe, présenté à la même semaine**. À ne pas confondre avec ce
  module, qui appelle des CLI de l'extension et n'écrit aucun code.
- **LLM dans ce laboratoire, autre tâche** : Gaydamour A. *et al.*, Cevidanes L.,
  *AI-Driven Multimodal TMJ Patient Modeling: From Unstructured Notes to Precision
  Treatment*, CLIP 2025, LNCS vol. 16126, p. 42-52
  ([10.1007/978-3-032-05479-1_5](https://doi.org/10.1007/978-3-032-05479-1_5)).
  BART et DeepSeek-R1 *fine-tunés* pour extraire 56 indicateurs cliniques de notes
  de patients. Aucun rapport avec le routage vers des modules Slicer.

### Ce qui a été cherché sans rien trouver

Europe PMC et OpenAlex en plein texte sur `SlicerAutomatedDentalTools` et
`"Automated Dental Tools"` : aucun résultat sur un agent LLM. Arborescence complète
du dépôt NA-MIC/ProjectWeek (2 854 fichiers, PW35 → PW45) : le rapport PW45 récupéré
ci-dessus est la seule entrée sur ce module. Recherche web sur agent LLM + 3D Slicer
+ dentaire : rien d'autre que la documentation du dépôt et de la littérature
générale sur les LLM en dentisterie, sans rapport avec ce code. **Aucune
publication.**
