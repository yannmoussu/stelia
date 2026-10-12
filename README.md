# Stelia

Application React/TypeScript de saisie des observations orthoptiques, transcription facultative et préparation de comptes rendus soumis à validation humaine.

L'audit initial est conservé dans [AUDIT.md](AUDIT.md), les corrections dans [IMPLEMENTATION.md](IMPLEMENTATION.md). L'architecture et les contrats pour les futurs clients sont décrits dans [docs/architecture.md](docs/architecture.md).

## Démarrage local

Node.js **24 ou supérieur** et npm. Les commandes d'installation se lancent depuis la racine du dépôt ; un seul lockfile gère les trois workspaces.

```sh
npm ci --ignore-scripts
npm run build:contracts
cp backend/.env.example backend/.env
npm run hash-password --workspace backend --silent
```

Le dernier programme demande un mot de passe masqué et affiche uniquement son hash scrypt. Renseignez un identifiant et ce hash dans `backend/.env`. Aucun compte ni mot de passe de démonstration n'est fourni. Le fichier `.env`, les dépendances et la base SQLite sont ignorés par Git.

Dans deux terminaux, depuis la racine :

```sh
npm run dev:backend
```

```sh
npm run dev:frontend
```

Ouvrir `http://localhost:5173`. Vite relaie `/api` vers `127.0.0.1:3000`. Le backend écoute par défaut uniquement sur l'interface locale. Les consultations sont conservées dans `backend/data/stelia.sqlite`.

## Contrôles

```sh
npm run check
npm run lint --workspace frontend
npm audit --audit-level=high
```

`check` compile les contrats, vérifie les types, exécute les tests des trois workspaces et construit frontend/backend. Les tests API utilisent la même factory que le serveur et un stockage isolé ; les tests vocaux utilisent un recognizer simulé. [Procédure des essais manuels](docs/manual-tests.md).

## IA et transcription

La saisie et la correction manuelles fonctionnent sans fournisseur externe. La dictée Web Speech est facultative et peut être traitée à distance par le navigateur ; elle ne conserve aucun fichier audio. Ne l'utiliser avec des données réelles qu'après avoir vérifié le moteur et les conditions de traitement du navigateur retenu.

La génération IA est désactivée jusqu'à configuration explicite de `AI_ENDPOINT`, `AI_API_KEY` et `AI_MODEL`. Le fournisseur HTTP doit accepter le contrat décrit dans [backend/README.md](backend/README.md). Aucun mock médical n'est actif dans l'application. Une proposition valide reste à relire, corriger et valider ; elle ne remplace jamais automatiquement le compte rendu validé ni l'identité du patient. Un mode manuel permet également de rédiger et valider un compte rendu sans fournisseur.

## Exécution après build

```sh
npm run build
npm start --workspace backend
```

Servir `frontend/dist` avec repli des routes vers `index.html` et relayer `/api` vers le backend sous la même origine. Pour une origine différente, configurer `VITE_API_BASE_URL` à la construction et `CORS_ORIGIN` côté serveur ; les cookies stricts privilégient une origine commune. En production, HTTPS et cookies Secure sont requis (`NODE_ENV=production`).

SQLite vise une instance de serveur et un volume persistant. Prévoir sauvegarde/restauration, contrôle de l'hébergement et validation clinique du schéma avant usage réel. Il n'existe pas encore de déploiement hébergé ou de service externe connecté.
