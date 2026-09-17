# AutoCrop3D — sources

**Non publié.** Aucun article, abstract, poster ou rapport de Project Week ne
décrit AutoCrop3D. Deux articles le **citent** au passage comme un outil qu'ils ont
utilisé, en une phrase chacun, sans en décrire ni le fonctionnement ni les
paramètres ; ils sont récupérés ici parce qu'ils sont la seule trace publiée de
l'existence du module. La documentation reste celle du dépôt et celle du module
*Crop Volume* de Slicer, dont AutoCrop3D reprend la sémantique.

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2025_Barone_condylar_remodelling_class_III.xml` / `.txt` | Barone S., Cevidanes L., Bianchi J., Gonçalves J.R., Giudice A. *Deep Learning-Based Three-Dimensional Analysis Reveals Distinct Patterns of Condylar Remodelling After Orthognathic Surgery in Skeletal Class III Patients.* Orthodontics & Craniofacial Research 28(3):441-448, 2025. | Article de revue, texte intégral JATS (Europe PMC, CC BY-NC-ND) | [10.1111/ocr.12895](https://doi.org/10.1111/ocr.12895) — PMCID PMC12056474 |
| `2025_Caleme_MR2CBCT_TMJ_case_series.xml` / `.txt` | Caleme E.D., Cevidanes L., Mattos C., Miranda F., Gurgel M., Barone S., Gaydamour A., Tulissi E., Claret J., Leroux G., Moro A., Gonçalves J., Ruellas A., Zupelari-Gonçalves P., Morettin-Zupelari M., Hsu N., Wolford L., Prieto J., Bianchi J. *Aligning MRI and CBCT for Advanced TMJ Diagnostics: Case Series Using AI-Powered Registration in Dentistry and Orthodontics.* Seminars in Orthodontics, juillet 2025. | Article de revue — manuscrit auteur NIHMS, libre à la lecture dans PMC (récupéré via les E-utilities NCBI) | [10.1053/j.sodo.2025.07.001](https://doi.org/10.1053/j.sodo.2025.07.001) — PMID 40857450, PMCID PMC12360114 |

Ce que ces deux articles disent exactement d'AutoCrop3D, et rien de plus :

- Barone 2025 : *« The total segmentation of the mandible was then cut using the
  automated tool AutoCrop3D for both the right and left sides. »*
- Caleme 2025 : *« Alternatively, clinicians may use the "Auto Crop 3D" module from
  the Automated Dental Tools extension, which allows them to define a custom
  bounding box for image cropping. »*

## À consulter en ligne (pas librement téléchargeable)

Rien. Aucun travail payant n'a été identifié sur ce module.

## Voisinage

Ces ressources **ne décrivent pas AutoCrop3D** ; elles documentent ce dont il
reprend la sémantique, ou ce qu'il contourne.

- [Crop Volume — documentation Slicer](https://slicer.readthedocs.io/en/latest/user_guide/modules/cropvolume.html) :
  la référence du comportement attendu (ROI, *spacing scale*, interpolation,
  *isotropic*).
- [Crop Volume Sequence — documentation Slicer](https://slicer.readthedocs.io/en/latest/user_guide/modules/cropvolumesequence.html) :
  cité par le README du dépôt comme la limitation qu'AutoCrop3D contourne
  (fichiers trop lourds pour être chargés en séquence).
- [DCBIA-OrthoLab/SlicerAutomatedDentalTools](https://github.com/DCBIA-OrthoLab/SlicerAutomatedDentalTools) :
  le dépôt du module. Le `documentation-url` du CLI pointe, lui, vers
  [Jeanneclre/DCBIA-code](https://github.com/Jeanneclre/DCBIA-code), dépôt personnel
  de l'autrice, qui n'est pas celui du projet.

### Ce qui a été cherché sans rien trouver

Europe PMC et OpenAlex en plein texte sur `AutoCrop3D` (1 résultat : Barone 2025,
ci-dessus) et sur `Auto Crop 3D` + Slicer + dentaire ; arborescence complète du
dépôt NA-MIC/ProjectWeek (2 854 fichiers, PW35 → PW45) : aucun projet AutoCrop3D ;
recherche web sur AutoCrop3D + Claret + DCBIA. **Aucun travail ne décrit l'outil.**
