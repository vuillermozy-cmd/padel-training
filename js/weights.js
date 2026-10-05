// Poids standards de salle, en lb. Toute saisie et toute suggestion est ramenée à un poids
// qui existe vraiment : barre et haltères de 5 en 5 lb, crans de poulie, tailles de medecine ball.

export const LB_PER_KG = 2.2046226218;

// Cran des poulies/machines de la salle (lat pulldown, pallof press). À ajuster si besoin.
export const CABLE_STEP_LB = 5;

// Medecine balls (2 lb d'écart) et slam balls (5 lb d'écart).
const MEDBALL_WEIGHTS_LB = [4, 6, 8, 10, 12, 14, 15, 16, 18, 20, 25, 30];

const STEP_LB = { barbell: 5, dumbbell: 5, cable: CABLE_STEP_LB };

export const DEFAULT_WEIGHT_LB = { barbell: 45, dumbbell: 20, cable: 30, medball: 10 };

export function lbToKg(lb) {
  return lb / LB_PER_KG;
}

// Ramène un poids au poids standard le plus proche pour l'équipement de l'exercice.
export function snapWeight(equipment, weightLb) {
  if (equipment === "medball") {
    return MEDBALL_WEIGHTS_LB.reduce((best, w) => (Math.abs(w - weightLb) < Math.abs(best - weightLb) ? w : best));
  }
  const step = STEP_LB[equipment];
  return Math.max(0, Math.round(weightLb / step) * step);
}

// Poids standard suivant (direction +1) ou précédent (-1).
export function stepWeight(equipment, weightLb, direction) {
  if (equipment === "medball") {
    const idx = MEDBALL_WEIGHTS_LB.indexOf(snapWeight(equipment, weightLb));
    const next = Math.min(MEDBALL_WEIGHTS_LB.length - 1, Math.max(0, idx + direction));
    return MEDBALL_WEIGHTS_LB[next];
  }
  return snapWeight(equipment, weightLb + direction * STEP_LB[equipment]);
}
