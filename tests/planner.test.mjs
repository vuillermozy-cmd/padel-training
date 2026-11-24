// Tests du moteur de composition de séance (node --test tests/).
import { test } from "node:test";
import assert from "node:assert/strict";
import { STEPS, EXERCISES, FOOTWORK, FINISHERS } from "../js/data.js";
import { newPlan, ensureChoices, keysForStep, orderForKey, swapKey, swapStep, canExclude, legsPattern } from "../js/planner.js";

const step = (id) => STEPS.find((s) => s.id === id);
const ctx = (over = {}) => ({ sets: [], excluded: new Set(), sessionIndex: 0, ...over });
const set = (exerciseId, timestamp) => ({ exerciseId, timestamp, date: "2026-11-01" });
const allKeys = () => STEPS.flatMap(keysForStep);

test("un plan neuf a un choix pour chaque clé, sans doublon", () => {
  const plan = ensureChoices(newPlan("2026-11-24"), ctx());
  const ids = allKeys().map((k) => plan.choices[k]);
  assert.equal(ids.filter(Boolean).length, allKeys().length);
  assert.equal(new Set(ids).size, ids.length);
});

test("chaque choix respecte le slot de son étape", () => {
  const plan = ensureChoices(newPlan("d"), ctx());
  STEPS.filter((s) => s.kind === "duo").forEach((s) => keysForStep(s).forEach((k, i) => {
    assert.equal(EXERCISES.find((e) => e.id === plan.choices[k]).slot, s.slots[i]);
  }));
  STEPS.filter((s) => s.kind === "strength").forEach((s) => {
    assert.equal(EXERCISES.find((e) => e.id === plan.choices[s.id]).slot, s.slot);
  });
});

test("les tractions sont proposées en premier, le lat pulldown en équivalent", () => {
  const plan = ensureChoices(newPlan("d"), ctx({ sets: [set("lat-pulldown", 5)] }));
  assert.equal(plan.choices.vpull, "pull-up");
  swapKey(plan, "vpull", ctx());
  assert.equal(plan.choices.vpull, "lat-pulldown");
});

test("force : le sous-type le moins récent passe en premier, avec la variante déjà faite", () => {
  const sets = [set("goblet-squat", 30), set("romanian-deadlift", 20), set("reverse-lunge", 10)];
  const order = orderForKey("legs", ctx({ sets })).map((e) => e.id);
  assert.equal(order[0], "reverse-lunge"); // unilatéral = le plus ancien, et la variante déjà faite d'abord
  assert.deepEqual(order.slice(0, 4), ["reverse-lunge", "bulgarian-split-squat", "step-up", "curtsy-lunge"]);
  assert.equal(order[4], "romanian-deadlift"); // puis la charnière de hanche
});

test("force : un sous-type jamais fait passe avant ceux déjà faits", () => {
  const sets = [set("bench-press", 10), set("overhead-press", 20)];
  assert.equal(orderForKey("push", ctx({ sets }))[0].id, "incline-db-press");
});

test("duos : le moins récemment fait d'abord, jamais fait en premier", () => {
  const sets = [set("box-jump", 30), set("broad-jump", 10)];
  const order = orderForKey("duo1:0", ctx({ sets })).map((e) => e.id);
  assert.equal(order[order.length - 1], "box-jump");
  assert.ok(order.indexOf("lateral-bound") < order.indexOf("broad-jump"));
});

test("swap : propose un équivalent du même slot, puis fait le tour sans boucler sur le même", () => {
  const c = ctx();
  const plan = ensureChoices(newPlan("d"), c);
  const pool = EXERCISES.filter((e) => e.slot === "row").map((e) => e.id);
  const seen = [plan.choices.row];
  for (let i = 0; i < pool.length + 2; i++) {
    const before = plan.choices.row;
    assert.equal(swapKey(plan, "row", c), true);
    assert.notEqual(plan.choices.row, before);
    assert.ok(pool.includes(plan.choices.row));
    seen.push(plan.choices.row);
  }
  assert.deepEqual(new Set(seen), new Set(pool));
});

test("swap d'un duo : les deux exercices changent", () => {
  const c = ctx();
  const plan = ensureChoices(newPlan("d"), c);
  const before = keysForStep(step("duo2")).map((k) => plan.choices[k]);
  swapStep(plan, step("duo2"), c);
  const after = keysForStep(step("duo2")).map((k) => plan.choices[k]);
  assert.notEqual(after[0], before[0]);
  assert.notEqual(after[1], before[1]);
});

test("un exercice exclu n'est jamais proposé, et est remplacé dans le plan du jour", () => {
  const plan = ensureChoices(newPlan("d"), ctx());
  const excludedId = plan.choices.legs;
  ensureChoices(plan, ctx({ excluded: new Set([excludedId]) }));
  assert.notEqual(plan.choices.legs, excludedId);
  assert.ok(!orderForKey("legs", ctx({ excluded: new Set([excludedId]) })).some((e) => e.id === excludedId));
});

test("on ne peut pas exclure le dernier équivalent", () => {
  assert.equal(canExclude("vpull", "pull-up", ctx()), true);
  assert.equal(canExclude("vpull", "pull-up", ctx({ excluded: new Set(["lat-pulldown"]) })), false);
  const allButTwo = new Set(FOOTWORK.slice(2).map((f) => f.id));
  assert.equal(canExclude("footwork:0", FOOTWORK[0].id, ctx({ excluded: allButTwo })), false);
});

test("jamais l'échelle à la fois dans les appuis et dans le finisher", () => {
  for (let sessionIndex = 0; sessionIndex < 30; sessionIndex++) {
    const plan = ensureChoices(newPlan("d"), ctx({ sessionIndex }));
    const hasLadder = (item) => (item.tags || []).includes("ladder");
    const footworkLadder = keysForStep(step("footwork")).some((k) => hasLadder(FOOTWORK.find((f) => f.id === plan.choices[k])));
    const finisherLadder = hasLadder(FINISHERS.find((f) => f.id === plan.choices.conditioning));
    assert.ok(!(footworkLadder && finisherLadder), `séance ${sessionIndex}`);
  }
});

test("appuis et finisher tournent d'une séance à l'autre", () => {
  const a = ensureChoices(newPlan("d"), ctx({ sessionIndex: 0 }));
  const b = ensureChoices(newPlan("d"), ctx({ sessionIndex: 1 }));
  assert.notEqual(a.choices["footwork:0"], b.choices["footwork:0"]);
  assert.notEqual(a.choices.conditioning, b.choices.conditioning);
});

test("retour au calme : suit le sous-type de jambes du jour", () => {
  const plan = ensureChoices(newPlan("d"), ctx());
  plan.choices.legs = "romanian-deadlift";
  assert.equal(legsPattern(plan), "hinge");
  plan.choices.legs = "curtsy-lunge";
  assert.equal(legsPattern(plan), "unilateral");
});

test("les poids aux chevilles ne sont proposés que sur des mouvements lents", () => {
  FOOTWORK.filter((f) => /ankle-weight/.test(f.id)).forEach((f) => {
    assert.match(f.name, /\(lent\)/);
    assert.ok(f.note);
  });
});

test("au plus un exercice d'appuis lent (poids aux chevilles) par séance", () => {
  for (let sessionIndex = 0; sessionIndex < 30; sessionIndex++) {
    const plan = ensureChoices(newPlan("d"), ctx({ sessionIndex }));
    const slow = keysForStep(step("footwork")).filter((k) => (FOOTWORK.find((f) => f.id === plan.choices[k]).tags || []).includes("slow"));
    assert.ok(slow.length <= 1, `séance ${sessionIndex}`);
  }
});
