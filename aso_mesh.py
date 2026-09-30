#!/usr/bin/env python3
"""Fabrique la scene 3D d'ASO : l'orientation, etape par etape, avec la
matrice que le module a REELLEMENT produite.

    /opt/SlicerProd/Slicer-5.13.0-*/bin/PythonSlicer aso_mesh.py

ENTREE  le crane du scan de test publie (deja maille par amasss_mesh.py),
        et MG_test_Or_transform.tfm, la transformation qu'ASO a ecrite en
        orientant ce meme scan. Donnees publiees, aucun patient.

CE QUI REND LA SCENE JUSTE. La fiche Atlas decrit l'estimation en deux
temps : « a 3-point initialization -- a translation followed by two rotations
around hand-built axes, never a least-squares Procrustes / Kabsch », puis
« a vtkIterativeClosestPointTransform in RigidBody mode ... to refine ».
Le .tfm contient exactement quatre transformations dans cet ordre. On les
donne donc separement au visualiseur, qui les applique l'une apres l'autre :
ce que l'animation montre est la decomposition reelle, pas une illustration.

REPERE, verifie et non suppose. La QForm du NIfTI vaut
    [-1 0 0 84.48 / 0 -1 0 84.48 / 0 0 1 -60.06]
donc le centre du volume tombe sur l'origine physique -- c'est le recentrage
de PRE_ASO_CBCT -- et les rotations du .tfm, qui ont FixedParameters 0 0 0,
tournent bien autour de ce centre. Le volume oriente ne differe que par
z -60.06 -> -60.225, soit la translation 0 0 0.16533 de la transformation 1.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import webmesh
import numpy as np
import vtk

ROOT = os.path.dirname(os.path.abspath(__file__))
MESHES = os.path.expanduser("~/Documents/sadt-atlas-meshes")
ASO = os.path.expanduser("~/Documents/SlicerDownloads/ASO/ASO_CBCT/")
TFM = ASO + "Test_Files/Fully-AutomatedOr/MG_test_Or_transform.tfm"
# LE BON GOLD. Il y en a deux, et « le meme code produit deux orientations
# differentes ». Les reperes qu'ASO a ecrits pour ce scan s'appellent ANS,
# IF, PNS, UL6O -- c'est donc le plan occlusal qui a servi, pas Francfort.
# Comparer a l'autre faisait AUGMENTER l'ecart de 14 a 17 mm.
GOLD = ASO + "Reference/Occlusal and Midsagittal Plane/UP01_Or.mrk.json"
#: Les reperes du patient tels qu'ASO les a ecrits APRES orientation.
ORIENTED = ASO + "Test_Files/Fully-AutomatedOr/MG_test_lm_Or.mrk.json"

PARTS = {"RAW": 40000, "CB": 14000}

#: Libelles des quatre etapes, dans l'ordre du fichier.
STAGE_NAMES = ["recentring", "first hand-built rotation",
               "second hand-built rotation", "ICP refinement"]


def read_stages(path):
    """Les transformations du .tfm, separees, dans l'ordre d'application.

    Le decoupage se fait sur les marqueurs « #Transform N », et non par une
    expression reguliere globale : celle-ci avalait l'en-tete
    CompositeTransform avec les parametres de la translation qui suit, et
    perdait donc le recentrage tout en decalant les noms d'etapes.
    """
    txt = open(path, encoding="utf-8").read()
    out = []
    blocks = re.split(r"#Transform \d+", txt)[1:]
    for blk in blocks:
        km = re.search(r"Transform:\s*(\w+)", blk)
        pm = re.search(r"Parameters:\s*([-\d\.e ]+)", blk)
        if not km or not pm:
            continue          # l'en-tete composite n'a pas de parametres
        kind, par = km.group(1), pm.group(1)
        v = [float(x) for x in par.split()]
        M = np.eye(4)
        if "Composite" in kind:
            continue
        if "Translation" in kind:
            M[:3, 3] = v[:3]
        elif len(v) >= 9:
            M[:3, :3] = np.array(v[:9]).reshape(3, 3)
            if len(v) >= 12:
                M[:3, 3] = v[9:12]
        else:
            continue
        out.append(M)
    return out


def to_lps(poly, qform):
    """Repere du maillage (indice x espacement) -> LPS physique.

    C'est la QForm du NIfTI qui le dit, on ne la devine pas.
    """
    t = vtk.vtkTransform()
    t.SetMatrix([qform[i][j] for i in range(4) for j in range(4)])
    f = vtk.vtkTransformPolyDataFilter()
    f.SetTransform(t)
    f.SetInputData(poly)
    f.Update()
    nr = vtk.vtkPolyDataNormals()
    nr.SetInputConnection(f.GetOutputPort())
    nr.SplittingOff()
    nr.ConsistencyOn()
    nr.Update()
    out = vtk.vtkPolyData()
    out.DeepCopy(nr.GetOutput())
    return out


def main():
    for p in (TFM, GOLD):
        if not os.path.exists(p):
            sys.exit("Fichier ASO introuvable :\n  %s\n"
                     "C'est ce que telecharge le bouton « Test Files » d'ASO." % p)

    # ATTENTION au repere. La QForm du NIfTI est en RAS ; l'appliquer telle
    # quelle inverse x et y par rapport au LPS dans lequel vivent le gold et
    # les sorties d'ALI. Verifie sur Ba : ALI donne [-4.7, 53.2, -0.4], la
    # QForm donnait [+4.7, -53.1, -0.5], et le residu montait a 116 mm.
    # Ce qu'il faut est la seule translation : le centre du volume vers
    # l'origine, ce que fait PRE_ASO_CBCT.
    qform = np.array([[1, 0, 0, -84.48], [0, 1, 0, -84.48],
                      [0, 0, 1, -60.06], [0, 0, 0, 1]], dtype=float)

    meshes = {}
    for code, budget in PARTS.items():
        f = os.path.join(MESHES, "MG_test_scan_%s.vtk" % code)
        if not os.path.exists(f):
            sys.exit("Maillage absent : %s\nLance amasss_mesh.py --vtk %s" % (f, MESHES))
        r = vtk.vtkPolyDataReader()
        r.SetFileName(f)
        r.Update()
        poly = r.GetOutput()
        if poly.GetNumberOfPolys() > budget * 1.08:
            poly = webmesh.smooth_decimate(poly, budget, iterations=6)
        meshes[code] = to_lps(poly, qform)

    # Boite commune, comme webmesh.encode la calculera
    lo = [1e30] * 3
    hi = [-1e30] * 3
    for poly in meshes.values():
        b = poly.GetBounds()
        for k in range(3):
            lo[k] = min(lo[k], b[k * 2])
            hi[k] = max(hi[k], b[k * 2 + 1])
    span = max(hi[k] - lo[k] for k in range(3)) or 1.0
    centre = np.array([(hi[k] + lo[k]) / 2.0 for k in range(3)])

    stages_raw = read_stages(TFM)

    def to_scene_matrix(M):
        """Une transformation LPS -> la meme, dans le repere normalise.

        p_scene = (v - centre) / span, donc v = p*span + centre et
        T(v) = R·v + t devient  R·p + (R·centre + t - centre)/span.
        La rotation ne change pas ; seule la translation se reexprime.
        """
        R, t = M[:3, :3], M[:3, 3]
        tt = (R @ centre + t - centre) / span
        out = np.eye(4)
        out[:3, :3] = R
        out[:3, 3] = tt
        return [round(float(x), 7) for x in out.T.reshape(16)]   # colonnes, pour WebGL

    stages = []
    for i, M in enumerate(stages_raw):
        ang = np.degrees(np.arccos(max(-1, min(1, (np.trace(M[:3, :3]) - 1) / 2))))
        stages.append({
            "name": STAGE_NAMES[i] if i < len(STAGE_NAMES) else "stage %d" % (i + 1),
            "m": to_scene_matrix(M),
            "deg": round(float(ang), 2),
            "mm": round(float(np.linalg.norm(M[:3, 3])), 3),
        })
        print("  etape %d : %-30s %5.2f deg, %5.2f mm"
              % (i + 1, stages[-1]["name"], ang, np.linalg.norm(M[:3, 3])))

    total = np.eye(4)
    for M in stages_raw:
        total = M @ total
    tot_ang = np.degrees(np.arccos(max(-1, min(1, (np.trace(total[:3, :3]) - 1) / 2))))
    print("  ---- total : %.2f deg" % tot_ang)

    # Les reperes du patient, tels qu'ASO les a ecrits APRES orientation.
    # On remonte a leur position de DEPART par la transformation inverse :
    # ils sont alors exacts aux deux bouts, et l'animation les emmene de
    # l'un a l'autre sans rien approximer.
    total = np.eye(4)
    for M in stages_raw:
        total = M @ total
    inv = np.linalg.inv(total)
    mine = {}
    if os.path.exists(ORIENTED):
        od = json.load(open(ORIENTED, encoding="utf-8"))["markups"][0]
        for cp in od["controlPoints"]:
            q = inv @ np.append(np.array(cp["position"], dtype=float), 1.0)
            mine[cp["label"]] = [round(float((q[k] - centre[k]) / span), 5) for k in range(3)]
        print("  patient : %d reperes d'ASO, ramenes au depart" % len(mine))

    gold = json.load(open(GOLD, encoding="utf-8"))["markups"][0]
    golds = [{"label": p["label"],
              "p": [round(float((p["position"][k] - centre[k]) / span), 5) for k in range(3)]}
             for p in gold["controlPoints"]]
    print("  gold : %d reperes (%s)" % (len(golds), gold.get("coordinateSystem")))

    payload = webmesh.encode(meshes, focus_on=["CB"], extra={
        "stages": stages,
        "totalDeg": round(float(tot_ang), 2),
        "gold": golds,
        "patient": mine,
        # Les noms presents des deux cotes : ce sont eux qui doivent se
        # rejoindre, et c'est la seule mesure honnete du resultat.
        "shared": sorted(set(mine) & {g["label"] for g in golds}),
    })
    webmesh.write(os.path.join(ROOT, "assets", "aso-mesh.js"), "ASO_SCENE", payload,
                  "Genere par aso_mesh.py. Crane du scan de test publie, et la "
                  "transformation qu'ASO a reellement ecrite en l'orientant. "
                  "Aucune donnee patient.")


if __name__ == "__main__":
    main()
