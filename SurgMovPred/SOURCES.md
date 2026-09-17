# SurgMovPred — sources

**Aucun article ne décrit SurgMovPred.** Mais la fiche peut être complétée sur un
point : il existe une **page de projet NA-MIC Project Week 45** (Boston, 2026)
consacrée exactement à ce module — *New 3D Slicer Module to predict surgery
movement for maxillofacial surgery* — récupérée dans ce dossier. Elle nomme les
auteurs (Alexandre Buisson, Paul Dumont, Juan Carlos Prieto, Lucia Cevidanes,
Steve Pieper, UNC Chapel Hill ; Mauro I. Dominguez), confirme le modèle
(*Machine Learning Stacking model*, entrée Excel/CSV de paramètres cliniques,
sortie = déplacements osseux prédits), donne la taille du jeu d'entraînement —
**1 496 patients** — et la source de financement, NIDCR
[R01DE024450](https://reporter.nih.gov/project-details/11458698). C'est un
rapport de projet, pas une publication : ni méthode détaillée, ni validation, ni
chiffres de performance.

Rien d'autre. Recherche sur le nom du module, sur `AUTH:"Buisson A"` et
`AUTH:"Dumont P"` dans Europe PMC (les homonymes trouvés sont des
gastro-entérologues), sur les archives d'abstracts IADR/AADOCR : aucun travail
publié sur la prédiction des mouvements chirurgicaux par ce groupe. Le poster
UNC/IADR 2026 de Paul Dumont porte sur la synthèse de notes cliniques TMD
(module CNE/MedX), pas sur ce module ; celui d'Alexandre Buisson porte sur
VFACE.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2026_Buisson_NAMIC_PW45_surgery_movement.md` | Buisson A, Dumont P, Prieto JC, Cevidanes L, Pieper S, Dominguez MI. « New 3D Slicer Module to predict surgery movement for maxillofacial surgery ». Page de projet, NA-MIC Project Week 45, Boston, 2026. | rapport de projet — **seule source primaire** | [page du projet](https://projectweek.na-mic.org/PW45_2026_Boston/Projects/New3DSlicerModuleToPredictSurgeryMovementForMaxillofacialSurgery/) |
| `2023_Cheng_orthognathic_plan_deep_learning.xml` / `.txt` | Cheng M, Zhang X, Wang J, Yang Y, Li M, Zhao H, Huang J, Zhang C, Qian D, Yu H. « Prediction of orthognathic surgery plan from 3D cephalometric analysis via deep learning ». *BMC Oral Health*, 2023, 23(1), 161. | voisinage | [10.1186/s12903-023-02844-z](https://doi.org/10.1186/s12903-023-02844-z) — PMC10024836 |
| `2025_Kim_postoperative_cephalograms_GNN.xml` / `.txt` | Kim IH, Jeong J, Kim JS, Lim J, Cho JH, Hong M, Kang KH, Kim M, Kim SJ, Kim YJ, Sung SJ, Kim YH, Lim SH, Baek SH, Park JW, Kim N. « Predicting orthognathic surgery results as postoperative lateral cephalograms using graph neural networks and diffusion models ». *Nature Communications*, 2025, 16(1), 2586. | voisinage | [10.1038/s41467-025-57669-x](https://doi.org/10.1038/s41467-025-57669-x) — PMC11911408 |
| `2026_Bao_PhysSFI_Net_orthognathic_outcome.pdf` | Bao J, Liu H, Zhuang Y, Tao L, Xu X, Shi Y, Cheng M, Wang Y, Ku C, Zeng T, Du Y, Chen S, Shen S, Xiang S, Yu H. « PhysSFI-Net: Physics-informed Geometric Learning of Skeletal and Facial Interactions for Orthognathic Surgical Outcome Prediction ». *arXiv*:2601.02088, 2026. | voisinage | [arXiv:2601.02088](https://arxiv.org/abs/2601.02088) |

Les XML sont le texte intégral JATS fourni par Europe PMC ; le `.txt` à côté en
est la conversion lisible.

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| Ma Q, Kobayashi E, Fan B, Hara K, Nakagawa K, Masamune K, Sakuma I, Suenaga H. « Machine-learning-based approach for predicting postoperative skeletal changes for orthognathic surgical planning ». *Int J Med Robot Comput Assist Surg*, 2022, 18(3), e2379. | [éditeur](https://doi.org/10.1002/rcs.2379) — payant (`oa_status: closed`) | [10.1002/rcs.2379](https://doi.org/10.1002/rcs.2379) |
| de Oliveira PHJ, Li T, Li H, Gonçalves JR, Santos-Pinto A, Gandini Junior LG, *et al.*, Cevidanes L, Bianchi J. « Artificial intelligence as a prediction tool for orthognathic surgery assessment ». *Orthodontics & Craniofacial Research*, 2024, 27(5), 785-794. | [PMC11789623](https://pmc.ncbi.nlm.nih.gov/articles/PMC11789623/) (manuscrit auteur lisible ; pas de texte intégral via l'API Europe PMC) | [10.1111/ocr.12805](https://doi.org/10.1111/ocr.12805) |

Outils sous-jacents, documentés mais sans rapport avec ce jeu de données :
[`sklearn.ensemble.StackingRegressor`](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.StackingRegressor.html),
[LightGBM](https://lightgbm.readthedocs.io/).

## Voisinage

Ces travaux **ne décrivent pas le code de SurgMovPred** ni les 112 paquets de
modèles livrés avec.

- **Le problème exact, autre équipe.** Ma 2022 (*IJMRCAS*) prédit les
  changements squelettiques post-opératoires à partir de mesures
  pré-opératoires, par apprentissage automatique tabulaire. C'est la
  formulation la plus proche de celle de SurgMovPred, mais rien ne relie ce
  travail aux poids embarqués.
- **Même objectif, apprentissage profond.** Cheng 2023 (*BMC Oral Health*)
  prédit le plan chirurgical à partir d'une analyse céphalométrique 3D ; Kim
  2025 (*Nature Communications*) va plus loin et synthétise la téléradiographie
  post-opératoire par réseau de graphes + diffusion. SurgMovPred, lui, est un
  modèle tabulaire classique (145 features → 112 régresseurs empilés) qui ne lit
  aucune image.
- **Sens inverse.** Bao 2026 (*arXiv*) prédit le résultat facial à partir de
  mouvements squelettiques planifiés. SurgMovPred prédit les mouvements
  eux-mêmes à partir de mesures pré-opératoires : les deux sont complémentaires,
  pas substituables.
- **Même équipe, cible différente.** Oliveira 2024 (*OCR*, avec Cevidanes et
  Bianchi) prédit le *besoin* de chirurgie orthognathique à partir de
  téléradiographies de profil — une classification binaire, pas une régression
  de déplacements.
