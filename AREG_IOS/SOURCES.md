# AREG_IOS — sources

L'outil est **publié**, une fois : *AReg IOS: Automatic Registration on
IntraOralScans* (ShapeMI 2023, LNCS 14350). Le papier décrit la voie palatine
automatique. Le code du dépôt s'en écarte sur deux points signalés dans la fiche :
l'alignement initial par centroïdes de couronnes est remonté dans `PRE_ASO_IOS` +
`StartByMatchingCentroidsOn()`, et la **voie MGL (ligne mucogingivale) n'apparaît
nulle part dans le papier** — c'est un développement interne postérieur, non
publié. Le papier de référence est payant chez Springer et n'a **aucune version
auteur déposée** (Unpaywall : `closed`, pas de copie en dépôt ; rien dans PMC,
Europe PMC, HAL ; Deep Blue inaccessible aux robots, à vérifier à la main).

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2021_Boubolo_FlyBy_CNN_surface_segmentation.xml` / `.txt` | Boubolo L, Dumont M, Brosset S, Bianchi J, Ruellas A, Gurgel ML, Massaro C, Aliaga-Del Castillo A, Ioshida M, Yatabe MS, Benavides E, Rios H, Soki F, Neiva G, Paniagua B, Cevidanes L, Styner M, Prieto JC. « FlyBy CNN: a 3D surface segmentation framework ». *Proc. SPIE 11596, Medical Imaging 2021: Image Processing*, 115962B, 2021. | proceedings SPIE, texte intégral PMC (manuscrit auteur) | [10.1117/12.2582205](https://doi.org/10.1117/12.2582205) — PMC7983301 |
| `2023_Leclercq_DentalModelSeg_intraoral_surfaces.xml` / `.txt` | Leclercq M, Ruellas A, Gurgel M, Yatabe M, Bianchi J, Cevidanes L, Styner M, Paniagua B, Prieto JC. « DentalModelSeg: Fully Automated Segmentation of Upper and Lower 3D Intra-Oral Surfaces ». *2023 IEEE 20th International Symposium on Biomedical Imaging (ISBI)*, Carthagène, Colombie, 18–21 avril 2023, p. 1–5. | proceedings IEEE, texte intégral PMC (manuscrit auteur) | [10.1109/ISBI53787.2023.10230397](https://doi.org/10.1109/ISBI53787.2023.10230397) — PMC10949221 |
| `2017_Vasilakos_superimposition_palatal_structures.pdf` | Vasilakos G, Schilling R, Halazonetis D, Gkantidis N. « Assessment of different techniques for 3D superimposition of serial digital maxillary dental casts on palatal structures ». *Scientific Reports* 2017;7:5838. | article, accès libre (gold) | [10.1038/s41598-017-06013-5](https://doi.org/10.1038/s41598-017-06013-5) |
| `2019_Garib_palatal_rugae_superimposition.xml` / `.txt` | Garib D, Miranda F, Yatabe MS, Lauris JRP, Massaro C, McNamara JA, Kim-Berman H, Janson G, Behrents RG, Cevidanes LHS, de Oliveira Ruellas AC. « Superimposition of maxillary digital models using the palatal rugae: does ageing affect the reliability? ». *Orthodontics & Craniofacial Research* 2019;22(3):183–193. | article, texte intégral PMC (manuscrit auteur) | [10.1111/ocr.12309](https://doi.org/10.1111/ocr.12309) — PMC6642031 |
| `2022_AliagaDelCastillo_maxillary_model_registration.xml` / `.txt` | Aliaga-Del Castillo A, Vilanova L, Janson G, Arriola-Guillén LE, Garib D, Miranda F, Massaro C, Yatabe M, Cevidanes L, Ruellas AC. « Comparison and reproducibility of three methods for maxillary digital dental model registration in open bite patients ». *Orthodontics & Craniofacial Research* 2022;25(2):269–279. | article, texte intégral PMC (manuscrit auteur) | [10.1111/ocr.12535](https://doi.org/10.1111/ocr.12535) — PMC8934310 |

Les deux premiers sont la brique amont directe : `CrownSegmentationcli` /
`dentalmodelseg`, qui numérote les couronnes (`Universal_ID`) avant tout recalage.
DentalModelSeg est la suite de Fly-by-CNN, même équipe, même principe multi-vues.

Les trois derniers ne décrivent pas AREG_IOS mais justifient le **choix de la
région palatine** comme zone stable de superposition ; les deux derniers sont du
même groupe (Cevidanes / Ruellas) et sont cités par le papier AReg IOS.

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| **Hutin N, Anchling L, Cevidanes L, Miranda F, Curado D, Gurgel M, Barone S, Bianchi J, Al Turkestani N, Ruellas A, Eason M, Mavani K, Prieto JC, Aliaga A. « AReg IOS: Automatic Registration on IntraOralScans ». In : *Shape in Medical Imaging — ShapeMI 2023, tenu conjointement à MICCAI 2023, Vancouver, 8 octobre 2023*, Lecture Notes in Computer Science vol. 14350, Springer, 2023, p. 223–235.** | [link.springer.com](https://link.springer.com/chapter/10.1007/978-3-031-46914-5_18) — payant, aucune version auteur déposée | [10.1007/978-3-031-46914-5_18](https://doi.org/10.1007/978-3-031-46914-5_18) |
| Eason M, Tai SK, Loh CT, Del Castillo AA, Teixeira R, Hutin N, Leroux G, Gurgel ML, Mattos CT, de Oliveira Ruellas AC, Barkley M, Hannapel E, Cevidanes L. « Three-dimensional assessment of tooth movements in clear aligner treatment of moderate and severe crowding ». *Clinical Oral Investigations* 2025;29:6. — **seul article qui cite AReg IOS à ce jour** ; 46 patients superposés « using the Slicer Automated Dental Tools module ». C'est l'usage clinique de ce code. | [link.springer.com](https://doi.org/10.1007/s00784-025-06657-y) — payant | [10.1007/s00784-025-06657-y](https://doi.org/10.1007/s00784-025-06657-y) |
| Ioshida M, Muñoz BA, Rios H, Cevidanes L, Aristizabal JF, Rey D, Kim-Berman H, Yatabe M, Benavides E, Alvarez MA, Volk S, Ruellas AC. « Accuracy and reliability of mandibular digital model registration with use of the mucogingival junction as the reference ». *Oral Surgery, Oral Medicine, Oral Pathology and Oral Radiology* 2019;127(4):351–360. — **la validation clinique de la ligne mucogingivale comme région de référence mandibulaire**, par le même groupe. C'est l'antécédent méthodologique de la voie MGL du code, mais l'article décrit une procédure manuelle/semi-automatique, pas ce module. | [sciencedirect](https://doi.org/10.1016/j.oooo.2018.10.003) — payant | [10.1016/j.oooo.2018.10.003](https://doi.org/10.1016/j.oooo.2018.10.003) |
| Leroux G, Allemang D, Claret J, Prieto JC, Pieper S, Mattos C, Cevidanes L. « Bridging the gap: enabling PyTorch3D and advanced dental imaging tools on Windows through WSL2 ». *Proc. SPIE 13406, Medical Imaging 2025: Image Processing*, 2025. — porte sur le déploiement (conda/WSL2/pytorch3d) dont dépend AREG_IOS, pas sur l'algorithme. | [SPIE](https://doi.org/10.1117/12.3046805) — payant | [10.1117/12.3046805](https://doi.org/10.1117/12.3046805) |
| NA-MIC Project Week 39 (Montréal, 2023), projet « Automatic Registration Intra Oral Scan » — Hutin, Anchling, Cevidanes, Barone, Prieto, Bianchi, Gurgel, Al Turkestani, Miranda, Curado, Mavani, Eason, Aliaga-Del Castillo. Rapport de projet : « entraîner un réseau à identifier une région d'intérêt sur le palais, puis ICP », jeu d'entraînement avec et sans extractions, patients en croissance et non. | [projectweek.na-mic.org](https://projectweek.na-mic.org/PW39_2023_Montreal/Projects/AutomaticRegistration_IOS/) | — |

## Voisinage

Travaux proches qui **ne décrivent pas ce code**.

- Gillot M, Miranda F, Baquero B, Ruellas A, Gurgel M, Al Turkestani N, Anchling L, Hutin N, Biggs E, Yatabe M, Paniagua B, Fillion-Robin JC, Allemang D, Bianchi J, Cevidanes L, Prieto JC. « Automatic landmark identification in cone-beam computed tomography ». *Orthodontics & Craniofacial Research* 2023;26(4):560–567. [10.1111/ocr.12642](https://doi.org/10.1111/ocr.12642) — ALI côté CBCT. AREG_IOS n'utilise pas ALI_CBCT ; c'est le pendant volumique d'ALI_IOS.
- Anchling L, Hutin N, Huang Y, Barone S, Roberts S, Miranda F, Gurgel M, Al Turkestani N, Tinawi S, Bianchi J, Yatabe M, Ruellas A, Prieto JC, Cevidanes L. « Automated Orientation and Registration of Cone-Beam Computed Tomography Scans ». LNCS 14242, 2023, p. 43–58. [10.1007/978-3-031-45249-9_5](https://doi.org/10.1007/978-3-031-45249-9_5) — PMC11104011, texte intégral libre. Même famille AREG, **modalité différente** (CBCT, pas IOS) ; c'est AREG_CBCT, pas ce module.
- **ALI_IOS**, le réseau qui prédit les 13 landmarks mucogingivaux de la voie MGL, n'a **pas de publication**. La seule description publique est la page NA-MIC Project Week 36 (2022) « ALIIOS — Automatic Landmarks Identification for Intra Oral Scans » (Baquero, Gillot, Cevidanes, Prieto) : [projectweek.na-mic.org](https://projectweek.na-mic.org/PW36_2022_Virtual/Projects/ALIDDM/). Elle ne cite aucune publication.

## Ce qui a été cherché sans rien trouver

Crossref, OpenAlex, Europe PMC (`AReg IOS`, `IntraOralScans`, `AUTH:Hutin N`),
Unpaywall, HAL/DUMAS, arXiv, dépôts NA-MIC Project Week 36 à 43, recherche web
sur les abstracts IADR/AADOCR. Aucun travail publié sur la **voie MGL** ni sur les
chiffres « 4.2 mm vs 1.2 mm sur 364 prédictions » cités dans les commentaires du
code. Aucune version auteur d'AReg IOS en accès ouvert : le seul endroit restant à
vérifier à la main est Deep Blue (deepblue.lib.umich.edu), inaccessible par script.
