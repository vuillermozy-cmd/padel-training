import { ROUTINE_MEDIA, COOLDOWN, STEPS, EXERCISES, findExercise, findItem, exerciseName } from "./data.js";
import * as storage from "./storage.js";
import * as sync from "./sync.js";
import { newPlan, ensureChoices, keysForStep, swapKey, canExclude, legsPattern, ensureMobility, shuffleMobility, replaceMobility } from "./planner.js";
import { getProgressionSuggestion } from "./progression.js";
import { getCurrentPhase, getStrengthSub } from "./periodization.js";
import { lbToKg, snapWeight, stepWeight, DEFAULT_WEIGHT_LB } from "./weights.js";

// Écran de séance : une carte par étape, le moins d'informations possible.
//   Swipe à droite = étape faite → étape suivante.
//   Swipe à gauche = je ne la fais pas → étape suivante.
//   Flèche ‹ en haut à gauche = étape précédente.
// Le swipe marche au doigt et à la souris (glisser la carte).

// Photos de démonstration (position de départ / position finale) issues de free-exercise-db
// (domaine public, github.com/yuhonas/free-exercise-db), stockées localement dans img/exercises/<id>/.
const PHOTO_TOGGLE_INTERVAL_MS = 700;

// Swipe : distance minimale pour valider, et bande près des bords laissée au geste "Retour" de Safari.
const SWIPE_THRESHOLD_PX = 90;
const SWIPE_EDGE_PX = 28;

function renderPhotoFrames(frame0, frame1, alt) {
  return `
    <div class="exercise-photo-wrap">
      <img class="exercise-photo" src="${frame0}" data-frame0="${frame0}" data-frame1="${frame1}" data-current="0" alt="Démonstration : ${alt}" draggable="false" />
    </div>
  `;
}

function videoLink(query) {
  return `<a class="yt-link" href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer">▶ Vidéo</a>`;
}

// Photo d'un exercice noté (ou rien s'il n'existe pas de photo fiable : le lien vidéo suffit).
function exercisePhoto(exercise) {
  return exercise.noPhoto ? "" : renderPhotoFrames(`img/exercises/${exercise.id}/0.jpg`, `img/exercises/${exercise.id}/1.jpg`, exercise.name);
}

// Photos d'un élément de routine (mobilité, appuis, finisher, étirements), avec leur crédit éventuel.
function routinePhotos(item) {
  return item.media.map((id) => {
    const media = ROUTINE_MEDIA[id];
    const frame0 = `img/routine/${id}/0.jpg`;
    const frame1 = media.frames === 2 ? `img/routine/${id}/1.jpg` : frame0;
    return renderPhotoFrames(frame0, frame1, item.name)
      + (media.note ? `<p class="photo-note">${media.note}</p>` : "")
      + (media.credit ? `<p class="photo-credit">Photo : <a href="${media.credit.url}" target="_blank" rel="noopener noreferrer">${media.credit.author}</a>, ${media.credit.license}, Wikimedia Commons</p>` : "");
  }).join("");
}

setInterval(() => {
  document.querySelectorAll(".exercise-photo").forEach((img) => {
    const showFrame1 = img.dataset.current === "0";
    img.src = showFrame1 ? img.dataset.frame1 : img.dataset.frame0;
    img.dataset.current = showFrame1 ? "1" : "0";
  });
}, PHOTO_TOGGLE_INTERVAL_MS);

const viewContainer = document.getElementById("view-container");
const sessionBadge = document.getElementById("session-badge");
const backBtn = document.getElementById("back-btn");

const uiState = {
  view: "seance", // "seance" | "progression"
  openMedia: new Set(), // éléments de liste (mobilité, étirements) dont la démo est dépliée
  inputs: {}, // exerciseId -> { weightLb, reps, distanceM } (selon la mesure de l'exercice)
  progressionExerciseId: null,
  backupMessage: "",
  notice: "" // message bref sur la carte (ex. exclusion impossible)
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
  if (!plan || plan.date !== storage.today()) plan = newPlan(storage.today());
  if (!plan.status) plan.status = {}; // plan enregistré par la version précédente
  const ctx = planContext();
  ensureChoices(plan, ctx);
  ensureMobility(plan, ctx.excluded);
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
  if (exercise.perDumbbell) return "Lb / haltère";
  return "Poids (lb)";
}

// Série formatée selon la mesure de l'exercice (fiche, onglet Progression).
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
  sessionBadge.textContent = `${total} séance${total > 1 ? "s" : ""}`;
  // La flèche ‹ : étape précédente pendant la séance, retour à la séance depuis la progression.
  const plan = getPlan();
  backBtn.style.visibility = uiState.view === "progression" || plan.current > 0 ? "visible" : "hidden";
}

// ── Saisie d'une série (visible directement sur la carte)

// Une ligne : la dernière fois, et la suggestion si elle change quelque chose.
function renderLastTime(exercise) {
  const suggestion = getProgressionSuggestion(exercise, currentPhase);
  if (!suggestion) return "";
  const { next } = suggestion;
  let hint = "";
  if (exercise.repScheme === "max") hint = ` → vise ${next.reps}`;
  else if (suggestion.reachedTarget) hint = ` → <strong>${formatWeight(next.weightLb)} lb</strong>`;
  return `<p class="last-time">Dernière fois : ${formatSet(exercise, suggestion.last)}${hint}</p>`;
}

function renderStepper({ label, action, role, id, value, step, inputmode }) {
  return `
    <div class="stepper">
      <span class="stepper-label">${label}</span>
      <div class="stepper-controls">
        <button class="stepper-btn" data-action="dec-${action}" data-id="${id}">−</button>
        <input class="stepper-input" type="number" inputmode="${inputmode}" step="${step}" data-role="${role}" data-id="${id}" value="${value}" />
        <button class="stepper-btn" data-action="inc-${action}" data-id="${id}">+</button>
      </div>
    </div>
  `;
}

function renderSteppers(exercise, input) {
  const steppers = [];
  if (hasWeight(exercise)) {
    steppers.push(renderStepper({
      label: `${weightLabel(exercise)} <span class="unit-sub">≈ ${formatWeight(Math.round(lbToKg(input.weightLb) * 10) / 10)} kg</span>`,
      action: "weight", role: "weight-input", id: exercise.id,
      value: formatWeight(input.weightLb), step: "any", inputmode: "decimal"
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

function renderLogging(exercise) {
  const doneToday = storage.getTodaySets().filter((s) => s.exerciseId === exercise.id).length;
  const target = targetSets(exercise);
  return `
    <div class="logging">
      ${renderLastTime(exercise)}
      ${renderSteppers(exercise, getInput(exercise))}
      <button class="btn btn-primary" data-action="save-set" data-id="${exercise.id}">
        Enregistrer la série <span class="sets-count">${doneToday}/${target}</span>
      </button>
    </div>
  `;
}

// Liens discrets sous un exercice : remplacer par un équivalent, ou ne plus jamais le proposer.
function renderItemLinks(key, id) {
  return `
    <div class="item-links">
      <button class="link-btn" data-action="swap-key" data-key="${key}">↻ Remplacer</button>
      <button class="link-btn muted" data-action="exclude" data-key="${key}" data-item="${id}">Ne plus proposer</button>
    </div>
  `;
}

// ── Cartes des étapes

// Titre + consigne sur une ligne, puis photo, lien vidéo et liens.
function renderItemHead(name, target, tag = "") {
  return `
    <div class="item-head">
      <h2 class="exercise-name">${tag ? `<span class="duo-tag">${tag}</span>` : ""}${name}</h2>
      <span class="exercise-target">${target}</span>
    </div>
  `;
}

function renderExerciseBlock(exercise, key, tag = "") {
  return `
    <div class="exercise-block">
      ${renderItemHead(exercise.name, getExerciseSub(exercise), tag)}
      ${exercisePhoto(exercise)}
      <div class="media-row">${videoLink(exercise.yt)}${renderItemLinks(key, exercise.id)}</div>
      ${renderLogging(exercise)}
    </div>
  `;
}

function renderRoutineBlock(item, key, target) {
  return `
    <div class="exercise-block">
      ${renderItemHead(item.name, target)}
      ${item.note ? `<p class="photo-note warn">${item.note}</p>` : ""}
      ${routinePhotos(item)}
      <div class="media-row">${videoLink(item.yt)}${renderItemLinks(key, item.id)}</div>
    </div>
  `;
}

// Liste compacte (mobilité, étirements) : nom, dose, démo dépliable, et "remplacer" pour la mobilité.
function renderListRow(item, mediaKey, replaceIndex = null) {
  const open = uiState.openMedia.has(mediaKey);
  return `
    <li class="list-row">
      <div class="list-row-main">
        <span class="list-row-name">${item.name}</span>
        <span class="list-row-sub">${item.sub}</span>
        <button class="icon-btn ${open ? "open" : ""}" data-action="toggle-media" data-key="${mediaKey}" aria-label="Démo">${open ? "✕" : "▶"}</button>
        ${replaceIndex === null ? "" : `<button class="icon-btn" data-action="replace-mobility" data-index="${replaceIndex}" aria-label="Remplacer">↻</button>`}
      </div>
      ${open ? `<div class="list-row-media">${routinePhotos(item)}${videoLink(item.yt)}</div>` : ""}
    </li>
  `;
}

function renderStepBody(step, plan) {
  if (step.kind === "mobility") {
    return `<ul class="list">${plan.mobility.map((id, i) => renderListRow(findItem(id), `mobility-${id}`, i)).join("")}</ul>`;
  }

  if (step.kind === "cooldown") {
    const pattern = legsPattern(plan);
    return `<ul class="list">${COOLDOWN[pattern].map((item, i) => renderListRow(item, `cooldown-${pattern}-${i}`)).join("")}</ul>`;
  }

  if (step.kind === "footwork") {
    return keysForStep(step).map((key) => {
      const item = findItem(plan.choices[key]);
      return item ? renderRoutineBlock(item, key, item.sub) : "";
    }).join("");
  }

  if (step.kind === "finisher") {
    const finisher = findItem(plan.choices[step.id]);
    if (!finisher) return "";
    return `
      <div class="exercise-block">
        <h2 class="exercise-name">${finisher.name}</h2>
        <p class="finisher-detail">${finisher.detail}</p>
        ${routinePhotos(finisher)}
        <div class="media-row">${videoLink(finisher.yt)}${renderItemLinks(step.id, finisher.id)}</div>
      </div>
    `;
  }

  if (step.kind === "duo") {
    return keysForStep(step).map((key, i) => {
      const exercise = findExercise(plan.choices[key]);
      return exercise ? renderExerciseBlock(exercise, key, `${"AB"[i]}`) : "";
    }).join("");
  }

  const exercise = findExercise(plan.choices[step.id]);
  return exercise ? renderExerciseBlock(exercise, step.id) : "";
}

// Fine barre de progression : un trait par étape (fait, passé, en cours, à venir), touchable.
function renderProgressBar(plan) {
  return `
    <nav class="progress-bar" aria-label="Étapes de la séance">
      ${STEPS.map((step, i) => `
        <button class="progress-seg ${plan.status[step.id] || ""} ${i === plan.current ? "current" : ""}" data-action="go-step" data-index="${i}" aria-label="${step.short}"><span></span></button>
      `).join("")}
    </nav>
  `;
}

// Petite ligne d'info sous le titre de l'étape (repos des duos, routine de mobilité…).
function stepSubtitle(step, plan) {
  if (step.kind === "duo") return `3 tours, A puis B sans pause · repos ${step.rest}`;
  if (step.kind === "cooldown") return "Rouleau puis étirements";
  return "";
}

function renderFinished(plan) {
  const todayCount = storage.getTodaySets().length;
  const done = STEPS.filter((s) => plan.status[s.id] === "done").length;
  return `
    ${renderProgressBar(plan)}
    <section class="step-card finished">
      <p class="finished-emoji">🎾</p>
      <h2 class="exercise-name">Séance terminée</h2>
      <p class="finished-detail">${done} étape${done > 1 ? "s" : ""} sur ${STEPS.length} · ${todayCount} série${todayCount > 1 ? "s" : ""} enregistrée${todayCount > 1 ? "s" : ""}</p>
      <button class="btn btn-primary" data-action="open-progression">Voir ma progression</button>
    </section>
  `;
}

function renderSeanceView() {
  const plan = getPlan();
  if (plan.current >= STEPS.length) return renderFinished(plan);
  const step = STEPS[plan.current];
  const subtitle = stepSubtitle(step, plan);
  return `
    ${renderProgressBar(plan)}
    <section class="step-card" data-swipe="1">
      <div class="step-head">
        <p class="step-kicker">${step.title}<span class="step-count">${plan.current + 1}/${STEPS.length}</span></p>
        ${step.kind === "mobility" ? `<button class="shuffle-btn" data-action="shuffle-mobility">🔀 Mélanger</button>` : ""}
      </div>
      ${subtitle ? `<p class="step-sub">${subtitle}</p>` : ""}
      ${renderStepBody(step, plan)}
      ${uiState.notice ? `<p class="notice">${uiState.notice}</p>` : ""}
      <p class="swipe-hint">← je passe · fait →</p>
    </section>
  `;
}

// ── Page Progression (ouverte par le bouton des séances)

const WEEKDAYS_FR = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

function renderSessionsCard() {
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
    <section class="card">
      <div class="card-header"><h2 class="card-title">Mes séances</h2></div>
      <div class="card-body">
        ${sessions.length ? `<ul class="history-sessions">${rows}</ul>` : `<p class="empty-state">Aucune séance enregistrée pour l'instant.</p>`}
      </div>
    </section>
  `;
}

function renderExcludedCard() {
  const excluded = [...storage.getExcluded()];
  return `
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">Exercices exclus<span class="card-title-fr">Ceux que tu as marqués « Ne plus proposer »</span></h2>
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
    <section class="card">
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
      <section class="card">
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
    <section class="card">
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
  const firstDate = storage.getFirstSessionDate();

  if (!uiState.progressionExerciseId) {
    const last = storage.getAllSets().filter((s) => findExercise(s.exerciseId)).pop();
    uiState.progressionExerciseId = last ? last.exerciseId : EXERCISES[0].id;
  }
  const selected = findExercise(uiState.progressionExerciseId);
  const options = EXERCISES.map((ex) => `
    <option value="${ex.id}" ${ex.id === uiState.progressionExerciseId ? "selected" : ""}>${ex.name}</option>
  `).join("");
  const rows = storage.getSetsForExercise(selected.id).reverse();

  return `
    <div class="progress-summary">
      <div class="progress-stat">
        <div class="progress-stat-value">${total}</div>
        <div class="progress-stat-label">Séances</div>
      </div>
      <div class="progress-stat">
        <div class="progress-stat-value">${totalSets}</div>
        <div class="progress-stat-label">Séries</div>
      </div>
    </div>
    <p class="phase-line">Force : phase ${currentPhase.label} · bloc ${currentPhase.block}${firstDate ? ` · depuis le ${formatDateFr(firstDate)}` : ""}</p>

    <select class="select-field" id="exercise-select">${options}</select>
    <div class="chart-wrap"><canvas id="progress-chart" height="180"></canvas></div>
    ${rows.length ? `
      <table class="history-table">
        <thead><tr><th>Date</th><th>Série</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${formatDateFr(r.date)}</td><td>${formatSet(selected, r)}</td></tr>`).join("")}</tbody>
      </table>
    ` : `<p class="empty-state">Aucune série loguée pour cet exercice.</p>`}

    ${renderSessionsCard()}
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

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: sets.map((s) => s.date),
      datasets: [{
        label: byReps ? "Reps" : "Poids (lb)",
        data: sets.map((s) => (byReps ? s.reps : s.weightLb)),
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

function scrollTop() {
  if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
}

function goToStep(index) {
  updatePlan((plan) => { plan.current = Math.max(0, Math.min(STEPS.length, index)); });
  uiState.notice = "";
  scrollTop();
}

// Fin d'une étape : "done" (swipe à droite) ou "skipped" (swipe à gauche), puis l'étape suivante.
function finishStep(status) {
  updatePlan((plan) => {
    const step = STEPS[plan.current];
    if (step) plan.status[step.id] = status;
    plan.current = Math.min(STEPS.length, plan.current + 1);
  });
  uiState.notice = "";
  scrollTop();
}

function exclude(key, id) {
  if (!canExclude(key, id, planContext())) {
    uiState.notice = "C'est le dernier équivalent disponible : remets d'abord un exercice exclu (page Progression).";
    return;
  }
  storage.setExcluded(id, true);
  uiState.notice = `« ${exerciseName(id)} » ne te sera plus proposé (réversible dans la page Progression).`;
}

function openView(view) {
  uiState.view = view;
  uiState.notice = "";
  scrollTop();
}

viewContainer.addEventListener("click", (e) => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const ex = target.dataset.id ? findExercise(target.dataset.id) : null;
  const input = ex ? getInput(ex) : null;
  if (action !== "toggle-media") uiState.notice = "";

  if (action === "go-step") {
    goToStep(parseInt(target.dataset.index, 10));
  } else if (action === "swap-key") {
    updatePlan((plan, ctx) => {
      if (!swapKey(plan, target.dataset.key, ctx)) uiState.notice = "Pas d'autre équivalent disponible pour l'instant.";
    });
  } else if (action === "exclude") {
    exclude(target.dataset.key, target.dataset.item);
  } else if (action === "shuffle-mobility") {
    updatePlan((plan, ctx) => shuffleMobility(plan, ctx.excluded));
    uiState.openMedia.clear();
  } else if (action === "replace-mobility") {
    updatePlan((plan, ctx) => replaceMobility(plan, parseInt(target.dataset.index, 10), ctx.excluded));
  } else if (action === "open-progression") {
    openView("progression");
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
  if (target.dataset.role === "weight-input") {
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

// ── Swipe de la carte (doigt ou souris) : droite = fait, gauche = je passe, et dans les deux cas étape suivante.
// Au doigt, les gestes qui partent près des bords sont ignorés (geste "Retour" de Safari), et un geste
// plutôt vertical est laissé au défilement de la page. Un glissement ne déclenche pas le bouton sous le doigt.
let swipe = null;
let suppressClick = false;

viewContainer.addEventListener("pointerdown", (e) => {
  const card = e.target.closest('.step-card[data-swipe="1"]');
  if (!card || !e.isPrimary || e.button > 0 || e.target.closest("input, select, a")) return;
  if (e.pointerType === "touch" && (e.clientX < SWIPE_EDGE_PX || e.clientX > window.innerWidth - SWIPE_EDGE_PX)) return;
  swipe = { card, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, active: false };
});

viewContainer.addEventListener("pointermove", (e) => {
  if (!swipe || e.pointerId !== swipe.id) return;
  const dx = e.clientX - swipe.x0;
  const dy = e.clientY - swipe.y0;
  if (!swipe.active) {
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swipe.active = true;
      try { swipe.card.setPointerCapture(e.pointerId); } catch (err) { /* capture indisponible */ }
    } else if (Math.abs(dy) > 12) {
      swipe = null;
      return;
    } else {
      return;
    }
  }
  swipe.dx = dx;
  swipe.card.style.transition = "none";
  swipe.card.style.transform = `translateX(${dx}px) rotate(${dx / 40}deg)`;
  swipe.card.dataset.dir = dx < -SWIPE_THRESHOLD_PX ? "left" : dx > SWIPE_THRESHOLD_PX ? "right" : "";
});

function endSwipe(e) {
  if (!swipe || (e && e.pointerId !== swipe.id)) return;
  const { card, dx, active } = swipe;
  swipe = null;
  if (!active) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  card.style.transition = "transform 0.18s ease-out";
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX) {
    card.style.transform = "";
    card.dataset.dir = "";
    return;
  }
  card.style.transform = `translateX(${dx < 0 ? -window.innerWidth : window.innerWidth}px) rotate(${dx < 0 ? -12 : 12}deg)`;
  setTimeout(() => {
    finishStep(dx > 0 ? "done" : "skipped");
    render();
  }, 180);
}

viewContainer.addEventListener("pointerup", endSwipe);
viewContainer.addEventListener("pointercancel", endSwipe);

backBtn.addEventListener("click", () => {
  if (uiState.view === "progression") openView("seance");
  else goToStep(getPlan().current - 1);
  render();
});

sessionBadge.addEventListener("click", () => {
  openView(uiState.view === "progression" ? "seance" : "progression");
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

render();
sync.syncNow();
