# Altech Garage — Gestion de garage automobile

Application web complète de gestion de garage (réparations, rendez-vous, stock, codes-barres, achats, clients, fournisseurs, employés, dépenses, caisse, rapports), en **français** avec bascule **arabe (RTL)**, mode clair avec dégradés et animations Framer Motion.

Les données sont enregistrées dans une **base SQLite locale** (`data/garage.db`) servie par un petit serveur Node. Aucune donnée de démonstration : la base démarre vide et se remplit avec vos données réelles.

## Démarrage rapide (Windows)

Double-cliquez sur le raccourci **Altech Garage** du Bureau, ou sur `AutoGarage.bat`.

Le lanceur installe les dépendances si besoin, compile l'application, démarre le serveur puis ouvre le navigateur sur <http://localhost:5180>. Si l'application tourne déjà, il ouvre simplement le navigateur.

Pour (re)créer les raccourcis Bureau et menu Démarrer :

```bash
powershell -ExecutionPolicy Bypass -File tools\create-shortcut.ps1
```

### Première utilisation

La base étant vide, l'écran de connexion propose directement la **création du compte administrateur**. Les comptes employés se créent ensuite depuis **Employés**, avec leurs permissions par page.

## Démarrage manuel

```bash
npm install
npm run serve      # compile puis démarre sur http://localhost:5180
```

Pendant le développement (rechargement à chaud) il faut les deux processus :

```bash
npm run dev:server   # API + base de données sur 5180
npm run dev          # interface sur 5173, /api est relayé vers 5180
```

| Script | Rôle |
|---|---|
| `npm start` | démarre le serveur (nécessite un `dist/` déjà compilé) |
| `npm run build` | compile l'interface dans `dist/` |
| `npm run serve` | compile puis démarre — le plus simple |
| `npm run dev` | serveur de développement Vite (port 5173) |
| `npm run dev:server` | serveur base de données avec rechargement (port 5180) |

## Base de données

SQLite via le module **`node:sqlite` intégré à Node** — aucune dépendance native, aucun serveur à installer.

- Fichier : `data/garage.db` (ignoré par git)
- Une table réelle par collection : `clients`, `products`, `repairs`, `purchases`, `workers`, `expenses`, `caisse`, `barcodes`… interrogeables en SQL avec n'importe quel outil (DB Browser for SQLite, etc.)
- Les sous-objets (lignes d'une réparation, paiements, permissions) sont stockés en colonnes JSON ; les champs inconnus du schéma sont conservés dans la colonne `extra`, donc rien n'est perdu
- Écriture transactionnelle, journal WAL

Emplacement personnalisable :

```bash
set GARAGE_DB=D:\sauvegardes\garage.db && npm start
set PORT=8080 && npm start
```

### API

| Route | Effet |
|---|---|
| `GET /api/health` | vérifie que le serveur répond |
| `GET /api/db` | lit toute la base |
| `PUT /api/db` | remplace toute la base |
| `POST /api/db` | identique à `PUT` (utilisé par `sendBeacon` à la fermeture de l'onglet) |
| `POST /api/db/reset` | vide la base |

L'interface enregistre automatiquement, avec regroupement des modifications (400 ms) ; l'état apparaît en haut à droite (*Enregistrement… / Enregistré / Non enregistré*).

**Paramètres → Base de données** permet en plus la sauvegarde et la restauration JSON, et la remise à zéro complète.

## Codes-barres

L'interface **Codes-barres** génère des codes **EAN-13 valides** (préfixe GS1 `613`, chiffre de contrôle calculé) et imprime des planches d'étiquettes.

- Génération aléatoire en un clic, ou saisie manuelle avec correction automatique du chiffre de contrôle
- Pré-remplissage depuis un produit du stock (nom + prix), avec enregistrement du code sur la fiche produit
- Étiquettes en 3 formats (38×24, 50×30, 70×40 mm), contenu configurable (nom, prix, chiffres, nom du magasin, bordures de découpe)
- Impression par lot avec nombre de copies par code

Le rendu des codes-barres est fait maison (`src/barcode.js`, SVG, sans dépendance) et sert à la fois à l'aperçu écran et à l'impression.

## Documents imprimés

Facture, bon de réparation et facture d'achat partagent une même mise en page
(`docHead` / `PRINT_CSS` dans `src/store.js`) : identité du garage au-dessus du
filet, **titre centré sous le filet** avec sa référence, encadrés client /
véhicule, tableau à en-tête violet, cachet *Payé / Partiel / Impayé* et bloc de
totaux. Le sens RTL est géré pour l'arabe.

Pour vérifier la mise en page sans passer par l'application :

```bash
node tools/preview-print.mjs        # écrit des exemples HTML dans ./preview-print
```

## Icône

`assets/autogarage.ico` (16 → 256 px) est généré sans bibliothèque d'images :

```bash
node tools/make-icon.mjs
```

## Stack

- React 18 + Vite
- Tailwind CSS (mode clair, dégradés)
- Framer Motion + Emotion (animations, transitions de pages, modales)
- Lucide React (icônes)
- Serveur : Node `node:http` + `node:sqlite` — **zéro dépendance de production**

## Prérequis

**Node.js 22.5 ou plus récent** (pour `node:sqlite`). Le lanceur le vérifie et propose la page de téléchargement si nécessaire.
