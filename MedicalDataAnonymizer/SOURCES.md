# Medical Data Anonymizer — sources

**Non publié.** Aucun article, abstract, poster ou rapport de Project Week ne porte
sur ce module, et le dépôt ne contient aucune évaluation — ni rappel, ni précision,
sur aucun corpus. Les seules références réelles sont techniques : **Presidio**
(Microsoft) et **spaCy**, ses deux briques, qui n'ont ni l'un ni l'autre d'article
de revue. S'y ajoute un voisinage qu'il faut nommer, puisque la fiche établit que ce
module dé-identifie du **texte** et non du DICOM : la littérature des campagnes
i2b2/n2c2 est l'état de l'art du problème que ce code attaque. **Aucun de ces
travaux ne décrit ce code.**

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2025_Alrazihi_presidio_philter_evaluation.xml` / `.txt` | Alrazihi L.A., Biswas S., George J. *Evaluating the accuracy of automated and semi-automated anonymization tools for unstructured health records.* Surgical Neurology International 16:313, 2025. Évaluation de **Microsoft Presidio** et de Philter sur 200 documents cliniques non structurés : c'est la mesure de performance que ce module ne fournit pas. | Article de revue, texte intégral JATS (Europe PMC, CC BY-NC-SA) | [10.25259/SNI_459_2025](https://doi.org/10.25259/SNI_459_2025) — PMCID PMC12477974 |

## À consulter en ligne (pas librement téléchargeable)

Les vues d'ensemble des campagnes de dé-identification de texte clinique sont des
manuscrits auteur déposés dans PMC : libres à la lecture, mais hors du sous-ensemble
librement redistribuable. Liens et DOI, donc, plutôt que des fichiers.

| Référence | Où | DOI |
|---|---|---|
| Uzuner Ö., Luo Y., Szolovits P. *Evaluating the state-of-the-art in automatic de-identification.* JAMIA 14(5):550-563, 2007. Le premier challenge i2b2 de dé-identification. | [PMC1975792](https://pmc.ncbi.nlm.nih.gov/articles/PMC1975792/) | [10.1197/jamia.M2444](https://doi.org/10.1197/jamia.M2444) |
| Stubbs A., Uzuner Ö. *Annotating longitudinal clinical narratives for de-identification: The 2014 i2b2/UTHealth corpus.* Journal of Biomedical Informatics 58(Suppl):S20-S29, 2015. Le corpus de référence et son schéma d'annotation. | [PMC4978170](https://pmc.ncbi.nlm.nih.gov/articles/PMC4978170/) | [10.1016/j.jbi.2015.07.020](https://doi.org/10.1016/j.jbi.2015.07.020) |
| Stubbs A., Kotfila C., Uzuner Ö. *Automated systems for the de-identification of longitudinal clinical narratives: Overview of 2014 i2b2/UTHealth shared task Track 1.* Journal of Biomedical Informatics 58(Suppl):S11-S19, 2015. Les scores comparés des systèmes engagés — la grille de lecture pour juger un outil de ce type. | [PMC4989908](https://pmc.ncbi.nlm.nih.gov/articles/PMC4989908/) | [10.1016/j.jbi.2015.06.007](https://doi.org/10.1016/j.jbi.2015.06.007) |
| Stubbs A., Filannino M., Uzuner Ö. *De-identification of psychiatric intake records: Overview of 2016 CEGS N-GRID shared tasks Track 1.* Journal of Biomedical Informatics 75S:S4-S18, 2017. La campagne suivante, sur des dossiers plus longs et plus bruités. | [PMC5705537](https://pmc.ncbi.nlm.nih.gov/articles/PMC5705537/) | [10.1016/j.jbi.2017.06.011](https://doi.org/10.1016/j.jbi.2017.06.011) |
| Gaydamour A., Tulissi E., Mattos C.T., *et al.*, Cevidanes L. *AI-Driven Multimodal TMJ Patient Modeling: From Unstructured Notes to Precision Treatment.* Clinical Image-Based Procedures (CLIP 2025), LNCS vol. 16126, Springer, 2025, p. 42-52. Le même laboratoire traite des notes cliniques non structurées — mais pour en **extraire** 56 indicateurs par LLM (BART, DeepSeek-R1), pas pour les dé-identifier. Aucun lien avec ce module. | [link.springer.com](https://link.springer.com/chapter/10.1007/978-3-032-05479-1_5) | [10.1007/978-3-032-05479-1_5](https://doi.org/10.1007/978-3-032-05479-1_5) |

## Voisinage

Aucun de ces travaux **ne décrit ce module**.

- **Microsoft Presidio** — le moteur de détection et d'anonymisation. Pas d'article :
  la documentation fait référence, avec la liste exacte des reconnaisseurs prédéfinis
  et des opérateurs (`replace`, `redact`, `hash`, `mask`, `encrypt` — ce dernier,
  réversible avec une clé, n'est pas proposé par le module).
  [microsoft.github.io/presidio](https://microsoft.github.io/presidio/) ·
  [github.com/microsoft/presidio](https://github.com/microsoft/presidio)
- **spaCy** — le NER anglais `en_core_web_lg` utilisé par défaut. Pas d'article non
  plus ; citer l'enregistrement logiciel : Honnibal M., Montani I., Van Landeghem S.,
  Boyd A. *spaCy: Industrial-strength Natural Language Processing in Python.* Zenodo,
  2020, [10.5281/zenodo.1212303](https://doi.org/10.5281/zenodo.1212303).
  Modèles : [spacy.io/models/en](https://spacy.io/models/en).
- **Alrazihi 2025** (récupéré ci-dessus) : évalue Presidio « nu », sur des comptes
  rendus de neurochirurgie, avec une liste d'entités et un prétraitement qui ne sont
  pas ceux de ce module. Les chiffres ne sont donc **pas transposables** tels quels
  — mais c'est le seul ordre de grandeur publié disponible.
- **HIPAA Safe Harbor, 45 CFR §164.514(b)(2)** : les 18 catégories d'identifiants à
  retirer. Grille de lecture de la §7 de la fiche — les noms de fichiers, les
  identifiants de dossier médical et les identifiants d'images y figurent, et ce
  module ne les traite pas.
  [hhs.gov — De-identification](https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html)
- **Anonymiseurs DICOM**, pour lever l'ambiguïté du nom du module : ce sont des
  outils distincts, dans d'autres extensions, sans rapport avec ce code —
  *SlicerBatchAnonymize* (rapports NA-MIC PW37 et PW38) et le *SlicerUltrasound DICOM
  Anonymizer* (PW43).

### Ce qui a été cherché sans rien trouver

Europe PMC sur `presidio AND de-identification` (682 résultats, aucun sur ce
module), `"Presidio" AND anonymization`, `SlicerAutomatedDentalTools` et
`"Automated Dental Tools"` (9 résultats, tous sur l'imagerie) ; arborescence
complète du dépôt NA-MIC/ProjectWeek (2 854 fichiers, PW35 → PW45) : les seuls
projets d'anonymisation portent sur le DICOM, pas sur le texte. **Rien ne décrit ce
module, et rien ne le cite.**
