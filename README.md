## Description

API pour M-motors (employé et client).

## Outils et technologies

- NestJS et Angular 21
- PostgreSQL
- Supabase (Database et Storage)
- Bootstrap
- Sentry
- VSCode
- Postman
- Render

## Branches

- main: code déployé sur la production
- dev: code déployé sur le staging (pour l’US en cours de développement)

Convention de commit
- Ajout d’une feature: “added …” 
- Réglage de bug: “fix:...” 

## Commandes

Pour lancer le serveur en local et en hot reloading
```bash
  npm run start:dev
```

## Développement d'une US (CI/CD)

- Lecture de l'US, compréhension du besoin et évaluation des dépendances (besoin de code sur le backend, ou juste sur le front client par exemple)
- Une fois sur le repo, on pull main sur dev pour être sûr d'être à jour et on développe l'US sur dev
- Vérification de l'implémentation en local pendant le développement. Si l'implémentation en local marche: mise à jour de la documentation, écriture/mise à jour des tests puis déploiement du code sur dev. Sinon, on modifie le code et on re regarde en local.
- Une fois déployé sur dev, vérification sur le site de staging. Si tout marche et correspond au besoin, on fait une demande de pull request de dev à main et on merge sur main (avec des rebases si besoin). Sinon on retourne modifier le code et on repousse sur dev avec les nouvelles modifications.
- Vérification du code déployé sur la production, si cela correspond aux critères d’acceptation, l'US est considérée 'terminée'. 

Dans le cas du test en local, Postman est utilisé pour tester les requêtes vers le serveur. On utilise 3 environments Postman différents avec des URL dynamiques, pour tester en local, dev, et production. Exemple: \<\<url\>\>/auth/login.

## Déploiement

- Render
- Chaque projet (back, deux front) et chaque branche a un déploiement (ex: back-end production et back-end staging, qui correspond à dev) qui se rebuild automatiquement avec chaque commit.
