// Données du programme — modifiable sans toucher au reste du code.

export const MOBILITY_ROUTINE = [
  { name: "Hip circles / leg swings", fr: "cercles de hanche / balancements", sub: "2 x 10/côté" },
  { name: "World's greatest stretch", fr: "étirement dynamique complet", sub: "2 x 5/côté" },
  { name: "Band shoulder rotations", fr: "rotations d'épaule à l'élastique", sub: "2 x 15" },
  { name: "Scapular wall slides", fr: "glissés scapulaires au mur", sub: "2 x 12" },
  { name: "Thoracic spine rotation", fr: "rotation thoracique", sub: "2 x 8/côté" },
  { name: "90/90 hip stretch", fr: "étirement hanche 90/90", sub: "2 x 45s/côté" },
  { name: "Pigeon pose", fr: "posture du pigeon", sub: "2 x 60s/côté" },
  { name: "Hamstring stretch", fr: "étirement ischio-jambiers", sub: "2 x 45s/côté" },
  { name: "Pec doorway stretch", fr: "étirement pectoraux au cadre de porte", sub: "2 x 45s" },
  { name: "Ankle mobility drill (knee-to-wall)", fr: "mobilité cheville, genou au mur", sub: "2 x 10/côté" }
];

export const SESSIONS = {
  a: [
    { id: "squat-jump", name: "Squat jump", fr: "squat sauté", sub: "3 x 6 · repos 60s", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "squat jump technique" },
    { id: "back-squat", name: "Back squat", fr: "squat arrière", sub: "4 x 6-8 · repos 90s", muscles: { front: ["quads"], back: ["glutes", "hamstrings", "lowerback"] }, yt: "back squat technique" },
    { id: "bulgarian-split-squat", name: "Bulgarian split squat", fr: "fente bulgare", sub: "3 x 8/jambe · repos 75s", muscles: { front: ["quads"], back: ["glutes", "hamstrings"] }, yt: "bulgarian split squat technique" },
    { id: "bench-press", name: "Bench press", fr: "développé couché", sub: "4 x 8-10 · repos 90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "bench press technique" },
    { id: "bent-over-row", name: "Bent-over row", fr: "rowing buste penché", sub: "4 x 8-10 · repos 90s", muscles: { front: ["biceps"], back: ["lats", "traps", "lowerback"] }, yt: "bent over row technique" },
    { id: "pallof-press", name: "Pallof press", fr: "gainage anti-rotation", sub: "3 x 12/côté", muscles: { front: ["abs", "obliques"], back: [] }, yt: "pallof press technique" }
  ],
  b: [
    { id: "lateral-bound", name: "Lateral bound (skater jump)", fr: "saut latéral", sub: "3 x 8/côté · repos 60s", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "skater jump lateral bound technique" },
    { id: "romanian-deadlift", name: "Romanian deadlift", fr: "soulevé de terre roumain", sub: "4 x 8 · repos 90s", muscles: { front: [], back: ["hamstrings", "glutes", "lowerback"] }, yt: "romanian deadlift technique" },
    { id: "lateral-lunge", name: "Lateral lunge", fr: "fente latérale", sub: "3 x 8/jambe · repos 75s", muscles: { front: ["quads"], back: ["glutes", "hamstrings"] }, yt: "lateral lunge technique" },
    { id: "overhead-press", name: "Overhead press", fr: "développé militaire", sub: "3 x 10 · repos 75s", muscles: { front: ["shoulders"], back: ["triceps"] }, yt: "overhead press technique" },
    { id: "lat-pulldown", name: "Lat pulldown", fr: "tirage vertical", sub: "4 x 8-10 · repos 75s", muscles: { front: ["biceps"], back: ["lats"] }, yt: "lat pulldown technique" },
    { id: "face-pull", name: "Face pull", fr: "tirage visage", sub: "3 x 15 · repos 45s", muscles: { front: ["shoulders"], back: ["traps"] }, yt: "face pull technique shoulder health" },
    { id: "side-plank", name: "Side plank", fr: "gainage latéral", sub: "3 x 30s/côté", muscles: { front: ["abs", "obliques"], back: [] }, yt: "side plank technique" }
  ],
  c: [
    { id: "broad-jump", name: "Broad jump", fr: "saut en longueur", sub: "3 x 5", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "broad jump technique" },
    { id: "front-squat", name: "Front squat / goblet squat", fr: "squat avant / squat gobelet", sub: "4 x 8 · repos 90s", muscles: { front: ["quads"], back: ["glutes"] }, yt: "front squat goblet squat technique" },
    { id: "step-up", name: "Step-up", fr: "montée sur banc", sub: "3 x 8/jambe · repos 75s", muscles: { front: ["quads"], back: ["glutes", "hamstrings"] }, yt: "step up exercise technique" },
    { id: "incline-db-press", name: "Incline dumbbell press", fr: "développé incliné haltères", sub: "4 x 8-10 · repos 90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "incline dumbbell press technique" },
    { id: "single-arm-row", name: "Single-arm dumbbell row", fr: "rowing haltère unilatéral", sub: "4 x 8-10/côté · repos 75s", muscles: { front: ["biceps"], back: ["lats", "traps"] }, yt: "single arm dumbbell row technique" },
    { id: "external-rotation", name: "External rotation (cable/band)", fr: "rotation externe poulie/élastique", sub: "3 x 15", muscles: { front: ["shoulders"], back: [] }, yt: "external rotation cable shoulder technique" },
    { id: "dead-bug", name: "Dead bug", fr: "gainage anti-extension", sub: "3 x 10/côté", muscles: { front: ["abs"], back: [] }, yt: "dead bug exercise technique" }
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
