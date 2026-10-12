# Suivi de correction de l'audit

L'audit initial est conservé dans [AUDIT.md](AUDIT.md). Ce suivi décrit les corrections et leurs preuves, sans remplacer les conclusions historiques.

Décision utilisateur du 12 octobre 2026 : appliquer les corrections, commits et push fréquents sur `main`, intégration IA configurable. Aucun fournisseur externe ni environnement d'hébergement n'est imposé. La génération est indisponible sans configuration ; la saisie manuelle reste disponible.

| Lot | Points d'audit | État | Vérifications attendues |
| --- | --- | --- | --- |
| Audit conservé | Diagnostic complet | Livré (`39eaff4`) | Document et push GitHub |
| Workspace et contrat canonique | A01, A18, A19, A22 | Livré (`b62d17e`, `f4112dc`) | Contrats stricts, lockfile unique, Node 24, dépendances ignorées |
| API, persistance, accès, révisions | A03, A05, A06, A07, A11, A20 | Livré (`f4112dc`) | Création/relecture, champs interdits, propriétaires, redémarrage, conflits |
| Moteur vocal | A02, A10, A13, A14, A15, A16 | Livré (`f6f879c`) | Déduplication, snapshot interims, reprise, permission, fin tardive, destruction |
| Parcours web et sauvegarde | A01, A02, A09, A12, A17, A21, A23 | Livré (`f6f879c`) | Texte éditable, sauvegardes ordonnées, navigation et focus protégés |
| Propositions IA et validation humaine | A04, A08, A18 | Livré (`f4112dc`, `f6f879c`) | Sortie invalide/timeout/périmée refusée, relecture liée au texte sauvegardé |
| Documentation et préparation mobile | A18, A20, A23 | Livré dans ce lot | Export JSON Schema, frontières sans DOM, exemples d'environnement et CI |

Les lots interdépendants ont été regroupés pour conserver des commits cohérents : contrat/API, puis moteur vocal/parcours web. Les commits ont été poussés sur `main` après leurs contrôles.

## Changements et preuves

- **A01, A07, A18** : contrat canonique `@stelia/contracts`, payload complet du formulaire, objet patient validé en entier, schéma médical strict généré depuis Zod. `npm run build:contracts` exporte aussi `packages/contracts/dist/medical-report.schema.json` pour les clients sans TypeScript.
- **A03, A05, A06, A11** : commandes API explicites, champs serveur protégés, SQLite durable, comptes préprovisionnés et sessions persistées, isolation par propriétaire, comparaison atomique des révisions. L'ancien stockage des dossiers en Map et le mock médical ont été supprimés.
- **A02, A09, A12, A17** : brouillon par dossier/utilisateur, finales vocales additives, éditeur manuel, sauvegardes sérialisées et erreurs visibles. Une requête périmée ne change pas le dossier courant ; un conflit ne remplace pas automatiquement le texte local.
- **A10, A13–A16** : contrôleur vocal injectable, reconstruction des interims à partir du snapshot complet, déduplication des finales, arrêt attendant la finalisation, destruction avec handlers détachés et sessions invalidées. Aucune transcription n'est journalisée.
- **A04, A08** : fournisseur HTTP configurable et désactivé sans configuration complète, HTTPS hors localhost, réponse bornée et validée, délai limité, proposition liée au texte source. Relecture et synthèse clinique requises ; rédaction manuelle disponible sans IA.
- **A19–A23** : TypeScript strict et configurations actuelles, factory unique pour serveur/tests, URLs et origines configurables, arrêt propre, récupération des sessions expirées sans perdre les saisies, refus des doubles soumissions, erreurs distinctes d'une liste vide/404. Labels, langue française, titre et dialogues clavier corrigés ; assets/mocks inutilisés et `node_modules` versionnés retirés. Guides et CI ajoutés.

La revue indépendante a également corrigé des défauts introduits ou révélés par l'intégration : arrêt vocal interrompu par l'état de chargement, timeout ne couvrant pas le corps HTTP, compte rendu conservé après changement de patient/date/type, compteur de connexions remis à zéro par un autre compte, relecture manuelle devenue périmée, conflits IA sans récupération et perte de saisies lors d'une reconnexion avec un autre compte. Des tests couvrent ces régressions. Le contexte patient/date/type est verrouillé après proposition ou validation ; la reconnexion d'un brouillon exige son compte initial.

## Vérifications exécutées

| Contrôle | Résultat |
| --- | --- |
| Contrats partagés | 5 tests réussis |
| Backend via factory réelle et SQLite | 26 tests réussis |
| Frontend, sauvegarde, parcours, HTTP et dialogues | 54 tests réussis, dont 20 pour la reconnaissance vocale |
| Types des trois workspaces et build | Réussis |
| Installation vierge du commit `f6f879c` sous Node 24.21.0 | `npm ci --ignore-scripts`, types, 85 tests, build et lint réussis |
| Lint frontend | Réussi, sans avertissement |
| Dépendances verrouillées | `npm audit` : aucune vulnérabilité connue signalée |
| HTTP réel sur port local, données fictives | Connexion, création, validation manuelle, redémarrage et relecture réussis sous Node 24 et 25 |

**85 tests automatisés**, organisés autour des pertes de données, erreurs et frontières de confiance. Les tests ne garantissent pas le comportement d'un microphone réel ou d'un fournisseur externe. Les compléments sont décrits dans [docs/manual-tests.md](docs/manual-tests.md).

## Ordre des développements suivants

1. Faire valider les champs médicaux, unités, formats et règles d'absence par un orthoptiste ; versionner toute évolution incompatible du contrat.
2. Choisir transcription, fournisseur IA et hébergement, puis ajouter l'adaptateur spécifique et ses tests de contrat. Vérifier microphone réel et conditions de traitement sur les navigateurs cibles.
3. Préparer l'exploitation : sauvegarde/restauration, rétention, gestion des comptes et secrets, contrôles du déploiement. SQLite suppose une instance avec volume durable.
4. Développer le client mobile avec les contrats HTTP, les mêmes révisions et un adaptateur vocal natif. Tester les conflits et les changements de dossier avant d'ajouter une synchronisation hors ligne.

## Limites explicites

- La validation technique du schéma d'extraction ne vaut pas validation clinique. Les unités, formats de mesures et règles métier devront être revus avec un orthoptiste.
- Le moteur Web Speech est un adaptateur facultatif de navigateur ; son traitement peut être distant. Le choix d'un fournisseur de transcription contrôlé reste configurable et à réaliser selon les besoins de déploiement. Aucun fichier audio n'est conservé.
- Le projet mobile est préparé par les contrats et l'adaptateur, mais aucune application mobile n'est demandée ni créée dans ce lot.
- Les tests automatisés de reconnaissance utilisent un recognizer simulé ; les essais microphone sur les navigateurs cibles restent une vérification manuelle.
- Les observations sont autosauvegardées ; les corrections médicales restent en mémoire jusqu'à validation. La navigation interne attend la sauvegarde ou un abandon explicite, mais une fermeture forcée ou un rechargement confirmé peut perdre les modifications locales. Aucun stockage médical dans localStorage n'est introduit.
- Aucune infrastructure hébergée ni clé fournisseur n'est créée par ces corrections.
