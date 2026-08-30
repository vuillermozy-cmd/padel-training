import { isLowerBodyExercise } from "./data.js";
import { getLastSetForExercise } from "./storage.js";

// Extrait la borne haute de la fourchette de reps depuis le "sub" (ex: "4 x 6-8 · repos 90s" → 8).
export function getTargetRepsUpperBound(sub) {
  const match = sub.match(/x\s*(\d+)(?:-(\d+))?/i);
  if (!match) return null;
  return match[2] ? parseInt(match[2], 10) : parseInt(match[1], 10);
}

// Suggestion de progression basée sur la dernière série loguée.
// Retourne null si aucun historique, sinon { lastWeight, lastReps, lastDate, suggestedWeight, reachedTarget }.
export function getProgressionSuggestion(exercise) {
  const last = getLastSetForExercise(exercise.id);
  if (!last) return null;

  const upperBound = getTargetRepsUpperBound(exercise.sub);
  const reachedTarget = upperBound !== null && last.reps >= upperBound;
  const increment = isLowerBodyExercise(exercise) ? 5 : 2.5;
  const suggestedWeight = reachedTarget ? +(last.weight + increment).toFixed(1) : last.weight;

  return {
    lastWeight: last.weight,
    lastReps: last.reps,
    lastDate: last.date,
    suggestedWeight,
    reachedTarget,
    increment
  };
}
