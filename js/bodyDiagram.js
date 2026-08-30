// Silhouette stylisée avant/arrière avec surlignage des muscles sollicités.
// viewBox 0 0 120 220, reprend la logique du prototype précédent.

const BASE_SILHOUETTE = `
  <circle cx="60" cy="20" r="12" />
  <path d="M45 33 Q60 28 75 33 L80 60 Q60 68 40 60 Z" />
  <path d="M42 45 L22 90 M78 45 L98 90" />
  <path d="M40 60 L36 110 Q60 118 84 110 L80 60" />
  <path d="M45 110 L38 218 M75 110 L82 218" />
`;

// Positions des ellipses par muscle, pour chaque vue (front/back).
const MUSCLE_ELLIPSES = {
  front: {
    shoulders: [
      [35, 45, 9, 11],
      [85, 45, 9, 11]
    ],
    chest: [[60, 60, 22, 13]],
    biceps: [
      [26, 78, 7, 15],
      [94, 78, 7, 15]
    ],
    abs: [[60, 95, 13, 18]],
    obliques: [
      [43, 96, 6, 15],
      [77, 96, 6, 15]
    ],
    quads: [
      [46, 160, 12, 32],
      [74, 160, 12, 32]
    ]
  },
  back: {
    traps: [[60, 42, 19, 10]],
    lats: [
      [40, 72, 12, 20],
      [80, 72, 12, 20]
    ],
    triceps: [
      [26, 78, 7, 15],
      [94, 78, 7, 15]
    ],
    lowerback: [[60, 100, 13, 14]],
    glutes: [
      [45, 128, 14, 14],
      [75, 128, 14, 14]
    ],
    hamstrings: [
      [45, 165, 12, 28],
      [75, 165, 12, 28]
    ],
    calves: [
      [45, 200, 9, 16],
      [75, 200, 9, 16]
    ]
  }
};

function renderView(view, activeMuscles) {
  const ellipseMarkup = activeMuscles
    .flatMap((muscle) => (MUSCLE_ELLIPSES[view][muscle] || []))
    .map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="muscle-highlight" />`)
    .join("");
  return `
    <svg viewBox="0 0 120 220" class="body-diagram" role="img" aria-label="Vue ${view === "front" ? "avant" : "arrière"} des muscles sollicités">
      <g class="body-outline">${BASE_SILHOUETTE}</g>
      <g class="body-muscles">${ellipseMarkup}</g>
    </svg>
  `;
}

// muscles = { front: [...], back: [...] }
export function renderBodyDiagram(muscles) {
  return `
    <div class="body-diagram-pair">
      <div class="body-diagram-col">
        ${renderView("front", muscles.front || [])}
        <span class="body-diagram-label">Avant</span>
      </div>
      <div class="body-diagram-col">
        ${renderView("back", muscles.back || [])}
        <span class="body-diagram-label">Arrière</span>
      </div>
    </div>
  `;
}
