# Architecture et contrat des clients

## Organisation

```text
packages/contracts   Schémas Zod canoniques, types JSON, JSON Schema médical généré
backend              API Fastify → opérations métier → repository SQLite / fournisseur IA
frontend             Pages → client HTTP validé → brouillon ; adaptateur vocal facultatif
```

Les workspaces sont liés par npm. Les types et le schéma JSON médical proviennent du même code ; les anciens schémas manuels backend et frontend ont été remplacés. Les DTO n'utilisent pas `Date` : date civile `AAAA-MM-JJ`, horodatage ISO UTC. Les chaînes médicales permettent une extraction fidèle ; l'absence de valeur est `null`. Ce contrat technique ne définit pas encore toutes les unités et règles cliniques.

`npm run build:contracts` exporte `packages/contracts/dist/medical-report.schema.json` (JSON Schema 2020-12), utilisable indépendamment de JavaScript. Ce fichier est généré à chaque build et ne doit pas être édité séparément.

## Données et mutations

Une consultation contient identité du patient, date/type de séance, notes, transcription, statut et révision. Son propriétaire est contrôlé côté serveur. L'ID, les dates de création/modification et la révision ne peuvent pas être modifiés par une commande client.

Chaque écriture après création exige `expectedRevision`. Une révision dépassée provoque HTTP 409 ; le client conserve son texte et demande une résolution explicite. Les mises à jour SQLite utilisent une condition atomique sur propriétaire, ID et révision. Le client sérialise ses sauvegardes, y compris les changements arrivant pendant une requête.

Les propositions IA et comptes rendus validés sont distincts. Une proposition contient les données médicales, version du schéma, texte source, révision source, date et fournisseur/modèle. Une modification du texte invalide la proposition actuelle ; le compte rendu précédemment validé reste une référence historique. La validation humaine est une commande explicite portant sur les données corrigées ; une rédaction manuelle porte une provenance explicite.

Dès qu'une proposition ou un compte rendu validé existe, l'identité patient, la date et le type de séance sont verrouillés : une modification est refusée avec `409 CONTEXT_LOCKED`. Les notes restent modifiables. Cette règle évite de rattacher un rapport existant à un autre patient ou contexte de séance.

## API versionnée par contrat

Les propositions et comptes rendus validés portent `schemaVersion: "1.0"` autour de leur objet médical. Une évolution incompatible exige une nouvelle version et une migration explicite des documents ; ne pas interpréter silencieusement un ancien dossier avec de nouvelles règles.

| Méthode | Route | Entrée / sortie |
| --- | --- | --- |
| POST | `/api/auth/login` | `{username,password}` → session, cookie HttpOnly |
| GET | `/api/auth/session` | Session active, sinon 401 |
| POST | `/api/auth/logout` | Invalidation session, 204 |
| GET | `/api/consultations` | Résumés des dossiers de l'utilisateur |
| POST | `/api/consultations` | Commande de création → dossier |
| GET | `/api/consultations/:id` | Dossier du propriétaire, sinon 404 |
| PATCH | `/api/consultations/:id` | Métadonnées autorisées + expectedRevision |
| POST | `/api/consultations/:id/transcript` | Transcript + expectedRevision |
| POST | `/api/consultations/:id/structure` | expectedRevision → proposition liée au texte sauvegardé |
| POST | `/api/consultations/:id/review` | Données corrigées, source proposal/manual et expectedRevision → compte rendu validé |
| DELETE | `/api/consultations/:id` | expectedRevision → 204 |

Erreurs homogènes : `{error:{code,message,details?}}`. 400 validation, 401 session, 404 absent/inaccessible, 409 conflit, 502 réponse fournisseur invalide, 503 fournisseur non configuré, 504 délai IA dépassé.

## Future application mobile

Partager les DTO et règles métier, pas les pages web ou les types DOM. Un client TypeScript peut consommer `@stelia/contracts` ; un autre langage peut utiliser le JSON Schema généré et le contrat HTTP. La reconnaissance émet des segments confirmés et un interim séparé ; démarrer une session ne réinitialise jamais le texte acquis du dossier.

Le contrôleur vocal actuel accepte une factory d'adaptateur. Le mobile devra implémenter le même comportement de démarrage/arrêt/finalisation avec son moteur natif, et conserver les tests de reprise et d'événements tardifs. Les sessions HTTP utilisent des cookies ; le backend sait également authentifier le même token de session en Bearer pour un client capable de l'obtenir via le cookie de connexion. Aucun stockage de token en clair n'est ajouté côté navigateur.

La synchronisation hors ligne élaborée n'est pas introduite sans besoin défini. Les révisions et conflits explicites constituent la base de synchronisation. Ne jamais appliquer automatiquement une ancienne transcription sur une nouvelle révision serveur.

## Stockage et exploitation

SQLite est réservé à une instance de serveur avec disque durable. Les documents et sessions sont persistés ; mots de passe hashés scrypt, tokens de session hashés SHA-256, comptes préprovisionnés et requêtes limitées par propriétaire. Une rotation de hash invalide les anciennes sessions. Les fichiers de données et secrets ne sont pas versionnés.

Pour un déploiement réel : terminer la sélection de l'hébergement et du moteur de transcription, définir sauvegarde/restauration et rétention, valider le contrat clinique. Les adaptations PostgreSQL ou fournisseurs spécifiques pourront remplacer les interfaces existantes sans modifier les pages ni le modèle médical.
