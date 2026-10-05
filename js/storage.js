// Persistance locale (localStorage) — aucune donnée ne quitte l'appareil.

import { LB_PER_KG } from "./weights.js";

const STORAGE_KEY = "padel-training-data-v1";

function defaultState() {
  return {
    totalSessions: 0,
    // séances terminées : { id, day, date, completedAt, sets: [{exerciseId, weightLb?, reps?, distanceM?, timestamp}] }
    history: [],
    draft: { day: null, sets: [] } // séance en cours, pas encore "terminée"
  };
}

// Les premières versions stockaient le poids en kg (champ "weight") ; il est désormais en lb ("weightLb").
// Les saisies d'origine étaient en lb, l'arrondi au 0.5 lb retrouve donc la valeur tapée.
function migrateKgToLb(state) {
  [...state.history.flatMap((s) => s.sets), ...state.draft.sets].forEach((set) => {
    if (typeof set.weight === "number" && set.weightLb === undefined) {
      set.weightLb = Math.round(set.weight * LB_PER_KG * 2) / 2;
      delete set.weight;
    }
  });
  return state;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return migrateKgToLb({ ...defaultState(), ...parsed });
  } catch (e) {
    console.warn("Lecture localStorage impossible, réinitialisation.", e);
    return defaultState();
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = load();

export function getState() {
  return state;
}

export function getTotalSessions() {
  return state.totalSessions;
}

export function getDraft() {
  return state.draft;
}

export function setActiveDay(day) {
  if (state.draft.day !== day) {
    state.draft = { day, sets: [] };
    save(state);
  }
}

// Enregistre une série pour un exercice (fiche exercice → "Enregistrer cette série").
// values : les champs de la mesure de l'exercice, parmi { weightLb, reps, distanceM }.
export function logSet(exerciseId, values) {
  const entry = { exerciseId, ...values, timestamp: Date.now() };
  state.draft.sets.push(entry);
  save(state);
  return entry;
}

// Termine la séance en cours : archive le draft dans l'historique et incrémente le compteur.
export function finishSession() {
  if (!state.draft.day || state.draft.sets.length === 0) return null;
  const completed = {
    id: `${state.draft.day}-${Date.now()}`,
    day: state.draft.day,
    date: new Date().toISOString().slice(0, 10),
    completedAt: Date.now(),
    sets: state.draft.sets
  };
  state.history.push(completed);
  state.totalSessions += 1;
  state.draft = { day: null, sets: [] };
  save(state);
  return completed;
}

// Toutes les séries loguées pour un exercice donné (historique + séance en cours), triées du plus ancien au plus récent.
export function getSetsForExercise(exerciseId) {
  const fromHistory = state.history.flatMap((s) =>
    s.sets.filter((set) => set.exerciseId === exerciseId).map((set) => ({ ...set, date: s.date }))
  );
  const fromDraft = state.draft.sets
    .filter((set) => set.exerciseId === exerciseId)
    .map((set) => ({ ...set, date: new Date(set.timestamp).toISOString().slice(0, 10) }));
  return [...fromHistory, ...fromDraft].sort((a, b) => a.timestamp - b.timestamp);
}

export function getLastSetForExercise(exerciseId) {
  const sets = getSetsForExercise(exerciseId);
  return sets.length ? sets[sets.length - 1] : null;
}

// Prochain jour suggéré dans la rotation A → B → C, basé uniquement sur le nombre de séances terminées.
export function getSuggestedNextDay() {
  const order = ["a", "b", "c"];
  return order[state.totalSessions % 3];
}

export function getAllLoggedSessions() {
  return state.history;
}

export function resetAllData() {
  state = defaultState();
  save(state);
}
