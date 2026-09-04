// Périodisation automatique des reps pour les exercices de force, basée sur le
// compteur total de séances (pas de semaines affichées) : ~2 semaines à 2-3
// séances/semaine ≈ 5 séances par phase. 3 phases = un bloc de rotation A/B/C (~6 semaines).

export const PHASES = [
  { label: "8-10 reps", lower: 8, upper: 10 },
  { label: "6-8 reps", lower: 6, upper: 8 },
  { label: "4-6 reps", lower: 4, upper: 6 }
];

export const SESSIONS_PER_PHASE = 5;

export function getCurrentPhase(totalSessionsCompleted) {
  const index = Math.floor(totalSessionsCompleted / SESSIONS_PER_PHASE) % PHASES.length;
  const block = Math.floor(totalSessionsCompleted / (SESSIONS_PER_PHASE * PHASES.length)) + 1;
  return { ...PHASES[index], index, block };
}

// Sous-titre affiché pour un exercice de force (reps dynamiques selon la phase en cours).
export function getStrengthSub(exercise, phase) {
  return `${exercise.sets} x ${phase.label} · repos ${exercise.rest}`;
}
