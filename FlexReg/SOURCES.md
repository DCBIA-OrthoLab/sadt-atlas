# FlexReg — sources

**FlexReg n'est décrit par aucune publication.** Vérification faite : rien dans
Crossref, OpenAlex, Europe PMC, arXiv, HAL, ni dans les quarante-trois semaines de
projet NA-MIC. Le nom n'apparaît publiquement que dans le README de
SlicerAutomatedDentalTools. La variante MGL (ligne mucogingivale) n'est pas
publiée non plus, et les chiffres cités dans son code (4.2 mm vs 1.2 mm sur
364 prédictions) ne sont sourcés nulle part ailleurs que dans les commentaires.

Le fondement publié est celui d'AREG_IOS, dont FlexReg est la déclinaison
interactive : **AReg IOS** (ShapeMI 2023, LNCS 14350) décrit la ROI palatine
*prédite par un réseau* ; FlexReg la fait *dessiner par l'opérateur*. Cette
variante-là n'est dans aucun papier. Le papier AReg IOS est payant et n'a aucune
version auteur déposée.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2021_Boubolo_FlyBy_CNN_surface_segmentation.xml` / `.txt` | Boubolo L, Dumont M, Brosset S, Bianchi J, Ruellas A, Gurgel ML, Massaro C, Aliaga-Del Castillo A, Ioshida M, Yatabe MS, Benavides E, Rios H, Soki F, Neiva G, Paniagua B, Cevidanes L, Styner M, Prieto JC. « FlyBy CNN: a 3D surface segmentation framework ». *Proc. SPIE 11596, Medical Imaging 2021: Image Processing*, 115962B, 2021. | proceedings SPIE, texte intégral PMC (manuscrit auteur) | [10.1117/12.2582205](https://doi.org/10.1117/12.2582205) — PMC7983301 |
| `2023_Leclercq_DentalModelSeg_intraoral_surfaces.xml` / `.txt` | Leclercq M, Ruellas A, Gurgel M, Yatabe M, Bianchi J, Cevidanes L, Styner M, Paniagua B, Prieto JC. « DentalModelSeg: Fully Automated Segmentation of Upper and Lower 3D Intra-Oral Surfaces ». *2023 IEEE 20th International Symposium on Biomedical Imaging (ISBI)*, Carthagène, Colombie, 18–21 avril 2023, p. 1–5. | proceedings IEEE, texte intégral PMC (manuscrit auteur) | [10.1109/ISBI53787.2023.10230397](https://doi.org/10.1109/ISBI53787.2023.10230397) — PMC10949221 |
| `2017_Vasilakos_superimposition_palatal_structures.pdf` | Vasilakos G, Schilling R, Halazonetis D, Gkantidis N. « Assessment of different techniques for 3D superimposition of serial digital maxillary dental casts on palatal structures ». *Scientific Reports* 2017;7:5838. | article, accès libre (gold) | [10.1038/s41598-017-06013-5](https://doi.org/10.1038/s41598-017-06013-5) |
| `2019_Garib_palatal_rugae_superimposition.xml` / `.txt` | Garib D, Miranda F, Yatabe MS, Lauris JRP, Massaro C, McNamara JA, Kim-Berman H, Janson G, Behrents RG, Cevidanes LHS, de Oliveira Ruellas AC. « Superimposition of maxillary digital models using the palatal rugae: does ageing affect the reliability? ». *Orthodontics & Craniofacial Research* 2019;22(3):183–193. | article, texte intégral PMC (manuscrit auteur) | [10.1111/ocr.12309](https://doi.org/10.1111/ocr.12309) — PMC6642031 |
| `2022_AliagaDelCastillo_maxillary_model_registration.xml` / `.txt` | Aliaga-Del Castillo A, Vilanova L, Janson G, Arriola-Guillén LE, Garib D, Miranda F, Massaro C, Yatabe M, Cevidanes L, Ruellas AC. « Comparison and reproducibility of three methods for maxillary digital dental model registration in open bite patients ». *Orthodontics & Craniofacial Research* 2022;25(2):269–279. | article, texte intégral PMC (manuscrit auteur) | [10.1111/ocr.12535](https://doi.org/10.1111/ocr.12535) — PMC8934310 |

Fly-by-CNN et DentalModelSeg décrivent le réseau que FlexReg appelle en amont
(`CrownSegmentationcli` / `dentalmodelseg`, §4.1 de la fiche) pour poser l'array
`Universal_ID` dont dépendent l'orientation canonique et le patch papillon.
DentalModelSeg est la suite de Fly-by-CNN : même équipe, même principe multi-vues,
architecture passée de RUNET à UNET/MONAI.

Les trois autres ne décrivent pas FlexReg. Ils justifient la **zone que
l'opérateur dessine** : ils comparent les régions palatines utilisables comme
référence stable de superposition et mesurent leur fiabilité. Les deux derniers
sont du même groupe (Cevidanes / Ruellas) et sont cités par le papier AReg IOS.

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| **Hutin N, Anchling L, Cevidanes L, Miranda F, Curado D, Gurgel M, Barone S, Bianchi J, Al Turkestani N, Ruellas A, Eason M, Mavani K, Prieto JC, Aliaga A. « AReg IOS: Automatic Registration on IntraOralScans ». In : *Shape in Medical Imaging — ShapeMI 2023, tenu conjointement à MICCAI 2023, Vancouver, 8 octobre 2023*, Lecture Notes in Computer Science vol. 14350, Springer, 2023, p. 223–235.** | [link.springer.com](https://link.springer.com/chapter/10.1007/978-3-031-46914-5_18) — payant, aucune version auteur déposée (Unpaywall `closed`, rien dans PMC/HAL) | [10.1007/978-3-031-46914-5_18](https://doi.org/10.1007/978-3-031-46914-5_18) |
| Ioshida M, Muñoz BA, Rios H, Cevidanes L, Aristizabal JF, Rey D, Kim-Berman H, Yatabe M, Benavides E, Alvarez MA, Volk S, Ruellas AC. « Accuracy and reliability of mandibular digital model registration with use of the mucogingival junction as the reference ». *Oral Surgery, Oral Medicine, Oral Pathology and Oral Radiology* 2019;127(4):351–360. — **la validation clinique de la ligne mucogingivale comme région de référence mandibulaire**, par le même groupe. C'est l'antécédent méthodologique de la voie MGL, mais la procédure décrite est manuelle ; elle ne porte pas sur ce code. | [sciencedirect](https://doi.org/10.1016/j.oooo.2018.10.003) — payant | [10.1016/j.oooo.2018.10.003](https://doi.org/10.1016/j.oooo.2018.10.003) |
| Leroux G, Allemang D, Claret J, Prieto JC, Pieper S, Mattos C, Cevidanes L. « Bridging the gap: enabling PyTorch3D and advanced dental imaging tools on Windows through WSL2 ». *Proc. SPIE 13406, Medical Imaging 2025: Image Processing*, 2025. — porte sur l'installation conda/WSL2/pytorch3d dont FlexReg dépend (`install_pytorch`, env `shapeaxi`), pas sur l'algorithme. | [SPIE](https://doi.org/10.1117/12.3046805) — payant | [10.1117/12.3046805](https://doi.org/10.1117/12.3046805) |

## Voisinage

Travaux proches qui **ne décrivent pas ce code**.

- NA-MIC Project Week 39 (Montréal, 2023), « Automatic Registration Intra Oral Scan » (Hutin, Anchling, Cevidanes, Prieto et al.) : [page projet](https://projectweek.na-mic.org/PW39_2023_Montreal/Projects/AutomaticRegistration_IOS/). Décrit AREG_IOS (réseau sur le palais + ICP), **jamais** le patch dessiné à la main.
- NA-MIC Project Week 36 (2022), « ALIIOS — Automatic Landmarks Identification for Intra Oral Scans » (Baquero, Gillot, Cevidanes, Prieto) : [page projet](https://projectweek.na-mic.org/PW36_2022_Virtual/Projects/ALIDDM/). C'est le réseau qui fournit les 13 landmarks mucogingivaux de la voie MGL de FlexReg. **ALI_IOS n'a aucune publication** ; cette page est sa seule description publique et ne cite aucune référence.
- Prieto JC et al., ShapeAXI (*Proc. SPIE Medical Imaging 2024*, PMC11085013) : le paquet pip qui embarque aujourd'hui `dentalmodelseg` et ses poids `latest`. Décrit une chaîne d'analyse de forme explicable, **pas** le modèle de segmentation utilisé ici.

## Ce qui a été cherché sans rien trouver

Recherche du nom « FlexReg » seul et associé (Slicer, Cevidanes, DCBIA, intraoral,
registration) dans Crossref, OpenAlex, Europe PMC, arXiv, HAL/DUMAS et sur le web ;
listing complet des projets NA-MIC Project Week 36 → 43 ; recherche d'abstracts
IADR/AADOCR sur le recalage d'IOS par la ligne mucogingivale. Rien. La seule trace
publique de FlexReg est le dépôt GitHub.
