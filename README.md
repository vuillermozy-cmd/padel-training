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

Les photos de démonstration des exercices (`img/exercises/`) proviennent de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domaine public, licence Unlicense), tout comme la plupart des photos des routines (`img/routine/`).

Photos de Wikimedia Commons utilisées dans `img/routine/` (redimensionnées) :

- `downward-dog` : [Downward-Facing-Dog.JPG](https://commons.wikimedia.org/wiki/File:Downward-Facing-Dog.JPG), Iveto, CC BY 3.0
- `lizard-pose` : [Yoga class in Lizard pose.jpg](https://commons.wikimedia.org/wiki/File:Yoga_class_in_Lizard_pose.jpg), Rafael Montilla, CC BY-SA 2.0
- `cobra` : [Bhujangasana Yoga-Asana Nina-Mel.jpg](https://commons.wikimedia.org/wiki/File:Bhujangasana_Yoga-Asana_Nina-Mel.jpg), Kennguru, CC BY 3.0
- `assault-bike` : [Assault Bike Spartan Games 2.jpg](https://commons.wikimedia.org/wiki/File:Assault_Bike_Spartan_Games_2.jpg), HybridFitty, CC BY 4.0
- `burpee` : [Burpee 2 Squat.jpg](https://commons.wikimedia.org/wiki/File:Burpee_2_Squat.jpg) et [Burpee 5 Thrust.jpg](https://commons.wikimedia.org/wiki/File:Burpee_5_Thrust.jpg), Taco fleur, CC BY-SA 4.0
