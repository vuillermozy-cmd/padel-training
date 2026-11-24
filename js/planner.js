// Composition de la séance du jour, sans aucun accès au navigateur (testable en Node).
//
// Le plan du jour : { date, choices, skipped, kept, current }
//   choices : clé → id choisi. Une clé par exercice à choisir : "legs", "duo1:0", "duo1:1", "footwork:0", "conditioning"…
//   skipped : clé → ids refusés "pas aujourd'hui" pour cette clé (on ne les repropose pas tant qu'il reste autre chose).
//   kept    : étape → true quand l'exercice proposé est gardé ("Je garde").
//   current : index de l'étape affichée.
// Les choix sont figés dans le plan : enregistrer une série ne change pas ce qui est proposé dans la journée.
//
// Contexte (ctx) : { sets, excluded, sessionIndex }
//   sets         : séries des jours précédents (pas celles du jour, pour que l'ordre ne bouge pas en cours de séance).
//   excluded     : Set des ids "plus jamais".
//   sessionIndex : nombre de séances avant aujourd'hui (fait tourner appuis et finishers, qui ne sont pas notés).

import { STEPS, EXERCISES, FOOTWORK, FINISHERS } from "./data.js";

export function newPlan(date) {
  return { date, choices: {}, skipped: {}, kept: {}, current: 0 };
}

export function keysForStep(step) {
  if (step.kind === "duo") return step.slots.map((_, i) => `${step.id}:${i}`);
  if (step.kind === "footwork") return Array.from({ length: step.count }, (_, i) => `${step.id}:${i}`);
  if (step.kind === "strength" || step.kind === "finisher") return [step.id];
  return [];
}

function stepForKey(key) {
  return STEPS.find((s) => s.id === key.split(":")[0]);
}

// Tous les éléments possibles pour une clé, dans l'ordre de la banque.
function poolForKey(key) {
  const step = stepForKey(key);
  if (step.kind === "duo") return EXERCISES.filter((e) => e.slot === step.slots[Number(key.split(":")[1])]);
  if (step.kind === "strength") return EXERCISES.filter((e) => e.slot === step.slot);
  if (step.kind === "footwork") return FOOTWORK;
  return FINISHERS;
}

function lastDoneMap(sets) {
  const last = new Map();
  sets.forEach((set) => {
    if (!last.has(set.exerciseId) || last.get(set.exerciseId) < set.timestamp) last.set(set.exerciseId, set.timestamp);
  });
  return last;
}

function rotate(list, offset) {
  if (!list.length) return list;
  const k = ((offset % list.length) + list.length) % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
}

// Ordre de préférence des éléments d'une clé (les exclus "plus jamais" sont retirés).
export function orderForKey(key, ctx) {
  const step = stepForKey(key);
  const pool = poolForKey(key).filter((item) => !ctx.excluded.has(item.id));
  const last = lastDoneMap(ctx.sets);
  const lastOf = (item) => (last.has(item.id) ? last.get(item.id) : -1);

  if (step.kind === "footwork") return rotate(pool, ctx.sessionIndex * step.count);
  if (step.kind === "finisher") return rotate(pool, ctx.sessionIndex);
  if (step.fixedOrder) return pool;

  if (step.kind === "strength") {
    // Sous-type le moins récent d'abord ; dans un sous-type, la variante faite la dernière fois d'abord
    // (pour la suggestion de poids), puis celles jamais faites, dans l'ordre de la banque.
    const patterns = [...new Set(pool.map((e) => e.pattern || e.id))];
    const patternLast = (p) => Math.max(...pool.filter((e) => (e.pattern || e.id) === p).map(lastOf));
    const sortedPatterns = [...patterns].sort((a, b) => patternLast(a) - patternLast(b));
    return sortedPatterns.flatMap((p) => pool
      .filter((e) => (e.pattern || e.id) === p)
      .sort((a, b) => lastOf(b) - lastOf(a)));
  }

  // Duos : la variété d'abord, le moins récemment fait (jamais fait = en premier).
  return [...pool].sort((a, b) => lastOf(a) - lastOf(b));
}

function tagsOf(id) {
  const item = [...FOOTWORK, ...FINISHERS].find((i) => i.id === id);
  return (item && item.tags) || [];
}

// Choisit l'élément d'une clé, en évitant ce qui est déjà au programme du jour (et l'échelle en double).
function pickFor(key, plan, ctx, { avoidCurrent = false } = {}) {
  const others = Object.entries(plan.choices).filter(([k]) => k !== key).map(([, id]) => id);
  const otherTags = new Set(others.flatMap(tagsOf));
  const order = orderForKey(key, ctx);
  const candidates = order.filter((item) => !others.includes(item.id) && !(item.tags || []).some((t) => otherTags.has(t)));
  const pool = candidates.length ? candidates : order;
  if (!pool.length) return null;

  const current = plan.choices[key];
  const skipped = plan.skipped[key] || [];
  let fresh = pool.filter((item) => !skipped.includes(item.id) && !(avoidCurrent && item.id === current));
  if (!fresh.length) {
    // On a fait le tour : on repart de la liste complète, sans reproposer celui qu'on vient de refuser.
    plan.skipped[key] = current ? [current] : [];
    fresh = pool.filter((item) => item.id !== current);
    if (!fresh.length) fresh = pool;
  }
  return fresh[0].id;
}

// Complète le plan : choisit ce qui manque et remplace ce qui a été exclu entre-temps (synchro).
// Le finisher est choisi avant les appuis : en cas de conflit (échelle), ce sont les appuis, plus nombreux,
// qui s'adaptent, et le finisher garde sa rotation d'une séance à l'autre.
export function ensureChoices(plan, ctx) {
  const ordered = [...STEPS.filter((s) => s.kind !== "footwork"), ...STEPS.filter((s) => s.kind === "footwork")];
  ordered.forEach((step) => keysForStep(step).forEach((key) => {
    const id = plan.choices[key];
    if (!id || ctx.excluded.has(id)) {
      delete plan.choices[key];
      const picked = pickFor(key, plan, ctx);
      if (picked) plan.choices[key] = picked;
    }
  }));
  return plan;
}

// "Pas aujourd'hui" sur un élément : propose le suivant. Retourne true si le choix a changé.
export function swapKey(plan, key, ctx) {
  const current = plan.choices[key];
  if (current) plan.skipped[key] = [...new Set([...(plan.skipped[key] || []), current])];
  const next = pickFor(key, plan, ctx, { avoidCurrent: true });
  if (!next) return false;
  plan.choices[key] = next;
  return next !== current;
}

// "Pas aujourd'hui" sur toute une étape (ex. un duo : les deux exercices changent).
export function swapStep(plan, step, ctx) {
  let changed = false;
  keysForStep(step).forEach((key) => { changed = swapKey(plan, key, ctx) || changed; });
  return changed;
}

// On ne peut pas exclure le dernier élément possible d'une clé (il faut toujours un équivalent).
export function canExclude(key, id, ctx) {
  const step = stepForKey(key);
  const needed = step.kind === "footwork" ? step.count : 1;
  const remaining = poolForKey(key).filter((item) => item.id !== id && !ctx.excluded.has(item.id));
  return remaining.length >= needed;
}

// Sous-type de jambes du jour, pour choisir les étirements du retour au calme.
export function legsPattern(plan) {
  const ex = EXERCISES.find((e) => e.id === plan.choices.legs);
  return ex ? ex.pattern : "squat";
}
