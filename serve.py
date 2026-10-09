#!/usr/bin/env python3
"""Sert SADT Atlas sur le réseau, filtré par liste blanche.

    python3 serve.py            # lit serve.conf, ou serve.conf.example à défaut
    python3 serve.py --conf autre.conf

La liste blanche est relue dès que serve.conf change : enregistre le fichier,
la règle s'applique à la requête suivante. Aucun redémarrage.

Ce filtre est applicatif, pas un pare-feu : il répond 403 aux adresses non
listées, mais le port reste ouvert sur les interfaces. Pour un vrai cloisonnement,
doubler d'une règle ufw/iptables.
"""
import argparse
import ipaddress
import os
import sys
import threading
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))


class Allow:
    """Liste blanche rechargée à chaud, d'après la date de modification du fichier."""

    def __init__(self, path):
        self.path = path
        self.mtime = None
        self.nets = []
        self.port = 8080
        self.lock = threading.Lock()
        self.reload(first=True)

    def _parse(self):
        nets, port, bad = [], 8080, []
        with open(self.path, encoding="utf-8") as fh:
            for num, raw in enumerate(fh, 1):
                line = raw.split("#", 1)[0].strip()
                if not line:
                    continue
                if line.lower().startswith("port"):
                    try:
                        port = int(line.split("=", 1)[1])
                    except (IndexError, ValueError):
                        bad.append((num, line))
                    continue
                try:
                    nets.append(ipaddress.ip_network(line, strict=False))
                except ValueError:
                    bad.append((num, line))
        return nets, port, bad

    def reload(self, first=False):
        try:
            m = os.path.getmtime(self.path)
        except OSError:
            return
        if m == self.mtime:
            return
        try:
            nets, port, bad = self._parse()
        except Exception as e:                       # fichier à moitié écrit
            log(f"conf illisible, on garde la précédente : {e}")
            return
        with self.lock:
            changed_port = (not first) and port != self.port
            self.nets, self.mtime = nets, m
            self.port = port
        for num, line in bad:
            log(f"conf ligne {num} ignorée, ni IP ni CIDR : {line!r}")
        log(f"liste blanche {'chargée' if first else 'rechargée'} — {len(nets)} entrées")
        if changed_port:
            log(f"le port est passé à {port} : redémarrer serve.py pour l'appliquer")

    def allows(self, addr):
        self.reload()
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            return False
        if ip.version == 6 and ip.ipv4_mapped:       # ::ffff:198.51.100.x
            ip = ip.ipv4_mapped
        with self.lock:
            return any(ip in n for n in self.nets)


def log(msg):
    print(f"{datetime.now():%H:%M:%S}  {msg}", flush=True)


class Handler(SimpleHTTPRequestHandler):
    allow = None

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def _check(self):
        peer = self.client_address[0]
        if self.allow.allows(peer):
            return True
        log(f"403  {peer}  {self.path}")
        self.send_response(403)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            f"403 — {peer} n'est pas dans la liste blanche de SADT Atlas.\n"
            f"Ajoute cette adresse dans serve.conf puis enregistre : "
            f"la regle prend effet aussitot.\n".encode("utf-8"))
        return False

    def do_GET(self):
        if self._check():
            super().do_GET()

    def do_HEAD(self):
        if self._check():
            super().do_HEAD()

    def end_headers(self):
        # Le site change à chaque build.py : ne pas laisser le navigateur figer
        # une vieille feuille de style ou un vieux script.
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass                                          # on journalise nous-mêmes

    def log_request(self, code="-", size="-"):
        if str(code) != "403":
            log(f"{code:>3}  {self.client_address[0]}  {self.path}")


def main():
    ap = argparse.ArgumentParser(description="Sert SADT Atlas avec liste blanche.")
    ap.add_argument("--conf", default=os.path.join(ROOT, "serve.conf"))
    ap.add_argument("--port", type=int, help="surcharge le port de la conf")
    args = ap.parse_args()

    if not os.path.exists(args.conf):
        modele = os.path.join(ROOT, "serve.conf.example")
        if args.conf == os.path.join(ROOT, "serve.conf") and os.path.exists(modele):
            log("serve.conf absent — repli sur serve.conf.example : "
                "la machine elle-même et le tailnet seulement.")
            log("Pour ouvrir à d'autres adresses : cp serve.conf.example serve.conf")
            args.conf = modele
        else:
            sys.exit(f"conf introuvable : {args.conf}")

    Handler.allow = Allow(args.conf)
    port = args.port or Handler.allow.port
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)

    log(f"SADT Atlas servi depuis {ROOT}")
    log(f"écoute sur 0.0.0.0:{port} — conf : {args.conf}")
    for label, addr in adresses(port):
        log(f"   {label:12s} {addr}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        log("arrêt")


def adresses(port):
    """Les URL utiles à communiquer."""
    out = [("local", f"http://127.0.0.1:{port}/")]
    try:
        import subprocess
        ts = subprocess.run(["tailscale", "ip", "-4"], capture_output=True,
                            text=True, timeout=3).stdout.strip().split("\n")[0]
        if ts:
            out.append(("tailscale", f"http://{ts}:{port}/"))
    except Exception:
        pass
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("192.0.2.1", 1)); lan = s.getsockname()[0]; s.close()
        out.append(("réseau local", f"http://{lan}:{port}/"))
    except Exception:
        pass
    return out


if __name__ == "__main__":
    main()
