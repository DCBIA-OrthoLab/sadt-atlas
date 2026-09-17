# ASO — sources

**ASO_CBCT est publié**, dans un chapitre d'actes d'atelier MICCAI (LNCS 14242,
2023) qu'il partage avec AREG_CBCT : le même texte décrit l'orientation (ASO)
*et* le recalage (AREG). Le chapitre est payant chez Springer, mais le
**manuscrit auteur est librement lisible sur PMC** (PMC11104011) ; PMC bloque le
téléchargement automatisé du PDF, il n'a donc pas pu être déposé ici (voir « À
consulter en ligne »). **ASO_IOS n'a pas de papier propre** : le texte publié le
plus proche est *AReg IOS* (Hutin *et al.*, LNCS 14350, 2023), qui décrit
l'alignement initial par centroïdes de dents communs, c'est-à-dire `PrePreAso`.

La description ASO_CBCT du chapitre correspond au code (landmarks ALI_CBCT,
alignement de 3 landmarks puis raffinement ICP) ; le pré-orienteur DenseNet,
absent du papier, n'est effectivement plus branché. Attention en revanche au
volet AREG du même chapitre : **il ne décrit plus le code de recalage** (une
passe au lieu de deux, `itk-elastix` au lieu de SimpleElastix, AMASSS en nnU-Net
v2 au lieu d'UNETR) — détail dans `../AREG_CBCT/SOURCES.md`.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2023_Gillot_ALI_CBCT_landmark_identification.xml` / `.txt` | Gillot M., Miranda F., Baquero B., Ruellas A., Gurgel M., Al Turkestani N., Anchling L., Hutin N., Biggs E., Yatabe M., Paniagua B., Fillion-Robin J.-C., Allemang D., Bianchi J., Cevidanes L., Prieto J.C. *Automatic landmark identification in cone-beam computed tomography.* Orthodontics & Craniofacial Research, 26(4):560-567, 2023. | Article de revue, texte intégral JATS (Europe PMC) + texte brut — CC-BY-NC-ND | [10.1111/ocr.12642](https://doi.org/10.1111/ocr.12642) — PMID 36811276, PMCID **PMC10440369** |
| `2016_Ruellas_common_coordinate_system.pdf` | Ruellas A.C.O., Tonello C., Gomes L.R., Yatabe M.S., Macron L., Lopinto J., Goncalves J.R., Garib Carreira D.G., Alonso N., Souki B.Q., Coqueiro R.S., Cevidanes L.H.S. *Common 3-dimensional coordinate system for assessment of directional changes.* American Journal of Orthodontics and Dentofacial Orthopedics, 149(5):645-656, 2016. | Article de revue, version déposée (Repositório UNESP) | [10.1016/j.ajodo.2015.10.021](https://doi.org/10.1016/j.ajodo.2015.10.021) — PMID 27131246, PMCID PMC4959834 — [hdl 11449/161503](http://hdl.handle.net/11449/161503) |
| `2024_Barone_VSP_ClasseIII_voxel_based.xml` / `.txt` | Barone S., Cevidanes L., Miranda F., Gurgel M.L., Anchling L., Hutin N., Bianchi J., Goncalves J.R., Giudice A. *Enhancing skeletal stability and Class III correction through active orthodontist engagement in virtual surgical planning: A voxel-based 3-dimensional analysis.* American Journal of Orthodontics and Dentofacial Orthopedics, 165(3):321-331, 2024. | Article de revue, texte intégral JATS (Europe PMC) + texte brut — CC-BY | [10.1016/j.ajodo.2023.09.016](https://doi.org/10.1016/j.ajodo.2023.09.016) — PMID 38010236, PMCID PMC10923113 |

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| **Anchling L., Hutin N., Huang Y., Barone S., Roberts S., Miranda F., Gurgel M., Al Turkestani N., Tinawi S., Bianchi J., Yatabe M., Ruellas A., Prieto J.C., Cevidanes L. *Automated Orientation and Registration of Cone-Beam Computed Tomography Scans.* Lecture Notes in Computer Science 14242, Springer, Cham, 2023, p. 43-58.** Actes conjoints de **CLIP 2023** (12th International Workshop on Clinical Image-Based Procedures), FAIMI 2023 et EPIMI 2023, tenus avec MICCAI 2023, Vancouver, 8-12 octobre 2023. Éd. Wesarg, Puyol Antón, Baxter *et al.* ISBN 978-3-031-45248-2 / 978-3-031-45249-9. **Le papier de référence d'ASO_CBCT.** | Manuscrit auteur **gratuit** : [PMC11104011](https://pmc.ncbi.nlm.nih.gov/articles/PMC11104011/) (fichier `nihms-1991406.pdf`, PMC bloque le téléchargement par script) et [Europe PMC](https://europepmc.org/articles/PMC11104011). Version éditeur payante : [Springer](https://link.springer.com/chapter/10.1007/978-3-031-45249-9_5). PMID [38770027](https://pubmed.ncbi.nlm.nih.gov/38770027/) | [10.1007/978-3-031-45249-9_5](https://doi.org/10.1007/978-3-031-45249-9_5) |
| Hutin N., Anchling L., Cevidanes L., Miranda F., Curado D., Gurgel M., Barone S., Bianchi J., Al Turkestani N., Ruellas A., Eason M., Mavani K., Prieto J.C., Aliaga A. *AReg IOS: Automatic Registration on IntraOralScans.* Lecture Notes in Computer Science 14350 (*Shape in Medical Imaging*, ShapeMI 2023, atelier MICCAI 2023), Springer, Cham, 2023, p. 223-235. Le texte publié le plus proche d'**ASO_IOS** : il décrit l'alignement initial par centroïdes de dents communs. Payant, aucune version auteur en libre accès (Unpaywall : `is_oa = false`). | [Springer](https://link.springer.com/chapter/10.1007/978-3-031-46914-5_18) | [10.1007/978-3-031-46914-5_18](https://doi.org/10.1007/978-3-031-46914-5_18) |
| Huang Y., Anchling L., Bates W.R., Gillot M., Prieto J.C., Nguyen T., Barone S., Miranda F., Gurgel M., Yatabe M., Evangelista K., Larson B.E., Bianchi J., de Oliveira Ruellas A.C., Cevidanes L. *Automated artificial intelligence-driven 3-dimensional craniofacial superimposition for clinically useful treatment outcomes in growing patients: A multicenter study.* American Journal of Orthodontics and Dentofacial Orthopedics, 169(6):753-765, 2026. Validation clinique multicentrique de la chaîne automatisée (orientation, segmentation, superposition) contre le voxel-based semi-automatique : 22 patients de Classe II, CBCT T1/T2. | Manuscrit auteur gratuit : [PMC12925080](https://pmc.ncbi.nlm.nih.gov/articles/PMC12925080/). PMID [41721812](https://pubmed.ncbi.nlm.nih.gov/41721812/) | [10.1016/j.ajodo.2025.12.013](https://doi.org/10.1016/j.ajodo.2025.12.013) |

## Voisinage

Ces travaux **ne décrivent pas ASO** ; ils fondent la méthode ou en montrent
l'usage.

- **Ruellas 2016, *Common 3-dimensional coordinate system***. C'est l'article qui
  définit le **système de coordonnées commun** vers lequel ASO oriente : il
  montre d'abord que l'orientation de la tête change les valeurs de déplacement
  mesurées en 3D, puis propose la construction d'un repère commun à partir de
  landmarks. Le « gold standard » d'orientation d'ASO, et les landmarks de
  référence livrés avec le module, viennent de cette convention. Il ne parle ni
  d'ASO ni d'apprentissage profond : tout y est manuel.
- **Gillot 2023, ALI_CBCT**. Le détecteur de landmarks par apprentissage par
  renforcement dont ASO_CBCT dépend pour trouver les points quelle que soit
  l'orientation d'entrée. Décrit les 32 landmarks et l'agent multi-échelle, pas
  l'étape d'orientation. Fiche propre : `../ALI/`.
- **Barone 2024 (AJODO)**. Usage clinique, pas validation : l'article indique que
  « des outils automatisés fondés sur l'apprentissage profond ont été utilisés
  pour l'orientation, le recalage, la segmentation osseuse et l'identification
  des landmarks » des CBCT dans 3D Slicer. C'est ASO + AREG + AMASSS + ALI en
  conditions réelles, sur 17 patients de Classe III opérés.
- Pages NA-MIC Project Week, sans DOI :
  [PW38 2023 Gran Canaria — ASO_CBCT](https://projectweek.na-mic.org/PW38_2023_GranCanaria/Projects/ASO_CBCT/)
  (Anchling, Hutin, Gillot, Baquero, Bianchi, Ruellas, Miranda, Barone, Gurgel,
  Yatabe, Al Turkestani, Joshi, Cevidanes, Prieto) — c'est là qu'est décrit le
  pré-orienteur « en cours de test » qui n'a jamais été branché ; et
  [PW38 — Automatic Standardize Orientation IOS](https://projectweek.na-mic.org/PW38_2023_GranCanaria/Projects/AutomaticStandardizeOrientation_IOS/)
  (Hutin, Anchling, Gurgel, Miranda, Al Turkestani, Barone, Cevidanes, Prieto),
  seule description écrite du pipeline ASO_IOS complet — pré-orientation par
  molaires et incisive, ICP sur 3 centroïdes, landmarks ALI_IOS, mode occlusion.
- Dépôts de code, sans DOI : [lucanchling/ASO](https://github.com/lucanchling/ASO),
  [DCBIA-OrthoLab/ASO](https://github.com/DCBIA-OrthoLab/ASO),
  [DCBIA-OrthoLab/SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools).

### Ce qui a été cherché sans rien trouver

- **Version auteur en libre accès du chapitre LNCS** ailleurs que sur PMC : Deep
  Blue (University of Michigan), HAL/DUMAS, Unpaywall, OpenAlex. Rien.
- **Papier propre à ASO_IOS**, et **papier sur ALI_IOS** (le détecteur de
  landmarks sur IOS utilisé par ASO_IOS) : rien dans Europe PMC, Crossref ni
  OpenAlex. Confirme la fiche.
- **Validation clinique séparée de l'orientation seule** (posters IADR / AADOCR /
  AAO, article de reproductibilité d'ASO) : rien d'indexé. Les chiffres publiés
  sur ASO restent ceux du chapitre LNCS (< 3° et < 2 mm contre experts). Les
  abstracts IADR ne portent pas de DOI ; s'il en existe, il faut passer par
  l'archive d'abstracts de l'IADR.
- **Publication décrivant le pré-orienteur DenseNet** : rien, au-delà du
  paragraphe de la page Project Week PW38.

## Comment le texte intégral a été récupéré

Le chapitre est payant chez Springer, mais le **manuscrit auteur** déposé au NIH
est libre d'accès. Deux recettes échouent dessus et une marche — noté ici pour
éviter de refaire le tour :

| Voie | Résultat sur ce PMCID |
|---|---|
| `pmc.ncbi.nlm.nih.gov/.../pdf/` | HTML anti-bot |
| API BioC `pmcoa.cgi` | « No result can be found » — elle ne sert que l'*open access subset* |
| **`eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=<numéro>`** | **JATS complet, corps inclus** |

```
curl -sL "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=11104011"
```

C'est par là que les `.xml` et `.txt` de ce dossier ont été obtenus. Le PDF mis
en page par l'éditeur, lui, reste à lire sur le site de Springer ou sur PMC.
