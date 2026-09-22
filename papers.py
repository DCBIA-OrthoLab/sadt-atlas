# -*- coding: utf-8 -*-
"""Références bibliographiques exposées dans le Guide.

Source unique, consommée par build.py pour écrire la section « Pour aller plus
loin » de chaque page du Guide, en français et en anglais. L'Atlas garde sa
bibliographie complète dans <Outil>/SOURCES.html ; ce fichier n'en retient que
ce qu'un utilisateur a besoin de lire.

Chaque entrée : url, ref (auteur/revue/année), title (titre exact), fr, en.
« free » ajoute, quand il existe, un lien vers une version en accès libre.

Règle : aucune URL qui ne figure pas déjà dans la bibliographie de l'outil.
build.py le vérifie à chaque construction.
"""

# Le module a-t-il un papier qui le décrit ? Sinon « note » le dit franchement.
PAPERS = {

 "FlexReg": {
  "note": {
   "fr": "Aucune publication ne décrit FlexReg : ni la zone que vous dessinez à "
         "la main, ni le recalage qui s'ensuit. Les lectures ci-dessous éclairent "
         "la démarche, pas le module.",
   "en": "No publication describes FlexReg: neither the region you draw by hand "
         "nor the registration that follows. The readings below explain the "
         "approach, not the module."},
  "self": [],
  "around": [
   {"url": "https://doi.org/10.1007/978-3-031-46914-5_18",
    "ref": "Hutin et al., ShapeMI 2023",
    "title": "AReg IOS: Automatic Registration on IntraOralScans",
    "fr": "La moitié publiée de la famille : un réseau repère tout seul la zone "
          "stable du palais, là où FlexReg vous laisse la dessiner.",
    "en": "The published half of the family: a network finds the stable palatal "
          "region on its own, where FlexReg leaves you to draw it."},
   {"url": "https://doi.org/10.1038/s41598-017-06013-5",
    "ref": "Vasilakos et al., Scientific Reports 2017",
    "title": "Assessment of different techniques for 3D superimposition of serial "
             "digital maxillary dental casts on palatal structures",
    "fr": "Compare les zones du palais utilisables comme référence et ce que "
          "chacune vaut en reproductibilité — utile pour décider où dessiner.",
    "en": "Compares the palatal regions usable as a reference and how "
          "reproducible each one is — useful when deciding where to draw."},
   {"url": "https://doi.org/10.1111/ocr.12309",
    "ref": "Garib et al., Orthod Craniofac Res 2019",
    "title": "Superimposition of maxillary digital models using the palatal "
             "rugae: does ageing affect the reliability?",
    "fr": "Les rugae palatines comme repère, et l'effet de la croissance sur "
          "leur stabilité — à lire avant de recaler des patients en croissance.",
    "en": "Palatal rugae as a landmark, and how growth affects their stability — "
          "worth reading before registering growing patients."},
  ]},

 "ALI": {
  "self": [
   {"url": "https://doi.org/10.1111/ocr.12642",
    "ref": "Gillot et al., Orthod Craniofac Res 2023",
    "title": "Automatic landmark identification in cone-beam computed tomography",
    "fr": "Le papier de la voie CBCT : des agents qui se déplacent dans le volume "
          "jusqu'au point cherché. Donne les écarts mesurés, landmark par landmark.",
    "en": "The paper behind the CBCT path: agents that walk through the volume to "
          "the landmark. Reports the measured error, landmark by landmark."},
   {"url": "https://doi.org/10.1007/978-3-031-23179-7_4",
    "ref": "Baquero et al., CLIP 2022 (LNCS 13746)",
    "title": "Automatic Landmark Identification on IntraOralScans",
    "fr": "Le papier de la voie maillage : la surface est photographiée sous "
          "plusieurs angles, et chaque pixel vote pour un landmark.",
    "en": "The paper behind the mesh path: the surface is photographed from "
          "several viewpoints, and each pixel votes for a landmark."},
  ],
  "around": [
   {"url": "https://doi.org/10.1016/j.media.2019.02.007",
    "ref": "Alansary et al., Medical Image Analysis 2019",
    "title": "Evaluating reinforcement learning agents for anatomical landmark "
             "detection",
    "fr": "D'où vient l'idée de l'agent qui marche vers le point, et ce qu'elle "
          "coûte face à une régression directe des coordonnées.",
    "en": "Where the walking-agent idea comes from, and what it costs compared "
          "with regressing the coordinates directly."},
   {"url": "https://doi.org/10.1117/12.2582205",
    "ref": "Boubolo et al., SPIE Medical Imaging 2021",
    "title": "FlyBy CNN: a 3D surface segmentation framework",
    "fr": "Le rendu multi-vues sur lequel repose la voie maillage.",
    "en": "The multi-view rendering the mesh path is built on."},
  ]},

 "AMASSS": {
  "note": {
   "fr": "Le papier ci-dessous décrit la version UNETR du module. Ce qui "
         "s'exécute aujourd'hui est une bascule vers nnU-Net que personne n'a "
         "publiée : le citer pour décrire AMASSS tel qu'il tourne, c'est décrire "
         "une architecture qui n'est plus là.",
   "en": "The paper below describes the UNETR version of the module. What runs "
         "today is a switch to nnU-Net that nobody has published: citing it to "
         "describe AMASSS as it runs means describing an architecture that is "
         "no longer there."},
  "self": [
   {"url": "https://doi.org/10.1371/journal.pone.0275033",
    "ref": "Gillot et al., PLOS ONE 2022",
    "title": "Automatic multi-anatomical skull structure segmentation of "
             "cone-beam computed tomography scans using 3D UNETR",
    "fr": "Les structures segmentées, les données d'entraînement et la précision "
          "mesurée. En accès libre.",
    "en": "The structures segmented, the training data and the measured "
          "accuracy. Open access."},
  ],
  "around": [
   {"url": "https://doi.org/10.1038/s41592-020-01008-z",
    "ref": "Isensee et al., Nature Methods 2021",
    "title": "nnU-Net: a self-configuring method for deep learning-based "
             "biomedical image segmentation",
    "fr": "Le socle de la version actuelle : une méthode qui choisit seule son "
          "architecture et ses réglages d'après le jeu de données.",
    "en": "The foundation of the current version: a method that picks its own "
          "architecture and settings from the dataset."},
   {"url": "https://doi.org/10.1109/WACV51458.2022.00181",
    "ref": "Hatamizadeh et al., WACV 2022",
    "title": "UNETR: Transformers for 3D Medical Image Segmentation",
    "fr": "L'architecture du papier PLOS ONE, donc de la version historique du "
          "module.",
    "en": "The architecture of the PLOS ONE paper, i.e. of the module's historic "
          "version."},
  ]},

 "ASO": {
  "self": [
   {"url": "https://doi.org/10.1007/978-3-031-45249-9_5",
    "free": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11104011/",
    "ref": "Anchling et al., LNCS 14242, 2023",
    "title": "Automated Orientation and Registration of Cone-Beam Computed "
             "Tomography Scans",
    "fr": "Le papier de la famille ASO/AREG : comment l'orientation automatique "
          "est obtenue, et de combien elle s'écarte d'une orientation manuelle.",
    "en": "The ASO/AREG family paper: how the automatic orientation is obtained, "
          "and how far it departs from a manual one."},
  ],
  "around": [
   {"url": "https://doi.org/10.1016/j.ajodo.2015.10.021",
    "ref": "Ruellas et al., AJODO 2016",
    "title": "Common 3-dimensional coordinate system for assessment of "
             "directional changes",
    "fr": "Le système de coordonnées que l'orientation automatique cherche à "
          "reproduire. C'est lui qui définit ce que « bien orienté » veut dire.",
    "en": "The coordinate system the automatic orientation aims to reproduce. "
          "It is what defines “correctly oriented”."},
   {"url": "https://doi.org/10.1111/ocr.12642",
    "ref": "Gillot et al., Orthod Craniofac Res 2023",
    "title": "Automatic landmark identification in cone-beam computed tomography",
    "fr": "Les landmarks sur lesquels ASO s'appuie pour s'orienter viennent de là.",
    "en": "The landmarks ASO orients itself on come from here."},
  ]},

 "AREG_IOS": {
  "self": [
   {"url": "https://doi.org/10.1007/978-3-031-46914-5_18",
    "ref": "Hutin et al., ShapeMI 2023 (LNCS 14350)",
    "title": "AReg IOS: Automatic Registration on IntraOralScans",
    "fr": "Le papier du module : un réseau isole la zone stable du palais, puis "
          "un ICP recale les deux scans dessus.",
    "en": "The module's paper: a network isolates the stable palatal region, then "
          "an ICP registers the two scans on it."},
  ],
  "around": [
   {"url": "https://doi.org/10.1038/s41598-017-06013-5",
    "ref": "Vasilakos et al., Scientific Reports 2017",
    "title": "Assessment of different techniques for 3D superimposition of serial "
             "digital maxillary dental casts on palatal structures",
    "fr": "Ce que valent les différentes zones du palais comme référence de "
          "superposition.",
    "en": "How the various palatal regions compare as superimposition references."},
   {"url": "https://doi.org/10.1111/ocr.12535",
    "ref": "Aliaga-Del Castillo et al., Orthod Craniofac Res 2022",
    "title": "Comparison and reproducibility of three methods for maxillary "
             "digital dental model registration in open bite patients",
    "fr": "Trois méthodes de recalage comparées sur des patients en béance — le "
          "cas où le choix de la zone compte le plus.",
    "en": "Three registration methods compared on open-bite patients — the case "
          "where the choice of region matters most."},
   {"url": "https://projectweek.na-mic.org/PW36_2022_Virtual/Projects/ALIDDM/",
    "ref": "NA-MIC Project Week 36, 2022",
    "title": "ALIIOS — Automatic Landmarks Identification for Intra Oral Scans",
    "fr": "ALI_IOS, le réseau qui fournit les landmarks mucogingivaux, n'a aucune "
          "publication : cette page de projet en est la seule description publique.",
    "en": "ALI_IOS, the network that supplies the mucogingival landmarks, has no "
          "publication: this project page is its only public description."},
  ]},

 "AREG_CBCT": {
  "self": [
   {"url": "https://doi.org/10.1007/978-3-031-45249-9_5",
    "free": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11104011/",
    "ref": "Anchling et al., LNCS 14242, 2023",
    "title": "Automated Orientation and Registration of Cone-Beam Computed "
             "Tomography Scans",
    "fr": "Le papier du module : orientation puis recalage voxel-à-voxel sur une "
          "région de référence, et l'erreur mesurée sur une série de patients.",
    "en": "The module's paper: orientation then voxel-based registration on a "
          "region of reference, with the error measured on a patient series."},
  ],
  "around": [
   {"url": "https://doi.org/10.1371/journal.pone.0157625",
    "ref": "Ruellas et al., PLOS ONE 2016",
    "title": "3D Mandibular Superimposition: Comparison of Regions of Reference "
             "for Voxel-Based Registration",
    "fr": "Quelle région de la mandibule prendre comme référence, et pourquoi le "
          "choix change le résultat. C'est la décision que vous prenez dans "
          "l'interface.",
    "en": "Which mandibular region to take as a reference, and why the choice "
          "changes the result. This is the decision you make in the interface."},
   {"url": "https://doi.org/10.1016/j.ajodo.2015.09.026",
    "ref": "Ruellas et al., AJODO 2016",
    "title": "Comparison and reproducibility of 2 regions of reference for "
             "maxillary regional registration with cone-beam computed tomography",
    "fr": "La même question côté maxillaire.",
    "en": "The same question on the maxillary side."},
   {"url": "https://doi.org/10.1259/dmfr/17102411",
    "ref": "Cevidanes et al., Dentomaxillofac Radiol 2005",
    "title": "Superimposition of 3D cone-beam CT models of orthognathic surgery "
             "patients",
    "fr": "La référence historique du laboratoire : la superposition sur la base "
          "du crâne, faite à la main, qu'AREG_CBCT automatise.",
    "en": "The lab's founding reference: the cranial-base superimposition, done "
          "by hand, that AREG_CBCT automates."},
  ]},

 "AREG_IOSCBCT": {
  "note": {
   "fr": "Aucune publication ne décrit la voie multimodale de ce module. Le "
         "papier AReg IOS porte sur le recalage d'un scan intra-oral sur un autre "
         "dans le temps, pas sur l'appariement d'un maillage avec un CBCT.",
   "en": "No publication describes this module's multimodal path. The AReg IOS "
         "paper covers registering one intra-oral scan onto another over time, "
         "not matching a mesh with a CBCT."},
  "self": [],
  "around": [
   {"url": "https://doi.org/10.1007/s00784-025-06183-x",
    "ref": "Zheng et al., Clinical Oral Investigations 2025",
    "title": "Automatic multimodal registration of cone-beam computed tomography "
             "and intraoral scans: a systematic review and meta-analysis",
    "fr": "L'état de l'art du problème que ce module attaque, avec les erreurs "
          "rapportées par les méthodes publiées. Le meilleur point d'entrée.",
    "en": "The state of the art on the problem this module tackles, with the "
          "errors reported by published methods. The best entry point."},
   {"url": "https://doi.org/10.3390/bioengineering10111326",
    "ref": "Kim et al., Bioengineering 2023",
    "title": "Novel Procedure for Automatic Registration between Cone-Beam "
             "Computed Tomography and Intraoral Scan Data Supported with 3D "
             "Segmentation",
    "fr": "Une approche voisine, en accès libre : segmentation des dents puis "
          "appariement. Utile pour comparer à ce que fait le module.",
    "en": "A neighbouring approach, open access: segment the teeth, then match. "
          "Useful to compare with what the module does."},
   {"url": "https://doi.org/10.1016/j.media.2024.103096",
    "ref": "Jang et al., Medical Image Analysis 2024",
    "title": "Fully automatic integration of dental CBCT images and full-arch "
             "intraoral impressions with stitching error correction via "
             "individual tooth segmentation and identification",
    "fr": "Va plus loin : corrige aussi l'erreur de raboutage du scan intra-oral, "
          "qui est le défaut que vous verrez le plus souvent sur arcade complète.",
    "en": "Goes further: also corrects the intra-oral scan's stitching error, the "
          "defect you will most often see on a full arch."},
  ]},

 "GreedyReg": {
  "self": [
   {"url": "https://arxiv.org/abs/1904.11929",
    "ref": "Venet et al., arXiv 2019",
    "title": "Accurate and Robust Alignment of Variable-Stained Histologic Images "
             "Using a General-Purpose Greedy Diffeomorphic Registration Tool",
    "fr": "Le papier de <code>greedy</code>, le moteur que ce module se contente "
          "de piloter. Court, et c'est la citation que demandent ses auteurs.",
    "en": "The paper for <code>greedy</code>, the engine this module merely "
          "drives. Short, and it is the citation its authors ask for."},
  ],
  "around": [
   {"url": "https://doi.org/10.1016/j.neuroimage.2006.01.015",
    "ref": "Yushkevich et al., NeuroImage 2006",
    "title": "User-guided 3D active contour segmentation of anatomical "
             "structures: Significantly improved efficiency and reliability",
    "fr": "La référence d'ITK-SNAP, dont <code>greedy</code> est issu et dont le "
          "module reprend une partie du vocabulaire.",
    "en": "The ITK-SNAP reference, which <code>greedy</code> came out of and "
          "whose vocabulary the module borrows."},
   {"url": "https://greedy.readthedocs.io/en/latest/reference.html",
    "ref": "Documentation de greedy",
    "title": "greedy — command reference",
    "fr": "La liste complète des options du moteur, si vous voulez savoir ce que "
          "recouvre un réglage de l'interface.",
    "en": "The engine's full option list, if you want to know what a setting in "
          "the interface stands for."},
  ]},

 "MRI2CBCT": {
  "self": [
   {"url": "https://doi.org/10.1007/978-3-031-73083-2_7",
    "ref": "Leroux et al., CLIP 2024 (LNCS 15196)",
    "title": "Novel CBCT-MRI Registration Approach for Enhanced Analysis of "
             "Temporomandibular Degenerative Joint Disease",
    "fr": "Le papier du module : la démarche de recalage IRM ↔ CBCT sur "
          "l'articulation temporo-mandibulaire.",
    "en": "The module's paper: the MRI ↔ CBCT registration approach on the "
          "temporomandibular joint."},
   {"url": "https://doi.org/10.1007/978-3-032-05479-1_5",
    "ref": "Gaydamour et al., CLIP 2025 (LNCS 16126)",
    "title": "AI-Driven Multimodal TMJ Patient Modeling: From Unstructured Notes "
             "to Precision Treatment",
    "fr": "La suite : ce recalage replacé dans la chaîne complète d'analyse du "
          "patient.",
    "en": "The follow-up: this registration put back into the full patient "
          "analysis pipeline."},
  ],
  "around": [
   {"url": "https://doi.org/10.1186/s40463-016-0144-4",
    "ref": "Al-Saleh et al., J Otolaryngol Head Neck Surg 2016",
    "title": "MRI and CBCT image registration of temporomandibular joint: a "
             "systematic review",
    "fr": "Pourquoi ce recalage est difficile, et ce que les méthodes publiées "
          "obtiennent. En accès libre.",
    "en": "Why this registration is hard, and what published methods achieve. "
          "Open access."},
   {"url": "https://doi.org/10.1371/journal.pone.0169555",
    "ref": "Al-Saleh et al., PLOS ONE 2017",
    "title": "Three-Dimensional Assessment of Temporomandibular Joint Using "
             "MRI-CBCT Image Registration",
    "fr": "Ce qu'on gagne cliniquement à superposer les deux modalités plutôt "
          "qu'à les lire côte à côte.",
    "en": "What you clinically gain from superimposing the two modalities rather "
          "than reading them side by side."},
   {"url": "https://doi.org/10.1109/TMI.2009.2035616",
    "ref": "Klein et al., IEEE TMI 2010",
    "title": "elastix: A Toolbox for Intensity-Based Medical Image Registration",
    "fr": "Le moteur de recalage employé sous le capot.",
    "en": "The registration engine used under the hood."},
  ]},

 "BatchDentalSeg": {
  "note": {
   "fr": "Le modèle d'origine est publié et documenté. Les trois variantes "
         "ajoutées ensuite — pédiatrique, <em>universal labelling</em>, "
         "naso-maxillaire — ne le sont pas : ni jeu d'entraînement, ni évaluation.",
   "en": "The original model is published and documented. The three variants "
         "added later — pediatric, <em>universal labelling</em>, naso-maxillary — "
         "are not: no training set, no evaluation."},
  "self": [
   {"url": "https://doi.org/10.1016/j.jdent.2024.105130",
    "ref": "Dot et al., Journal of Dentistry 2024",
    "title": "DentalSegmentator: Robust open source deep learning-based CT and "
             "CBCT image segmentation",
    "fr": "Le modèle que ce module exécute : les cinq structures segmentées, les "
          "données d'entraînement, et la précision mesurée. Libre à la lecture.",
    "en": "The model this module runs: the five structures segmented, the "
          "training data, and the measured accuracy. Free to read."},
  ],
  "around": [
   {"url": "https://doi.org/10.1038/s41592-020-01008-z",
    "ref": "Isensee et al., Nature Methods 2021",
    "title": "nnU-Net: a self-configuring method for deep learning-based "
             "biomedical image segmentation",
    "fr": "Le cadre sur lequel tous les modèles du module reposent.",
    "en": "The framework every model in the module rests on."},
   {"url": "https://doi.org/10.1111/ocr.12890",
    "ref": "Sinard et al., Orthod Craniofac Res 2025",
    "title": "Automated Cone Beam Computed Tomography Segmentation of Multiple "
             "Impacted Teeth With or Without Association to Rare Diseases: "
             "Evaluation of Four Deep Learning-Based Methods",
    "fr": "Une évaluation indépendante sur des cas difficiles — dents incluses "
          "multiples — qui situe ce que le modèle tient et où il lâche.",
    "en": "An independent evaluation on hard cases — multiple impacted teeth — "
          "showing where the model holds and where it gives way."},
  ]},

 "VFACE": {
  "self": [
   {"url": "https://dentistry.unc.edu/2026/03/31/annual-meeting-highlights-asod-research-accomplishments/",
    "ref": "Buisson, poster IADR 2026",
    "title": "Automated Classification of Facial Asymmetry, Identification of "
             "Regional Asymmetry Patterns",
    "fr": "Le poster présenté à la 104ᵉ session générale de l'IADR, San Diego. "
          "Le recensement de l'UNC Adams School of Dentistry en donne le titre "
          "et l'auteur ; le poster lui-même n'est déposé nulle part de public, et "
          "les archives de l'IADR ne sont pas indexées librement.",
    "en": "The poster presented at the 104th IADR General Session, San Diego. "
          "The UNC Adams School of Dentistry round-up gives its title and author; "
          "the poster itself is not deposited anywhere public, and the IADR "
          "archives are not freely indexed."},
   {"url": "https://doi.org/10.1117/12.3087010",
    "ref": "SPIE Medical Imaging 2026",
    "title": "Automated classification of skeletal facial asymmetry in CBCT using "
             "a reproducible 3D Slicer workflow",
    "fr": "La seule publication qui décrit le pipeline. Payante, et à lire en "
          "sachant qu'elle décrit une méthode de classification différente de "
          "celle que le module embarque réellement.",
    "en": "The only publication describing the pipeline. Paywalled, and to be "
          "read knowing it describes a classification method different from the "
          "one the module actually ships."},
  ],
  "around": [
   {"url": "https://doi.org/10.1259/dmfr/13993523",
    "ref": "AlHadidi & Cevidanes, Dentomaxillofac Radiol 2011",
    "title": "Comparison of two methods for quantitative assessment of mandibular "
             "asymmetry using cone beam computed tomography image volumes",
    "fr": "Compare deux façons de mesurer l'asymétrie mandibulaire : miroir sur "
          "le plan médio-sagittal, ou miroir puis recalage sur la base du crâne. "
          "C'est la démarche que VFACE automatise.",
    "en": "Compares two ways of measuring mandibular asymmetry: mirroring on the "
          "mid-sagittal plane, or mirroring then registering on the cranial base. "
          "This is the approach VFACE automates."},
   {"url": "https://doi.org/10.1016/j.tripleo.2011.02.002",
    "ref": "Cevidanes et al., Oral Surg Oral Med Oral Pathol 2011",
    "title": "Three-dimensional quantification of mandibular asymmetry through "
             "cone-beam computerized tomography",
    "fr": "Quantifie l'asymétrie après miroir et recalage, et détaille ce que les "
          "écarts mesurés veulent dire cliniquement.",
    "en": "Quantifies asymmetry after mirroring and registration, and spells out "
          "what the measured gaps mean clinically."},
   {"url": "https://doi.org/10.2319/040921-292.1",
    "ref": "Evangelista et al., Angle Orthodontist 2022",
    "title": "Prevalence of mandibular asymmetry in different skeletal sagittal "
             "patterns: A systematic review",
    "fr": "Prévalence de l'asymétrie mandibulaire selon le schéma squelettique "
          "sagittal — pour situer un patient par rapport à une population.",
    "en": "Prevalence of mandibular asymmetry across sagittal skeletal patterns — "
          "to place a patient against a population."},
   {"url": "https://doi.org/10.1093/ejo/cjag012",
    "ref": "Peng et al., European Journal of Orthodontics 2026",
    "title": "Automated assessment of 3D facial asymmetry: a systematic review",
    "fr": "La revue systématique du problème : les méthodes automatiques "
          "existantes et ce qu'elles valent. Le meilleur point d'entrée récent.",
    "en": "The systematic review of the problem: the existing automated methods "
          "and how they perform. The best recent entry point."},
  ]},

 "DOCShapeAXI": {
  "self": [
   {"url": "https://doi.org/10.1117/12.3007053",
    "ref": "Prieto et al., SPIE Medical Imaging 2024",
    "title": "ShapeAXI: Shape Analysis Explainability and Interpretability",
    "fr": "Le cadre que ce module pilote : classer une forme 3D, puis montrer "
          "quelle partie de la surface a emporté la décision.",
    "en": "The framework this module drives: classify a 3D shape, then show which "
          "part of the surface drove the decision."},
  ],
  "around": [
   {"url": "https://doi.org/10.1016/j.jdent.2025.105689",
    "ref": "Mattos et al., Journal of Dentistry 2025",
    "title": "Explainable artificial intelligence to quantify adenoid hypertrophy "
             "and airway obstruction",
    "fr": "Le même cadre appliqué aux voies aériennes : un exemple complet de ce "
          "que produisent les cartes d'explication, et de la façon de les lire.",
    "en": "The same framework applied to the airway: a complete example of what "
          "the explanation maps produce, and how to read them."},
   {"url": "https://doi.org/10.1038/s41598-023-43125-7",
    "ref": "Miranda et al., Scientific Reports 2023",
    "title": "Interpretable artificial intelligence for classification of alveolar "
             "bone defect in patients with cleft lip and palate",
    "fr": "Un autre cas clinique traité de la même façon, en accès libre.",
    "en": "Another clinical case handled the same way, open access."},
   {"url": "https://arxiv.org/abs/1610.02391",
    "ref": "Selvaraju et al., ICCV 2017",
    "title": "Grad-CAM: Visual Explanations from Deep Networks via Gradient-based "
             "Localization",
    "fr": "La méthode derrière les cartes de chaleur que le module affiche — et "
          "ses limites, qu'il vaut mieux connaître avant de les interpréter.",
    "en": "The method behind the heat maps the module displays — and its limits, "
          "worth knowing before interpreting them."},
  ]},

 "CLIC": {
  "note": {
   "fr": "Le module n'a pas encore de publication : sa seule description publique "
         "est une page de projet NA-MIC.",
   "en": "The module has no publication yet: its only public description is a "
         "NA-MIC project page."},
  "self": [
   {"url": "https://projectweek.na-mic.org/PW43_2025_Montreal/Projects/InterpretableDeepLearningForTheDetectionAndClassificationOfImpactedCaninesAndSeverityOfRootResorption/",
    "ref": "NA-MIC Project Week 43, Montréal 2025",
    "title": "Interpretable Deep Learning for the Detection and Classification of "
             "Impacted Canines and severity of root resorption",
    "fr": "Le rapport de projet : l'objectif, les données, et où en était le "
          "travail à ce moment-là.",
    "en": "The project report: the goal, the data, and where the work stood at "
          "that point."},
  ],
  "around": [
   {"url": "https://arxiv.org/abs/1703.06870",
    "ref": "He et al., ICCV 2017",
    "title": "Mask R-CNN",
    "fr": "L'architecture que le module exécute : détecter des objets et en "
          "produire le masque en même temps.",
    "en": "The architecture the module runs: detect objects and produce their "
          "masks at the same time."},
   {"url": "https://doi.org/10.1038/s41598-023-49613-0",
    "ref": "Swaity et al., Scientific Reports 2023",
    "title": "Deep learning driven segmentation of maxillary impacted canine on "
             "cone beam computed tomography images",
    "fr": "Le même problème traité par une autre équipe, avec les écarts mesurés "
          "sur une série indépendante.",
    "en": "The same problem addressed by another team, with the error measured on "
          "an independent series."},
   {"url": "https://doi.org/10.1186/s12903-024-04718-4",
    "ref": "Pirayesh et al., BMC Oral Health 2024",
    "title": "A hierarchical deep learning approach for diagnosing impacted "
             "canine-induced root resorption",
    "fr": "Côté résorption radiculaire : comment la sévérité est graduée, et ce "
          "que ça vaut face à un observateur humain.",
    "en": "On the root resorption side: how severity is graded, and how that "
          "compares with a human observer."},
  ]},

 "SurgMovPred": {
  "note": {
   "fr": "Aucune publication ne décrit le module. Sa seule description publique "
         "est un rapport de projet NA-MIC, et les modèles qu'il exécute ne sont "
         "évalués nulle part.",
   "en": "No publication describes the module. Its only public description is a "
         "NA-MIC project report, and the models it runs are evaluated nowhere."},
  "self": [
   {"url": "https://projectweek.na-mic.org/PW45_2026_Boston/Projects/New3DSlicerModuleToPredictSurgeryMovementForMaxillofacialSurgery/",
    "ref": "NA-MIC Project Week 45, Boston 2026",
    "title": "New 3D Slicer Module to predict surgery movement for maxillofacial "
             "surgery",
    "fr": "Le rapport de projet : l'intention, les données de départ, et l'état "
          "du travail.",
    "en": "The project report: the intent, the starting data, and the state of "
          "the work."},
  ],
  "around": [
   {"url": "https://doi.org/10.1111/ocr.12805",
    "ref": "de Oliveira et al., Orthod Craniofac Res 2024",
    "title": "Artificial intelligence as a prediction tool for orthognathic "
             "surgery assessment",
    "fr": "Le même laboratoire sur la même question, mais publié et évalué. À "
          "lire avant de se fier à une prédiction du module.",
    "en": "The same lab on the same question, but published and evaluated. Read "
          "it before trusting a prediction from the module."},
   {"url": "https://doi.org/10.1186/s12903-023-02844-z",
    "ref": "Cheng et al., BMC Oral Health 2023",
    "title": "Prediction of orthognathic surgery plan from 3D cephalometric "
             "analysis via deep learning",
    "fr": "Une approche voisine en accès libre, avec les erreurs rapportées "
          "mesure par mesure.",
    "en": "A neighbouring approach, open access, with errors reported "
          "measurement by measurement."},
  ]},

 "AutoCrop3D": {
  "note": {
   "fr": "Module utilitaire : il n'a pas de publication propre, et n'en demande "
         "pas. Il applique en série le recadrage que Slicer sait déjà faire.",
   "en": "A utility module: it has no publication of its own and needs none. It "
         "applies in batch the cropping Slicer already knows how to do."},
  "self": [],
  "around": [
   {"url": "https://slicer.readthedocs.io/en/latest/user_guide/modules/cropvolume.html",
    "ref": "Documentation 3D Slicer",
    "title": "Crop Volume",
    "fr": "Le module Slicer sous-jacent : ce que veulent dire l'interpolation, le "
          "facteur d'échantillonnage et l'isotropie que vous retrouvez ici.",
    "en": "The underlying Slicer module: what the interpolation, sampling factor "
          "and isotropy you see here actually mean."},
   {"url": "https://doi.org/10.1111/ocr.12895",
    "ref": "Barone et al., Orthod Craniofac Res 2025",
    "title": "Deep Learning-Based Three-Dimensional Analysis Reveals Distinct "
             "Patterns of Condylar Remodelling After Orthognathic Surgery in "
             "Skeletal Class III Patients",
    "fr": "Un travail du laboratoire où ce recadrage en série sert d'étape "
          "préparatoire — un exemple de ce à quoi le module est utile.",
    "en": "A lab study where this batch cropping is a preparation step — an "
          "example of what the module is good for."},
  ]},

 "AutoMatrix": {
  "note": {
   "fr": "Aucune publication, et il n'y a rien à publier : le module applique des "
         "matrices de transformation à des fichiers, en série. Ce qui compte est "
         "de savoir ce qu'est une matrice dans Slicer et dans quel repère elle "
         "s'exprime.",
   "en": "No publication, and nothing to publish: the module applies "
         "transformation matrices to files, in batch. What matters is knowing "
         "what a matrix is in Slicer and which coordinate frame it is in."},
  "self": [],
  "around": [
   {"url": "https://slicer.readthedocs.io/en/latest/user_guide/modules/transforms.html",
    "ref": "Documentation 3D Slicer",
    "title": "Transforms",
    "fr": "Ce qu'est une transformation linéaire dans Slicer, comment elle "
          "s'applique et comment on l'inverse.",
    "en": "What a linear transform is in Slicer, how it is applied and how it is "
          "inverted."},
   {"url": "https://slicer.readthedocs.io/en/latest/user_guide/coordinate_systems.html",
    "ref": "Documentation 3D Slicer",
    "title": "Coordinate systems",
    "fr": "RAS, LPS, et pourquoi une matrice correcte appliquée dans le mauvais "
          "repère retourne votre patient.",
    "en": "RAS, LPS, and why a correct matrix applied in the wrong frame flips "
          "your patient."},
  ]},

 "CNE": {
  "note": {
   "fr": "Le module n'a pas de publication, et les modèles qu'il exécute sont des "
         "fine-tunes du laboratoire déposés sans model card : ni jeu "
         "d'entraînement décrit, ni évaluation. Les lectures ci-dessous disent ce "
         "qu'on sait, en général, de la fiabilité de ce genre d'extraction.",
   "en": "The module has no publication, and the models it runs are lab "
         "fine-tunes uploaded without a model card: no described training set, no "
         "evaluation. The readings below give what is generally known about how "
         "reliable this kind of extraction is."},
  "self": [],
  "around": [
   {"url": "https://doi.org/10.1038/s41746-024-01233-2",
    "ref": "Wiest et al., npj Digital Medicine 2024",
    "title": "Privacy-preserving large language models for structured medical "
             "information retrieval",
    "fr": "Exactement l'usage visé — extraire des champs structurés d'un compte "
          "rendu avec un modèle qui tourne en local — et ce que ça donne "
          "réellement.",
    "en": "Exactly the intended use — pulling structured fields out of a report "
          "with a locally-run model — and what it actually achieves."},
   {"url": "https://doi.org/10.1136/bmjhci-2025-101894",
    "ref": "Panchal et al., BMJ Health & Care Informatics 2026",
    "title": "Benchmarking large language models for de-identification of "
             "electronic health record notes",
    "fr": "Une comparaison chiffrée de plusieurs modèles sur des notes "
          "cliniques : où ils se trompent, et sur quels types de champs.",
    "en": "A quantified comparison of several models on clinical notes: where "
          "they fail, and on which kinds of field."},
   {"url": "https://doi.org/10.2196/57828",
    "ref": "Dorémus et al., JMIR 2025",
    "title": "Harnessing Moderate-Sized Language Models for Reliable Patient Data "
             "Deidentification in Emergency Department Records",
    "fr": "Ce qu'on peut attendre d'un modèle de la taille de ceux employés ici, "
          "plutôt que d'un très gros modèle distant.",
    "en": "What to expect from a model the size of those used here, rather than "
          "from a very large remote one."},
  ]},

 "MedX": {
  "self": [
   {"url": "https://doi.org/10.1007/978-3-032-05479-1_5",
    "ref": "Gaydamour et al., CLIP 2025 (LNCS 16126)",
    "title": "AI-Driven Multimodal TMJ Patient Modeling: From Unstructured Notes "
             "to Precision Treatment",
    "fr": "Le papier de la chaîne dont MedX est le maillon texte : passer de "
          "comptes rendus libres à des données exploitables.",
    "en": "The paper for the pipeline MedX is the text link in: going from free "
          "reports to usable data."},
  ],
  "around": [
   {"url": "https://arxiv.org/abs/1910.13461",
    "ref": "Lewis et al., ACL 2020",
    "title": "BART: Denoising Sequence-to-Sequence Pre-training for Natural "
             "Language Generation, Translation, and Comprehension",
    "fr": "Le modèle amont que MedX affine. Explique ce que le résumé sait faire "
          "— et qu'il reformule, donc qu'il peut inventer.",
    "en": "The upstream model MedX fine-tunes. Explains what the summariser can "
          "do — and that it rephrases, so it can invent."},
   {"url": "https://doi.org/10.1053/j.sodo.2021.05.004",
    "ref": "Bianchi et al., Seminars in Orthodontics 2021",
    "title": "Decision Support Systems in Temporomandibular Joint Osteoarthritis",
    "fr": "Le contexte clinique : à quelle décision ces données extraites sont "
          "censées servir.",
    "en": "The clinical context: which decision these extracted data are meant to "
          "serve."},
  ]},

 "MedicalDataAnonymizer": {
  "note": {
   "fr": "Pas de publication : le module assemble des briques existantes "
         "(Presidio, spaCy). Ce qui mérite d'être lu, c'est ce que ces briques "
         "laissent passer — une anonymisation automatique n'est jamais complète.",
   "en": "No publication: the module assembles existing pieces (Presidio, spaCy). "
         "What is worth reading is what those pieces let through — automatic "
         "anonymisation is never complete."},
  "self": [],
  "around": [
   {"url": "https://doi.org/10.25259/SNI_459_2025",
    "ref": "Alrazihi et al., Surgical Neurology International 2025",
    "title": "Evaluating the accuracy of automated and semi-automated "
             "anonymization tools for unstructured health records",
    "fr": "Évalue justement Presidio sur des dossiers libres : le taux de données "
          "identifiantes qui survivent au passage.",
    "en": "Evaluates Presidio itself on free-text records: the share of "
          "identifying data that survives the pass."},
   {"url": "https://doi.org/10.1016/j.jbi.2015.07.020",
    "ref": "Stubbs & Uzuner, J Biomed Inform 2015",
    "title": "Annotating longitudinal clinical narratives for de-identification: "
             "The 2014 i2b2/UTHealth corpus",
    "fr": "Le corpus de référence du domaine et son schéma d'annotation : ce qui "
          "compte, ou non, comme donnée identifiante.",
    "en": "The field's reference corpus and its annotation scheme: what counts, "
          "and what does not, as identifying data."},
   {"url": "https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html",
    "ref": "U.S. Department of Health & Human Services",
    "title": "Guidance Regarding Methods for De-identification of Protected "
             "Health Information",
    "fr": "La règle HIPAA elle-même : les 18 identifiants à retirer, et les deux "
          "seules méthodes qui valent juridiquement.",
    "en": "The HIPAA rule itself: the 18 identifiers to remove, and the only two "
          "methods that hold legally."},
  ]},

 "Agent": {
  "note": {
   "fr": "Pas de publication : le module est un travail en cours, décrit par un "
         "seul rapport de projet NA-MIC.",
   "en": "No publication: the module is work in progress, described by a single "
         "NA-MIC project report."},
  "self": [
   {"url": "https://projectweek.na-mic.org/PW45_2026_Boston/Projects/AiAgentForSlicerautomateddentaltools/",
    "ref": "NA-MIC Project Week 45, Boston 2026",
    "title": "AI-Agent for SlicerAutomatedDentalTools",
    "fr": "Le rapport de projet : ce que l'agent est censé savoir faire, et "
          "jusqu'où le travail est allé.",
    "en": "The project report: what the agent is meant to do, and how far the "
          "work got."},
  ],
  "around": [
   {"url": "https://arxiv.org/abs/2505.09388",
    "ref": "Qwen Team, arXiv 2025",
    "title": "Qwen3 Technical Report",
    "fr": "Le modèle qui décide vers quel outil vous envoyer et qui en extrait "
          "les paramètres.",
    "en": "The model that decides which tool to send you to and extracts its "
          "parameters."},
   {"url": "https://arxiv.org/abs/1908.10084",
    "ref": "Reimers & Gurevych, EMNLP 2019",
    "title": "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
    "fr": "Comment une question est comparée à la documentation indexée : c'est "
          "l'étape qui décide de ce que l'agent a sous les yeux avant de répondre.",
    "en": "How a question is compared against the indexed documentation: the step "
          "that decides what the agent has in front of it before answering."},
   {"url": "https://arxiv.org/abs/1901.04085",
    "ref": "Nogueira & Cho, arXiv 2019",
    "title": "Passage Re-ranking with BERT",
    "fr": "Le reclassement appliqué ensuite aux passages retrouvés, qui améliore "
          "nettement ce qui remonte en tête.",
    "en": "The re-ranking then applied to the retrieved passages, which markedly "
          "improves what comes out on top."},
  ]},
}
