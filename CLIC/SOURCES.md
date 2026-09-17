# CLIC — sources

**Aucune publication ne décrit CLIC.** Vérification faite : rien sur le nom du
module, rien sous les noms de ses auteurs, aucun article, aucun preprint, aucun
abstract IADR/AADOCR retrouvé. La seule source primaire est une **page de projet
NA-MIC Project Week 43** (Montréal, 2025), récupérée dans ce dossier, qui
présente CLIC comme un outil déjà existant et décrit un travail en cours qui
l'étend à la sévérité de la résorption radiculaire. Sa section « Background and
References » est vide (« No response ») : les auteurs eux-mêmes n'y rattachent
aucune référence.

Ce qui est documenté ailleurs, c'est le *problème*, pas ce code. La spécificité
de CLIC — une classe **bicorticale** en plus du couple buccal/palatin, prédite
coupe par coupe en 2D sur du CBCT par un Mask R-CNN — n'apparaît dans aucun des
travaux voisins ci-dessous. Ne pas présenter leurs chiffres comme ceux du
module.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2025_Tulissi_NAMIC_PW43_impacted_canines.md` | Tulissi E, Cevidanes L, Prieto J, Bianchi J. « Interpretable Deep Learning for the Detection and Classification of Impacted Canines and severity of root resorption ». Page de projet, NA-MIC Project Week 43, Montréal, 2025. | rapport de projet — **seule source primaire** | [page du projet](https://projectweek.na-mic.org/PW43_2025_Montreal/Projects/InterpretableDeepLearningForTheDetectionAndClassificationOfImpactedCaninesAndSeverityOfRootResorption/) |
| `2017_He_Mask_RCNN.pdf` | He K, Gkioxari G, Dollár P, Girshick R. « Mask R-CNN ». *arXiv*:1703.06870, 2017 (ICCV 2017). | article — architecture employée | [arXiv:1703.06870](https://arxiv.org/abs/1703.06870) |
| `2026_Kahraman_buccal_palatal_panoramic_AI.xml` / `.txt` | Kahraman EN, Güldiken İN, Tekin A, Kanbak T, Yılancı H. « Buccal or palatal? AI-based localization of impacted maxillary canines using panoramic radiographs ». *BMC Medical Imaging*, 2026, 26(1), 36. | voisinage | [10.1186/s12880-025-02143-9](https://doi.org/10.1186/s12880-025-02143-9) — PMC12809956 |
| `2025_Unal_3D_segmentation_impacted_canines.xml` / `.txt` | Ünal T, Kuran A, Gulsen IT, Kızılay FN, Gulsen E, Özüdoğru S, Gördeli K, Celik O, Uğurlu M, Bayrakdar İŞ, Orhan K. « Deep learning-based 3D automatic segmentation of impacted canines in CBCT scans ». *BMC Oral Health*, 2025, 25(1), 1927. | voisinage | [10.1186/s12903-025-07117-5](https://doi.org/10.1186/s12903-025-07117-5) — PMC12723826 |
| `2024_Swaity_deep_learning_canine_segmentation.xml` / `.txt` | Swaity A, Elgarba BM, Morgan N, Ali S, Shujaat S, Borsci E, Chilvarquer I, Jacobs R. « Deep learning driven segmentation of maxillary impacted canine on cone beam computed tomography images ». *Scientific Reports*, 2024, 14(1), 369. | voisinage | [10.1038/s41598-023-49613-0](https://doi.org/10.1038/s41598-023-49613-0) — PMC10764895 |
| `2024_Pirayesh_canine_root_resorption_CBCT.xml` / `.txt` | Pirayesh Z, Mohammad-Rahimi H, Motamedian SR, Amini Afshar S, Abbasi R, Rohban MH, Mahdian M, Ghazizadeh Ahsaie M, Iranparvar Alamdari M. « A hierarchical deep learning approach for diagnosing impacted canine-induced root resorption via cone-beam computed tomography ». *BMC Oral Health*, 2024, 24(1), 982. | voisinage | [10.1186/s12903-024-04718-4](https://doi.org/10.1186/s12903-024-04718-4) — PMC11344340 |
| `2026_Helal_AI_canine_impaction_panoramic.xml` / `.txt` | Helal NM, Aljehani AF, Alomari SA, Mahmoud RA, Khalifa HM. « Artificial Intelligence-Assisted Detection of Canine Impaction, Localization, and Classification from Panoramic Images: A Diagnostic Accuracy Comparative Study with CBCT ». *Children*, 2026, 13(4), 507. | voisinage | [10.3390/children13040507](https://doi.org/10.3390/children13040507) — PMC13115521 |

Les XML sont le texte intégral JATS fourni par Europe PMC ; le `.txt` à côté en
est la conversion lisible.

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| Galdi M, Cannatà D, Celentano F, Rizzo L, Rossi D, Bocchino T, Martina S. « Development of a fully deep learning model to improve the reproducibility of sector classification systems for predicting unerupted maxillary canine likelihood of impaction ». *arXiv*:2511.20493, 2025. | [arXiv](https://arxiv.org/abs/2511.20493) — librement téléchargeable, non repris ici : porte sur la classification par secteurs **sur panoramique**, problème différent | — |
| Salmanpour F, Akpınar M. « Performance of Chat Generative Pretrained Transformer-4.0 in determining labiolingual localization of maxillary impacted canines ». *AJODO*, 2025. | [éditeur](https://doi.org/10.1016/j.ajodo.2025.02.017) — payant | [10.1016/j.ajodo.2025.02.017](https://doi.org/10.1016/j.ajodo.2025.02.017) |
| Torchvision, `maskrcnn_resnet50_fpn` — implémentation réellement utilisée par le module. | [documentation PyTorch](https://pytorch.org/vision/stable/models/generated/torchvision.models.detection.maskrcnn_resnet50_fpn.html) | — |

Autres pistes vérifiées, sans résultat :

- Europe PMC, `AUTH:"Tulissi E"` : un seul article, sans rapport (registration
  CBCT/IRM pour l'ATM). Aucun sur les canines incluses.
- Aucune page NA-MIC Project Week consacrée à CLIC en dehors de PW43. Le balayage
  de l'arborescence complète du dépôt `NA-MIC/ProjectWeek` (PW33 à PW45) ne
  renvoie qu'une seule page sur les canines incluses, celle citée plus haut. La
  page PW43 « Universal Tooth Labeling Module » (mêmes auteurs) porte sur un
  autre sujet.
- Le dépôt d'origine du code, [`ashmoy/maskRcnn`](https://github.com/ashmoy/maskRcnn)
  (créé en janvier 2025), ne cite aucune publication : pas de description, et son
  `README.md` est une copie de celui de SlicerAutomatedDentalTools.

## Voisinage

Ces travaux **ne décrivent pas le code de CLIC**.

- **Localisation buccal/palatin sur panoramique.** Kahraman 2026 (*BMC Medical
  Imaging*) et Helal 2026 (*Children*) entraînent des CNN de classification
  d'images 2D sur radiographies panoramiques, en prenant le CBCT comme référence.
  Deux classes seulement, une image par patient. CLIC travaille directement sur
  le volume CBCT, coupe par coupe, avec trois classes.
- **Segmentation 3D de canines incluses sur CBCT.** Swaity 2024 (*Scientific
  Reports*) et Ünal 2025 (*BMC Oral Health*) segmentent la canine incluse par
  réseau volumétrique (nnU-Net / CNN 3D). Ils délimitent la dent ; ils ne
  classent pas sa position corticale.
- **Résorption radiculaire des dents adjacentes.** Pirayesh 2024 (*BMC Oral
  Health*) propose une approche hiérarchique de diagnostic de la résorption
  induite par une canine incluse sur CBCT. C'est exactement l'**extension**
  annoncée par le projet PW43 ci-dessus — donc le voisin le plus proche du
  travail en cours, mais pas du code actuellement dans le dépôt : CLIC, tel que
  versionné, ne prédit aucune sévérité de résorption.
- **L'architecture.** He 2017 décrit Mask R-CNN. Le module utilise
  l'implémentation `torchvision.models.detection.maskrcnn_resnet50_fpn` ; ni
  l'article ni la documentation torchvision ne disent quoi que ce soit des
  canines.
