#!/usr/bin/env python3
"""Enregistre la trajectoire reelle des agents ALI_CBCT, pour le visualiseur.

    /opt/SlicerProd/Slicer-5.12.4-linux-amd64/bin/PythonSlicer ali_trace.py [Ba S N ...]

Demande le Python de Slicer (itk, monai, torch) et un clone de
SlicerAutomatedDentalTools a cote de ce depot.

POURQUOI un traceur plutot qu'une reconstitution : la sortie normale
d'ALI_CBCT ne contient que le point final. Mais l'agent garde deja tout son
chemin dans `position_mem` (agent.py, SavePos) -- il suffit de le lire. La
trajectoire affichee sur le site est donc celle que le reseau a reellement
parcourue, pas une animation vraisemblable.

ENTREE   MG_test_scan.nii.gz, le scan de test PUBLIE (release AMASSS_CBCT
         v1.0.1) -- le meme qui sert a AMASSS, d'apres model_registry.py.
         Aucune donnee patient.
SORTIE   assets/ali-trace.json, consomme par ali_mesh.py.

Les positions sont converties comme le fait SavePredictedLandmarks
(environment.py:118) : meme formule, donc meme repere que les reperes ecrits
dans le .mrk.json. Y compris son bug documente -- abs() suppose une origine
negative sur les trois axes.
"""
import json, os, sys, types

ROOT = os.path.dirname(os.path.abspath(__file__))
SADT = os.environ.get(
    "SADT_REPO", os.path.join(os.path.dirname(ROOT), "SlicerAutomatedDentalTools"))

SCAN = webmesh.data("SlicerDownloads/AMASSS/Test_Files/MG_test_scan/MG_test_scan.nii.gz")
#: GetBrain parcourt l'arbre et deduit la disposition des NOMS DE DOSSIERS,
#: pas des noms de fichiers : on peut donc viser la racine et laisser ALI
#: trouver les reperes ou qu'ils soient. ALI_MODELS pour cibler un groupe.
MODELS = os.environ.get("ALI_MODELS", webmesh.data("SlicerDownloads/ALI/ALI_CBCT/Models/Landmark"))
OUT = os.environ.get("ALI_TRACE_OUT", os.path.join(ROOT, "assets", "ali-trace.json"))

DEFAULT_LM = ["Ba", "S", "N"]


def main():
    if not os.path.isdir(SADT):
        sys.exit("Clone de SlicerAutomatedDentalTools introuvable :\n  %s\n"
                 "Donne son chemin dans SADT_REPO." % SADT)
    if not os.path.exists(SCAN):
        sys.exit("Scan de test introuvable :\n  %s" % SCAN)
    if not os.path.isdir(MODELS):
        sys.exit("Modeles introuvables :\n  %s\n"
                 "C'est le bouton « Download latest models » d'ALI." % MODELS)

    # ADTLib vit dans ADT/ et les modules d'ALI_CBCT l'importent en absolu.
    for sub in ("ADT", "ALI_CBCT"):
        sys.path.insert(0, os.path.join(SADT, sub))

    import importlib
    agent_mod = importlib.import_module("ALI_CBCT_utils.agent")
    cli = importlib.import_module("ALI_CBCT")

    captured = {}

    def phys(env, scale_key, pos):
        """Index de l'agent -> coordonnee physique, formule de la sortie."""
        import numpy as np
        origin = env.data[scale_key]["origin"]
        spacing = env.data[scale_key]["spacing"]
        physical_origin = abs(origin / spacing)
        p = (np.asarray(pos, dtype=float) - physical_origin) * spacing
        return [float(p[2]), float(p[1]), float(p[0])]

    original = agent_mod.Agent.Search

    def traced(self):
        result = original(self)
        try:
            env = self.environement
            scales = list(self.scale_keys)
            legs = []
            for i, key in enumerate(scales):
                mem = self.position_mem[i]
                if not mem:
                    continue
                sp = env.data[key]["spacing"]
                # On garde l'INDICE brut et l'espacement de l'echelle : c'est
                # la seule facon de replacer la trajectoire dans le meme
                # repere que les maillages, qui sont lus en indice x espacement
                # depuis le coin du volume. Le « phys » ci-dessous reste la
                # coordonnee que le module ecrirait, pour comparaison.
                legs.append({
                    "scale": key,
                    "spacing": [float(v) for v in sp],
                    "idx": [[float(v) for v in p] for p in mem],
                    "path": [phys(env, key, p) for p in mem],
                })
            captured[self.target] = {
                "legs": legs,
                "steps": int(result) if result is not None else -1,
                "final": phys(env, scales[-1], env.predicted_landmarks.get(self.target,
                              self.position)),
                "final_idx": [float(v) for v in env.predicted_landmarks.get(
                    self.target, self.position)],
            }
            n = sum(len(l["path"]) for l in legs)
            print("  %-4s : %d positions sur %d echelles, %s pas"
                  % (self.target, n, len(legs), result))
        except Exception as exc:                                # pragma: no cover
            print("  %-4s : trajectoire non capturee (%s)" % (self.target, exc))
        return result

    agent_mod.Agent.Search = traced

    wanted = sys.argv[1:] or DEFAULT_LM
    tmp = os.path.join("/tmp", "ali_trace_tmp")
    out = os.path.join("/tmp", "ali_trace_out")
    os.makedirs(tmp, exist_ok=True)
    os.makedirs(out, exist_ok=True)

    args = types.SimpleNamespace(
        input=SCAN, dir_models=MODELS,
        lm_type=",".join("'%s'" % w for w in wanted),
        output_dir=out, temp_fold=tmp, dcm_input="false",
        spacing="[1,0.3]", speed_per_scale="[1,1]",
        agent_fov="[64,64,64]", spawn_radius="10",
    )
    print("Reperes demandes :", ", ".join(wanted))
    cli.main(args)

    if not captured:
        sys.exit("Aucune trajectoire capturee.")
    payload = {
        "scan": os.path.basename(SCAN),
        "source": "ALI_CBCT sur le scan de test publie (AMASSS_CBCT v1.0.1)",
        "movements": ["Up", "Down", "Back", "Front", "Left", "Right"],
        "landmarks": captured,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"))
    print("\n%s — %.0f Ko" % (OUT, os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    main()
