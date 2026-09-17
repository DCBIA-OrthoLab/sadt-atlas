# MedX — sources

Outil **publié une fois, et partiellement** : un chapitre d'atelier MICCAI 2025
décrit le fine-tuning du modèle de résumé que MedX distribue, mais le module du
dépôt n'implémente qu'une fraction de ce que le papier présente — le papier
travaille dans un cadre multimodal (IRM et CBCT recalés), MedX ne lit que du
texte. Le chapitre est **payant** et n'est pas dans PMC : rien du travail propre
à MedX n'a pu être récupéré ici.

La piste est solide et vérifiée sur deux points : les **auteurs** du chapitre
sont bien l'équipe du dépôt (Gaydamour, Tulissi, Mattos, Miranda, Gurgel,
Prieto, Cevidanes…), et le nombre d'**indicateurs cliniques** annoncé par la
fiche — 56 — est exactement le nombre de clés de
`initialize_key_value_summary()`
([MedX_CLI/MedX_CLI_utils/dashboard_utils.py:343](MedX_CLI/MedX_CLI_utils/dashboard_utils.py#L343),
recompté : 56). En revanche le résumé du chapitre n'est diffusé librement ni par
Springer, ni par Crossref, ni par OpenAlex : **les chiffres rapportés dans
[MedX.md](MedX.md) (1 813 segments annotés, 500 dossiers TMD, BART contre
DeepSeek-R1) n'ont pas pu être recontrôlés depuis une source ouverte** et restent
à confirmer sur le texte de l'éditeur.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2019_Lewis_BART_denoising_pretraining.pdf` | Lewis M, Liu Y, Goyal N, Ghazvininejad M, Mohamed A, Levy O, Stoyanov V, Zettlemoyer L. *BART: Denoising Sequence-to-Sequence Pre-training for Natural Language Generation, Translation, and Comprehension.* arXiv:1910.13461, 29 oct. 2019 (ACL 2020, pp. 7871–7880). | Preprint arXiv | [arXiv:1910.13461](https://arxiv.org/abs/1910.13461) |
| `2025_Caleme_MRI_CBCT_TMJ_registration.xml` / `.txt` | Caleme ED, Cevidanes L, Mattos C, Miranda F, Gurgel M, Barone S, Gaydamour A, Tulissi E, Claret J, Leroux G, Moro A, Gonçalves J, Ruellas A, Morettin Zupelari M, Zupelari-Gonçalves P, Hsu N, Wolford L, Prieto J, Bianchi J. *Aligning MRI and CBCT for Advanced TMJ Diagnostics: Case Series Using AI-Powered Registration in Dentistry and Orthodontics.* Semin Orthod 2026;32(2):387–396 (en ligne 2025). | Article (texte intégral JATS, manuscrit auteur) | [10.1053/j.sodo.2025.07.001](https://doi.org/10.1053/j.sodo.2025.07.001) — PMC12360114 |
| `2021_Bianchi_decision_support_TMJOA.xml` / `.txt` | Bianchi J, Ruellas A, Prieto JC, Li T, Soroushmehr R, Najarian K, Gryak J, Deleat-Besson R, Le C, Yatabe M, Gurgel M, Al Turkestani N, Paniagua B, Cevidanes L. *Decision Support Systems in Temporomandibular Joint Osteoarthritis: A review of Data Science and Artificial Intelligence Applications.* Semin Orthod 2021;27(2):78–86. | Article (texte intégral JATS, manuscrit auteur) | [10.1053/j.sodo.2021.05.004](https://doi.org/10.1053/j.sodo.2021.05.004) — PMC8294157 |

Les `.txt` sont la conversion lisible du JATS ; le `.xml` est la source.

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| **Gaydamour A, Tulissi E, Mattos C, Teixeira R, Shin M, Hershey A, Kwon A, Miranda F, Gurgel M, Barone S, Aliaga A, Yatabe M, Zupelari P, Zupelari M, Hanauer D, Hsu N, Pieper S, Caleme E, Bianchi J, Goncalves J, Goncalves D, Wolford L, Ruellas A, Prieto J, Li T, Zhu H, Dai R, Styner M, Al Turkestani N, DaSilva AF, Cevidanes L. *AI-Driven Multimodal TMJ Patient Modeling: From Unstructured Notes to Precision Treatment.* In: Clinical Image-Based Procedures — 14th International Workshop, CLIP 2025, held in conjunction with MICCAI 2025, Daejeon, Corée du Sud, 23 septembre 2025. Lecture Notes in Computer Science, Springer Nature Switzerland, 2025, pp. 42–52. ISBN 978-3-032-05478-4 / 978-3-032-05479-1.** C'est *le* papier de MedX. Payant, pas dans PMC au 14 sept. 2026, aucune version auteur repérée (HAL : 0 résultat sur Gaydamour ; Unpaywall et OpenAlex, qui indexent arXiv et les dépôts institutionnels : aucune localisation ouverte). Deep Blue, le dépôt de l'University of Michigan, n'a pas pu être interrogé — son API renvoie 403 derrière Cloudflare ; à vérifier à la main sur [deepblue.lib.umich.edu](https://deepblue.lib.umich.edu). | [Springer](https://link.springer.com/chapter/10.1007/978-3-032-05479-1_5) | [10.1007/978-3-032-05479-1_5](https://doi.org/10.1007/978-3-032-05479-1_5) |

Vérifié : aucun dépôt ouvert ne référence ce chapitre (Unpaywall : `closed` ;
Europe PMC : 0 résultat sur le titre comme sur l'auteur Gaydamour, hors le
Semin Orthod ci-dessus).

## Modèles et dépôts

| Objet | Où |
|---|---|
| `facebook/bart-large-cnn`, le modèle amont fine-tuné | [Hugging Face](https://huggingface.co/facebook/bart-large-cnn) |
| Le module | [SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools) |

## Voisinage

Ces travaux **ne décrivent pas MedX** et n'ont aucun rapport avec le code de
résumé automatique du module. Ils sont là pour situer le problème clinique et le
reste du système dont MedX était censé être une brique.

- **Caleme 2025** (fichier ci-dessus) : la moitié *image* du papier CLIP 2025,
  par une équipe qui recoupe presque exactement celle du chapitre — Gaydamour et
  Tulissi y sont co-auteurs. On y trouve le recalage IRM/CBCT que le chapitre
  décrit comme le versant multimodal, et **rien** sur le texte clinique ni sur la
  summarization. C'est le seul article indexé dans Europe PMC portant la
  signature de Gaydamour.
- **Bianchi 2021** (fichier ci-dessus) : la revue des systèmes d'aide à la
  décision en arthrose temporo-mandibulaire du même groupe. Elle énumère les
  variables cliniques, d'imagerie et biologiques que le groupe collecte depuis
  des années — le vocabulaire dont les 56 indicateurs de MedX sont une mise en
  schéma. Antérieure de quatre ans à MedX, aucune mention de NLP.
- Al Turkestani N, Li T, Bianchi J, Gurgel M, Prieto J, Shah H, Benavides E,
  Soki F, Mishina Y, Fontana M, Rao A, Zhu H, Cevidanes L. *A comprehensive
  patient-specific prediction model for temporomandibular joint osteoarthritis
  progression.* PNAS 2024;121(8):e2306132121,
  [10.1073/pnas.2306132121](https://doi.org/10.1073/pnas.2306132121), PMC10895339,
  accès ouvert. Le modèle pronostique multi-source vers lequel le dashboard
  patient/cohorte du chapitre CLIP est censé alimenter. Rien sur le texte libre.

Sur l'extraction d'information depuis des dossiers cliniques d'ATM par ce
groupe : **il n'y a rien d'autre**. Une recherche Europe PMC
`AUTH:"Cevidanes L" AND ("natural language processing" OR "clinical notes" OR
"electronic health record" OR "large language model" OR summarization OR "text
mining")` ne remonte qu'un article de 2019 sans rapport (analyse statistique de
matrices de texture). Le chapitre CLIP 2025 est le premier et le seul travail
NLP du groupe.
