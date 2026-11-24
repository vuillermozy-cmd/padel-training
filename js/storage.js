// Persistance locale (localStorage) — aucune donnée ne quitte l'appareil.
//
// Chaque série est enregistrée immédiatement et définitivement, avec sa date. Les séries des anciennes
// versions gardent leur champ "day" (séance A/B/C) ; les nouvelles n'en ont plus (séance composée à la volée).
// Une séance = un jour d'entraînement : le compteur et l'historique se déduisent des séries,
// il n'y a plus de "séance en cours" à terminer (et donc plus rien qui puisse être perdu en route).

import { LB_PER_KG } from "./weights.js";

const STORAGE_KEY = "padel-training-data-v1";
const BACKUP_KEY = "padel-training-data-v1-backup";
// Préférences synchronisées entre appareils : { excluded: [ids "plus jamais"], updatedAt }.
const PREFS_KEY = "padel-training-prefs";
// Plan du jour (exercices proposés, refusés, gardés), propre à cet appareil (voir planner.js).
const PLAN_KEY = "padel-training-plan";

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

// Abonnés prévenus quand des séries sont ajoutées sur cet appareil (utilisé par la synchro).
const changeListeners = [];

export function onChange(listener) {
  changeListeners.push(listener);
}

function notifyChange() {
  changeListeners.forEach((listener) => listener());
}

// Demande au navigateur de ne pas effacer ces données pour libérer de la place.
if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

// Enregistre une série (fiche exercice → "Enregistrer cette série").
// values : les champs de la mesure de l'exercice, parmi { weightLb, reps, distanceM }.
export function logSet(exerciseId, values) {
  const timestamp = Date.now();
  const entry = { exerciseId, date: localDate(timestamp), timestamp, ...values };
  state.sets.push(entry);
  save();
  notifyChange();
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

// Séances = jours d'entraînement, du plus ancien au plus récent : [{ date, day, sets }]
// (day : "a", "b" ou "c" pour les séances des anciennes versions, absent ensuite).
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

// Séries des jours précédents (pour composer la séance du jour sans que l'ordre bouge en cours de séance).
export function getSetsBeforeToday() {
  const date = today();
  return getAllSets().filter((set) => set.date < date);
}

// Nombre de séances avant aujourd'hui.
export function getSessionsBeforeToday() {
  const date = today();
  return getSessions().filter((s) => s.date < date).length;
}

// ── Préférences ("plus jamais"), fusionnées entre appareils : la version la plus récente gagne.

function loadPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY));
    if (parsed && Array.isArray(parsed.excluded)) return { excluded: parsed.excluded, updatedAt: parsed.updatedAt || 0 };
  } catch (e) { /* préférences illisibles : on repart des valeurs par défaut */ }
  return { excluded: [], updatedAt: 0 };
}

let prefs = loadPrefs();

function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function getPrefs() {
  return { excluded: [...prefs.excluded], updatedAt: prefs.updatedAt };
}

export function getExcluded() {
  return new Set(prefs.excluded);
}

export function setExcluded(id, isExcluded) {
  const next = new Set(prefs.excluded);
  if (isExcluded) next.add(id);
  else next.delete(id);
  prefs = { excluded: [...next], updatedAt: Date.now() };
  savePrefs();
  notifyChange();
}

// Lit les préférences d'un fichier de sauvegarde ou de synchro (null si absentes).
export function parsePrefs(json) {
  const parsed = JSON.parse(json);
  const p = parsed && parsed.prefs;
  return p && Array.isArray(p.excluded) ? { excluded: p.excluded, updatedAt: p.updatedAt || 0 } : null;
}

// Garde les préférences les plus récentes. Retourne true si celles reçues ont remplacé les locales.
export function mergePrefs(incoming, { silent = false } = {}) {
  if (!incoming || incoming.updatedAt <= prefs.updatedAt) return false;
  prefs = { excluded: [...incoming.excluded], updatedAt: incoming.updatedAt };
  savePrefs();
  if (!silent) notifyChange();
  return true;
}

// ── Plan du jour (local à l'appareil)

export function loadPlan() {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY));
  } catch (e) {
    return null;
  }
}

export function savePlan(plan) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch (e) { /* plan non sauvegardé : il sera recomposé au prochain chargement */ }
}

// Sauvegarde : fichier JSON avec toutes les séries et les préférences, à garder hors du navigateur.
export function exportData() {
  return JSON.stringify({ app: "padel-training", exportedAt: new Date().toISOString(), ...state, prefs }, null, 2);
}

// Une série est identifiée par son exercice et l'instant où elle a été enregistrée.
export function setKey(set) {
  return `${set.exerciseId}-${set.timestamp}`;
}

// Lit un fichier de sauvegarde ou de synchro (tous formats) et retourne ses séries valides.
export function parseSets(json) {
  return migrate(JSON.parse(json)).sets.filter((set) => set.exerciseId && set.timestamp && set.date);
}

// Fusionne des séries avec celles déjà présentes (sans doublons). Retourne le nombre de séries ajoutées.
// silent : ne pas prévenir les abonnés (la synchro fusionne ce qu'elle vient elle-même de lire).
export function mergeSets(incoming, { silent = false } = {}) {
  const existing = new Set(state.sets.map(setKey));
  const added = incoming.filter((set) => !existing.has(setKey(set)));
  if (added.length) {
    state.sets.push(...added);
    save();
    if (!silent) notifyChange();
  }
  return added.length;
}

// Restauration d'un fichier de sauvegarde. Retourne le nombre de séries ajoutées.
export function importData(json) {
  mergePrefs(parsePrefs(json));
  return mergeSets(parseSets(json));
}
