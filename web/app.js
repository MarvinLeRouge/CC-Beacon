// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API = '/api';
const TOKEN_KEY = 'cc-beacon-token';
const THEME_KEY = 'cc-beacon-theme';

const PER_PAGE   = 10;
const REFRESH_MS = 30_000;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let allWorks    = [];
let viewStack   = [];      // [{name, project?, sl1?, page?}]
let refreshTimer = null;
let expandedWork = null;

// ---------------------------------------------------------------------------
// Token — never carried in a URL, only ever sent as a header
// ---------------------------------------------------------------------------
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function showTokenGate(message) {
  clearTimeout(refreshTimer);
  document.getElementById('page-title').textContent = 'CC-Beacon';
  document.getElementById('btn-back').hidden = true;
  document.getElementById('refresh-indicator').hidden = true;
  render(`
    <div class="token-gate">
      ${message ? `<p class="token-gate-error">${esc(message)}</p>` : ''}
      <p class="token-gate-label">Entre ton token d'accès</p>
      <form id="token-form">
        <input type="password" id="token-input" placeholder="Token" autocomplete="off" required>
        <button type="submit">Valider</button>
      </form>
    </div>`);
  document.getElementById('token-form').addEventListener('submit', e => {
    e.preventDefault();
    const value = document.getElementById('token-input').value.trim();
    if (!value) return;
    setToken(value);
    boot();
  });
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${getToken()}` };
  const r = await fetch(API + path, { ...options, headers });
  if (r.status === 401) {
    clearToken();
    showTokenGate('Token invalide, réessaie.');
    throw new Error('Unauthorized');
  }
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function fetchIndex() {
  const data = await apiFetch('/index');
  return data.works || [];
}

async function fetchWork(id) {
  return apiFetch('/work/' + encodeURIComponent(id));
}

async function deleteProject(project) {
  return apiFetch('/project/' + encodeURIComponent(project), { method: 'DELETE' });
}

async function deleteSl1(project, sl1) {
  return apiFetch('/sl1/' + encodeURIComponent(project) + '/' + encodeURIComponent(sl1), { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------
function workProgress(w) {
  if (!w.step_count) return w.status === 'done' ? 1 : 0;
  return w.steps_done / w.step_count;
}

function sl1Progress(sl1Works) {
  if (!sl1Works.length) return 0;
  const done = sl1Works.filter(w => w.status === 'done');

  // All done → 100 % regardless of duration data
  if (done.length === sl1Works.length) return 1;

  // Phase 1: fewer than 2 completed works
  if (done.length < 2) return done.length / sl1Works.length;

  // Phase 2: weighted by actual duration
  const durations = done.map(w =>
    new Date(w.updated_at) - new Date(w.started_at)
  );
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

  // Fallback to simple ratio if durations are all zero (e.g. test data)
  if (avg === 0) return done.length / sl1Works.length;

  const numerator   = durations.reduce((a, b) => a + b, 0);
  const denominator = sl1Works.reduce((sum, w) => {
    if (w.status === 'done') return sum + (new Date(w.updated_at) - new Date(w.started_at));
    return sum + avg;
  }, 0);

  return denominator > 0 ? numerator / denominator : 0;
}

function projectProgress(projectWorks) {
  const sl1s = [...new Set(projectWorks.map(w => w.sl1))];
  if (!sl1s.length) return 0;
  const sum = sl1s.reduce((acc, sl1) => {
    return acc + sl1Progress(projectWorks.filter(w => w.sl1 === sl1));
  }, 0);
  return sum / sl1s.length;
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function pct(n) { return Math.round(n * 100); }

function progressBar(ratio, statusClass = '') {
  const p   = Math.min(1, Math.max(0, ratio));
  const cls = statusClass ? ` ${statusClass}` : '';
  return `
    <div class="progress-wrap">
      <div class="progress-label">
        <span>${pct(p)} %</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill${cls}" style="transform:scaleX(${p})"></div>
      </div>
    </div>`;
}

const STATUS_LABELS = {
  pending:     'En attente',
  in_progress: 'En cours',
  done:        'Terminé',
  error:       'Erreur',
};

function badge(status) {
  const label = STATUS_LABELS[status] ?? esc(status);
  const cls   = STATUS_LABELS[status] ? `badge badge-${status}` : 'badge badge-pending';
  return `<span class="${cls}">${label}</span>`;
}

const STEP_STATUS_LABELS = {
  pending:     'À faire',
  in_progress: 'En cours',
  done:        'Terminé',
};

function stepIcon(status) {
  return status === 'done' ? '✓' : status === 'in_progress' ? '⟳' : '○';
}

function duration(w) {
  if (!w.started_at) return '';
  const ms = new Date(w.updated_at) - new Date(w.started_at);
  const m  = Math.round(ms / 60_000);
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + 'h' + (m % 60 ? String(m % 60).padStart(2, '0') : '');
}

function estimatedEnd(w) {
  if (w.status !== 'in_progress') return null;
  if (!w.step_count || !w.steps_done) return null;
  const elapsed   = Date.now() - new Date(w.started_at).getTime();
  const progress  = w.steps_done / w.step_count;
  const estimated = elapsed / progress;
  return new Date(new Date(w.started_at).getTime() + estimated);
}

function fmtTime(date) {
  if (!date) return '';
  const now  = new Date();
  const diff = date - now;
  const abs  = Math.abs(diff);
  const m    = Math.round(abs / 60_000);
  if (m < 60) return (diff > 0 ? 'dans ' : 'il y a ') + m + ' min';
  const h = Math.floor(m / 60);
  return (diff > 0 ? 'dans ' : 'il y a ') + h + 'h' + (m % 60 ? String(m % 60).padStart(2, '0') : '');
}

function render(html) { document.getElementById('app').innerHTML = html; }

function flashError(message) {
  const el = document.createElement('div');
  el.className = 'error-banner error-banner-toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function showConfirmSheet(message, confirmLabel = 'Supprimer') {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'confirm-backdrop';
    backdrop.innerHTML = `
      <div class="confirm-sheet" role="alertdialog" aria-modal="true" aria-label="Confirmation">
        <p class="confirm-message">${esc(message)}</p>
        <div class="confirm-actions">
          <button type="button" class="confirm-cancel">Annuler</button>
          <button type="button" class="confirm-delete">${esc(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    const finish = result => {
      document.removeEventListener('keydown', onKeydown);
      backdrop.remove();
      resolve(result);
    };
    const onKeydown = e => { if (e.key === 'Escape') finish(false); };

    backdrop.addEventListener('click', e => { if (e.target === backdrop) finish(false); });
    backdrop.querySelector('.confirm-cancel').addEventListener('click', () => finish(false));
    backdrop.querySelector('.confirm-delete').addEventListener('click', () => finish(true));
    document.addEventListener('keydown', onKeydown);
    backdrop.querySelector('.confirm-cancel').focus();
  });
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function push(view) {
  viewStack.push(view);
  draw();
}

function pop() {
  if (viewStack.length > 1) viewStack.pop();
  expandedWork = null;
  draw();
}

function current() { return viewStack[viewStack.length - 1]; }

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
function drawProjects() {
  const projects = [...new Set(allWorks.map(w => w.project))].sort();
  document.getElementById('page-title').textContent = 'CC-Beacon';
  document.getElementById('btn-back').hidden = true;

  if (!projects.length) {
    render('<p class="state-empty">Aucun projet pour l\'instant.</p>');
    return;
  }

  const cards = projects.map(project => {
    const pw    = allWorks.filter(w => w.project === project);
    const sl1s  = [...new Set(pw.map(w => w.sl1))].length;
    const prog  = projectProgress(pw);
    const done  = prog === 1;

    return `
      <div class="card" data-action="project" data-project="${esc(project)}" role="button" tabindex="0">
        <div class="card-header">
          <span class="card-title">${esc(project)}</span>
          ${done ? badge('done') : ''}
          <button class="card-delete" data-action="delete-project" data-project="${esc(project)}" aria-label="Supprimer ${esc(project)}">✕</button>
        </div>
        <div class="card-meta">${sl1s} sl1 · ${pw.length} work${pw.length > 1 ? 's' : ''}</div>
        ${progressBar(prog, done ? 'done' : '')}
      </div>`;
  }).join('');

  render(cards);
}

function drawSl1(project) {
  const pw   = allWorks.filter(w => w.project === project);
  const sl1s = [...new Set(pw.map(w => w.sl1))].sort();
  document.getElementById('page-title').textContent = project;
  document.getElementById('btn-back').hidden = false;

  const cards = sl1s.map(sl1 => {
    const sw    = pw.filter(w => w.sl1 === sl1);
    const prog  = sl1Progress(sw);
    const done  = sw.every(w => w.status === 'done');
    const done2 = sw.filter(w => w.status === 'done').length;

    return `
      <div class="card" data-action="sl1" data-project="${esc(project)}" data-sl1="${esc(sl1)}" role="button" tabindex="0">
        <div class="card-header">
          <span class="card-title">${esc(sl1)}</span>
          ${done ? badge('done') : ''}
          <button class="card-delete" data-action="delete-sl1" data-project="${esc(project)}" data-sl1="${esc(sl1)}" data-last-sl1="${sl1s.length === 1}" aria-label="Supprimer ${esc(sl1)}">✕</button>
        </div>
        <div class="card-meta">${sw.length} work${sw.length > 1 ? 's' : ''} · ${done2} terminé${done2 > 1 ? 's' : ''}</div>
        ${progressBar(prog, done ? 'done' : '')}
      </div>`;
  }).join('');

  render(cards || '<p class="state-empty">Aucun sl1.</p>');
}

function drawWorks(project, sl1, page) {
  const sw    = allWorks.filter(w => w.project === project && w.sl1 === sl1);
  const total = sw.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const p     = Math.min(page, pages);
  const slice = sw.slice((p - 1) * PER_PAGE, p * PER_PAGE);

  document.getElementById('page-title').textContent = sl1;
  document.getElementById('btn-back').hidden = false;

  const cards = slice.map(w => {
    const prog     = workProgress(w);
    const expanded = expandedWork === w.id;
    const stepsHTML = expanded && w._steps ? `
      <div class="steps-list">
        ${w._steps.map(s => `
          <div class="step-item">
            <span class="step-icon" data-status="${s.status}" aria-hidden="true">${stepIcon(s.status)}</span>
            <span class="sr-only">${STEP_STATUS_LABELS[s.status] ?? s.status}</span>
            <div>
              <div class="step-label">${esc(s.label)}</div>
              ${s.at ? `<div class="step-at">${fmtDate(s.at)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>` : '';

    const toggleLabel = expanded ? '▲ Masquer les steps' : `▼ ${w.step_count} step${w.step_count !== 1 ? 's' : ''}`;
    const progressStatus = w.status === 'done' ? 'done' : w.status === 'error' ? 'error' : '';

    return `
      <div class="card" style="cursor:default">
        <div class="card-header">
          <span class="card-title">${esc(w.title)}</span>
          ${badge(w.status)}
        </div>
        <div class="card-meta">${cardMeta(w)}</div>
        ${progressBar(prog, progressStatus)}
        ${w.step_count ? `
          <button class="steps-toggle" data-action="toggle" data-id="${esc(w.id)}">${toggleLabel}</button>
          ${stepsHTML}` : ''}
      </div>`;
  }).join('');

  const pager = pages > 1 ? `
    <div class="pagination">
      <button data-action="page" data-page="${p - 1}" ${p <= 1 ? 'disabled' : ''}>← Préc.</button>
      <span>${p} / ${pages}</span>
      <button data-action="page" data-page="${p + 1}" ${p >= pages ? 'disabled' : ''}>Suiv. →</button>
    </div>` : '';

  render((cards || '<p class="state-empty">Aucun work.</p>') + pager);
}

// ---------------------------------------------------------------------------
// Draw dispatcher
// ---------------------------------------------------------------------------
function draw() {
  const v = current();
  switch (v.name) {
    case 'projects': drawProjects(); break;
    case 'sl1':      drawSl1(v.project); break;
    case 'works':    drawWorks(v.project, v.sl1, v.page || 1); break;
  }
  scheduleRefresh();
}

// ---------------------------------------------------------------------------
// Auto-refresh
// ---------------------------------------------------------------------------
function visibleWorks() {
  const v = current();
  if (v.name === 'sl1')   return allWorks.filter(w => w.project === v.project);
  if (v.name === 'works') return allWorks.filter(w => w.project === v.project && w.sl1 === v.sl1);
  return allWorks;
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  // Polling itself is driven by the whole dataset — a work elsewhere might
  // still be in_progress even if nothing in the current view is. The
  // indicator, on the other hand, must only claim "live" for what's
  // actually visible right now.
  const anyLive  = allWorks.some(w => w.status === 'in_progress');
  const viewLive = visibleWorks().some(w => w.status === 'in_progress');
  document.getElementById('refresh-indicator').hidden = !viewLive;
  if (anyLive) {
    refreshTimer = setTimeout(reload, REFRESH_MS);
  }
}

async function reload() {
  try {
    allWorks = await fetchIndex();
    draw();
  } catch { /* silent — keep displaying current data (or the token gate, if apiFetch already swapped to it) */ }
}

// ---------------------------------------------------------------------------
// Event delegation
// ---------------------------------------------------------------------------
document.getElementById('btn-back').addEventListener('click', pop);

document.getElementById('app').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[data-action="project"], [data-action="sl1"]');
  if (!el) return;
  e.preventDefault();
  el.click();
});

document.getElementById('app').addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'project') {
    push({ name: 'sl1', project: el.dataset.project });
  } else if (action === 'sl1') {
    push({ name: 'works', project: el.dataset.project, sl1: el.dataset.sl1, page: 1 });
  } else if (action === 'page') {
    const v = current();
    viewStack[viewStack.length - 1] = { ...v, page: +el.dataset.page };
    draw();
  } else if (action === 'toggle') {
    const id = el.dataset.id;
    if (expandedWork === id) {
      expandedWork = null;
      draw();
    } else {
      try {
        const full = await fetchWork(id);
        const idx  = allWorks.findIndex(w => w.id === id);
        if (idx >= 0) allWorks[idx]._steps = full.steps;
        expandedWork = id;
        draw();
      } catch { /* ignore */ }
    }
  } else if (action === 'delete-project') {
    const project = el.dataset.project;
    const message = `Supprimer le projet "${project}" et tous ses works ? Cette action est irréversible.`;
    if (!(await showConfirmSheet(message))) return;
    try {
      const index = await deleteProject(project);
      allWorks = index.works || [];
      draw();
    } catch (err) {
      if (err.message !== 'Unauthorized') flashError('Impossible de supprimer le projet.');
    }
  } else if (action === 'delete-sl1') {
    const project = el.dataset.project;
    const sl1 = el.dataset.sl1;
    const isLastSl1 = el.dataset.lastSl1 === 'true';
    const message = isLastSl1
      ? `"${sl1}" est le seul sl1 de "${project}". Le supprimer supprimera aussi le projet. Continuer ?`
      : `Supprimer le sl1 "${sl1}" et tous ses works ? Cette action est irréversible.`;
    if (!(await showConfirmSheet(message))) return;
    try {
      const index = await deleteSl1(project, sl1);
      allWorks = index.works || [];
      draw();
    } catch (err) {
      if (err.message !== 'Unauthorized') flashError('Impossible de supprimer le sl1.');
    }
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function cardMeta(w) {
  if (w.status === 'done' && w.completion_time) {
    const parts = ['Terminé le ' + fmtDate(w.completion_time)];
    if (duration(w)) parts.push(duration(w));
    return parts.join(' · ');
  }
  if (w.status === 'in_progress') {
    const end = estimatedEnd(w);
    if (end) return 'Fin estimée ' + fmtTime(end);
    if (duration(w)) return 'En cours depuis ' + duration(w);
    return 'En cours';
  }
  return fmtDate(w.updated_at);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && getToken() && allWorks.some(w => w.status === 'in_progress')) {
    clearTimeout(refreshTimer);
    reload();
  }
});

// ---------------------------------------------------------------------------
// Theme toggle
// ---------------------------------------------------------------------------
// theme-init.js already applied any stored preference (before first paint,
// to avoid a flash) — this just keeps the button in sync and handles clicks.
function effectiveTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeButton() {
  const btn  = document.getElementById('btn-theme');
  const dark = effectiveTheme() === 'dark';
  btn.textContent = dark ? '☀' : '☾';
  btn.setAttribute('aria-label', dark ? 'Passer en thème clair' : 'Passer en thème sombre');
}

function toggleTheme() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  document.documentElement.setAttribute('data-theme', next);
  updateThemeButton();
}

document.getElementById('btn-theme').addEventListener('click', toggleTheme);
updateThemeButton();

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function boot() {
  if (!getToken()) {
    showTokenGate();
    return;
  }
  try {
    allWorks = await fetchIndex();
    viewStack = [{ name: 'projects' }];
    draw();
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      render(`<div class="error-banner">Impossible de charger les données.<br>
        <small>Vérifiez la connexion ou rafraîchissez la page.</small></div>`);
    }
  }
}

boot();
