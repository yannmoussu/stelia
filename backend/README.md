# Backend Stelia

Node.js 24 ou ultérieur. Le serveur Fastify, les tests et les futurs clients utilisent la même factory `createApp`. Les contrats de requête, réponses et données médicales proviennent de `@stelia/contracts`.

## Démarrage

Depuis la racine du dépôt : `npm install`, `npm run build -w @stelia/contracts`, puis `npm run dev -w backend`. Copier la configuration exemple et renseigner un compte avant démarrage. Il n’existe aucun compte par défaut et aucune inscription publique.

Générer un hash sans inscrire le mot de passe dans l’historique : `npm run hash-password -w backend --silent`. La saisie terminal est masquée ; la commande accepte aussi un mot de passe via stdin pour les scripts. Conserver le hash scrypt dans `STELIA_PASSWORD_HASH` et choisir `STELIA_USERNAME`. L’identifiant utilisateur est un UUID stable dérivé du nom ; changer ce nom nécessite une migration du propriétaire des dossiers.

Pour plusieurs comptes, renseigner `STELIA_USERS_JSON` comme une liste de `{ "id": "UUID", "username": "nom", "passwordHash": "scrypt$..." }`. Les IDs doivent rester stables. Une rotation du hash invalide les sessions existantes, sans modifier la propriété des consultations.

Configuration :
- `HOST` : `127.0.0.1` par défaut ; `PORT` : `3000`.
- `SQLITE_PATH` : `./data/stelia.sqlite` ; stockage durable, hors Git.
- `CORS_ORIGIN` : origines autorisées séparées par virgules ; localhost et 127.0.0.1:5173 par défaut.
- `NODE_ENV=production` active les cookies Secure ; `STELIA_SECURE_COOKIES=true` peut aussi les activer.
- `AI_ENDPOINT`, `AI_API_KEY`, `AI_MODEL` : les trois doivent être présents ensemble.
- `AI_TIMEOUT_MS` : 30000 par défaut.

## API

`/health` est public. Connexion : `POST /api/auth/login` avec username/password ; session : `GET /api/auth/session` ; déconnexion : `POST /api/auth/logout`. Un token opaque est placé dans un cookie HttpOnly SameSite=Strict. Le même token est accepté dans `Authorization: Bearer ...` pour un client capable de gérer la session. Cinq échecs de connexion sur une adresse IP bloquent les nouvelles tentatives pendant une fenêtre de 15 minutes ; une connexion réussie ne remet pas ce compteur à zéro. Les hashes de tokens et leur expiration sont stockés en SQLite.

Les consultations sont accessibles uniquement à leur propriétaire :
- `GET /api/consultations` renvoie des résumés sans notes ou transcription.
- `POST /api/consultations` crée un dossier à partir du contrat canonique et répond 201.
- `GET /api/consultations/:id` charge le document complet.
- `PATCH /api/consultations/:id` modifie uniquement les métadonnées validées.
- `POST /api/consultations/:id/transcript` remplace explicitement le texte sauvegardé.
- `POST /api/consultations/:id/structure` lit uniquement la transcription déjà sauvegardée.
- `POST /api/consultations/:id/review` valide un compte rendu corrigé par le professionnel.
- `DELETE /api/consultations/:id` attend un corps JSON contenant expectedRevision.

Chaque écriture après création exige `expectedRevision`. SQLite compare la révision et le propriétaire dans la même instruction SQL. Une révision dépassée produit 409 ; un dossier absent ou appartenant à quelqu’un d’autre produit 404.

Le patient, la date et le type sont verrouillés dès qu’une proposition ou un compte rendu validé existe : les changements répondent 409 CONTEXT_LOCKED. Renvoyer les mêmes valeurs et modifier les notes reste autorisé. Ce verrouillage empêche de rattacher un compte rendu existant à un autre patient ou contexte.

Les erreurs utilisent `{ "error": { "code": "...", "message": "...", "details": [...] } }`. Les journaux ne contiennent ni transcription ni corps de réponse fournisseur.

## Service IA et validation humaine

Le service IA est désactivé tant que sa configuration n’est pas explicite (503 AI_NOT_CONFIGURED). Aucun mock n’est utilisé en production. L’adaptateur HTTP envoie `{ transcript, model, schema }` et attend un objet MedicalReport JSON direct. HTTPS est exigé hors localhost ; les redirections sont refusées, les réponses sont limitées à un Mo et le délai est borné.

Le service métier valide strictement cette sortie. Une proposition conserve sa transcription et sa révision source ; une réponse tardive ne peut écraser une révision plus récente. Elle ne peut modifier ni patient, ni ID, ni dates. Le compte rendu ne devient completed qu’après validation humaine avec une synthèse clinique non vide.

La revue utilise `source: "proposal"` par défaut ou `source: "manual"` pour une rédaction sans IA. Une modification de transcription invalide la proposition actuelle ; le compte rendu précédemment validé reste visible comme historique, avec sa source d’origine.

## Vérification et limites de déploiement

`npm run typecheck -w backend` et `npm test -w backend`. Les tests passent par la factory réelle et couvrent contrat, authentification, séparation des propriétaires, redémarrage, CAS, sortie IA invalide et réponse périmée.

SQLite synchronise de petites opérations dans un seul processus ; il convient à cette première architecture monolithique. Le chiffrement au repos, la gestion des sauvegardes, la gestion opérationnelle des comptes et le choix du fournisseur de transcription/IA restent à configurer avant un usage avec des données réelles. Les mesures médicales sont des extractions textuelles et nécessitent une revue clinique.
