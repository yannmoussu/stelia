# Frontend Stelia

React, React Router, TypeScript, Vite et Tailwind. Les données proviennent du contrat canonique `@stelia/contracts` ; la couche HTTP valide les réponses à l'exécution. Les pages ne dépendent pas de types DOM pour le domaine médical.

Installer depuis la racine (`npm ci --ignore-scripts`), puis `npm run dev:frontend`. Lire le [guide de démarrage](../README.md) pour configurer le compte et le backend. Le client utilise `/api` par défaut et un cookie de session HttpOnly ; aucun jeton n'est stocké dans localStorage.

```sh
npm run typecheck --workspace frontend
npm test --workspace frontend
npm run lint --workspace frontend
npm run build --workspace frontend
```

Compiler les contrats avant un contrôle isolé : `npm run build:contracts` à la racine. Les tests React utilisent jsdom et Testing Library. Le calcul des résultats et le contrôleur de dictée sont testés sans microphone ; les essais réels restent décrits dans [manual-tests.md](../docs/manual-tests.md).

Chaque workspace de consultation possède son brouillon et sa session vocale. Les finals ajoutent des segments au texte acquis ; les interims restent séparés. Les sauvegardes sont sérialisées avec révision serveur, échecs visibles et résolution explicite des conflits. La navigation interne protège les modifications non sauvegardées.

En cas d'expiration de session, la reconnexion conserve les saisies et exige le même compte. Les corrections du compte rendu restent locales jusqu'à validation ; les observations sont autosauvegardées. Un rechargement forcé peut perdre les modifications locales malgré l'avertissement du navigateur. Aucun brouillon médical n'est enregistré dans localStorage.

La saisie manuelle reste disponible sans microphone. Web Speech est un adaptateur facultatif ; le futur mobile utilisera son propre adaptateur vocal et les mêmes contrats HTTP, conformément à [l'architecture](../docs/architecture.md).
