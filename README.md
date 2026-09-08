# Padel Training

Application de suivi d'entraînement physique complémentaire au padel (programme 3 séances full body A/B/C). Stack 100% statique (HTML/CSS/JS vanilla, pas de build), données stockées en local via `localStorage`.

## Développement local

Ouvrir `index.html` via un petit serveur statique (nécessaire car les modules JS utilisent `import`/`export`) :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Déploiement GitHub Pages

1. Pousser ce dossier sur la branche `main` d'un dépôt GitHub.
2. Dans les paramètres du dépôt → **Pages**, choisir la source "Deploy from a branch", branche `main`, dossier `/ (root)`.
3. L'app sera disponible à `https://<compte>.github.io/<nom-du-depot>/`.

Aucune étape de build n'est nécessaire.

## Crédits

Les photos de démonstration des exercices (`img/exercises/`) proviennent de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domaine public, licence Unlicense).
