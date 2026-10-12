# Audit technique de Stelia

Date : 12 octobre 2026. Révision auditée : `80efda3` (`main`).

Ce document conserve les conclusions de l'audit initial, réalisé sans modification de fichier. Les corrections ultérieures sont suivies dans `IMPLEMENTATION.md` et dans l'historique Git ; elles ne changent pas rétroactivement les constats ci-dessous.

## Diagnostic et recommandation

**Refactorisation sélective, avec réécriture ciblée du moteur vocal et des contrats de données.** L'interface est récupérable et la stack simple. Le fonctionnement actuel présente plusieurs pertes silencieuses de données. Ajouter directement des fonctionnalités amplifierait ces défauts.

Le projet est un prototype d'interface et de transcription, avec un backend Fastify déjà présent. La génération de compte rendu reste inaccessible depuis l'interface et repose côté serveur sur des données fictives. Les composants sont courts et l'organisation en routes, repositories et services est lisible. Les frontières protègent cependant peu les données : les pages orchestrent les sauvegardes, les routes portent les mutations métier et les `any` permettent aux modèles incompatibles de circuler sans contrôle.

## Méthode et limites

Sources frontend/backend, configurations, dépendances, schémas, tests et points d'intégration examinés. Huit tests backend exécutés avec caches désactivés ; requêtes API en mémoire ; simulations du vrai hook vocal transpillé. Aucun fichier créé ou modifié. Statut Git propre et empreinte des fichiers identique avant/après les vérifications.

Le frontend n'a pas été compilé : ses dépendances n'étaient pas installées et leur installation aurait contrevenu au mandat sans écriture. Aucun essai avec microphone réel ni analyse de vulnérabilités des dépendances n'a été effectué. Les risques de concurrence et de navigation entre paramètres sont distingués des reproductions exécutées.

## Problèmes classés par gravité

| ID | Gravité | Constat et conséquence | Preuve |
| --- | --- | --- | --- |
| A01 | Critique : perte de données | Le formulaire envoie `patientName`, `consultationType`, `notes`. Zod retire ces propriétés inconnues ; l'API répond 200 avec un dossier aux informations patient nulles. | Reproduit avec le payload réel. `frontend/src/components/consultation/ConsultationForm.tsx:9`, `backend/src/api/routes/consultations.ts:16`. |
| A02 | Critique : perte de données | Chaque reprise de dictée remplace le texte antérieur : le hook vide son cumul, le panneau transmet la nouvelle session et le workspace remplace toute la transcription. | Hook `137`, RecorderPanel `22`, ConsultationWorkspace `40`. |
| A03 | Critique : intégrité | PUT accepte un objet arbitraire : patient nul, statut invalide, dates et ID modifiables. Modifier l'ID laisse la Map indexée sous l'ancien identifiant. | Reproduit, réponse 200 ; routes `73`, repository `33`. |
| A04 | Critique avant usage clinique | Le mock actif impose John Doe, des mesures normales et des recommandations fixes pour tout texte non vide, puis les persiste. Le bouton est désactivé mais l'endpoint existe. | Reproduit ; `mock-ai.service.ts:12`, routes `137`, bootstrap `26`. |
| A05 | Bloquant avant données réelles | Aucune authentification ni séparation des utilisateurs. Liste, lecture, modification et suppression accessibles. CORS ne constitue pas un contrôle d'accès API. | Routes de consultation et `findAll`. |
| A06 | Bloquant avant usage durable | Stockage en Map : perte des dossiers au redémarrage et incohérence entre processus. | `in-memory.consultation.repository.ts:6`. |
| A07 | Élevée | Fusion superficielle : modifier seulement `patient.nom` supprime prénom et date de naissance. | Reproduit avec PUT partiel ; repository `33`. |
| A08 | Élevée | Sortie IA non validée. `Partial<Consultation>` autorise conceptuellement un patch de l'ID, de l'identité et des dates. | Fournisseur invalide injecté : données invalides persistées en HTTP 200. |
| A09 | Élevée | Sauvegarde optimiste sans état visible ; erreur console seule ; PUT 404 retournant null ignoré. | Workspace `37–45`, service `41–43`. |
| A10 | Élevée avant données réelles | Tous les résultats vocaux complets sont écrits dans la console à chaque événement. | Hook `90–94`. |
| A11 | Élevée, risque à tester | PUT cumulatifs simultanés sans ordre ni révision : une ancienne version peut remplacer la plus récente. | Workspace/RecorderPanel. Dépend de l'ordre de traitement réseau/serveur. |
| A12 | Élevée, risque à tester | Changement de paramètre A→B sans démontage : réponse GET tardive ou transcript de A peut être appliqué à B. | GET sans annulation, callback dépendant d'ID, recorder non keyé. Pas de navigation directe actuelle entre dossiers. |
| A13 | Moyenne | Interim reconstruit avec seulement les indices ≥ resultIndex : les hypothèses intermédiaires précédentes encore valides disparaissent. | Reproduit sur le hook transpillé. |
| A14 | Moyenne | Cleanup limité à stop, handlers conservés, aucune neutralisation des événements retardés. Les derniers mots après stop/navigation ne sont pas garantis sauvegardés. | Hook `121–126`. |
| A15 | Moyenne | Booléen vocal insuffisant, plusieurs start possibles pendant permission ; reset avant succès ; exception start seulement journalisée. | Reproduit avec InvalidStateError ; hook `137–143`. |
| A16 | Moyenne | Interim parfois conservé après fin/erreur et affiché sans distinction du texte acquis. | Hook onend/onerror et RecorderPanel `98`. |
| A17 | Moyenne | Aucune correction manuelle ni saisie alternative ; aucune conservation audio/retranscription. | TranscriptBox est un paragraphe ; aucun MediaRecorder. |
| A18 | Élevée pour IA/mobile | Contrats divergents et manuel : types frontend/backend, Zod, JSON Schema, defaults. JSON Schema inutilisé à l'exécution. | Voir section contrat. |
| A19 | Élevée | Vérification TypeScript backend en échec ; `any` aux frontières ; tests absents sur les comportements à risque. | Voir section contrôles. |
| A20 | Moyenne | URL API et CORS fixés à localhost ; aucun environnement, annulation, factory serveur ou arrêt propre. | Service, plugins, server.ts. |
| A21 | Moyenne | Erreur présentée comme liste vide ou dossier introuvable ; création répétable ; validation d'espaces insuffisante. | Dashboard, Workspace, NewConsultation, ConsultationForm. |
| A22 | Moyenne | 4 518 fichiers de backend/node_modules suivis Git (~110 Mo), dont binaires et cache Vitest. | Inventaire Git. |
| A23 | Faible | Accessibilité, titre/langue HTML, restes de marque/démo, mocks/assets inutilisés, documentation de template et dépendances inutilisées. | Labels sans associations ; bouton micro sans nom ; alias 2→demo. |

## Reconnaissance vocale

Les idées final/interim, français, continuous et déduplication des finals sont pertinentes. Un final répété est bien ajouté une seule fois dans une session normale.

Avec `[final Alpha, interim Bravo, interim Charlie]`, puis la modification de Charlie en Delta (`resultIndex=2`), le hook affiche Delta au lieu de Bravo Delta. `resultIndex` est le premier résultat modifié, pas le début de toutes les hypothèses intermédiaires. Le snapshot complet doit être pris en compte.

`stop()` peut encore produire un final ; le démontage doit être distinct de l'arrêt avec finalisation. Détacher les handlers, invalider les anciennes sessions et séparer les états idle/starting/listening/stopping/error. Ne pas remettre le texte du dossier à zéro au démarrage.

Aucune double dictée due à StrictMode n'a été démontrée ; conserver StrictMode et corriger les cycles de vie. La saisie doit être éditable et rester disponible sans microphone compatible. Web Speech ne garantit pas un traitement local : certains navigateurs utilisent un service distant ; le fournisseur et le traitement des données doivent être décidés avant usage réel.

Références : [Web Speech API](https://webaudio.github.io/web-speech-api/#speechrecognitionevent), [méthodes stop/abort](https://webaudio.github.io/web-speech-api/#speechrecognition-methods), [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## Contrat médical, backend, IA et mobile

Le JSON Schema exige uniquement les cinq objets racines. Il accepte `{patient:{},contexte:{},bilan_sensoriel:{},bilan_optomoteur:{},conclusion:{}}`, tandis que Zod refuse les propriétés imbriquées absentes. Divergence reproduite. `.partial()` à la création agit seulement au premier niveau : `patient: {nom:'Alice'}` est rejeté avant la fusion annoncée avec les defaults.

Les dates de naissance sont des chaînes libres, les tests acceptent `C`. Toutes les mesures sont string/null sans règles explicites de format, unité ou signification d'absence. Ce format peut servir à extraire du texte ; les règles cliniques nécessitent une validation par un orthoptiste avant normalisation.

Séparer métadonnées (identité, date/type, propriétaire, révision), transcription corrigée et sauvegardée, proposition IA structurée liée à une transcription source, compte rendu validé par le professionnel. Le service IA doit produire une proposition limitée, jamais un patch arbitraire de consultation. Le dossier actuel peut conserver un transcript A et une analyse issue de B : reproduit.

Une source canonique doit générer types et JSON Schema. Distinguer les DTO JSON avec dates ISO des types internes. Factory `createApp({repository, aiService})`, dépendances typées et opérations métier explicites suffisent. Monolithe Fastify et état React local adaptés ; microservices et gestionnaire d'état global injustifiés à cette taille.

Pour mobile, partager contrats JSON versionnés et validations, et éventuellement les règles TypeScript si le client est en TypeScript. Prévoir un adaptateur vocal natif distinct. Le hook actuel dépend de window au chargement du module.

## Tests, erreurs, dépendances et configuration

- Huit tests backend passent, principalement sur les parcours heureux. Pas de couverture PUT/DELETE, payload frontend réel, reprise vocale, conflits, sortie IA invalide, panne fournisseur, accès entre utilisateurs.
- Tests recréant leur propre serveur au lieu du bootstrap réel ; aucun close après tests.
- Aucun test frontend/vocal ni script de test frontend.
- `tsc --noEmit` échoue avec TypeScript 7 : moduleResolution=node10 et baseUrl supprimés, paths non relatifs.
- Sans modifier le dépôt, contrôle des sources avec options compatibles : cinq erreurs supplémentaires TS18046 (`request.params` unknown dans les catch).
- Les any explicites contournent la sûreté des types. Ne pas conclure strict désactivé côté frontend : TypeScript 6 l'active par défaut ([documentation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)).
- `/transcript` accepte un nombre (200). `/structure` avec un nombre ou sans body provoque 500 au lieu d'une erreur de validation. Gestion d'erreurs hétérogène, pas de timeout IA.
- Manifestes et lockfiles cohérents ; aucune conclusion sur les vulnérabilités sans scan dédié.
- node_modules backend versionné ; manque de scripts backend build/typecheck/lint, de version Node déclarée et de documentation de démarrage réelle.
- ts-node, types UUID et dépendances CSS directes potentiellement inutilisés. Supprimer les restes de démo et assets sans usage, ou les déplacer dans des fixtures.

## Classement des modules

| Catégorie | Modules |
| --- | --- |
| À conserver | React/Vite/Tailwind/Fastify, main.tsx/StrictMode, base routing, PageHeader, ConsultationList, présentation TranscriptBox, CSS, health, tests Fastify.inject. |
| À refactoriser | Dashboard/NewConsultation, présentation workspace/recorder, formulaire et panneaux patient, Navbar, bootstrap/config/CORS, interfaces repository/IA, suite API. |
| À réécrire | Hook vocal, consultationService, contrat frontend, orchestration sessions/sauvegarde, validation et logique des écritures API, pipeline et contrat IA. |
| Tests uniquement | Repository mémoire et mock IA isolés ; persistance de production à créer. |

## Comparaison des stratégies

Objectif comparable : création, dictée, sauvegarde et compte rendu révisable fiables.

| Stratégie | Effort relatif | Risques | Maintenabilité |
| --- | --- | --- | --- |
| Continuer sur l'existant | Faible pour un écran, élevé en corrections cumulées | Pertes de données et adaptations multiples conservées | Faible tant que les frontières restent inchangées |
| Refactoriser sélectivement | Moyen, concentré sur le noyau | Régressions locales maîtrisables par tests | Meilleur rapport effort/qualité |
| Repartir de zéro | Le plus élevé à périmètre équivalent | Réimplémentation et mêmes décisions métier | Bonne si bien exécuté, sans avantage démontré ici |

## Plan progressif et testable

1. Rendre les contrôles reproductibles : configuration TS, commandes, factory serveur, dépôt nettoyé. Typecheck/tests passent et utilisent le montage réel.
2. Unifier le contrat et sécuriser les écritures : source canonique, commandes distinctes, champs serveur protégés. Test création/relecture du formulaire conservant nom/type/notes ; refus des types et champs interdits.
3. Fiabiliser la transcription : adaptateur injectable, snapshot pur, sessions liées au dossier, éditeur, sauvegardes ordonnées et visibles. Tests reprise/interims/finals tardifs/refus micro/panne/changement de dossier sans perte.
4. Persister et isoler : stockage durable, authentification, ownership, révisions. Tests redémarrage, accès inter-utilisateurs refusé, conflit explicite.
5. Brancher l'IA : proposition validée liée au texte, erreurs/timeout, validation professionnelle. Sortie invalide ou périmée sans altération du compte rendu validé ; identité et corrections préservées.
6. Préparer mobile : contrats indépendants du navigateur et adaptateur natif distinct. Même comportement métier et révisions.

Les délais dépendent surtout du fournisseur de transcription, du contrat clinique et de la persistance. Les choix peuvent être faits sans reconstruire entièrement l'interface.
