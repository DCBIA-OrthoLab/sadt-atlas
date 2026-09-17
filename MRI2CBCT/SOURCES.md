# MRI2CBCT — sources

**Partiellement publié, et publié en décalage avec le code.** Deux textes portent
bien sur ce module : le papier de méthode (Leroux *et al.*, CLIP 2024, payant) et
une série de cas clinique qui documente son usage (Caleme *et al.*, *Seminars in
Orthodontics* 2025, récupérée ici). Aucun des deux ne décrit la version qui tourne
aujourd'hui : le papier CLIP 2024 décrit l'approximation par `torchreg` + NMI,
remplacée depuis par une segmentation nnU-Net du condyle suivie d'un
`fiducialregistration` à un point ; la série de cas de 2025 renvoie au papier CLIP
pour les détails techniques et ne mentionne ni la segmentation du condyle, ni le
crop TMJ. Un troisième texte (Gaydamour *et al.*, CLIP 2025, payant) annonce en
passant la seule évaluation chiffrée du pipeline publiée à ce jour : précision
sub-millimétrique, 98,75 % de réussite. Ce qui est publié et vérifié dans le
code : le recalage final est bien un **elastix rigide en information mutuelle de
Mattes**.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2025_Caleme_MR2CBCT_TMJ_case_series.xml` / `.txt` | Caleme E.D., Cevidanes L., Mattos C., Miranda F., Gurgel M., Barone S., Gaydamour A., Tulissi E., Claret J., Leroux G., Moro A., Gonçalves J., Ruellas A., Zupelari-Gonçalves P., Morettin-Zupelari M., Hsu N., Wolford L., Prieto J., Bianchi J. *Aligning MRI and CBCT for Advanced TMJ Diagnostics: Case Series Using AI-Powered Registration in Dentistry and Orthodontics.* Seminars in Orthodontics, juillet 2025. | Article de revue — **manuscrit auteur NIHMS**, libre à la lecture dans PMC (récupéré via les E-utilities NCBI ; le `fullTextXML` d'Europe PMC renvoie vide pour ce PMCID) | [10.1053/j.sodo.2025.07.001](https://doi.org/10.1053/j.sodo.2025.07.001) — PMID 40857450, PMCID **PMC12360114** |
| `2025_NAMIC_PW43_automated_cbct_mri_registration.md` | Gaydamour A., Cevidanes L., Leroux G., Prieto J., Pieper S., Tulissi E. *Automated CBCT-MRI Registration Advances Temporomandibular Degenerative Joint Disease Diagnosis.* 43e NA-MIC Project Week, Montréal, 2025. | Rapport de projet NA-MIC | [projectweek.na-mic.org/PW43_2025_Montreal](https://projectweek.na-mic.org/PW43_2025_Montreal/Projects/AutomatedCbctMriRegistrationAdvancesTemporomandibularDegenerativeJointDiseaseDiagnosis/) |
| `2026_NAMIC_PW45_MR2CBCT_restoring_extending.md` | Caleme E.D., Cevidanes L., Dumont P., Buisson A., Pieper S., Leroux G., Prieto J., Gaydamour A., Lasso A. *MR2CBCT: Restoring and Extending Automated CBCT-MRI Registration for TMJ Analysis.* 45e NA-MIC Project Week, Boston, 2026. | Rapport de projet NA-MIC | [projectweek.na-mic.org/PW45_2026_Boston](https://projectweek.na-mic.org/PW45_2026_Boston/Projects/Mr2CbctRestoringAndExtendingAutomatedCbctMriRegistrationForTmjAnalysis/) |
| `2010_Klein_elastix_registration_toolbox.pdf` | Klein S., Staring M., Murphy K., Viergever M.A., Pluim J.P.W. *elastix: A Toolbox for Intensity-Based Medical Image Registration.* IEEE Transactions on Medical Imaging 29(1):196-205, 2010. | Article de revue, **version auteur** déposée par M. Staring sur elastix.lumc.nl | [10.1109/TMI.2009.2035616](https://doi.org/10.1109/TMI.2009.2035616) |
| `2020_Isensee_nnUNet_automated_design.pdf` | Isensee F., Jaeger P.F., Kohl S.A.A., Petersen J., Maier-Hein K.H. *Automated Design of Deep Learning Methods for Biomedical Image Segmentation.* arXiv:1904.08128v2, 2020, 55 p. — version soumise de l'article Nature Methods. | Preprint arXiv | [arXiv:1904.08128](https://arxiv.org/abs/1904.08128) |
| `2016_AlSaleh_MRI_CBCT_TMJ_systematic_review.xml` / `.txt` | Al-Saleh M.A.Q., Alsufyani N.A., Saltaji H., Jaremko J.L., Major P.W. *MRI and CBCT image registration of temporomandibular joint: a systematic review.* Journal of Otolaryngology – Head & Neck Surgery 45:30, 2016. | Revue systématique, texte intégral JATS (Europe PMC, CC-BY) | [10.1186/s40463-016-0144-4](https://doi.org/10.1186/s40463-016-0144-4) — PMCID PMC4863319 |
| `2017_AlSaleh_3D_TMJ_MRI_CBCT_registration.pdf` | Al-Saleh M.A.Q., Punithakumar K., Lagravère M.O., Boulanger P., Jaremko J.L., Major P.W. *Three-Dimensional Assessment of Temporomandibular Joint Using MRI-CBCT Image Registration.* PLOS ONE 12(1):e0169555, 2017. | Article de revue, PDF éditeur (CC-BY) | [10.1371/journal.pone.0169555](https://doi.org/10.1371/journal.pone.0169555) |

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| Leroux G., Mattos C.T., Claret J., Caleme E., Barone S., Gurgel M., Miranda F., Gonçalves J.R., Zupelari-Gonçalves P., Morettin-Zupelari M., Wolford L.M., Hsu N.S., Ruellas A.C.O., Bianchi J., Prieto J.C., Cevidanes L. *Novel CBCT-MRI Registration Approach for Enhanced Analysis of Temporomandibular Degenerative Joint Disease.* In: Drechsler K. *et al.* (eds), *Clinical Image-Based Procedures* (CLIP 2024, atelier MICCAI), Lecture Notes in Computer Science vol. 15196, Springer, 2024, p. 63-72. **C'est le papier de méthode du module.** Aucun dépôt, aucune version auteur : Unpaywall et OpenAlex le donnent tous deux `closed`. | [link.springer.com](https://link.springer.com/chapter/10.1007/978-3-031-73083-2_7) | [10.1007/978-3-031-73083-2_7](https://doi.org/10.1007/978-3-031-73083-2_7) |
| Gaydamour A., Tulissi E., Mattos C.T., Teixeira R.H.F., Shin M.Y., Hershey A., Kwon A., Miranda F., Gurgel M., Barone S., Aliaga A., Yatabe M., Zupelari-Gonçalves P., Morettin-Zupelari M., Hanauer D.I., Hsu N.S., Pieper S., Caleme E., Bianchi J., Gonçalves J.R., Gonçalves D., Wolford L., Ruellas A.C.O., Prieto J.C., Li T., Zhu H., Dai R., Styner M., Al Turkestani N., DaSilva A.F., Cevidanes L. *AI-Driven Multimodal TMJ Patient Modeling: From Unstructured Notes to Precision Treatment.* In: *Clinical Image-Based Procedures* (CLIP 2025), Lecture Notes in Computer Science vol. 16126, Springer, 2025, p. 42-52. Le volet imagerie rapporte **la seule évaluation chiffrée du pipeline MRI2CBCT publiée : erreur sub-millimétrique, 98,75 % de réussite.** Le reste du papier porte sur l'extraction d'indicateurs cliniques par LLM, sans rapport avec ce module. | [link.springer.com](https://link.springer.com/chapter/10.1007/978-3-032-05479-1_5) | [10.1007/978-3-032-05479-1_5](https://doi.org/10.1007/978-3-032-05479-1_5) |
| Isensee F. *et al.* *nnU-Net: a self-configuring method for deep learning-based biomedical image segmentation.* Nature Methods 18(2):203-211, 2021. Version de référence à citer pour nnU-Net ; seul le preprint arXiv ci-dessus est redistribuable. | [nature.com](https://www.nature.com/articles/s41592-020-01008-z) | [10.1038/s41592-020-01008-z](https://doi.org/10.1038/s41592-020-01008-z) |
| Fedorov A. *et al.* *3D Slicer as an image computing platform for the Quantitative Imaging Network.* Magnetic Resonance Imaging 30(9):1323-1341, 2012. La plateforme hôte. | [PMC3466397](https://pmc.ncbi.nlm.nih.gov/articles/PMC3466397/) | [10.1016/j.mri.2012.05.001](https://doi.org/10.1016/j.mri.2012.05.001) |

## Voisinage

Travaux proches qui **ne décrivent pas ce module**.

- **Al-Saleh 2016 et 2017** (récupérés ci-dessus) : équipe de l'Université de
  l'Alberta, sans lien avec DCBIA. Ils posent le problème — recalage IRM/CBCT de
  l'ATM, ses écueils, l'état de l'art avant ce module — et servent de point de
  comparaison, pas de description du code.
- **elastix** (Klein 2010, récupéré) : décrit la bibliothèque de recalage, pas son
  usage ici. Le module passe par le *wrapper* Python **ITKElastix**
  (`itk.ElastixRegistrationMethod`) avec le *parameter map* `rigid` par défaut,
  une seule résolution et aucune transformation initiale — un point de
  paramétrage que le papier ne couvre évidemment pas. Seconde citation usuelle
  d'elastix, non récupérée ici : Shamonin D.P. *et al.*, *Fast parallel image
  registration on CPU and GPU…*, Front. Neuroinform. 7:50, 2014
  ([10.3389/fninf.2013.00050](https://doi.org/10.3389/fninf.2013.00050), CC-BY).
- **nnU-Net** (Isensee, récupéré) : la méthode auto-configurante derrière le
  réseau de segmentation du condyle. **Ni l'entraînement, ni le jeu de données,
  ni l'évaluation des poids `Dataset001_myseg` utilisés par MRI2CBCT ne sont
  documentés nulle part**, publication comprise.
- **Modules amont de l'extension**, cités par Caleme 2025 comme préparation des
  entrées mais jamais appelés depuis le code de MRI2CBCT :
  ASO/AREG — Anchling L. *et al.*, *Automated Orientation and Registration of
  Cone-Beam Computed Tomography Scans*, CLIP 2023, LNCS
  ([PMC11104011](https://pmc.ncbi.nlm.nih.gov/articles/PMC11104011/)) ;
  AMASSS — Gillot M. *et al.*, PLOS ONE 17(9):e0275033, 2022
  ([10.1371/journal.pone.0275033](https://doi.org/10.1371/journal.pone.0275033)).
- **TorchReg** ([github.com/codingfisch/torchreg](https://github.com/codingfisch/torchreg)) :
  la voie d'approximation du papier CLIP 2024 et du rapport PW43, abandonnée
  depuis dans le code. Aucune publication.

### Ce qui a été cherché sans rien trouver

Europe PMC et OpenAlex en plein texte sur `MRI2CBCT` (0 résultat) et `MR2CBCT`
(1 résultat, l'article de Caleme ci-dessus) ; Europe PMC sur
`MRI AND CBCT AND registration AND temporomandibular` et `AUTH:"Cevidanes" AND MRI
AND CBCT` ; Unpaywall et OpenAlex sur les DOI des deux papiers
CLIP (aucun dépôt, aucune version auteur) ; listes de publications OpenAlex de
G. Leroux, J. Claret, A. Gaydamour et E. Caleme, dépouillées une à une ;
recherche web d'un abstract ou poster AADOCR/IADR ou AAO sur ce recalage.
**Rien d'autre.** Deep Blue (deepblue.lib.umich.edu), le dépôt institutionnel de
l'University of Michigan, n'a pas pu être interrogé : il est derrière Cloudflare
et refuse toute requête automatique — **à vérifier à la main**.
