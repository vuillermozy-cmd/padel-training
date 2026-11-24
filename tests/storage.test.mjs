// Tests du stockage (migration, préférences, sauvegarde) avec un faux localStorage.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

// Données au format des anciennes versions (séances A/B/C) avant le premier chargement du module.
store.set("padel-training-data-v1", JSON.stringify({ version: 2, sets: [
  { exerciseId: "goblet-squat", day: "a", date: "2026-10-01", timestamp: 1, weightLb: 20, reps: 8 },
  { exerciseId: "bench-press", day: "a", date: "2026-10-01", timestamp: 2, weightLb: 45, reps: 10 }
] }));

const storage = await import("../js/storage.js");

test("les anciennes séries A/B/C sont conservées", () => {
  const sessions = storage.getSessions();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].day, "a");
  assert.equal(sessions[0].sets.length, 2);
});

test("une nouvelle série n'a plus de champ day et compte comme séance du jour", () => {
  const entry = storage.logSet("leg-press", { weightLb: 90, reps: 10 });
  assert.equal(entry.day, undefined);
  assert.equal(entry.date, storage.today());
  assert.equal(storage.getTodaySets().length, 1);
  assert.equal(storage.getSessionsBeforeToday(), 1);
  assert.equal(storage.getSetsBeforeToday().length, 2);
});

test("exclusions : ajout, retrait, et la version la plus récente gagne", () => {
  storage.setExcluded("box-jump", true);
  assert.ok(storage.getExcluded().has("box-jump"));
  const local = storage.getPrefs();
  assert.equal(storage.mergePrefs({ excluded: [], updatedAt: local.updatedAt - 1 }), false);
  assert.ok(storage.getExcluded().has("box-jump"));
  assert.equal(storage.mergePrefs({ excluded: ["dead-bug"], updatedAt: local.updatedAt + 1 }), true);
  assert.deepEqual([...storage.getExcluded()], ["dead-bug"]);
});

test("la sauvegarde contient séries et préférences, et la restauration ne crée pas de doublon", () => {
  const json = storage.exportData();
  assert.deepEqual(storage.parsePrefs(json).excluded, ["dead-bug"]);
  assert.equal(storage.parseSets(json).length, 3);
  assert.equal(storage.importData(json), 0);
});

test("un fichier de synchro d'une ancienne version (sans préférences) se lit sans erreur", () => {
  const old = JSON.stringify({ app: "padel-training", version: 2, sets: [] });
  assert.equal(storage.parsePrefs(old), null);
  assert.equal(storage.mergePrefs(storage.parsePrefs(old)), false);
});

test("le plan du jour est sauvegardé et relu", () => {
  storage.savePlan({ date: "2026-11-24", choices: { legs: "leg-press" } });
  assert.equal(storage.loadPlan().choices.legs, "leg-press");
});
