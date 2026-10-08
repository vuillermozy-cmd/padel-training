// Données du programme — modifiable sans toucher au reste du code.
//
// Structure par séance (retour d'entraîneur) :
//   Mobilité → Puissance, medball & core (2 duos enchaînés) → Force (3 séries, reps pilotées par la
//   périodisation) → Conditioning (3 finishers au choix) → Retour au calme (étirements selon la séance).
// Catégories d'exercice : "power" | "medball" | "core" (reps fixes, non périodisées, regroupées en duos via "duo")
// et "strength" (reps pilotées automatiquement par la phase en cours, voir periodization.js).
//
// Mesure notée pour chaque série ("metric") :
//   "load"  → poids + reps (poids standard selon "equipment" : barbell | dumbbell | cable | medball, voir weights.js)
//   "reps"  → reps seules, au poids du corps
//   "carry" → poids + distance en mètres (portés)
// "perDumbbell" : le poids noté est celui d'un haltère (exercice fait avec un haltère dans chaque main).

// Routine d'échauffement, identique à chaque séance : uniquement du dynamique, sans mur ni matériel lourd.
export const MOBILITY_ROUTINE = [
  { name: "Child's pose", fr: "posture de l'enfant", sub: "2 x 30s" },
  { name: "Downward dog", fr: "chien tête en bas", sub: "2 x 30s" },
  { name: "World's greatest stretch", fr: "étirement dynamique complet", sub: "2 x 5/côté" },
  { name: "Cossack squat", fr: "squat latéral profond, d'un côté à l'autre", sub: "2 x 6/côté" },
  { name: "90/90 hip switches", fr: "90-90 hanches (balai)", sub: "2 x 8/côté" },
  { name: "Band shoulder rotations", fr: "rotations d'épaule à l'élastique", sub: "2 x 15" },
  { name: "Band pull-aparts", fr: "écartés d'élastique, omoplates serrées", sub: "2 x 15" }
];

// Duos de la section Puissance, medball & core : 3 tours, on enchaîne les deux exercices puis on récupère.
export const DUO_REST = { 1: "90s", 2: "60s" };

// Tractions dans chaque séance, au poids du corps : "3 x max", la progression consiste à gagner
// des reps petit à petit (pas de périodisation 8-10 → 4-6 pour cet exercice).
const PULL_UP = { id: "pull-up", category: "strength", metric: "reps", repScheme: "max", name: "Pull-up", fr: "tractions (poids du corps)", sets: 3, rest: "90s", muscles: { front: ["biceps"], back: ["lats", "traps"] }, yt: "strict pull up technique" };

export const SESSIONS = {
  a: [
    // Duo 1 : saut vertical + poussée du haut du corps.
    { id: "box-jump", category: "power", duo: 1, metric: "reps", name: "Box jump", fr: "saut sur box, réception amortie", sub: "3 x 5", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "box jump technique" },
    { id: "push-up", category: "power", duo: 1, metric: "reps", name: "Push-up", fr: "pompes", sub: "3 x 10", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "push up proper form" },
    // Duo 2 : puissance rotative + anti-rotation.
    // noPhoto : la seule photo libre de droits montrait un passage de ballon dos à dos, pas un lancer contre un mur.
    { id: "medball-rotational-throw", category: "medball", duo: 2, metric: "load", equipment: "medball", noPhoto: true, name: "Medicine ball rotational throw", fr: "lancer rotatif medecine ball", sub: "3 x 6/côté", muscles: { front: ["obliques", "abs"], back: ["lats"] }, yt: "medicine ball rotational throw technique" },
    { id: "pallof-press", category: "core", duo: 2, metric: "load", equipment: "cable", name: "Pallof press", fr: "gainage anti-rotation", sub: "3 x 12/côté", muscles: { front: ["abs", "obliques"], back: [] }, yt: "pallof press technique" },
    { id: "goblet-squat", category: "strength", metric: "load", equipment: "dumbbell", name: "Goblet squat", fr: "squat gobelet", sets: 3, rest: "90s", muscles: { front: ["quads"], back: ["glutes"] }, yt: "goblet squat technique" },
    { id: "bench-press", category: "strength", metric: "load", equipment: "barbell", name: "Bench press", fr: "développé couché", sets: 3, rest: "90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "bench press technique" },
    { id: "bent-over-row", category: "strength", metric: "load", equipment: "barbell", name: "Bent-over row", fr: "rowing buste penché", sets: 3, rest: "90s", muscles: { front: ["biceps"], back: ["lats", "traps", "lowerback"] }, yt: "bent over row technique" },
    PULL_UP
  ],
  b: [
    // Duo 1 : saut latéral + poussée explosive du haut du corps.
    { id: "lateral-bound", category: "power", duo: 1, metric: "reps", name: "Lateral bound (skater jump)", fr: "saut latéral", sub: "3 x 6/côté", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "skater jump lateral bound technique" },
    { id: "medball-chest-pass", category: "medball", duo: 1, metric: "load", equipment: "medball", name: "Medicine ball chest pass", fr: "passe poitrine explosive contre un mur", sub: "3 x 8", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "medicine ball chest pass wall" },
    // Duo 2 : puissance en extension + gainage latéral chargé.
    { id: "medball-overhead-slam", category: "medball", duo: 2, metric: "load", equipment: "medball", name: "Medicine ball overhead slam", fr: "slam medecine ball au-dessus de la tête", sub: "3 x 8", muscles: { front: ["shoulders", "abs"], back: ["lats", "triceps"] }, yt: "medicine ball overhead slam technique" },
    // Remplace le side plank (mesuré en secondes) : gainage latéral chargé, mesuré en poids + distance.
    // noPhoto : aucune photo libre de droits ne montre un suitcase carry (un seul haltère).
    { id: "suitcase-carry", category: "core", duo: 2, metric: "carry", equipment: "dumbbell", targetDistanceM: 20, noPhoto: true, name: "Suitcase carry", fr: "marche avec un haltère d'un seul côté, buste droit", sub: "3 x 20 m/côté", muscles: { front: ["obliques", "abs"], back: ["traps"] }, yt: "suitcase carry technique" },
    { id: "romanian-deadlift", category: "strength", metric: "load", equipment: "barbell", name: "Romanian deadlift", fr: "soulevé de terre roumain", sets: 3, rest: "90s", muscles: { front: [], back: ["hamstrings", "glutes", "lowerback"] }, yt: "romanian deadlift technique" },
    { id: "overhead-press", category: "strength", metric: "load", equipment: "barbell", name: "Overhead press", fr: "développé militaire", sets: 3, rest: "75s", muscles: { front: ["shoulders"], back: ["triceps"] }, yt: "overhead press technique" },
    PULL_UP,
    { id: "lat-pulldown", category: "strength", metric: "load", equipment: "cable", name: "Lat pulldown", fr: "tirage vertical", sets: 3, rest: "75s", muscles: { front: ["biceps"], back: ["lats"] }, yt: "lat pulldown technique" }
  ],
  c: [
    // Duo 1 : saut horizontal + pompes explosives.
    { id: "broad-jump", category: "power", duo: 1, metric: "reps", name: "Broad jump", fr: "saut en longueur", sub: "3 x 5", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "broad jump technique" },
    { id: "plyo-push-up", category: "power", duo: 1, metric: "reps", name: "Plyo push-up", fr: "pompes explosives (sur les genoux si besoin)", sub: "3 x 6", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "plyometric push up technique" },
    // Duo 2 : lancer rotatif + anti-extension.
    // noPhoto : aucune photo libre de droits ne montre ce mouvement (lancer de côté contre un mur), seul le lien vidéo est affiché.
    { id: "medball-scoop-toss", category: "medball", duo: 2, metric: "load", equipment: "medball", noPhoto: true, name: "Medicine ball side scoop toss", fr: "lancer latéral contre un mur (medecine ball)", sub: "3 x 8/côté", muscles: { front: ["obliques", "abs"], back: ["glutes"] }, yt: "medicine ball rotational scoop toss against wall" },
    { id: "dead-bug", category: "core", duo: 2, metric: "reps", name: "Dead bug", fr: "gainage anti-extension", sub: "3 x 10/côté", muscles: { front: ["abs"], back: [] }, yt: "dead bug exercise technique" },
    { id: "bulgarian-split-squat", category: "strength", metric: "load", equipment: "dumbbell", perDumbbell: true, name: "Bulgarian split squat", fr: "fente bulgare", sets: 3, rest: "75s", muscles: { front: ["quads"], back: ["glutes", "hamstrings"] }, yt: "bulgarian split squat technique" },
    { id: "incline-db-press", category: "strength", metric: "load", equipment: "dumbbell", perDumbbell: true, name: "Incline dumbbell press", fr: "développé incliné haltères", sets: 3, rest: "90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "incline dumbbell press technique" },
    { id: "single-arm-row", category: "strength", metric: "load", equipment: "dumbbell", name: "Single-arm dumbbell row", fr: "rowing haltère unilatéral", sets: 3, rest: "75s", muscles: { front: ["biceps"], back: ["lats", "traps"] }, yt: "single arm dumbbell row technique" },
    PULL_UP
  ]
};

// 3 finishers au choix par séance (pas de corde à sauter à la salle).
export const FINISHERS = {
  a: [
    { name: "Sled push + agility ladder", fr: "poussée de traîneau + échelle d'agilité", detail: "5 tours : 20 m de sled + 2 passages d'échelle. Récup 60-90s entre les tours." },
    { name: "Assault bike sprints", fr: "sprints courts haute intensité", detail: "8 x 15s à fond, 45s de pédalage léger entre chaque." },
    { name: "Navettes 5-10-5", fr: "changements de direction façon padel", detail: "6 navettes : 5 m à droite, 10 m à gauche, 5 m retour, en touchant le sol. Récup 45s." }
  ],
  b: [
    { name: "Rameur 250 m", fr: "intervalles au rameur", detail: "5 x 250 m à fond. Récup 1 min entre chaque." },
    { name: "Swings + burpees (EMOM 8 min)", fr: "kettlebell ou haltère, une tâche par minute", detail: "Minutes impaires : 15 swings. Minutes paires : 8 burpees. Le reste de la minute = récup." },
    { name: "Échelle d'agilité + pas chassés", fr: "appuis rapides et déplacements latéraux", detail: "6 tours : 1 passage d'échelle + 10 m de pas chassés aller-retour. Récup 45s." }
  ],
  c: [
    { name: "Sled push lourd", fr: "poussée de traîneau chargée", detail: "6 x 15 m, aussi lourd que possible en restant rapide. Récup 60s." },
    { name: "Assault bike Tabata", fr: "intervalles très courts", detail: "8 x 20s à fond / 10s de récup (4 min). Puis 2 min de pédalage léger." },
    { name: "Burpees + mountain climbers", fr: "circuit poids du corps, sans matériel", detail: "5 tours : 10 burpees + 20 mountain climbers. Récup 45s." }
  ]
};

// Retour au calme : rouleau puis étirements statiques et yoga ciblés sur les muscles travaillés dans la séance.
const FOAM_ROLLER = { name: "Foam roller", fr: "rouleau : mollets, quadriceps, ischios, dos", sub: "5 min" };

export const COOLDOWN = {
  a: [
    FOAM_ROLLER,
    { name: "Pigeon pose", fr: "posture du pigeon (yoga), fessiers et hanches", sub: "45s/côté" },
    { name: "Thread the needle", fr: "rotation thoracique au sol (yoga), haut du dos", sub: "30s/côté" },
    { name: "Kneeling lat stretch", fr: "à genoux, coudes sur un banc, dorsaux", sub: "2 x 30s" },
    { name: "Floor chest opener", fr: "allongé sur le ventre, bras en T, pectoraux", sub: "30s/côté" }
  ],
  b: [
    FOAM_ROLLER,
    { name: "Seated forward fold", fr: "pince assise (yoga), ischios et bas du dos", sub: "2 x 45s" },
    { name: "Lizard pose", fr: "posture du lézard (yoga), fléchisseurs de hanche", sub: "45s/côté" },
    { name: "Child's pose side reach", fr: "posture de l'enfant bras sur le côté, dorsaux", sub: "30s/côté" },
    { name: "Cross-body shoulder stretch", fr: "bras tendu devant la poitrine, épaules", sub: "30s/côté" }
  ],
  c: [
    FOAM_ROLLER,
    { name: "Couch stretch", fr: "genou au sol, pied sur un banc, quadriceps et psoas", sub: "45s/côté" },
    { name: "Pigeon pose", fr: "posture du pigeon (yoga), fessiers et hanches", sub: "45s/côté" },
    { name: "Cobra", fr: "cobra (yoga), abdos et ouverture de la poitrine", sub: "2 x 30s" },
    { name: "Thread the needle", fr: "rotation thoracique au sol (yoga), haut du dos", sub: "30s/côté" }
  ]
};

export const LOWER_BODY_MUSCLES = ["quads", "glutes", "hamstrings", "calves"];

// Retourne l'exercice pour un id donné, ou null (ex. exercice retiré du programme mais encore dans l'historique).
export function findExercise(exerciseId) {
  for (const day of Object.keys(SESSIONS)) {
    const ex = SESSIONS[day].find((e) => e.id === exerciseId);
    if (ex) return ex;
  }
  return null;
}

// Noms des exercices retirés du programme, pour afficher proprement les anciennes séances.
const RETIRED_EXERCISE_NAMES = {
  "squat-jump": "Squat jump", "back-squat": "Back squat", "front-squat": "Front squat",
  "side-plank": "Side plank", "assisted-pull-up": "Assisted pull-up", "lateral-lunge": "Lateral lunge",
  "step-up": "Step-up", "face-pull": "Face pull", "external-rotation": "External rotation"
};

export function exerciseName(exerciseId) {
  const ex = findExercise(exerciseId);
  return ex ? ex.name : RETIRED_EXERCISE_NAMES[exerciseId] || exerciseId;
}

export function isLowerBodyExercise(exercise) {
  const all = [...exercise.muscles.front, ...exercise.muscles.back];
  return all.some((m) => LOWER_BODY_MUSCLES.includes(m));
}
