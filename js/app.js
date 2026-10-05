import { MOBILITY_ROUTINE, CONDITIONING_FINISHER, SESSIONS, findExercise } from "./data.js";
import * as storage from "./storage.js";
import { getProgressionSuggestion } from "./progression.js";
import { getCurrentPhase, getStrengthSub } from "./periodization.js";
import { lbToKg, snapWeight, stepWeight, DEFAULT_WEIGHT_LB } from "./weights.js";

// Photos de démonstration (position de départ / position finale) issues de free-exercise-db
// (domaine public, github.com/yuhonas/free-exercise-db), stockées localement dans img/exercises/<id>/.
const PHOTO_TOGGLE_INTERVAL_MS = 700;

function getExercisePhotoFrames(exerciseId) {
  return [`img/exercises/${exerciseId}/0.jpg`, `img/exercises/${exerciseId}/1.jpg`];
}

function renderExercisePhoto(exercise) {
  if (exercise.noPhoto) return "";
  const [frame0, frame1] = getExercisePhotoFrames(exercise.id);
  return `
    <div class="exercise-photo-wrap">
      <img class="exercise-photo" src="${frame0}" data-frame0="${frame0}" data-frame1="${frame1}" data-current="0" alt="Démonstration : ${exercise.name}" />
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
const sessionBadge = document.getElementById("session-badge");
const nextDayHint = document.getElementById("next-day-hint");
const phaseHint = document.getElementById("phase-hint");
const bottomNav = document.getElementById("bottom-nav");

const DAY_LABELS = { a: "Séance A", b: "Séance B", c: "Séance C" };

const uiState = {
  view: "seance",
  day: storage.getSuggestedNextDay(),
  expanded: new Set(),
  mobilityOpen: false,
  mobilityChecked: new Set(),
  conditioningOpen: false,
  inputs: {}, // exerciseId -> { weightLb, reps, distanceM } (selon la mesure de l'exercice)
  progressionExerciseId: null,
  backupMessage: ""
};

let chartInstance = null;
// Phase de périodisation en cours (reps cibles pour les exercices de force), recalculée à chaque render().
let currentPhase = getCurrentPhase(storage.getFirstSessionDate(), storage.today());

const DISTANCE_STEP_M = 5;

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

function getInput(exerciseId, exercise) {
  if (!uiState.inputs[exerciseId]) {
    const suggestion = getProgressionSuggestion(exercise, currentPhase);
    uiState.inputs[exerciseId] = suggestion
      ? { ...suggestion.next }
      : {
          weightLb: DEFAULT_WEIGHT_LB[exercise.equipment],
          reps: exercise.repScheme === "max" ? 3 : 8,
          distanceM: exercise.targetDistanceM
        };
  }
  return uiState.inputs[exerciseId];
}

function formatDateFr(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function updateHeader() {
  const total = storage.getTotalSessions();
  const firstDate = storage.getFirstSessionDate();
  sessionBadge.textContent = `${total} séance${total > 1 ? "s" : ""}`;
  nextDayHint.textContent = storage.hasTrainedToday()
    ? `Séance du jour : ${DAY_LABELS[storage.getSuggestedNextDay()]}`
    : `Prochaine séance suggérée : ${DAY_LABELS[storage.getSuggestedNextDay()]}`;
  phaseHint.textContent = `Phase actuelle (force) : ${currentPhase.label} · bloc ${currentPhase.block}`
    + (firstDate ? ` · depuis le ${formatDateFr(firstDate)}` : "");
}

function renderMobilityCard() {
  const items = MOBILITY_ROUTINE.map((item, idx) => {
    const checked = uiState.mobilityChecked.has(idx);
    return `
      <li class="mobility-item ${checked ? "checked" : ""}">
        <input type="checkbox" data-action="toggle-mobility" data-idx="${idx}" ${checked ? "checked" : ""} />
        <span class="mobility-item-text">
          <span class="mobility-item-name">${item.name}</span><br/>
          <span class="mobility-item-fr">${item.fr}</span>
        </span>
        <span class="mobility-item-sub">${item.sub}</span>
      </li>
    `;
  }).join("");

  return `
    <section class="card mobility-card">
      <div class="card-header" data-action="toggle-mobility-section" role="button">
        <h2 class="card-title">Routine Mobilité &amp; Souplesse<span class="card-title-fr">Identique à chaque séance</span></h2>
        <button class="chevron">${uiState.mobilityOpen ? "▲" : "▼"}</button>
      </div>
      ${uiState.mobilityOpen ? `
        <div class="card-body">
          <ul class="mobility-list">${items}</ul>
        </div>
      ` : ""}
    </section>
  `;
}

function renderFinisherItem(item) {
  return `
    <li class="mobility-item">
      <span class="mobility-item-text">
        <span class="mobility-item-name">${item.name}</span><br/>
        <span class="mobility-item-fr">${item.fr}</span>
      </span>
      <span class="mobility-item-sub">${item.sub}</span>
    </li>
  `;
}

function renderConditioningCard() {
  return `
    <section class="card conditioning-card">
      <div class="card-header" data-action="toggle-conditioning-section" role="button">
        <h2 class="card-title">Conditioning<span class="card-title-fr">Finisher, identique à chaque séance</span></h2>
        <button class="chevron">${uiState.conditioningOpen ? "▲" : "▼"}</button>
      </div>
      ${uiState.conditioningOpen ? `
        <div class="card-body">
          <ul class="mobility-list">${renderFinisherItem(CONDITIONING_FINISHER.main)}</ul>
          <p class="section-label finisher-alt-label">Ou, au choix</p>
          <ul class="mobility-list">${CONDITIONING_FINISHER.alternatives.map(renderFinisherItem).join("")}</ul>
        </div>
      ` : ""}
    </section>
  `;
}

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

function renderExerciseCard(exercise) {
  const isOpen = uiState.expanded.has(exercise.id);
  const input = getInput(exercise.id, exercise);
  const suggestion = getProgressionSuggestion(exercise, currentPhase);
  const history = storage.getSetsForExercise(exercise.id).slice(-5).reverse();
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.yt)}`;
  const exerciseSub = getExerciseSub(exercise);

  let suggestionBox = `<div class="suggestion-box">Aucune donnée encore — entre ta première série ci-dessous.</div>`;
  if (suggestion) {
    const hint = renderSuggestionHint(exercise, suggestion, exerciseSub);
    suggestionBox = `
      <div class="suggestion-box">
        Dernière fois : <strong>${formatSet(exercise, suggestion.last)}</strong> (${suggestion.last.date})
        ${hint ? `<br/>${hint}` : ""}
      </div>
    `;
  }

  const bodyMarkup = isOpen
    ? `
      <div class="card-body">
        ${renderExercisePhoto(exercise)}
        <a class="yt-link" href="${ytUrl}" target="_blank" rel="noopener noreferrer">▶ Voir une démo vidéo</a>
        ${suggestionBox}
        ${renderSteppers(exercise, input)}
        <button class="btn btn-primary" data-action="save-set" data-id="${exercise.id}">Enregistrer cette série</button>

        ${history.length ? `
          <p class="section-label" style="margin-top:14px;">Historique récent</p>
          <ul class="history-list">
            ${history.map((h) => `<li><span>${h.date}</span><span>${formatSet(exercise, h)}</span></li>`).join("")}
          </ul>
        ` : ""}
      </div>
    `
    : "";

  return `
    <section class="card exercise-card">
      <div class="card-header" data-action="toggle-exercise" data-id="${exercise.id}" role="button">
        <h3 class="card-title">${exercise.name}<span class="card-title-fr">${exercise.fr}</span></h3>
        <span class="card-sub">${exerciseSub}</span>
        <button class="chevron">${isOpen ? "▲" : "▼"}</button>
      </div>
      ${bodyMarkup}
    </section>
  `;
}

function renderSeanceView() {
  const exercises = SESSIONS[uiState.day];

  const dayButtons = Object.keys(SESSIONS).map((day) => `
    <button class="day-btn ${day === uiState.day ? "active" : ""}" data-action="set-day" data-day="${day}">${day.toUpperCase()}</button>
  `).join("");

  const powerBlock = exercises.filter((e) => e.category !== "strength");
  const strengthBlock = exercises.filter((e) => e.category === "strength");
  const todayCount = storage.getTodaySets().length;

  return `
    <div class="day-selector">${dayButtons}</div>
    ${renderMobilityCard()}
    <p class="section-label" style="margin-top:18px;">Puissance, medball &amp; core</p>
    ${powerBlock.map(renderExerciseCard).join("")}
    <p class="section-label" style="margin-top:18px;">Force</p>
    ${strengthBlock.map(renderExerciseCard).join("")}
    ${renderConditioningCard()}
    <p class="draft-hint">${todayCount} série${todayCount > 1 ? "s" : ""} enregistrée${todayCount > 1 ? "s" : ""} aujourd'hui · sauvegarde automatique</p>
  `;
}

// Liste unique des exercices (les tractions sont présentes dans les 3 séances).
function allExercisesFlat() {
  return [...new Map(Object.values(SESSIONS).flat().map((ex) => [ex.id, ex])).values()];
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
    uiState.progressionExerciseId = allExercisesFlat()[0].id;
  }
  const selected = findExercise(uiState.progressionExerciseId);

  const options = allExercisesFlat().map((ex) => `
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
        <thead><tr><th>Date</th><th>Séance</th><th>Série</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr><td>${formatDateFr(r.date)}</td><td>${r.day.toUpperCase()}</td><td>${formatSet(selected, r)}</td></tr>`).join("")}
        </tbody>
      </table>
    ` : `<p class="empty-state">Aucune série loguée pour cet exercice.</p>`}

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
  if (uiState.view === "progression") renderChart();
}

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

viewContainer.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const ex = target.dataset.id ? findExercise(target.dataset.id) : null;
  const input = ex ? getInput(ex.id, ex) : null;

  if (action === "set-day") {
    uiState.day = target.dataset.day;
  } else if (action === "toggle-mobility-section") {
    uiState.mobilityOpen = !uiState.mobilityOpen;
  } else if (action === "toggle-conditioning-section") {
    uiState.conditioningOpen = !uiState.conditioningOpen;
  } else if (action === "toggle-exercise") {
    if (uiState.expanded.has(ex.id)) uiState.expanded.delete(ex.id);
    else uiState.expanded.add(ex.id);
  } else if (action === "inc-weight" || action === "dec-weight") {
    input.weightLb = stepWeight(ex.equipment, input.weightLb, action === "inc-weight" ? 1 : -1);
  } else if (action === "inc-reps" || action === "dec-reps") {
    input.reps = clampReps(input.reps + (action === "inc-reps" ? 1 : -1));
  } else if (action === "inc-distance" || action === "dec-distance") {
    input.distanceM = clampDistance(input.distanceM + (action === "inc-distance" ? DISTANCE_STEP_M : -DISTANCE_STEP_M));
  } else if (action === "save-set") {
    storage.logSet(ex.id, uiState.day, setValues(ex, input));
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
  if (target.dataset.action === "toggle-mobility") {
    const idx = parseInt(target.dataset.idx, 10);
    if (target.checked) uiState.mobilityChecked.add(idx);
    else uiState.mobilityChecked.delete(idx);
    target.closest(".mobility-item").classList.toggle("checked", target.checked);
  } else if (target.dataset.role === "weight-input") {
    // Une saisie libre est ramenée au poids standard le plus proche (ex. 52 → 50 lb).
    getInput(ex.id, ex).weightLb = snapWeight(ex.equipment, parseFloat(target.value) || 0);
    render();
  } else if (target.dataset.role === "reps-input") {
    getInput(ex.id, ex).reps = clampReps(parseInt(target.value, 10) || 1);
  } else if (target.dataset.role === "distance-input") {
    getInput(ex.id, ex).distanceM = clampDistance(parseInt(target.value, 10) || 0);
    render();
  } else if (target.id === "exercise-select") {
    uiState.progressionExerciseId = target.value;
    render();
  } else if (target.id === "import-file" && target.files.length) {
    importBackup(target.files[0]);
  }
});

bottomNav.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-view]");
  if (!btn) return;
  uiState.view = btn.dataset.view;
  [...bottomNav.children].forEach((c) => c.classList.toggle("active", c === btn));
  render();
});

render();
