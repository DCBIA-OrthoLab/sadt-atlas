#!/usr/bin/env python3
"""Encodage de maillages VTK pour les visualiseurs 3D du site.

Partagé par amasss_mesh.py et ali_mesh.py : la quantification, la boîte
commune et le format du fichier .js ne doivent exister qu'une fois.

Le résultat est un `.js` chargé par <script>, jamais par fetch() : fetch est
bloqué en file:// et le site doit s'ouvrir sans serveur. Même parti pris que
search-index-*.js.

Format, par pièce :
    pos   uint16  x,y,z normalisés sur la boîte COMMUNE à toutes les pièces
                  (commune, sinon elles ne seraient plus alignées entre elles)
    nrm   int8    normale par sommet
    idx   uint16  indices de triangles
    c     centre  et  e  demi-étendues par axe, dans le repère du shader
                  ([-0.5, 0.5] après le « aPos - 0.5 »). Des DEMI-étendues :
                  émettre une dimension pleine et la consommer comme un rayon
                  place la caméra deux fois trop loin.
"""
import base64, json, os, sys

try:
    import vtk
except ImportError:                                            # pragma: no cover
    sys.exit("VTK introuvable — lance ce script avec PythonSlicer, pas python3.")


def clean(poly, keep_ratio=0.02):
    """Retire les composantes connexes minuscules.

    Un seuil relatif, jamais « la plus grosse » : les vertèbres cervicales ou
    les dents d'une arcade sont plusieurs pièces séparées, et n'en garder
    qu'une les effacerait presque toutes.
    """
    cc = vtk.vtkPolyDataConnectivityFilter()
    cc.SetInputData(poly)
    cc.SetExtractionModeToAllRegions()
    cc.Update()
    sizes = cc.GetRegionSizes()
    n = sizes.GetNumberOfTuples()
    if n <= 1:
        return poly, 0
    biggest = max(sizes.GetValue(i) for i in range(n))
    keep = [i for i in range(n) if sizes.GetValue(i) >= biggest * keep_ratio]
    cc.SetExtractionModeToSpecifiedRegions()
    cc.InitializeSpecifiedRegionList()
    for i in keep:
        cc.AddSpecifiedRegion(i)
    cc.Update()
    out = vtk.vtkPolyData()
    out.DeepCopy(cc.GetOutput())
    return out, n - len(keep)


def smooth_decimate(poly, target_tris, iterations=24, pass_band=.05):
    """Lisse puis décime vers un budget de triangles.

    Le taux se calcule sur ce qui entre VRAIMENT dans le décimateur, donc
    après lissage — sinon le budget annoncé n'est pas celui qu'on obtient.
    """
    sm = vtk.vtkWindowedSincPolyDataFilter()
    sm.SetInputData(poly)
    sm.SetNumberOfIterations(iterations)
    sm.SetPassBand(pass_band)
    sm.NonManifoldSmoothingOn()
    sm.NormalizeCoordinatesOn()
    sm.Update()

    have = sm.GetOutput().GetNumberOfPolys() or 1
    de = vtk.vtkQuadricDecimation()
    de.SetInputConnection(sm.GetOutputPort())
    de.SetTargetReduction(max(0.0, min(0.999, 1.0 - target_tris / float(have))))
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
    return tri.GetOutput()


def encode(meshes, extra=None, focus_on=None):
    """{code: vtkPolyData} -> dict prêt à sérialiser.

    `focus_on` : les codes sur lesquels la caméra se cadre au repos. Sans lui,
    une pièce qui déborde largement (un scan brut, une arcade entière) rendrait
    tout le reste minuscule.
    """
    lo = [1e30] * 3
    hi = [-1e30] * 3
    for poly in meshes.values():
        b = poly.GetBounds()
        for k in range(3):
            lo[k] = min(lo[k], b[k * 2])
            hi[k] = max(hi[k], b[k * 2 + 1])
    span = max(hi[k] - lo[k] for k in range(3)) or 1.0
    centre = [(hi[k] + lo[k]) / 2.0 for k in range(3)]

    parts = {}
    for code, poly in meshes.items():
        pts, nrm = poly.GetPoints(), poly.GetPointData().GetNormals()
        n = poly.GetNumberOfPoints()
        if n >= 65536:
            sys.exit("%s : %d sommets, au-dela des indices 16 bits. "
                     "Baisse son budget de triangles." % (code, n))

        pos, nor = bytearray(), bytearray()
        for i in range(n):
            x, y, z = pts.GetPoint(i)
            for v, k in ((x, 0), (y, 1), (z, 2)):
                q = int(round(((v - centre[k]) / span + 0.5) * 65535.0))
                pos += max(0, min(65535, q)).to_bytes(2, "little")
            nx, ny, nz = nrm.GetTuple3(i) if nrm else (0.0, 0.0, 1.0)
            for v in (nx, ny, nz):
                q = int(round(max(-1.0, min(1.0, v)) * 127.0))
                nor += (q & 0xFF).to_bytes(1, "little")

        idx, ids = bytearray(), vtk.vtkIdList()
        polys = poly.GetPolys()
        polys.InitTraversal()
        ntri = 0
        while polys.GetNextCell(ids):
            if ids.GetNumberOfIds() != 3:
                continue
            for k in range(3):
                idx += int(ids.GetId(k)).to_bytes(2, "little")
            ntri += 1

        b = poly.GetBounds()
        cen = [((b[k * 2] + b[k * 2 + 1]) / 2.0 - centre[k]) / span for k in range(3)]
        ext = [(b[k * 2 + 1] - b[k * 2]) / 2.0 / span for k in range(3)]

        parts[code] = {
            "pos": base64.b64encode(bytes(pos)).decode(),
            "nrm": base64.b64encode(bytes(nor)).decode(),
            "idx": base64.b64encode(bytes(idx)).decode(),
            "verts": n, "tris": ntri,
            "c": [round(v, 5) for v in cen],
            "e": [round(v, 5) for v in ext],
            "r": round(max(ext), 5),
        }
        print("  %-16s %5d sommets, %6d triangles, %6.0f Ko"
              % (code, n, ntri, (len(pos) + len(nor) + len(idx)) * 4 / 3 / 1024))

    codes = focus_on or list(parts.keys())
    flo = [1e30] * 3
    fhi = [-1e30] * 3
    for code in codes:
        c, e = parts[code]["c"], parts[code]["e"]
        for k in range(3):
            flo[k] = min(flo[k], c[k] - e[k])
            fhi[k] = max(fhi[k], c[k] + e[k])

    payload = {
        "span": span,
        "focus": {"c": [round((flo[k] + fhi[k]) / 2, 5) for k in range(3)],
                  "r": round(max(fhi[k] - flo[k] for k in range(3)) / 2.0, 5)},
        "parts": parts,
    }
    if extra:
        payload.update(extra)
    return payload


def world_to_scene(pt, payload_span, meshes):
    """Une coordonnee du MONDE VTK vers le repere du shader ([-0.5, 0.5]).

    Les reperes anatomiques et les trajectoires d'agents vivent dans le meme
    espace que les maillages : ils doivent subir exactement la meme mise a
    l'echelle, sinon ils flottent a cote de l'os.
    """
    lo = [1e30] * 3
    hi = [-1e30] * 3
    for poly in meshes.values():
        b = poly.GetBounds()
        for k in range(3):
            lo[k] = min(lo[k], b[k * 2])
            hi[k] = max(hi[k], b[k * 2 + 1])
    centre = [(hi[k] + lo[k]) / 2.0 for k in range(3)]
    return [round((pt[k] - centre[k]) / payload_span, 5) for k in range(3)]


def write(path, varname, payload, header):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("/* %s */\n" % header)
        fh.write("window.%s = " % varname)
        json.dump(payload, fh, separators=(",", ":"))
        fh.write(";\n")
    print("\n%s — %.0f Ko" % (path, os.path.getsize(path) / 1024))
