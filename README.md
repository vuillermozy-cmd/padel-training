# Padel Training

Application de suivi d'entraînement physique complémentaire au padel. Stack 100% statique (HTML/CSS/JS vanilla, pas de build), données stockées en local via `localStorage`, synchronisables entre appareils via un Gist privé.

Chaque séance est composée à la volée, toujours dans le même ordre : Mobilité → Appuis → Duo puissance → Duo rotation & core → Force (jambes, poussée, tirage, tractions) → Conditioning → Retour au calme. L'app affiche une carte par étape : on garde l'exercice proposé (bouton ou swipe à droite), ou on en demande un équivalent du même type de mouvement (bouton ou swipe à gauche). Un exercice peut aussi être exclu définitivement, et remis depuis l'onglet Progression.

## Organisation du code

- `js/data.js` : banque d'exercices (avec leur type de mouvement), appuis, finishers, étirements et déroulé d'une séance.
- `js/planner.js` : composition de la séance du jour et choix des équivalents (sans accès au navigateur).
- `js/storage.js` : séries, préférences (exclusions) et plan du jour dans `localStorage`.
- `js/sync.js` : synchronisation via un Gist privé GitHub.
- `js/progression.js`, `js/periodization.js`, `js/weights.js` : suggestion de charge, phases de reps, poids standards de salle.
- `js/app.js` : affichage et interactions.

## Tests

```bash
node --test tests/*.test.mjs
```

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
