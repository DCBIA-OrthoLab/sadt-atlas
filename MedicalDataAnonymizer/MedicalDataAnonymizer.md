# Medical Data Anonymizer — pipeline complet

Détection et remplacement d'entités sensibles dans des **documents texte**
(DOCX, TXT, PDF, CSV, XML, ODT) par Microsoft Presidio. Point à poser d'emblée, parce
qu'il conditionne tout usage : **ce module ne touche à aucune image médicale**.

## 0. Ce que le module n'est pas

Le nom laisse attendre un anonymiseur DICOM. Il n'en est rien, et c'est vérifiable en
une commande :

```
$ grep -rin "dicom\|pydicom\|deface" Medical_Data_Anonymizer_Module/
(aucun résultat)
$ grep -rlni "deface" --include="*.py" --include="*.md" .
(aucun résultat dans tout le dépôt)
```

Conséquences directes :

- **aucun tag DICOM n'est effacé ni remplacé** : ni `PatientName` (0010,0010), ni
  `PatientID` (0010,0020), ni `PatientBirthDate`, ni `StudyDate`, ni `InstitutionName`,
  ni les UID, ni les *private tags*, ni les `BurnedInAnnotation` ;
- **aucun defacing** : le visage reconstructible d'un CBCT ou d'un scanner n'est jamais
  altéré, par aucune méthode (ni masque facial, ni flou, ni suppression de surface).
  Il n'existe aucun outil de defacing dans l'extension entière ;
- les formats pris en charge (`.docx`, `.txt`, `.pdf`, `.csv`, `.xml`, `.odt`,
  [Medical_Data_Anonymizer_Module.py:506](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L506))
  ne recouvrent ni `.dcm`, ni `.nii.gz`, ni `.nrrd`, ni `.vtk`, ni `.json` de landmarks.

Un opérateur qui doit décider s'il peut partager des données lira directement la §7.

## 1. Situation dans la chaîne

Outil isolé, sans CLI. Rien ne l'appelle, il n'appelle rien du dépôt. Tout tient dans
un seul fichier de 767 lignes, dont ~350 de feuilles de style Qt :
[Medical_Data_Anonymizer_Module.py](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py).

`Medical_Data_Anonymizer_ModuleLogic` et `…Test` sont des classes vides (`pass`) : toute
la logique vit dans le widget, donc **dans le thread principal de Slicer** — l'interface
gèle pendant le traitement, seul `slicer.app.processEvents()` rafraîchit la barre de
progression.

## 2. Entrées : extraction de texte, format par format

Parcours **récursif** du dossier d'entrée (`os.walk`), les fichiers commençant par `~$`
(verrous Word) sont ignorés. Chaque fichier est réduit à une **chaîne de caractères
unique** avant analyse :

| Format | Extraction | Ce qui est perdu au passage |
|---|---|---|
| `.docx` | `python-docx`, `"\n".join(p.text for p in doc.paragraphs)` | **tableaux**, en-têtes/pieds de page, notes, zones de texte, commentaires, métadonnées du fichier |
| `.txt` | lecture brute UTF-8 | — |
| `.pdf` | `pdfplumber`, `page.extract_text()` ; en cas d'exception, seconde tentative via `extract_tables()` | images, PDF scannés (aucun OCR) → texte vide |
| `.csv` | `csv.reader`, chaque ligne aplatie par `" ".join(row)` | **la structure en colonnes** |
| `.xml` | `ElementTree` + `extract_text_from_xml()` récursif (texte + `tail`) | **balises et attributs** : les valeurs d'attributs ne sont jamais lues |
| `.odt` | `odfpy`, nœuds texte des `text.P` | tableaux, styles, métadonnées |

La perte n'est pas qu'une question de fidélité : les documents de sortie sont
**reconstruits à partir de cette chaîne**. Ce qui n'a pas été extrait n'est pas
anonymisé, mais n'est pas non plus recopié — il disparaît. À l'inverse, un contenu
sensible situé dans une partie non extraite (un tableau DOCX, un attribut XML) n'est ni
détecté ni recopié : pas de fuite, mais perte de données silencieuse.

Exception notable : rien ne lit les **métadonnées** des fichiers (auteur DOCX, `Producer`
d'un PDF). Elles disparaissent aussi, puisque les fichiers sont recréés de zéro.

## 3. Le moteur de détection

Pas de modèle dans le dépôt, pas de poids téléchargés par le module lui-même hormis le
modèle spaCy. Deux moteurs Presidio sont instanciés **à chaque clic** sur « Anonymize
Files » ([…py:493](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L493)),
avec `stderr` court-circuité par une classe `SuppressStderr` :

```python
analyzer = AnalyzerEngine()      # config par défaut
anonymizer = AnonymizerEngine()
```

`AnalyzerEngine()` sans argument utilise la configuration NLP par défaut de Presidio,
c'est-à-dire **spaCy `en_core_web_lg`** — c'est le seul modèle que
`install_dependencies()` télécharge (`spacy.cli.download`,
[…py:411](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L411)).

Deux familles de reconnaisseurs se combinent : la **NER statistique** de spaCy
(`PERSON`, `LOCATION`, `DATE_TIME`) et des **reconnaisseurs à motifs et sommes de
contrôle** (`PHONE_NUMBER`, `EMAIL_ADDRESS`, `US_SSN`, `MEDICAL_LICENSE`,
`US_DRIVER_LICENSE`, `CREDIT_CARD`, `US_BANK_NUMBER`, `IP_ADDRESS`, `URL`).

**La langue est figée à l'anglais** : `analyzer.analyze(..., language='en')`
([…py:713](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L713)),
malgré le commentaire « with automatic language detection » et l'installation de
`langdetect`, qui n'est **jamais importé** — dépendance morte. Un dossier de notes en
français passera par un modèle anglais, avec le rappel qu'on imagine.

**Seuil de confiance** : `score_threshold`, curseur 0.0–1.0, défaut **0.5**. Les
détections sous le seuil sont abandonnées sans trace.

## 4. Entités et méthodes de remplacement

Douze cases à cocher, sept cochées par défaut
([…py:90](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L90)) :

| Entité Presidio | Libellé UI | Défaut |
|---|---|---|
| `PERSON` | Names (patients, doctors) | ✔ |
| `PHONE_NUMBER` | Phone Numbers | ✔ |
| `EMAIL_ADDRESS` | Email Addresses | ✔ |
| `DATE_TIME` | Dates and Times | ✔ |
| `LOCATION` | Addresses and Locations | ✔ |
| `US_SSN` | Social Security Numbers | ✔ |
| `MEDICAL_LICENSE` | Medical License Numbers | ✔ |
| `US_DRIVER_LICENSE`, `CREDIT_CARD`, `US_BANK_NUMBER`, `IP_ADDRESS`, `URL` | — | ✘ |

Quatre méthodes, dans « Advanced Options »
([…py:720](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L720)) :

| Méthode | Implémentation | Résultat |
|---|---|---|
| `replace` (défaut) | `operators = {}` → passé à `None` → opérateur par défaut de Presidio | `<PERSON>`, `<DATE_TIME>`, … |
| `redact` | `OperatorConfig("redact")` par entité | l'occurrence disparaît, le texte se referme |
| `hash` | `OperatorConfig("hash")` | **SHA-256 non salé** du texte détecté |
| `mask` | `OperatorConfig("mask", {"masking_char": "*", "chars_to_mask": 100, "from_end": False})` | astérisques sur toute l'occurrence |

Sur `hash` : le README parle de « cryptographic hashes for consistent anonymization ».
La cohérence est vraie (le même nom donne toujours le même condensé), mais il n'y a
**ni sel ni clé** : sur un espace de valeurs aussi petit qu'un nom, une date de
naissance ou un numéro de sécurité sociale, le condensé se ré-identifie par force brute
en quelques secondes. À considérer comme un pseudonyme public, pas comme une protection.

## 5. Sorties et table de correspondance

Écriture **à plat** dans le dossier de sortie — la hiérarchie de sous-dossiers de
l'entrée n'est pas reproduite.

| Entrée | Sortie | Remarque |
|---|---|---|
| `x.docx` | `x_anonymized.docx` | document reconstruit, un paragraphe par ligne, sans style |
| `x.txt` | `x_anonymized.txt` | — |
| `x.pdf` | `x_anonymized.pdf` | régénéré par `reportlab`, un unique bloc `Preformatted` |
| `x.csv` | `x_anonymized.csv` | voir ci-dessous |
| `x.xml` | `x_anonymized.xml` | **texte brut sous une extension `.xml`** : plus aucune balise, le commentaire du code l'assume (« XML anonymization is complex ») |
| `x.odt` | `x_anonymized.txt` | changement d'extension |

Le cas CSV est le plus destructeur : le fichier a été lu en aplatissant chaque ligne par
des espaces, puis il est réécrit avec `writer.writerow(line.split())`
([…py:632](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L632)). Toute
cellule contenant un espace est éclatée en plusieurs colonnes, les cellules vides
disparaissent : **l'alignement des colonnes n'est pas préservé**. Un CSV de mesures
ressort inexploitable.

**La table de correspondance**, `file_mappings.csv`, écrite dans le dossier de sortie
([…py:648](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L648)) :

| Colonne | Contenu |
|---|---|
| `Original File Name` | nom du fichier d'origine |
| `Anonymized File Name` | nom produit, ou `ERROR` |
| `UUID` | `uuid.uuid4()` tiré par fichier, ou le message d'exception en cas d'échec |

Ce n'est **pas** une table de ré-identification des personnes : elle ne contient aucune
correspondance entre un nom détecté et son remplacement. Et l'UUID est purement
décoratif — il est généré ([…py:531](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L531))
puis **jamais utilisé** : il n'apparaît ni dans le contenu, ni dans le nom du fichier de
sortie. Il n'existe donc aucun mécanisme de pseudonymisation stable inter-documents.

Enfin, ce fichier est écrit **au milieu des documents anonymisés** : partager le dossier
de sortie revient à partager la liste des noms de fichiers d'origine.

## 6. Ce qui est prédit vs ce qui est calculé

| Bloc | Nature | Où |
|---|---|---|
| Extraction de texte | déterministe, par bibliothèque de format | widget, thread UI |
| Détection `PERSON` / `LOCATION` / `DATE_TIME` | **réseau** : NER spaCy `en_core_web_lg` (CNN + embeddings), via Presidio | widget, CPU |
| Détection des numéros (SSN, téléphone, carte, licence…) | expressions régulières + sommes de contrôle et mots-clés de contexte | idem |
| Remplacement | déterministe (`replace` / `redact` / SHA-256 / masque) | `presidio-anonymizer` |
| Reconstruction du document | déterministe, par format | widget |

Aucun modèle n'est entraîné ni embarqué dans le dépôt ; `en_core_web_lg` est tiré par
`spacy.cli.download` à l'installation.

## 7. Limites : ce qui n'est PAS retiré

Section la plus utile pour décider si un jeu de données peut être partagé.

**Par construction, hors périmètre**

1. **Toutes les images.** DICOM, NIfTI, NRRD, maillages : jamais lus, jamais modifiés.
   Aucun tag d'en-tête n'est nettoyé, aucun visage n'est effacé (§0).
2. **Les noms de fichiers et de dossiers.** `Dupont_Jean_2019.docx` devient
   `Dupont_Jean_2019_anonymized.docx`. Le nom du patient survit intégralement dans le
   nom du fichier, et il est recopié tel quel dans `file_mappings.csv`. La hiérarchie
   d'entrée, souvent nominative elle aussi (`.../Patients/Dupont_Jean/`), est aplatie —
   et si deux sous-dossiers contiennent un fichier de même nom, **le second écrase
   silencieusement le premier**.

**Angles morts de la détection**

3. **Les identifiants hospitaliers.** Aucun reconnaisseur pour un MRN, un numéro de
   dossier, un numéro d'accession, un identifiant d'étude, un numéro de lit. Ils ne
   figurent dans aucune des douze entités proposées, et Presidio n'en a pas par défaut.
4. **Tout ce qui n'est pas américain.** Les entités sélectionnables sont `US_SSN`,
   `US_DRIVER_LICENSE`, `US_BANK_NUMBER` : un NIR français, un NHS number, un numéro de
   passeport ou un ITIN ne sont pas cherchés.
5. **Les identifiants indirects HIPAA** ne sont pas traités : âge supérieur à 89 ans,
   dates rares, professions, appartenance à un petit groupe. Presidio ne fait aucune
   généralisation de dates — `DATE_TIME` est remplacé en bloc ou pas du tout.
6. **La langue.** Analyse figée en anglais (§3) : sur un corpus non anglophone, le
   rappel de `PERSON`/`LOCATION`/`DATE_TIME` s'effondre, sans le moindre avertissement.
7. **Le seuil de 0.5** écarte par défaut toutes les détections moins sûres — typiquement
   les noms rares, les noms non anglo-saxons et les formes abrégées.
8. **Le contenu non extrait** (tableaux DOCX, attributs XML, PDF scannés, en-têtes et
   pieds de page) n'est pas analysé. Il ne fuite pas dans la sortie, mais si le
   destinataire reçoit **aussi** les originaux, l'anonymisation ne l'a pas couvert.

**Défaillance silencieuse — le point le plus grave**

9. `anonymize_text_presidio()` se termine par
   ([…py:748](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L748)) :

   ```python
   except Exception as e:
       logger.error(f"Error in Presidio anonymization: {e}")
       return text  # Return original text if anonymization fails
   ```

   Toute erreur d'analyse (entité non reconnue par la version de Presidio installée,
   modèle spaCy absent, texte trop long) produit **un fichier `_anonymized` contenant le
   texte d'origine intact**, avec un statut « Complete! » dans l'interface et une simple
   ligne rouge dans la console Python. Il n'y a aucune vérification a posteriori, aucun
   compteur d'entités détectées, aucun rapport. Un document non anonymisé est
   indiscernable d'un document propre sans le relire.

**Conclusion pratique.** La sortie de ce module ne suffit pas à déclarer un jeu de
données dé-identifié. Elle constitue une première passe sur du texte libre anglophone,
à relire, et elle doit être complétée par : un renommage des fichiers, un anonymiseur
DICOM dédié pour les images, et un defacing si les volumes couvrent la face.

## 8. Environnement

Tout dans le Python de Slicer, installé par le bouton « Install Dependencies »
([…py:392](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L392)), sans
confirmation ni version épinglée :

```
presidio-analyzer, presidio-anonymizer, pandas, python-docx, pdfplumber,
odfpy, lxml, langdetect, reportlab    puis    spacy.cli.download("en_core_web_lg")
```

Remarques :

- `spacy` n'est pas dans la liste `pip_install` : il est seulement **importé**
  ([…py:409](Medical_Data_Anonymizer_Module/Medical_Data_Anonymizer_Module.py#L409)). Ça
  fonctionne parce que `presidio-analyzer` le tire comme dépendance ; si cet import
  échoue, tout le bloc part dans le `except` et affiche « Error installing dependencies ».
- Un **redémarrage de Slicer** est demandé après installation (boîte de dialogue), ce
  qui est cohérent avec le chargement d'un modèle spaCy.
- `lxml` est installé mais inutilisé (le code utilise `xml.etree.ElementTree`) ;
  `langdetect` est installé et jamais importé.
- `os.environ['PRESIDIO_SUPPRESS_WARNINGS'] = '1'` et `warnings.filterwarnings('ignore')`
  sont posés **au niveau module**, donc dès le chargement de l'extension : ils masquent
  les avertissements de *tout* Slicer, pas seulement ceux de Presidio.
- Aucun GPU, aucun conda, aucun CLI : `AnalyzerEngine()` et le chargement de spaCy
  (quelques secondes) se font dans le thread de l'interface, à chaque lancement.

## 9. Pièges et points fragiles

- **Échec silencieux** renvoyant le texte d'origine (§7.9).
- **Aplatissement du dossier de sortie** : collisions de noms, écrasement sans message.
- **CSV restructuré** par `line.split()`, XML dégradé en texte, ODT renommé en `.txt`.
- **UUID généré mais jamais appliqué** : la « table de correspondance » ne permet aucune
  ré-identification contrôlée.
- **`file.replace(".docx", "_anonymized.docx")`** : `str.replace` remplace toutes les
  occurrences ; un nom contenant deux fois l'extension produit un nom inattendu.
- **Le PDF de sortie n'a pas de pagination** (`Preformatted` unique) : un long document
  peut dépasser le cadre ou lever une exception `reportlab`, auquel cas le fichier est
  compté en `ERROR` mais le traitement continue.
- **Tout est sur le thread UI** : sur un dossier volumineux, Slicer paraît figé.
- **Le README surestime le module** : il parle de conformité HIPAA et de « AI-powered
  text analysis » là où le code est un appel Presidio par défaut sur du texte anglais,
  sans validation.
- Le README pointe `Medical_Data_Anonymizer_Module/Resources/Icons/icon.png` alors que
  le fichier présent s'appelle `Medical_Data_Anonymizer_Module.png`.
- `Medical_Data_Anonymizer_ModuleLogic` / `…Test` sont des coquilles vides : aucun test,
  et rien d'appelable par script.

## 10. Littérature et références

Aucun papier ne porte sur ce module ; il n'y a pas non plus d'évaluation (rappel,
précision) dans le dépôt, sur aucun corpus.

Les briques utilisées sont documentées :

- [Microsoft Presidio](https://microsoft.github.io/presidio/) — le moteur de détection
  et d'anonymisation, avec la liste exacte de ses reconnaisseurs prédéfinis et de ses
  opérateurs (`replace`, `redact`, `hash`, `mask`, `encrypt` — ce dernier, réversible
  avec une clé, n'est pas proposé par le module).
- [spaCy `en_core_web_lg`](https://spacy.io/models/en) — le modèle de NER anglais
  utilisé par défaut.
- [HIPAA Safe Harbor, 45 CFR §164.514(b)(2)](https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html) —
  les 18 catégories d'identifiants à retirer. Utile comme grille de lecture de la §7 :
  les noms de fichiers, les identifiants de dossier médical et les identifiants d'images
  y figurent, et ce module ne les traite pas.

**Bibliographie complète : [SOURCES.md](SOURCES.md)** — recherche faite, résultat
négatif sur le module lui-même. Le dossier contient la seule évaluation publiée de
Presidio sur du texte clinique non structuré, et les liens vers les campagnes
i2b2/n2c2 de dé-identification de texte, qui ne décrivent pas ce code mais en
donnent la grille de lecture.
