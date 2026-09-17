# DOCShapeAXI — sources

Outil **partiellement publié**, et publié en pièces détachées : aucun article ne
décrit le module Slicer, mais chacun des trois jeux embarqués a sa propre
publication clinique, et le cadre `shapeaxi` a la sienne.

**Le code diverge de son papier de référence.** Le papier SPIE 2024
([2024_Prieto_ShapeAXI_SPIE](2024_Prieto_ShapeAXI_SPIE.txt)) décrit un rendu
multi-vues sur subdivision d'icosaèdre dont les images sont traitées par un
**ResNet-18** suivi d'une attention additive — une seule branche. Les
checkpoints réellement téléchargés par le module sont des `SaxiMHAFB*` : branche
**nuage de 4096 points à attention KNN** plus branche **42 vues / EfficientNet-B0
pré-entraîné ImageNet**, concaténées. Cette architecture bi-branche n'apparaît
nulle part dans le papier SPIE ; elle est décrite, telle quelle, dans Mattos
2025 ([2025_Mattos_adenoid_airway_obstruction](2025_Mattos_adenoid_airway_obstruction.txt),
§ *Deep learning model*). Les chiffres du papier SPIE ne sont donc pas ceux des
modèles distribués.

Deuxième divergence, plus discrète : l'expérience « condyles » du papier SPIE est
une classification **binaire** (sain / *Degenerative Joint Disease*, 90 sujets,
79.78 %), alors que le checkpoint livré est `condyles_4_class` — **4 classes de
sévérité**. Aucun texte trouvé ne décrit ce checkpoint à 4 classes. Le papier
SPIE donne 81.58 % pour les fentes sur 4 classes de sévérité, et là le jeu
correspond bien (voir Miranda 2023 ci-dessous, même cohorte).

Rectification de la fiche : contrairement à ce qu'indiquait
[DOCShapeAXI.md](DOCShapeAXI.md), il **existe** une publication propre au jeu
*Alveolar Bone Defect in Cleft* — Miranda et al., Sci Rep 2023, qui définit
l'index de sévérité 0–3 et l'explicabilité SurfGradCAM sur 194 patients CLP.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2024_Prieto_ShapeAXI_SPIE.xml` / `.txt` | Prieto JC, Miranda F, Gurgel M, Anchling L, Hutin N, Barone S, Al Turkestani N, Aliaga A, Yatabe M, Bianchi J, Cevidanes L. *ShapeAXI: Shape Analysis Explainability and Interpretability.* Proc. SPIE 12931, Medical Imaging 2024: Imaging Informatics for Healthcare, Research, and Applications, 1293116, avril 2024. | Proceedings (texte intégral JATS, manuscrit auteur NIHMS1990711) | [10.1117/12.3007053](https://doi.org/10.1117/12.3007053) — PMC11085013, PMID 38736903 |
| `2025_Mattos_adenoid_airway_obstruction.xml` / `.txt` | Mattos CT, Dole L, Mota-Júnior SL, Cury-Saramago AA, Bianchi J, Oh H, Evangelista K, Valladares-Neto J, Ruellas ACO, Prieto JC, Cevidanes LHS. *Explainable artificial intelligence to quantify adenoid hypertrophy-related upper airway obstruction using 3D shape analysis.* J Dent 2025;156:105689. | Article (texte intégral JATS, manuscrit auteur NIHMS2068726) | [10.1016/j.jdent.2025.105689](https://doi.org/10.1016/j.jdent.2025.105689) — PMC12089392, PMID 40090403 |
| `2023_Miranda_cleft_alveolar_bone_defect.xml` / `.txt` | Miranda F, Choudhari V, Barone S, Anchling L, Hutin N, Gurgel M, Al Turkestani N, Yatabe M, Bianchi J, Aliaga-Del Castillo A, Zupelari-Gonçalves P, Edwards S, Garib D, Cevidanes L, Prieto J. *Interpretable artificial intelligence for classification of alveolar bone defect in patients with cleft lip and palate.* Sci Rep 2023;13:15861. | Article (open access) | [10.1038/s41598-023-43125-7](https://doi.org/10.1038/s41598-023-43125-7) — PMC10516946, PMID 37740091 |
| `2019_Ribera_SVA_TMJOA_classifier.xml` / `.txt` | Tubau Ribera N, de Dumast P, Yatabe M, Ruellas A, Ioshida M, Paniagua B, Styner M, Gonçalves JR, Bianchi J, Cevidanes L, Prieto JC. *Shape variation analyzer: a classifier for temporomandibular joint damaged by osteoarthritis.* Proc. SPIE 10950, Medical Imaging 2019: Computer-Aided Diagnosis, 1095021, 2019. | Proceedings (texte intégral JATS) | [10.1117/12.2506018](https://doi.org/10.1117/12.2506018) — PMC6663087, PMID 31359900 |
| `2018_deDumast_shape_variation_analyzer.xml` / `.txt` | de Dumast P, Mirabel C, Paniagua B, Yatabe M, Ruellas A, Tubau N, Styner M, Cevidanes L, Prieto JC. *SVA: Shape Variation Analyzer.* Proc. SPIE 10578, Medical Imaging 2018: Biomedical Applications in Molecular, Structural, and Functional Imaging, 105782H, 2018. | Proceedings (texte intégral JATS) | [10.1117/12.2295631](https://doi.org/10.1117/12.2295631) — PMC5956518, PMID 29780198 |
| `2018_deDumast_web_TMJOA_classification.xml` / `.txt` | de Dumast P, Mirabel C, Cevidanes L, Ruellas A, Yatabe M, Ioshida M, Tubau Ribera N, Michoud L, Gomes L, Huang C, Zhu H, Muniz L, Shoukri B, Paniagua B, Styner M, Pieper S, Budin F, Vimort JB, Pascal L, Prieto JC. *A web-based system for neural network based classification in temporomandibular joint osteoarthritis.* Comput Med Imaging Graph 2018;67:45–54. | Article (texte intégral JATS) | [10.1016/j.compmedimag.2018.04.009](https://doi.org/10.1016/j.compmedimag.2018.04.009) — PMC5987251, PMID 29753964 |
| `2016_Selvaraju_GradCAM.pdf` | Selvaraju RR, Cogswell M, Das A, Vedantam R, Parikh D, Batra D. *Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization.* arXiv:1610.02391, 2016 (ICCV 2017, pp. 618–626). | Preprint arXiv | [arXiv:1610.02391](https://arxiv.org/abs/1610.02391) |

Les `.txt` sont la conversion lisible du JATS ; le `.xml` est la source. Les deux
articles SPIE et le J Dent sont des **manuscrits auteur** déposés par NIH Public
Access : le texte est complet, la mise en page de l'éditeur ne l'est pas, et les
figures ne sont pas dans le fichier.

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| Dole L, Mattos CT, Bianchi J, Oh H, Evangelista K, Valladares Neto J, Mota-Júnior SL, Cevidanes L, Prieto JC. *Enhancing airway obstruction diagnosis with multimodal 3D shape analysis.* Int J Comput Assist Radiol Surg 2026;21(3):529–538 (en ligne 14 oct. 2025). **La référence la plus proche du module**, par l'autrice du dépôt d'origine `lucieDLE/DOC-ShapeAXI` : elle présente explicitement un « open-source, automated deep learning tool », combine multi-vues et nuage de points, et travaille sur 1215 CBCT de quatre centres. Payante ; susceptible d'arriver dans PMC au titre du NIH Public Access. | [Springer](https://doi.org/10.1007/s11548-025-03527-6) · [PubMed 41085926](https://pubmed.ncbi.nlm.nih.gov/41085926) | [10.1007/s11548-025-03527-6](https://doi.org/10.1007/s11548-025-03527-6) |
| Version éditeur du papier SPIE 2024 (mise en page et figures) | [SPIE Digital Library](https://doi.org/10.1117/12.3007053) | 10.1117/12.3007053 |
| Version éditeur de Mattos 2025 | [ScienceDirect](https://doi.org/10.1016/j.jdent.2025.105689) | 10.1016/j.jdent.2025.105689 |

## Dépôts et objets logiciels

| Objet | Où |
|---|---|
| Cadre `shapeaxi` (le paquet pip réellement exécuté) | [DCBIA-OrthoLab/ShapeAXI](https://github.com/DCBIA-OrthoLab/ShapeAXI) |
| Dépôt d'origine du module | [lucieDLE/DOC-ShapeAXI](https://github.com/lucieDLE/DOC-ShapeAXI) |
| Archive Zenodo du logiciel ShapeAXI | [10.5281/zenodo.22118309](https://doi.org/10.5281/zenodo.22118309) |
| Captum — `LayerGradCam`, utilisé au §5 du module | [captum.ai](https://captum.ai/api/layer.html#gradcam) |

## Voisinage

Ces travaux **ne décrivent pas DOCShapeAXI**. Ils sont là parce qu'ils fixent
l'échelle de sévérité des condyles que le jeu `condyles_4_class` reprend sans
qu'aucun texte ne la documente pour ce checkpoint.

- **Tubau Ribera 2019** et **de Dumast 2018 (SPIE + CMIG)**, ci-dessus : la
  lignée *Shape Variation Analyzer*, l'ancêtre direct du classifieur de condyles
  du groupe. Ils gradent la dégénérescence condylienne en **5, 6 ou 7 groupes**
  selon la version (normal, proche du normal, surcroissance, Degeneration 1–4),
  sur descripteurs géométriques + *heat kernel signature*, pas sur du rendu
  multi-vues. Aucun des trois ne produit 4 classes, et aucun n'utilise
  l'architecture livrée ici.
- Gomes LR, Gomes M, Jung B, Paniagua B, Ruellas AC, Gonçalves JR, Styner MA,
  Wolford L, Cevidanes L. *Diagnostic index of three-dimensional osteoarthritic
  changes in temporomandibular joint condylar morphology.* J Med Imaging
  2015;2(3):034501, [10.1117/1.JMI.2.3.034501](https://doi.org/10.1117/1.JMI.2.3.034501),
  PMC4495313. L'index diagnostique clinique dont toute la lignée SVA descend.
  Pas librement téléchargeable.
- **Grad-CAM** (fichier ci-dessus) : la méthode d'explicabilité d'origine. Le
  module en applique la variante « SurfGradCAM » via Captum, sur maillage et non
  sur image ; SurfGradCAM est décrit dans Miranda 2023 et Mattos 2025, pas dans
  Selvaraju.
