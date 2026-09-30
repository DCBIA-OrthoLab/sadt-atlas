#!/usr/bin/env python3
"""Fabrique la scene 3D d'AREG_IOSCBCT : une arcade intra-orale sur un CBCT.

    /opt/SlicerProd/Slicer-5.13.0-*/bin/PythonSlicer aregios_mesh.py

ENTREE  le jeu de test PUBLIE. Aucune donnee clinique.

CE QUE LA SCENE MONTRE. Deux modalites qui n'ont rien en commun : un volume
et une surface. La fiche resume l'appariement -- « shared landmarks for the
pre-alignment, then ICP onto a surface extracted from the CBCT by
thresholding ». Les points partages sont les 6 points occlusaux par arcade
qu'ALI place des DEUX cotes, et ils sont apparies PAR ETIQUETTE, jamais par
position.

LE PRE-ALIGNEMENT EST RECALCULE ICI, pas lu dans un fichier : on refait ce
que fait `align_by_landmarks()` -- un vtkLandmarkTransform en RigidBody, IOS
source, CBCT cible -- ce qui permet de verifier les deux garde-fous du code
(au moins 3 paires, residu RMS sous 10 mm) sur de vraies valeurs.

SEUIL. La surface CBCT sort a 400, en dur dans le code
(`contour(isosurfaces=[400])`), et non a la valeur qu'on choisirait. On garde
la sienne : la scene doit montrer ce que l'algorithme voit.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import webmesh
import numpy as np
import SimpleITK as sitk
import vtk

ROOT = os.path.dirname(os.path.abspath(__file__))
B = os.path.expanduser("~/Documents/SlicerDownloads/AREG/AREG_IOSCBCT/Test_Files/"
                       "Fully-Automated-Registration/Registered/")

CBCT = B + "Oriented CBCT/P_0001_T2_Or.nii.gz"
IOS = {"L": B + "PRE ASO IOS/P001_T2_L_SegOr.vtk",
       "U": B + "PRE ASO IOS/P001_T2_U_SegOr.vtk"}
LM_CBCT = {"L": B + "CBCT Landmarks/P_0001_T2_Or_lm_Pred_L.mrk.json",
           "U": B + "CBCT Landmarks/P_0001_T2_Or_lm_Pred_U.mrk.json"}
LM_IOS = {"L": B + "IOS Landmarks/P001_T2_L_SegOr_Lower_O_Pred.json",
          "U": B + "IOS Landmarks/P001_T2_U_SegOr_Upper_O_Pred.json"}

ISO = 400.0            # en dur dans AREG_IOSCBCT.py:315
MIN_PAIRS = 3          # MIN_LANDMARK_PAIRS
MAX_RESIDUAL = 10.0    # MAX_LANDMARK_RESIDUAL_MM


def landmarks(path):
    d = json.load(open(path, encoding="utf-8"))["markups"][0]
    return {c["label"]: np.array(c["position"], dtype=float)
            for c in d["controlPoints"]}


def pair(ios, cbct):
    """_pair_landmarks : seules les etiquettes presentes DES DEUX COTES, dans
    l'ordre de l'IOS. Apparier par position au lieu du nom associerait des
    points qui n'ont rien a voir."""
    keys = [k for k in ios if k in cbct]
    missing = [k for k in ios if k not in cbct]
    return keys, missing


def landmark_transform(ios, cbct, keys):
    """align_by_landmarks : vtkLandmarkTransform en RigidBody, IOS source."""
    src, dst = vtk.vtkPoints(), vtk.vtkPoints()
    for k in keys:
        src.InsertNextPoint(*ios[k])
        dst.InsertNextPoint(*cbct[k])
    lt = vtk.vtkLandmarkTransform()
    lt.SetSourceLandmarks(src)
    lt.SetTargetLandmarks(dst)
    lt.SetModeToRigidBody()
    lt.Update()
    m = lt.GetMatrix()
    return np.array([[m.GetElement(i, j) for j in range(4)] for i in range(4)])


def residual(M, ios, cbct, keys):
    """_alignment_residual : RMS apres application de la matrice."""
    d = [np.linalg.norm((M[:3, :3] @ ios[k] + M[:3, 3]) - cbct[k]) for k in keys]
    return float(np.sqrt(np.mean(np.square(d))))


def cbct_surface(path, budget):
    """La surface que voit l'algorithme : marching cubes a 400, puis retour
    en LPS physique. On passe par l'origine du volume, comme le fait
    `ijk_to_lps` dans le code."""
    im = sitk.ReadImage(path)
    origin = im.GetOrigin()
    r = vtk.vtkNIFTIImageReader()
    r.SetFileName(path)
    r.Update()
    iso = webmesh.iso_surface(r, ISO, 1.2)
    clean, _ = webmesh.clean(iso, 0.02)
    poly = webmesh.smooth_decimate(clean, budget, iterations=14)
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


def read_vtk(path, budget):
    r = vtk.vtkPolyDataReader()
    r.SetFileName(path)
    r.ReadAllScalarsOn()
    r.Update()
    return webmesh.smooth_decimate(r.GetOutput(), budget, iterations=8)


def main():
    for f in [CBCT] + list(IOS.values()):
        if not os.path.exists(f):
            sys.exit("Fichier absent :\n  %s\nC'est le bouton « Test Files » d'AREG_IOSCBCT." % f)

    print("— surfaces —")
    meshes = {"CBCT": cbct_surface(CBCT, 34000)}
    print("  CBCT  %6d triangles (seuil %d, celui du code)"
          % (meshes["CBCT"].GetNumberOfPolys(), ISO))
    for k, p in IOS.items():
        meshes["IOS_" + k] = read_vtk(p, 16000)
        print("  IOS %s %6d triangles" % (k, meshes["IOS_" + k].GetNumberOfPolys()))

    print("\n— appariement et pre-alignement —")
    arches = {}
    for k in ("L", "U"):
        ios, cb = landmarks(LM_IOS[k]), landmarks(LM_CBCT[k])
        keys, missing = pair(ios, cb)
        M = landmark_transform(ios, cb, keys)
        r0 = residual(np.eye(4), ios, cb, keys)
        r1 = residual(M, ios, cb, keys)
        ok = len(keys) >= MIN_PAIRS and r1 <= MAX_RESIDUAL
        print("  %s : %d paires%s | RMS %6.2f -> %6.2f mm | garde-fous %s"
              % (k, len(keys),
                 (" (%d absentes du CBCT : %s)" % (len(missing), ",".join(missing)))
                 if missing else "",
                 r0, r1, "OK" if ok else "REFUS -> identite"))
        arches[k] = {"keys": keys, "M": M, "ios": ios, "cbct": cb,
                     "before": round(r0, 2), "after": round(r1, 2), "ok": ok}

    lo = [1e30] * 3
    hi = [-1e30] * 3
    for poly in meshes.values():
        b = poly.GetBounds()
        for i in range(3):
            lo[i] = min(lo[i], b[i * 2])
            hi[i] = max(hi[i], b[i * 2 + 1])
    span = max(hi[i] - lo[i] for i in range(3)) or 1.0
    centre = np.array([(hi[i] + lo[i]) / 2.0 for i in range(3)])
    pt = lambda v: [round(float((v[i] - centre[i]) / span), 5) for i in range(3)]

    def to_scene(M):
        R, t = M[:3, :3], M[:3, 3]
        out = np.eye(4)
        out[:3, :3] = R
        out[:3, 3] = (R @ centre + t - centre) / span
        return [round(float(x), 7) for x in out.T.reshape(16)]

    payload = webmesh.encode(meshes, focus_on=["IOS_L", "IOS_U"], extra={
        "iso": ISO, "minPairs": MIN_PAIRS, "maxResidual": MAX_RESIDUAL,
        "arches": [{"code": k, "m": to_scene(arches[k]["M"]),
                    "keys": arches[k]["keys"],
                    "before": arches[k]["before"], "after": arches[k]["after"],
                    "ok": arches[k]["ok"],
                    "ios": {n: pt(arches[k]["ios"][n]) for n in arches[k]["keys"]},
                    "cbct": {n: pt(arches[k]["cbct"][n]) for n in arches[k]["keys"]}}
                   for k in ("L", "U")],
    })
    webmesh.write(os.path.join(ROOT, "assets", "aregios-mesh.js"), "AREGIOS_SCENE",
                  payload,
                  "Genere par aregios_mesh.py. Jeu de test publie. Le pre-alignement "
                  "est RECALCULE avec vtkLandmarkTransform, comme le fait le code.")


if __name__ == "__main__":
    main()
