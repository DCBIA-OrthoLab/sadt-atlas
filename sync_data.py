#!/usr/bin/env python3
"""Rassemble les entrees des generateurs dans UNE arborescence.

    python3 sync_data.py                 affiche ce qui serait copie
    python3 sync_data.py --go            copie vraiment
    python3 sync_data.py --go --dest D   vers une autre racine

POURQUOI. Les huit generateurs lisent des chemins absolus eparpilles dans
sept racines sous ~/Documents : des caches de telechargement de Slicer, des
sorties de passes, un dossier de maillages. Rien ne protege ces entrees, et
le site n'est reproductible que tant qu'elles existent. Ce script les
rassemble, en conservant leur chemin RELATIF A ~/Documents -- ce qui suffit a
rendre la copie utilisable telle quelle :

    SADT_ATLAS_DATA=/media/luciacev/Data/sadt-atlas-data \\
        /opt/SlicerProd/.../bin/PythonSlicer vface_mesh.py

LE MANIFESTE N'EST PAS ECRIT A LA MAIN. Il est lu dans les generateurs : on
importe chaque module et on releve ses constantes de chemin. Une entree
ajoutee a un generateur est donc sauvegardee sans qu'on ait a y penser, et un
manifeste fige ne peut pas mentir.
"""
import importlib, os, shutil, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

HOME_DATA = os.path.expanduser("~/Documents")
DEFAULT_DEST = "/media/luciacev/Data/sadt-atlas-data"
GENERATORS = ["amasss_mesh", "ali_mesh", "aso_mesh", "areg_mesh",
              "areg_ios_mesh", "aregios_mesh", "vface_mesh", "batchdentalseg_mesh"]


def manifest():
    """{chemin relatif a ~/Documents: [generateurs qui s'en servent]}.

    On ne garde que ce qui est SOUS ~/Documents : les constantes qui pointent
    dans le depot lui-meme (ROOT, assets/) sont du code, pas des donnees.
    """
    out = {}
    for name in GENERATORS:
        try:
            mod = importlib.import_module(name)
        except Exception as exc:
            print("  !! %s : import impossible (%s) — ses entrees seront absentes"
                  % (name, type(exc).__name__))
            continue
        for key, val in vars(mod).items():
            if key.startswith("_") or not isinstance(val, str) or "/" not in val:
                continue
            p = os.path.abspath(os.path.expanduser(val))
            if not p.startswith(HOME_DATA + os.sep) or not os.path.exists(p):
                continue
            rel = os.path.relpath(p, HOME_DATA)
            out.setdefault(rel, []).append("%s.%s" % (name, key))
    # Retirer les chemins couverts par un ancetre deja retenu, sinon on copie
    # deux fois le meme arbre.
    keys = sorted(out, key=len)
    kept = {}
    for k in keys:
        if any(k.startswith(a + os.sep) for a in kept):
            continue
        kept[k] = out[k]
    return kept


def size_of(p):
    if os.path.isfile(p):
        return os.path.getsize(p), 1
    tot = n = 0
    for d, _, fs in os.walk(p):
        for f in fs:
            try:
                tot += os.path.getsize(os.path.join(d, f)); n += 1
            except OSError:
                pass
    return tot, n


def main():
    go = "--go" in sys.argv
    dest = DEFAULT_DEST
    if "--dest" in sys.argv:
        dest = sys.argv[sys.argv.index("--dest") + 1]

    man = manifest()
    if not man:
        sys.exit("Manifeste vide : aucun generateur n'a pu etre importe. "
                 "Lance ce script avec PythonSlicer, pas avec python3 nu.")

    print("\n— ce que les generateurs lisent —")
    total = files = 0
    for rel in sorted(man):
        sz, n = size_of(os.path.join(HOME_DATA, rel))
        total += sz; files += n
        print("  %-54s %6d fichiers %8.1f Mo" % (rel[:54], n, sz / 1e6))
        print("       <- %s" % ", ".join(sorted(set(man[rel]))[:3]))
    print("\n  TOTAL %d fichiers, %.2f Go" % (files, total / 1e9))

    if not go:
        print("\n  (essai a blanc — relance avec --go pour copier vers %s)" % dest)
        return

    # GARDE-FOU. Si le disque ne s'est pas monte, son point de montage est un
    # simple dossier vide sur la racine -- et la racine est a 88 %. Sans ce
    # controle, --go y deverserait 5,7 Go et remplirait le systeme. On compare
    # donc le peripherique de la destination a celui de « / » : s'ils sont
    # identiques, le disque n'est pas la.
    parent = dest
    while parent != "/" and not os.path.isdir(parent):
        parent = os.path.dirname(parent)
    if os.stat(parent).st_dev == os.stat("/").st_dev and not dest.startswith(
            os.path.expanduser("~")):
        sys.exit("%s est sur le MEME peripherique que « / » : le disque n'est pas "
                 "monte. Copier ici remplirait le systeme de fichiers racine.\n"
                 "Monte le disque (il est dans /etc/fstab) puis relance." % parent)

    free = shutil.disk_usage(parent).free
    print("\n  destination %s — %.1f Go libres" % (dest, free / 1e9))
    if free < total * 1.1:
        sys.exit("Pas assez de place : il faut %.1f Go, il en reste %.1f."
                 % (total / 1e9, free / 1e9))

    os.makedirs(dest, exist_ok=True)
    for rel in sorted(man):
        src = os.path.join(HOME_DATA, rel)
        dst = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isfile(src):
            if not (os.path.exists(dst) and os.path.getsize(dst) == os.path.getsize(src)):
                shutil.copy2(src, dst)
            print("  copie %s" % rel)
        else:
            # dirs_exist_ok : relancer le script met a jour sans tout refaire.
            shutil.copytree(src, dst, dirs_exist_ok=True)
            print("  copie %s/" % rel)

    with open(os.path.join(dest, "MANIFESTE.txt"), "w", encoding="utf-8") as f:
        f.write("Entrees des generateurs de sadt-atlas.\n")
        f.write("Genere par sync_data.py — ne pas editer a la main.\n\n")
        f.write("Pour s'en servir a la place de ~/Documents :\n")
        f.write("  export SADT_ATLAS_DATA=%s\n\n" % dest)
        for rel in sorted(man):
            f.write("%s\n    <- %s\n" % (rel, ", ".join(sorted(set(man[rel])))))
    print("\n  MANIFESTE.txt ecrit. %.2f Go rassembles." % (total / 1e9))


if __name__ == "__main__":
    main()
