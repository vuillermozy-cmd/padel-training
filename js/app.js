import { MOBILITY_ROUTINE, ROUTINE_MEDIA, COOLDOWN, STEPS, EXERCISES, PATTERN_LABELS, findExercise, findItem, exerciseName } from "./data.js";
import * as storage from "./storage.js";
import * as sync from "./sync.js";
import { newPlan, ensureChoices, keysForStep, swapKey, swapStep, canExclude, legsPattern } from "./planner.js";
import { getProgressionSuggestion } from "./progression.js";
import { getCurrentPhase, getStrengthSub } from "./periodization.js";
import { lbToKg, snapWeight, stepWeight, DEFAULT_WEIGHT_LB } from "./weights.js";

// Photos de démonstration (position de départ / position finale) issues de free-exercise-db
// (domaine public, github.com/yuhonas/free-exercise-db), stockées localement dans img/exercises/<id>/.
const PHOTO_TOGGLE_INTERVAL_MS = 700;

// Swipe : distance minimale pour valider, et bande près des bords laissée au geste "Retour" de Safari.
const SWIPE_THRESHOLD_PX = 90;
const SWIPE_EDGE_PX = 28;

function renderPhotoFrames(frame0, frame1, alt) {
  return `
    <div class="exercise-photo-wrap">
      <img class="exercise-photo" src="${frame0}" data-frame0="${frame0}" data-frame1="${frame1}" data-current="0" alt="Démonstration : ${alt}" />
    </div>
  `;
}

function renderExercisePhoto(exercise) {
  if (exercise.noPhoto) return `<p class="photo-note">Pas de photo libre de droits fiable pour ce mouvement : regarde la vidéo.</p>`;
  return renderPhotoFrames(`img/exercises/${exercise.id}/0.jpg`, `img/exercises/${exercise.id}/1.jpg`, exercise.name);
}

function youtubeLink(query) {
  return `<a class="yt-link" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer">▶ Voir une démo vidéo</a>`;
}

// Bouton "Démo" d'un élément de routine (mobilité, appuis, conditioning, étirements).
function renderMediaToggle(key) {
  const open = uiState.openMedia.has(key);
  return `<button class="media-toggle ${open ? "open" : ""}" data-action="toggle-media" data-key="${key}">${open ? "Masquer" : "Démo"}</button>`;
}

// Photos dépliées d'un élément de routine, avec leurs crédits, puis le lien vidéo.
function renderRoutineMedia(item, key, { always = false } = {}) {
  if (!always && !uiState.openMedia.has(key)) return "";
  const photos = item.media.map((id) => {
    const media = ROUTINE_MEDIA[id];
    const frame0 = `img/routine/${id}/0.jpg`;
    const frame1 = media.frames === 2 ? `img/routine/${id}/1.jpg` : frame0;
    return renderPhotoFrames(frame0, frame1, item.name)
      + (media.note ? `<p class="photo-note">${media.note}</p>` : "")
      + (media.credit ? `<p class="photo-credit">Photo : <a href="${media.credit.url}" target="_blank" rel="noopener noreferrer">${media.credit.author}</a>, ${media.credit.license}, Wikimedia Commons</p>` : "");
  }).join("");
  return `
    <div class="routine-media">
      ${photos || `<p class="photo-note">Pas de photo libre de droits pour ce mouvement : regarde la vidéo.</p>`}
      ${youtubeLink(item.yt)}
    </div>
  `;
}

setInterval(() => {
  document.querySelectorAll(".exercise-photo").forEach((img) => {
    const showFrame1 = img.dataset.current === "0";
    img.src = showFrame1 ? img.dataset.frame1 : img.dataset.frame0;
    img.dataset.current = showFrame1 ? "1" : "0";
  });
}, PHOTO_TOGGLE_INTERVAL_MS);

const viewContainer = document.getElementById("view-container");
const historySheet = document.getElementById("history-sheet");
const sessionBadge = document.getElementById("session-badge");
const nextDayHint = document.getElementById("next-day-hint");
const phaseHint = document.getElementById("phase-hint");
const bottomNav = document.getElementById("bottom-nav");

const uiState = {
  view: "seance",
  checked: new Set(), // éléments de routine cochés aujourd'hui ("mobility-0", "cooldown-2", "footwork:1"…)
  historyOpen: false,
  openMedia: new Set(), // clés des éléments de routine dont la démo est dépliée
  inputs: {}, // exerciseId -> { weightLb, reps, distanceM } (selon la mesure de l'exercice)
  progressionExerciseId: null,
  backupMessage: "",
  notice: "" // message bref sous la carte (ex. "Tu as fait le tour des équivalents")
};

let chartInstance = null;
// Phase de périodisation en cours (reps cibles pour les exercices de force), recalculée à chaque render().
let currentPhase = getCurrentPhase(storage.getFirstSessionDate(), storage.today());

const DISTANCE_STEP_M = 5;

// ── Plan du jour

function planContext() {
  return { sets: storage.getSetsBeforeToday(), excluded: storage.getExcluded(), sessionIndex: storage.getSessionsBeforeToday() };
}

function getPlan() {
  let plan = storage.loadPlan();
  if (!plan || plan.date !== storage.today()) {
    plan = newPlan(storage.today());
    uiState.checked.clear();
  }
  ensureChoices(plan, planContext());
  storage.savePlan(plan);
  return plan;
}

function updatePlan(mutator) {
  const plan = getPlan();
  mutator(plan, planContext());
  storage.savePlan(plan);
}

// ── Formatage

function getExerciseSub(exercise) {
  if (exercise.repScheme === "max") return `${exercise.sets} x max · repos ${exercise.rest}`;
  return exercise.category === "strength" ? getStrengthSub(exercise, currentPhase) : exercise.sub;
}

function hasWeight(exercise) {
  return exercise.metric === "load" || exercise.metric === "carry";
}

// Le poids est saisi et affiché en lb (unité principale), le kg est calculé et affiché en petit à côté.
function formatWeight(w) {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}

function kgSub(weightLb) {
  return `<span class="unit-sub">(${formatWeight(Math.round(lbToKg(weightLb) * 10) / 10)} kg)</span>`;
}

function weightLabel(exercise) {
  if (exercise.equipment === "medball") return "Balle (lb)";
  if (exercise.perDumbbell) return "Poids par haltère (lb)";
  return "Poids (lb)";
}

// Série formatée selon la mesure de l'exercice (fiche, historique, onglet Progression).
function formatSet(exercise, set) {
  if (exercise.metric === "reps") return `${set.reps} reps`;
  const weight = `${formatWeight(set.weightLb)} lb ${kgSub(set.weightLb)}`;
  return exercise.metric === "carry" ? `${weight} · ${set.distanceM} m` : `${weight} × ${set.reps}`;
}

function getInput(exercise) {
  if (!uiState.inputs[exercise.id]) {
    const suggestion = getProgressionSuggestion(exercise, currentPhase);
    uiState.inputs[exercise.id] = suggestion
      ? { ...suggestion.next }
      : {
          weightLb: DEFAULT_WEIGHT_LB[exercise.equipment],
          reps: exercise.repScheme === "max" ? 3 : 8,
          distanceM: exercise.targetDistanceM
        };
  }
  return uiState.inputs[exercise.id];
}

function formatDateFr(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function updateHeader() {
  const total = storage.getTotalSessions();
  const firstDate = storage.getFirstSessionDate();
  sessionBadge.textContent = `${total} séance${total > 1 ? "s" : ""}`;
  const number = storage.getSessionsBeforeToday() + 1;
  nextDayHint.textContent = storage.hasTrainedToday() ? `Séance n° ${number} en cours` : `Séance n° ${number}`;
  phaseHint.textContent = `Phase actuelle (force) : ${currentPhase.label} · bloc ${currentPhase.block}`
    + (firstDate ? ` · depuis le ${formatDateFr(firstDate)}` : "");
}

// ── Saisie d'une série

function renderSuggestionHint(exercise, suggestion, exerciseSub) {
  const { next } = suggestion;
  if (exercise.metric === "reps") {
    return exercise.repScheme === "max"
      ? `💡 Vise <strong>${next.reps} reps</strong> sur ta meilleure série, une de plus que la dernière fois.`
      : "";
  }
  if (exercise.equipment === "medball") {
    return "Garde la même balle et vise la vitesse d'exécution.";
  }
  const nextWeight = `<strong>${formatWeight(next.weightLb)} lb</strong> ${kgSub(next.weightLb)}`;
  if (exercise.metric === "carry") {
    return suggestion.reachedTarget
      ? `💡 ${exercise.targetDistanceM} m atteints → passe à ${nextWeight}`
      : `Vise ${exercise.targetDistanceM} m par côté avant d'augmenter le poids.`;
  }
  return suggestion.reachedTarget
    ? `💡 Fourchette haute atteinte → passe à ${nextWeight}`
    : `Vise ${exerciseSub.split("·")[0].trim()} avant d'augmenter le poids.`;
}

function renderStepper({ label, action, role, id, value, step, inputmode, sub }) {
  return `
    <div class="stepper">
      <span class="stepper-label">${label}</span>
      <div class="stepper-controls">
        <button class="stepper-btn" data-action="dec-${action}" data-id="${id}">−</button>
        <input class="stepper-input" type="number" inputmode="${inputmode}" step="${step}" data-role="${role}" data-id="${id}" value="${value}" />
        <button class="stepper-btn" data-action="inc-${action}" data-id="${id}">+</button>
      </div>
      ${sub ? `<span class="stepper-subunit">${sub}</span>` : ""}
    </div>
  `;
}

function renderSteppers(exercise, input) {
  const steppers = [];
  if (hasWeight(exercise)) {
    steppers.push(renderStepper({
      label: weightLabel(exercise), action: "weight", role: "weight-input", id: exercise.id,
      value: formatWeight(input.weightLb), step: "any", inputmode: "decimal",
      sub: `≈ ${formatWeight(Math.round(lbToKg(input.weightLb) * 10) / 10)} kg`
    }));
  }
  if (exercise.metric === "carry") {
    steppers.push(renderStepper({
      label: "Distance (m)", action: "distance", role: "distance-input", id: exercise.id,
      value: input.distanceM, step: DISTANCE_STEP_M, inputmode: "numeric"
    }));
  } else {
    steppers.push(renderStepper({
      label: "Reps", action: "reps", role: "reps-input", id: exercise.id,
      value: input.reps, step: 1, inputmode: "numeric"
    }));
  }
  return `<div class="stepper-row">${steppers.join("")}</div>`;
}

function targetSets(exercise) {
  return exercise.sets || parseInt(exercise.sub, 10) || 3;
}

// Saisie (visible une fois l'exercice gardé) : dernière fois, suggestion, steppers, enregistrement, historique.
function renderLogging(exercise) {
  const input = getInput(exercise);
  const suggestion = getProgressionSuggestion(exercise, currentPhase);
  const history = storage.getSetsForExercise(exercise.id).slice(-5).reverse();
  const doneToday = storage.getTodaySets().filter((s) => s.exerciseId === exercise.id).length;
  const exerciseSub = getExerciseSub(exercise);

  let suggestionBox = `<div class="suggestion-box">Aucune donnée encore : entre ta première série ci-dessous.</div>`;
  if (suggestion) {
    const hint = renderSuggestionHint(exercise, suggestion, exerciseSub);
    suggestionBox = `
      <div class="suggestion-box">
        Dernière fois : <strong>${formatSet(exercise, suggestion.last)}</strong> (${formatDateFr(suggestion.last.date)})
        ${hint ? `<br/>${hint}` : ""}
      </div>
    `;
  }

  return `
    <div class="logging">
      ${suggestionBox}
      ${renderSteppers(exercise, input)}
      <button class="btn btn-primary" data-action="save-set" data-id="${exercise.id}">Enregistrer cette série</button>
      <p class="sets-done ${doneToday >= targetSets(exercise) ? "complete" : ""}">Séries aujourd'hui : ${doneToday} / ${targetSets(exercise)}</p>
      ${history.length ? `
        <p class="section-label">Historique récent</p>
        <ul class="history-list">
          ${history.map((h) => `<li><span>${formatDateFr(h.date)}</span><span>${formatSet(exercise, h)}</span></li>`).join("")}
        </ul>
      ` : ""}
    </div>
  `;
}

// Petit bouton "Plus jamais" (retire l'élément des propositions futures, réversible dans Progression).
function renderExcludeButton(key, id) {
  return `<button class="link-btn" data-action="exclude" data-key="${key}" data-item="${id}">🚫 Ne plus me le proposer</button>`;
}

// ── Cartes des étapes

// Un exercice noté (force ou exercice d'un duo).
function renderExerciseBlock(exercise, { key, tag = "", kept, perItemSwap = false }) {
  const pattern = exercise.pattern && PATTERN_LABELS[exercise.pattern] ? ` · ${PATTERN_LABELS[exercise.pattern]}` : "";
  return `
    <div class="exercise-block">
      <h2 class="exercise-name">${tag ? `<span class="duo-tag">${tag}</span>` : ""}${exercise.name}</h2>
      <p class="exercise-fr">${exercise.fr}${pattern}</p>
      <p class="exercise-target">${getExerciseSub(exercise)}</p>
      ${renderExercisePhoto(exercise)}
      ${youtubeLink(exercise.yt)}
      ${kept ? renderLogging(exercise) : `
        <div class="item-actions">
          ${perItemSwap ? `<button class="link-btn" data-action="swap-key" data-key="${key}">↻ Remplacer celui-ci</button>` : ""}
          ${renderExcludeButton(key, exercise.id)}
        </div>
      `}
    </div>
  `;
}

function renderChecklistItem(item, checkKey, mediaKey) {
  const checked = uiState.checked.has(checkKey);
  return `
    <li class="mobility-row">
      <div class="mobility-item ${checked ? "checked" : ""}">
        <input type="checkbox" data-action="check" data-key="${checkKey}" ${checked ? "checked" : ""} />
        <span class="mobility-item-text">
          <span class="mobility-item-name">${item.name}</span><br/>
          <span class="mobility-item-fr">${item.fr}</span>
        </span>
        <span class="mobility-item-sub">${item.sub}</span>
        ${renderMediaToggle(mediaKey)}
      </div>
      ${renderRoutineMedia(item, mediaKey)}
    </li>
  `;
}

function renderStepBody(step, plan) {
  const kept = Boolean(plan.kept[step.id]);

  if (step.kind === "mobility") {
    return `
      <p class="step-intro">Échauffement dynamique, identique à chaque séance.</p>
      <ul class="mobility-list">${MOBILITY_ROUTINE.map((item, i) => renderChecklistItem(item, `mobility-${i}`, `mobility-${i}`)).join("")}</ul>
    `;
  }

  if (step.kind === "cooldown") {
    const pattern = legsPattern(plan);
    return `
      <p class="step-intro">Rouleau puis étirements, choisis d'après ton exercice de jambes du jour (${PATTERN_LABELS[pattern]}).</p>
      <ul class="mobility-list">${COOLDOWN[pattern].map((item, i) => renderChecklistItem(item, `cooldown-${pattern}-${i}`, `cooldown-${pattern}-${i}`)).join("")}</ul>
    `;
  }

  if (step.kind === "footwork") {
    const items = keysForStep(step).map((key) => {
      const item = findItem(plan.choices[key]);
      if (!item) return "";
      return `
        <div class="routine-block">
          <div class="routine-block-head">
            ${kept ? `<input type="checkbox" data-action="check" data-key="${key}" ${uiState.checked.has(key) ? "checked" : ""} />` : ""}
            <div class="routine-block-text">
              <h2 class="exercise-name">${item.name}</h2>
              <p class="exercise-fr">${item.fr}</p>
            </div>
            <span class="exercise-target">${item.sub}</span>
          </div>
          ${item.note ? `<p class="photo-note warn">${item.note}</p>` : ""}
          ${renderRoutineMedia(item, key, { always: true })}
          ${kept ? "" : `
            <div class="item-actions">
              <button class="link-btn" data-action="swap-key" data-key="${key}">↻ Remplacer celui-ci</button>
              ${renderExcludeButton(key, item.id)}
            </div>
          `}
        </div>
      `;
    }).join("");
    return `<p class="step-intro">2 exercices, sans charge, le plus vite possible en restant propre. Récup 30-45s.</p>${items}`;
  }

  if (step.kind === "finisher") {
    const finisher = findItem(plan.choices[step.id]);
    if (!finisher) return "";
    return `
      <h2 class="exercise-name">${finisher.name}</h2>
      <p class="exercise-fr">${finisher.fr}</p>
      <p class="finisher-detail">${finisher.detail}</p>
      ${renderRoutineMedia(finisher, step.id, { always: true })}
      ${kept
        ? `<label class="done-check"><input type="checkbox" data-action="check" data-key="${step.id}" ${uiState.checked.has(step.id) ? "checked" : ""} /> Finisher fait</label>`
        : `<div class="item-actions">${renderExcludeButton(step.id, finisher.id)}</div>`}
    `;
  }

  if (step.kind === "duo") {
    const blocks = keysForStep(step).map((key, i) => {
      const exercise = findExercise(plan.choices[key]);
      return exercise ? renderExerciseBlock(exercise, { key, tag: `${step.id.slice(-1)}${"AB"[i]}`, kept, perItemSwap: true }) : "";
    }).join("");
    return `<p class="step-intro">3 tours : enchaîne A puis B sans pause, puis repos ${step.rest}.</p>${blocks}`;
  }

  const exercise = findExercise(plan.choices[step.id]);
  return exercise ? renderExerciseBlock(exercise, { key: step.id, kept }) : "";
}

function isSwappable(step) {
  return ["footwork", "duo", "strength", "finisher"].includes(step.kind);
}

function isStepDone(step, plan) {
  if (step.kind === "mobility") return MOBILITY_ROUTINE.every((_, i) => uiState.checked.has(`mobility-${i}`));
  if (step.kind === "cooldown") {
    const pattern = legsPattern(plan);
    return COOLDOWN[pattern].every((_, i) => uiState.checked.has(`cooldown-${pattern}-${i}`));
  }
  if (step.kind === "footwork") return keysForStep(step).every((key) => uiState.checked.has(key));
  if (step.kind === "finisher") return uiState.checked.has(step.id);
  const today = storage.getTodaySets();
  return keysForStep(step).every((key) => {
    const ex = findExercise(plan.choices[key]);
    return ex && today.filter((s) => s.exerciseId === ex.id).length >= targetSets(ex);
  });
}

function renderStepBar(plan) {
  return `
    <nav class="step-bar" aria-label="Étapes de la séance">
      ${STEPS.map((step, i) => `
        <button class="step-chip ${i === plan.current ? "active" : ""} ${isStepDone(step, plan) ? "done" : ""}" data-action="go-step" data-index="${i}">
          ${isStepDone(step, plan) ? "✓ " : ""}${step.short}
        </button>
      `).join("")}
    </nav>
  `;
}

function renderSeanceView() {
  const plan = getPlan();
  const step = STEPS[plan.current] || STEPS[0];
  const kept = Boolean(plan.kept[step.id]);
  const swipeable = isSwappable(step) && !kept;
  const isLast = plan.current === STEPS.length - 1;

  const decide = !isSwappable(step) ? "" : kept
    ? `<button class="link-btn center" data-action="unkeep-step">Changer d'exercice</button>`
    : `
      <div class="decide-sticky">
        <div class="decide-row">
          <button class="btn btn-secondary" data-action="swap-step">↻ Autre${step.kind === "duo" ? " duo" : ""}</button>
          <button class="btn btn-primary" data-action="keep-step">✓ Je garde</button>
        </div>
        <p class="swipe-hint">Glisse la carte : ← autre · je garde →</p>
      </div>
    `;

  return `
    ${renderStepBar(plan)}
    <section class="step-card" data-swipe="${swipeable ? "1" : "0"}">
      <p class="step-kicker">Étape ${plan.current + 1}/${STEPS.length} · ${step.title}</p>
      ${renderStepBody(step, plan)}
      ${uiState.notice ? `<p class="notice">${uiState.notice}</p>` : ""}
      ${decide}
    </section>
    <div class="step-nav">
      <button class="btn btn-secondary" data-action="prev-step" ${plan.current === 0 ? "disabled" : ""}>← Précédent</button>
      <button class="btn btn-primary" data-action="next-step" ${isLast ? "disabled" : ""}>${isLast ? "Fin de séance" : "Suivant →"}</button>
    </div>
  `;
}

// ── Historique des séances

const WEEKDAYS_FR = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

// Liste des séances passées, ouverte en touchant le compteur de séances en haut.
function renderHistorySheet() {
  if (!uiState.historyOpen) return "";
  const sessions = storage.getSessions().reverse();
  const rows = sessions.map((session) => {
    const weekday = WEEKDAYS_FR[new Date(`${session.date}T12:00:00`).getDay()];
    const names = [...new Set(session.sets.map((set) => exerciseName(set.exerciseId)))];
    return `
      <li class="history-session">
        <div class="history-session-head">
          <span class="history-session-date">${weekday} ${formatDateFr(session.date)}</span>
          ${session.day ? `<span class="history-session-day">Séance ${session.day.toUpperCase()}</span>` : ""}
        </div>
        <p class="history-session-detail">${session.sets.length} série${session.sets.length > 1 ? "s" : ""} · ${names.join(", ")}</p>
      </li>
    `;
  }).join("");

  return `
    <div class="sheet-backdrop" data-action="close-history"></div>
    <div class="sheet" role="dialog" aria-label="Historique des séances">
      <div class="sheet-header">
        <h2 class="sheet-title">${sessions.length} séance${sessions.length > 1 ? "s" : ""}</h2>
        <button class="sheet-close" data-action="close-history" aria-label="Fermer">✕</button>
      </div>
      ${sessions.length
        ? `<ul class="history-sessions">${rows}</ul>`
        : `<p class="empty-state">Aucune séance enregistrée pour l'instant.</p>`}
    </div>
  `;
}

// ── Onglet Progression

function renderExcludedCard() {
  const excluded = [...storage.getExcluded()];
  return `
    <section class="card excluded-card">
      <div class="card-header">
        <h2 class="card-title">Exercices exclus<span class="card-title-fr">Ceux que tu as marqués « Ne plus me le proposer »</span></h2>
      </div>
      <div class="card-body">
        ${excluded.length
          ? `<ul class="excluded-list">${excluded.map((id) => `
              <li><span>${exerciseName(id)}</span><button class="link-btn" data-action="include" data-item="${id}">Remettre</button></li>
            `).join("")}</ul>`
          : `<p class="sync-text">Aucun pour l'instant.</p>`}
      </div>
    </section>
  `;
}

function renderBackupCard() {
  return `
    <section class="card backup-card">
      <div class="card-header">
        <h2 class="card-title">Sauvegarde<span class="card-title-fr">Tes données restent dans ce navigateur : exporte-les de temps en temps</span></h2>
      </div>
      <div class="card-body">
        <button class="btn btn-primary" data-action="export-data">Exporter mes données</button>
        <label class="btn btn-secondary" for="import-file">Restaurer une sauvegarde</label>
        <input type="file" id="import-file" accept="application/json,.json" hidden />
        ${uiState.backupMessage ? `<p class="backup-message">${uiState.backupMessage}</p>` : ""}
      </div>
    </section>
  `;
}

function formatTime(timestamp) {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function renderSyncCard() {
  const status = sync.getStatus();
  const error = status.state === "error" ? `<p class="sync-error">${status.message}</p>` : "";

  if (!sync.isEnabled()) {
    return `
      <section class="card sync-card">
        <div class="card-header">
          <h2 class="card-title">Synchronisation entre appareils<span class="card-title-fr">Le même historique sur ton téléphone et ton laptop</span></h2>
        </div>
        <div class="card-body">
          <p class="sync-text">Tes séances sont rangées dans un fichier privé sur ton compte GitHub. À faire une fois sur chaque appareil :</p>
          <ol class="sync-steps">
            <li><a href="${sync.TOKEN_URL}" target="_blank" rel="noopener noreferrer">Crée une clé GitHub</a> : laisse coché seulement « gist », choisis une expiration longue, puis « Generate token ».</li>
            <li>Copie la clé et colle-la ici.</li>
          </ol>
          <input class="sync-input" type="password" id="sync-token" placeholder="ghp_…" autocomplete="off" autocapitalize="off" spellcheck="false" />
          <button class="btn btn-primary" data-action="enable-sync" ${status.state === "syncing" ? "disabled" : ""}>${status.state === "syncing" ? "Connexion…" : "Activer la synchro"}</button>
          ${error}
        </div>
      </section>
    `;
  }

  const stateText = {
    syncing: "Synchronisation en cours…",
    ok: status.lastSync ? `Synchronisé à ${formatTime(status.lastSync)}` : "Synchronisé",
    idle: "Synchro activée",
    error: "Dernière synchro en échec"
  }[status.state];

  return `
    <section class="card sync-card">
      <div class="card-header">
        <h2 class="card-title">Synchronisation entre appareils<span class="card-title-fr">${stateText}</span></h2>
      </div>
      <div class="card-body">
        ${error}
        <button class="btn btn-primary" data-action="sync-now" ${status.state === "syncing" ? "disabled" : ""}>Synchroniser maintenant</button>
        <button class="btn btn-secondary" data-action="disable-sync">Désactiver sur cet appareil</button>
        <p class="sync-text sync-link"><a href="${sync.getGistUrl()}" target="_blank" rel="noopener noreferrer">Voir le fichier de synchro sur GitHub</a></p>
      </div>
    </section>
  `;
}

function exportBackup() {
  const blob = new Blob([storage.exportData()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `padel-training-sauvegarde-${storage.today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const added = storage.importData(reader.result);
      uiState.backupMessage = `Sauvegarde restaurée : ${added} série${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""}.`;
    } catch (e) {
      uiState.backupMessage = "Ce fichier n'est pas une sauvegarde valide.";
    }
    render();
  };
  reader.readAsText(file);
}

function renderProgressionView() {
  const total = storage.getTotalSessions();
  const totalSets = storage.getAllSets().length;

  if (!uiState.progressionExerciseId) {
    const last = storage.getAllSets().filter((s) => findExercise(s.exerciseId)).pop();
    uiState.progressionExerciseId = last ? last.exerciseId : EXERCISES[0].id;
  }
  const selected = findExercise(uiState.progressionExerciseId);

  const options = EXERCISES.map((ex) => `
    <option value="${ex.id}" ${ex.id === uiState.progressionExerciseId ? "selected" : ""}>${ex.name} (${ex.fr})</option>
  `).join("");

  const rows = storage.getSetsForExercise(selected.id).reverse();

  return `
    <div class="progress-summary">
      <div class="progress-stat">
        <div class="progress-stat-value">${total}</div>
        <div class="progress-stat-label">Séances complétées</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-value">${totalSets}</div>
        <div class="progress-stat-label">Séries loguées</div>
      </div>
    </div>

    <select class="select-field" data-action="select-exercise" id="exercise-select">${options}</select>

    <div class="chart-wrap">
      <canvas id="progress-chart" height="180"></canvas>
    </div>

    ${rows.length ? `
      <table class="history-table">
        <thead><tr><th>Date</th><th>Série</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr><td>${formatDateFr(r.date)}</td><td>${formatSet(selected, r)}</td></tr>`).join("")}
        </tbody>
      </table>
    ` : `<p class="empty-state">Aucune série loguée pour cet exercice.</p>`}

    ${renderExcludedCard()}
    ${renderSyncCard()}
    ${renderBackupCard()}
  `;
}

function renderChart() {
  const canvas = document.getElementById("progress-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const exercise = findExercise(uiState.progressionExerciseId);
  const byReps = exercise.metric === "reps";
  const sets = storage.getSetsForExercise(exercise.id);
  const labels = sets.map((s) => s.date);
  const data = sets.map((s) => (byReps ? s.reps : s.weightLb));

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: byReps ? "Reps" : "Poids (lb)",
        data,
        borderColor: "#C1652F",
        backgroundColor: "rgba(193, 101, 47, 0.15)",
        tension: 0.25,
        pointRadius: 4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: false, ticks: { color: "#6b6b62" } },
        x: { ticks: { color: "#6b6b62" } }
      }
    }
  });
}

function render() {
  currentPhase = getCurrentPhase(storage.getFirstSessionDate(), storage.today());
  updateHeader();
  viewContainer.innerHTML = uiState.view === "seance" ? renderSeanceView() : renderProgressionView();
  historySheet.innerHTML = renderHistorySheet();
  if (uiState.view === "progression") renderChart();
}

// ── Actions

function clampReps(v) {
  return Math.max(1, Math.round(v));
}

function clampDistance(v) {
  return Math.max(DISTANCE_STEP_M, Math.round(v / DISTANCE_STEP_M) * DISTANCE_STEP_M);
}

// Valeurs à enregistrer pour une série, selon la mesure de l'exercice.
function setValues(exercise, input) {
  if (exercise.metric === "reps") return { reps: input.reps };
  if (exercise.metric === "carry") return { weightLb: input.weightLb, distanceM: input.distanceM };
  return { weightLb: input.weightLb, reps: input.reps };
}

function currentStep() {
  return STEPS[getPlan().current] || STEPS[0];
}

function goToStep(index) {
  updatePlan((plan) => { plan.current = Math.max(0, Math.min(STEPS.length - 1, index)); });
  if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
}

// "Pas aujourd'hui" : toute l'étape (bouton "Autre" ou swipe à gauche) ou un seul élément ("Remplacer celui-ci").
function swap(key) {
  let changed = false;
  updatePlan((plan, ctx) => {
    changed = key ? swapKey(plan, key, ctx) : swapStep(plan, currentStep(), ctx);
  });
  uiState.notice = changed ? "" : "Pas d'autre équivalent disponible pour l'instant.";
}

function keepStep() {
  updatePlan((plan) => { plan.kept[currentStep().id] = true; });
}

function exclude(key, id) {
  const ctx = planContext();
  if (!canExclude(key, id, ctx)) {
    uiState.notice = "C'est le dernier équivalent disponible : remets d'abord un exercice exclu (onglet Progression).";
    return;
  }
  storage.setExcluded(id, true);
  uiState.notice = `« ${exerciseName(id)} » ne te sera plus proposé. Tu peux le remettre dans l'onglet Progression.`;
}

viewContainer.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const ex = target.dataset.id ? findExercise(target.dataset.id) : null;
  const input = ex ? getInput(ex) : null;
  if (action !== "toggle-media") uiState.notice = "";

  if (action === "go-step") {
    goToStep(parseInt(target.dataset.index, 10));
  } else if (action === "next-step") {
    goToStep(getPlan().current + 1);
  } else if (action === "prev-step") {
    goToStep(getPlan().current - 1);
  } else if (action === "swap-step") {
    swap(null);
  } else if (action === "swap-key") {
    swap(target.dataset.key);
  } else if (action === "keep-step") {
    keepStep();
  } else if (action === "unkeep-step") {
    updatePlan((plan) => { delete plan.kept[currentStep().id]; });
  } else if (action === "exclude") {
    exclude(target.dataset.key, target.dataset.item);
  } else if (action === "include") {
    storage.setExcluded(target.dataset.item, false);
  } else if (action === "toggle-media") {
    const key = target.dataset.key;
    if (uiState.openMedia.has(key)) uiState.openMedia.delete(key);
    else uiState.openMedia.add(key);
  } else if (action === "inc-weight" || action === "dec-weight") {
    input.weightLb = stepWeight(ex.equipment, input.weightLb, action === "inc-weight" ? 1 : -1);
  } else if (action === "inc-reps" || action === "dec-reps") {
    input.reps = clampReps(input.reps + (action === "inc-reps" ? 1 : -1));
  } else if (action === "inc-distance" || action === "dec-distance") {
    input.distanceM = clampDistance(input.distanceM + (action === "inc-distance" ? DISTANCE_STEP_M : -DISTANCE_STEP_M));
  } else if (action === "save-set") {
    storage.logSet(ex.id, setValues(ex, input));
  } else if (action === "enable-sync") {
    sync.enable(document.getElementById("sync-token").value);
  } else if (action === "sync-now") {
    sync.syncNow();
  } else if (action === "disable-sync") {
    sync.disable();
  } else if (action === "export-data") {
    exportBackup();
    uiState.backupMessage = "Fichier de sauvegarde téléchargé. Garde-le hors du navigateur (Fichiers, iCloud, e-mail).";
  } else {
    return;
  }
  render();
});

viewContainer.addEventListener("change", (e) => {
  const target = e.target;
  const ex = target.dataset.id ? findExercise(target.dataset.id) : null;
  if (target.dataset.action === "check") {
    if (target.checked) uiState.checked.add(target.dataset.key);
    else uiState.checked.delete(target.dataset.key);
    render();
  } else if (target.dataset.role === "weight-input") {
    // Une saisie libre est ramenée au poids standard le plus proche (ex. 52 → 50 lb).
    getInput(ex).weightLb = snapWeight(ex.equipment, parseFloat(target.value) || 0);
    render();
  } else if (target.dataset.role === "reps-input") {
    getInput(ex).reps = clampReps(parseInt(target.value, 10) || 1);
  } else if (target.dataset.role === "distance-input") {
    getInput(ex).distanceM = clampDistance(parseInt(target.value, 10) || 0);
    render();
  } else if (target.id === "exercise-select") {
    uiState.progressionExerciseId = target.value;
    render();
  } else if (target.id === "import-file" && target.files.length) {
    importBackup(target.files[0]);
  }
});

// ── Swipe sur la carte (tant que l'exercice n'est pas gardé) : gauche = autre, droite = je garde.
// Les gestes qui partent près des bords sont ignorés (geste "Retour" de Safari), et un geste
// plutôt vertical est laissé au défilement de la page.
let swipe = null;

viewContainer.addEventListener("touchstart", (e) => {
  const card = e.target.closest('.step-card[data-swipe="1"]');
  if (!card || e.touches.length !== 1 || e.target.closest("input, a")) return;
  const t = e.touches[0];
  if (t.clientX < SWIPE_EDGE_PX || t.clientX > window.innerWidth - SWIPE_EDGE_PX) return;
  swipe = { card, x0: t.clientX, y0: t.clientY, dx: 0, active: false };
}, { passive: true });

viewContainer.addEventListener("touchmove", (e) => {
  if (!swipe) return;
  const t = e.touches[0];
  const dx = t.clientX - swipe.x0;
  const dy = t.clientY - swipe.y0;
  if (!swipe.active) {
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) swipe.active = true;
    else if (Math.abs(dy) > 12) { swipe = null; return; }
    else return;
  }
  swipe.dx = dx;
  swipe.card.style.transition = "none";
  swipe.card.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`;
  swipe.card.dataset.dir = dx < -SWIPE_THRESHOLD_PX ? "left" : dx > SWIPE_THRESHOLD_PX ? "right" : "";
}, { passive: true });

function endSwipe() {
  if (!swipe) return;
  const { card, dx, active } = swipe;
  swipe = null;
  if (!active) return;
  card.style.transition = "transform 0.18s ease-out";
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX) {
    card.style.transform = "";
    card.dataset.dir = "";
    return;
  }
  card.style.transform = `translateX(${dx < 0 ? -window.innerWidth : window.innerWidth}px) rotate(${dx < 0 ? -12 : 12}deg)`;
  setTimeout(() => {
    uiState.notice = "";
    if (dx < 0) swap(null);
    else keepStep();
    render();
  }, 180);
}

viewContainer.addEventListener("touchend", endSwipe);
viewContainer.addEventListener("touchcancel", endSwipe);

sessionBadge.addEventListener("click", () => {
  uiState.historyOpen = true;
  render();
});

historySheet.addEventListener("click", (e) => {
  if (!e.target.closest("[data-action=\"close-history\"]")) return;
  uiState.historyOpen = false;
  render();
});

// Synchro : l'affichage suit l'état de la synchro, et on récupère les séances des autres appareils
// à l'ouverture de l'app, quand on y revient, et quand la connexion revient.
sync.onStatus(() => render());
if (typeof document.addEventListener === "function") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") sync.syncNow();
  });
}
if (typeof window !== "undefined") window.addEventListener("online", () => sync.syncNow());

bottomNav.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-view]");
  if (!btn) return;
  uiState.view = btn.dataset.view;
  uiState.notice = "";
  [...bottomNav.children].forEach((c) => c.classList.toggle("active", c === btn));
  render();
});

render();
sync.syncNow();
