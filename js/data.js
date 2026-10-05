// Données du programme — modifiable sans toucher au reste du code.
//
// Structure par séance (retour d'entraîneur) : Puissance/Medball/Core (3 séries, explosif)
// → Force (3 séries, reps pilotées par la périodisation) → Conditioning (finisher, fixe).
// Catégories d'exercice : "power" | "medball" | "core" (reps fixes, non périodisées)
// et "strength" (reps pilotées automatiquement par la phase en cours, voir periodization.js).
//
// Mesure notée pour chaque série ("metric") :
//   "load"  → poids + reps (poids standard selon "equipment" : barbell | dumbbell | cable | medball, voir weights.js)
//   "reps"  → reps seules, au poids du corps
//   "carry" → poids + distance en mètres (portés)
// "perDumbbell" : le poids noté est celui d'un haltère (exercice fait avec un haltère dans chaque main).

export const MOBILITY_ROUTINE = [
  { name: "Child's pose", fr: "posture de l'enfant", sub: "2 x 30s" },
  { name: "Downward dog", fr: "chien tête en bas", sub: "2 x 30s" },
  { name: "World's greatest stretch", fr: "étirement dynamique complet", sub: "2 x 5/côté" },
  { name: "Pigeon pose", fr: "posture du pigeon", sub: "2 x 60s/côté" },
  { name: "90/90 hip switches", fr: "90-90 hanches (balai)", sub: "2 x 8/côté" },
  { name: "Band shoulder rotations", fr: "rotations d'épaule à l'élastique", sub: "2 x 15" },
  { name: "Scapular wall slides", fr: "glissés scapulaires au mur", sub: "2 x 12" },
  { name: "Foam roller", fr: "rouleau : quadriceps, ischios, dos, mollets", sub: "5 min" }
];

// Finisher conditioning, identique à chaque séance (comme la routine mobilité), affiché en fin de séance :
// une option principale, et deux alternatives au choix.
export const CONDITIONING_FINISHER = {
  main: { name: "Sled push + agility ladder", fr: "poussée de traîneau + échelle d'agilité", sub: "5 tours : 20 m sled + 2 passages échelle · récup 60-90s" },
  alternatives: [
    { name: "Assault bike / rameur", fr: "sprints courts haute intensité", sub: "6 x 20s effort max / 40s récup" },
    { name: "Burpees + mountain climbers", fr: "circuit poids du corps, sans matériel", sub: "5 tours : 10 burpees + 20 mountain climbers · récup 45s" }
  ]
};

// Tractions dans chaque séance, au poids du corps : "3 x max", la progression consiste à gagner
// des reps petit à petit (pas de périodisation 8-10 → 4-6 pour cet exercice).
const PULL_UP = { id: "pull-up", category: "strength", metric: "reps", repScheme: "max", name: "Pull-up", fr: "tractions (poids du corps)", sets: 3, rest: "90s", muscles: { front: ["biceps"], back: ["lats", "traps"] }, yt: "strict pull up technique" };

export const SESSIONS = {
  a: [
    { id: "squat-jump", category: "power", metric: "reps", name: "Squat jump", fr: "squat sauté", sub: "3 x 6 · repos 60s", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "squat jump technique" },
    { id: "medball-rotational-throw", category: "medball", metric: "load", equipment: "medball", name: "Medicine ball rotational throw", fr: "lancer rotatif medecine ball", sub: "3 x 6/côté · repos 45s", muscles: { front: ["obliques", "abs"], back: ["lats"] }, yt: "medicine ball rotational throw technique" },
    { id: "pallof-press", category: "core", metric: "load", equipment: "cable", name: "Pallof press", fr: "gainage anti-rotation", sub: "3 x 12/côté", muscles: { front: ["abs", "obliques"], back: [] }, yt: "pallof press technique" },
    { id: "goblet-squat", category: "strength", metric: "load", equipment: "dumbbell", name: "Goblet squat", fr: "squat gobelet", sets: 3, rest: "90s", muscles: { front: ["quads"], back: ["glutes"] }, yt: "goblet squat technique" },
    { id: "bench-press", category: "strength", metric: "load", equipment: "barbell", name: "Bench press", fr: "développé couché", sets: 3, rest: "90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "bench press technique" },
    { id: "bent-over-row", category: "strength", metric: "load", equipment: "barbell", name: "Bent-over row", fr: "rowing buste penché", sets: 3, rest: "90s", muscles: { front: ["biceps"], back: ["lats", "traps", "lowerback"] }, yt: "bent over row technique" },
    PULL_UP
  ],
  b: [
    { id: "lateral-bound", category: "power", metric: "reps", name: "Lateral bound (skater jump)", fr: "saut latéral", sub: "3 x 6/côté · repos 60s", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "skater jump lateral bound technique" },
    { id: "medball-overhead-slam", category: "medball", metric: "load", equipment: "medball", name: "Medicine ball overhead slam", fr: "slam medecine ball au-dessus de la tête", sub: "3 x 8 · repos 45s", muscles: { front: ["shoulders", "abs"], back: ["lats", "triceps"] }, yt: "medicine ball overhead slam technique" },
    // Remplace le side plank (mesuré en secondes) : gainage latéral chargé, mesuré en poids + distance.
    // noPhoto : aucune photo libre de droits ne montre un suitcase carry (un seul haltère).
    { id: "suitcase-carry", category: "core", metric: "carry", equipment: "dumbbell", targetDistanceM: 20, noPhoto: true, name: "Suitcase carry", fr: "marche avec un haltère d'un seul côté, buste droit", sub: "3 x 20 m/côté · repos 60s", muscles: { front: ["obliques", "abs"], back: ["traps"] }, yt: "suitcase carry technique" },
    { id: "romanian-deadlift", category: "strength", metric: "load", equipment: "barbell", name: "Romanian deadlift", fr: "soulevé de terre roumain", sets: 3, rest: "90s", muscles: { front: [], back: ["hamstrings", "glutes", "lowerback"] }, yt: "romanian deadlift technique" },
    { id: "overhead-press", category: "strength", metric: "load", equipment: "barbell", name: "Overhead press", fr: "développé militaire", sets: 3, rest: "75s", muscles: { front: ["shoulders"], back: ["triceps"] }, yt: "overhead press technique" },
    PULL_UP,
    { id: "lat-pulldown", category: "strength", metric: "load", equipment: "cable", name: "Lat pulldown", fr: "tirage vertical", sets: 3, rest: "75s", muscles: { front: ["biceps"], back: ["lats"] }, yt: "lat pulldown technique" }
  ],
  c: [
    { id: "broad-jump", category: "power", metric: "reps", name: "Broad jump", fr: "saut en longueur", sub: "3 x 5 · repos 60s", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "broad jump technique" },
    // noPhoto : aucune photo libre de droits ne montre ce mouvement (lancer de côté contre un mur), seul le lien vidéo est affiché.
    { id: "medball-scoop-toss", category: "medball", metric: "load", equipment: "medball", noPhoto: true, name: "Medicine ball side scoop toss", fr: "lancer latéral contre un mur (medecine ball)", sub: "3 x 8/côté · repos 45s", muscles: { front: ["obliques", "abs"], back: ["glutes"] }, yt: "medicine ball rotational scoop toss against wall" },
    { id: "dead-bug", category: "core", metric: "reps", name: "Dead bug", fr: "gainage anti-extension", sub: "3 x 10/côté", muscles: { front: ["abs"], back: [] }, yt: "dead bug exercise technique" },
    { id: "bulgarian-split-squat", category: "strength", metric: "load", equipment: "dumbbell", perDumbbell: true, name: "Bulgarian split squat", fr: "fente bulgare", sets: 3, rest: "75s", muscles: { front: ["quads"], back: ["glutes", "hamstrings"] }, yt: "bulgarian split squat technique" },
    { id: "incline-db-press", category: "strength", metric: "load", equipment: "dumbbell", perDumbbell: true, name: "Incline dumbbell press", fr: "développé incliné haltères", sets: 3, rest: "90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "incline dumbbell press technique" },
    { id: "single-arm-row", category: "strength", metric: "load", equipment: "dumbbell", name: "Single-arm dumbbell row", fr: "rowing haltère unilatéral", sets: 3, rest: "75s", muscles: { front: ["biceps"], back: ["lats", "traps"] }, yt: "single arm dumbbell row technique" },
    PULL_UP
  ]
};

export const LOWER_BODY_MUSCLES = ["quads", "glutes", "hamstrings", "calves"];

// Retourne l'exercice (avec son jour) pour un id donné, ou null.
export function findExercise(exerciseId) {
  for (const day of Object.keys(SESSIONS)) {
    const ex = SESSIONS[day].find((e) => e.id === exerciseId);
    if (ex) return ex;
  }
  return null;
}

export function isLowerBodyExercise(exercise) {
  const all = [...exercise.muscles.front, ...exercise.muscles.back];
  return all.some((m) => LOWER_BODY_MUSCLES.includes(m));
}
