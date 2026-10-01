#!/usr/bin/env python3
"""Fabrique la scene 3D de VFACE a partir de SA PROPRE passe.

    /opt/SlicerProd/Slicer-5.13.0-*/bin/PythonSlicer vface_mesh.py

ENTREE  le jeu de test PUBLIE de VFACE (`V_FACE/Test_Files/Oriented-Automated/`)
        et la sortie complete d'une vraie execution : les trois matrices AREG,
        les scans miroirs, les reperes predits par ALI, et les trois cartes
        `ModelDistance`. Aucune donnee clinique.

POURQUOI CETTE VERSION REMPLACE LA PRECEDENTE. La premiere version de cette
scene recalait le miroir par un ICP ecrit pour la page, faute d'avoir trouve
cette sortie. Deux consequences, toutes deux corrigees ici :
  - l'ICP du maxillaire glissait (10,2 deg de rotation) alors que la vraie
    matrice d'AREG n'en tourne que 4,3 ;
  - la distance non signee sur un maillage decime donnait une mediane de
    1,36 mm, ce qui faisait passer ce patient pour presque symetrique. La
    mesure de VFACE sur la surface pleine va de -25 a +32 mm.
Plus rien n'est recalcule ici : les matrices, les surfaces et les distances
sortent toutes de l'outil.

LES TROIS CARTES SONT LES TROIS RECALAGES. createlistprocess.py (l. 1314-1365)
appelle ModelToModel Distance trois fois, et c'est tout le sujet de la scene :
  merged      = T1 CB  contre T2 CB   -> superposition sur la BASE DU CRANE
  Mandible    = T1 CB  contre T2 MAND -> superposition sur la MANDIBULE
  Upper_Skull = T1 MAX contre T2 MAX  -> superposition sur le MAXILLAIRE
L'asymetrie qu'on mesure depend de la structure sur laquelle on se superpose.

UN POINT DE REPERE A NE PAS SUPPOSER. `Upper_Skull` vit dans le repere oriente
SUR LE MAXILLAIRE, les deux autres dans celui oriente sur la base du crane.
Les deux transformations d'orientation sont dans la sortie ; le script essaie
les deux sens de composition et garde celui qui superpose vraiment, en
l'imprimant. Deviner aurait decale cette carte d'un degre ou deux sans que
rien ne casse visiblement.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base64
import webmesh
import numpy as np
import SimpleITK as sitk
import vtk

ROOT = os.path.dirname(os.path.abspath(__file__))
B = os.path.expanduser("~/Documents/SlicerDownloads/V_FACE/Test_Files/"
                       "Oriented-Automated/")
OUT = B + "Output/"

#: Les trois cartes, et le recalage dont chacune est la lecture.
REGIONS = [
    {"code": "CB",   "label": "Cranial base",
     "zone": "merged",      "frame": "CB",
     "matrix": "Registered Scan/Cranial Base/C_0001_OutReg/C_0001_CB_Reg_matrix.tfm"},
    {"code": "MAX",  "label": "Maxilla",
     "zone": "Upper_Skull", "frame": "MAX",
     "matrix": "Registered Scan/Maxilla/C_0001_OutReg/C_0001_MAX_Reg_matrix.tfm"},
    {"code": "MAND", "label": "Mandible",
     "zone": "Mandible",    "frame": "CB",
     "matrix": "Registered Scan/Mandible/C_0001_OutReg/C_0001_MAND_Reg_matrix.tfm"},
]
HEAT = OUT + "Heatmaps/C_0001_%s_ModelDistance.vtk"
OR_TFM = {"CB":  OUT + "Oriented T1 Scans/CB/C_0001_T1_CB_Or_transform.tfm",
          "MAX": OUT + "Oriented T1 Scans/MAX/C_0001_T1_MAX_Or_transform.tfm"}
ORIENTED_SCAN = OUT + "Oriented T1 Scans/CB/C_0001_T1_CB_Or.nii.gz"
MIRROR_SCAN = OUT + "T2_Scan/CB/C_0001_T1_CB_Or_mir.nii.gz"
MIRROR_TFM = os.path.expanduser("~/Documents/SlicerDownloads/Mirror_matrix/Mirror/"
                                "Matrix_mirror.tfm")
#: Les reperes qu'ALI a predits, dans le repere oriente sur la base du crane.
LM_DIR = OUT + "T1 Landmarks/CB/"
LM_FILES = {"CB": "C_0001_T1_CB_Or_lm_Pred_CB.mrk.json",
            "U":  "C_0001_T1_CB_Or_lm_Pred_U.mrk.json",
            "L":  "C_0001_T1_CB_Or_lm_Pred_L.mrk.json"}
BONE, SIGMA = 500.0, 1.5
HEAT_TRIS, MIRROR_TRIS = 26000, 30000


# ---------------------------------------------------------------- utilitaires

def normals(poly):
    nr = vtk.vtkPolyDataNormals()
    nr.SetInputData(poly)
    nr.SplittingOff()
    nr.ConsistencyOn()
    nr.Update()
    out = vtk.vtkPolyData()
    out.DeepCopy(nr.GetOutput())
    return out


def affine_of(path):
    """Le 4x4 d'une transformation ITK, composite comprise.

    On ne lit pas les parametres -- une CompositeTransform en a plusieurs jeux
    et leur ordre d'application se pretend plus qu'il ne se lit. On evalue la
    transformation sur l'origine et les trois vecteurs de base : pour une
    transformation affine, c'est exact.
    """
    tf = sitk.ReadTransform(path)
    o = np.array(tf.TransformPoint((0.0, 0.0, 0.0)))
    M = np.eye(4)
    for k in range(3):
        e = [0.0, 0.0, 0.0]
        e[k] = 1.0
        M[:3, k] = np.array(tf.TransformPoint(tuple(e))) - o
    M[:3, 3] = o
    return M


def read_tfm_euler(path):
    """Les six parametres d'un Euler3DTransform -> 4x4. Ce sont les matrices
    qu'AREG a ecrites ; le centre (FixedParameters) est nul ici."""
    txt = open(path, encoding="utf-8").read()
    v = [float(x) for x in re.search(r"Parameters:\s*([-\d\.eE ]+)", txt).group(1).split()]
    rx, ry, rz, tx, ty, tz = v[:6]
    cx, cy, cz = np.cos([rx, ry, rz])
    sx, sy, sz = np.sin([rx, ry, rz])
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    M = np.eye(4)
    M[:3, :3] = Rz @ Ry @ Rx          # l'ordre d'ITK pour Euler3D
    M[:3, 3] = [tx, ty, tz]
    return M


def read_mirror(path):
    txt = open(path, encoding="utf-8").read()
    v = [float(x) for x in re.search(r"Parameters:\s*([-\d\.eE ]+)", txt).group(1).split()]
    M = np.eye(4)
    M[:3, :3] = np.array(v[:9]).reshape(3, 3)
    if len(v) >= 12:
        M[:3, 3] = v[9:12]
    return M


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
    out = vtk.vtkPolyData()
    out.DeepCopy(f.GetOutput())
    return out


def mean_surface_gap(a, b, sample=6000):
    """Distance moyenne des sommets de `a` a la surface de `b`."""
    loc = vtk.vtkPointLocator()
    loc.SetDataSet(b)
    loc.BuildLocator()
    n = a.GetNumberOfPoints()
    step = max(1, n // sample)
    tot, cnt = 0.0, 0
    for i in range(0, n, step):
        p = np.array(a.GetPoint(i))
        j = loc.FindClosestPoint(p.tolist())
        tot += np.linalg.norm(np.array(b.GetPoint(j)) - p)
        cnt += 1
    return tot / max(1, cnt)


def decimate_keep_scalar(poly, target, name="Distance"):
    """Decime la GEOMETRIE, puis recopie le scalaire depuis l'original.

    La metrique d'attribut de vtkQuadricDecimation extrapole : sur la carte
    fusionnee elle sortait -32,1 pour un minimum reel de -25,4. On decime donc
    sans elle et on relit la valeur au sommet le plus proche de la surface
    pleine -- aucune valeur inventee, aucune hors de la plage mesuree.
    """
    src_vals = poly.GetPointData().GetArray(name)
    if src_vals is None:
        sys.exit("La carte n'a pas de tableau « %s »." % name)
    loc = vtk.vtkPointLocator()
    loc.SetDataSet(poly)
    loc.BuildLocator()

    d = vtk.vtkQuadricDecimation()
    d.SetInputData(poly)
    ntri = max(1, poly.GetNumberOfPolys())
    d.SetTargetReduction(max(0.0, min(0.999, 1.0 - float(target) / ntri)))
    d.Update()
    sm = vtk.vtkWindowedSincPolyDataFilter()
    sm.SetInputData(d.GetOutput())
    sm.SetNumberOfIterations(14)
    sm.SetPassBand(0.06)
    sm.NonManifoldSmoothingOn()
    sm.NormalizeCoordinatesOn()
    sm.Update()
    out = vtk.vtkPolyData()
    out.DeepCopy(sm.GetOutput())

    vals = np.empty(out.GetNumberOfPoints())
    for i in range(out.GetNumberOfPoints()):
        j = loc.FindClosestPoint(list(out.GetPoint(i)))
        vals[i] = src_vals.GetTuple1(j)
    return normals(out), vals


def surface_from_volume(path, level, sigma, tris):
    im = sitk.ReadImage(path)
    r = vtk.vtkNIFTIImageReader()
    r.SetFileName(path)
    r.Update()
    iso = webmesh.iso_surface(r, level, sigma)
    clean, _ = webmesh.clean(iso, 0.02)
    poly = webmesh.smooth_decimate(clean, tris, iterations=16)
    o = im.GetOrigin()
    t = vtk.vtkTransform()
    t.Translate(o[0], o[1], o[2])
    f = vtk.vtkTransformPolyDataFilter()
    f.SetTransform(t)
    f.SetInputData(poly)
    f.Update()
    out = vtk.vtkPolyData()
    out.DeepCopy(f.GetOutput())
    return normals(out)


def read_heat(zone):
    r = vtk.vtkPolyDataReader()
    r.SetFileName(HEAT % zone)
    r.ReadAllScalarsOn()
    r.Update()
    out = vtk.vtkPolyData()
    out.DeepCopy(r.GetOutput())
    return out


def quantize_signed(vals, lim):
    """Signee, symetrique : 0 mm tombe sur 128 pour que la rampe divergente
    lise le zero comme un zero. Sature a +/- `lim`."""
    buf = bytearray()
    for v in vals:
        q = int(round((v / lim * 0.5 + 0.5) * 255.0))
        buf.append(0 if q < 0 else (255 if q > 255 else q))
    return base64.b64encode(bytes(buf)).decode()


def plane_at_x0(bounds, pad=1.06):
    """Un quad dans le plan x = 0. Ce n'est pas une mesure mais la definition
    du plan par rapport auquel la matrice miroir reflechit ; pad > 1 le fait
    legerement deborder pour qu'on voie son bord."""
    cy, cz = (bounds[2] + bounds[3]) / 2.0, (bounds[4] + bounds[5]) / 2.0
    hy = (bounds[3] - bounds[2]) / 2.0 * pad
    hz = (bounds[5] - bounds[4]) / 2.0 * pad
    src = vtk.vtkPlaneSource()
    src.SetOrigin(0.0, cy - hy, cz - hz)
    src.SetPoint1(0.0, cy + hy, cz - hz)
    src.SetPoint2(0.0, cy - hy, cz + hz)
    src.Update()
    tri = vtk.vtkTriangleFilter()
    tri.SetInputConnection(src.GetOutputPort())
    tri.Update()
    out = vtk.vtkPolyData()
    out.DeepCopy(tri.GetOutput())
    return normals(out)


# --------------------------------------------------------------------- main

def main():
    need = [ORIENTED_SCAN, MIRROR_SCAN, MIRROR_TFM] + [HEAT % r["zone"] for r in REGIONS] \
         + [OUT + r["matrix"] for r in REGIONS] + list(OR_TFM.values()) \
         + [LM_DIR + f for f in LM_FILES.values()]
    for f in need:
        if not os.path.exists(f):
            sys.exit("Fichier absent :\n  %s" % f)

    M = read_mirror(MIRROR_TFM)
    print("— la matrice miroir de VFACE —")
    print("  diag %s, translation %.2f mm, determinant %.0f"
          % ([int(M[k][k]) for k in range(3)], np.linalg.norm(M[:3, 3]),
             np.linalg.det(M[:3, :3])))
    if np.linalg.det(M[:3, :3]) >= 0:
        sys.exit("Cette matrice n'est pas une reflexion.")

    print("\n— les trois matrices qu'AREG a ecrites —")
    for r in REGIONS:
        A = read_tfm_euler(OUT + r["matrix"])
        ang = np.degrees(np.arccos(max(-1.0, min(1.0, (np.trace(A[:3, :3]) - 1) / 2))))
        print("  %-4s %-13s rotation %5.2f deg, translation %5.2f mm"
              % (r["code"], r["label"], ang, np.linalg.norm(A[:3, 3])))
        r["A"] = A

    # ---- les cartes, et le repere de celle du maxillaire ----
    print("\n— les trois cartes ModelDistance —")
    heat_cb = read_heat("merged")
    to_cb = {"CB": np.eye(4)}

    # Le sens de composition se mesure, il ne se suppose pas.
    Mcb, Mmax = affine_of(OR_TFM["CB"]), affine_of(OR_TFM["MAX"])
    cands = {
        "inv(CB) . MAX":      np.linalg.inv(Mcb) @ Mmax,
        "CB . inv(MAX)":      Mcb @ np.linalg.inv(Mmax),
        "MAX . inv(CB)":      Mmax @ np.linalg.inv(Mcb),
        "inv(MAX) . CB":      np.linalg.inv(Mmax) @ Mcb,
        "identite":           np.eye(4),
    }
    probe = read_heat("Upper_Skull")
    print("    repere de Upper_Skull -> celui de merged :")
    scores = {}
    for name, T in cands.items():
        scores[name] = mean_surface_gap(apply_matrix(probe, T), heat_cb, 2500)
        print("      %-16s %5.2f mm" % (name, scores[name]))
    best = min(scores, key=lambda n: scores[n])
    print("      -> « %s » retenu (%.2f mm)" % (best, scores[best]))
    to_cb["MAX"] = cands[best]

    meshes, fields = {}, {}
    for r in REGIONS:
        poly = heat_cb if r["zone"] == "merged" else read_heat(r["zone"])
        full = poly.GetNumberOfPoints()
        rng = poly.GetPointData().GetArray("Distance").GetRange()
        if r["frame"] != "CB":
            poly = apply_matrix(poly, to_cb[r["frame"]])
        mesh, vals = decimate_keep_scalar(poly, HEAT_TRIS)
        code = "H_" + r["code"]
        meshes[code] = mesh
        fields[code] = vals
        # Une echelle PAR carte. Les trois ne sont pas comparables au pixel :
        # elles ne couvrent pas la meme surface (le crane entier, le haut du
        # crane seul, la mandibule seule) et leurs plages vont de +/-2,6 mm a
        # +/-32. Une echelle commune rendrait deux cartes sur trois incolores.
        # La comparaison se fait sur les CHIFFRES, affiches dans la legende et
        # la ligne d'etat, pas sur la teinte.
        r["limit"] = float(np.ceil(abs(vals).max() / 5.0) * 5.0) or 5.0
        r.update(dmin=round(float(vals.min()), 2), dmax=round(float(vals.max()), 2),
                 median=round(float(np.median(vals)), 2),
                 absmed=round(float(np.median(np.abs(vals))), 2),
                 p98=round(float(np.percentile(np.abs(vals), 98)), 2))
        print("  %-4s %-12s %7d pts -> %5d tris, Distance %6.2f .. %6.2f mm"
              % (r["code"], r["zone"], full, mesh.GetNumberOfPolys(),
                 vals.min(), vals.max()))
        print("       (plage de la surface pleine : %.2f .. %.2f — rien n'est extrapole)"
              % rng)

    print("\n  echelles divergentes : %s"
          % ", ".join("%s +/-%.0f mm" % (r["code"], r["limit"]) for r in REGIONS))

    # Le scan tel qu'il entre : sans lui, la surface osseuse d'AMASSS serait
    # a l'ecran avant l'etape qui la produit, ce qui laisserait croire que la
    # segmentation a deja tourne.
    meshes["RAW"] = surface_from_volume(ORIENTED_SCAN, BONE, SIGMA, MIRROR_TRIS)
    print("  scan oriente (entree) : %d triangles" % meshes["RAW"].GetNumberOfPolys())
    meshes["MIRROR"] = surface_from_volume(MIRROR_SCAN, BONE, SIGMA, MIRROR_TRIS)
    print("  miroir reel de VFACE : %d triangles" % meshes["MIRROR"].GetNumberOfPolys())
    meshes["PLANE"] = plane_at_x0(meshes["H_CB"].GetBounds())

    # ---- les reperes qu'ALI a predits ----
    print("\n— les reperes predits par ALI —")
    lms = {}
    for key, fn in LM_FILES.items():
        d = json.load(open(LM_DIR + fn, encoding="utf-8"))["markups"][0]
        if d.get("coordinateSystem") not in (None, "LPS"):
            sys.exit("Reperes en %s, LPS attendu." % d.get("coordinateSystem"))
        got = {cp["label"]: np.array(cp["position"], dtype=float)
               for cp in d["controlPoints"]}
        lms[key] = got
        print("  %-3s %2d points : %s" % (key, len(got), ", ".join(sorted(got))))

    # ---- le repere commun, puis l'encodage ----
    lo, hi = [1e30] * 3, [-1e30] * 3
    for poly in meshes.values():
        bb = poly.GetBounds()
        for k in range(3):
            lo[k] = min(lo[k], bb[k * 2])
            hi[k] = max(hi[k], bb[k * 2 + 1])
    span = max(hi[k] - lo[k] for k in range(3)) or 1.0
    centre = np.array([(hi[k] + lo[k]) / 2.0 for k in range(3)])

    plane_x = (0.0 - centre[0]) / span
    if abs(plane_x) > 0.02:
        sys.exit("Le plan x = 0 est a %.3f du centre de la bbox : l'animation de "
                 "reflexion de vface-3d.js suppose x = 0 au centre." % plane_x)

    def to_scene(A):
        R, t = A[:3, :3], A[:3, 3]
        out = np.eye(4)
        out[:3, :3] = R
        out[:3, 3] = (R @ centre + t - centre) / span
        return [round(float(x), 7) for x in out.T.reshape(16)]

    def pt(v):
        return [round(float((v[k] - centre[k]) / span), 5) for k in range(3)]

    regions = []
    for r in REGIONS:
        regions.append({
            "code": r["code"], "label": r["label"], "zone": r["zone"],
            "part": "H_" + r["code"], "m": to_scene(r["A"]),
            "rot": round(float(np.degrees(np.arccos(
                max(-1.0, min(1.0, (np.trace(r["A"][:3, :3]) - 1) / 2))))), 2),
            "trans": round(float(np.linalg.norm(r["A"][:3, 3])), 2),
            "dmin": r["dmin"], "dmax": r["dmax"], "limit": r["limit"],
            "median": r["median"], "absmed": r["absmed"], "p98": r["p98"],
        })

    payload = webmesh.encode(
        meshes, focus_on=["H_CB"],
        scalars=dict((c, (fields[c], -r["limit"], r["limit"]))
                     for r in REGIONS for c in ["H_" + r["code"]]),
        extra={
            "mirror": [round(float(x), 6) for x in np.array(M).T.reshape(16)],
            "planeX": round(float(plane_x), 6),
            "landmarks": dict((k, dict((lab, pt(v)) for lab, v in d.items()))
                              for k, d in lms.items()),
            "regions": regions,
        })
    # Les cartes partent signees, chacune sur SON echelle : le shader divergent
    # remet le zero au milieu de l'octet.
    for r in REGIONS:
        c = "H_" + r["code"]
        payload["parts"][c]["val"] = quantize_signed(fields[c], r["limit"])
        payload["parts"][c]["vmin"] = -r["limit"]
        payload["parts"][c]["vmax"] = r["limit"]

    webmesh.write(os.path.join(ROOT, "assets", "vface-mesh.js"), "VFACE_SCENE", payload,
                  "Genere par vface_mesh.py depuis la sortie d'une vraie passe de VFACE "
                  "sur son jeu de test publie : ses trois matrices AREG, son scan miroir, "
                  "ses reperes ALI et ses trois cartes ModelDistance. Aucune donnee "
                  "clinique, et aucune mesure recalculee pour la page.")


if __name__ == "__main__":
    main()
