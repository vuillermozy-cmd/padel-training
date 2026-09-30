// Données du programme — modifiable sans toucher au reste du code.
//
// Structure par séance (retour d'entraîneur) : Puissance/Medball/Core (3 séries, explosif)
// → Force (3 séries, reps pilotées par la périodisation) → Conditioning (finisher, fixe).
// Catégories d'exercice : "power" | "medball" | "core" (reps fixes, non périodisées)
// et "strength" (reps pilotées automatiquement par la phase en cours, voir periodization.js).

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
    { name: "Jump rope", fr: "corde à sauter, intervalles rythme rapide", sub: "5 x 30s rapide / 30s récup" }
  ]
};

// Tractions dans chaque séance. "assisted" : le champ poids note l'assistance (machine ou élastique),
// donc la progression consiste à la réduire jusqu'à 0 (tractions au poids du corps).
const ASSISTED_PULL_UP = { id: "assisted-pull-up", category: "strength", assisted: true, name: "Assisted pull-up", fr: "tractions assistées (machine ou élastique)", sets: 3, rest: "90s", muscles: { front: ["biceps"], back: ["lats", "traps"] }, yt: "assisted pull up technique" };

export const SESSIONS = {
  a: [
    { id: "squat-jump", category: "power", name: "Squat jump", fr: "squat sauté", sub: "3 x 6 · repos 60s", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "squat jump technique" },
    { id: "medball-rotational-throw", category: "medball", name: "Medicine ball rotational throw", fr: "lancer rotatif medecine ball", sub: "3 x 6/côté · repos 45s", muscles: { front: ["obliques", "abs"], back: ["lats"] }, yt: "medicine ball rotational throw technique" },
    { id: "pallof-press", category: "core", name: "Pallof press", fr: "gainage anti-rotation", sub: "3 x 12/côté", muscles: { front: ["abs", "obliques"], back: [] }, yt: "pallof press technique" },
    { id: "goblet-squat", category: "strength", name: "Goblet squat", fr: "squat gobelet", sets: 3, rest: "90s", muscles: { front: ["quads"], back: ["glutes"] }, yt: "goblet squat technique" },
    { id: "bench-press", category: "strength", name: "Bench press", fr: "développé couché", sets: 3, rest: "90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "bench press technique" },
    { id: "bent-over-row", category: "strength", name: "Bent-over row", fr: "rowing buste penché", sets: 3, rest: "90s", muscles: { front: ["biceps"], back: ["lats", "traps", "lowerback"] }, yt: "bent over row technique" },
    ASSISTED_PULL_UP
  ],
  b: [
    { id: "lateral-bound", category: "power", name: "Lateral bound (skater jump)", fr: "saut latéral", sub: "3 x 6/côté · repos 60s", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "skater jump lateral bound technique" },
    { id: "medball-overhead-slam", category: "medball", name: "Medicine ball overhead slam", fr: "slam medecine ball au-dessus de la tête", sub: "3 x 8 · repos 45s", muscles: { front: ["shoulders", "abs"], back: ["lats", "triceps"] }, yt: "medicine ball overhead slam technique" },
    { id: "side-plank", category: "core", name: "Side plank", fr: "gainage latéral", sub: "3 x 30s/côté", muscles: { front: ["abs", "obliques"], back: [] }, yt: "side plank technique" },
    { id: "romanian-deadlift", category: "strength", name: "Romanian deadlift", fr: "soulevé de terre roumain", sets: 3, rest: "90s", muscles: { front: [], back: ["hamstrings", "glutes", "lowerback"] }, yt: "romanian deadlift technique" },
    { id: "overhead-press", category: "strength", name: "Overhead press", fr: "développé militaire", sets: 3, rest: "75s", muscles: { front: ["shoulders"], back: ["triceps"] }, yt: "overhead press technique" },
    ASSISTED_PULL_UP,
    { id: "lat-pulldown", category: "strength", name: "Lat pulldown", fr: "tirage vertical", sets: 3, rest: "75s", muscles: { front: ["biceps"], back: ["lats"] }, yt: "lat pulldown technique" }
  ],
  c: [
    { id: "broad-jump", category: "power", name: "Broad jump", fr: "saut en longueur", sub: "3 x 5 · repos 60s", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "broad jump technique" },
    { id: "medball-scoop-toss", category: "medball", name: "Medicine ball scoop toss", fr: "lancer scoop medecine ball", sub: "3 x 8 · repos 45s", muscles: { front: ["quads", "abs"], back: ["glutes", "hamstrings"] }, yt: "medicine ball scoop toss technique" },
    { id: "dead-bug", category: "core", name: "Dead bug", fr: "gainage anti-extension", sub: "3 x 10/côté", muscles: { front: ["abs"], back: [] }, yt: "dead bug exercise technique" },
    { id: "bulgarian-split-squat", category: "strength", name: "Bulgarian split squat", fr: "fente bulgare", sets: 3, rest: "75s", muscles: { front: ["quads"], back: ["glutes", "hamstrings"] }, yt: "bulgarian split squat technique" },
    { id: "incline-db-press", category: "strength", name: "Incline dumbbell press", fr: "développé incliné haltères", sets: 3, rest: "90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "incline dumbbell press technique" },
    { id: "single-arm-row", category: "strength", name: "Single-arm dumbbell row", fr: "rowing haltère unilatéral", sets: 3, rest: "75s", muscles: { front: ["biceps"], back: ["lats", "traps"] }, yt: "single arm dumbbell row technique" },
    ASSISTED_PULL_UP
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
