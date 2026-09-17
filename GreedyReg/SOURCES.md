# GreedyReg — sources

**Le module n'est publié nulle part.** Aucun article, aucun abstract, aucun rapport
de Project Week ne porte sur GreedyReg. Ce qui est publié, c'est le **moteur** qu'il
pilote — `greedy`, l'outil de Paul Yushkevich (PICSL, University of Pennsylvania,
livré avec ITK-SNAP) — et le réseau qu'il emprunte pour le mode « Distant
Registration », ALI_CBCT. Ces deux travaux sont du **voisinage** : ils décrivent des
briques, pas ce code, et la nuance est importante ici (voir plus bas : GreedyReg
n'utilise aucune des méthodes que le papier greedy met en avant).

## Récupéré dans ce dossier

| Fichier | Référence | Type | DOI / ID |
|---|---|---|---|
| `2019_Venet_greedy_diffeomorphic_registration.pdf` | Venet L., Pati S., Yushkevich P., Bakas S. *Accurate and Robust Alignment of Variable-Stained Histologic Images Using a General-Purpose Greedy Diffeomorphic Registration Tool.* arXiv:1904.11929, 2019, 3 p. | Preprint arXiv | [arXiv:1904.11929](https://arxiv.org/abs/1904.11929) |
| `2023_Gillot_ALI_landmark_identification.xml` / `.txt` | Gillot M., Miranda F., Baquero B., Ruellas A., Gurgel M., Al Turkestani N., Anchling L., Hutin N., Biggs E., Yatabe M., Paniagua B., Fillion-Robin J.-C., Allemang D., Bianchi J., Cevidanes L., Prieto J.C. *Automatic landmark identification in cone-beam computed tomography.* Orthodontics & Craniofacial Research 26(4):560-567, 2023. | Article de revue, texte intégral JATS (Europe PMC) | [10.1111/ocr.12642](https://doi.org/10.1111/ocr.12642) — PMID 36811276, PMCID PMC10440369 |

## À consulter en ligne (pas librement téléchargeable)

| Référence | Où | DOI |
|---|---|---|
| Yushkevich P.A., Pluta J., Wang H., Wisse L.E.M., Das S., Wolk D. *IC-P-174: Fast Automatic Segmentation of Hippocampal Subfields and Medial Temporal Lobe Subregions in 3 Tesla and 7 Tesla T2-Weighted MRI.* Alzheimer's & Dementia 12(7S_Part_2):P126-P127, 2016. **C'est la citation que le site officiel de greedy demande d'utiliser** ([sites.google.com/view/greedyreg/cite](https://sites.google.com/view/greedyreg/cite)). Abstract de congrès, payant. | [alz-journals.onlinelibrary.wiley.com](https://alz-journals.onlinelibrary.wiley.com/doi/10.1016/j.jalz.2016.06.205) | [10.1016/j.jalz.2016.06.205](https://doi.org/10.1016/j.jalz.2016.06.205) |
| Yushkevich P.A., Piven J., Hazlett H.C., Smith R.G., Ho S., Gee J.C., Gerig G. *User-guided 3D active contour segmentation of anatomical structures: Significantly improved efficiency and reliability.* NeuroImage 31(3):1116-1128, 2006. La référence d'**ITK-SNAP**, dont le module reprend le panneau *Registration* et dont il télécharge le binaire (archive ITK-SNAP 4.2.2 sur SourceForge). Payant, aucun dépôt. | [sciencedirect.com](https://www.sciencedirect.com/science/article/pii/S1053811906000632) | [10.1016/j.neuroimage.2006.01.015](https://doi.org/10.1016/j.neuroimage.2006.01.015) |

## Voisinage

Aucun des travaux ci-dessous **ne décrit GreedyReg**. Ils décrivent le moteur ou
les briques.

- **Le papier greedy (Venet 2019, récupéré) décrit ce que GreedyReg n'utilise
  pas.** Il présente un recalage **difféomorphe** en deux temps : une étape affine
  d'initialisation, puis l'estimation d'un champ de déformation. GreedyReg
  n'appelle jamais que la première : `greedy -a` avec `-dof 6` ou `-dof 12`, et
  `greedy -rf/-rm` pour le rééchantillonnage. Le champ de déformation, le
  « greedy » du nom, la métrique NCC difféomorphe — rien de tout cela n'est
  exécuté. Citer ce papier pour décrire GreedyReg reviendrait à décrire une
  méthode que le module n'emploie pas.
- **ITK-SNAP** (Yushkevich 2006, ci-dessus) : le module est une transposition dans
  Slicer du panneau *Registration* d'ITK-SNAP — pré-alignement manuel, puis affine
  par intensité avec masque. C'est la seule filiation revendiquable depuis le code,
  et elle est architecturale, pas méthodologique.
- **ALI_CBCT** (Gillot 2023, récupéré) : agents virtuels naviguant dans un espace
  volumétrique multi-échelle, 1,54 ± 0,87 mm sur 32 landmarks. Réellement appelé
  par GreedyReg, mais **uniquement** en mode « Distant Registration », pour
  produire les landmarks que le module aligne ensuite par Kabsch. Le papier ne dit
  rien de cet usage. Dépôt d'origine : [Maxlo24/ALI_CBCT](https://github.com/Maxlo24/ALI_CBCT).
- **Fondations du recalage difféomorphe** citées par le site de greedy, sans aucun
  rapport avec ce que GreedyReg exécute : Joshi S., Davis B., Jomier M., Gerig G.,
  *Unbiased diffeomorphic atlas construction for computational anatomy*, NeuroImage
  23:S151-S160, 2004 ([10.1016/j.neuroimage.2004.07.068](https://doi.org/10.1016/j.neuroimage.2004.07.068)) ;
  Avants B.B., Epstein C.L., Grossman M., Gee J.C., *Symmetric diffeomorphic image
  registration with cross-correlation*, Medical Image Analysis 12(1):26-41, 2008
  ([10.1016/j.media.2007.06.004](https://doi.org/10.1016/j.media.2007.06.004)) ;
  Avants B.B. *et al.*, *A reproducible evaluation of ANTs similarity metrics*,
  NeuroImage 54(3):2033-2044, 2011
  ([10.1016/j.neuroimage.2010.09.025](https://doi.org/10.1016/j.neuroimage.2010.09.025)).
- **Documentation et code** : [greedy.readthedocs.io](https://greedy.readthedocs.io/en/latest/reference.html),
  [sites.google.com/view/greedyreg](https://sites.google.com/view/greedyreg/about)
  (le site officiel de greedy — attention à l'homonymie : ce n'est pas ce module),
  [github.com/pyushkevich/greedy](https://github.com/pyushkevich/greedy).

### Ce qui a été cherché sans rien trouver

Europe PMC et OpenAlex en plein texte sur `GreedyReg` : 3 résultats pour chacun,
tous des homonymes (CaPTk, une étude d'anévrisme aortique, une étude
d'hippocampe) qui désignent le moteur, jamais ce module. Arborescence complète du
dépôt NA-MIC/ProjectWeek (2 854 fichiers, PW35 → PW45) : aucun projet GreedyReg.
Recherche web sur greedy + 3D Slicer + CBCT T1/T2. **Rien.**
