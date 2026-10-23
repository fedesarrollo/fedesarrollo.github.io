const ORG = 'fedesarrollo';

/* ── Contenido ───────────────────────────────────────────
   Para agregar una herramienta o un dashboard basta con
   añadir un objeto a la lista correspondiente.               */

// Dashboards internos. Cuando uno esté publicado, se pone su dirección en `url`.
// `chart` elige la ilustración de la tarjeta: 'barras', 'lineas' o 'area'.
const DASHBOARDS = [
  { name: 'Macrofiscal', description: 'Indicadores macroeconómicos y fiscales.', chart: 'barras', url: '' },
  { name: 'Seguridad y Justicia', description: 'Indicadores de criminalidad, seguridad y justicia.', chart: 'lineas', url: '' },
  { name: 'Productividad y Mercado Laboral', description: 'Marcos regulatorios del mercado laboral: costos no salariales, salarios mínimos, costos de despido e impuestos a las empresas.', chart: 'area', url: 'productividad-mercado-laboral/' },
];

// Herramientas internas. `repo` es el nombre del repositorio dentro de la organización.
// `image` es la vista previa (assets/img/portal/); sin imagen se puede mostrar un árbol de carpetas `tree`.
// Solo van repositorios de la organización fedesarrollo, no de cuentas personales.
const HERRAMIENTAS = [
  {
    name: 'Plantilla de documento de política',
    description: 'Carpetas, flujo de fuentes y cifras, y la clase LaTeX para que el documento salga con el formato de la serie.',
    repo: 'plantilla-documento-politica',
    image: 'assets/img/portal/plantilla.jpg',
    contain: true,
  },
  {
    name: 'Gráficas con el formato estándar',
    description: 'Colores, fuente y formato institucionales para gráficas en Python, R y Stata.',
    repo: 'graph-template',
    image: 'assets/img/portal/graficas.jpg',
    contain: true,
  },
  {
    name: 'Banner de seminarios',
    description: 'Banner de una diapositiva para anunciar los Seminarios de Investigación.',
    repo: 'banner-fedesarrollo',
    image: 'assets/img/portal/banner.jpg',
  },
];

/* ── Íconos ──────────────────────────────────────────── */

const ICON_GITHUB = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';

/* Ilustraciones de los dashboards: gráficas de muestra con la paleta de marca. */
const CHARTS = {
  barras: `
    <svg viewBox="0 0 320 180" aria-hidden="true">
      <rect width="320" height="180" fill="#F6F6F6"/>
      <g fill="#081BFD">
        <rect x="40" y="96" width="26" height="54"/><rect x="82" y="78" width="26" height="72"/>
        <rect x="124" y="104" width="26" height="46"/><rect x="166" y="64" width="26" height="86"/>
        <rect x="208" y="84" width="26" height="66"/>
      </g>
      <rect x="250" y="44" width="26" height="106" fill="#ED501F"/>
      <path d="M30 150h260" stroke="#010D2B" stroke-width="1.5"/>
    </svg>`,
  lineas: `
    <svg viewBox="0 0 320 180" aria-hidden="true">
      <rect width="320" height="180" fill="#F6F6F6"/>
      <path d="M30 60h260M30 100h260" stroke="#D0DDFE"/>
      <path d="M30 120 L75 104 L120 112 L165 84 L210 92 L255 62 L290 54" fill="none" stroke="#081BFD" stroke-width="4" stroke-linejoin="round"/>
      <path d="M30 136 L75 132 L120 122 L165 126 L210 110 L255 114 L290 98" fill="none" stroke="#00AAB6" stroke-width="4" stroke-linejoin="round"/>
      <path d="M30 150h260" stroke="#010D2B" stroke-width="1.5"/>
    </svg>`,
  area: `
    <svg viewBox="0 0 320 180" aria-hidden="true">
      <rect width="320" height="180" fill="#F6F6F6"/>
      <path d="M30 150 L30 112 L80 100 L130 106 L180 80 L230 86 L290 60 L290 150Z" fill="#D8E1FA"/>
      <path d="M30 112 L80 100 L130 106 L180 80 L230 86 L290 60" fill="none" stroke="#081BFD" stroke-width="4" stroke-linejoin="round"/>
      <path d="M30 150 L30 132 L80 128 L130 130 L180 118 L230 120 L290 108 L290 150Z" fill="#F0A03C"/>
      <path d="M30 150h260" stroke="#010D2B" stroke-width="1.5"/>
    </svg>`,
};

/* ── Render ──────────────────────────────────────────── */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toolCard(tool) {
  const repo = escapeHtml(tool.repo);
  const media = tool.image
    ? `<div class="card-media${tool.contain ? ' card-media--contain' : ''}"><img src="${escapeHtml(tool.image)}" alt="Vista previa: ${escapeHtml(tool.name)}" loading="lazy"></div>`
    : `<div class="card-media"><div class="tree">${tool.tree.join('\n')}</div></div>`;
  return `
    <a class="card" href="https://github.com/${ORG}/${repo}" target="_blank" rel="noopener">
      ${media}
      <div class="card-body">
        <h3>${escapeHtml(tool.name)}</h3>
        <p>${escapeHtml(tool.description)}</p>
        <p class="repo"><code>${ORG}/${repo}</code></p>
        <span class="btn">${ICON_GITHUB}Abrir en GitHub</span>
      </div>
    </a>`;
}

function dashboardCard(dash) {
  const body = `
      <div class="card-media">${CHARTS[dash.chart] || CHARTS.barras}</div>
      <div class="card-body">
        <h3>${escapeHtml(dash.name)}</h3>
        <p>${escapeHtml(dash.description)}</p>
        ${dash.url ? '<span class="btn">Abrir dashboard</span>' : '<span class="btn btn-off">En construcción</span>'}
      </div>`;
  return dash.url
    ? `<a class="card" href="${escapeHtml(dash.url)}" target="_blank" rel="noopener">${body}</a>`
    : `<div class="card">${body}</div>`;
}

/* ── Tutorial ────────────────────────────────────────────
   Se abre solo en las dos primeras visitas de cada persona (se cuenta en el
   navegador) y no se puede cerrar hasta llegar al último paso.            */

const TUTORIAL_KEY = 'fede-portal-tutorial-visto';
const TUTORIAL_VECES = 2;

function vecesVisto() {
  try { return parseInt(localStorage.getItem(TUTORIAL_KEY), 10) || 0; } catch { return 0; }
}
function marcarVisto() {
  try { localStorage.setItem(TUTORIAL_KEY, String(vecesVisto() + 1)); } catch { /* sin almacenamiento */ }
}

function initTutorial() {
  const dialog = document.getElementById('tutorial');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const steps = dialog.querySelectorAll('.tutorial-steps li');
  const dots = dialog.querySelectorAll('.tutorial-dots span');
  const prev = document.getElementById('tutorial-prev');
  const next = document.getElementById('tutorial-next');
  const count = document.getElementById('tutorial-count');
  let paso = 0;
  let terminado = false;

  function mostrar(i) {
    paso = i;
    steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
    dots.forEach((d, j) => d.classList.toggle('is-on', j <= i));
    count.textContent = `Paso ${i + 1} de ${steps.length}`;
    prev.disabled = i === 0;
    next.textContent = i === steps.length - 1 ? 'Entendido' : 'Siguiente';
  }

  function abrir() {
    terminado = false;
    mostrar(0);
    dialog.showModal();
    next.focus();
  }

  prev.addEventListener('click', () => { if (paso > 0) mostrar(paso - 1); });
  next.addEventListener('click', () => {
    if (paso < steps.length - 1) { mostrar(paso + 1); return; }
    terminado = true;
    marcarVisto();
    dialog.close();
  });
  // Escape no cierra el tutorial hasta que se termina.
  dialog.addEventListener('cancel', (e) => { if (!terminado) e.preventDefault(); });

  document.getElementById('tutorial-open').addEventListener('click', abrir);
  if (vecesVisto() < TUTORIAL_VECES) abrir();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dashboards-grid').innerHTML = DASHBOARDS.map(dashboardCard).join('');
  document.getElementById('tools-grid').innerHTML = HERRAMIENTAS.map(toolCard).join('');
  initTutorial();
});
