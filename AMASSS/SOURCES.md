# AMASSS — sources

AMASSS est publié une fois, en accès libre (PLOS ONE 2022), **mais le papier
décrit une version morte du module** : un UNETR MONAI à fenêtre glissante 128³,
alors que le code exécuté aujourd'hui est un nnU-Net v2 (un réseau binaire par
structure, architecture `PlainConvUNet` venue du `plans.json` des poids). Le
basculement date du commit `61bbb15` « ENH: AMASSS with nnunet » (2025-07-30) ;
le commit `109e1ed` (2026-09-09) a ensuite remplacé l'appel en sous-processus par
l'API Python de nnU-Net. **Aucune publication ne décrit la version nnU-Net.**
Citer le papier PLOS ONE pour décrire le module tel qu'il tourne aujourd'hui,
c'est décrire une architecture qui n'est plus exécutée.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2022_Gillot_AMASSS_skull_segmentation.pdf` | Gillot M., Baquero B., Le C., Deleat-Besson R., Bianchi J., Ruellas A., Gurgel M., Yatabe M., Al Turkestani N., Najarian K., Soroushmehr R., Pieper S., Kikinis R., Paniagua B., Gryak J., Ioshida M., Massaro C., Gomes L., Oh H., Evangelista K., Chaves Junior C.M., Garib D., Costa F., Benavides E., Soki F., Fillion-Robin J.-C., Joshi H., Cevidanes L., Prieto J.C. *Automatic multi-anatomical skull structure segmentation of cone-beam computed tomography scans using 3D UNETR.* PLOS ONE 17(10):e0275033, 2022, 12 p. | Article de revue, PDF éditeur (CC-BY) | [10.1371/journal.pone.0275033](https://doi.org/10.1371/journal.pone.0275033) — PMID 36223330, PMCID **PMC9555672** |
| `2022_Gillot_AMASSS_skull_segmentation.xml` | idem | Texte intégral JATS (Europe PMC) | PMC9555672 |
| `2022_Gillot_AMASSS_skull_segmentation.txt` | idem | Texte brut extrait du XML (lecture / grep) | PMC9555672 |
| `2021_Hatamizadeh_UNETR_transformers_3D_segmentation.pdf` | Hatamizadeh A., Tang Y., Nath V., Yang D., Myronenko A., Landman B., Roth H., Xu D. *UNETR: Transformers for 3D Medical Image Segmentation.* WACV 2022, p. 1748-1758 (version arXiv v3 du 9 oct. 2021, 11 p.). | Preprint arXiv / actes | [arXiv:2103.10504](https://arxiv.org/abs/2103.10504) — [10.1109/WACV51458.2022.00181](https://doi.org/10.1109/WACV51458.2022.00181) |
| `2020_Isensee_nnUNet_automated_design.pdf` | Isensee F., Jaeger P.F., Kohl S.A.A., Petersen J., Maier-Hein K.H. *Automated Design of Deep Learning Methods for Biomedical Image Segmentation.* arXiv:1904.08128v2, 2020, 55 p. — **version soumise** de l'article Nature Methods ci-dessous. | Preprint arXiv | [arXiv:1904.08128](https://arxiv.org/abs/1904.08128) |

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| Isensee F., Jaeger P.F., Kohl S.A.A., Petersen J., Maier-Hein K.H. *nnU-Net: a self-configuring method for deep learning-based biomedical image segmentation.* Nature Methods 18(2):203-211, 2021. **Version de référence à citer** ; seul le preprint arXiv est librement redistribuable. | [nature.com](https://www.nature.com/articles/s41592-020-01008-z) | [10.1038/s41592-020-01008-z](https://doi.org/10.1038/s41592-020-01008-z) |

## Voisinage

Ces travaux **ne décrivent pas AMASSS** ; ils documentent son environnement ou
ses briques.

- **nnU-Net** (Isensee et al. 2021, ci-dessus) : le socle de la version actuelle
  du module. Il décrit la méthode auto-configurante, pas le modèle AMASSS ni ses
  poids, dont l'entraînement n'est documenté nulle part.
- **UNETR** (Hatamizadeh et al. 2022) : l'architecture du papier PLOS ONE, donc
  de la version *historique* du CLI. Sans rapport avec ce qui tourne aujourd'hui.
- [Maxlo24/AMASSS_CBCT](https://github.com/Maxlo24/AMASSS_CBCT) — dépôt d'origine
  cité par le papier ; code de recherche, pas le module Slicer.
- [DCBIA-OrthoLab/SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools)
  — le dépôt du module ; aucun DOI, aucun papier d'extension.

### Ce qui a été cherché sans rien trouver

Europe PMC (`AMASSS`, `AUTH:"Gillot M"`), OpenAlex et recherche web pour :
proceedings SPIE Medical Imaging / MICCAI signés Gillot, Prieto ou Cevidanes sur
la segmentation multi-structures du crâne ; publication décrivant la bascule
nnU-Net d'AMASSS ou l'entraînement de ses poids. **Rien.** Les autres résultats
Gillot/Cevidanes portent sur d'autres outils (ALI, ASO/AREG, ShapeAXI).
