#!/usr/bin/env python3
"""Fabrique la scene 3D d'AREG_IOS : deux temps d'une meme arcade.

    /opt/SlicerProd/Slicer-5.13.0-*/bin/PythonSlicer areg_ios_mesh.py

ENTREE  le jeu de test PUBLIE. Aucune donnee clinique.

CE QUE LA SCENE MONTRE. AREG_IOS ne recale pas sur l'arcade entiere : il
recale sur un PATCH -- le papillon palatin predit par un reseau, ou la bande
muco-gingivale calculee. Le tableau `Butterfly` est dans les fichiers de
sortie, donc on montre le vrai patch, pas une zone dessinee a la main.

LA TRANSFORMATION N'EST PAS LUE, ELLE EST RETROUVEE. Le T2 d'entree et le T2
recale ont le meme nombre de points, dans le meme ordre : la transformation
rigide qui mene de l'un a l'autre se recupere exactement par Kabsch. C'est
plus sur que de lire un .tfm dont il faudrait deviner le sens -- et cette
fois le sens ne se devine pas, il se verifie sur les sommets eux-memes.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import webmesh
import numpy as np
import vtk

ROOT = os.path.dirname(os.path.abspath(__file__))
B = os.path.expanduser("~/Documents/SlicerDownloads/AREG/AREG_IOS/Test_Files/"
                       "AREG_test_scan/")
T1 = B + "T1/A2_UpperT1.vtk"
T2 = B + "T2/A2_UpperT2.vtk"
T2REG = B + "Registered/A2_UpperT2Reg.vtk"
T1REG = B + "Registered/A2_UpperT1Reg.vtk"

PATCH_ARRAY = "Butterfly"


def read(path):
    r = vtk.vtkPolyDataReader()
    r.SetFileName(path)
    r.ReadAllScalarsOn()
    r.ReadAllFieldsOn()
    r.Update()
    return r.GetOutput()


def points(poly):
    n = poly.GetNumberOfPoints()
    a = np.empty((n, 3))
    for i in range(n):
        a[i] = poly.GetPoint(i)
    return a


def kabsch(src, dst):
    """La rotation et la translation rigides optimales entre deux nuages
    APPARIES -- ici les memes sommets avant et apres. Avec des points en
    correspondance exacte, le residu doit tomber au bruit machine ; s'il ne
    tombe pas, c'est que le recalage n'etait pas rigide et il faut le dire."""
    cs, cd = src.mean(0), dst.mean(0)
    H = (src - cs).T @ (dst - cd)
    U, _, Vt = np.linalg.svd(H)
    d = np.sign(np.linalg.det(Vt.T @ U.T))
    R = Vt.T @ np.diag([1, 1, d]) @ U.T
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = cd - R @ cs
    res = np.linalg.norm((src @ R.T + M[:3, 3]) - dst, axis=1)
    return M, float(res.mean()), float(res.max())


def patch_mask(poly):
    a = poly.GetPointData().GetArray(PATCH_ARRAY)
    if a is None:
        return None
    return np.array([a.GetTuple1(i) for i in range(poly.GetNumberOfPoints())]) > 0.5


def sub_surface(poly, mask, budget):
    """Le patch seul, comme surface : c'est ce que l'ICP voit."""
    keep = vtk.vtkIdTypeArray()
    keep.SetNumberOfComponents(1)
    sel = vtk.vtkPolyData()
    sel.DeepCopy(poly)
    arr = vtk.vtkFloatArray()
    arr.SetName("_keep")
    arr.SetNumberOfValues(poly.GetNumberOfPoints())
    for i in range(poly.GetNumberOfPoints()):
        arr.SetValue(i, 1.0 if mask[i] else 0.0)
    sel.GetPointData().AddArray(arr)
    thr = vtk.vtkThreshold()
    thr.SetInputData(sel)
    thr.SetInputArrayToProcess(0, 0, 0, vtk.vtkDataObject.FIELD_ASSOCIATION_POINTS, "_keep")
    thr.SetLowerThreshold(0.5)
    thr.SetUpperThreshold(1.5)
    thr.AllScalarsOff()
    thr.Update()
    g = vtk.vtkGeometryFilter()
    g.SetInputConnection(thr.GetOutputPort())
    g.Update()
    return webmesh.smooth_decimate(g.GetOutput(), budget, iterations=6)


def gap(moving, fixed, M, mask):
    """Distance moyenne des sommets du patch a la surface du T1."""
    loc = vtk.vtkPointLocator()
    loc.SetDataSet(fixed)
    loc.BuildLocator()
    pts = points(moving)
    idx = np.where(mask)[0]
    step = max(1, len(idx) // 3000)
    tot, cnt = 0.0, 0
    for i in idx[::step]:
        p = pts[i]
        q = (M[:3, :3] @ p + M[:3, 3]) if M is not None else p
        j = loc.FindClosestPoint(q.tolist())
        tot += float(np.linalg.norm(np.array(fixed.GetPoint(j)) - q))
        cnt += 1
    return (tot / cnt) if cnt else float("nan")


def main():
    for f in (T1, T2, T2REG, T1REG):
        if not os.path.exists(f):
            sys.exit("Fichier absent :\n  %s\nC'est le bouton « Test Files » d'AREG." % f)

    t1, t2, t2r, t1r = read(T1), read(T2), read(T2REG), read(T1REG)

    print("— la transformation, retrouvee sur les sommets —")
    p2, p2r = points(t2), points(t2r)
    if len(p2) != len(p2r):
        sys.exit("T2 et T2 recale n'ont pas le meme nombre de sommets.")
    M, mres, mmax = kabsch(p2, p2r)
    ang = np.degrees(np.arccos(max(-1, min(1, (np.trace(M[:3, :3]) - 1) / 2))))
    print("  rotation %.3f deg, translation %.3f mm" % (ang, np.linalg.norm(M[:3, 3])))
    print("  residu de la reconstruction : %.2e mm en moyenne, %.2e au pire"
          % (mres, mmax))
    if mres > 1e-3:
        print("  ATTENTION : residu non negligeable, le recalage n'etait pas rigide")

    # Le T1 bouge-t-il ? La fiche dit que c'est le T2 qu'on amene sur le T1.
    d1 = float(np.abs(points(t1) - points(t1r)).max())
    print("  le T1 a bouge de %.2e mm (0 attendu : c'est la reference)" % d1)

    print("\n— le patch —")
    m2 = patch_mask(t2r)
    m1 = patch_mask(t1r)
    if m2 is None or m1 is None:
        sys.exit("Tableau %s absent des fichiers recales." % PATCH_ARRAY)
    print("  %s : %d sommets sur %d au T1, %d sur %d au T2"
          % (PATCH_ARRAY, int(m1.sum()), len(m1), int(m2.sum()), len(m2)))

    g0 = gap(t2, t1, None, m2)
    g1 = gap(t2, t1, M, m2)
    print("  ecart moyen sur le patch : %.2f -> %.2f mm" % (g0, g1))

    print("\n— maillages —")
    meshes = {
        "T1": webmesh.smooth_decimate(t1, 22000, iterations=8),
        "T2": webmesh.smooth_decimate(t2, 22000, iterations=8),
        "P1": sub_surface(t1r, m1, 6000),
        "P2": sub_surface(t2, m2, 6000),
    }

    lo = [1e30] * 3
    hi = [-1e30] * 3
    for poly in meshes.values():
        b = poly.GetBounds()
        for k in range(3):
            lo[k] = min(lo[k], b[k * 2])
            hi[k] = max(hi[k], b[k * 2 + 1])
    span = max(hi[k] - lo[k] for k in range(3)) or 1.0
    centre = np.array([(hi[k] + lo[k]) / 2.0 for k in range(3)])
    R, t = M[:3, :3], M[:3, 3]
    sm = np.eye(4)
    sm[:3, :3] = R
    sm[:3, 3] = (R @ centre + t - centre) / span

    # Cadrer sur le patch mettrait la camera a l'interieur de l'arcade :
    # il fait le huitieme du maillage. On cadre sur l'arcade.
    payload = webmesh.encode(meshes, focus_on=["T1"], extra={
        "matrix": [round(float(x), 7) for x in sm.T.reshape(16)],
        "deg": round(float(ang), 2), "mm": round(float(np.linalg.norm(t)), 2),
        "before": round(g0, 2), "after": round(g1, 2),
        "patch": PATCH_ARRAY,
        "patchPts": int(m2.sum()), "totalPts": int(len(m2)),
    })
    webmesh.write(os.path.join(ROOT, "assets", "areg-ios-mesh.js"), "AREG_IOS_SCENE",
                  payload,
                  "Genere par areg_ios_mesh.py. Jeu de test publie. La transformation "
                  "est retrouvee par Kabsch sur les sommets apparies, pas lue.")


if __name__ == "__main__":
    main()
