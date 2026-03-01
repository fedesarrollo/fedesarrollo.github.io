const ORG = 'fedesarrollo';
const GITHUB_API = 'https://api.github.com';

// Language color map (subset)
const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Ruby: '#701516',
  Go: '#00ADD8',
  Java: '#b07219',
  Shell: '#89e051',
  PHP: '#4F5D95',
  'C#': '#178600',
  'C++': '#f34b7d',
  Rust: '#dea584',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
};

// Small apps to showcase (static list — update as new apps are created)
const FEATURED_APPS = [
  {
    name: 'Taller Visión 2050',
    description: 'Aplicación de taller cualitativo para explorar retos, misiones y oportunidades de cara al año 2050.',
    emoji: '🎯',
    repo: 'taller-vision-2050',
    liveUrl: 'https://fedesarrollo.github.io/taller-vision-2050/taller-vision-2050.html',
  },
];

/* ── Helpers ─────────────────────────────────────────── */

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function langDot(lang) {
  const color = LANG_COLORS[lang] || '#8b949e';
  return `<span class="lang-dot" style="background:${escapeHtml(color)}"></span>`;
}

/* ── Fetch repos ─────────────────────────────────────── */

async function fetchRepos() {
  const container = document.getElementById('repos-grid');
  container.innerHTML = `
    <div class="loading" style="grid-column:1/-1">
      <div class="spinner"></div>
      <div>Cargando repositorios…</div>
    </div>`;

  try {
    const res = await fetch(
      `${GITHUB_API}/orgs/${ORG}/repos?type=public&sort=updated&per_page=100`,
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    );

    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

    const repos = await res.json();
    const visible = repos.filter((r) => !r.fork);

    // Update badge count
    document.getElementById('repos-count').textContent = visible.length;

    if (visible.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">📭</div>
          <div>No hay repositorios públicos aún.</div>
        </div>`;
      return;
    }

    container.innerHTML = visible.map(repoCard).join('');
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">⚠️</div>
        <div>No se pudieron cargar los repositorios.<br>
          <a href="https://github.com/${ORG}" target="_blank" rel="noopener">
            Ver en GitHub →
          </a>
        </div>
      </div>`;
    console.error(err);
  }
}

function repoCard(repo) {
  const lang = escapeHtml(repo.language || '');
  const desc = escapeHtml(repo.description || 'Sin descripción.');
  const name = escapeHtml(repo.name);
  const stars = repo.stargazers_count;
  const forks = repo.forks_count;
  const topics = (repo.topics || []).slice(0, 4);

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-icon">📦</span>
        <a class="card-name" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener">${name}</a>
      </div>
      <p class="card-description">${desc}</p>
      ${topics.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${topics.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="card-footer">
        ${lang ? `<span class="card-stat">${langDot(repo.language)}&nbsp;${lang}</span>` : ''}
        ${stars > 0 ? `<span class="card-stat">⭐ ${stars}</span>` : ''}
        ${forks > 0 ? `<span class="card-stat">🍴 ${forks}</span>` : ''}
        <span class="card-stat" title="Última actualización">${timeAgo(repo.updated_at)}</span>
      </div>
    </div>`;
}

/* ── Render apps ─────────────────────────────────────── */

function renderApps() {
  const container = document.getElementById('apps-grid');

  if (FEATURED_APPS.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🚧</div>
        <div>Próximamente...</div>
      </div>`;
    return;
  }

  document.getElementById('apps-count').textContent = FEATURED_APPS.length;

  container.innerHTML = FEATURED_APPS.map((app) => {
    const repoUrl = `https://github.com/${ORG}/${escapeHtml(app.repo)}`;
    const liveBtn = app.liveUrl
      ? `<a class="btn btn-primary" href="${escapeHtml(app.liveUrl)}" target="_blank" rel="noopener">🚀 Ver app</a>`
      : '';
    const sourceBtn = `<a class="btn" href="${repoUrl}" target="_blank" rel="noopener">💻 Código</a>`;

    return `
      <div class="app-card">
        <div class="app-card-preview">${app.emoji}</div>
        <div class="app-card-body">
          <div class="app-card-name">${escapeHtml(app.name)}</div>
          <p class="app-card-desc">${escapeHtml(app.description)}</p>
          <div class="app-card-actions">${liveBtn}${sourceBtn}</div>
        </div>
      </div>`;
  }).join('');
}

/* ── Navigation tabs ─────────────────────────────────── */

function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const sections = document.querySelectorAll('.section');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      sections.forEach((s) => s.classList.remove('active'));

      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.add('active');
    });
  });
}

/* ── Time ago ────────────────────────────────────────── */

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `hace ${years} año${years > 1 ? 's' : ''}`;
  if (months > 0) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
  if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
  if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
  return `hace ${mins} min`;
}

/* ── Init ────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  fetchRepos();
  renderApps();
});
