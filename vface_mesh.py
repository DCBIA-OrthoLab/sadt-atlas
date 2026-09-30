#!/usr/bin/env python3
"""Fabrique la scene 3D de VFACE : le miroir, et l'asymetrie selon la region.

    /opt/SlicerProd/Slicer-5.13.0-*/bin/PythonSlicer vface_mesh.py

ENTREE  le jeu de test PUBLIE d'AREG_CBCT (release lucanchling/Areg_CBCT) : le
        T1 deja oriente et ses trois masques AMASSS, tous sur la MEME grille ;
        et la vraie matrice miroir de VFACE. Aucune donnee clinique.

CE QUE LA SCENE DOIT FAIRE COMPRENDRE. La matrice miroir de VFACE est
`diag(-1, 1, 1)` centree a l'origine : une reflexion pure par rapport au plan
x = 0 -- le plan du MONDE, pas celui du patient. Tout ce que VFACE empile en
amont (reechantillonnage, reperes d'ALI, orientation SEMI_ASO sur le
maxillaire puis sur la base du crane, segmentation AMASSS) ne sert qu'a amener
le plan sagittal median du patient sur x = 0. Si l'orientation derape, le
miroir derape avec elle.

MAIS le miroir n'est pas lu tel quel. `review_steps.py` liste trois recalages
-- `registration_cb`, `registration_max`, `registration_mand` -- et c'est la
que se trouve le fond du sujet : L'ASYMETRIE QU'ON MESURE DEPEND DE LA
STRUCTURE SUR LAQUELLE ON SE SUPERPOSE. Recaler le miroir sur la base du crane
donne l'asymetrie totale de la face ; le recaler sur le maxillaire rend le
maxillaire symetrique par construction et ce qu'il reste se lit sur la
mandibule. Trois recalages, trois cartes, un seul crane.

CE QUI EST A MOI ET CE QUI EST A VFACE. La matrice miroir et le decoupage en
trois regions sont ceux de VFACE. Les trois recalages sont refaits ici par ICP
rigide sur la surface de chaque region, parce que la passe elastix d'AREG ne
tourne pas dans cette page ; les residus mesures sont imprimes et la legende le
dit.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base64
import webmesh
import numpy as np
import SimpleITK as sitk
import vtk

ROOT = os.path.dirname(os.path.abspath(__file__))
B = os.path.expanduser("~/Documents/SlicerDownloads/AREG/AREG_CBCT/Test_Files/"
                       "Oriented-Automated/")
T1 = B + "T1Or/C_0001_T1_Or.nii.gz"
MASKS = {
    "CB":   ("T1Or/C_0001_T1_Or_seg_CBMASK.nii.gz",   "Cranial base"),
    "MAX":  ("T1Or/C_0001_T1_Or_seg_MAXMASK.nii.gz",  "Maxilla"),
    "MAND": ("T1Or/C_0001_T1_Or_seg_MANDMASK.nii.gz", "Mandible"),
}
ORDER = ["CB", "MAX", "MAND"]        # l'ordre de review_steps.ORDER
#: Ce que ALI_CBCT a reellement ecrit pour ce scan, deja dans le repere du T1
#: oriente. Six points sur les sept du set « base du crane » : `N` manque,
#: l'agent ne l'a pas trouve, et on ne l'invente pas.
LANDMARKS = "T1Or/C_0001_T1_lm_Or.mrk.json"
#: Les deux listes de VFACE_utils/createlistprocess.py, verbatim (l.288 et 369).
SET_MAX = "ANS IF PNS UL6O UR1O UR6O".split()
SET_CB = "Ba LPo N RPo S LOr ROr".split()
MIRROR_TFM = os.path.expanduser("~/Documents/SlicerDownloads/Mirror_matrix/Mirror/"
                                "Matrix_mirror.tfm")
BONE, SIGMA, SKULL_TRIS = 500.0, 1.5, 34000
MASK_TRIS = 9000
CLIP_MM = 8.0      # au-dela la couleur sature : on lit la carte, pas les extremes


def read_mirror(path):
    txt = open(path, encoding="utf-8").read()
    v = [float(x) for x in re.search(r"Parameters:\s*([-\d\.e ]+)", txt).group(1).split()]
    M = np.eye(4)
    M[:3, :3] = np.array(v[:9]).reshape(3, 3)
    if len(v) >= 12:
        M[:3, 3] = v[9:12]
    return M


def normals(port_or_data):
    nr = vtk.vtkPolyDataNormals()
    if hasattr(port_or_data, "GetOutputPort"):
        nr.SetInputConnection(port_or_data.GetOutputPort())
    else:
        nr.SetInputData(port_or_data)
    nr.SplittingOff()
    nr.ConsistencyOn()
    nr.Update()
    out = vtk.vtkPolyData()
    out.DeepCopy(nr.GetOutput())
    return out


def surface(path, level, sigma, tris, origin):
    r = vtk.vtkNIFTIImageReader()
    r.SetFileName(path)
    r.Update()
    iso = webmesh.iso_surface(r, level, sigma)
    clean, _ = webmesh.clean(iso, 0.02)
    poly = webmesh.smooth_decimate(clean, tris, iterations=16)
    t = vtk.vtkTransform()
    t.Translate(origin[0], origin[1], origin[2])
    f = vtk.vtkTransformPolyDataFilter()
    f.SetTransform(t)
    f.SetInputData(poly)
    f.Update()
    return normals(f)


def plane_at_x0(bounds, pad=1.06):
    """Un quad dans le plan x = 0, aux dimensions du crane.

    Ce n'est pas une donnee mesuree mais une definition : x = 0 est le plan par
    rapport auquel la matrice miroir de VFACE reflechit. Le dessiner est le
    contenu meme des etapes d'orientation, dont tout le but est d'y amener le
    plan sagittal median du patient.
    """
    # pad > 1 fait legerement deborder le quad du crane, sinon son bord se
    # confond avec la silhouette et on ne voit plus qu'il y a un plan.
    cy, cz = (bounds[2] + bounds[3]) / 2.0, (bounds[4] + bounds[5]) / 2.0
    hy = (bounds[3] - bounds[2]) / 2.0 * pad
    hz = (bounds[5] - bounds[4]) / 2.0 * pad
    src = vtk.vtkPlaneSource()
    src.SetOrigin(0.0, cy - hy, cz - hz)
    src.SetPoint1(0.0, cy + hy, cz - hz)
    src.SetPoint2(0.0, cy - hy, cz + hz)
    src.SetXResolution(1)
    src.SetYResolution(1)
    src.Update()
    tri = vtk.vtkTriangleFilter()
    tri.SetInputConnection(src.GetOutputPort())
    tri.Update()
    return normals(tri)


def read_landmarks(path):
    """{label: position LPS} tel qu'ALI l'a ecrit."""
    d = json.load(open(path, encoding="utf-8"))["markups"][0]
    if d.get("coordinateSystem") not in (None, "LPS"):
        sys.exit("Reperes en %s : la suite suppose LPS." % d.get("coordinateSystem"))
    return {cp["label"]: np.array(cp["position"], dtype=float)
            for cp in d["controlPoints"]}


def check_frame(face, lms):
    """Le repere des reperes est-il bien celui du maillage ?

    NIfTI stocke sa QForm en RAS, les .mrk.json d'ALI sont en LPS, et une
    confusion des deux ne casse rien : elle deplace juste les points. On la
    detecte en comparant la distance moyenne aux sommets du crane pour les
    quatre combinaisons de signes possibles. Si l'identite ne gagne pas
    largement, c'est qu'on s'est trompe -- et on refuse plutot que de publier
    des reperes decales.
    """
    loc = vtk.vtkPointLocator()
    loc.SetDataSet(face)
    loc.BuildLocator()

    def mean_dist(flip):
        tot = 0.0
        for v in lms.values():
            q = v * np.array(flip, dtype=float)
            j = loc.FindClosestPoint(q.tolist())
            tot += np.linalg.norm(np.array(face.GetPoint(j)) - q)
        return tot / max(1, len(lms))

    # Le crane etant presque symetrique, le seul « x inverse » se discrimine
    # mal (quelques dixiemes de mm) -- mais ce n'est pas le risque reel. Le
    # risque, c'est la confusion LPS/RAS, qui inverse x ET y : celle-la se voit
    # franchement, les orbitales partant a l'arriere du crane.
    cands = {"identite (LPS)": (1, 1, 1), "x inverse": (-1, 1, 1),
             "x,y inverses (RAS)": (-1, -1, 1), "y inverse": (1, -1, 1)}
    scores = {k: mean_dist(v) for k, v in cands.items()}
    for k in sorted(scores, key=lambda n: scores[n]):
        print("      %-20s %5.2f mm" % (k, scores[k]))
    best = min(scores, key=lambda n: scores[n])
    if best != "identite (LPS)":
        sys.exit("Les reperes tombent mieux en « %s » qu'en LPS : le repere du "
                 "maillage et celui d'ALI ne concordent pas." % best)
    return scores["identite (LPS)"]


def apply_matrix(poly, M):
    m = vtk.vtkMatrix4x4()
    for i in range(4):
        for j in range(4):
            m.SetElement(i, j, float(M[i][j]))
    t = vtk.vtkTransform()
    t.SetMatrix(m)
    f = vtk.vtkTransformPolyDataFilter()
    f.SetTransform(t)
    f.SetInputData(poly)
    f.Update()
    return normals(f)


def icp(source, target, iters=80):
    """Recalage rigide de `source` sur `target`. Renvoie la matrice 4x4."""
    reg = vtk.vtkIterativeClosestPointTransform()
    reg.SetSource(source)
    reg.SetTarget(target)
    reg.GetLandmarkTransform().SetModeToRigidBody()
    reg.SetMaximumNumberOfIterations(iters)
    reg.SetMaximumNumberOfLandmarks(4000)
    reg.StartByMatchingCentroidsOff()
    reg.Modified()
    reg.Update()
    m = reg.GetMatrix()
    return np.array([[m.GetElement(i, j) for j in range(4)] for i in range(4)])


def distances(src, dst_poly):
    """Distance de chaque sommet de `src` a la surface `dst_poly`, en mm."""
    loc = vtk.vtkPointLocator()
    loc.SetDataSet(dst_poly)
    loc.BuildLocator()
    n = src.GetNumberOfPoints()
    out = np.empty(n)
    for i in range(n):
        p = np.array(src.GetPoint(i))
        j = loc.FindClosestPoint(p.tolist())
        out[i] = np.linalg.norm(np.array(dst_poly.GetPoint(j)) - p)
    return out


def quantize(vals, vmin, vmax):
    """Meme quantification que webmesh.encode, pour un champ envoye a part."""
    rng = (vmax - vmin) or 1.0
    buf = bytearray()
    for v in vals:
        q = int(round((v - vmin) / rng * 255.0))
        buf.append(0 if q < 0 else (255 if q > 255 else q))
    return base64.b64encode(bytes(buf)).decode()


def main():
    need = [T1, MIRROR_TFM, B + LANDMARKS] + [B + rel for rel, _ in MASKS.values()]
    for f in need:
        if not os.path.exists(f):
            sys.exit("Fichier absent :\n  %s" % f)

    M = read_mirror(MIRROR_TFM)
    det = float(np.linalg.det(M[:3, :3]))
    print("— la matrice miroir de VFACE —")
    print("  %s" % np.array2string(M[:3, :3], precision=0, suppress_small=True)
          .replace("\n", "\n  "))
    print("  determinant %.0f -> %s, translation %.2f mm"
          % (det, "reflexion" if det < 0 else "rotation", np.linalg.norm(M[:3, 3])))
    if det >= 0:
        sys.exit("Cette matrice n'est pas une reflexion : la scene n'aurait pas de sens.")

    origin = sitk.ReadImage(T1).GetOrigin()

    print("\n— surfaces —")
    face = surface(T1, BONE, SIGMA, SKULL_TRIS, origin)
    print("  crane          %6d triangles, %5d sommets"
          % (face.GetNumberOfPolys(), face.GetNumberOfPoints()))
    mirror = apply_matrix(face, M)
    plane = plane_at_x0(face.GetBounds())

    print("\n— les reperes d'ALI_CBCT pour ce scan —")
    lms = read_landmarks(B + LANDMARKS)
    got = [k for k in SET_CB if k in lms]
    lost = [k for k in SET_CB if k not in lms]
    extra = [k for k in lms if k not in SET_CB]
    print("  set « base du crane » : %d/%d  (%s)" % (len(got), len(SET_CB), ", ".join(got)))
    if lost:
        print("  absents : %s — ALI ne les a pas trouves, on ne les invente pas"
              % ", ".join(lost))
    if extra:
        sys.exit("Reperes hors du set attendu : %s" % ", ".join(extra))
    print("  set « maxillaire » (%s) : absent de ce jeu publie" % " ".join(SET_MAX))
    print("    verification du repere :")
    d = check_frame(face, lms)
    print("      -> LPS confirme, %.2f mm en moyenne du sommet le plus proche" % d)

    regions, fields = [], {}
    print("\n— les trois recalages, et ce qu'ils laissent voir —")
    for code in ORDER:
        rel, label = MASKS[code]
        reg_poly = surface(B + rel, 0.5, 0.6, MASK_TRIS, origin)
        reg_mirror = apply_matrix(reg_poly, M)

        # Le recalage ne regarde que cette region : c'est tout le point.
        R = icp(reg_mirror, reg_poly)
        before = distances(reg_mirror, reg_poly)
        after = distances(apply_matrix(reg_mirror, R), reg_poly)

        # La carte, elle, se lit sur le crane ENTIER -- sinon on ne verrait pas
        # ce que le recalage a repousse ailleurs.
        whole = apply_matrix(mirror, R)
        vals = distances(face, whole)

        ang = np.degrees(np.arccos(
            max(-1.0, min(1.0, (np.trace(R[:3, :3]) - 1) / 2))))
        print("  %-4s %-13s ICP %5.2f -> %5.2f mm  (rot %4.1f°, transl %5.2f mm)"
              % (code, label, before.mean(), after.mean(), ang,
                 np.linalg.norm(R[:3, 3])))
        print("       carte sur le crane : mediane %5.2f mm, 95e centile %5.2f, max %5.2f"
              % (np.median(vals), np.percentile(vals, 95), vals.max()))

        regions.append({
            "code": code, "label": label,
            "icpBefore": round(float(before.mean()), 2),
            "icpAfter": round(float(after.mean()), 2),
            "median": round(float(np.median(vals)), 2),
            "p95": round(float(np.percentile(vals, 95)), 2),
            "max": round(float(vals.max()), 2),
        })
        fields[code] = {"R": R, "vals": vals, "surface": reg_poly}

    meshes = {"FACE": face, "MIRROR": mirror, "PLANE": plane}
    for code in ORDER:
        meshes["R_" + code] = fields[code]["surface"]

    # Le repere de la scene : positions normalisees sur la bbox COMMUNE. Une
    # matrice envoyee brute agirait en millimetres et enverrait la piece au
    # loin -- il faut la conjuguer, exactement comme areg_mesh.py.
    # Cette bbox doit etre EXACTEMENT celle que webmesh.encode recalcule de son
    # cote, PLAN COMPRIS : c'est elle qui normalise les positions quantifiees,
    # donc aussi les reperes et les matrices. La faire diverger, ne serait-ce
    # qu'en excluant une piece, decalerait tout sans rien casser visiblement.
    lo, hi = [1e30] * 3, [-1e30] * 3
    for poly in meshes.values():
        bb = poly.GetBounds()
        for k in range(3):
            lo[k] = min(lo[k], bb[k * 2])
            hi[k] = max(hi[k], bb[k * 2 + 1])
    span = max(hi[k] - lo[k] for k in range(3)) or 1.0
    centre = np.array([(hi[k] + lo[k]) / 2.0 for k in range(3)])

    def to_scene(A):
        R, t = A[:3, :3], A[:3, 3]
        out = np.eye(4)
        out[:3, :3] = R
        out[:3, 3] = (R @ centre + t - centre) / span
        return [round(float(x), 7) for x in out.T.reshape(16)]

    def to_scene_pt(v):
        return [round(float((v[k] - centre[k]) / span), 5) for k in range(3)]

    for r in regions:
        r["m"] = to_scene(fields[r["code"]]["R"])
        r["field"] = quantize(fields[r["code"]]["vals"], 0.0, CLIP_MM)

    # La scene anime la reflexion par `diag(1-2t, 1, 1)`, donc elle miroite par
    # rapport a x = 0 DANS SON PROPRE REPERE. Ce n'est vrai que si le centre de
    # la bbox commune tombe sur x = 0 -- ici c'est le cas parce que le crane et
    # son miroir ont une union symetrique par construction. Un scan qui
    # arriverait decentre rendrait l'animation fausse sans rien casser, donc on
    # le refuse ici plutot que de le laisser passer.
    plane_x = (0.0 - centre[0]) / span
    if abs(plane_x) > 1e-6:
        sys.exit("Le plan x = 0 ne tombe pas au centre de la bbox (%.6f en repere "
                 "scene) : l'animation de reflexion de vface-3d.js serait fausse." % plane_x)

    payload = webmesh.encode(
        meshes, focus_on=["FACE"],
        scalars={"FACE": (fields["CB"]["vals"], 0.0, CLIP_MM)},
        extra={
            "mirror": [round(float(x), 6) for x in np.array(M).T.reshape(16)],
            "clip": CLIP_MM,
            "planeX": round(float(plane_x), 6),
            "landmarks": dict((k, to_scene_pt(v)) for k, v in lms.items()),
            "setCB": SET_CB,
            "setMAX": SET_MAX,
            "regions": regions,
        })
    webmesh.write(os.path.join(ROOT, "assets", "vface-mesh.js"), "VFACE_SCENE", payload,
                  "Genere par vface_mesh.py. Jeu de test publie d'AREG_CBCT (T1 deja "
                  "oriente + masques AMASSS) et vraie matrice miroir de VFACE. "
                  "Aucune donnee clinique.")


if __name__ == "__main__":
    main()
