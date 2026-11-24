// Données du programme : banque d'exercices et déroulé d'une séance. Modifiable sans toucher au reste du code.
//
// Une séance n'est plus une liste fixe A/B/C : elle est composée à la volée (voir planner.js) en suivant
// toujours la même structure (STEPS) : Mobilité → Appuis → 2 duos (puissance, rotation & core) → Force
// (jambes, poussée, tirage, tractions) → Conditioning → Retour au calme.
// Chaque exercice appartient à un "slot" (type de mouvement). Refuser un exercice propose un équivalent
// du même slot, ce qui garde la séance équilibrée.
//
// Mesure notée pour chaque série ("metric") :
//   "load"  → poids + reps (poids standard selon "equipment" : barbell | dumbbell | cable | machine | medball, voir weights.js)
//   "reps"  → reps seules, au poids du corps
//   "carry" → poids + distance en mètres (portés)
// "perDumbbell" : le poids noté est celui d'un haltère (exercice fait avec un haltère dans chaque main).
// "pattern" (force) : sous-type de mouvement. L'app fait tourner les sous-types d'une séance à l'autre et,
// dans un sous-type, repropose la variante faite la dernière fois pour que la suggestion de poids reste fiable.

// Photos de démonstration des routines (mobilité, appuis, conditioning, étirements), dans img/routine/<id>/.
// frames : 2 = position de départ / position finale en alternance (free-exercise-db, domaine public),
// 1 = photo unique (Wikimedia Commons, à créditer). note : précision affichée sous la photo.
const COMMONS = "https://commons.wikimedia.org/wiki/File:";
export const ROUTINE_MEDIA = {
  "childs-pose": { frames: 2 },
  "downward-dog": { frames: 1, credit: { author: "Iveto", license: "CC BY 3.0", url: COMMONS + "Downward-Facing-Dog.JPG" } },
  "worlds-greatest-stretch": { frames: 2 },
  "lateral-lunge": { frames: 2, note: "Photo avec une barre : à l'échauffement, fais-la au poids du corps." },
  "band-pull-apart": { frames: 2 },
  "foam-roller": { frames: 2, note: "Ici sur les quadriceps : même principe pour mollets, ischios et dos." },
  "seated-hamstring-stretch": { frames: 2 },
  "lizard-pose": { frames: 1, credit: { author: "Rafael Montilla", license: "CC BY-SA 2.0", url: COMMONS + "Yoga_class_in_Lizard_pose.jpg" } },
  "cross-body-shoulder-stretch": { frames: 2 },
  "cobra": { frames: 1, credit: { author: "Kennguru", license: "CC BY 3.0", url: COMMONS + "Bhujangasana_Yoga-Asana_Nina-Mel.jpg" } },
  "sled-push": { frames: 2 },
  "assault-bike": { frames: 1, credit: { author: "HybridFitty", license: "CC BY 4.0", url: COMMONS + "Assault_Bike_Spartan_Games_2.jpg" } },
  "rower": { frames: 2 },
  "swing": { frames: 2 },
  "burpee": { frames: 2, credit: { author: "Taco fleur", license: "CC BY-SA 4.0", url: COMMONS + "Burpee_5_Thrust.jpg" } },
  "mountain-climbers": { frames: 2 },
  "lateral-hops": { frames: 2, note: "Ici par-dessus des plots : une simple ligne au sol suffit, l'objectif est la vitesse." },
  "box-shuffle": { frames: 2 },
  "band-walk": { frames: 2, note: "Élastique aux chevilles sur la photo : au-dessus des genoux, c'est plus facile au début." }
};

// Routine d'échauffement, identique à chaque séance : uniquement du dynamique, sans mur ni matériel lourd.
// media : photos de ROUTINE_MEDIA ; yt : recherche YouTube pour la démo vidéo.
export const MOBILITY_ROUTINE = [
  { name: "Child's pose", fr: "posture de l'enfant", sub: "2 x 30s", media: ["childs-pose"], yt: "child's pose yoga" },
  { name: "Downward dog", fr: "chien tête en bas", sub: "2 x 30s", media: ["downward-dog"], yt: "downward dog yoga pose" },
  { name: "World's greatest stretch", fr: "étirement dynamique complet", sub: "2 x 5/côté", media: ["worlds-greatest-stretch"], yt: "world's greatest stretch" },
  { name: "Lateral lunge", fr: "fente latérale, jambe opposée tendue", sub: "2 x 6/côté", media: ["lateral-lunge"], yt: "bodyweight lateral lunge" },
  { name: "90/90 hip switches", fr: "90-90 hanches (balai)", sub: "2 x 8/côté", media: [], yt: "90 90 hip switches" },
  { name: "Band shoulder rotations", fr: "rotations d'épaule à l'élastique", sub: "2 x 15", media: [], yt: "band shoulder dislocates" },
  { name: "Band pull-aparts", fr: "écartés d'élastique, omoplates serrées", sub: "2 x 15", media: ["band-pull-apart"], yt: "band pull apart" }
];

// Appuis : vitesse du jeu de jambes, en début de séance pendant qu'on est frais. 2 exercices par séance.
// Sans charge, sauf le mini-élastique et les 2 exercices lents avec poids aux chevilles (demandés par Yann ;
// jamais en sauts ni en vitesse : la charge au bout de la jambe ralentit le pied et sollicite genou et tendon d'Achille).
// tags : deux éléments du même jour ne partagent jamais un tag. "ladder" évite l'échelle à la fois ici et dans
// le finisher ; "slow" garde au plus un exercice lent par séance (l'autre travaille la vitesse).
export const FOOTWORK = [
  { id: "ladder-in-out", name: "Agility ladder : in-out / icky shuffle", fr: "échelle d'agilité, appuis rapides", sub: "4 passages", media: [], tags: ["ladder"], yt: "agility ladder icky shuffle in out" },
  { id: "pogo-hops", name: "Pogo hops", fr: "petits rebonds, chevilles raides, contact au sol très court", sub: "3 x 15", media: [], yt: "pogo hops ankle stiffness drill" },
  { id: "lateral-line-hops", name: "Lateral line hops", fr: "sauts latéraux rapides au-dessus d'une ligne", sub: "3 x 10s", media: ["lateral-hops"], yt: "lateral line hops quick feet" },
  { id: "split-step-start", name: "Split-step + départ latéral", fr: "split-step puis 3 m en pas chassés, comme au retour de service", sub: "3 x 4/côté", media: [], yt: "split step reaction drill tennis footwork" },
  { id: "four-cone-square", name: "4-cone square drill", fr: "carré de 4 plots : sprint, pas chassés, recul, pas chassés", sub: "4 tours (2 par sens)", media: [], yt: "4 cone square agility drill" },
  { id: "box-shuffle", name: "Side-to-side box shuffle", fr: "pied sur une marche basse, on alterne vite de part et d'autre", sub: "3 x 15s", media: ["box-shuffle"], yt: "side to side box shuffle drill" },
  { id: "band-lateral-walk", name: "Mini-band lateral walk", fr: "pas chassés contrôlés avec mini-élastique", sub: "3 x 8 m aller-retour", media: ["band-walk"], yt: "mini band lateral walk" },
  { id: "crossover-step", name: "Crossover step + retour", fr: "pas croisé puis retour au centre, comme pour une balle loin", sub: "3 x 5/côté", media: [], yt: "crossover step footwork drill" },
  { id: "ankle-weight-march", name: "Ankle-weight high-knee march (lent)", fr: "poids aux chevilles, montées de genou lentes et contrôlées", sub: "2 x 10/côté", media: [], tags: ["slow"], note: "Lent uniquement : pas de saut ni de course avec les poids aux chevilles.", yt: "ankle weight high knee march" },
  { id: "ankle-weight-abduction", name: "Ankle-weight standing abduction (lent)", fr: "poids aux chevilles, jambe tendue écartée sur le côté", sub: "2 x 12/côté", media: [], tags: ["slow"], note: "Lent uniquement : pas de saut ni de course avec les poids aux chevilles.", yt: "standing hip abduction ankle weight" }
];

// Duos : 3 tours, on enchaîne les deux exercices puis on récupère.
// Force : 3 séries, reps pilotées par la phase en cours (periodization.js), sauf les tractions ("3 x max").
const LEGS = ["quads", "glutes", "hamstrings", "calves"];
export const EXERCISES = [
  // ── Sauts (duo 1, exercice A)
  { id: "box-jump", slot: "jump", metric: "reps", name: "Box jump", fr: "saut sur box, réception amortie", sub: "3 x 5", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "box jump technique" },
  { id: "broad-jump", slot: "jump", metric: "reps", name: "Broad jump", fr: "saut en longueur", sub: "3 x 5", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "broad jump technique" },
  { id: "lateral-bound", slot: "jump", metric: "reps", name: "Lateral bound (skater jump)", fr: "saut latéral", sub: "3 x 6/côté", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "skater jump lateral bound technique" },
  { id: "split-squat-jump", slot: "jump", metric: "reps", name: "Split squat jump", fr: "fente sautée, on change de jambe en l'air", sub: "3 x 6/côté", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "split squat jump technique" },
  { id: "single-leg-lateral-hop", slot: "jump", metric: "reps", name: "Single-leg lateral hop", fr: "sauts latéraux sur une jambe, réception stable", sub: "3 x 6/côté", muscles: { front: ["quads"], back: ["glutes", "calves"] }, yt: "single leg lateral hop" },
  // ── Poussée explosive (duo 1, exercice B)
  { id: "push-up", slot: "explosive-push", metric: "reps", name: "Push-up", fr: "pompes", sub: "3 x 10", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "push up proper form" },
  { id: "plyo-push-up", slot: "explosive-push", metric: "reps", name: "Plyo push-up", fr: "pompes explosives (sur les genoux si besoin)", sub: "3 x 6", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "plyometric push up technique" },
  { id: "medball-chest-pass", slot: "explosive-push", metric: "load", equipment: "medball", name: "Medicine ball chest pass", fr: "passe poitrine explosive contre un mur", sub: "3 x 8", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "medicine ball chest pass wall" },
  // ── Lancers et rotation (duo 2, exercice A)
  // noPhoto : la seule photo libre de droits montrait un passage de ballon dos à dos, pas un lancer contre un mur.
  { id: "medball-rotational-throw", slot: "rotation", metric: "load", equipment: "medball", noPhoto: true, name: "Medicine ball rotational throw", fr: "lancer rotatif medecine ball", sub: "3 x 6/côté", muscles: { front: ["obliques", "abs"], back: ["lats"] }, yt: "medicine ball rotational throw technique" },
  { id: "medball-scoop-toss", slot: "rotation", metric: "load", equipment: "medball", noPhoto: true, name: "Medicine ball side scoop toss", fr: "lancer latéral contre un mur (medecine ball)", sub: "3 x 8/côté", muscles: { front: ["obliques", "abs"], back: ["glutes"] }, yt: "medicine ball rotational scoop toss against wall" },
  { id: "medball-overhead-slam", slot: "rotation", metric: "load", equipment: "medball", name: "Medicine ball overhead slam", fr: "slam medecine ball au-dessus de la tête", sub: "3 x 8", muscles: { front: ["shoulders", "abs"], back: ["lats", "triceps"] }, yt: "medicine ball overhead slam technique" },
  { id: "cable-woodchop", slot: "rotation", metric: "load", equipment: "cable", name: "Cable woodchop", fr: "bûcheron à la poulie, de haut en bas, rotation du buste", sub: "3 x 10/côté", muscles: { front: ["obliques", "abs"], back: [] }, yt: "cable woodchop technique" },
  // ── Core (duo 2, exercice B)
  { id: "pallof-press", slot: "core", metric: "load", equipment: "cable", name: "Pallof press", fr: "gainage anti-rotation", sub: "3 x 12/côté", muscles: { front: ["abs", "obliques"], back: [] }, yt: "pallof press technique" },
  { id: "dead-bug", slot: "core", metric: "reps", name: "Dead bug", fr: "gainage anti-extension", sub: "3 x 10/côté", muscles: { front: ["abs"], back: [] }, yt: "dead bug exercise technique" },
  // noPhoto : aucune photo libre de droits ne montre un suitcase carry (un seul haltère).
  { id: "suitcase-carry", slot: "core", metric: "carry", equipment: "dumbbell", targetDistanceM: 20, noPhoto: true, name: "Suitcase carry", fr: "marche avec un haltère d'un seul côté, buste droit", sub: "3 x 20 m/côté", muscles: { front: ["obliques", "abs"], back: ["traps"] }, yt: "suitcase carry technique" },
  { id: "hanging-knee-raise", slot: "core", metric: "reps", name: "Hanging knee raise", fr: "suspendu à la barre, genoux vers la poitrine sans balancer", sub: "3 x 10", muscles: { front: ["abs"], back: [] }, yt: "hanging knee raise technique" },
  { id: "bird-dog", slot: "core", metric: "reps", name: "Bird dog", fr: "à quatre pattes, bras et jambe opposés tendus, dos immobile", sub: "3 x 8/côté", noPhoto: true, muscles: { front: ["abs"], back: ["lowerback", "glutes"] }, yt: "bird dog exercise technique" },
  { id: "ab-wheel-rollout", slot: "core", metric: "reps", name: "Ab wheel rollout", fr: "roue abdominale à genoux, dos plat", sub: "3 x 8", muscles: { front: ["abs"], back: ["lats"] }, yt: "ab wheel rollout kneeling technique" },
  // ── Force · jambes
  { id: "goblet-squat", slot: "legs", pattern: "squat", metric: "load", equipment: "dumbbell", name: "Goblet squat", fr: "squat gobelet", sets: 3, rest: "90s", muscles: { front: ["quads"], back: ["glutes"] }, yt: "goblet squat technique" },
  { id: "leg-press", slot: "legs", pattern: "squat", metric: "load", equipment: "machine", name: "Leg press", fr: "presse à cuisses", sets: 3, rest: "90s", muscles: { front: ["quads"], back: ["glutes"] }, yt: "leg press proper form" },
  { id: "romanian-deadlift", slot: "legs", pattern: "hinge", metric: "load", equipment: "barbell", name: "Romanian deadlift", fr: "soulevé de terre roumain", sets: 3, rest: "90s", muscles: { front: [], back: ["hamstrings", "glutes", "lowerback"] }, yt: "romanian deadlift technique" },
  { id: "single-leg-rdl", slot: "legs", pattern: "hinge", metric: "load", equipment: "dumbbell", name: "Single-leg RDL", fr: "soulevé de terre roumain sur une jambe (kettlebell ou haltère)", sets: 3, rest: "75s", muscles: { front: [], back: ["hamstrings", "glutes"] }, yt: "single leg romanian deadlift technique" },
  { id: "hip-thrust", slot: "legs", pattern: "hinge", metric: "load", equipment: "barbell", name: "Hip thrust", fr: "poussée de hanches, dos sur un banc", sets: 3, rest: "90s", muscles: { front: [], back: ["glutes", "hamstrings"] }, yt: "barbell hip thrust technique" },
  { id: "bulgarian-split-squat", slot: "legs", pattern: "unilateral", metric: "load", equipment: "dumbbell", perDumbbell: true, name: "Bulgarian split squat", fr: "fente bulgare", sets: 3, rest: "75s", muscles: { front: ["quads"], back: ["glutes", "hamstrings"] }, yt: "bulgarian split squat technique" },
  { id: "reverse-lunge", slot: "legs", pattern: "unilateral", metric: "load", equipment: "dumbbell", perDumbbell: true, name: "Reverse lunge", fr: "fente arrière avec haltères", sets: 3, rest: "75s", muscles: { front: ["quads"], back: ["glutes", "hamstrings"] }, yt: "dumbbell reverse lunge technique" },
  { id: "step-up", slot: "legs", pattern: "unilateral", metric: "load", equipment: "dumbbell", perDumbbell: true, name: "Step-up", fr: "montée sur banc avec haltères", sets: 3, rest: "75s", muscles: { front: ["quads"], back: ["glutes", "hamstrings"] }, yt: "dumbbell step up technique" },
  { id: "curtsy-lunge", slot: "legs", pattern: "unilateral", metric: "load", equipment: "dumbbell", name: "Curtsy lunge", fr: "fente croisée arrière (révérence), haltère contre la poitrine", sets: 3, rest: "75s", muscles: { front: ["quads"], back: ["glutes"] }, yt: "curtsy lunge technique" },
  // ── Force · poussée
  { id: "bench-press", slot: "push", pattern: "horizontal", metric: "load", equipment: "barbell", name: "Bench press", fr: "développé couché", sets: 3, rest: "90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "bench press technique" },
  { id: "db-bench-press", slot: "push", pattern: "horizontal", metric: "load", equipment: "dumbbell", perDumbbell: true, name: "Dumbbell bench press", fr: "développé couché haltères", sets: 3, rest: "90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "dumbbell bench press technique" },
  { id: "incline-db-press", slot: "push", pattern: "incline", metric: "load", equipment: "dumbbell", perDumbbell: true, name: "Incline dumbbell press", fr: "développé incliné haltères", sets: 3, rest: "90s", muscles: { front: ["chest", "shoulders"], back: ["triceps"] }, yt: "incline dumbbell press technique" },
  { id: "overhead-press", slot: "push", pattern: "vertical", metric: "load", equipment: "barbell", name: "Overhead press", fr: "développé militaire", sets: 3, rest: "75s", muscles: { front: ["shoulders"], back: ["triceps"] }, yt: "overhead press technique" },
  { id: "half-kneeling-press", slot: "push", pattern: "vertical", metric: "load", equipment: "dumbbell", noPhoto: true, name: "Half-kneeling single-arm press", fr: "développé un bras, un genou au sol, gainage", sets: 3, rest: "75s", muscles: { front: ["shoulders", "abs"], back: ["triceps"] }, yt: "half kneeling single arm dumbbell press" },
  // ── Force · tirage horizontal (chaque variante est son propre sous-type : elles tournent d'une séance à l'autre)
  { id: "bent-over-row", slot: "row", pattern: "barbell-row", metric: "load", equipment: "barbell", name: "Bent-over row", fr: "rowing buste penché", sets: 3, rest: "90s", muscles: { front: ["biceps"], back: ["lats", "traps", "lowerback"] }, yt: "bent over row technique" },
  { id: "single-arm-row", slot: "row", pattern: "dumbbell-row", metric: "load", equipment: "dumbbell", name: "Single-arm dumbbell row", fr: "rowing haltère unilatéral", sets: 3, rest: "75s", muscles: { front: ["biceps"], back: ["lats", "traps"] }, yt: "single arm dumbbell row technique" },
  { id: "seated-cable-row", slot: "row", pattern: "cable-row", metric: "load", equipment: "cable", name: "Seated cable row", fr: "tirage horizontal à la poulie", sets: 3, rest: "75s", muscles: { front: ["biceps"], back: ["lats", "traps"] }, yt: "seated cable row technique" },
  // ── Force · tirage vertical : tractions à chaque séance (au poids du corps, "3 x max", +1 rep à la fois,
  // pas de périodisation). Le lat pulldown est l'équivalent proposé si on refuse les tractions.
  { id: "pull-up", slot: "vertical-pull", metric: "reps", repScheme: "max", name: "Pull-up", fr: "tractions (poids du corps)", sets: 3, rest: "90s", muscles: { front: ["biceps"], back: ["lats", "traps"] }, yt: "strict pull up technique" },
  { id: "lat-pulldown", slot: "vertical-pull", metric: "load", equipment: "cable", name: "Lat pulldown", fr: "tirage vertical", sets: 3, rest: "75s", muscles: { front: ["biceps"], back: ["lats"] }, yt: "lat pulldown technique" }
];

const STRENGTH_SLOTS = ["legs", "push", "row", "vertical-pull"];
EXERCISES.forEach((ex) => { ex.category = STRENGTH_SLOTS.includes(ex.slot) ? "strength" : "power"; });

// Finishers (1 par séance). Pas de corde à sauter à la salle.
export const FINISHERS = [
  { id: "sled-ladder", name: "Sled push + agility ladder", fr: "poussée de traîneau + échelle d'agilité", detail: "5 tours : 20 m de sled + 2 passages d'échelle. Récup 60-90s entre les tours.", media: ["sled-push"], tags: ["ladder"], yt: "agility ladder drills" },
  { id: "bike-sprints", name: "Assault bike sprints", fr: "sprints courts haute intensité", detail: "8 x 15s à fond, 45s de pédalage léger entre chaque.", media: ["assault-bike"], yt: "assault bike sprint intervals" },
  { id: "shuttle-5-10-5", name: "Navettes 5-10-5", fr: "changements de direction façon padel", detail: "6 navettes : 5 m à droite, 10 m à gauche, 5 m retour, en touchant le sol. Récup 45s.", media: [], yt: "5-10-5 pro agility drill" },
  { id: "rower-250", name: "Rameur 250 m", fr: "intervalles au rameur", detail: "5 x 250 m à fond. Récup 1 min entre chaque.", media: ["rower"], yt: "rowing machine technique" },
  { id: "swing-burpee-emom", name: "Swings + burpees (EMOM 8 min)", fr: "kettlebell ou haltère, une tâche par minute", detail: "Minutes impaires : 15 swings. Minutes paires : 8 burpees. Le reste de la minute = récup.", media: ["swing", "burpee"], yt: "kettlebell swing technique" },
  { id: "ladder-shuffle", name: "Échelle d'agilité + pas chassés", fr: "appuis rapides et déplacements latéraux", detail: "6 tours : 1 passage d'échelle + 10 m de pas chassés aller-retour. Récup 45s.", media: [], tags: ["ladder"], yt: "agility ladder lateral shuffle drill" },
  { id: "heavy-sled", name: "Sled push lourd", fr: "poussée de traîneau chargée", detail: "6 x 15 m, aussi lourd que possible en restant rapide. Récup 60s.", media: ["sled-push"], yt: "heavy sled push technique" },
  { id: "bike-tabata", name: "Assault bike Tabata", fr: "intervalles très courts", detail: "8 x 20s à fond / 10s de récup (4 min). Puis 2 min de pédalage léger.", media: ["assault-bike"], yt: "assault bike tabata" },
  { id: "burpee-climbers", name: "Burpees + mountain climbers", fr: "circuit poids du corps, sans matériel", detail: "5 tours : 10 burpees + 20 mountain climbers. Récup 45s.", media: ["burpee", "mountain-climbers"], yt: "burpee proper form" }
];

// Retour au calme : rouleau puis étirements, choisis selon le type de mouvement de jambes du jour.
const FOAM_ROLLER = { name: "Foam roller", fr: "rouleau : mollets, quadriceps, ischios, dos", sub: "5 min", media: ["foam-roller"], yt: "foam roller full body routine" };
const PIGEON = { name: "Pigeon pose", fr: "posture du pigeon (yoga), fessiers et hanches", sub: "45s/côté", media: [], yt: "pigeon pose stretch beginner" };
const THREAD_THE_NEEDLE = { name: "Thread the needle", fr: "rotation thoracique au sol (yoga), haut du dos", sub: "30s/côté", media: [], yt: "thread the needle stretch" };

export const COOLDOWN = {
  squat: [
    FOAM_ROLLER,
    PIGEON,
    THREAD_THE_NEEDLE,
    { name: "Kneeling lat stretch", fr: "à genoux, coudes sur un banc, dorsaux", sub: "2 x 30s", media: [], yt: "kneeling lat stretch bench" },
    { name: "Floor chest opener", fr: "allongé sur le ventre, bras en T, pectoraux", sub: "30s/côté", media: [], yt: "prone chest opener stretch" }
  ],
  hinge: [
    FOAM_ROLLER,
    { name: "Seated hamstring stretch", fr: "assis, une jambe tendue, ischios et bas du dos", sub: "45s/côté", media: ["seated-hamstring-stretch"], yt: "seated hamstring stretch" },
    { name: "Lizard pose", fr: "posture du lézard (yoga), fléchisseurs de hanche", sub: "45s/côté", media: ["lizard-pose"], yt: "lizard pose yoga" },
    { name: "Child's pose side reach", fr: "posture de l'enfant bras sur le côté, dorsaux", sub: "30s/côté", media: [], yt: "child's pose side stretch" },
    { name: "Cross-body shoulder stretch", fr: "bras tendu devant la poitrine, épaules", sub: "30s/côté", media: ["cross-body-shoulder-stretch"], yt: "cross body shoulder stretch" }
  ],
  unilateral: [
    FOAM_ROLLER,
    { name: "Couch stretch", fr: "genou au sol, pied sur un banc, quadriceps et psoas", sub: "45s/côté", media: [], yt: "couch stretch" },
    PIGEON,
    { name: "Cobra", fr: "cobra (yoga), abdos et ouverture de la poitrine", sub: "2 x 30s", media: ["cobra"], yt: "cobra pose yoga" },
    THREAD_THE_NEEDLE
  ]
};

// Déroulé d'une séance : une carte plein écran par étape.
//   kind "mobility" | "cooldown" : liste fixe à cocher.
//   kind "footwork" : "count" exercices d'appuis, chacun remplaçable.
//   kind "duo" : un exercice par slot, enchaînés ; refuser le duo remplace les deux.
//   kind "strength" : un exercice du slot.
//   kind "finisher" : un finisher.
export const STEPS = [
  { id: "mobility", kind: "mobility", short: "Mobilité", title: "Mobilité & souplesse" },
  { id: "footwork", kind: "footwork", short: "Appuis", title: "Appuis · vitesse des pieds", count: 2 },
  { id: "duo1", kind: "duo", short: "Duo 1", title: "Duo 1 · Puissance", slots: ["jump", "explosive-push"], rest: "90s" },
  { id: "duo2", kind: "duo", short: "Duo 2", title: "Duo 2 · Rotation & core", slots: ["rotation", "core"], rest: "60s" },
  { id: "legs", kind: "strength", short: "Jambes", title: "Force · Jambes", slot: "legs" },
  { id: "push", kind: "strength", short: "Poussée", title: "Force · Poussée", slot: "push" },
  { id: "row", kind: "strength", short: "Tirage", title: "Force · Tirage horizontal", slot: "row" },
  { id: "vpull", kind: "strength", short: "Tractions", title: "Force · Tirage vertical", slot: "vertical-pull", fixedOrder: true },
  { id: "conditioning", kind: "finisher", short: "Cardio", title: "Conditioning · finisher" },
  { id: "cooldown", kind: "cooldown", short: "Calme", title: "Retour au calme & étirements" }
];

export const PATTERN_LABELS = {
  squat: "squat", hinge: "charnière de hanche", unilateral: "unilatéral",
  horizontal: "poussée horizontale", incline: "poussée inclinée", vertical: "poussée verticale"
};

export const LOWER_BODY_MUSCLES = LEGS;

const BY_ID = new Map([...EXERCISES, ...FOOTWORK, ...FINISHERS].map((item) => [item.id, item]));

// Retourne l'exercice (ou exercice d'appuis, ou finisher) pour un id donné, ou null (ex. exercice retiré).
export function findExercise(exerciseId) {
  const item = BY_ID.get(exerciseId);
  return item && EXERCISES.includes(item) ? item : null;
}

export function findItem(id) {
  return BY_ID.get(id) || null;
}

// Noms des exercices retirés du programme, pour afficher proprement les anciennes séances.
const RETIRED_EXERCISE_NAMES = {
  "squat-jump": "Squat jump", "back-squat": "Back squat", "front-squat": "Front squat",
  "side-plank": "Side plank", "assisted-pull-up": "Assisted pull-up", "lateral-lunge": "Lateral lunge",
  "face-pull": "Face pull", "external-rotation": "External rotation"
};

export function exerciseName(exerciseId) {
  const item = BY_ID.get(exerciseId);
  return item ? item.name : RETIRED_EXERCISE_NAMES[exerciseId] || exerciseId;
}

export function isLowerBodyExercise(exercise) {
  const all = [...exercise.muscles.front, ...exercise.muscles.back];
  return all.some((m) => LOWER_BODY_MUSCLES.includes(m));
}
