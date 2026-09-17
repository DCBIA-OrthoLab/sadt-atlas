# VFACE — sources

VFACE est **partiellement publié**, et ce qui est publié ne décrit pas ce que le
module exécute. Le proceeding SPIE Medical Imaging 2026 (doi:10.1117/12.3087010)
décrit la même chaîne amont — prétraitement standardisé, miroir, recalage voxel,
extraction de mesures anatomiques — mais s'arrête sur un **clustering non
supervisé** (réduction de dimension PCA / t-SNE / UMAP, puis *Spectral
Clustering* à affinité kNN ou RBF, UMAP+RBF donnant le meilleur score de
silhouette). Le module, lui, embarque **trois classifieurs LightGBM binaires
supervisés** entraînés sur 14 features fixes. Ce ne sont pas le même modèle :
rien dans le dépôt ne relie les étiquettes d'entraînement des LightGBM aux
clusters du papier, et le script d'entraînement n'est pas versionné. **Ne pas
citer les chiffres du papier comme performances du module.**

Le principe clinique du module — recaler le patient sur son propre reflet et
mesurer l'écart — n'est pas nouveau : il vient d'une série de travaux du même
groupe, 2011-2012, listés dans « Voisinage ». Aucun de ces travaux ne décrit ce
code.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2026_Peng_3D_facial_asymmetry_review.xml` / `.txt` | Peng J, Qu W, Zhang S, Lin Y. « Automated assessment of 3D facial asymmetry: a systematic review ». *European Journal of Orthodontics*, 2026, 48(3), art. cjag012. | revue systématique (voisinage) | [10.1093/ejo/cjag012](https://doi.org/10.1093/ejo/cjag012) — PMC13207581 |
| `2023_Gillot_ALI_landmark_identification.xml` / `.txt` | Gillot M, Miranda F, Baquero B, Ruellas A, Gurgel M, Al Turkestani N, Anchling L, Hutin N, Biggs E, Yatabe M, Paniagua B, Fillion-Robin JC, Allemang D, Bianchi J, Cevidanes L, Prieto JC. « Automatic landmark identification in cone-beam computed tomography ». *Orthodontics & Craniofacial Research*, 2023, 26(4), 560-567. | article (brique amont ALI-CBCT) | [10.1111/ocr.12642](https://doi.org/10.1111/ocr.12642) — PMC10440369 |
| `2023_Hutin_NAMIC_PW39_AQ3DC.md` | Hutin N, Anchling L, Baquero B, Gillot M, Cevidanes L, Allemang D, Fillion-Robin JC. « Automatic Quantification 3D Components (AQ3DC) ». Rapport de projet, NA-MIC Project Week 39, Montréal, 2023. | rapport de projet (brique amont AQ3DC) | [page du projet](https://projectweek.na-mic.org/PW39_2023_Montreal/Projects/AutomaticQuantitative3DCephalometrics/) |

Les XML sont le texte intégral JATS fourni par Europe PMC ; le `.txt` à côté en
est la conversion lisible.

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| **Sanna A, Ng J, Ruellas A, Aliaga A, Gaydamour A, Tulissi E, Huang Y, Prieto JC, Al Turkestani N, Yatabe M, Bianchi J, Pieper S, Cevidanes L, Li T. « Automated classification of skeletal facial asymmetry in CBCT using a reproducible 3D Slicer workflow for patient-specific decision support ». In : Gimi BS (éd.), *Medical Imaging 2026: Clinical and Biomedical Imaging*, Proc. SPIE vol. 13929, art. 139292J. SPIE, 2026. Conférence tenue à Vancouver (Canada), 15-19 février 2026 ; ISBN 9781510697959.** | [SPIE Digital Library](https://www.spiedigitallibrary.org/conference-proceedings-of-spie/13929/139292J/Automated-classification-of-skeletal-facial-asymmetry-in-CBCT-using-a/10.1117/12.3087010.full) — payant (`oa_status: closed` chez Unpaywall et OpenAlex) ; le résumé est libre sur la [page SPIE](https://spie.org/medical-imaging/presentation/Automated-classification-of-skeletal-facial-asymmetry-in-CBCT-using-a/13929-89) | [10.1117/12.3087010](https://doi.org/10.1117/12.3087010) |
| Buisson A. « Automated Classification of Facial Asymmetry, Identification of Regional Asymmetry Patterns ». Poster, 104ᵉ General Session de l'IADR / 55ᵉ AADOCR / 50ᵉ CADR, San Diego, 25-28 mars 2026. | Recensé par l'[UNC Adams School of Dentistry](https://dentistry.unc.edu/2026/03/31/annual-meeting-highlights-asod-research-accomplishments/) ; résumé à chercher dans les [archives IADR](https://iadr.abstractarchives.com/) | — |
| AlHadidi A, Cevidanes LH, Mol A, Ludlow J, Styner M. « Comparison of two methods for quantitative assessment of mandibular asymmetry using cone beam computed tomography image volumes ». *Dentomaxillofacial Radiology*, 2011, 40(6), 351-357. | [PMC3277847](https://pmc.ncbi.nlm.nih.gov/articles/PMC3277847/) (manuscrit auteur, lisible en ligne ; pas de texte intégral via l'API Europe PMC) | [10.1259/dmfr/13993523](https://doi.org/10.1259/dmfr/13993523) |
| Cevidanes LH, AlHadidi A, Paniagua B, Styner M, Ludlow J, Mol A, Turvey T, Proffit WR, Rossouw PE. « Three-dimensional quantification of mandibular asymmetry through cone-beam computerized tomography ». *Oral Surg Oral Med Oral Pathol Oral Radiol Endod*, 2011, 111(6), 757-770. | [PMC3095695](https://pmc.ncbi.nlm.nih.gov/articles/PMC3095695/) | [10.1016/j.tripleo.2011.02.002](https://doi.org/10.1016/j.tripleo.2011.02.002) |
| AlHadidi A, Cevidanes LH, Paniagua B, Cook R, Festy F, Tyndall D. « 3D quantification of mandibular asymmetry using the SPHARM-PDM tool box ». *Int J Comput Assist Radiol Surg*, 2012, 7(2), 265-271. | [PMC4044820](https://pmc.ncbi.nlm.nih.gov/articles/PMC4044820/) | [10.1007/s11548-011-0665-2](https://doi.org/10.1007/s11548-011-0665-2) |
| Paniagua B, AlHadidi A, Cevidanes L, Styner M, Oguz I. « Mandibular asymmetry characterization using generalized tensor-based morphometry ». *Proc IEEE Int Symp Biomed Imaging (ISBI)*, 2011, 1175-1178. | [PMC3892912](https://pmc.ncbi.nlm.nih.gov/articles/PMC3892912/) | [10.1109/isbi.2011.5872611](https://doi.org/10.1109/isbi.2011.5872611) |
| Ruellas AC, Tonello C, Gomes LR, Yatabe MS, Macron L, Lopinto J, Goncalves JR, Garib Carreira DG, Alonso N, Souki BQ, Coqueiro RS, Cevidanes LH. « Common 3-dimensional coordinate system for assessment of directional changes ». *AJODO*, 2016, 149(5), 645-656. | [PMC4959834](https://pmc.ncbi.nlm.nih.gov/articles/PMC4959834/) | [10.1016/j.ajodo.2015.10.021](https://doi.org/10.1016/j.ajodo.2015.10.021) |
| Anchling L, Hutin N, Huang Y, Barone S, Roberts S, Miranda F, Gurgel M, Al Turkestani N, Tinawi S, Bianchi J, Yatabe M, Ruellas A, Prieto JC, Cevidanes L. « Automated Orientation and Registration of Cone-Beam Computed Tomography Scans ». *LNCS* 14242 (CLIP 2023 / MICCAI), 43-58. | [PMC11104011](https://pmc.ncbi.nlm.nih.gov/articles/PMC11104011/) (manuscrit auteur lisible ; le PDF direct est bloqué) | [10.1007/978-3-031-45249-9_5](https://doi.org/10.1007/978-3-031-45249-9_5) |
| Bianchi J, Paniagua B, De Oliveira Ruellas AC, Fillion-Robin JC, Prieto JC, *et al.*, Cevidanes L. « 3D Slicer Craniomaxillofacial Modules Support Patient-Specific Decision-Making for Personalized Healthcare in Dental Research ». *LNCS* 12445 (ML-CDS / CLIP 2020, MICCAI), 44-53. | [PMC7786614](https://pmc.ncbi.nlm.nih.gov/articles/PMC7786614/) | [10.1007/978-3-030-60946-7_5](https://doi.org/10.1007/978-3-030-60946-7_5) |

Les pages NA-MIC Project Week de AQ3DC, librement consultables, documentent la
brique de mesure :
[PW37 (2022)](https://projectweek.na-mic.org/PW37_2022_Virtual/Projects/AutomaticQuantitative3DCephalometrics/),
[PW38 (2023)](https://projectweek.na-mic.org/PW38_2023_GranCanaria/Projects/AutomaticQuantitative3DCephalometrics/),
[PW39 (2023)](https://projectweek.na-mic.org/PW39_2023_Montreal/Projects/AutomaticQuantitative3DCephalometrics/).
Il n'existe **pas** de page Project Week consacrée à VFACE ; le module apparaît
seulement, en illustration, sur la page PW45 du projet SurgMovPred.

## Voisinage

Ces travaux **ne décrivent pas le code de VFACE**. Ils éclairent le problème.

- **La méthode du miroir, chez ce même groupe.** AlHadidi 2011 (DMFR) compare
  frontalement les deux stratégies : miroir sur un plan mid-sagittal défini par
  landmarks, *versus* miroir sur un plan arbitraire suivi d'un recalage voxel
  sur la base du crâne. Cevidanes 2011 (OOOOE) valide les deux sur données
  simulées. AlHadidi 2012 ajoute SPHARM-PDM, Paniagua 2011 la morphométrie
  tensorielle. **C'est la seconde stratégie — miroir puis recalage voxel — que
  VFACE implémente** (AutoMatrix applique `Matrix_mirror.tfm`, AREG-CBCT recale
  ensuite sur CB/MAX/MAND). Aucun de ces papiers n'évoque de classifieur : ils
  produisent des cartes de distance, pas des étiquettes.
- **Le repère de mesure.** Ruellas 2016 (AJODO) pose le système de coordonnées
  commun (Frankfort / mid-sagittal / transporionique) et les conventions de
  signe AP-SI-RL dont dépendent les mesures que VFACE extrait via AQ3DC.
- **Les briques automatiques.** Gillot 2023 décrit ALI-CBCT (identification des
  landmarks), Anchling 2023 décrit ASO + AREG-CBCT (orientation et recalage),
  Bianchi 2020 décrit l'ensemble des modules craniomaxillofaciaux de 3D Slicer.
  VFACE les appelle ; il n'en est pas l'objet.
- **L'état de l'art hors du groupe.** Peng 2026 (*European Journal of
  Orthodontics*) est une revue systématique de l'évaluation automatisée de
  l'asymétrie faciale 3D. Elle situe les approches par miroir parmi les autres ;
  elle ne porte pas sur VFACE, publié après.

## Complément : trois textes amont récupérés après coup

Les manuscrits auteur NIH renvoient un `fullTextXML` vide chez Europe PMC, ce qui
les avait fait classer « à consulter ». La voie `efetch` les sert :

```
curl -sL "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=<numéro sans PMC>"
```

Trois d'entre eux sont donc maintenant dans ce dossier, en `.xml` (JATS) et `.txt` :

| Fichier | Référence | PMCID |
|---|---|---|
| `2011_Cevidanes_3D_quantification_mandibular_asymmetry` | Cevidanes L. *et al.*, *Oral Surg Oral Med Oral Pathol Oral Radiol Endod*, 2011 | PMC3095695 |
| `2011_Paniagua_mandibular_asymmetry_tensor_morphometry` | Paniagua B. *et al.*, *Proc IEEE ISBI*, 2011 | PMC3892912 |
| `2020_Bianchi_3DSlicer_CMF_decision_support` | Bianchi J. *et al.*, *Multimodal Learning for Clinical Decision Support*, 2020 | PMC7786614 |

Ce sont les travaux d'amont sur la quantification de l'asymétrie mandibulaire et
sur les modules Slicer craniomaxillofaciaux — le socle méthodologique de VFACE,
pas sa description.

Restent hors de portée, `body` vide ou absent même par `efetch` : PMC3277847
(AlHadidi, comparaison des deux méthodes de miroir), PMC4044820 et PMC4959834.
Ils restent à lire en ligne.
