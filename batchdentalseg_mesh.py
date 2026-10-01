#!/usr/bin/env python3
"""Fabrique la geometrie 3D de la scene BatchDentalSeg.

    /opt/SlicerProd/Slicer-5.13.0-*/bin/PythonSlicer batchdentalseg_mesh.py

Demande le Python de Slicer : VTK et SimpleITK ne sont pas dans le Python
systeme. Ce script ne tourne qu'a la main, quand la sortie source change, et
non a chaque `build.py`.

ENTREE   la sortie d'une execution REELLE de BatchDentalSeg. Rien n'est
         relance ici : on lit un label map, on n'infere pas.

         Par defaut : une passe `UniversalLabDentalsegmentator` sur
         `PreDentalSurgery.gipl.gz`, l'echantillon `CBCTDentalSurgery` publie
         par Slicer lui-meme -- celui que le bouton « Test Files » du module
         telecharge (`TEST_FILES_SAMPLE_NAME`). Le script REFUSE d'ecrire si
         le scan d'entree ne correspond pas par md5 a l'echantillon publie :
         la geometrie part dans un depot distant, et aucune donnee patient
         n'y a sa place.

         Il existe sur cette machine des surfaces par dent issues du meme
         modele (`~/Desktop/NEW_CLASS/VTKs/BM_Tufts_*`), mais c'est une
         sortie de cohorte clinique : le design system l'interdit comme
         source du site, et elle n'est pas utilisee ici.

SORTIE   assets/batchdentalseg-mesh.js -- charge par <script> et non par
         fetch(), parce que fetch() est bloque en file:// et que le site doit
         s'ouvrir sans serveur. Meme parti pris que search-index-*.js.

CE QUE LA PASSE A PRODUIT, et qui ne se devine pas : 32 etiquettes sur les 55
de la table. 29 dents numerotees, plus mandibule (53), maxillaire (54) et
canal mandibulaire (55). Les 23 absentes le sont de la BOUCHE -- trois dents
de sagesse et toute la denture temporaire. Le script part donc des valeurs
REELLEMENT presentes dans le volume et non de la table : dessiner une dent
que le reseau n'a pas produite serait inventer de l'anatomie.

REPERE, verifie et non suppose. Les coordonnees brutes de
`vtkNIFTIImageReader` (origine 0, indice x espacement) sont du LPS translate :
+x vers la GAUCHE du patient, +y vers l'ARRIERE, +z vers le HAUT. Deux
lectures independantes concordent (QForm du NIfTI, et direction/origine de
SimpleITK). Le controle anatomique le confirme A CHAQUE PASSE, et sur des
ENSEMBLES de pieces pour tenir avec les deux familles d'etiquettes : le
barycentre des structures hautes est au-dessus de celui des basses (+25 mm
en z), et les incisives centrales sont en avant des molaires et des maxillaires
(+47 mm en y). Si un signe s'inverse, le script s'arrete : mieux vaut le
savoir avant de publier qu'apres.

Le scan d'entree est un `.gipl.gz`, que `vtkNIFTIImageReader` refuse ; il est
donc lu par SimpleITK et remis dans la meme grille (voir `read_volume`). Le
module ecrit son label map sur la geometrie du volume d'origine, donc les deux
se superposent sans translation -- et le script l'assertit au lieu d'y croire.
"""
import base64, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import webmesh

try:
    import vtk
    import SimpleITK as sitk
except ImportError:
    sys.exit("VTK / SimpleITK introuvables — lance ce script avec "
             "PythonSlicer, pas python3.")

ROOT = os.path.dirname(os.path.abspath(__file__))

#: La passe deja faite. Le widget Slicer, contrairement au portage empaquete
#: du serveur d'inference, n'ecrit PAS de `BatchDentalSeg_report.json` : le
#: modele est donc nomme ici, et verifie contre les etiquettes reellement
#: presentes dans le label map (une passe UniversalLab ne peut pas produire
#: une valeur absente de sa table).
RUN = os.path.expanduser("~/Documents/BatchSegUniversal/out")
REPORT = os.path.join(RUN, "BatchDentalSeg_report.json")   # s'il existe
MODEL_RUN = "UniversalLabDentalsegmentator"

#: Le scan d'entree, pour l'etape « avant ». Il doit etre le scan PUBLIE :
#: la geometrie part dans un depot distant.
SCAN_DIR = os.path.expanduser("~/Documents/BatchSegUniversal/in")
#: `CBCTDentalSurgery`, l'echantillon publie par Slicer lui-meme -- celui que
#: le bouton « Test Files » du module telecharge (TEST_FILES_SAMPLE_NAME).
PUBLISHED = os.path.expanduser("~/Documents/Slicer-tmpDownloads/BATCHDENTALSEG/Scans")

#: Le cas retenu pour la scene. Un seul : montrer un deuxieme cas voudrait
#: dire montrer une deuxieme anatomie.
CASE = "PreDentalSurgery"

#: Seuil osseux du « avant ». Ce CBCT n'est pas calibre en HU (valeurs 0 a
#: 3 874, mediane 0) : reprendre le 500 d'areg_mesh.py n'aurait aucun sens
#: ici. 605 est le seuil d'Otsu calcule pour CETTE page sur les voxels deja
#: au-dessus de l'Otsu global (242, qui separe l'air du tissu) -- donc la
#: separation tissu / os du scan lui-meme, pas un chiffre choisi a l'oeil.
RAW_THRESHOLD = 605.0
RAW_SIGMA = 1.5         # voxels ; debruite AVANT le marching cubes
RAW_TARGET = 30000

#: Les faits de la passe, releves dans son journal. Le widget Slicer n'ecrit
#: pas de rapport ; ces valeurs sont donc recopiees a la main depuis la sortie
#: du pilote, et c'est pour ca qu'elles sont ici et pas devinees ailleurs.
#: Elles ne changent RIEN a la geometrie : elles n'habillent que la ligne de
#: statut de la scene.
RUN_FACTS = {"device": "cuda", "scans": 1, "ok": 1, "seconds": 238.7,
             "step": 0.5}

#: Nom d'etiquette du module -> code court de la scene. Les codes sont
#: stables : le JS et le HTML s'y accrochent.
CODES = {
    "Upper Skull": "SKULL",
    "Mandible": "MAND",
    "Maxilla": "MAXI",
    "Upper Teeth": "UPT",
    "Lower Teeth": "LOT",
    "Mandibular canal": "CANAL",
}

#: Budget de triangles par code. Les dents d'une passe UniversalLab tombent
#: dans TOOTH_TARGET : avec jusqu'a 52 dents il faut un petit budget chacune,
#: sinon le fichier double. Une dent decimee a 1 200 triangles fait environ
#: 600 sommets, tres loin des 65 535 ou webmesh s'arrete.
TARGETS = {
    "SKULL": 22000,
    "MAND": 16000,
    "MAXI": 14000,
    "UPT": 12000,
    "LOT": 12000,
    "CANAL": 5000,
}
TOOTH_TARGET = 1200

#: UNIVERSAL_COLORS (SegmentationWidget.py:2348) : la couleur que le modele
#: par dent donne a CHACUNE de ses 55 etiquettes -- dents, mais aussi
#: mandibule (53), maxillaire (54) et canal (55), qui n'ont PAS les memes
#: teintes que dans les modeles a cinq etiquettes. Indice = valeur - 1. Ce
#: sont les couleurs du code, pas des couleurs decoratives -- et #008080 y
#: sert deux fois (etiquettes 12 et 49), ce que la page dit plutot que de le
#: corriger.
UNIVERSAL_COLORS = [
    "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
    "#800000", "#008000", "#000080", "#808000", "#800080", "#008080",
    "#C0C0C0", "#808080", "#FFA500", "#F0E68C", "#B22222", "#8FBC8F",
    "#483D8B", "#2F4F4F", "#00CED1", "#9400D3", "#FF1493", "#7FFF00",
    "#1E90FF", "#FF4500", "#DA70D6", "#EEE8AA", "#98FB98", "#AFEEEE",
    "#DB7093", "#FFE4E1", "#FFDAB9", "#CD5C5C", "#F08080", "#E9967A",
    "#FA8072", "#FF7F50", "#FF6347", "#00FA9A", "#00FF7F", "#4682B4",
    "#87CEEB", "#6A5ACD", "#7B68EE", "#4169E1", "#6495ED", "#B0C4DE",
    "#008080", "#ADFF2F", "#FF69B4", "#CD853F",
    "#D2691E", "#B8860B", "#A0522D",          # 53 mandibule, 54 maxillaire, 55 canal
]

#: UNIVERSAL_OPACITIES, meme endroit : 1,0 pour les dents, 0,45 pour les trois
#: structures osseuses -- bien plus transparent que le 0,65 des modeles a cinq
#: etiquettes, et c'est ce qui laisse voir les dents dans l'os.
UNIVERSAL_OPACITY = {53: 0.45, 54: 0.45, 55: 0.45}

#: Numerotation FDI en regard de la valeur d'etiquette, pour les 32
#: permanentes puis les 20 temporaires. La correspondance a ete verifiee dent
#: par dent : les valeurs 1-32 SONT la numerotation universelle et 33-52 ses
#: lettres A-T, donc le FDI d'une etiquette est fixe et se calcule.
FDI = ([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
        38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48]
       + [55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
          75, 74, 73, 72, 71, 81, 82, 83, 84, 85])

#: `_get_active_label_map()` (SegmentationWidget.py:1945) fait foi pour les
#: valeurs ecrites dans le NIfTI. Transcrit ici pour que le script sache lire
#: n'importe laquelle des quatre passes, pas seulement celle du disque.
PERMANENT = [
    "Upper-right third molar", "Upper-right second molar",
    "Upper-right first molar", "Upper-right second premolar",
    "Upper-right first premolar", "Upper-right canine",
    "Upper-right lateral incisor", "Upper-right central incisor",
    "Upper-left central incisor", "Upper-left lateral incisor",
    "Upper-left canine", "Upper-left first premolar",
    "Upper-left second premolar", "Upper-left first molar",
    "Upper-left second molar", "Upper-left third molar",
    "Lower-left third molar", "Lower-left second molar",
    "Lower-left first molar", "Lower-left second premolar",
    "Lower-left first premolar", "Lower-left canine",
    "Lower-left lateral incisor", "Lower-left central incisor",
    "Lower-right central incisor", "Lower-right lateral incisor",
    "Lower-right canine", "Lower-right first premolar",
    "Lower-right second premolar", "Lower-right first molar",
    "Lower-right second molar", "Lower-right third molar",
]
PRIMARY = [
    "Upper-right second molar (baby)", "Upper-right first molar (baby)",
    "Upper-right canine (baby)", "Upper-right lateral incisor (baby)",
    "Upper-right central incisor (baby)", "Upper-left central incisor (baby)",
    "Upper-left lateral incisor (baby)", "Upper-left canine (baby)",
    "Upper-left first molar (baby)", "Upper-left second molar (baby)",
    "Lower-left second molar (baby)", "Lower-left first molar (baby)",
    "Lower-left canine (baby)", "Lower-left lateral incisor (baby)",
    "Lower-left central incisor (baby)", "Lower-right central incisor (baby)",
    "Lower-right lateral incisor (baby)", "Lower-right canine (baby)",
    "Lower-right first molar (baby)", "Lower-right second molar (baby)",
]
UNIVERSAL_MAP = {}
for _i, _n in enumerate(PERMANENT + PRIMARY):
    UNIVERSAL_MAP[_n] = _i + 1
UNIVERSAL_MAP.update({"Mandible": 53, "Maxilla": 54, "Mandibular canal": 55})

MODEL_LABELS = {
    "DentalSegmentator": {"Upper Skull": 1, "Mandible": 2, "Upper Teeth": 3,
                          "Lower Teeth": 4, "Mandibular canal": 5},
    "PediatricDentalsegmentator": {"Upper Skull": 1, "Mandible": 2,
                                   "Upper Teeth": 3, "Lower Teeth": 4,
                                   "Mandibular canal": 5},
    "NasoMaxillaDentSeg": {"Upper Skull": 1, "Mandible": 2, "Maxilla": 3,
                           "Upper Teeth": 4, "Lower Teeth": 5,
                           "Mandibular canal": 6},
    "UniversalLabDentalsegmentator": UNIVERSAL_MAP,
}

#: Les couleurs du module, pas des couleurs decoratives : c'est l'interet de
#: les montrer. SegmentationWidget.py:2499 pour les cinq etiquettes,
#: :2483 pour NasoMaxilla (le vert du maxillaire detache).
GROUP_COLORS = {
    "Upper Skull": "#E3DD90", "Mandible": "#D4A1E6", "Upper Teeth": "#DC9565",
    "Lower Teeth": "#EBDFB4", "Mandibular canal": "#D8654F",
    "Maxilla": "#6AC4A4",
}
#: Opacites 3D que le module applique reellement (meme endroit) : l'os du
#: crane et la mandibule a 0,65, les dents et le canal a 1,0.
GROUP_OPACITY = {
    "Upper Skull": 0.65, "Mandible": 0.65, "Maxilla": 0.65,
    "Upper Teeth": 1.0, "Lower Teeth": 1.0, "Mandibular canal": 1.0,
}


def read_volume(path):
    """Un volume en vtkImageData, dans le repere BRUT du lecteur NIfTI.

    L'echantillon publie est un `.gipl.gz`, que `vtkNIFTIImageReader` refuse
    (« Bad NIfTI header »). On passe donc par SimpleITK, qui le lit, et on
    reconstruit une grille a origine (0,0,0) et espacement du fichier --
    exactement ce que `vtkNIFTIImageReader` donne pour le label map. Les deux
    volumes partagent grille et espacement, donc en coordonnees brutes ils se
    superposent sans aucune translation ; le script le verifie plus bas.
    """
    if path.endswith((".nii", ".nii.gz")):
        r = vtk.vtkNIFTIImageReader()
        r.SetFileName(path)
        r.Update()
        out = vtk.vtkImageData()
        out.DeepCopy(r.GetOutput())
        return out

    import numpy as np
    from vtk.util import numpy_support
    im = sitk.ReadImage(path)
    a = np.ascontiguousarray(sitk.GetArrayFromImage(im))    # (z, y, x)
    out = vtk.vtkImageData()
    out.SetDimensions(*im.GetSize())                        # (x, y, z)
    out.SetSpacing(*im.GetSpacing())
    out.SetOrigin(0.0, 0.0, 0.0)
    arr = numpy_support.numpy_to_vtk(a.reshape(-1), deep=True)
    arr.SetName("scalars")
    out.GetPointData().SetScalars(arr)
    return out


def universal_color(value):
    """Couleur du modele par dent, par valeur d'etiquette."""
    if 1 <= value <= len(UNIVERSAL_COLORS):
        return UNIVERSAL_COLORS[value - 1]
    return "#b9b3a8"


def code_for(name, value):
    """Code court d'une etiquette. Les dents deviennent T01..T52 : leur
    numero EST leur valeur d'etiquette, et c'est aussi leur numero dans la
    numerotation universelle (verifie label par label, cf. la fiche)."""
    if name in CODES:
        return CODES[name]
    return "T%02d" % value


def extract(reader, value, target):
    """Marching cubes discret sur une etiquette -> nettoyage -> budget."""
    mc = vtk.vtkDiscreteMarchingCubes()
    mc.SetInputConnection(reader.GetOutputPort())
    mc.SetValue(0, value)
    mc.Update()
    raw = vtk.vtkPolyData()
    raw.DeepCopy(mc.GetOutput())
    if raw.GetNumberOfPolys() == 0:
        return None, 0, 0
    # On garde toutes les composantes au-dessus d'un seuil RELATIF, jamais
    # « la plus grosse » : « Upper Teeth » est une arcade de pieces qui ne se
    # touchent pas toutes, et le canal mandibulaire est bilateral.
    kept, dropped = webmesh.clean(raw, 0.02)
    poly = webmesh.smooth_decimate(kept, target, iterations=24)
    return poly, raw.GetNumberOfPolys(), dropped


def find_one(folder, patterns):
    """Le premier fichier du dossier qui colle a l'un des motifs."""
    import glob
    for pat in patterns:
        hits = sorted(glob.glob(os.path.join(folder, pat)))
        if hits:
            return hits[0]
    return None


def main():
    report = {}
    if os.path.exists(REPORT):
        report = json.load(open(REPORT, encoding="utf-8"))
    model = report.get("model") or MODEL_RUN
    table = MODEL_LABELS.get(model)
    if not table:
        sys.exit("Modele inconnu : %s" % model)

    # Le widget nomme sa sortie `<stem>_Segmentation.nii.gz` ; le portage du
    # serveur d'inference nommait `<stem>_Seg.nii.gz`. On accepte les deux
    # plutot que de supposer laquelle des deux passes on lit.
    seg = find_one(RUN, ["%s_Segmentation.nii.gz" % CASE,
                         "%s_Seg.nii.gz" % CASE,
                         "%s_*.nii.gz" % CASE])
    if not seg:
        sys.exit("Label map introuvable dans :\n  %s\n"
                 "Ce script ne lance rien : il lui faut une sortie "
                 "BatchDentalSeg deja ecrite sur le disque." % RUN)

    # Le scan d'entree doit etre le scan PUBLIE : la geometrie part dans un
    # depot distant, et une sortie de cohorte clinique n'y a pas sa place.
    scan = find_one(SCAN_DIR, ["%s.gipl.gz" % CASE, "%s.nii.gz" % CASE])
    pub = find_one(PUBLISHED, ["%s.gipl.gz" % CASE, "%s.nii.gz" % CASE])
    if scan and pub:
        import hashlib
        h = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
        if h(scan) != h(pub):
            sys.exit("Le scan d'entree de la passe n'est PAS l'echantillon "
                     "publie. Refus.\n  %s\n  %s" % (scan, pub))
        print("entree identique a l'echantillon publie par Slicer "
              "(CBCTDentalSurgery, md5) — publiable")
    elif not pub:
        print("ATTENTION : echantillon publie introuvable, provenance non "
              "verifiee")

    print("\n— passe lue —")
    print("  modele   %s" % model)
    print("  cas      %s" % CASE)
    print("  label map %s" % os.path.basename(seg))

    reader = vtk.vtkNIFTIImageReader()
    reader.SetFileName(seg)
    reader.Update()
    seg_geom = (reader.GetOutput().GetDimensions(),
                reader.GetOutput().GetSpacing())

    # Mesures reelles sur le label map : le nombre de voxels par etiquette et
    # son volume. Ce sont des mesures, pas des ordres de grandeur.
    im = sitk.ReadImage(seg)
    arr = sitk.GetArrayViewFromImage(im)
    sp = im.GetSpacing()
    vox_mm3 = sp[0] * sp[1] * sp[2]

    # Ce que la passe a REELLEMENT produit. On part des valeurs presentes
    # dans le volume, pas de la table : une dent absente de la bouche du
    # patient -- ou que le reseau n'a pas trouvee -- n'a pas d'etiquette, et
    # la page ne doit surtout pas en dessiner une.
    import numpy as np
    present = {int(v): int(n) for v, n in zip(*np.unique(arr, return_counts=True))
               if v != 0}
    by_value = {v: k for k, v in table.items()}
    unknown = sorted(v for v in present if v not in by_value)
    if unknown:
        sys.exit("Le label map porte les valeurs %s, absentes de la table de "
                 "%s : ce n'est pas la passe annoncee." % (unknown, model))
    per_tooth = len(table) > 10
    print("  %d etiquette(s) presente(s) sur %d dans la table%s"
          % (len(present), len(table),
             " (modele par dent)" if per_tooth else ""))

    print("\n— surfaces —")
    meshes, info = {}, {}
    for value in sorted(present):
        name = by_value[value]
        code = code_for(name, value)
        target = TARGETS.get(code, TOOTH_TARGET)
        poly, raw, dropped = extract(reader, value, target)
        if poly is None:
            print("  %-6s etiquette %-2d sans surface — ignoree" % (code, value))
            continue
        nvox = present[value]
        meshes[code] = poly
        entry = {
            "name": name, "label": value,
            # Un modele par dent a SA palette et SES opacites, y compris pour
            # la mandibule et le maxillaire : les peindre avec celles d'un
            # modele a cinq etiquettes ferait mentir la legende.
            "color": (universal_color(value) if per_tooth
                      else GROUP_COLORS.get(name, "#b9b3a8")),
            "opacity": (UNIVERSAL_OPACITY.get(value, 1.0) if per_tooth
                        else GROUP_OPACITY.get(name, 1.0)),
            "voxels": nvox, "mm3": round(nvox * vox_mm3, 1),
        }
        if code.startswith("T") and value <= len(FDI):
            entry["fdi"] = FDI[value - 1]
        info[code] = entry
        print("  %-6s etiquette %-2d  %8d triangles bruts -> %6d  "
              "(%d eclats ecartes, %8.0f mm3)"
              % (code, value, raw, poly.GetNumberOfPolys(), dropped,
                 entry["mm3"]))

    # Les etiquettes de la table que la passe n'a PAS produites. C'est une
    # information, pas un trou : sur cette bouche-la, ces dents n'y sont pas.
    absent = sorted(v for v in table.values() if v not in present)
    if absent:
        print("\n  %d etiquette(s) de la table absente(s) de ce scan : %s"
              % (len(absent), ", ".join(str(v) for v in absent)))

    if not meshes:
        sys.exit("Aucune etiquette extraite.")

    anatomy = list(meshes.keys())      # avant d'ajouter le scan d'entree

    # Le « avant ». Un simple seuil osseux, ce que n'importe qui obtient sans
    # reseau : un bloc unique et anonyme. Tout l'interet de la comparaison
    # est la — le reseau ne fait pas apparaitre de la matiere, il la NOMME.
    if scan and os.path.exists(scan):
        img = read_volume(scan)
        got = (img.GetDimensions(), tuple(round(v, 6) for v in img.GetSpacing()))
        want = (seg_geom[0], tuple(round(v, 6) for v in seg_geom[1]))
        if got != want:
            sys.exit("Le scan d'entree et le label map n'ont pas la meme "
                     "grille : il faudrait recaler, et ce script ne le fait "
                     "pas.\n  %r\n  %r" % (want, got))
        print("  grille du scan identique a celle du label map : "
              "%r @ %r — aucune translation" % (got[0], got[1]))
        rr = vtk.vtkTrivialProducer()
        rr.SetOutput(img)
        iso = webmesh.iso_surface(rr, RAW_THRESHOLD, RAW_SIGMA)
        kept, dropped = webmesh.clean(iso, 0.01)
        meshes["RAW"] = webmesh.smooth_decimate(kept, RAW_TARGET, iterations=18)
        print("  %-6s seuil %-5.0f %8d triangles bruts -> %6d  "
              "(%d eclats ecartes)"
              % ("RAW", RAW_THRESHOLD, iso.GetNumberOfPolys(),
                 meshes["RAW"].GetNumberOfPolys(), dropped))
    else:
        print("  scan d'entree absent : l'etape « avant » sera inactive")

    # --- controle de repere, a chaque passe ---------------------------------
    # Les coordonnees brutes du lecteur sont du LPS translate : +x gauche,
    # +y arriere, +z haut. On le VERIFIE sur l'anatomie au lieu de le croire.
    print("\n— controle de repere (coordonnees brutes du lecteur) —")
    cz, cy = {}, {}
    for code in anatomy:
        b = meshes[code].GetBounds()
        cy[code] = (b[2] + b[3]) / 2.0
        cz[code] = (b[4] + b[5]) / 2.0
        if "--check" in sys.argv:
            print("  %-6s y=%7.1f  z=%7.1f" % (code, cy[code], cz[code]))
    # Le controle doit tenir pour les DEUX familles d'etiquettes : un scan
    # par dent n'a pas de code SKULL. On compare donc des ensembles.
    #   haut = crane / maxillaire / dents des arcades superieures
    #   bas  = mandibule / dents des arcades inferieures
    # Valeurs 1-16 et 33-42 = arcade superieure, 17-32 et 43-52 = inferieure
    # (numerotation universelle, verifiee dent par dent).
    def upper(code):
        if code in ("SKULL", "MAXI", "UPT"):
            return True
        if code.startswith("T"):
            v = int(code[1:])
            return v <= 16 or 33 <= v <= 42
        return False

    def lower(code):
        if code in ("MAND", "LOT", "CANAL"):
            return True
        if code.startswith("T"):
            v = int(code[1:])
            return 17 <= v <= 32 or v >= 43
        return False

    def mean(f, key):
        vals = [key[c] for c in anatomy if f(c)]
        return sum(vals) / len(vals) if vals else None

    zu, zl = mean(upper, cz), mean(lower, cz)
    if zu is not None and zl is not None:
        print("  haut - bas : %+.1f mm en z (doit etre POSITIF si +z = haut) "
              "[%d pieces en haut, %d en bas]"
              % (zu - zl, len([c for c in anatomy if upper(c)]),
                 len([c for c in anatomy if lower(c)])))
        if zu - zl <= 0:
            sys.exit("Axe vertical inverse : la scene serait a l'envers.")

    # Anteroposterieur : les incisives centrales (8, 9, 24, 25) sont ce qu'il
    # y a de plus en avant. Sur une passe a 5 etiquettes on retombe sur les
    # arcades contre le crane.
    front = [c for c in anatomy if c in ("T08", "T09", "T24", "T25")]
    back = [c for c in anatomy
            if c in ("MAND", "MAXI", "SKULL")
            or (c.startswith("T") and int(c[1:]) in (1, 16, 17, 32))]
    if not front:
        front = [c for c in anatomy if c in ("UPT", "LOT")]
        back = [c for c in anatomy if c in ("SKULL", "MAND")]
    if front and back:
        fy = sum(cy[c] for c in front) / len(front)
        by = sum(cy[c] for c in back) / len(back)
        print("  arriere - avant : %+.1f mm en y "
              "(doit etre POSITIF si +y = arriere) [%s vs %s]"
              % (by - fy, ",".join(front), ",".join(back)))
        if by - fy <= 0:
            sys.exit("Axe anteroposterieur inverse : le cadrage serait faux.")

    print("\n— encodage —")
    scans = report.get("scans") or []
    run = {
        "device": report.get("device") or RUN_FACTS.get("device"),
        "scans": len(scans) or RUN_FACTS.get("scans"),
        "ok": (len([s for s in scans if s.get("status") == "ok"])
               or RUN_FACTS.get("ok")),
        "seconds": report.get("duration_seconds") or RUN_FACTS.get("seconds"),
        "step": report.get("tile_step_size") or RUN_FACTS.get("step"),
        "teeth": len([c for c in anatomy if c.startswith("T")]),
        "labels": len(present),
        "absent": absent,
    }
    payload = webmesh.encode(meshes, focus_on=anatomy, extra={
        "model": model,
        "anatomy": anatomy,
        "case": CASE,
        "parts_info": info,
        "run": run,
        # La table complete des quatre modeles part dans le payload : la scene
        # dit ce que CHAQUE modele produirait, et se tait sur ce dont elle n'a
        # pas la geometrie. Les valeurs viennent de _get_active_label_map.
        "models": {k: v for k, v in MODEL_LABELS.items()},
    })

    out = os.path.join(ROOT, "assets", "batchdentalseg-mesh.js")
    webmesh.write(out, "BATCHDENTALSEG_MESH", payload,
                  "Genere par batchdentalseg_mesh.py — ne pas editer a la "
                  "main.\n   Source : une passe BatchDentalSeg (%s), lue "
                  "dans\n   %s, sur %s — l'echantillon CBCTDentalSurgery "
                  "publie par Slicer,\n   celui que le bouton « Test Files » "
                  "du module telecharge. Aucune donnee\n   patient. %d "
                  "etiquette(s) produites, dont %d dents.\n   Charge par "
                  "<script> et non par fetch() : le site doit s'ouvrir en "
                  "file://."
                  % (model, RUN, CASE, len(present), run["teeth"]))


if __name__ == "__main__":
    main()
