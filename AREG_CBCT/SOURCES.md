# AREG_CBCT — sources

AREG_CBCT est publié **une seule fois**, dans un chapitre d'actes d'atelier
MICCAI (LNCS 14242, 2023) qu'il partage avec ASO : le même texte décrit
l'orientation (ASO) *et* le recalage (AREG). Ce chapitre est payant chez
Springer, mais le **manuscrit auteur est librement lisible sur PMC**
(PMC11104011) ; PMC bloque en revanche le téléchargement automatisé du PDF, il
n'a donc pas pu être déposé ici (voir « À consulter en ligne »).

**Le code a divergé du papier** sur trois points : le papier décrit un recalage
voxel-based en deux passes (image complète puis image masquée, 10 000
itérations) là où le code n'exécute plus qu'une passe masquée à 1500 itérations,
il annonce SimpleElastix là où le code utilise `itk-elastix`, et il obtient ses
masques d'AMASSS en version UNETR/MONAI alors qu'AMASSS est aujourd'hui un
nnU-Net v2. Lire le chapitre comme la description du module tel qu'il tourne
serait donc une erreur.

Aucune publication ne décrit les pauses de revue ni la navigation batch :
développement interne.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2024_Barone_VSP_ClasseIII_voxel_based.xml` / `.txt` | Barone S., Cevidanes L., Miranda F., Gurgel M.L., Anchling L., Hutin N., Bianchi J., Goncalves J.R., Giudice A. *Enhancing skeletal stability and Class III correction through active orthodontist engagement in virtual surgical planning: A voxel-based 3-dimensional analysis.* American Journal of Orthodontics and Dentofacial Orthopedics, 165(3):321-331, 2024. | Article de revue, texte intégral JATS (Europe PMC) + texte brut — licence CC-BY | [10.1016/j.ajodo.2023.09.016](https://doi.org/10.1016/j.ajodo.2023.09.016) — PMID 38010236, PMCID **PMC10923113** |
| `2022_Gillot_AMASSS_skull_segmentation.pdf` | Gillot M., Baquero B., Le C., Deleat-Besson R., Bianchi J., Ruellas A., Gurgel M., Yatabe M., Al Turkestani N., Najarian K., Soroushmehr R., Pieper S., Kikinis R., Paniagua B., Gryak J., Ioshida M., Massaro C., Gomes L., Oh H., Evangelista K., Chaves Junior C.M., Garib D., Costa F., Benavides E., Soki F., Fillion-Robin J.-C., Joshi H., Cevidanes L., Prieto J.C. *Automatic multi-anatomical skull structure segmentation of cone-beam computed tomography scans using 3D UNETR.* PLOS ONE, 17(10):e0275033, 2022. | Article de revue, PDF éditeur (CC-BY) | [10.1371/journal.pone.0275033](https://doi.org/10.1371/journal.pone.0275033) — PMID 36223330, PMCID PMC9555672 |
| `2016_Ruellas_mandibular_regions_reference.pdf` | Ruellas A.C.O., Yatabe M.S., Souki B.Q., Benavides E., Nguyen T., Luiz R.R., Franchi L., Cevidanes L.H.S. *3D Mandibular Superimposition: Comparison of Regions of Reference for Voxel-Based Registration.* PLOS ONE, 11(6):e0157625, 2016. | Article de revue, PDF éditeur (CC-BY) | [10.1371/journal.pone.0157625](https://doi.org/10.1371/journal.pone.0157625) — PMID 27336366, PMCID PMC4919005 |
| `2016_Ruellas_maxillary_regions_reference.pdf` | Ruellas A.C.O., Huanca Ghislanzoni L.T., Gomes M.R., Danesi C., Lione R., Nguyen T., McNamara J.A., Cozza P., Franchi L., Cevidanes L.H.S. *Comparison and reproducibility of 2 regions of reference for maxillary regional registration with cone-beam computed tomography.* American Journal of Orthodontics and Dentofacial Orthopedics, 149(4):533-542, 2016. | Article de revue, version auteur déposée (Archive ouverte UNIGE) | [10.1016/j.ajodo.2015.09.026](https://doi.org/10.1016/j.ajodo.2015.09.026) — PMID 27021458, PMCID PMC4817360 — [unige:104234](https://archive-ouverte.unige.ch/unige:104234) |
| `2011_Nada_voxel_based_cranial_base.pdf` | Nada R.M., Maal T.J.J., Breuning K.H., Bergé S.J., Mostafa Y.A., Kuijpers-Jagtman A.M. *Accuracy and reproducibility of voxel based superimposition of cone beam computed tomography models on the anterior cranial base and the zygomatic arches.* PLOS ONE, 6(2):e16520, 2011. | Article de revue, PDF éditeur (CC-BY) | [10.1371/journal.pone.0016520](https://doi.org/10.1371/journal.pone.0016520) — PMID 21347419, PMCID PMC3036654 |
| `2020_PonceGarcia_measurement_error_superimposition.xml` / `.txt` | Ponce-Garcia C., Ruellas A.C.O., Cevidanes L.H.S., Flores-Mir C., Carey J.P., Lagravere-Vich M. *Measurement error and reliability of three available 3D superimposition methods in growing patients.* Head & Face Medicine, 16(1):1, 2020. | Article de revue, texte intégral JATS (Europe PMC) + texte brut — CC-BY | [10.1186/s13005-020-0215-7](https://doi.org/10.1186/s13005-020-0215-7) — PMID 31987041, PMCID PMC6983972 |

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| **Anchling L., Hutin N., Huang Y., Barone S., Roberts S., Miranda F., Gurgel M., Al Turkestani N., Tinawi S., Bianchi J., Yatabe M., Ruellas A., Prieto J.C., Cevidanes L. *Automated Orientation and Registration of Cone-Beam Computed Tomography Scans.* Lecture Notes in Computer Science 14242, Springer, Cham, 2023, p. 43-58.** Actes conjoints de **CLIP 2023** (12th International Workshop on Clinical Image-Based Procedures), FAIMI 2023 et EPIMI 2023, tenus avec MICCAI 2023, Vancouver, 8-12 octobre 2023. Éd. Wesarg, Puyol Antón, Baxter *et al.* ISBN 978-3-031-45248-2 / 978-3-031-45249-9. **Le papier de référence du module.** | Manuscrit auteur **gratuit** : [PMC11104011](https://pmc.ncbi.nlm.nih.gov/articles/PMC11104011/) (fichier `nihms-1991406.pdf`, PMC bloque le téléchargement par script) et [Europe PMC](https://europepmc.org/articles/PMC11104011). Version éditeur payante : [Springer](https://link.springer.com/chapter/10.1007/978-3-031-45249-9_5). PMID [38770027](https://pubmed.ncbi.nlm.nih.gov/38770027/) | [10.1007/978-3-031-45249-9_5](https://doi.org/10.1007/978-3-031-45249-9_5) |
| Huang Y., Anchling L., Bates W.R., Gillot M., Prieto J.C., Nguyen T., Barone S., Miranda F., Gurgel M., Yatabe M., Evangelista K., Larson B.E., Bianchi J., de Oliveira Ruellas A.C., Cevidanes L. *Automated artificial intelligence-driven 3-dimensional craniofacial superimposition for clinically useful treatment outcomes in growing patients: A multicenter study.* American Journal of Orthodontics and Dentofacial Orthopedics, 169(6):753-765, 2026. **La validation clinique du recalage automatisé** : 22 patients de Classe II, CBCT T1/T2, comparaison de trois niveaux d'automatisation (conventionnel, semi-automatique, entièrement automatique) sur la base du crâne et sur les régions de référence maxillaire et mandibulaire. Écarts moyens T2-T1 de -0,3 à 0,7 mm en base du crâne, -1,7 à 1,1 mm en recalage régional ; la plupart des écarts absolus sous 1,5 mm et 1,5°. | Manuscrit auteur gratuit : [PMC12925080](https://pmc.ncbi.nlm.nih.gov/articles/PMC12925080/). PMID [41721812](https://pubmed.ncbi.nlm.nih.gov/41721812/) | [10.1016/j.ajodo.2025.12.013](https://doi.org/10.1016/j.ajodo.2025.12.013) |
| Cevidanes L.H.S., Bailey L.J., Tucker G.R., Styner M.A., Mol A., Phillips C.L., Proffit W.R., Turvey T. *Superimposition of 3D cone-beam CT models of orthognathic surgery patients.* Dentomaxillofacial Radiology, 34(6):369-375, 2005. La référence historique du laboratoire sur la superposition voxel-based en base du crâne. | Manuscrit auteur gratuit : [PMC3552302](https://pmc.ncbi.nlm.nih.gov/articles/PMC3552302/). PMID [16227481](https://pubmed.ncbi.nlm.nih.gov/16227481/) | [10.1259/dmfr/17102411](https://doi.org/10.1259/dmfr/17102411) |
| Gurgel M., Alvarez M.A., Aristizabal J.F., Baquero B., Gillot M., Al Turkestani N., Miranda F., Aliaga-Del Castillo A., Bianchi J., de Oliveira Ruellas A.C., Ioshida M., Yatabe M., Rey D., Prieto J., Cevidanes L. *Automated artificial intelligence-based three-dimensional comparison of orthodontic treatment outcomes with and without piezocision surgery.* Orthodontics & Craniofacial Research, 27(2):321-331, 2024. Application clinique de la chaîne automatisée du laboratoire (CBCT + IOS). CC-BY-NC-ND chez Wiley, mais Wiley renvoie 403 aux scripts. | [Wiley](https://onlinelibrary.wiley.com/doi/10.1111/ocr.12737), [PMC10949222](https://pmc.ncbi.nlm.nih.gov/articles/PMC10949222/) | [10.1111/ocr.12737](https://doi.org/10.1111/ocr.12737) |

## Voisinage

Ces travaux **ne décrivent pas AREG_CBCT** ; ils fondent ou entourent la
méthode.

- **Cevidanes 2005 (DMFR)** et **Nada 2011 (PLOS ONE)** : la superposition
  voxel-based sur la base antérieure du crâne. Attention, contrairement à ce que
  laisse entendre la fiche `AREG_CBCT.md`, le papier PLOS ONE 2011 n'est **pas**
  du laboratoire Cevidanes : il est signé Nada, Maal, Kuijpers-Jagtman *et al.*
  (Radboud UMC, Nimègue). C'est une validation indépendante de la méthode, ce qui
  la rend plus utile, pas moins.
- **Ruellas 2016 (mandibule)** et **Ruellas 2016 (maxillaire)** : les deux
  articles qui ont fixé les **régions de référence** utilisées par le recalage
  régional — corps mandibulaire / symphyse d'un côté, région palatine de l'autre.
  Ce sont eux qui justifient les masques passés à AREG, pas le chapitre LNCS.
- **Ponce-Garcia 2020 (Head & Face Medicine)** : erreur de mesure et
  reproductibilité de trois méthodes de superposition 3D chez le patient en
  croissance. Ne teste aucun outil de ce dépôt ; donne l'ordre de grandeur de
  l'erreur à laquelle comparer AREG.
- **Gillot 2022 (AMASSS)** : le segmenteur qui produit les masques de région de
  référence consommés par AREG. Décrit la version UNETR, **plus celle qui
  tourne** (nnU-Net v2 aujourd'hui) — voir `../AMASSS/SOURCES.md`.
- **Barone 2024 (AJODO)** : chirurgie orthognathique de Classe III, analyse
  voxel-based ; l'article indique explicitement que « des outils automatisés
  fondés sur l'apprentissage profond ont été utilisés pour l'orientation, le
  recalage, la segmentation osseuse et l'identification des landmarks » des CBCT
  dans 3D Slicer. C'est un usage clinique de la chaîne ASO + AREG + AMASSS + ALI,
  pas une validation de l'outil.
- Pages NA-MIC Project Week, sans DOI, utiles pour dater les étapes :
  [PW39 2023 Montréal — Automated Registration of CBCT](https://projectweek.na-mic.org/PW39_2023_Montreal/Projects/AutomatedRegistrationCBCT/)
  (Anchling, Hutin, Gurgel, Barone, Miranda, Roberts, Prieto, Cevidanes) et
  [PW40 2024 Gran Canaria — maintenance](https://projectweek.na-mic.org/PW40_2024_GranCanaria/Projects/AutomatedRegistrationOfConeBeanComputedTomographyScansMaintenance/)
  (Claret, Leroux, Caleme, Mattos, Cevidanes, Prieto).
- Dépôts de code, sans DOI : [lucanchling/AREG](https://github.com/lucanchling/AREG),
  [DCBIA-OrthoLab/SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools).

### Ce qui a été cherché sans rien trouver

- **Version auteur en libre accès du chapitre LNCS** ailleurs que sur PMC :
  Deep Blue (University of Michigan), HAL/DUMAS (aucune entrée Anchling en
  imagerie médicale), Unpaywall et OpenAlex ne connaissent que la copie PMC.
- **Posters ou abstracts IADR / AADOCR / AAO** spécifiquement sur AREG CBCT :
  rien d'indexé dans Europe PMC, Crossref ou OpenAlex. Les abstracts IADR ne sont
  pas déposés avec DOI ; s'il en existe, il faut passer par l'archive d'abstracts
  de l'IADR, hors de portée d'une recherche automatique.
- **Thèse ou mémoire de Luc Anchling** : rien sur HAL, DUMAS ni Deep Blue.
- **Publication décrivant le passage de SimpleElastix à itk-elastix, la
  suppression de la seconde passe de recalage, ou les pauses de revue** : rien.

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
