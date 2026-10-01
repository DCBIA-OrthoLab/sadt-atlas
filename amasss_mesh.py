#!/usr/bin/env python3
"""Fabrique la géométrie 3D des structures AMASSS pour le visualiseur du site.

    /opt/SlicerProd/Slicer-*/bin/PythonSlicer amasss_mesh.py

Demande le Python de Slicer : VTK et SimpleITK ne sont pas dans le Python
système. Rien d'autre n'en a besoin — ce script ne tourne qu'à la main, quand
la segmentation source change, et non à chaque `build.py`.

ENTRÉE   la prédiction AMASSS sur le scan de test **publié** (release GitHub
         AMASSS_CBCT v1.0.1), telle que le bouton « Test Files » la télécharge.
         Aucune donnée patient : la géométrie part dans un dépôt distant.
SORTIE   assets/amasss-mesh.js — chargé par <script>, et non par fetch(),
         parce que fetch() est bloqué en file:// et que le site doit s'ouvrir
         sans serveur. Même parti pris que search-index-*.js.

Le maillage est quantifié : positions en uint16 sur la boîte englobante
commune aux cinq structures (commune, sinon elles ne seraient plus alignées),
normales en int8, indices en uint16.
"""
import base64, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import webmesh

try:
    import vtk
except ImportError:
    sys.exit("VTK introuvable — lance ce script avec PythonSlicer, pas python3.")

ROOT = os.path.dirname(os.path.abspath(__file__))

BASE = webmesh.data("SlicerDownloads/AMASSS/Test_Files/MG_test_scan/")
SRC = os.path.join(BASE, "MG_test_scan_Pred_MERGED.nii.gz")

#: Le scan AVANT segmentation, pour l'animation « brut -> segmenté ». C'est le
#: même volume, même grille, même repère : les deux surfaces se superposent
#: sans recalage. Un simple seuil osseux — ce que n'importe qui obtient sans
#: réseau — donne un bloc unique et anonyme. Tout l'intérêt de la comparaison
#: est là : AMASSS ne fait pas apparaître de la matière, il la NOMME et la
#: sépare.
RAW = os.path.join(BASE, "MG_test_scan.nii.gz")
RAW_THRESHOLD = 600.0      # unités du scan ; l'os émerge vers 400-700
RAW_SIGMA = 1.5            # voxels ; débruite AVANT le marching cubes
RAW_TARGET = 46000         # le budget sert enfin à l'os, plus au bruit

# label -> (code, nombre de triangles visé)
# SKIN (6) est écarté : c'est la surface du visage, biométrique, et sans
# intérêt à cliquer. Les masques de recalage (7, 8, 9) ne sont pas de
# l'anatomie. LABELS["LARGE"] dans AMASSS_CLI.py:43 fait foi pour les codes.
PARTS = {
    1: ("MAND", 14000),
    2: ("CB",   18000),
    3: ("UAW",  10000),
    4: ("MAX",  14000),
    5: ("CV",   12000),
}


def extract(reader, label, target_tris):
    """Marching cubes -> lissage -> décimation vers un budget de triangles."""
    mc = vtk.vtkDiscreteMarchingCubes()
    mc.SetInputConnection(reader.GetOutputPort())
    mc.SetValue(0, label)
    mc.Update()
    raw = mc.GetOutput().GetNumberOfPolys()
    if raw == 0:
        return None, 0, 0, 0

    # Le réseau laisse des éclats isolés de quelques voxels. On garde toutes
    # les composantes connexes au-dessus d'un seuil relatif, et non la plus
    # grosse : les vertèbres cervicales sont plusieurs pièces séparées, et
    # « la plus grosse » en effacerait cinq sur six.
    cc = vtk.vtkPolyDataConnectivityFilter()
    cc.SetInputConnection(mc.GetOutputPort())
    cc.SetExtractionModeToAllRegions()
    cc.ColorRegionsOn()
    cc.Update()
    sizes = cc.GetRegionSizes()
    biggest = max(sizes.GetValue(i) for i in range(sizes.GetNumberOfTuples()))
    keep = [i for i in range(sizes.GetNumberOfTuples())
            if sizes.GetValue(i) >= biggest * 0.02]
    cc.SetExtractionModeToSpecifiedRegions()
    cc.InitializeSpecifiedRegionList()
    for i in keep:
        cc.AddSpecifiedRegion(i)
    cc.Update()
    dropped = sizes.GetNumberOfTuples() - len(keep)

    sm = vtk.vtkWindowedSincPolyDataFilter()
    sm.SetInputConnection(cc.GetOutputPort())
    sm.SetNumberOfIterations(24)
    sm.SetPassBand(.05)
    sm.NonManifoldSmoothingOn()
    sm.NormalizeCoordinatesOn()
    sm.Update()

    # La décimation se pilote en taux de réduction, pas en nombre de cibles —
    # et le taux doit se calculer sur ce qui entre vraiment dans le filtre,
    # c'est-à-dire APRÈS le retrait des éclats, sinon le budget annoncé n'est
    # pas celui qu'on obtient.
    kept_in = sm.GetOutput().GetNumberOfPolys() or raw
    reduction = max(0.0, min(0.999, 1.0 - target_tris / float(kept_in)))
    de = vtk.vtkQuadricDecimation()
    de.SetInputConnection(sm.GetOutputPort())
    de.SetTargetReduction(reduction)
    de.Update()

    nr = vtk.vtkPolyDataNormals()
    nr.SetInputConnection(de.GetOutputPort())
    nr.SplittingOff()          # pas de sommets dupliqués : on veut du lisse
    nr.ConsistencyOn()
    nr.ComputePointNormalsOn()
    nr.Update()

    tri = vtk.vtkTriangleFilter()
    tri.SetInputConnection(nr.GetOutputPort())
    tri.Update()
    out = tri.GetOutput()
    return out, raw, out.GetNumberOfPolys(), dropped


def extract_raw(reader, target_tris):
    """Isosurface continue du scan brut : le « avant ». Marching cubes
    classique et non discret — on seuille des niveaux de gris, pas des
    étiquettes."""
    iso = webmesh.iso_surface(reader, RAW_THRESHOLD, RAW_SIGMA)
    mc = vtk.vtkTrivialProducer()
    mc.SetOutput(iso)
    raw = iso.GetNumberOfPolys()

    # Un CBCT seuillé est constellé de mouchetures d'air et de bruit. Le seuil
    # est plus sévère qu'ailleurs : on ne garde que les gros blocs.
    cc = vtk.vtkPolyDataConnectivityFilter()
    cc.SetInputConnection(mc.GetOutputPort())
    cc.SetExtractionModeToAllRegions()
    cc.Update()
    sizes = cc.GetRegionSizes()
    biggest = max(sizes.GetValue(i) for i in range(sizes.GetNumberOfTuples()))
    keep = [i for i in range(sizes.GetNumberOfTuples())
            if sizes.GetValue(i) >= biggest * 0.01]
    cc.SetExtractionModeToSpecifiedRegions()
    cc.InitializeSpecifiedRegionList()
    for i in keep:
        cc.AddSpecifiedRegion(i)
    cc.Update()
    dropped = sizes.GetNumberOfTuples() - len(keep)

    sm = vtk.vtkWindowedSincPolyDataFilter()
    sm.SetInputConnection(cc.GetOutputPort())
    sm.SetNumberOfIterations(18)
    sm.SetPassBand(.06)
    sm.NonManifoldSmoothingOn()
    sm.NormalizeCoordinatesOn()
    sm.Update()

    kept_in = sm.GetOutput().GetNumberOfPolys() or raw
    de = vtk.vtkQuadricDecimation()
    de.SetInputConnection(sm.GetOutputPort())
    de.SetTargetReduction(max(0.0, min(0.999, 1.0 - target_tris / float(kept_in))))
    de.Update()

    nr = vtk.vtkPolyDataNormals()
    nr.SetInputConnection(de.GetOutputPort())
    nr.SplittingOff(); nr.ConsistencyOn(); nr.ComputePointNormalsOn()
    nr.Update()
    tri = vtk.vtkTriangleFilter()
    tri.SetInputConnection(nr.GetOutputPort())
    tri.Update()
    return tri.GetOutput(), raw, tri.GetOutput().GetNumberOfPolys(), dropped


def main():
    if not os.path.exists(SRC):
        sys.exit("Segmentation source introuvable :\n  %s\n"
                 "C'est la sortie du bouton « Test Files » d'AMASSS." % SRC)

    reader = vtk.vtkNIFTIImageReader()
    reader.SetFileName(SRC)
    reader.Update()

    meshes = {}
    for label, (code, target) in sorted(PARTS.items()):
        poly, raw, kept, dropped = extract(reader, label, target)
        if poly is None:
            print("  %-5s absent de la segmentation — ignoré" % code)
            continue
        meshes[code] = poly
        print("  %-5s %8d triangles bruts -> %6d  (%d eclats ecartes)"
              % (code, raw, kept, dropped))

    if not meshes:
        sys.exit("Aucune structure extraite.")

    anatomy = list(meshes.keys())      # avant d'ajouter le brut

    if os.path.exists(RAW):
        rr = vtk.vtkNIFTIImageReader()
        rr.SetFileName(RAW)
        rr.Update()
        poly, raw, kept, dropped = extract_raw(rr, RAW_TARGET)
        meshes["RAW"] = poly
        print("  %-5s %8d triangles bruts -> %6d  (%d eclats ecartes)"
              % ("RAW", raw, kept, dropped))
    else:
        print("  scan brut absent : l'animation « brut -> segmente » sera inactive")

    # Boîte englobante COMMUNE : quantifier chaque pièce sur la sienne les
    # désalignerait. On calcule l'union, puis tout le monde s'y rapporte.
    lo = [1e30] * 3
    hi = [-1e30] * 3
    for poly in meshes.values():
        b = poly.GetBounds()          # (xmin,xmax, ymin,ymax, zmin,zmax)
        for ax in range(3):
            lo[ax] = min(lo[ax], b[ax * 2])
            hi[ax] = max(hi[ax], b[ax * 2 + 1])
    span = max(hi[ax] - lo[ax] for ax in range(3)) or 1.0
    centre = [(hi[ax] + lo[ax]) / 2.0 for ax in range(3)]

    parts = {}
    for code, poly in meshes.items():
        pts, nrm = poly.GetPoints(), poly.GetPointData().GetNormals()
        n = poly.GetNumberOfPoints()
        if n >= 65536:
            sys.exit("%s : %d sommets, au-delà des indices 16 bits. "
                     "Baisse son budget de triangles." % (code, n))

        pos = bytearray()
        nor = bytearray()
        for i in range(n):
            x, y, z = pts.GetPoint(i)
            # normalisé dans [-0.5, 0.5] sur l'échelle commune, puis uint16
            for v, c in ((x, 0), (y, 1), (z, 2)):
                q = int(round(((v - centre[c]) / span + 0.5) * 65535.0))
                q = 0 if q < 0 else (65535 if q > 65535 else q)
                pos += q.to_bytes(2, "little")
            nx, ny, nz = nrm.GetTuple3(i) if nrm else (0.0, 0.0, 1.0)
            for v in (nx, ny, nz):
                q = int(round(max(-1.0, min(1.0, v)) * 127.0))
                nor += (q & 0xFF).to_bytes(1, "little")

        idx = bytearray()
        ids = vtk.vtkIdList()
        polys = poly.GetPolys()
        polys.InitTraversal()
        ntri = 0
        while polys.GetNextCell(ids):
            if ids.GetNumberOfIds() != 3:
                continue
            for k in range(3):
                idx += int(ids.GetId(k)).to_bytes(2, "little")
            ntri += 1

        # Centre et rayon dans le repère du shader ([-0.5, 0.5] après le
        # « aPos - 0.5 »). Calculés ici plutôt que redécodés en JS : le
        # navigateur n'a pas à reparcourir 7 000 sommets pour viser une pièce.
        b = poly.GetBounds()
        cen = [((b[k * 2] + b[k * 2 + 1]) / 2.0 - centre[k]) / span
               for k in range(3)]
        # DEMI-étendues, par axe. Émettre une dimension pleine et la consommer
        # comme un rayon plaçait la caméra deux fois trop loin ; n'en garder
        # qu'une pour les trois axes gonflait le cadrage d'ensemble.
        ext = [(b[k * 2 + 1] - b[k * 2]) / 2.0 / span for k in range(3)]
        rad = max(ext)

        parts[code] = {
            "pos": base64.b64encode(bytes(pos)).decode(),
            "nrm": base64.b64encode(bytes(nor)).decode(),
            "idx": base64.b64encode(bytes(idx)).decode(),
            "verts": n, "tris": ntri,
            "c": [round(v, 5) for v in cen],
            "e": [round(v, 5) for v in ext],
            "r": round(rad, 5),
        }
        print("  %-5s %5d sommets, %5d triangles, %6.0f Ko encodés"
              % (code, n, ntri, (len(pos) + len(nor) + len(idx)) * 4 / 3 / 1024))

    # Le scan brut déborde largement l'anatomie segmentée : si la caméra se
    # cadrait sur l'union, les structures seraient minuscules. On transmet donc
    # le cadrage de l'anatomie seule, et le visualiseur s'en sert au repos.
    flo = [1e30] * 3
    fhi = [-1e30] * 3
    for code in anatomy:
        c, e = parts[code]["c"], parts[code]["e"]
        for k in range(3):
            flo[k] = min(flo[k], c[k] - e[k])
            fhi[k] = max(fhi[k], c[k] + e[k])
    focus = {"c": [round((flo[k] + fhi[k]) / 2, 5) for k in range(3)],
             "r": round(max(fhi[k] - flo[k] for k in range(3)) / 2.0, 5)}

    # --vtk <dossier> : écrire aussi les surfaces telles quelles, pour les
    # ouvrir dans Slicer et vérifier à la main ce que le site affiche. Ce ne
    # sont pas les fichiers du site — le site ne lit que le .js — mais
    # exactement la même géométrie, avant quantification.
    if "--vtk" in sys.argv:
        dest = sys.argv[sys.argv.index("--vtk") + 1]
        os.makedirs(dest, exist_ok=True)
        for code, poly in meshes.items():
            w = vtk.vtkPolyDataWriter()
            w.SetFileName(os.path.join(dest, "MG_test_scan_%s.vtk" % code))
            w.SetInputData(poly)
            w.SetFileTypeToBinary()
            w.Write()
        print("\nsurfaces ecrites dans %s" % dest)

    payload = {"span": span, "focus": focus, "anatomy": anatomy, "parts": parts}
    out = os.path.join(ROOT, "assets", "amasss-mesh.js")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("/* Généré par amasss_mesh.py — ne pas éditer à la main.\n"
                 "   Source : prédiction AMASSS sur le scan de test publié\n"
                 "   (AMASSS_CBCT v1.0.1, MG_test_scan). Aucune donnée patient.\n"
                 "   Chargé par <script> et non par fetch() : le site doit\n"
                 "   s'ouvrir en file://. */\n")
        fh.write("window.AMASSS_MESH = ")
        json.dump(payload, fh, separators=(",", ":"))
        fh.write(";\n")
    print("\n%s — %.0f Ko" % (out, os.path.getsize(out) / 1024))


if __name__ == "__main__":
    main()
