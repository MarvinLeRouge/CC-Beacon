// ---------------------------------------------------------------------------
// Config — resolved from current page URL so no hardcoded values are needed
// ---------------------------------------------------------------------------
const BASE  = location.href.replace(/\/[^/]*$/, '/');   // e.g. /TOKEN/
const INDEX = BASE + 'works/index.json';
const WORK  = id => BASE + 'works/' + id + '.json';

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
// Data
// ---------------------------------------------------------------------------
async function fetchIndex() {
  const r = await fetch(INDEX + '?_=' + Date.now());
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const data = await r.json();
  return data.works || [];
}

async function fetchWork(id) {
  const r = await fetch(WORK(id) + '?_=' + Date.now());
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
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

function progressBar(ratio, isDone = false) {
  const p = Math.min(1, Math.max(0, ratio));
  return `
    <div class="progress-wrap">
      <div class="progress-label">
        <span></span><span>${pct(p)} %</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill${isDone ? ' done' : ''}" style="width:${pct(p)}%"></div>
      </div>
    </div>`;
}

const STATUS_LABELS = {
  pending:     'Pending',
  in_progress: 'In progress',
  done:        'Done',
  error:       'Error',
};

function badge(status) {
  const label = STATUS_LABELS[status] ?? esc(status);
  const cls   = STATUS_LABELS[status] ? `badge badge-${status}` : 'badge badge-pending';
  return `<span class="${cls}">${label}</span>`;
}

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
      <div class="card" data-action="project" data-project="${esc(project)}">
        <div class="card-header">
          <span class="card-title">${esc(project)}</span>
          ${done ? badge('done') : ''}
        </div>
        <div class="card-meta">${sl1s} sl1 · ${pw.length} work${pw.length > 1 ? 's' : ''}</div>
        ${progressBar(prog, done)}
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
      <div class="card" data-action="sl1" data-project="${esc(project)}" data-sl1="${esc(sl1)}">
        <div class="card-header">
          <span class="card-title">${esc(sl1)}</span>
          ${done ? badge('done') : ''}
        </div>
        <div class="card-meta">${sw.length} work${sw.length > 1 ? 's' : ''} · ${done2} terminé${done2 > 1 ? 's' : ''}</div>
        ${progressBar(prog, done)}
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
            <span class="step-icon" data-status="${s.status}">${stepIcon(s.status)}</span>
            <div>
              <div class="step-label">${esc(s.label)}</div>
              ${s.at ? `<div class="step-at">${fmtDate(s.at)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>` : '';

    const toggleLabel = expanded ? '▲ Masquer les steps' : `▼ ${w.step_count} step${w.step_count !== 1 ? 's' : ''}`;

    return `
      <div class="card" style="cursor:default">
        <div class="card-header">
          <span class="card-title">${esc(w.title)}</span>
          ${badge(w.status)}
        </div>
        <div class="card-meta">${cardMeta(w)}</div>
        ${progressBar(prog, w.status === 'done')}
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
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  const live = allWorks.some(w => w.status === 'in_progress');
  document.getElementById('refresh-indicator').hidden = !live;
  if (live) {
    refreshTimer = setTimeout(reload, REFRESH_MS);
  }
}

async function reload() {
  try {
    allWorks = await fetchIndex();
    draw();
  } catch { /* silent — keep displaying current data */ }
}

// ---------------------------------------------------------------------------
// Event delegation
// ---------------------------------------------------------------------------
document.getElementById('btn-back').addEventListener('click', pop);

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
  if (!document.hidden && allWorks.some(w => w.status === 'in_progress')) {
    clearTimeout(refreshTimer);
    reload();
  }
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
(async () => {
  try {
    allWorks = await fetchIndex();
    viewStack = [{ name: 'projects' }];
    draw();
  } catch {
    render(`<div class="error-banner">Impossible de charger les données.<br>
      <small>Vérifiez la connexion ou rafraîchissez la page.</small></div>`);
  }
})();
