# HELPY v2

HELPY est une plateforme web mobile-first pour découvrir des services, entreprises et annonces.

## Déploiement Railway

1. Mets tous les fichiers de ce dossier dans ton dépôt GitHub.
2. Sur Railway, connecte le service à PostgreSQL.
3. Vérifie que la variable `DATABASE_URL` est disponible dans le service HELPY.
4. Le script de démarrage est `npm start`.
5. Railway installe automatiquement `express`, `pg`, `bcryptjs` et `cors` depuis `package.json`.
6. Après le déploiement, teste : `/api/health`.

## Fonctionnalités backend

- inscription / connexion avec mot de passe hashé
- utilisateurs
- entreprises
- services
- annonces
- recherche
- avis et note moyenne
- messages
- favoris
- PostgreSQL avec création/migration automatique des tables nécessaires

## Interface

L'accueil est mobile-first et suit la maquette HELPY fournie : hero violet, recherche, catégories, entreprises en vedette, section professionnel et navigation basse.

## Important

Le fichier `server.js` utilise PostgreSQL. Ne supprime pas `database.js` et ne retire pas `DATABASE_URL` de Railway.

Les connexions Google/Facebook de l'ancien frontend ne sont pas activées côté backend par défaut : elles nécessitent des identifiants OAuth et des variables d'environnement dédiées. La connexion email/mot de passe est prête.
