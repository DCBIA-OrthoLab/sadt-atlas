---
name: publier-atlas
description: Publier SADT Atlas sur Netlify (site sadt-guide, https://sadt-guide.netlify.app) depuis le dossier local, avec le CLI Netlify. À charger dès qu'on demande de « publier », « republier », « déployer », « mettre en ligne » ou « mettre à jour le site », ou de vérifier ce qui est en ligne. Donne les commandes exactes, les contrôles avant de publier et les pièges (Node 22 dans nvm, pas de build distant, site non relié à GitHub).
---

# Publier SADT Atlas

Le site est statique et les pages générées sont versionnées : **Netlify ne construit rien**
(`netlify.toml` : `publish = "."`, aucun build, aucune post-transformation). Publier, c'est
envoyer le contenu du dossier tel qu'il est sur le disque.

| Quoi | Valeur |
|---|---|
| Site | `sadt-guide`, https://sadt-guide.netlify.app |
| Identifiant du site | `445cff3d-b5e1-4bf4-80e4-2225a56e43fb` |
| Compte | « dcbia videos », équipe `dcbia-videos` (qui porte aussi `dcbia` et `proffit-instruction`, à ne jamais toucher) |
| Administration | https://app.netlify.com/projects/sadt-guide |
| Dépôt officiel | `DCBIA-OrthoLab/sadt-atlas` (public) |
| Liaison GitHub | **à vérifier** : le site a été créé et publié à la main au CLI. Tant que le dépôt n'est pas relié (Site configuration, Build & deploy, Link repository), un push ne publie rien. |

## Avant tout : Node 22

Le `node` du système est en version 12 et le CLI Netlify exige Node 22.13 ou plus. Node 22 et
`netlify-cli` sont installés dans nvm, dans le dossier de l'utilisateur. **Charger nvm dans chaque
commande** (le shell ne garde pas son état d'un appel à l'autre) :

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22 >/dev/null
```

Ne pas faire `npx netlify-cli` sans cela : il échoue sur la version de Node. Ne pas installer
Node ailleurs, ne pas modifier `~/.bashrc`.

## Connexion

Le jeton est dans `~/.config/netlify/config.json` (en clair, le trousseau système est absent).

```bash
netlify status                # doit afficher « dcbia videos »
```

S'il n'est pas connecté, la connexion interactive ne marche pas depuis un agent. Utiliser le
mode ticket, puis donner le lien à l'utilisateur, qui l'ouvre dans son navigateur et autorise :

```bash
cd /tmp && netlify login --request "Publier SADT Atlas" --json     # donne ticket_id et url
netlify login --check <ticket_id>                                    # « Status: authorized »
```

Avant de publier, **vérifier le compte** : `netlify sites:list` doit montrer `sadt-guide`.
Si le compte n'est pas « dcbia videos », s'arrêter et demander.

## Contrôles avant de publier

1. `git rev-parse --abbrev-ref HEAD; git rev-parse --short HEAD; git status --porcelain` : relever
   la branche et l'état. Le déploiement envoie le **disque**, commité ou non. Des fichiers modifiés
   qui ne viennent pas du travail en cours (agent parallèle, édition manuelle) se signalent à
   l'utilisateur avant de publier.
2. Si des fiches, des termes ou des traductions ont changé, `python3 build.py` doit avoir été lancé
   et son résultat commité. **Jamais pendant qu'un agent écrit dans le dépôt** (il réécrit des
   fichiers partagés).
3. `grep -rnP '\x{2014}' en/` : aucun tiret cadratin (seule exception `en/Agent/Agent.code.html`, citation
   fidèle de `Agent_CLI.py:34`).
4. `python3 i18n.py stale` : dit quelles langues sont en retard sur l'anglais. Publier des langues
   en retard est permis, mais le dire.
5. Le site est **public** et le dépôt aussi. Ne rien publier qui contienne des données patient,
   des jetons ou des chemins privés.

## Publier

```bash
cd ~/Projects/UNC/sadt-atlas
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22 >/dev/null
netlify deploy --prod --dir . --site 445cff3d-b5e1-4bf4-80e4-2225a56e43fb
```

Pour essayer sans toucher au site public, enlever `--prod` : le CLI donne une URL de prévisualisation.

**Ne jamais lancer `netlify sites:create`, `netlify init` ni `netlify link` sans demande de
l'utilisateur** : ils créent un second site ou ajoutent `.netlify` au `.gitignore` du dépôt. Si
c'est arrivé, `git checkout .gitignore`. Le dossier `.netlify/` (état local du lien) n'est pas
suivi par git et ne se commite pas.

## Vérifier après

```bash
for p in "" en/guide/index.html en/visor/ALI/ALI.html assets/algo.js; do
  printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" -L https://sadt-guide.netlify.app/$p; done
```

Contrôler aussi une page de chaque langue : `fr`, `pt`, `ko`, `th`, `es`, `it` (les sept langues
sont publiées : `<langue>/guide/index.html`). Une page absente répond 404. Une réponse 301 est la
redirection de Netlify vers l'URL sans `.html`, pas une erreur.

## Revenir en arrière

Sur https://app.netlify.com/projects/sadt-guide/deploys, ouvrir un déploiement précédent puis
« Publish deploy ». Rien à défaire dans git.

## Rapport à l'utilisateur

En français : l'URL, la branche et le HEAD publiés, l'état de `git status`, les langues
vérifiées (code HTTP), et ce qui n'est pas à jour (`i18n.py stale`). Ne jamais signer d'un nom
d'assistant ; ne rien commiter sans demande.
