#!/usr/bin/env python3
"""Fabrique la scene 3D d'ALI pour le site : le CBCT et l'arcade IOS.

    /opt/SlicerProd/Slicer-5.13.0-2026-08-03-linux-amd64/bin/PythonSlicer ali_mesh.py

Demande le Python de Slicer (VTK). Deux scenes, deux moteurs sans code commun
-- c'est la structure qu'ALI impose, pas un choix de presentation.

CBCT   le crane du scan de test PUBLIE, plus les TRAJECTOIRES REELLES des
       agents, relevees par ali_trace.py depuis `position_mem`. Ce n'est pas
       une animation vraisemblable : c'est le chemin que le reseau a parcouru.
IOS    une arcade de test PUBLIEE (ASO_IOS), decoupee dent par dent d'apres
       son tableau `PredictedID` -- c'est ce tableau qui donne le centroide de
       chaque dent, et donc la position des cameras d'ALI_IOS.

Aucune donnee patient dans aucune des deux.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import webmesh
import vtk

ROOT = os.path.dirname(os.path.abspath(__file__))
MESHES = os.path.expanduser("~/Documents/sadt-atlas-meshes")
TRACE = os.path.join(ROOT, "assets", "ali-trace.json")
ARCH = os.path.expanduser(
    "~/Documents/SlicerDownloads/ASO/ASO_IOS/Test_Files/Fully-AutomatedOr/"
    "Lower_new_30_SegOr.vtk")

# Le crane sert de contexte : on le veut leger et translucide, l'agent marche
# DEDANS. Pas la peine d'y remettre les cinq structures d'AMASSS.
# Proche du budget deja applique en amont : redecimer un maillage deja
# reduit cumule deux pertes et donne cet aspect dechire.
CBCT_PARTS = {"RAW": 42000, "CB": 15000}


def read_vtk(path):
    r = vtk.vtkPolyDataReader()
    r.SetFileName(path)
    r.ReadAllScalarsOn()
    r.Update()
    return r.GetOutput()


def bounds_of(meshes):
    lo = [1e30] * 3
    hi = [-1e30] * 3
    for poly in meshes.values():
        b = poly.GetBounds()
        for k in range(3):
            lo[k] = min(lo[k], b[k * 2])
            hi[k] = max(hi[k], b[k * 2 + 1])
    span = max(hi[k] - lo[k] for k in range(3)) or 1.0
    centre = [(hi[k] + lo[k]) / 2.0 for k in range(3)]
    return centre, span


def build_cbct():
    meshes = {}
    for code, budget in CBCT_PARTS.items():
        f = os.path.join(MESHES, "MG_test_scan_%s.vtk" % code)
        if not os.path.exists(f):
            sys.exit("Maillage absent : %s\nLance d'abord amasss_mesh.py --vtk %s"
                     % (f, MESHES))
        poly = read_vtk(f)
        # Deja lisse et decime par amasss_mesh.py : on ne relisse pas, on
        # ajuste seulement si le budget demande est plus bas.
        if poly.GetNumberOfPolys() > budget * 1.08:
            poly = webmesh.smooth_decimate(poly, budget, iterations=6)
        meshes[code] = poly

    centre, span = bounds_of(meshes)

    if not os.path.exists(TRACE):
        sys.exit("Trajectoires absentes : %s\nLance d'abord ali_trace.py." % TRACE)
    trace = json.load(open(TRACE, encoding="utf-8"))

    def to_scene(idx, spacing):
        """Indice de l'agent -> repere du shader.

        Le tableau est en ordre numpy (z,y,x) et le maillage est lu en
        indice x espacement depuis le coin du volume : on remet donc dans
        l'ordre (x,y,z) avant de normaliser comme les sommets.
        """
        xyz = (idx[2] * spacing[2], idx[1] * spacing[1], idx[0] * spacing[0])
        return [round((xyz[k] - centre[k]) / span, 5) for k in range(3)]

    agents = {}
    for name, lm in trace["landmarks"].items():
        legs = []
        for leg in lm["legs"]:
            sp = leg["spacing"]
            legs.append({"scale": leg["scale"],
                         "mm": round(sp[0], 3),
                         "path": [to_scene(p, sp) for p in leg["idx"]]})
        # steps == -1 : l'agent n'a pas trouve. Budget de temps depasse, ou
        # sorti du volume trois fois. On le garde dans les donnees mais on le
        # marque : le masquer ferait croire que le module trouve toujours.
        ok = lm["steps"] is not None and lm["steps"] > 0
        agents[name] = {
            "legs": legs,
            "steps": lm["steps"],
            "ok": ok,
            "final": to_scene(lm["final_idx"], lm["legs"][-1]["spacing"]),
        }
        print("  agent %-5s : %s, %s"
              % (name, ("%d pas" % lm["steps"]) if ok else "NON TROUVE",
                 " + ".join("%d @%smm" % (len(l["path"]), l["mm"]) for l in legs)))

    payload = webmesh.encode(meshes, focus_on=["CB"], extra={
        "agents": agents,
        "movements": trace["movements"],
        "start": to_scene(trace["landmarks"][list(trace["landmarks"])[0]]
                          ["legs"][0]["idx"][0],
                          trace["landmarks"][list(trace["landmarks"])[0]]
                          ["legs"][0]["spacing"]),
    })
    webmesh.write(os.path.join(ROOT, "assets", "ali-cbct-mesh.js"),
                  "ALI_CBCT_SCENE", payload,
                  "Genere par ali_mesh.py. Crane du scan de test publie, et "
                  "trajectoires REELLES des agents relevees par ali_trace.py. "
                  "Aucune donnee patient.")


def build_ios():
    if not os.path.exists(ARCH):
        print("  arcade de test absente (%s) — scene IOS ignoree" % ARCH)
        return
    arch = read_vtk(ARCH)
    labels = arch.GetPointData().GetArray("PredictedID")
    if labels is None:
        print("  l'arcade n'a pas de tableau PredictedID — scene IOS ignoree")
        return

    # Une dent = une valeur du tableau. C'est exactement ce que lit ALI_IOS
    # (surface.py:207) pour en tirer le centroide, donc la position camera.
    present = sorted({int(labels.GetTuple1(i))
                      for i in range(arch.GetNumberOfPoints())})
    teeth = [v for v in present if 17 <= v <= 31]
    # La gencive n'est PAS le label 0 dans ce fichier : c'est 33. Le 0 n'y
    # couvre qu'une seule cellule. On releve donc le plus gros label hors
    # dents plutot que de supposer une convention.
    others = [v for v in present if v not in teeth]
    gum = max(others, key=lambda v: sum(
        1 for i in range(arch.GetNumberOfPoints())
        if int(labels.GetTuple1(i)) == v)) if others else None
    meshes, centroids = {}, {}
    for lab in ([gum] if gum is not None else []) + teeth:
        thr = vtk.vtkThreshold()
        thr.SetInputData(arch)
        thr.SetInputArrayToProcess(0, 0, 0,
                                   vtk.vtkDataObject.FIELD_ASSOCIATION_POINTS,
                                   "PredictedID")
        thr.SetLowerThreshold(lab - 0.5)
        thr.SetUpperThreshold(lab + 0.5)
        thr.Update()
        surf = vtk.vtkGeometryFilter()
        surf.SetInputConnection(thr.GetOutputPort())
        surf.Update()
        poly = surf.GetOutput()
        if poly.GetNumberOfPolys() < 40:
            continue
        budget = 11000 if lab == gum else 1600
        code = "GUM" if lab == gum else "T%d" % lab
        meshes[code] = webmesh.smooth_decimate(poly, budget, iterations=12)
        b = meshes[code].GetBounds()
        centroids[code] = [(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2]

    centre, span = bounds_of(meshes)
    cams = {c: [round((centroids[c][k] - centre[k]) / span, 5) for k in range(3)]
            for c in centroids}
    payload = webmesh.encode(meshes, focus_on=list(meshes.keys()), extra={
        "teeth": [c for c in meshes if c != "GUM"],
        "centroids": cams,
    })
    webmesh.write(os.path.join(ROOT, "assets", "ali-ios-mesh.js"),
                  "ALI_IOS_SCENE", payload,
                  "Genere par ali_mesh.py. Arcade de test publiee (ASO_IOS), "
                  "decoupee par son tableau PredictedID. Aucune donnee patient.")


if __name__ == "__main__":
    print("— scene CBCT —")
    build_cbct()
    print("\n— scene IOS —")
    build_ios()
