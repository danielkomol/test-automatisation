# Objectif 1 : todo-app instantanée chiffrée de bout en bout, avec chatbot intégré

Objectif commun à toutes les équipes, **multiplateforme** (Linux, Windows, Mac, Android, iOS, web…).
Chaque équipe choisit **une seule plateforme** et travaille dans son sous-dossier : `<plateforme>/`.

## Tâches (dans l'ordre : on ne reçoit la suivante qu'après avoir validé la précédente)
1. Terminer la configuration complète de votre profil sur le site Foundation.
2. Rejoindre l'organisation GitHub et ce dépôt.
3. Choisir la plateforme de l'équipe.
4. Installer l'environnement de travail complet (git, extensions, outils de compilation).
5. Cloner le projet depuis ce dépôt et le compiler en local.

Le détail et l'état de vos tâches sont sur le site Foundation, dans « Mes tâches ».

## Séances live
- Introduction aux systèmes d'information client/serveur
- Introduction à la cryptographie

## Tests

Les tests d'interface de base sont lancés avec `npm run test:run`. Le workflow GitHub Actions les exécute, puis construit l'application à chaque push et pull request.

Le test navigateur k6 utilise Chromium et IndexedDB réels. Il lance jusqu'à trois navigateurs virtuels, crée un projet et une tâche dans chacun, vérifie l'isolation des bases, puis teste l'ajout, la lecture, la modification, la validation, la persistance après rechargement et la suppression.

Pour lancer le test localement, démarrez Vite dans un premier terminal avec `npm run dev`, puis lancez `npm run test:browser:load` dans un second terminal. k6 doit être installé séparément. L'URL peut être remplacée avec la variable `BASE_URL`.
