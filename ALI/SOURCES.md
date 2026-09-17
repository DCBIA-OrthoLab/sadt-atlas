# ALI — sources

ALI est le module le mieux publié du dépôt : chacun des deux backends a son
propre papier, et ces papiers décrivent bien le code. ALI_CBCT est couvert par
un article de revue en accès libre (Orthod Craniofac Res 2023), ALI_IOS par un
chapitre LNCS payant (CLIP 2022) dont une version auteur circule. La réserve de
la fiche est confirmée : **la voie MG (ligne mucogingivale) du code ALI_IOS
n'est décrite dans aucune publication** — ni article, ni proceedings, ni poster
IADR/AADOCR retrouvable (voir « Ce qui a été cherché pour la voie MG »).

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2023_Gillot_ALICBCT_landmark_identification.xml` / `.txt` | Gillot M, Miranda F, Baquero B, Ruellas A, Gurgel M, Al Turkestani N, Anchling L, Hutin N, Biggs E, Yatabe M, Paniagua B, Fillion-Robin JC, Allemang D, Bianchi J, Cevidanes L, Prieto JC. *Automatic landmark identification in cone-beam computed tomography.* Orthodontics & Craniofacial Research, 2023, 26(4), 560-567 | Article de revue — **le papier d'ALI_CBCT** | [10.1111/ocr.12642](https://doi.org/10.1111/ocr.12642) · PMID 36811276 · PMCID PMC10440369 · CC BY-NC-ND |
| `2022_Baquero_ALIIOS_landmark_intraoral_scans.pdf` | Baquero B, Gillot M, Cevidanes L, Al Turkestani N, Gurgel M, Leclercq M, Bianchi J, Yatabe M, Ruellas A, Massaro C, Aliaga A, Alvarez Castrillon MA, Rey D, Aristizabal JF, Prieto JC. *Automatic Landmark Identification on IntraOralScans.* In : Clinical Image-Based Procedures (CLIP 2022), Lecture Notes in Computer Science vol. 13746, Springer Cham, 2023, p. 32-42 | Chapitre de proceedings (MICCAI/CLIP) — **le papier d'ALI_IOS** | [10.1007/978-3-031-23179-7_4](https://doi.org/10.1007/978-3-031-23179-7_4) |
| `2021_Boumbolo_FlyByCNN_surface_segmentation.xml` / `.txt` | Boumbolo L, Dumont M, Brosset S, Bianchi J, Ruellas A, Gurgel M, Massaro C, Aliaga-Del Castillo A, Ioshida M, Yatabe M, Benavides E, Rios H, Soki F, Neiva G, Paniagua B, Cevidanes L, Styner M, Prieto JC. *FlyBy CNN: a 3D surface segmentation framework.* Proc. SPIE Medical Imaging 2021, vol. 11596, 115962B | Proceedings SPIE — la méthode multi-vues dont dérive `dentalmodelseg`, appelé par ALI_IOS | [10.1117/12.2582205](https://doi.org/10.1117/12.2582205) · PMCID PMC7983301 |
| `2019_Alansary_RL_agents_landmark_detection.xml` / `.txt` | Alansary A, Oktay O, Li Y, Le Folgoc L, Hou B, Vaillant G, Kamnitsas K, Vlontzos A, Glocker B, Kainz B, Rueckert D. *Evaluating reinforcement learning agents for anatomical landmark detection.* Medical Image Analysis, 2019, 53, 156-164 | Article de revue — **voisinage**, ne porte pas sur ALI | [10.1016/j.media.2019.02.007](https://doi.org/10.1016/j.media.2019.02.007) · PMCID PMC7610752 |
| `2022_Brandenburg_mucogingival_borderline_scans.xml` / `.txt` | Brandenburg LS, Schlager S, Harzig LS, Steybe D, Rothweiler RM, Burkhardt F, Spies BC, Georgii J, Metzger MC. *A novel method for digital reconstruction of the mucogingival borderline in optical scans of dental plaster casts.* Journal of Clinical Medicine, 2022, 11(9), 2383 | Article de revue — **voisinage**, autre équipe, aucun lien avec ALI | [10.3390/jcm11092383](https://doi.org/10.3390/jcm11092383) · PMCID PMC9099921 · CC BY |
| `2023_Bianchi_AAOF_final_report_ML_crown_root.pdf` | Bianchi J. *Machine learning approaches for segmentation and integration of root canal and dental crown.* Rapport final, 2022 Orthodontic Faculty Development Fellowships (OFDFA), American Association of Orthodontists Foundation, imprimé le 30 juin 2023, 60 p. | Rapport de projet financé — liste les publications et les abstracts de congrès du groupe, et reproduit le chapitre CLIP | — |

Notes sur les fichiers :

- Le `.xml` d'ALI_CBCT est le JATS complet d'Europe PMC (`fullTextXML`) ; le
  `.txt` est la version lisible, en-tête bibliographique inclus.
- FlyBy CNN, Alansary : Europe PMC n'expose pas de JATS (manuscrits auteur NIH).
  Le texte intégral a été récupéré via l'API BioC de la NLM
  (`ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_xml/<PMCID>/unicode`).
  Les `.xml` sont donc du BioC, pas du JATS.
- Le PDF CLIP est la **version auteur** : déposée sur ResearchGate le 11 mars
  2024 par Najla Al Turkestani (co-autrice), puis reprise sur le site
  personnel de Juan Fernando Aristizábal (co-auteur lui aussi). La version
  éditeur reste payante chez Springer.
- Aucun PDF n'a pu être tiré de Wiley, de PMC ni d'Europe PMC : ces trois hôtes
  répondent une page Cloudflare, pas un fichier.

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| Leclercq M, Ruellas A, Gurgel M, Yatabe M, Bianchi J, Cevidanes L, Styner M, Paniagua B, Prieto JC. *DentalModelSeg: fully automated segmentation of upper and lower 3D intra-oral surfaces.* Proc. IEEE ISBI 2023 | Lecture libre sur [Europe PMC PMC10949221](https://europepmc.org/articles/PMC10949221) ; ni JATS ni BioC disponibles, PDF derrière Cloudflare | [10.1109/ISBI53787.2023.10230397](https://doi.org/10.1109/ISBI53787.2023.10230397) |
| Baquero B, Bianchi J, Cevidanes L, et al. *ALIDDM: Automatic Landmark Identification in Digital Dental Models.* 51e réunion annuelle AADOCR/CADR, Atlanta (hybride), mars 2022, abstract 3668353 | [IADR Abstract Archives](https://iadr.abstractarchives.com/abstract/51am-3668353/aliddm-automatic-landmark-identification-in-digital-dental-models) — compte IADR requis | — |
| Gillot M, Bianchi J, Cevidanes L, et al. *Automatic Landmark Identification in Cone Beam Computed Tomography Scans.* 51e réunion annuelle AADOCR/CADR, Atlanta (hybride), 2022 | IADR Abstract Archives — compte requis. Référence relevée dans le rapport AAOF ci-dessus | — |
| Hutin N, Bianchi J, Cevidanes L, et al. *Accurate Segmentation and Landmark Identification on Intra Oral Scans.* Réunion annuelle AADOCR/CADR 2023, Portland | IADR Abstract Archives — compte requis. Référence relevée dans le rapport AAOF ci-dessus | — |
| Ghesu FC, Georgescu B, Zheng Y, Grbic S, Maier A, Hornegger J, Comaniciu D. *Multi-scale deep reinforcement learning for real-time 3D-landmark detection in CT scans.* IEEE TPAMI, 2019, 41(1), 176-189 | IEEE Xplore, payant | [10.1109/TPAMI.2017.2782687](https://doi.org/10.1109/TPAMI.2017.2782687) |
| Ghesu FC, Georgescu B, Mansi T, Neumann D, Hornegger J, Comaniciu D. *An artificial agent for anatomical landmark detection in medical images.* MICCAI 2016, LNCS 9902, p. 229-237 | Springer ; annoncé « hybrid » par Unpaywall mais sans PDF libre accessible | [10.1007/978-3-319-46726-9_27](https://doi.org/10.1007/978-3-319-46726-9_27) |
| Ioshida M, Muñoz BA, Rios H, Cevidanes L, Aristizabal JF, Rey D, Kim-Berman H, Yatabe M, Benavides E, Alvarez MA, Volk S, Ruellas AC. *Accuracy and reliability of mandibular digital model registration with use of the mucogingival junction as the reference.* Oral Surg Oral Med Oral Pathol Oral Radiol, 2019, 127(4), 351-360 | Elsevier, payant, pas de dépôt PMC | [10.1016/j.oooo.2018.10.003](https://doi.org/10.1016/j.oooo.2018.10.003) |
| Deleat-Besson R, Le C, Al Turkestani N, et al. *Automatic segmentation of dental root canal and merging with crown shape.* IEEE EMBC 2021, p. 2948-2951 | IEEE Xplore, payant. C'est la référence [4] du papier CLIP, celle qui porte `DentalModelSeg` et `Universal Labelling` | [10.1109/EMBC46164.2021.9630750](https://doi.org/10.1109/EMBC46164.2021.9630750) |
| Leroux G, Allemang D, Claret J, Prieto JC, Pieper S, Mattos CT, Cevidanes L. *Bridging the gap: enabling PyTorch3D and advanced dental imaging tools on Windows through WSL2.* Proc. SPIE Medical Imaging 2025, vol. 13406 | SPIE, payant. Porte sur l'environnement WSL2 utilisé par ALI_IOS, pas sur l'algorithme | [10.1117/12.3046805](https://doi.org/10.1117/12.3046805) |
| Version éditeur du chapitre ALI_IOS | [Springer Link](https://doi.org/10.1007/978-3-031-23179-7_4) | 10.1007/978-3-031-23179-7_4 |
| *Automatic Landmarks Identification for Intra Oral Scans* (prototype ALIDDM) | [NA-MIC Project Week 36, 2022](https://projectweek.na-mic.org/PW36_2022_Virtual/Projects/ALIDDM/) — page de projet, pas une publication | — |

## Ce qui a été cherché pour la voie MG

La fiche affirme que la ligne mucogingivale n'est publiée nulle part. Vérifié,
et rien ne la contredit :

- Europe PMC : `"mucogingival" AND AUTH:"Cevidanes L"` (13 résultats, aucun sur
  l'identification automatique de landmarks), `"mucogingival" AND AUTH:"Prieto
  JC"` (1 résultat, sans rapport), `"mucogingival" AND "intraoral scan" AND
  "deep learning"` (3 résultats, tous des recueils d'abstracts étrangers).
- OpenAlex : `ALIIOS`, `mucogingival line automatic landmark identification`,
  `gingival margin landmark detection intraoral scan neural network` — rien du
  groupe DCBIA.
- Le papier CLIP lui-même ne contient pas une seule occurrence du mot
  *mucogingival* : il ne connaît que les landmarks occlusaux et cervicaux
  (« CB » cervical buccal, « CL » cervical lingual), sur 5 vues sphériques.
- Le rapport AAOF de Bianchi, qui recense les publications et les abstracts du
  projet jusqu'en 2023, ne contient pas non plus le mot *mucogingival*.
- Abstracts IADR/AADOCR : les archives sont derrière un compte IADR. Les trois
  abstracts du groupe repérés par le rapport AAOF (ALIDDM 2022, ALI_CBCT 2022,
  segmentation+landmarks IOS 2023) sont listés plus haut ; aucun de leurs titres
  ne porte sur la ligne mucogingivale. Les recherches ciblées sur le domaine
  `iadr.abstractarchives.com` ne remontent rien d'autre pour Cevidanes/Prieto.
- Le code lui-même ne cite aucune référence pour la voie MG : les seuls chiffres
  disponibles (155 scans d'entraînement, 4–21 mm, 364 prédictions) sont dans les
  commentaires.

Le travail publié le plus proche de la voie MG vient d'une **autre équipe**
(Brandenburg et al. 2022, Fribourg-en-Brisgau, récupéré ici) et reconstruit la
ligne mucogingivale sur des scans optiques de modèles en plâtre, sans
apprentissage profond. Côté DCBIA, la seule publication qui utilise la jonction
mucogingivale est Ioshida et al. 2019, qui la valide comme **référence de
recalage** de modèles numériques mandibulaires — c'est l'usage clinique qui
justifie que ALI_IOS prédise ces points, mais ce n'est pas une description du
modèle MG.

## Voisinage

Travaux proches qui **ne décrivent pas ALI** mais éclairent le problème.

- **Alansary et al. 2019** (récupéré ici) : évaluation comparée d'agents de
  renforcement pour la détection de landmarks anatomiques. C'est la référence
  d'ensemble sur le mécanisme d'agent-qui-se-déplace décrit dans la fiche.
- **Ghesu et al. 2016 (MICCAI) et 2019 (TPAMI)** : l'origine de ce mécanisme,
  agent artificiel puis apprentissage par renforcement profond multi-échelle.
  C'est la référence 20 du papier ALI_CBCT, la seule qu'il cite pour la partie
  agent. **Maxime Gillot n'a pas de travail antérieur à lui sur le sujet** :
  la revue de ses publications (OpenAlex, Europe PMC) ne remonte, avant
  ALI_CBCT, que AMASSS (segmentation de crâne, PLOS ONE 2022) et une revue
  narrative sur la planification implantaire. ALI_CBCT est son premier papier
  sur les agents de renforcement ; l'antériorité est celle de Ghesu, pas la
  sienne.
- **FlyBy CNN 2021 et DentalModelSeg 2023** (Prieto est auteur senior des deux ;
  premiers auteurs Boumbolo et Leclercq) : la segmentation multi-vues des
  couronnes. Le papier CLIP dit explicitement s'en servir en pré-traitement pour
  segmenter et numéroter les dents, et le code ALI_IOS appelle toujours
  `dentalmodelseg`. Ces deux papiers décrivent donc la dépendance d'ALI_IOS, pas
  ALI_IOS.
- **Woodsend B, et al. 2022**, *Development of intra-oral automated landmark
  recognition (ALR) for dental and occlusal outcome measurements*, European
  Journal of Orthodontics 44(1), 43-50 — [10.1093/ejo/cjab012](https://doi.org/10.1093/ejo/cjab012),
  PMCID PMC8789266. Méthode concurrente, prise comme point de comparaison dans
  la discussion du papier CLIP (0,389 mm contre 0,43 mm pour ALIIOS).
- **Wu TH, et al. 2021**, *Two-stage mesh deep learning for automated tooth
  segmentation and landmark localization on 3D intraoral scans*,
  [arXiv:2109.11941](https://arxiv.org/abs/2109.11941). L'autre point de
  comparaison du papier CLIP (iMeshSegNet + PointNet-Reg, 0,597 ± 0,761 mm).
- **Gillot M, Baquero B, Le C, et al. 2022**, *Automatic multi-anatomical skull
  structure segmentation of cone-beam computed tomography scans using 3D UNETR*,
  PLOS ONE 17(10), e0275033 — [10.1371/journal.pone.0275033](https://doi.org/10.1371/journal.pone.0275033),
  PMCID PMC9555672, accès libre. C'est le papier d'AMASSS, pas celui d'ALI, mais
  il partage les auteurs, le jeu de données CBCT et l'infrastructure Slicer.
