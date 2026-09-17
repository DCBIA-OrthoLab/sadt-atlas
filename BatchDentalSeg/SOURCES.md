# BatchDentalSeg — sources

Le module est **partiellement publié** : sur les quatre modèles qu'il empaquette,
seul **DentalSegmentator** a un article, et sur ce modèle le code et le papier
concordent. **PediatricDentalSegmentator, UniversalLabDentalSegmentator et
NasoMaxillaDentSegmentator ne sont rattachés à aucune publication** — recherche
faite, rien n'existe (détail en fin de fichier). Le module lui-même (mise en
file, gestion mémoire, UI batch) n'est décrit nulle part.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2024_Dot_DentalSegmentator_JDent.pdf` | Dot G., Chaurasia A., Dubois G., Savoldelli C., Haghighat S., Azimian S., Rahbar Taramsari A., Sivaramakrishnan G., Issa J., Dubey A., Schouman T., Gajny L. *DentalSegmentator: Robust open source deep learning-based CT and CBCT image segmentation.* Journal of Dentistry 147:105130, 2024. | Version auteur déposée sur HAL (`hal-05454422`, 17 p., mise en page auteur ; le manuscrit porte le titre du preprint, « robust deep learning-based CBCT image segmentation », et la notice HAL nomme par erreur la revue *International Journal of Dentistry*) | [10.1016/j.jdent.2024.105130](https://doi.org/10.1016/j.jdent.2024.105130) — PMID 38878813, pas de PMCID |
| `2020_Isensee_nnUNet_automated_design.pdf` | Isensee F., Jaeger P.F., Kohl S.A.A., Petersen J., Maier-Hein K.H. *Automated Design of Deep Learning Methods for Biomedical Image Segmentation.* arXiv:1904.08128v2, 2020, 55 p. — **version soumise** de l'article Nature Methods ci-dessous. | Preprint arXiv | [arXiv:1904.08128](https://arxiv.org/abs/1904.08128) |
| `2025_Sinard_DL_impacted_teeth_CBCT.xml` | Sinard E., Gajny L., de La Dure-Molla M., Felizardo R., Dot G. *Automated Cone Beam Computed Tomography Segmentation of Multiple Impacted Teeth With or Without Association to Rare Diseases: Evaluation of Four Deep Learning-Based Methods.* Orthodontics & Craniofacial Research 28(3):433-440, 2025. **Voisinage**, voir plus bas. | Texte intégral JATS (Europe PMC) | [10.1111/ocr.12890](https://doi.org/10.1111/ocr.12890) — PMID 39744906, PMCID PMC12056468 |

La version éditeur de l'article DentalSegmentator est en CC-BY chez Elsevier
(libre à la lecture sur [sciencedirect](https://doi.org/10.1016/j.jdent.2024.105130)),
mais ScienceDirect ne sert pas le PDF à un client non navigateur ; c'est la
raison du dépôt HAL ici. Le preprint correspondant est sur medRxiv :
[10.1101/2024.03.18.24304458](https://doi.org/10.1101/2024.03.18.24304458)
(medRxiv bloque aussi le téléchargement direct du PDF ; la page `…v2.full` est
lisible en ligne).

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| Isensee F., Jaeger P.F., Kohl S.A.A., Petersen J., Maier-Hein K.H. *nnU-Net: a self-configuring method for deep learning-based biomedical image segmentation.* Nature Methods 18(2):203-211, 2021. **Version de référence à citer** (c'est celle que cite le README du dépôt) ; seul le preprint arXiv est librement redistribuable. | [nature.com](https://www.nature.com/articles/s41592-020-01008-z) | [10.1038/s41592-020-01008-z](https://doi.org/10.1038/s41592-020-01008-z) |
| Mattos C.T., Mota Júnior S.L., Teodoro A.B., Lorenzoni D.C., Cury-Saramago A.A., Cevidanes L. *705 — Open-Source AI for Efficient 3D Orthodontic Workflows: Pediatric and Adult Dental Segmentation in Daily Practice.* Journal of the World Federation of Orthodontists 14(6):619-620, 2025. Résumé de congrès, accès fermé, **sans résumé diffusé** : le titre est le seul indice qu'il pourrait porter sur ce module et son modèle pédiatrique. À vérifier avant de le citer. | [Elsevier](https://doi.org/10.1016/j.ejwf.2025.07.709) | [10.1016/j.ejwf.2025.07.709](https://doi.org/10.1016/j.ejwf.2025.07.709) |
| Dot G. et al. *DentalSegmentator nnU-Net pretrained model for CBCT image segmentation.* Zenodo, 2024. Les **poids** DentalSegmentator (CC-BY-4.0). Téléchargeables, mais ce module les prend depuis les releases GitHub de `gaudot/SlicerDentalSegmentator`, pas depuis Zenodo. | [Zenodo](https://zenodo.org/records/10829675) | concept [10.5281/zenodo.10829674](https://doi.org/10.5281/zenodo.10829674) |

## Les trois variantes : rien de publié

**Aucune publication.** Ce qui a été cherché, sans résultat :

- Europe PMC, requêtes `PediatricDentalSegmentator`, `UniversalLabDentalSegmentator`,
  `NasoMaxillaDentSegmentator`, `pediatric dental segmentator mixed dentition CBCT nnU-Net` :
  **0 résultat** à chaque fois.
- OpenAlex sur les mêmes noms : rien, hors le résumé de congrès EJWF ci-dessus.
- Recherche web sur chaque nom de modèle et sur « Cevidanes / DCBIA + pediatric
  CBCT + primary teeth + 513 » : seules remontées, le README du dépôt lui-même
  et des travaux d'autres équipes (par ex. Baraka et al., *Multi-Architecture
  deep learning for CBCT segmentation of dental hard tissues and pulp in mixed
  dentition*, J Dent 166:106344, 2026, [10.1016/j.jdent.2026.106344](https://doi.org/10.1016/j.jdent.2026.106344)
  — équipe sans rapport, 151 scans, autres structures : **ce n'est pas le modèle
  de ce module**).

### Le chiffre de « 513 scans » reste non sourcé — et se contredit

Le [README](README.md) du dépôt annonce 513 scans CBCT en
denture mixte pour PediatricDentalSegmentator **et** pour
UniversalLabDentalSegmentator, et 135 pour NasoMaxillaDentalSegmentator, sans
référence ni jeu de test. Aucune source ne porte ce chiffre. Pire, les
`dataset.json` publiés avec les poids sur les releases GitHub du dépôt le
démentent :

| Modèle | `numTraining` annoncé par le bundle | README | Étiquettes |
|---|---|---|---|
| PediatricDentalSegmentator | **380** | 513 | 6 (fond + 5 structures, comme DentalSegmentator) |
| UniversalLabDentalSegmentator | **462** | 513 | 56 (fond + 55 dents, numérotation Universal) |
| NasoMaxillaDentSegmentator | **135** | 135 | 7 (les 5 de DentalSegmentator + maxillaire séparé) |

Seul NasoMaxilla est cohérent. Chiffres reconfirmés directement depuis les
releases :

```
curl -sL https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools/releases/download/<TAG>/dataset.json
# PEDIATRICDENTALSEG_MODEL  -> numTraining 380, 6 labels
# UNIVERSALLAB_MODEL        -> numTraining 462, 56 labels
# NASOMAXILLADENTSEG_MODEL  -> numTraining 135, 7 labels
```

La nuance à garder : `numTraining` est le nombre de cas du dataset **tel que
préparé pour nnU-Net**, ce qui n'est pas forcément le nombre de scans collectés.
Un corpus de 513 scans dont certains sont écartés à la préparation, ou réservés à
un jeu de test, donnerait légitimement 380. Ce n'est donc pas nécessairement une
erreur — mais c'est un écart que rien ne documente, sur deux modèles, avec le
même chiffre annoncé pour deux corpus différents (380 et 462). La question à
poser aux auteurs est : 513 désigne-t-il le corpus collecté avant préparation, et
où est décrit le découpage ?

En attendant la réponse, ne pas recopier « 513 » dans un texte scientifique sans
l'avoir fait confirmer.

## Voisinage

Ces travaux **ne décrivent pas ce module** ; ils évaluent DentalSegmentator de
l'extérieur, ou fournissent son socle.

- **nnU-Net** (Isensee et al. 2021) : le socle des quatre modèles. Décrit la
  méthode auto-configurante, pas ces modèles ni leurs poids.
- **Sinard et al. 2025** (fichier `2025_Sinard_DL_impacted_teeth_CBCT.xml`) :
  compare quatre méthodes de segmentation, dont DentalSegmentator, sur des CBCT
  de patients à inclusions dentaires multiples. Évaluation externe du modèle
  d'origine ; ne dit rien des trois variantes ni du module batch. Le mémoire
  correspondant est en accès libre sur DUMAS :
  [dumas-05471245](https://dumas.ccsd.cnrs.fr/dumas-05471245).
- **Gkantidis N., Ghamri M., Dot G.** *Accuracy and generalizability of an
  open-source deep learning model for facial bone segmentation on CT and CBCT
  scans: An ex vivo study.* Journal of Dentistry 170:106663, 2026,
  [10.1016/j.jdent.2026.106663](https://doi.org/10.1016/j.jdent.2026.106663) —
  autre évaluation externe de DentalSegmentator (preprint medRxiv
  [10.64898/2025.12.28.25343101](https://doi.org/10.64898/2025.12.28.25343101)).
- [gaudot/SlicerDentalSegmentator](https://github.com/gaudot/SlicerDentalSegmentator)
  — extension amont et source des poids DentalSegmentator.
- [KitwareMedical/SlicerNNUnet](https://github.com/KitwareMedical/SlicerNNUnet) —
  l'extension `NNUNet` requise.
- [MIC-DKFZ/nnUNet](https://github.com/MIC-DKFZ/nnUNet).
