# Essais manuels complémentaires

Les tests automatiques sont exécutés par `npm run check`. Les contrôles suivants nécessitent un navigateur et, pour la dictée, un microphone réel. Utiliser uniquement des données fictives.

1. Connexion : compte configuré, mot de passe incorrect, déconnexion, expiration de session. Vérifier qu'une panne API est affichée avec possibilité de réessayer.
2. Création : nom, prénom, date de naissance, date/type de séance et notes ; double clic sur créer ; relecture exacte des champs.
3. Dictée : phrase puis stop ; reprendre avec une autre phrase ; vérifier conservation des deux. Répéter après réouverture du dossier.
4. Interim : dicter une phrase longue avec corrections du moteur ; vérifier distinction du provisoire et du texte acquis. Arrêter puis naviguer pendant la finalisation.
5. Microphone : permission refusée, périphérique indisponible, navigateur sans Web Speech ; vérifier que la saisie manuelle reste disponible.
6. Réseau : couper l'API pendant une modification ; vérifier erreur et conservation du texte. Rétablir puis sauvegarder. Ne jamais afficher « enregistré » avant succès serveur.
7. Conflit : ouvrir le même dossier dans deux onglets ; sauvegarder des modifications distinctes. Vérifier 409 et choix explicite de conservation/rechargement, jamais d'écrasement silencieux.
8. Navigation : modifier puis cliquer retour/autre dossier/déconnexion ; sauvegarder ou abandonner explicitement. Tester aussi fermeture/rechargement avec modifications en attente.
9. Redémarrage backend : vérifier conservation des dossiers. Avec deux comptes, vérifier absence du dossier d'autrui dans la liste et réponse 404 pour son identifiant.
10. IA non configurée : génération indisponible avec message explicite et données préservées. Avec un fournisseur de test, tester proposition, correction et validation ; modifier ensuite le transcript et distinguer l'ancien compte rendu validé. Tester aussi rédaction manuelle sans fournisseur.
11. Accessibilité : parcours clavier, labels de tous les champs, nom du bouton micro, annonces des erreurs et sauvegardes ; écran étroit.

La réussite des essais avec microphone n'est pas présumée à partir des tests simulés. Noter navigateur/version et moteur de transcription retenus lors de la validation réelle.
