#!/usr/bin/env python3
"""Fabrique la scene 3D d'AREG_CBCT : deux temps, trois recalages.

    /opt/SlicerProd/Slicer-5.13.0-*/bin/PythonSlicer areg_mesh.py

ENTREE  le jeu de test PUBLIE (release lucanchling/Areg_CBCT) : T1, T2, les
        trois masques predits par AMASSS, et les trois matrices qu'AREG a
        ecrites. Aucune donnee clinique.

CE QUE LA SCENE DOIT FAIRE COMPRENDRE. Le recalage ne regarde PAS tout le
crane : `VoxelBasedRegistration` masque d'abord le T1, et elastix ne voit que
l'interieur du masque. D'ou trois recalages distincts -- base du crane,
mandibule, maxillaire -- chacun avec son masque et sa matrice. Se superposer
sur l'un ne superpose pas les autres, et c'est tout l'interet clinique : on
superpose sur une structure stable pour MESURER le deplacement des autres.

REPERE. Les cinq volumes partagent grille, espacement (0,3 mm) et origine
(-84,15 / -84,15 / -66,3). Les matrices d'Euler ont FixedParameters (0,0,0),
donc elles tournent autour de l'origine physique, qui est le centre du
volume. Rien a deviner : on passe les maillages en coordonnees physiques et
la matrice s'applique telle quelle.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import webmesh
import numpy as np
import SimpleITK as sitk
import vtk

ROOT = os.path.dirname(os.path.abspath(__file__))
B = os.path.expanduser(
    "~/Documents/SlicerDownloads/AREG/AREG_CBCT/Test_Files/Oriented-Automated/")

T1 = B + "T1Or/C_0001_T1_Or.nii.gz"
T2 = B + "T2_Center/C_0001_T2.nii.gz"
MASKS = {
    "CB":   ("T1Or/C_0001_T1_Or_seg_CBMASK.nii.gz",   "Cranial Base"),
    "MAND": ("T1Or/C_0001_T1_Or_seg_MANDMASK.nii.gz", "Mandible"),
    "MAX":  ("T1Or/C_0001_T1_Or_seg_MAXMASK.nii.gz",  "Maxilla"),
}
MATRICES = {
    "CB":   "Registered/Cranial Base/C_0001_OutReg/C_0001_CBReg_matrix.tfm",
    "MAND": "Registered/Mandible/C_0001_OutReg/C_0001_MANDReg_matrix.tfm",
    "MAX":  "Registered/Maxilla/C_0001_OutReg/C_0001_MAXReg_matrix.tfm",
}

#: Les reperes qu'ALI_CBCT place en amont, en mode Orientation. Le CLI est
#: appele avec lm_type = "'N','S','Ba','RPo','LPo','LOr','ROr'" (CBCT.py:756)
#: et ce fichier est sa sortie, deja dans le repere du T1 oriente -- celui de
#: la scene. N manque : l'agent ne l'a pas trouve sur ce scan, et on ne
#: l'invente pas.
LANDMARKS = "T1Or/C_0001_T1_lm_Or.mrk.json"

BONE = 500.0
SIGMA = 1.5
SKULL_TRIS = 30000
MASK_TRIS = 6000


def euler_from_tfm(path):
    """Le .tfm porte 3 angles puis 3 translations. On laisse SimpleITK
    construire la matrice : l'ordre des rotations d'ITK n'est pas celui
    qu'on devinerait, et c'est exactement le genre de convention qu'il ne
    faut pas supposer."""
    txt = open(path, encoding="utf-8").read()
    v = [float(x) for x in re.search(r"Parameters:\s*([-\d\.e ]+)", txt).group(1).split()]
    t = sitk.Euler3DTransform()
    t.SetParameters(v[:6])
    M = np.eye(4)
    M[:3, :3] = np.array(t.GetMatrix()).reshape(3, 3)
    M[:3, 3] = t.GetTranslation()
    # SENS. elastix renvoie la transformation du FIXE vers le MOBILE -- c'est
    # sa convention pour le reechantillonnage. Pour amener le T2 sur le T1 il
    # faut donc l'inverse. Verifie et non suppose : l'ecart de surface dans
    # le masque passe de 3,41 a 1,37 mm avec l'inverse, et monte a 6,03 sans.
    return np.linalg.inv(M)


def surface(path, threshold, sigma, budget, origin):
    r = vtk.vtkNIFTIImageReader()
    r.SetFileName(path)
    r.Update()
    iso = webmesh.iso_surface(r, threshold, sigma)
    clean, _ = webmesh.clean(iso, 0.02)
    poly = webmesh.smooth_decimate(clean, budget, iterations=16)
    # indice x espacement -> coordonnees physiques : une simple translation,
    # les cinq volumes partageant deja grille et espacement.
    t = vtk.vtkTransform()
    t.Translate(origin[0], origin[1], origin[2])
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


def mean_gap(moving, fixed, M, inside):
    """Distance moyenne des sommets du T2 a la surface du T1, en ne comptant
    que ceux qui tombent dans la region masquee -- c'est la seule zone
    qu'elastix a regardee, donc la seule ou la mesure a un sens."""
    loc = vtk.vtkPointLocator()
    loc.SetDataSet(fixed)
    loc.BuildLocator()
    pts = moving.GetPoints()
    n = pts.GetNumberOfPoints()
    step = max(1, n // 4000)
    tot, cnt = 0.0, 0
    for i in range(0, n, step):
        p = np.array(pts.GetPoint(i))
        q = (M[:3, :3] @ p) + M[:3, 3] if M is not None else p
        if not inside(q):
            continue
        j = loc.FindClosestPoint(q.tolist())
        tot += float(np.linalg.norm(np.array(fixed.GetPoint(j)) - q))
        cnt += 1
    return (tot / cnt, cnt) if cnt else (float("nan"), 0)


def main():
    for f in (T1, T2):
        if not os.path.exists(f):
            sys.exit("Volume absent :\n  %s\nC'est le bouton « Test Files » d'AREG." % f)

    im = sitk.ReadImage(T1)
    origin = im.GetOrigin()

    print("— surfaces —")
    meshes = {}
    meshes["T1"] = surface(T1, BONE, SIGMA, SKULL_TRIS, origin)
    print("  T1   %6d triangles" % meshes["T1"].GetNumberOfPolys())
    meshes["T2"] = surface(T2, BONE, SIGMA, SKULL_TRIS, origin)
    print("  T2   %6d triangles" % meshes["T2"].GetNumberOfPolys())

    bounds = {}
    for code, (rel, label) in MASKS.items():
        p = os.path.join(B, rel)
        if not os.path.exists(p):
            print("  masque %s absent" % code)
            continue
        meshes["M_" + code] = surface(p, 0.5, 0.6, MASK_TRIS, origin)
        bounds[code] = meshes["M_" + code].GetBounds()
        print("  %-5s %6d triangles (masque)" % (code, meshes["M_" + code].GetNumberOfPolys()))

    print("\n— recalages —")
    regs = {}
    for code, rel in MATRICES.items():
        p = os.path.join(B, rel)
        if not os.path.exists(p) or code not in bounds:
            continue
        M = euler_from_tfm(p)
        ang = np.degrees(np.arccos(max(-1, min(1, (np.trace(M[:3, :3]) - 1) / 2))))
        b = bounds[code]
        inside = lambda q, b=b: (b[0] <= q[0] <= b[1] and b[2] <= q[1] <= b[3]
                                 and b[4] <= q[2] <= b[5])
        before, n = mean_gap(meshes["T2"], meshes["T1"], None, inside)
        after, _ = mean_gap(meshes["T2"], meshes["T1"], M, inside)
        regs[code] = {"M": M, "deg": round(float(ang), 2),
                      "mm": round(float(np.linalg.norm(M[:3, 3])), 2),
                      "before": round(before, 2), "after": round(after, 2),
                      "label": MASKS[code][1]}
        print("  %-5s %5.2f deg, %5.2f mm  |  ecart de surface %5.2f -> %5.2f mm "
              "(%d sommets dans le masque)" % (code, ang, np.linalg.norm(M[:3, 3]),
                                               before, after, n))

    lo = [1e30] * 3
    hi = [-1e30] * 3
    for poly in meshes.values():
        bb = poly.GetBounds()
        for k in range(3):
            lo[k] = min(lo[k], bb[k * 2])
            hi[k] = max(hi[k], bb[k * 2 + 1])
    span = max(hi[k] - lo[k] for k in range(3)) or 1.0
    centre = np.array([(hi[k] + lo[k]) / 2.0 for k in range(3)])

    def to_scene(M):
        R, t = M[:3, :3], M[:3, 3]
        out = np.eye(4)
        out[:3, :3] = R
        out[:3, 3] = (R @ centre + t - centre) / span
        return [round(float(x), 7) for x in out.T.reshape(16)]

    lms = {}
    lp = os.path.join(B, LANDMARKS)
    if os.path.exists(lp):
        d = json.load(open(lp, encoding="utf-8"))["markups"][0]
        for cp in d["controlPoints"]:
            v = np.array(cp["position"], dtype=float)
            lms[cp["label"]] = [round(float((v[k] - centre[k]) / span), 5)
                                for k in range(3)]
        print("  reperes d'ALI en amont : %d (%s)"
              % (len(lms), ", ".join(sorted(lms))))

    payload = webmesh.encode(meshes, focus_on=["T1"], extra={
        "landmarks": lms,
        "regions": [{"code": c, "label": regs[c]["label"], "m": to_scene(regs[c]["M"]),
                     "deg": regs[c]["deg"], "mm": regs[c]["mm"],
                     "before": regs[c]["before"], "after": regs[c]["after"]}
                    for c in ("CB", "MAND", "MAX") if c in regs],
    })
    webmesh.write(os.path.join(ROOT, "assets", "areg-mesh.js"), "AREG_SCENE", payload,
                  "Genere par areg_mesh.py. Jeu de test publie (Areg_CBCT), et les "
                  "trois matrices qu'AREG a reellement ecrites. Aucune donnee clinique.")


if __name__ == "__main__":
    main()
