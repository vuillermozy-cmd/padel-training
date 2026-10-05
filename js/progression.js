import { isLowerBodyExercise } from "./data.js";
import { getLastSetForExercise } from "./storage.js";
import { snapWeight, stepWeight } from "./weights.js";

// Fourchette de reps cible { lower, upper }. Pour les exercices de force, elle vient de la phase de
// périodisation en cours ; pour les autres (power/medball/core), elle est fixe et se lit dans le "sub"
// (ex: "3 x 6-8 · repos 90s" → 6-8, "3 x 12/côté" → 12-12).
export function getTargetReps(exercise, phase) {
  if (exercise.category === "strength") return { lower: phase.lower, upper: phase.upper };
  const match = exercise.sub.match(/x\s*(\d+)(?:-(\d+))?/i);
  if (!match) return null;
  const lower = parseInt(match[1], 10);
  return { lower, upper: match[2] ? parseInt(match[2], 10) : lower };
}

// Poids suivant quand la cible est atteinte : barre +5 lb (haut du corps) / +10 lb (bas du corps),
// sinon l'haltère ou le cran de poulie suivant.
function nextWeight(exercise, weightLb) {
  if (exercise.equipment === "barbell") {
    return snapWeight("barbell", weightLb + (isLowerBodyExercise(exercise) ? 10 : 5));
  }
  return stepWeight(exercise.equipment, weightLb, +1);
}

// Suggestion basée sur la dernière série loguée. Retourne null si aucun historique, sinon
// { last, reachedTarget, next } où "next" contient les valeurs proposées pour la prochaine série
// (mêmes champs que la mesure de l'exercice : weightLb, reps, distanceM).
export function getProgressionSuggestion(exercise, phase) {
  const last = getLastSetForExercise(exercise.id);
  if (!last) return null;

  if (exercise.metric === "reps") {
    // Tractions "3 x max" : on vise une rep de plus que la dernière fois.
    const reps = exercise.repScheme === "max" ? last.reps + 1 : last.reps;
    return { last, reachedTarget: false, next: { reps } };
  }

  // Un poids déjà logué peut être non standard (anciennes suggestions en kg, ex. 50.5 lb) : on le ramène à un vrai poids.
  const lastWeightLb = snapWeight(exercise.equipment, last.weightLb);

  if (exercise.metric === "carry") {
    const reachedTarget = last.distanceM >= exercise.targetDistanceM;
    const weightLb = reachedTarget ? nextWeight(exercise, lastWeightLb) : lastWeightLb;
    return { last, reachedTarget, next: { weightLb, distanceM: exercise.targetDistanceM } };
  }

  // Medecine ball : exercice de puissance, on garde la même balle et on vise la vitesse.
  if (exercise.equipment === "medball") {
    return { last, reachedTarget: false, next: { weightLb: lastWeightLb, reps: last.reps } };
  }

  // Double progression : haut de la fourchette atteint → poids suivant, et on repart du bas de la fourchette.
  const target = getTargetReps(exercise, phase);
  const reachedTarget = target !== null && last.reps >= target.upper;
  return {
    last,
    reachedTarget,
    next: reachedTarget
      ? { weightLb: nextWeight(exercise, lastWeightLb), reps: target.lower }
      : { weightLb: lastWeightLb, reps: last.reps }
  };
}
