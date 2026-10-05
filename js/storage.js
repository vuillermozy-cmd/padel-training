// Persistance locale (localStorage) — aucune donnée ne quitte l'appareil.
//
// Chaque série est enregistrée immédiatement et définitivement, avec sa date et sa séance (A/B/C).
// Une séance = un jour d'entraînement : le compteur et l'historique se déduisent des séries,
// il n'y a plus de "séance en cours" à terminer (et donc plus rien qui puisse être perdu en route).

import { LB_PER_KG } from "./weights.js";

const STORAGE_KEY = "padel-training-data-v1";
const BACKUP_KEY = "padel-training-data-v1-backup";
const ROTATION = ["a", "b", "c"];

// Date locale (et non UTC) : une séance du soir reste datée du bon jour.
function localDate(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function today() {
  return localDate(Date.now());
}

// Les premières versions stockaient le poids en kg (champ "weight") ; il est désormais en lb ("weightLb").
// Les saisies d'origine étaient en lb, l'arrondi au 0.5 lb retrouve donc la valeur tapée.
function migrateKgToLb(set) {
  if (typeof set.weight === "number" && set.weightLb === undefined) {
    set.weightLb = Math.round(set.weight * LB_PER_KG * 2) / 2;
    delete set.weight;
  }
  return set;
}

// Ancien format : { totalSessions, history: [{ day, date, sets }], draft: { day, sets } }.
// Toutes les séries, y compris celles d'une séance jamais "terminée", sont reprises.
function migrate(parsed) {
  let sets = parsed.sets;
  if (!Array.isArray(sets)) {
    sets = [
      ...(parsed.history || []).flatMap((s) => s.sets.map((set) => ({ ...set, day: s.day, date: s.date }))),
      ...((parsed.draft && parsed.draft.sets) || []).map((set) => ({
        ...set, day: parsed.draft.day || "a", date: localDate(set.timestamp)
      }))
    ];
  }
  return { version: 2, sets: sets.map(migrateKgToLb) };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 2, sets: [] };
    const parsed = JSON.parse(raw);
    if (parsed.version !== 2) {
      // Copie de sécurité des données dans leur ancien format avant de les convertir.
      localStorage.setItem(BACKUP_KEY, raw);
      const migrated = migrate(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return migrate(parsed);
  } catch (e) {
    console.warn("Lecture localStorage impossible.", e);
    return { version: 2, sets: [] };
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = load();

// Demande au navigateur de ne pas effacer ces données pour libérer de la place.
if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

// Enregistre une série (fiche exercice → "Enregistrer cette série").
// values : les champs de la mesure de l'exercice, parmi { weightLb, reps, distanceM }.
export function logSet(exerciseId, day, values) {
  const timestamp = Date.now();
  const entry = { exerciseId, day, date: localDate(timestamp), timestamp, ...values };
  state.sets.push(entry);
  save();
  return entry;
}

export function getAllSets() {
  return [...state.sets].sort((a, b) => a.timestamp - b.timestamp);
}

// Toutes les séries d'un exercice, de la plus ancienne à la plus récente.
export function getSetsForExercise(exerciseId) {
  return getAllSets().filter((set) => set.exerciseId === exerciseId);
}

export function getLastSetForExercise(exerciseId) {
  const sets = getSetsForExercise(exerciseId);
  return sets.length ? sets[sets.length - 1] : null;
}

// Séances = jours d'entraînement, du plus ancien au plus récent : [{ date, day, sets }].
export function getSessions() {
  const byDate = new Map();
  getAllSets().forEach((set) => {
    if (!byDate.has(set.date)) byDate.set(set.date, { date: set.date, day: set.day, sets: [] });
    byDate.get(set.date).sets.push(set);
  });
  return [...byDate.values()];
}

export function getTotalSessions() {
  return getSessions().length;
}

export function getFirstSessionDate() {
  const sessions = getSessions();
  return sessions.length ? sessions[0].date : null;
}

export function getTodaySets() {
  const date = today();
  return state.sets.filter((set) => set.date === date);
}

export function hasTrainedToday() {
  return getTodaySets().length > 0;
}

// Séance du jour si tu t'entraînes déjà aujourd'hui, sinon la suivante dans la rotation A → B → C.
export function getSuggestedNextDay() {
  const sessions = getSessions();
  if (!sessions.length) return ROTATION[0];
  const last = sessions[sessions.length - 1];
  if (last.date === today()) return last.day;
  return ROTATION[(ROTATION.indexOf(last.day) + 1) % ROTATION.length];
}

// Sauvegarde : fichier JSON avec toutes les séries, à garder hors du navigateur.
export function exportData() {
  return JSON.stringify({ app: "padel-training", exportedAt: new Date().toISOString(), ...state }, null, 2);
}

// Restauration : fusionne les séries du fichier avec celles déjà présentes (sans doublons).
// Retourne le nombre de séries ajoutées.
export function importData(json) {
  const incoming = migrate(JSON.parse(json)).sets.filter((set) => set.exerciseId && set.timestamp && set.date);
  const key = (set) => `${set.exerciseId}-${set.timestamp}`;
  const existing = new Set(state.sets.map(key));
  const added = incoming.filter((set) => !existing.has(key(set)));
  state.sets.push(...added);
  save();
  return added.length;
}
