# AREG_IOSCBCT — sources

**Aucune publication ne décrit ce module.** La fiche le disait, la vérification le
confirme : ni Crossref, ni OpenAlex, ni Europe PMC, ni arXiv, ni HAL, ni les
semaines de projet NA-MIC 36 à 43 ne contiennent quoi que ce soit sur un recalage
IOS↔CBCT par landmarks occlusaux + ICP sur isosurface signé par ce groupe. Les
deux projets NA-MIC intitulés « Multimodal Registration » (PW40 2024, PW41 2024)
portent sur **MRI↔CBCT**, pas sur IOS↔CBCT.

Ce qui est publié, ce sont les **briques amont** que l'orchestrateur empile devant
le CLI : ALI_CBCT pour les landmarks volumiques, DentalModelSeg pour les couronnes.
Le CLI lui-même (Procrustes + ICP + marching cubes au seuil 400) n'a pas de papier.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2023_Gillot_ALI_CBCT_landmarks.xml` / `.txt` | Gillot M, Miranda F, Baquero B, Ruellas A, Gurgel M, Al Turkestani N, Anchling L, Hutin N, Biggs E, Yatabe M, Paniagua B, Fillion-Robin JC, Allemang D, Bianchi J, Cevidanes L, Prieto JC. « Automatic landmark identification in cone-beam computed tomography ». *Orthodontics & Craniofacial Research* 2023;26(4):560–567. | article, accès libre (CC BY-NC-ND) | [10.1111/ocr.12642](https://doi.org/10.1111/ocr.12642) — PMC10440369 |
| `2021_Boubolo_FlyBy_CNN_surface_segmentation.xml` / `.txt` | Boubolo L, Dumont M, Brosset S, Bianchi J, Ruellas A, Gurgel ML, Massaro C, Aliaga-Del Castillo A, Ioshida M, Yatabe MS, Benavides E, Rios H, Soki F, Neiva G, Paniagua B, Cevidanes L, Styner M, Prieto JC. « FlyBy CNN: a 3D surface segmentation framework ». *Proc. SPIE 11596, Medical Imaging 2021: Image Processing*, 115962B, 2021. | proceedings SPIE, texte intégral PMC (manuscrit auteur) | [10.1117/12.2582205](https://doi.org/10.1117/12.2582205) — PMC7983301 |
| `2023_Leclercq_DentalModelSeg_intraoral_surfaces.xml` / `.txt` | Leclercq M, Ruellas A, Gurgel M, Yatabe M, Bianchi J, Cevidanes L, Styner M, Paniagua B, Prieto JC. « DentalModelSeg: Fully Automated Segmentation of Upper and Lower 3D Intra-Oral Surfaces ». *2023 IEEE 20th International Symposium on Biomedical Imaging (ISBI)*, Carthagène, Colombie, 18–21 avril 2023, p. 1–5. | proceedings IEEE, texte intégral PMC (manuscrit auteur) | [10.1109/ISBI53787.2023.10230397](https://doi.org/10.1109/ISBI53787.2023.10230397) — PMC10949221 |
| `2023_Anchling_orientation_registration_CBCT.xml` / `.txt` | Anchling L, Hutin N, Huang Y, Barone S, Roberts S, Miranda F, Gurgel M, Al Turkestani N, Tinawi S, Bianchi J, Yatabe M, Ruellas A, Prieto JC, Cevidanes L. « Automated Orientation and Registration of Cone-Beam Computed Tomography Scans ». *Clinical Image-Based Procedures (CLIP 2023) / FAIMI 2023 / EPIMI 2023*, Lecture Notes in Computer Science vol. 14242, Springer, 2023, p. 43–58. | chapitre LNCS, manuscrit auteur libre dans PMC | [10.1007/978-3-031-45249-9_5](https://doi.org/10.1007/978-3-031-45249-9_5) — PMC11104011 |
| `2023_Kim_registration_CBCT_intraoral_scan.pdf` | Kim YJ, Ahn JH, Lim HK, Nguyen TP, Jha N, Kim A, Yoon J. « Novel Procedure for Automatic Registration between Cone-Beam Computed Tomography and Intraoral Scan Data Supported with 3D Segmentation ». *Bioengineering* 2023;10(11):1326. | article, accès libre (CC BY) | [10.3390/bioengineering10111326](https://doi.org/10.3390/bioengineering10111326) — PMC10669060 |
| `2024_Jang_CBCT_intraoral_impressions_integration.pdf` | Jang TJ, Yun HS, Hyun CM, Kim JE, Lee SH, Seo JK. « Fully automatic integration of dental CBCT images and full-arch intraoral impressions with stitching error correction via individual tooth segmentation and identification ». *Medical Image Analysis* 2024;93:103096. (préprint arXiv:2112.01784, version 2) | préprint arXiv de l'article MedIA | [10.1016/j.media.2024.103096](https://doi.org/10.1016/j.media.2024.103096) — [arXiv:2112.01784](https://arxiv.org/abs/2112.01784) |

Les quatre premiers sont les **briques du pipeline**, pas le pipeline :

- Gillot 2023 décrit ALI_CBCT, qui fournit les 12 landmarks occlusaux côté volume
  (étapes 3 et 7 du mode Fully-Automated) ;
- Fly-by-CNN puis DentalModelSeg décrivent `CrownSegmentationcli`, qui pose
  l'array `Universal_ID` sur l'IOS — ici uniquement pour permettre à ALI_IOS de
  viser ses caméras dent par dent ;
- Anchling 2023 est le papier AREG **côté CBCT** : même famille, même dépôt
  d'origine, mais recalage **mono-modal CBCT→CBCT**. Il ne décrit pas le
  multimodal.

Les deux derniers sont du voisinage (cf. plus bas), gardés ici parce qu'ils sont
les seules descriptions complètes et librement lisibles du problème IOS↔CBCT.

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| Zheng Q, Wu Y, Chen J, Wang X, Zhou M, Li H, Lin J, Zhang W, Chen X. « Automatic multimodal registration of cone-beam computed tomography and intraoral scans: a systematic review and meta-analysis ». *Clinical Oral Investigations* 2025;29(2):97. — revue systématique du problème ; situe les approches géométriques face aux approches apprises. Ne mentionne pas ce code. | [link.springer.com](https://doi.org/10.1007/s00784-025-06183-x) — payant | [10.1007/s00784-025-06183-x](https://doi.org/10.1007/s00784-025-06183-x) |
| Elgarba BM, Fontenele RC, Ali S, Swaity A, Meeus J, Shujaat S, Jacobs R. « Validation of a novel AI-based automated multimodal image registration of CBCT and intraoral scan aiding presurgical implant planning ». *Clinical Oral Implants Research* 2024;35(11):1506–1517. — CC BY-NC mais le PDF Wiley n'est pas récupérable par script ; librement lisible sur le site. | [onlinelibrary.wiley.com](https://doi.org/10.1111/clr.14338) | [10.1111/clr.14338](https://doi.org/10.1111/clr.14338) |
| Hutin N, Anchling L, Cevidanes L et al. « AReg IOS: Automatic Registration on IntraOralScans ». LNCS vol. 14350 (ShapeMI 2023, MICCAI 2023, Vancouver), 2023, p. 223–235. — recalage IOS **longitudinal**, pas multimodal. Cité ici parce que c'est l'autre moitié publiée de la famille AREG. Payant, aucune version auteur déposée. | [link.springer.com](https://link.springer.com/chapter/10.1007/978-3-031-46914-5_18) | [10.1007/978-3-031-46914-5_18](https://doi.org/10.1007/978-3-031-46914-5_18) |

## Voisinage

Travaux qui traitent du même problème mais **ne décrivent pas ce code**.

- **Kim 2023** (`2023_Kim_registration_CBCT_intraoral_scan.pdf`) : même objectif, mais avec segmentation des dents **des deux côtés**, puis RANSAC + ICP. Erreur rapportée 0.234 ± 0.019 mm. AREG_IOSCBCT prend le chemin plus léger : landmarks au lieu de segmentation volumique, isosurface seuillée au lieu de dents segmentées.
- **Jang 2024** (`2024_Jang_CBCT_intraoral_impressions_integration.pdf`) : identification dent par dent et correction de l'erreur de recollement (stitching) de l'empreinte. Pipeline entièrement appris, sans rapport avec l'implémentation d'ici.
- **Zheng 2025** (revue systématique, ci-dessus) : contexte général.
- **ALI_IOS**, qui fournit les 12 landmarks occlusaux côté maillage (étape 8), n'a **aucune publication**. Sa seule description publique est la page NA-MIC Project Week 36 (2022) « ALIIOS — Automatic Landmarks Identification for Intra Oral Scans » (Baquero, Gillot, Cevidanes, Prieto) : [projectweek.na-mic.org](https://projectweek.na-mic.org/PW36_2022_Virtual/Projects/ALIDDM/), qui ne cite elle-même aucune référence.

## Ce qui a été cherché sans rien trouver

Crossref, OpenAlex, Europe PMC, arXiv, HAL, Unpaywall sur toutes les combinaisons
AREG / IOSCBCT / IOS-CBCT / multimodal registration + Cevidanes, Prieto, Anchling,
Hutin, Leroux, Baquero ; listing des projets NA-MIC Project Week 36 → 43 (les deux
« Multimodal Registration » sont MRI↔CBCT) ; recherche web ciblée. Rien sur la
partie multimodale IOS↔CBCT de ce dépôt.
