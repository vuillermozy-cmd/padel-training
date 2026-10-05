// Périodisation automatique des reps pour les exercices de force, comptée à partir de la date
// de la première séance : 2 semaines par phase, 3 phases = un bloc de ~6 semaines, puis on recommence.

export const PHASES = [
  { label: "8-10 reps", lower: 8, upper: 10 },
  { label: "6-8 reps", lower: 6, upper: 8 },
  { label: "4-6 reps", lower: 4, upper: 6 }
];

export const WEEKS_PER_PHASE = 2;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Dates au format "AAAA-MM-JJ". Sans première séance, on démarre en phase 1.
export function getCurrentPhase(firstSessionDate, todayDate) {
  const weeks = firstSessionDate
    ? Math.max(0, Math.floor((Date.parse(todayDate) - Date.parse(firstSessionDate)) / WEEK_MS))
    : 0;
  const index = Math.floor(weeks / WEEKS_PER_PHASE) % PHASES.length;
  const block = Math.floor(weeks / (WEEKS_PER_PHASE * PHASES.length)) + 1;
  return { ...PHASES[index], index, block };
}

// Sous-titre affiché pour un exercice de force (reps dynamiques selon la phase en cours).
export function getStrengthSub(exercise, phase) {
  return `${exercise.sets} x ${phase.label} · repos ${exercise.rest}`;
}
