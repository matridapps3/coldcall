'use strict';

// ---------- tiny helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Skeleton placeholder shown while a view loads (nicer than a "Loading" word).
const skel = (rows = 3, widths = ['40%', '85%', '65%']) =>
  `<div class="card">${Array.from({ length: rows }, (_, i) =>
    `<div class="skel skel-line" style="width:${widths[i % widths.length]}"></div>`).join('')}</div>`;

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

let toastTimer;
function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2200);
}

const state = { user: null, modes: [], modeId: null, modeTab: 'scripts' };

// ---------- boot ----------
(async function boot() {
  try { state.user = await api('GET', '/api/auth/me'); }
  catch { return renderLogin(); }
  await loadModes();
  renderShell();
})();

async function loadModes() {
  state.modes = await api('GET', '/api/modes');
  if (!state.modeId) {
    const active = state.modes.find((m) => m.active) || state.modes[0];
    state.modeId = active ? active.id : null;
  }
}

// ---------- login ----------
function renderLogin() {
  app.innerHTML = `
    <div class="login">
      <div class="login-mark">Conyso <span>Outreach</span></div>
      <div class="card">
        <h1 class="login-h">Sign in</h1>
        <p class="login-sub">Internal calling console</p>
        <label>Username</label><input id="u" autofocus />
        <label>Password</label><input id="p" type="password" />
        <div class="err" id="e"></div>
        <button class="primary" id="go">Sign in</button>
      </div>
      <div class="login-foot">A Conyso venture</div>
    </div>`;
  const submit = async () => {
    try {
      state.user = await api('POST', '/api/auth/login', { username: $('#u').value.trim(), password: $('#p').value });
      await loadModes(); renderShell();
    } catch (err) { $('#e').textContent = err.message; }
  };
  $('#go').onclick = submit;
  $('#p').onkeydown = (e) => { if (e.key === 'Enter') submit(); };
}

// ---------- shell + role routing ----------
const TABS = {
  manager: [['numbers', 'Numbers'], ['modes', 'Modes'], ['leads', 'Leads'], ['intake', 'Intake'], ['fulfil', 'Fulfilment'], ['renewals', 'Renewals'], ['team', 'Team'], ['call', 'Call']],
  adder: [['add', 'Add leads']],
  caller: [['call', 'Call'], ['callbacks', 'Callbacks']],
  builder: [['builds', 'My builds']],
};

function renderShell() {
  const tabs = TABS[state.user.role] || [];
  state.tab = state.tab && tabs.some((t) => t[0] === state.tab) ? state.tab : tabs[0][0];
  app.innerHTML = `
    <div class="topbar">
      <div class="brand">Conyso <span>Outreach</span></div>
      <div class="tabs" id="tabs"></div>
      <div class="grow"></div>
      <span class="muted small">${esc(state.user.name)} · ${esc(state.user.role)}</span>
      <button class="ghost" id="logout">Sign out</button>
    </div>
    <div class="wrap-main" id="view"></div>`;
  const tabsEl = $('#tabs');
  tabs.forEach(([key, label]) => {
    const b = document.createElement('button');
    b.textContent = label; b.className = key === state.tab ? 'active' : '';
    b.onclick = () => { state.tab = key; renderShell(); };
    tabsEl.appendChild(b);
  });
  $('#logout').onclick = async () => { await api('POST', '/api/auth/logout'); state.user = null; renderLogin(); };
  renderView();
}

function modePicker(onChange, activeOnly) {
  let modes = activeOnly ? state.modes.filter((m) => m.active) : state.modes;
  // If the current mode isn't in the (filtered) list, snap to the first available.
  if (modes.length && !modes.some((m) => m.id === state.modeId)) state.modeId = modes[0].id;
  const opts = modes.map((m) => `<option value="${m.id}" ${m.id === state.modeId ? 'selected' : ''}>${esc(m.name)}${m.active ? '' : ' (inactive)'}</option>`).join('');
  const sel = document.createElement('select');
  sel.innerHTML = opts; sel.style.maxWidth = '260px';
  sel.onchange = () => { state.modeId = Number(sel.value); onChange && onChange(); };
  return sel;
}

function renderView() {
  const v = $('#view');
  v.innerHTML = '';
  ({ numbers: viewNumbers, modes: viewModes, leads: viewLeads, intake: viewIntake, fulfil: viewFulfil, renewals: viewRenewals, team: viewTeam, add: viewAdd, call: viewCall, callbacks: viewCallbacks, builds: viewBuilds }[state.tab] || (() => {}))(v);
}

// ================= MANAGER: NUMBERS =================
async function viewNumbers(v) {
  v.innerHTML = skel(4) + skel(3);
  const [s, f] = await Promise.all([api('GET', '/api/stats'), api('GET', '/api/stats/funnel')]);
  const stat = (n, k, tone = '') => `<div class="stat ${tone}"><div class="n">${n}</div><div class="k">${k}</div></div>`;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const medal = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}`;

  // Funnel rows: total -> contacted -> interested -> won, with rate vs total.
  const funnelRows = f.funnel.filter((m) => m.total).map((m) => `
    <tr><td>${esc(m.name)}</td><td>${m.total}</td>
      <td>${m.contacted} <span class="muted small">${pct(m.contacted, m.total)}%</span></td>
      <td>${m.interested} <span class="muted small">${pct(m.interested, m.total)}%</span></td>
      <td class="good">${m.won} <span class="muted small">${pct(m.won, m.total)}%</span></td>
      <td class="muted">${m.lost}</td></tr>`).join('') || '<tr><td colspan=6 class=muted>No leads yet</td></tr>';

  const lbRows = f.leaderboard.map((c, i) => `
    <tr><td>${medal(i)}</td><td>${esc(c.name)}</td><td>${c.today || 0}</td><td>${c.week || 0}</td>
      <td>${c.calls || 0}</td><td>${c.meetings || 0}</td><td>${c.conversion}%</td></tr>`).join('')
    || '<tr><td colspan=7 class=muted>No callers yet</td></tr>';

  const tplRows = f.templates.filter((t) => t.sends).map((t) => `
    <tr><td>${esc(t.title)}</td><td class="muted small">${esc(t.mode)}</td><td>${t.sends}</td>
      <td>${t.won_after}</td><td class="good">${t.win_rate}%</td></tr>`).join('')
    || '<tr><td colspan=5 class=muted>No WhatsApp messages sent yet</td></tr>';

  v.innerHTML = `
    <div class="grid cols4">
      ${stat(s.callsToday, 'Calls today', 'tone-info')}
      ${stat(s.pipeline.pool, 'Leads in pool', 'tone-bad')}
      ${stat(s.pipeline.active, 'In progress', 'tone-warn')}
      ${stat(s.pipeline.won, 'Meetings / won', 'tone-good')}
    </div>
    <div class="card"><h2>Conversion funnel</h2>
      <table><thead><tr><th>Mode</th><th>Leads</th><th>Contacted</th><th>Interested</th><th>Won</th><th>Lost</th></tr></thead>
      <tbody>${funnelRows}</tbody></table></div>
    <div class="card"><h2>Caller leaderboard</h2>
      <table><thead><tr><th>#</th><th>Caller</th><th>Today</th><th>Week</th><th>All calls</th><th>Meetings</th><th>Conv.</th></tr></thead>
      <tbody>${lbRows}</tbody></table></div>
    <div class="grid cols2">
      <div class="card"><h2>Template performance <span class="muted small">A/B</span></h2>
        <table><thead><tr><th>Template</th><th>Mode</th><th>Sent</th><th>Won after</th><th>Win rate</th></tr></thead>
        <tbody>${tplRows}</tbody></table></div>
      <div class="card"><h2>Outcomes</h2><table><tbody>${s.outcomes.map((o) => `<tr><td>${esc(o.outcome)}</td><td style="text-align:right">${o.n}</td></tr>`).join('') || '<tr><td colspan=2 class=muted>No calls logged</td></tr>'}</tbody></table></div>
    </div>`;
}

// ================= MANAGER: MODES EDITOR =================
async function viewModes(v) {
  v.innerHTML = skel(2, ['30%']) + skel(4);
  if (!state.modeId) { v.innerHTML = '<div class="empty"><div class="empty-icon">◇</div>Create a mode to begin.</div>'; }

  const bar = document.createElement('div'); bar.className = 'card row wrap';
  bar.append('Mode: ', modePicker(() => viewModes(v)));
  const newBtn = document.createElement('button'); newBtn.textContent = '+ New mode';
  newBtn.onclick = async () => {
    const name = prompt('Mode name (e.g. Salons)'); if (!name) return;
    const { id } = await api('POST', '/api/modes', { name });
    await loadModes(); state.modeId = id; viewModes(v);
  };
  bar.appendChild(newBtn);
  if (!state.modeId) return;

  const m = await api('GET', `/api/modes/${state.modeId}`);
  const refresh = () => viewModes(v);
  const nScripts = (m.scripts || []).length, nTpl = (m.templates || []).length, nStep = (m.steps || []).length;
  const SECTIONS = [
    ['scripts', 'Call scripts', nScripts],
    ['templates', 'WhatsApp templates', nTpl],
    ['sequence', 'Sequence', nStep],
    ['nav', 'Call navigator', null],
  ];
  if (!SECTIONS.some((s) => s[0] === state.modeTab)) state.modeTab = 'scripts';

  v.innerHTML = '';
  v.appendChild(bar);

  // Persistent mode header: identity + activation.
  const head = document.createElement('div'); head.className = 'card mode-header';
  head.innerHTML = `
    <div class="mode-id"><strong>${esc(m.name)}</strong>
      <span class="pill ${m.active ? 'good' : 'warn'}">${m.active ? 'active' : 'inactive'}</span></div>
    <div class="grow"></div>
    <button id="toggle" class="${m.active ? 'btn-quiet' : 'primary'}">${m.active ? 'Deactivate' : 'Activate'}</button>`;
  $('#toggle', head).onclick = async () => { await api('PATCH', `/api/modes/${m.id}`, { active: !m.active }); await loadModes(); refresh(); };
  v.appendChild(head);

  // Segmented sub-nav — one editor at a time instead of one endless scroll.
  const sub = document.createElement('div'); sub.className = 'subnav';
  SECTIONS.forEach(([key, label, n]) => {
    const b = document.createElement('button');
    b.className = 'subnav-btn' + (key === state.modeTab ? ' active' : '');
    b.innerHTML = `${label}${n != null ? ` <span class="subnav-n">${n}</span>` : ''}`;
    b.onclick = () => { state.modeTab = key; refresh(); };
    sub.appendChild(b);
  });
  v.appendChild(sub);

  // Selected editor.
  const section = document.createElement('div'); section.className = 'mode-section'; v.appendChild(section);
  if (state.modeTab === 'scripts') section.appendChild(contentEditor(m, 'scripts', 'Call scripts', refresh));
  else if (state.modeTab === 'templates') section.appendChild(contentEditor(m, 'templates', 'WhatsApp templates', refresh));
  else if (state.modeTab === 'sequence') section.appendChild(stepsEditor(m, refresh));
  else if (state.modeTab === 'nav') { const c = document.createElement('div'); c.className = 'card'; section.appendChild(c); renderFlowEditor(c, m, refresh); }
}

const selVal = (sel) => (sel.value ? Number(sel.value) : null);

// Manager editor for the live call navigator: nodes (moments) and their options
// (response buttons that branch / send a template / end with a disposition).
async function renderFlowEditor(card, mode, refresh) {
  const flow = await api('GET', `/api/flow/${mode.id}`);
  const nodeOpts = (sel) => `<option value="">(no branch)</option>` + flow.nodes.map((n) => `<option value="${n.id}" ${n.id === sel ? 'selected' : ''}>${esc(n.title)}</option>`).join('');
  const tplOpts = (sel) => `<option value="">(no message)</option>` + (mode.templates || []).map((t) => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.title)}</option>`).join('');
  const outOpts = (sel) => `<option value="">(no outcome)</option>` + OUTCOME_DEFS.map(([val, lbl]) => `<option value="${val}" ${val === sel ? 'selected' : ''}>${lbl}</option>`).join('');

  card.innerHTML = `<h2>Call navigator <span class="muted small">branching talk-track the caller follows live; each response branches, sends a message, or ends the call</span></h2>`;

  flow.nodes.forEach((node) => {
    const nd = document.createElement('div'); nd.className = 'list-item'; nd.style.display = 'block';
    nd.innerHTML = `
      <div class="row wrap">
        <input data-title value="${esc(node.title)}" style="max-width:220px"/>
        <label class="row small" style="margin:0;gap:5px;width:auto"><input type="checkbox" data-entry ${node.is_entry ? 'checked' : ''} style="width:auto"/> entry</label>
        <div class="grow"></div>
        <button data-save class="primary small">Save</button><button data-del class="small">Delete</button>
      </div>
      <textarea data-say style="margin-top:8px" placeholder="What the caller should say here">${esc(node.say)}</textarea>
      <div class="muted small" style="margin:8px 0 4px">Responses (label, branch to, end with outcome, send message)</div>
      <div data-opts></div>
      <button data-addopt class="small" style="margin-top:6px">+ Add response</button>`;
    const optsWrap = $('[data-opts]', nd);
    node.options.forEach((o) => {
      const row = document.createElement('div'); row.className = 'opt-edit';
      row.innerHTML = `
        <input data-olabel value="${esc(o.label)}" placeholder="what they say"/>
        <select data-onext title="branch to">${nodeOpts(o.next_node_id)}</select>
        <select data-oout title="end with outcome">${outOpts(o.outcome)}</select>
        <select data-otpl title="send message">${tplOpts(o.template_id)}</select>
        <label class="opt-demo"><input type="checkbox" data-odemo ${o.gen_demo ? 'checked' : ''}/>demo</label>
        <button data-osave class="primary small">Save</button><button data-odel class="small btn-quiet">✕</button>`;
      $('[data-osave]', row).onclick = async () => {
        await api('PATCH', `/api/flow/${mode.id}/options/${o.id}`, {
          label: $('[data-olabel]', row).value, next_node_id: selVal($('[data-onext]', row)),
          outcome: $('[data-oout]', row).value || null, template_id: selVal($('[data-otpl]', row)),
          gen_demo: $('[data-odemo]', row).checked,
        });
        toast('Response saved');
      };
      $('[data-odel]', row).onclick = async () => { await api('DELETE', `/api/flow/${mode.id}/options/${o.id}`); refresh(); };
      optsWrap.appendChild(row);
    });
    $('[data-addopt]', nd).onclick = async () => { await api('POST', `/api/flow/${mode.id}/nodes/${node.id}/options`, { label: 'New response' }); refresh(); };
    $('[data-save]', nd).onclick = async () => { await api('PATCH', `/api/flow/${mode.id}/nodes/${node.id}`, { title: $('[data-title]', nd).value, say: $('[data-say]', nd).value, is_entry: $('[data-entry]', nd).checked }); toast('Node saved'); };
    $('[data-del]', nd).onclick = async () => { if (confirm('Delete this node?')) { await api('DELETE', `/api/flow/${mode.id}/nodes/${node.id}`); refresh(); } };
    card.appendChild(nd);
  });
  const add = document.createElement('button'); add.className = 'small'; add.textContent = '+ Add node';
  add.onclick = async () => { await api('POST', `/api/flow/${mode.id}/nodes`, { title: 'New node', say: 'What to say here.' }); refresh(); };
  card.appendChild(add);
}

function contentEditor(mode, kind, title, refresh) {
  const c = document.createElement('div'); c.className = 'card';
  c.innerHTML = `<h2>${title} <span class="muted small">variables: {{company}}, {{caller}}, {{phone}}</span></h2>`;
  (mode[kind] || []).forEach((item) => {
    const row = document.createElement('div'); row.className = 'list-item'; row.style.display = 'block';
    row.innerHTML = `<div class="row"><input value="${esc(item.title)}" data-t style="max-width:240px"/>
      <div class="grow"></div><button data-save class="primary small">Save</button><button data-del class="small">Delete</button></div>
      <textarea data-b style="margin-top:8px">${esc(item.body)}</textarea>`;
    $('[data-save]', row).onclick = async () => { await api('PATCH', `/api/modes/${mode.id}/${kind}/${item.id}`, { title: $('[data-t]', row).value, body: $('[data-b]', row).value }); toast('Saved'); };
    $('[data-del]', row).onclick = async () => { if (confirm('Delete?')) { await api('DELETE', `/api/modes/${mode.id}/${kind}/${item.id}`); refresh(); } };
    c.appendChild(row);
  });
  const add = document.createElement('button'); add.textContent = `+ Add ${kind === 'scripts' ? 'script' : 'template'}`; add.className = 'small';
  add.onclick = async () => { await api('POST', `/api/modes/${mode.id}/${kind}`, { title: 'Untitled', body: 'New content. Use {{company}} and {{caller}}.' }); refresh(); };
  c.appendChild(add);
  return c;
}

const OUTCOME_DEFS = [
  ['no_answer', 'No answer'], ['call_back', 'Call back later'], ['wrong_number', 'Wrong number'],
  ['not_interested', 'Not interested'], ['interested', 'Interested'], ['meeting_booked', 'Meeting booked'], ['dnc', 'Do not call'],
];
const ACTION_DEFS = ['advance', 'retry', 'callback', 'won', 'lost'];

function stepsEditor(mode, refresh) {
  const c = document.createElement('div'); c.className = 'card';
  c.innerHTML = `<h2>Sequence</h2><p class="muted small">Steps run top to bottom. Each outcome maps to an action; leave blank to use the sensible default.</p>`;
  const tplOpts = (sel) => `<option value="">— no template —</option>` + (mode.templates || []).map((t) => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.title)}</option>`).join('');

  (mode.steps || []).forEach((step) => {
    const row = document.createElement('div'); row.className = 'list-item'; row.style.display = 'block';
    const ruleMap = {}; (step.rules || []).forEach((r) => ruleMap[r.outcome] = r.action);
    row.innerHTML = `
      <div class="row wrap">
        <span class="pill">#${step.step_no}</span>
        <select data-kind style="max-width:130px"><option value="call" ${step.kind === 'call' ? 'selected' : ''}>Call</option><option value="whatsapp" ${step.kind === 'whatsapp' ? 'selected' : ''}>WhatsApp</option></select>
        <input data-title value="${esc(step.title)}" style="max-width:200px"/>
        <label style="margin:0">Wait days</label><input data-delay type="number" min="0" value="${step.day_delay}" style="max-width:80px"/>
        <select data-tpl style="max-width:170px">${tplOpts(step.template_id)}</select>
        <div class="grow"></div>
        <button data-save class="primary small">Save</button><button data-del class="small">Delete</button>
      </div>
      <div class="rule-head">Outcome → action <span class="muted small">(blank = default)</span></div>
      <div class="rule-grid" data-rules></div>`;
    const rulesEl = $('[data-rules]', row);
    OUTCOME_DEFS.forEach(([val, lbl]) => {
      const w = document.createElement('div'); w.className = 'rule-cell';
      w.innerHTML = `<label>${lbl}</label><select data-rule="${val}"><option value="">default</option>${ACTION_DEFS.map((a) => `<option value="${a}" ${ruleMap[val] === a ? 'selected' : ''}>${a}</option>`).join('')}</select>`;
      rulesEl.appendChild(w);
    });
    $('[data-save]', row).onclick = async () => {
      await api('PATCH', `/api/modes/${mode.id}/steps/${step.id}`, {
        kind: $('[data-kind]', row).value, title: $('[data-title]', row).value,
        day_delay: Number($('[data-delay]', row).value), template_id: $('[data-tpl]', row).value ? Number($('[data-tpl]', row).value) : null,
      });
      const rules = {};
      rulesEl.querySelectorAll('[data-rule]').forEach((s) => { if (s.value) rules[s.getAttribute('data-rule')] = s.value; });
      await api('PUT', `/api/modes/${mode.id}/steps/${step.id}/rules`, rules);
      toast('Step saved');
    };
    $('[data-del]', row).onclick = async () => { if (confirm('Delete step?')) { await api('DELETE', `/api/modes/${mode.id}/steps/${step.id}`); refresh(); } };
    c.appendChild(row);
  });
  const add = document.createElement('button'); add.textContent = '+ Add step'; add.className = 'small';
  add.onclick = async () => { await api('POST', `/api/modes/${mode.id}/steps`, { kind: 'call', title: 'New step', day_delay: 1 }); refresh(); };
  c.appendChild(add);
  return c;
}

// ================= MANAGER: LEADS =================
async function viewLeads(v) {
  v.innerHTML = '';
  const bar = document.createElement('div'); bar.className = 'card row wrap';
  bar.append('Mode: ', modePicker(() => viewLeads(v)));
  const statusSel = document.createElement('select'); statusSel.style.maxWidth = '160px';
  statusSel.innerHTML = ['', 'pool', 'active', 'won', 'lost'].map((s) => `<option value="${s}">${s || 'all statuses'}</option>`).join('');
  bar.append(' Status: ', statusSel);
  v.appendChild(bar);
  statusSel.onchange = load;

  v.appendChild(leadAddCard(() => load()));

  const users = await api('GET', '/api/users');
  const callers = users.filter((u) => u.role === 'caller');
  const tableCard = document.createElement('div'); tableCard.className = 'card'; v.appendChild(tableCard);

  async function load() {
    const q = new URLSearchParams({ mode_id: state.modeId });
    if (statusSel.value) q.set('status', statusSel.value);
    const rows = await api('GET', '/api/leads?' + q);
    tableCard.innerHTML = `<h2>Leads (${rows.length})</h2>
      <table><thead><tr><th>Company</th><th>Phone</th><th>Status</th><th>Owner</th><th>Last outcome</th><th>Reassign</th></tr></thead><tbody></tbody></table>`;
    const tb = $('tbody', tableCard);
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(r.company)}</td><td class="small" style="font-family:var(--mono)">${esc(r.phone)}</td>
        <td><span class="pill ${r.status === 'won' ? 'good' : r.status === 'lost' ? 'bad' : ''}">${r.status}</span></td>
        <td>${esc(r.owner_name || '-')}</td><td class="small muted">${esc(r.last_outcome || '')}</td><td></td>`;
      const sel = document.createElement('select');
      sel.innerHTML = `<option value="">(unassign)</option>` + callers.map((c) => `<option value="${c.id}" ${c.id === r.owner_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
      sel.onchange = async () => { await api('PATCH', `/api/leads/${r.id}/assign`, { owner_id: sel.value ? Number(sel.value) : null }); toast('Reassigned'); load(); };
      tr.lastElementChild.appendChild(sel);
      tb.appendChild(tr);
    });
  }
  load();
}

// ================= MANAGER: INTAKE (client website brief) =================
async function viewIntake(v) {
  v.innerHTML = skel(4) + skel(3);
  const [codes, wonLeads] = await Promise.all([api('GET', '/api/intake/list'), api('GET', '/api/intake/wonleads')]);
  const quizBase = location.origin + '/quiz?code=';

  v.innerHTML = `
    <div class="card"><h2>Issue a brief code</h2>
      <p class="muted small" style="margin-top:0">Generate a code, send the client the link, and their answers appear here for the build team.</p>
      <div class="grid cols2">
        <div><label>Client / business name</label><input id="ic_company" placeholder="e.g. Sharma & Associates"/></div>
        <div><label>Link to a won lead (optional)</label>
          <select id="ic_lead"><option value="">(not linked)</option>${wonLeads.map((l) => `<option value="${l.id}" data-name="${esc(l.company)}">${esc(l.company)}</option>`).join('')}</select></div>
      </div>
      <div class="err" id="ic_err"></div>
      <button class="primary" id="ic_gen" style="margin-top:10px">Generate code</button>
    </div>
    <div class="card"><h2>Pipeline (${codes.length})</h2>
      <table><thead><tr><th>Client</th><th>Code</th><th>Stage</th><th>Paid</th><th></th></tr></thead><tbody id="ic_rows"></tbody></table>
    </div>
    <div id="ic_brief"></div>`;

  // when a won lead is picked, prefill the company name
  $('#ic_lead', v).onchange = (e) => {
    const opt = e.target.selectedOptions[0];
    if (opt && opt.dataset.name && !$('#ic_company', v).value) $('#ic_company', v).value = opt.dataset.name;
  };

  $('#ic_gen', v).onclick = async () => {
    const company = $('#ic_company', v).value.trim();
    const leadVal = $('#ic_lead', v).value;
    if (!company) { $('#ic_err', v).textContent = 'Enter a client name'; return; }
    try {
      const r = await api('POST', '/api/intake/create', { company, lead_id: leadVal ? Number(leadVal) : null });
      toast(`Code ${r.code} created`);
      viewIntake(v);
    } catch (e) { $('#ic_err', v).textContent = e.message; }
  };

  const tb = $('#ic_rows', v);
  codes.forEach((c) => {
    const tr = document.createElement('tr');
    const st = lifeStage(c);
    tr.innerHTML = `<td>${esc(c.company)}${c.lead_company ? ` <span class="muted small">(lead)</span>` : ''}</td>
      <td style="font-family:var(--mono)">${esc(c.code)}</td>
      <td><span class="pill ${st.cls}">${esc(st.label)}</span></td>
      <td>${c.paid ? '<span class="pill good">paid</span>' : '<span class="muted small">-</span>'}</td>
      <td class="row" style="gap:6px"></td>`;
    const actions = tr.lastElementChild;
    const copyBtn = document.createElement('button'); copyBtn.className = 'small'; copyBtn.textContent = 'Quiz link';
    copyBtn.onclick = () => { navigator.clipboard?.writeText(location.origin + '/quiz?code=' + c.code); toast('Quiz link copied'); };
    actions.appendChild(copyBtn);
    const openBtn = document.createElement('button'); openBtn.className = 'small primary'; openBtn.textContent = 'Open';
    openBtn.onclick = () => showBrief(v, c.code);
    actions.appendChild(openBtn);
    tb.appendChild(tr);
  });
}

// Display stage from the lifecycle fields.
function lifeStage(c) {
  if (c.status !== 'submitted') return { label: 'Awaiting brief', cls: 'warn' };
  if (c.build_stage === 'live') return { label: 'Live', cls: 'good' };
  if (c.build_stage === 'delivered') {
    if (c.approval === 'approved') return { label: 'Approved', cls: 'good' };
    if (c.approval === 'changes') return { label: 'Changes requested', cls: 'warn' };
    return { label: 'Delivered', cls: 'accent' };
  }
  if (c.build_stage === 'building') return { label: 'Building', cls: 'accent' };
  return { label: 'Brief in', cls: '' };
}

async function showBrief(v, code, refresh) {
  const refr = refresh || (() => viewIntake(v));
  const b = await api('GET', `/api/intake/view/${code}`);
  const sections = b.form.map((sec) => {
    const items = sec.fields.map((f) => {
      let val = b.answers[f.key];
      if (Array.isArray(val)) val = val.filter(Boolean).join(', ');
      if (!val || !String(val).trim()) return '';
      return `<div class="rev-item"><span class="muted small">${esc(f.label)}</span><div style="white-space:pre-wrap">${esc(val)}</div></div>`;
    }).filter(Boolean).join('');
    return items ? `<h3>${esc(sec.section)}</h3>${items}` : '';
  }).join('');
  const filesHtml = (b.files || []).length
    ? b.files.map((f) => `<a class="btnlink small" href="/api/intake/file/${f.id}" target="_blank" rel="noopener">${esc(f.original || 'file')}</a>`).join(' ')
    : '<span class="muted small">No files uploaded by the client.</span>';
  const reviewLink = location.origin + '/review?code=' + b.code;
  const stageSel = ['', 'building', 'delivered', 'live'].map((s) => `<option value="${s}" ${b.build_stage === (s || null) ? 'selected' : ''}>${s || 'Brief in'}</option>`).join('');

  const card = $('#ic_brief', v);
  card.innerHTML = `
    <div class="card">
      <div class="row"><h2 style="margin:0">Build prompt: ${esc(b.company)}</h2>
        <span class="pill good">${esc(code)}</span><div class="grow"></div>
        <button class="primary small" id="ic_copyprompt">Copy build prompt</button></div>
      <p class="muted small" style="margin-top:0">Paste this straight into Claude Code (Opus 4.8) to build the whole site in one go.</p>
      <pre class="prompt" id="ic_promptbox">${esc(b.prompt)}</pre>
    </div>
    <div class="card">
      <h2>Lifecycle</h2>
      <div class="grid cols2">
        <div><label>Build stage</label><select id="ic_stage">${stageSel}</select></div>
        <div><label>Preview URL (sent to client on the review page)</label><input id="ic_preview" value="${esc(b.preview_url || '')}" placeholder="https://..."/></div>
        <div><label>Payment</label><div class="row"><label class="row small" style="margin:0;gap:6px;width:auto"><input type="checkbox" id="ic_paid" ${b.paid ? 'checked' : ''} style="width:auto"/> Paid</label>
          <input id="ic_amount" type="number" value="${b.amount ?? ''}" placeholder="₹ amount" style="max-width:130px"/></div></div>
        <div><label>Client approval</label><div>${b.approval ? `<span class="pill ${b.approval === 'approved' ? 'good' : 'warn'}">${esc(b.approval)}</span>` : '<span class="muted small">awaiting client</span>'}${b.approval_note ? `<div class="muted small" style="margin-top:4px">"${esc(b.approval_note)}"</div>` : ''}</div></div>
        <div><label>Builder</label><div>${b.builder_name ? `<span class="pill accent">${esc(b.builder_name)}</span>` : '<span class="muted small">unassigned — assign on the Fulfilment board</span>'}</div></div>
      </div>
      <div class="row" style="margin-top:12px"><button class="primary small" id="ic_savelife">Save lifecycle</button>
        <button class="small" id="ic_reviewlink">Copy client review link</button></div>
      <label style="margin-top:14px">Client assets</label><div class="row wrap">${filesHtml}</div>
    </div>
    <div class="card">
      <div class="row"><h2 style="margin:0">Readable brief</h2><div class="grow"></div>
        <button class="small" id="ic_copybrief">Copy as text</button></div>
      <div class="review" style="margin-top:8px">${sections || '<p class="muted">Empty.</p>'}</div>
    </div>`;
  $('#ic_copyprompt', card).onclick = () => { navigator.clipboard?.writeText(b.prompt); toast('Build prompt copied. Paste into Claude Code.'); };
  $('#ic_copybrief', card).onclick = () => { navigator.clipboard?.writeText(b.brief); toast('Brief copied'); };
  $('#ic_reviewlink', card).onclick = () => { navigator.clipboard?.writeText(reviewLink); toast('Review link copied'); };
  $('#ic_savelife', card).onclick = async () => {
    await api('PATCH', `/api/intake/${b.code}`, {
      build_stage: $('#ic_stage', card).value || null,
      preview_url: $('#ic_preview', card).value.trim(),
      paid: $('#ic_paid', card).checked,
      amount: $('#ic_amount', card).value ? Number($('#ic_amount', card).value) : null,
    });
    toast('Lifecycle saved'); await refr(); showBrief(v, code, refresh);
  };
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ================= MANAGER: TEAM =================
async function viewTeam(v) {
  v.innerHTML = skel(4) + skel(3);
  const users = await api('GET', '/api/users');
  v.innerHTML = `
    <div class="card"><h2>Add user</h2>
      <div class="grid cols2">
        <div><label>Name</label><input id="n"/></div>
        <div><label>Role</label><select id="r"><option value="caller">Caller</option><option value="adder">Lead-adder</option><option value="builder">Builder</option><option value="manager">Manager</option></select></div>
        <div><label>Username</label><input id="un"/></div>
        <div><label>Password</label><input id="pw" type="text" placeholder="min 4 chars"/></div>
      </div>
      <div class="err" id="ue"></div>
      <button class="primary" id="create" style="margin-top:10px">Create user</button>
    </div>
    <div class="card"><h2>Users</h2>
      <table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
      <tbody>${users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.username)}</td><td>${esc(u.role)}</td>
        <td><span class="pill ${u.active ? 'good' : 'warn'}">${u.active ? 'active' : 'disabled'}</span></td>
        <td><button class="small" data-id="${u.id}" data-act="${u.active ? 0 : 1}">${u.active ? 'Disable' : 'Enable'}</button></td></tr>`).join('')}</tbody></table>
    </div>`;
  $('#create').onclick = async () => {
    try {
      await api('POST', '/api/users', { name: $('#n').value.trim(), role: $('#r').value, username: $('#un').value.trim(), password: $('#pw').value });
      toast('User created'); viewTeam(v);
    } catch (e) { $('#ue').textContent = e.message; }
  };
  v.querySelectorAll('[data-act]').forEach((b) => b.onclick = async () => { await api('PATCH', `/api/users/${b.dataset.id}`, { active: b.dataset.act === '1' }); viewTeam(v); });
}

// ================= MANAGER: FULFILMENT BOARD =================
// The post-'yes' assembly line. Every intake code, bucketed by station, with the
// days it has sat there (red once it's aging), builder assignment, and a client
// nudge where the ball is in the client's court.
const AGE_WARN = { awaiting_assets: 3, to_build: 2, building: 4, awaiting_approval: 3, changes: 2, approved: 2, live: 9999 };
async function viewFulfil(v) {
  v.innerHTML = skel(1) + skel(5);
  const b = await api('GET', '/api/fulfillment/board');
  const m = b.metrics;
  const assignSel = (it) => {
    if (!b.builders.length) return '<span class="muted small">no builders yet</span>';
    return `<select class="fx-assign" data-code="${it.code}"><option value="">(assign builder)</option>${b.builders.map((x) => `<option value="${x.id}" ${x.id === it.builder_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`;
  };
  const card = (it, col) => {
    const aging = it.age_days != null && it.age_days >= (AGE_WARN[col.key] || 99);
    const showAssign = col.key === 'to_build' || col.key === 'building';
    return `<div class="fx-card">
      <div class="fx-card-top"><span class="fx-co">${esc(it.company)}</span><span class="fx-code">${esc(it.code)}</span></div>
      <div class="fx-meta">
        ${it.age_days != null ? `<span class="fx-age ${aging ? 'hot' : ''}">${it.age_days}d</span>` : ''}
        ${(col.key === 'approved' || col.key === 'live') ? (it.paid ? '<span class="pill good">paid</span>' : '<span class="pill warn">unpaid</span>') : ''}
        ${!showAssign && it.builder_name ? `<span class="muted small">· ${esc(it.builder_name)}</span>` : ''}
        ${it.nudge_count ? `<span class="muted small" title="times nudged">↻${it.nudge_count}</span>` : ''}
      </div>
      ${showAssign ? `<div class="fx-meta">${assignSel(it)}</div>` : ''}
      <div class="fx-actions">
        ${col.nudge ? `<button class="small fx-nudge" data-code="${esc(it.code)}">Nudge</button>` : ''}
        <button class="small primary fx-open" data-code="${esc(it.code)}">Open</button>
      </div></div>`;
  };
  const columns = b.columns.map((col) => `
    <div class="fx-col">
      <div class="fx-col-h" title="${esc(col.hint || '')}">${esc(col.label)} <span class="fx-n">${col.items.length}</span></div>
      <div class="fx-cards">${col.items.map((it) => card(it, col)).join('') || '<div class="muted small" style="padding:6px 2px">—</div>'}</div>
    </div>`).join('');
  v.innerHTML = `
    <div class="card fx-metrics">
      <div class="fx-metric"><span class="fx-big">${m.total}</span><span class="muted small">in pipeline</span></div>
      <div class="fx-metric"><span class="fx-big ${m.unpaid ? 'tx-warn' : ''}">${m.unpaid}</span><span class="muted small">delivered · unpaid</span></div>
      <div class="fx-metric"><span class="fx-big">${b.builders.length}</span><span class="muted small">active builders</span></div>
      <div class="grow"></div>
      <button class="ghost small" id="fx_refresh">Refresh</button>
    </div>
    <div class="fx-board">${columns}</div>
    <div id="ic_brief"></div>`;
  $('#fx_refresh', v).onclick = () => viewFulfil(v);
  const refr = () => viewFulfil(v);
  v.querySelectorAll('.fx-open').forEach((btn) => btn.onclick = () => showBrief(v, btn.dataset.code, refr));
  v.querySelectorAll('.fx-assign').forEach((sel) => sel.onchange = async () => {
    await api('POST', `/api/intake/${sel.dataset.code}/assign`, { builder_id: sel.value ? Number(sel.value) : null });
    toast(sel.value ? 'Builder assigned' : 'Unassigned'); viewFulfil(v);
  });
  v.querySelectorAll('.fx-nudge').forEach((btn) => btn.onclick = async () => {
    const r = await api('POST', `/api/intake/${btn.dataset.code}/nudge`);
    if (r.wa_url) window.open(r.wa_url, '_blank', 'noopener');
    else { navigator.clipboard?.writeText(r.message); toast('No phone on file — nudge copied'); }
    viewFulfil(v);
  });
}

// ================= MANAGER: RENEWALS (recurring revenue) =================
const SUB_KINDS = [['care_basic', 'Basic Care'], ['care_plus', 'Care+'], ['domain', 'Domain'], ['other', 'Other']];
const kindLabel = (k) => (SUB_KINDS.find((x) => x[0] === k) || [, k])[1];
async function viewRenewals(v) {
  v.innerHTML = skel(3) + skel(4);
  const [all, dueRes] = await Promise.all([api('GET', '/api/subs'), api('GET', '/api/subs/due?days=30')]);
  const due = dueRes.due;
  const rupee = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const dueRow = (s) => {
    const cls = s.state === 'overdue' ? 'warn' : s.state === 'due_soon' ? 'accent' : '';
    const when = s.state === 'overdue' ? `overdue ${-s.days_left}d` : `in ${s.days_left}d`;
    return `<div class="fx-mine-row"><div><b>${esc(s.company)}</b> <span class="muted small">${esc(kindLabel(s.kind))}${s.label ? ' · ' + esc(s.label) : ''}</span>
      <div class="muted small">${rupee(s.amount)}/yr · renews ${esc(s.renews_at)} <span class="pill ${cls}">${when}</span></div></div>
      <div class="row" style="gap:6px"><button class="small primary" data-renew="${s.id}">Renewed</button><button class="small" data-lapse="${s.id}">Lapsed</button></div></div>`;
  };
  v.innerHTML = `
    <div class="card"><h2>Add a plan / domain</h2>
      <p class="muted small" style="margin-top:0">Care plans and domains renew every year — track them here so no renewal slips.</p>
      <div class="grid cols2">
        <div><label>Client / business</label><input id="s_co"/></div>
        <div><label>Type</label><select id="s_kind">${SUB_KINDS.map((k) => `<option value="${k[0]}">${k[1]}</option>`).join('')}</select></div>
        <div><label>Amount / year (₹)</label><input id="s_amt" type="number" placeholder="3999"/></div>
        <div><label>Renews on</label><input id="s_renews" type="date"/></div>
        <div><label>Label (optional — e.g. domain name)</label><input id="s_label" placeholder="sharma-ca.in"/></div>
        <div><label>Note (optional)</label><input id="s_note"/></div>
      </div>
      <div class="err" id="s_err"></div>
      <button class="primary" id="s_add" style="margin-top:10px">Add</button>
    </div>
    <div class="card"><h2>Due soon &amp; overdue <span class="muted small">(next 30 days)</span> <span class="fx-n">${due.length}</span></h2>
      <div>${due.length ? due.map(dueRow).join('') : '<p class="muted">Nothing due in the next 30 days.</p>'}</div>
    </div>
    <div class="card"><div class="row"><h2 style="margin:0">All subscriptions</h2><div class="grow"></div><span class="muted small">Active recurring: <b>${rupee(all.arr)}/yr</b></span></div>
      <table style="margin-top:8px"><thead><tr><th>Client</th><th>Type</th><th>₹/yr</th><th>Renews</th><th>Status</th><th></th></tr></thead>
      <tbody>${all.subs.map((s) => `<tr><td>${esc(s.company)}${s.label ? ` <span class="muted small">${esc(s.label)}</span>` : ''}</td><td>${esc(kindLabel(s.kind))}</td><td>${rupee(s.amount)}</td>
        <td>${esc(s.renews_at)}</td><td><span class="pill ${s.status === 'active' ? 'good' : 'warn'}">${esc(s.status)}</span></td>
        <td class="row" style="gap:6px"><button class="small" data-renew="${s.id}">Renew</button>${s.status === 'active' ? `<button class="small" data-cancel="${s.id}">Cancel</button>` : ''}</td></tr>`).join('') || '<tr><td colspan=6 class=muted>No subscriptions yet.</td></tr>'}</tbody></table>
    </div>`;
  $('#s_add', v).onclick = async () => {
    const co = $('#s_co', v).value.trim(), amt = $('#s_amt', v).value;
    if (!co || !amt) { $('#s_err', v).textContent = 'Client and amount are required'; return; }
    try {
      await api('POST', '/api/subs', { company: co, kind: $('#s_kind', v).value, amount: Number(amt),
        renews_at: $('#s_renews', v).value || undefined, label: $('#s_label', v).value.trim() || undefined, note: $('#s_note', v).value.trim() || undefined });
      toast('Added'); viewRenewals(v);
    } catch (e) { $('#s_err', v).textContent = e.message; }
  };
  v.querySelectorAll('[data-renew]').forEach((b) => b.onclick = async () => { const r = await api('POST', `/api/subs/${b.dataset.renew}/renew`); toast('Renewed → ' + r.renews_at); viewRenewals(v); });
  v.querySelectorAll('[data-lapse]').forEach((b) => b.onclick = async () => { await api('PATCH', `/api/subs/${b.dataset.lapse}`, { status: 'lapsed' }); toast('Marked lapsed'); viewRenewals(v); });
  v.querySelectorAll('[data-cancel]').forEach((b) => b.onclick = async () => { await api('PATCH', `/api/subs/${b.dataset.cancel}`, { status: 'cancelled' }); toast('Cancelled'); viewRenewals(v); });
}

// ================= BUILDER: MY BUILDS =================
// Short elapsed time (m/h/d) from a UTC SQLite datetime — demos are minutes-old,
// so days-only aging reads wrong here.
function ageShort(stamp) {
  if (!stamp) return '';
  const t = Date.parse(String(stamp).replace(' ', 'T') + 'Z');
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

async function viewBuilds(v) {
  v.innerHTML = skel(3) + skel(3);
  const [mine, demoRes] = await Promise.all([api('GET', '/api/fulfillment/mine'), api('GET', '/api/fulfillment/demos')]);
  const builds = mine.builds || [], demos = demoRes.demos || [];
  const promptById = {}; demos.forEach((d) => { promptById[d.id] = d.demo_prompt; });
  const demoCard = (d) => {
    const claim = d.mine ? `<span class="pill accent">you're on it</span>` : (d.builder_name ? `<span class="muted small">claimed by ${esc(d.builder_name)}</span>` : '');
    return `<div class="fx-card">
      <div class="fx-card-top"><span class="fx-co">${esc(d.company)}</span><span class="fx-age">${ageShort(d.demo_requested_at) || 'now'}</span></div>
      <div class="fx-meta"><span class="muted small">${esc(d.mode_name || '')} · demo</span> ${claim}</div>
      <div class="fx-actions" style="margin-top:8px">
        <button class="small fx-demo-prompt" data-lead="${d.id}">Copy prompt</button>
        ${!d.builder_name ? `<button class="small fx-demo-claim" data-lead="${d.id}">Claim</button>` : ''}
      </div>
      <div class="row" style="gap:6px;margin-top:8px"><input class="fx-demo-url" data-lead="${d.id}" placeholder="https://…deployed demo" style="flex:1"/>
        <button class="small primary fx-demo-link" data-lead="${d.id}">Ready</button></div>
    </div>`;
  };
  v.innerHTML = `
    <div class="card"><div class="row"><h2 style="margin:0">Demo requests</h2> <span class="fx-n">${demos.length}</span><div class="grow"></div>
      <span class="muted small">Pre-sale — build fast, the caller sends it as the 2nd touch</span></div>
      <div class="fx-demo-grid" style="margin-top:12px">${demos.map(demoCard).join('') || '<div class="muted small">No demo requests waiting.</div>'}</div>
    </div>
    <div class="card"><h2>Full builds <span class="fx-n">${builds.length}</span></h2>
      <div class="fx-mine-list">${builds.length ? '' : '<p class="muted" style="margin:6px 0 0">No sites assigned yet. When a manager assigns you a build it appears here with the full prompt and the client brief.</p>'}</div>
    </div>
    <div id="ic_build"></div>`;
  const list = $('.fx-mine-list', v);
  builds.forEach((r) => {
    const stage = r.build_stage === 'delivered' ? (r.approval === 'changes' ? 'Changes requested' : 'Delivered · awaiting client') : 'To build';
    const el = document.createElement('div'); el.className = 'fx-mine-row';
    el.innerHTML = `<div><b>${esc(r.company)}</b> <span class="muted small" style="font-family:var(--mono)">${esc(r.code)}</span>
      <div class="muted small">${esc(stage)}${r.age_days != null ? ` · ${r.age_days}d` : ''}</div></div>`;
    const open = document.createElement('button'); open.className = 'small primary'; open.textContent = 'Open build';
    open.onclick = () => showBuild(v, r.code);
    el.appendChild(open); list.appendChild(el);
  });
  v.querySelectorAll('.fx-demo-prompt').forEach((b) => b.onclick = () => { navigator.clipboard?.writeText(promptById[b.dataset.lead] || ''); toast('Demo prompt copied. Paste into Claude Code.'); });
  v.querySelectorAll('.fx-demo-claim').forEach((b) => b.onclick = async () => { try { await api('POST', `/api/fulfillment/demos/${b.dataset.lead}/claim`); toast('Claimed'); viewBuilds(v); } catch (e) { toast(e.message); } });
  v.querySelectorAll('.fx-demo-link').forEach((b) => b.onclick = async () => {
    const inp = v.querySelector(`.fx-demo-url[data-lead="${b.dataset.lead}"]`);
    const url = (inp.value || '').trim(); if (!url) { toast('Paste the deployed link first'); return; }
    try { await api('POST', `/api/fulfillment/demos/${b.dataset.lead}/link`, { url }); toast('Demo delivered — the caller can send it now'); viewBuilds(v); }
    catch (e) { toast(e.message); }
  });
}

function briefSectionsHtml(b) {
  return b.form.map((sec) => {
    const items = sec.fields.map((f) => {
      let val = b.answers[f.key];
      if (Array.isArray(val)) val = val.filter(Boolean).join(', ');
      if (!val || !String(val).trim()) return '';
      return `<div class="rev-item"><span class="muted small">${esc(f.label)}</span><div style="white-space:pre-wrap">${esc(val)}</div></div>`;
    }).filter(Boolean).join('');
    return items ? `<h3>${esc(sec.section)}</h3>${items}` : '';
  }).join('');
}

async function showBuild(v, code) {
  const b = await api('GET', `/api/intake/view/${code}`);
  const filesHtml = (b.files || []).length
    ? b.files.map((f) => `<a class="btnlink small" href="/api/intake/file/${f.id}" target="_blank" rel="noopener">${esc(f.original || 'file')}</a>`).join(' ')
    : '<span class="muted small">No files from the client.</span>';
  const card = $('#ic_build', v);
  card.innerHTML = `
    <div class="card">
      <div class="row"><h2 style="margin:0">Build: ${esc(b.company)}</h2><span class="pill good">${esc(code)}</span><div class="grow"></div>
        <button class="primary small" id="b_copyprompt">Copy build prompt</button></div>
      <p class="muted small" style="margin-top:0">Paste straight into Claude Code (Opus 4.8) to build the whole site in one go.</p>
      <pre class="prompt">${esc(b.prompt)}</pre>
    </div>
    <div class="card"><h2>Deliver</h2>
      <div class="grid cols2">
        <div><label>Preview URL (goes to the client's review page)</label><input id="b_preview" value="${esc(b.preview_url || '')}" placeholder="https://..."/></div>
        <div><label>Assets from client</label><div class="row wrap">${filesHtml}</div></div>
      </div>
      <div class="row" style="margin-top:12px"><button class="primary small" id="b_deliver">Mark delivered</button>
        <span class="muted small">Current stage: ${esc(b.build_stage || 'to build')}${b.approval === 'changes' ? ' · client asked for changes' : ''}</span></div>
    </div>
    <div class="card"><h2>Client brief</h2><div class="review" style="margin-top:8px">${briefSectionsHtml(b) || '<p class="muted">Empty.</p>'}</div></div>`;
  $('#b_copyprompt', card).onclick = () => { navigator.clipboard?.writeText(b.prompt); toast('Build prompt copied. Paste into Claude Code.'); };
  $('#b_deliver', card).onclick = async () => {
    await api('PATCH', `/api/intake/${code}`, { build_stage: 'delivered', preview_url: $('#b_preview', card).value.trim() });
    toast('Marked delivered — the client can now review'); await viewBuilds(v);
  };
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ================= ADD LEADS (shared by adder + manager) =================
// Add-leads card: single add + CSV/paste import with dedup + DNC feedback.
// `onAdded` lets the host (e.g. manager Leads table) refresh after import.
function leadAddCard(onAdded) {
  const c = document.createElement('div'); c.className = 'card';
  c.innerHTML = `<h2>Add leads</h2>
    <div class="grid cols2"><div><label>Company</label><input id="co"/></div><div><label>Phone</label><input id="ph" placeholder="98765 43210"/></div></div>
    <div class="err" id="e1"></div><button class="primary" id="add1" style="margin-top:8px">Add lead</button>
    <h2 style="margin-top:22px">Bulk / CSV import <span class="muted small">paste lines or a CSV (a header row like "Company, Phone" is auto-detected)</span></h2>
    <textarea id="bulk" style="min-height:150px" placeholder="Sharma & Associates, 9876543210
Verma CA Firm, 9988776655"></textarea>
    <div class="err" id="e2"></div><button class="primary" id="addbulk" style="margin-top:8px">Import</button>`;
  $('#add1', c).onclick = async () => {
    try {
      await api('POST', '/api/leads', { mode_id: state.modeId, company: $('#co', c).value.trim(), phone: $('#ph', c).value.trim() });
      $('#co', c).value = ''; $('#ph', c).value = ''; $('#e1', c).textContent = ''; toast('Lead added'); onAdded && onAdded();
    } catch (e) { $('#e1', c).textContent = e.message; }
  };
  $('#addbulk', c).onclick = async () => {
    try {
      const r = await api('POST', '/api/leads/bulk', { mode_id: state.modeId, text: $('#bulk', c).value });
      const extra = [r.duplicates ? `${r.duplicates} duplicate` : '', r.suppressed ? `${r.suppressed} on DNC` : '', r.skipped.length ? `${r.skipped.length} unreadable` : ''].filter(Boolean).join(', ');
      $('#e2', c).textContent = extra ? `Skipped ${extra}.` : '';
      $('#bulk', c).value = ''; toast(`Imported ${r.added} lead${r.added === 1 ? '' : 's'}`); onAdded && onAdded();
    } catch (e) { $('#e2', c).textContent = e.message; }
  };
  return c;
}

function viewAdd(v) {
  v.innerHTML = '';
  const bar = document.createElement('div'); bar.className = 'card row wrap';
  bar.append('Target mode: ', modePicker());
  v.appendChild(bar);
  v.appendChild(leadAddCard());
}

// ================= CALLER: CONSOLE (operator dashboard) =================
const caller = { selectedId: null, list: null };

async function viewCall(v) {
  v.innerHTML = `
    <div class="cc-top">
      <div><strong id="cc_remaining">0</strong> <span class="muted">remaining · <span id="cc_done">0</span> done today</span></div>
      <div class="grow"></div>
      <span class="cc-campaign" id="cc_campaign"></span>
      <button class="btn-quiet small" id="cc_brief">Brief</button>
      <button class="primary small" id="cc_pull">Pull next lead</button>
      <span class="muted small kbd-hints">j k move · c call · n pull · b brief</span>
    </div>
    <div class="console">
      <div class="cc-rail" id="cc_rail"><div class="skel skel-line" style="margin:12px;width:70%"></div><div class="skel skel-line" style="margin:12px;width:85%"></div><div class="skel skel-line" style="margin:12px;width:60%"></div></div>
      <div class="cc-work" id="cc_work"></div>
    </div>`;
  $('#cc_campaign', v).append('Campaign ', modePicker(() => viewCall(v), true));
  $('#cc_pull', v).onclick = () => pullNext(v);
  $('#cc_brief', v).onclick = () => togglePlaybook();
  await loadConsole(v);
  wireConsoleKeys(v);
}

// Leads the caller works actively, in priority order: replied first, then due,
// then demos waiting/ready.
const workable = (data) => [...(data.hot || []), ...(data.due || []), ...(data.demo || []), ...(data.ghosts || [])];

async function loadConsole(v, keepSelection = true) {
  const data = await api('GET', `/api/queue/list?mode_id=${state.modeId}`);
  caller.list = data;
  const rem = $('#cc_remaining', v), done = $('#cc_done', v);
  if (rem) rem.textContent = data.hot.length + data.due.length;
  if (done) done.textContent = data.done_today;
  const ids = workable(data).map((l) => l.id);
  if (!keepSelection || !ids.includes(caller.selectedId)) caller.selectedId = ids[0] || null;
  renderRail(v);
  const work = $('#cc_work', v);
  if (caller.selectedId) await selectLead(v, caller.selectedId);
  else work.innerHTML = `<div class="card empty">${data.pool_count ? 'Nothing in progress. Pull a lead from the pool to begin.' : 'All done. No leads are due right now.'}</div>`;
}

function railItem(v, l, mode) {
  const at = l.callback_time ? ' @' + esc(l.callback_time) : '';
  let sub, badge = '';
  if (mode === 'hot') { sub = 'replied on WhatsApp'; badge = '<span class="pill good">reply</span>'; }
  else if (mode === 'demo') { sub = l.demo_status === 'ready' ? 'demo ready to send' : 'waiting for demo link'; badge = `<span class="pill ${l.demo_status === 'ready' ? 'good' : 'accent'}">demo</span>`; }
  else if (mode === 'ghost') { sub = 'got sample, went quiet'; badge = '<span class="pill warn">reactivate</span>'; }
  else if (mode === 'due') { sub = `Step ${l.step_no}/${l.total_steps}${l.last_outcome ? ' · last: ' + esc(l.last_outcome) : ''}${at}`; badge = l.late ? '<span class="pill bad">late</span>' : '<span class="pill warn">due</span>'; }
  else sub = `due ${esc(l.next_due)}${at}`;
  const el = document.createElement('div');
  el.className = 'cc-item' + (l.id === caller.selectedId ? ' sel' : '');
  el.innerHTML = `<div class="cc-item-main"><strong>${worthDot(l.worth)}${esc(l.company)}</strong><div class="muted small">${sub}</div></div>${badge}`;
  el.onclick = () => selectLead(v, l.id);
  return el;
}

function renderRail(v) {
  const rail = $('#cc_rail', v), data = caller.list;
  rail.innerHTML = '';
  const grp = (label, n) => { const h = document.createElement('div'); h.className = 'cc-group'; h.textContent = `${label} · ${n}`; rail.appendChild(h); };
  if (data.hot.length) { grp('REPLIED', data.hot.length); data.hot.forEach((l) => rail.appendChild(railItem(v, l, 'hot'))); }
  grp('DUE NOW', data.due.length);
  if (!data.due.length) { const e = document.createElement('div'); e.className = 'muted small'; e.style.padding = '8px 12px'; e.textContent = 'Nothing due right now.'; rail.appendChild(e); }
  data.due.forEach((l) => rail.appendChild(railItem(v, l, 'due')));
  if (data.demo.length) { grp('DEMO', data.demo.length); data.demo.forEach((l) => rail.appendChild(railItem(v, l, 'demo'))); }
  if ((data.ghosts || []).length) {
    grp('REACTIVATE', data.ghosts.length);
    const hint = document.createElement('div'); hint.className = 'muted small'; hint.style.padding = '2px 12px 6px';
    hint.textContent = 'Got the sample, went quiet. Best move: Generate demo.';
    rail.appendChild(hint);
    data.ghosts.forEach((l) => rail.appendChild(railItem(v, l, 'ghost')));
  }
  if (data.upcoming.length) { grp('UPCOMING', data.upcoming.length); data.upcoming.forEach((l) => rail.appendChild(railItem(v, l, 'up'))); }
  const foot = document.createElement('div'); foot.className = 'cc-pool';
  foot.innerHTML = `<span class="muted small">Pool: ${data.pool_count} lead${data.pool_count === 1 ? '' : 's'}</span>`;
  if (data.pool_count) { const pb = document.createElement('button'); pb.className = 'small'; pb.textContent = 'Pull next'; pb.onclick = () => pullNext(v); foot.appendChild(pb); }
  rail.appendChild(foot);
}

async function selectLead(v, id) {
  caller.selectedId = id;
  renderRail(v);
  const w = await api('GET', `/api/queue/lead/${id}`);
  renderWork($('#cc_work', v), w, v);
}

async function pullNext(v) {
  const w = await api('POST', '/api/queue/next', { mode_id: state.modeId });
  if (w.empty) { toast('No leads left in this campaign'); return; }
  caller.selectedId = w.lead.id;
  await loadConsole(v);
}

function moveSelection(v, delta) {
  const ids = workable(caller.list || {}).map((l) => l.id);
  if (!ids.length) return;
  let i = ids.indexOf(caller.selectedId);
  i = (i + delta + ids.length) % ids.length;
  selectLead(v, ids[i]);
}

function wireConsoleKeys(v) {
  if (window.__ccKeys) document.removeEventListener('keydown', window.__ccKeys);
  const h = (e) => {
    if (state.tab !== 'call' || /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'j') { e.preventDefault(); moveSelection(v, 1); }
    else if (e.key === 'k') { e.preventDefault(); moveSelection(v, -1); }
    else if (e.key === 'n') { e.preventDefault(); pullNext(v); }
    else if (e.key === 'c') { const sc = $('#startcall', v); if (sc) sc.click(); }
    else if (e.key === 'b') { e.preventDefault(); togglePlaybook(); }
  };
  document.addEventListener('keydown', h);
  window.__ccKeys = h;
}

// ---------- caller playbook (searchable company/product brief drawer) ----------
let PB_DATA = null;
function togglePlaybook() { document.querySelector('.pb-overlay') ? closePlaybook() : openPlaybook(); }
function closePlaybook() { const o = document.querySelector('.pb-overlay'); if (o) o.remove(); }

async function openPlaybook() {
  if (!PB_DATA) { try { PB_DATA = await api('GET', '/api/playbook'); } catch { PB_DATA = []; } }
  const o = document.createElement('div');
  o.className = 'pb-overlay';
  o.innerHTML = `<div class="pb-drawer" role="dialog" aria-label="Company brief">
    <div class="pb-head">
      <strong>Company brief</strong>
      <input id="pb_search" placeholder="Search the brief…" autocomplete="off" />
      <button class="btn-quiet small" id="pb_close" aria-label="Close">✕</button>
    </div>
    <div class="pb-toc" id="pb_toc"></div>
    <div class="pb-body" id="pb_body"></div>
  </div>`;
  document.body.appendChild(o);
  o.onclick = (e) => { if (e.target === o) closePlaybook(); };
  $('#pb_close', o).onclick = closePlaybook;
  const search = $('#pb_search', o);
  search.oninput = () => renderPlaybook(search.value.trim().toLowerCase());
  search.onkeydown = (e) => { if (e.key === 'Escape') closePlaybook(); };
  renderPlaybook('');
  setTimeout(() => search.focus(), 30);
}

function renderPlaybook(q) {
  const o = document.querySelector('.pb-overlay'); if (!o) return;
  const words = q ? q.split(/\s+/).filter(Boolean) : [];
  const esc1 = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hi = (t) => words.length ? esc(t).replace(new RegExp('(' + words.map(esc1).join('|') + ')', 'ig'), '<mark>$1</mark>') : esc(t);
  const matches = (e) => { const s = (e.h + ' ' + e.b).toLowerCase(); return words.every((w) => s.includes(w)); };
  const secs = PB_DATA.map((s) => ({ ...s, hits: s.entries.filter(matches) })).filter((s) => s.hits.length);
  const toc = $('#pb_toc', o), body = $('#pb_body', o);
  toc.innerHTML = secs.map((s) => `<button class="pb-chip" data-goto="pb_sec_${s.id}">${esc(s.title)}</button>`).join('') || '';
  body.innerHTML = secs.length ? secs.map((s) => `
    <section class="pb-sec" id="pb_sec_${s.id}"><h3>${esc(s.title)}</h3>
      ${s.hits.map((e) => `<div class="pb-entry"><div class="pb-h">${hi(e.h)}</div><div class="pb-b">${hi(e.b)}</div></div>`).join('')}
    </section>`).join('') : '<p class="muted" style="padding:16px">No match.</p>';
  toc.querySelectorAll('[data-goto]').forEach((b) => { b.onclick = () => { const el = $('#' + b.dataset.goto, o), bd = $('.pb-body', o); if (el && bd) bd.scrollTop += el.getBoundingClientRect().top - bd.getBoundingClientRect().top; }; });
}

// Lead-heat helpers. Turns worth {verdict, cls, tip, reasons} into UI.
const HEAT_COLOR = { good: '#3fb950', warn: '#d29922' };
function worthDot(worth) {
  const c = worth && HEAT_COLOR[worth.cls];
  return c ? `<span title="${esc(worth.verdict)}" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:6px;vertical-align:middle"></span>` : '';
}

function renderWork(workEl, w, v) {
  const L = w.lead;
  const today = new Date().toISOString().slice(0, 10);
  const worth = w.worth || { verdict: '', cls: '', tip: '', reasons: [] };
  const stepTplId = w.step ? w.step.template_id : null;
  const atTime = L.callback_time ? ' ' + esc(L.callback_time) : '';
  const timing = L.next_due && L.next_due < today ? `<span class="pill bad">late${atTime}</span>`
    : (L.next_due ? `<span class="pill warn">due ${esc(L.next_due)}${atTime}</span>` : '');
  const tel = (L.phone || '').replace(/\s/g, '');

  // Demo workflow panels: waiting-for-link (show prompt) or ready-to-send (show message).
  let demoCard = '';
  if (w.demo_status === 'requested') {
    demoCard = `<div class="card">
      <div class="row"><h2 style="margin:0">Demo requested</h2><span class="pill accent">waiting for link</span>
        <div class="grow"></div>
        <button class="btn-quiet small" id="cc_abandondemo">Abandon</button>
        <button class="small" id="cc_copyprompt">Copy prompt</button></div>
      <p class="muted small" style="margin-top:0">A builder has picked this up in their queue and is building it now — it'll appear here ready to send as soon as they deliver. Keep making other calls meanwhile.</p>
      <details style="margin-top:4px"><summary class="muted small">Build it yourself / send to a dev</summary>
      <pre class="prompt" id="cc_prompt">${esc(w.demo_prompt)}</pre>
      <label>Demo link (paste it here if you build it outside the builder queue)</label>
      <div class="row"><input id="cc_demourl" placeholder="https://...vercel.app"/><button class="primary small" id="cc_savelink">Save link</button></div></details>
      <div class="err" id="cc_demoerr"></div>
    </div>`;
  } else if (w.demo_status === 'ready' && w.demo_message) {
    demoCard = `<div class="card">
      <div class="row"><h2 style="margin:0">Demo ready to send</h2><span class="pill good">link received</span>
        <div class="grow"></div><button class="btn-quiet small" id="cc_abandondemo">Abandon</button></div>
      <p class="muted small" style="margin-top:0">Send this message to the lead on WhatsApp (demo link included), then log the outcome below. Remember to say it's only a 10% glimpse — the real site is far better.</p>
      <div class="msg">${esc(w.demo_message.body)}</div>
      <a class="wa" style="margin-top:8px;display:inline-block" href="${esc(w.demo_message.whatsapp_url)}" target="_blank" rel="noopener">Send demo on WhatsApp</a>
    </div>`;
  }

  const messageCard = (w.messages || []).length ? `
    <div class="card" id="msgcard">
      <div class="row" style="margin-bottom:4px"><h2 style="margin:0">WhatsApp messages</h2>
        <span class="muted small">ready to send to ${esc(L.phone)}</span></div>
      <p class="muted small" style="margin-top:0">Tap a message to open WhatsApp with the text already filled in.</p>
      ${w.messages.map((m) => `
        <div class="msgrow" data-tpl="${m.id}">
          <div class="row"><strong>${esc(m.title)}</strong>
            ${m.id === stepTplId ? '<span class="pill accent">this step</span>' : ''}
            <div class="grow"></div>
            <a class="wa" href="${esc(m.whatsapp_url)}" target="_blank" rel="noopener">Send on WhatsApp</a></div>
          <div class="msg">${esc(m.body)}</div>
        </div>`).join('')}
    </div>` : '';

  // Dispositions card (shared): always present so an outcome can be logged.
  const dispCard = `<div class="card disp-card">
        <h2>Log outcome</h2>
        <p class="disp-hint">Tap what happened. The sequence advances and the next lead loads.</p>
        <div class="outcomes" id="outcomes"></div>
        <label>Note (optional)</label><textarea id="note" style="min-height:56px"></textarea>
        <label id="cblabel" style="display:none">Call back on</label>
        <div class="row" id="cbrow" style="display:none"><input id="cbdate" type="date"/><input id="cbtime" type="time" style="max-width:130px"/></div>
      </div>`;

  // A demo-requested lead is PARKED (waiting on the dev): hide the call navigator,
  // but KEEP the dispositions so the caller can still log the connect (it stays in
  // the Demo lane until the link is back) and can Abandon above — never a dead-end.
  const parked = w.demo_status === 'requested';
  const workBody = parked
    ? `<div class="work">
      <div class="card"><p class="muted" style="margin:0">Demo is being built. Send the prompt above to the developer; paste the link as soon as it arrives. Meanwhile you can log the call outcome here (e.g. "Will get back"), or hit Abandon above to put the lead back in the queue.</p></div>
      ${dispCard}
    </div>`
    : `<div class="work">
      <div class="card">
        <div id="nav"></div>
        <details class="scripts-ref" ${w.flow ? '' : 'open'}><summary>Reference scripts</summary>
          ${w.scripts.map((s) => `<div><label>${esc(s.title)}</label><div class="script">${esc(s.body)}</div></div>`).join('') || '<p class="muted small">No script for this mode.</p>'}
        </details>
      </div>
      ${dispCard}
    </div>
    ${messageCard}`;

  const pct = w.total_steps ? Math.round((L.step_no / w.total_steps) * 100) : 0;
  const heatCls = worth.cls === 'good' ? 'good' : worth.cls === 'warn' ? 'warn' : 'neutral';
  const heatBanner = worth.verdict ? `
      <div class="heat ${heatCls}">
        <span class="heat-dot"></span>
        <span class="heat-verdict">${esc(worth.verdict)}</span>
        <span class="heat-tip">${esc(worth.tip)}</span>
        ${worth.reasons.length ? `<span class="heat-reasons">${esc(worth.reasons.join(' · '))}</span>` : ''}
      </div>` : '';
  const demoBtn = w.demo_status ? ''
    : `<button class="${worth.cls === 'good' ? 'btn-good' : 'btn-quiet'}" id="cc_gendemo">Generate demo</button>`;

  workEl.innerHTML = `
    <div class="card cc-hero">
      <div class="cc-hero-top">
        <div class="cc-hero-id">
          <div class="lead-head">${esc(L.company)}</div>
          <div class="cc-sub"><b>${esc(w.mode_name || '')}</b> · ${esc(w.step ? w.step.title : '')}${w.step ? ` (${esc(w.step.kind)})` : ''}</div>
        </div>
        ${timing}
      </div>
      <a class="phone-chip" href="tel:${esc(tel)}"><span>${esc(L.phone)}</span><span class="pc-call">Call</span></a>
      <div class="cc-progress"><span style="width:${pct}%"></span></div>
      <div class="cc-progress-cap"><span>Step ${L.step_no} of ${w.total_steps}</span><span>${esc(w.step ? w.step.kind : '')}</span></div>
      ${heatBanner}
      <div class="cc-actions">
        ${demoBtn}
        <button class="btn-quiet" id="cc_replied">${L.replied_at ? 'Replied ✓' : 'Mark replied'}</button>
        <button class="btn-quiet" id="cc_history">History</button>
        <span class="sep"></span>
        <button class="btn-quiet" id="cc_skip">Skip</button>
      </div>
      <div id="cc_histpanel"></div>
    </div>
    ${demoCard}
    ${workBody}`;

  $('#cc_skip', workEl).onclick = () => moveSelection(v, 1);
  $('#cc_history', workEl).onclick = async () => {
    const panel = $('#cc_histpanel', workEl);
    if (panel.innerHTML) { panel.innerHTML = ''; return; }
    const h = await api('GET', `/api/queue/history/${L.id}`);
    panel.innerHTML = `<div class="cc-hist">${h.length ? h.map((r) => `<div class="rev-item"><span class="muted small">${esc(r.created_at.slice(0, 16))} · ${esc(r.outcome)}${r.user_name ? ' · ' + esc(r.user_name) : ''}</span>${r.note ? `<div>${esc(r.note)}</div>` : ''}</div>`).join('') : '<p class="muted small">No previous calls logged.</p>'}</div>`;
  };
  $('#cc_replied', workEl).onclick = async () => { await api('POST', '/api/queue/replied', { lead_id: L.id }); toast('Moved to Replied lane'); await loadConsole(v); };
  const genDemo = $('#cc_gendemo', workEl);
  if (genDemo) genDemo.onclick = async () => {
    const cold = worth.cls !== 'good';
    const msg = cold
      ? `${L.company} is still "${worth.verdict}" (${worth.reasons.join(', ') || 'no engagement yet'}). A demo costs the developer's time — generate it now anyway? Better: send a sample/message first, demo once they warm up.`
      : `Generate a demo build prompt for ${L.company}? The lead moves to the Demo lane while the developer builds it.`;
    if (!confirm(msg)) return;
    try { await api('POST', '/api/queue/demo/request', { lead_id: L.id }); }
    catch (e) { toast(e.message || 'Could not start demo'); await loadConsole(v); return; }
    toast('Demo prompt ready — send it to the developer'); caller.selectedId = L.id; await loadConsole(v);
  };
  const copyP = $('#cc_copyprompt', workEl);
  if (copyP) copyP.onclick = () => { navigator.clipboard?.writeText(w.demo_prompt || ''); toast('Prompt copied'); };
  const abandon = $('#cc_abandondemo', workEl);
  if (abandon) abandon.onclick = async () => {
    if (!confirm(`Abandon the demo for ${L.company}? The lead goes back into the normal queue at its current step.`)) return;
    await api('POST', '/api/queue/demo/cancel', { lead_id: L.id });
    toast('Demo abandoned — lead back in queue'); caller.selectedId = L.id; await loadConsole(v);
  };
  const saveLink = $('#cc_savelink', workEl);
  if (saveLink) saveLink.onclick = async () => {
    try {
      await api('POST', '/api/queue/demo/link', { lead_id: L.id, url: $('#cc_demourl', workEl).value.trim() });
      toast('Demo link saved — ready to send'); caller.selectedId = L.id; await loadConsole(v);
    } catch (e) { $('#cc_demoerr', workEl).textContent = e.message; }
  };

  const cbInput = $('#cbdate', workEl), cbTimeInput = $('#cbtime', workEl), cbRow = $('#cbrow', workEl), cbLabel = $('#cblabel', workEl);
  const actionOf = (outcome) => (w.outcomes.find((o) => o.value === outcome) || {}).action || 'advance';

  const outcomeLabel = (outcome) => (w.outcomes.find((o) => o.value === outcome) || {}).label || outcome;

  // Deal closed -> the client gets their intake QUIZ (colors/content/pages, which
  // generates the build prompt), not just a verbal detail-grab. Mint the code now
  // (the won lead is about to leave the queue) and show a ready-to-send WhatsApp
  // message with the /quiz link. Renders in the navigator area; advance on Next.
  async function presentClose(label) {
    let code = '', err = '';
    try { code = (await api('POST', '/api/queue/quiz-code', { lead_id: L.id })).code; }
    catch (e) { err = e.message; }
    const quizUrl = code ? `${location.origin}/quiz?code=${code}` : '';
    const msg = code ? `Badhaai ho${L.company ? ' ' + L.company : ''}! SiteBhai se. Aapki website banana shuru karte hain. Bas ye chhota form bhar dijiye (2 minute) — colors, content aur pages aap khud chunenge taaki site bilkul aapke hisaab se bane:\n${quizUrl}\n\nForm bharte hi hum kaam shuru kar denge. Koi doubt ho toh yahin WhatsApp kijiye.` : '';
    const wa = code ? `https://wa.me/${L.phone_norm || ''}?text=${encodeURIComponent(msg)}` : '';
    const host = $('#nav', workEl);
    if (!host) { caller.selectedId = null; return loadConsole(v); }
    host.innerHTML = `<div class="nav nav-result">
      <div class="row"><span class="pill good">Closed</span><span>${esc(label)}</span><div class="grow"></div>
        <button class="small primary" id="nav_next">Next lead</button></div>
      <p class="muted small" style="margin:8px 0">Deal closed! Now send the client the intake quiz — they fill in colours/content/pages, which generates the build prompt.</p>
      ${code ? `<div class="msg">${esc(msg)}</div>
        <div class="row" style="margin-top:8px"><a class="wa" href="${esc(wa)}" target="_blank" rel="noopener">Send quiz on WhatsApp</a>
        <button class="small btn-quiet" id="nav_copyquiz">Copy quiz link</button>
        <span class="muted small">Code ${esc(code)}</span></div>`
        : `<p class="err">Couldn't create the quiz link: ${esc(err)}</p>`}</div>`;
    $('#nav_next', host).onclick = async () => { caller.selectedId = null; await loadConsole(v); };
    const cq = $('#nav_copyquiz', host); if (cq) cq.onclick = () => { navigator.clipboard?.writeText(quizUrl); toast('Quiz link copied'); };
    // The lead is now closed — grey out the dispositions so a stray click can't re-open it.
    const disp = $('.disp-card', workEl); if (disp) { disp.style.opacity = '.45'; disp.style.pointerEvents = 'none'; }
  }

  // Log an outcome, then refresh the console and move to the next due lead.
  async function submitOutcome(outcome) {
    const body = { lead_id: L.id, outcome, note: $('#note', workEl).value || undefined };
    if (actionOf(outcome) === 'callback') {
      if (!cbInput.value) { cbLabel.style.display = 'block'; cbRow.style.display = 'flex'; cbInput.focus(); toast('Pick a callback date (time optional)'); return; }
      body.callback_date = cbInput.value;
      if (cbTimeInput.value) body.callback_time = cbTimeInput.value;
    }
    let patch;
    try { patch = await api('POST', '/api/queue/log', body); }
    catch (e) { toast(e.message || 'Could not log'); await loadConsole(v); return; }
    toast('Logged');
    if (patch.action === 'won') return presentClose(outcomeLabel(outcome));
    caller.selectedId = null;
    await loadConsole(v);
  }

  // Log WhatsApp sends (present-only signal) when a message link is opened.
  workEl.querySelectorAll('.msgrow a.wa').forEach((a) => {
    a.addEventListener('click', () => {
      const tpl = Number(a.closest('.msgrow')?.dataset.tpl);
      if (tpl) api('POST', '/api/queue/sent', { lead_id: L.id, template_id: tpl }).catch(() => {});
    });
  });

  const out = $('#outcomes', workEl);
  if (out) w.outcomes.forEach((o) => {
    const b = document.createElement('button');
    const tag = o.action === 'won' ? 'good' : o.action === 'lost' ? 'bad' : o.action === 'callback' ? 'warn' : o.action === 'followup' ? 'accent' : '';
    b.innerHTML = `<span>${esc(o.label)}</span><span class="pill ${tag}">${o.action}</span>`;
    b.onclick = () => submitOutcome(o.value);
    out.appendChild(b);
  });

  // Flash a WhatsApp message row when a navigator branch wants it sent.
  function flashMessage(tplId) {
    const row = workEl.querySelector(`.msgrow[data-tpl="${tplId}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('flash');
    setTimeout(() => row.classList.remove('flash'), 1600);
  }

  // ---- live call navigator ----
  const navEl = $('#nav', workEl);
  if (w.flow && w.flow.nodes.length && navEl) {
    const nodeById = (id) => w.flow.nodes.find((n) => n.id === id);
    const nav = { started: false, nodeId: w.flow.entry_id, history: [] };

    // Terminal state INSIDE the navigator. The caller may still be on the call, so
    // never reload/yank here — show the result and let them advance on their terms.
    function navResult(inner) {
      navEl.innerHTML = `<div class="nav nav-result">${inner}</div>`;
      const nx = $('#nav_next', navEl);
      if (nx) nx.onclick = async () => { caller.selectedId = null; await loadConsole(v); };
    }

    // Generate the demo WITHOUT tearing down the live call. Prompt shown inline to
    // copy to the dev; the call continues; caller advances when ready.
    async function requestDemoFromNav() {
      if (w.demo_status && w.demo_status !== 'sent') { toast('Demo already in progress for this lead'); return; }
      let r;
      try { r = await api('POST', '/api/queue/demo/request', { lead_id: L.id }); }
      catch (e) { toast(e.message || 'Could not start demo'); return; }
      w.demo_status = 'requested'; w.demo_prompt = r.prompt || w.demo_prompt;
      navResult(`
        <div class="row"><span class="pill accent">Demo queued for a builder</span><div class="grow"></div>
          <button class="small" id="nav_copyprompt">Copy prompt</button>
          <button class="small" id="nav_next">Next lead</button></div>
        <p class="muted small" style="margin:8px 0">A builder will pick this up and build it — it'll come back ready to send on this lead's card. Tell the prospect: "aaj aapka apna demo bana ke WhatsApp karta hoon." Keep the call going; when it ends, log the outcome below (e.g. Will get back), or Next lead.</p>`);
      const cp = $('#nav_copyprompt', navEl);
      if (cp) cp.onclick = () => { navigator.clipboard?.writeText(r.prompt || ''); toast('Prompt copied'); };
      toast('Demo queued — keep the call going');
    }

    // Log an outcome from the navigator, then confirm in-place (no auto-jump). The
    // caller stays on the lead (e.g. to collect details after a close) and clicks Next.
    async function navOutcome(outcome) {
      if (actionOf(outcome) === 'callback' && !cbInput.value) {
        cbLabel.style.display = 'block'; cbRow.style.display = 'flex'; cbInput.focus();
        toast('Enter a callback date below, then pick the option again'); return;
      }
      const body = { lead_id: L.id, outcome, note: $('#note', workEl).value || undefined };
      if (actionOf(outcome) === 'callback') { body.callback_date = cbInput.value; if (cbTimeInput.value) body.callback_time = cbTimeInput.value; }
      let patch;
      try { patch = await api('POST', '/api/queue/log', body); }
      catch (e) { toast(e.message || 'Could not log'); await loadConsole(v); return; }
      toast('Logged');
      const label = outcomeLabel(outcome);
      const act = patch.action || actionOf(outcome);
      if (act === 'won') return presentClose(label); // deal closed -> send the intake quiz
      const cls = act === 'lost' ? 'bad' : act === 'callback' ? 'warn' : 'accent';
      navResult(`
        <div class="row"><span class="pill ${cls}">Logged</span><span>${esc(label)}</span><div class="grow"></div>
          <button class="small primary" id="nav_next">Next lead</button></div>
        <p class="muted small" style="margin-top:8px">Wrap up the call at your pace. When ready, hit Next lead (or pick a lead from the sidebar).</p>`);
    }

    function chooseOption(o) {
      // Front-loaded demo: a positive first-call branch generates the demo right here.
      if (o.gen_demo) { requestDemoFromNav(); return; }
      if (o.template_id) flashMessage(o.template_id);
      if (o.outcome) { navOutcome(o.outcome); return; }
      if (o.next_node_id) { nav.history.push(nav.nodeId); nav.nodeId = o.next_node_id; renderNav(); }
    }

    function renderNav() {
      if (!nav.started) {
        navEl.innerHTML = `<div class="nav-primer">
            <div class="np-copy"><div class="np-title">Guided call navigator</div>
              <div class="np-sub">Branches live as the call goes — tap what they say, it scripts the reply.</div></div>
            <button class="primary" id="startcall">Start call</button>
          </div>`;
        $('#startcall', navEl).onclick = () => { nav.started = true; nav.nodeId = w.flow.entry_id; nav.history = []; renderNav(); };
        return;
      }
      const node = nodeById(nav.nodeId);
      const crumbs = nav.history.map((id) => esc(nodeById(id).title)).concat(`<strong>${esc(node.title)}</strong>`).join(' &rsaquo; ');
      navEl.innerHTML = `
        <div class="nav">
          <div class="row">
            <span class="pill accent">Live call</span>
            <span class="muted small navcrumb">${crumbs}</span>
            <div class="grow"></div>
            ${nav.history.length ? '<button class="small" id="navback">Back</button>' : ''}
            <button class="small" id="navend">End call</button>
          </div>
          <div class="navsay">${esc(node.say)}</div>
          <div class="muted small" style="margin:10px 0 4px">What did they say?</div>
          <div class="navopts"></div>
        </div>`;
      const opts = $('.navopts', navEl);
      node.options.forEach((o) => {
        const b = document.createElement('button');
        b.className = 'navopt';
        let tag = '';
        if (o.gen_demo) {
          tag = '<span class="pill good">generate demo</span>';
        } else if (o.outcome) {
          const a = actionOf(o.outcome);
          const cls = a === 'won' ? 'good' : a === 'lost' ? 'bad' : a === 'callback' ? 'warn' : a === 'followup' ? 'accent' : '';
          tag = `<span class="pill ${cls}">${o.outcome === 'meeting_booked' ? 'closes' : a}</span>`;
        } else if (o.template_id) {
          tag = '<span class="pill accent">WhatsApp</span>';
        }
        b.innerHTML = `<span>${esc(o.label)}</span> ${tag}`;
        b.onclick = () => chooseOption(o);
        opts.appendChild(b);
      });
      const back = $('#navback', navEl);
      if (back) back.onclick = () => { nav.nodeId = nav.history.pop(); renderNav(); };
      $('#navend', navEl).onclick = () => { nav.started = false; renderNav(); };
    }
    renderNav();
  }
}

// ================= CALLER: CALLBACKS =================
async function viewCallbacks(v) {
  v.innerHTML = skel(4) + skel(3);
  const rows = await api('GET', '/api/queue/callbacks');
  const today = new Date().toISOString().slice(0, 10);
  v.innerHTML = `<div class="card"><h2>My follow-ups (${rows.length})</h2>
    ${rows.map((r) => `<div class="list-item"><div><strong>${esc(r.company)}</strong>
      <span class="muted small" style="font-family:var(--mono)"> ${esc(r.phone)}</span></div>
      <span class="pill ${r.next_due <= today ? 'warn' : ''}">${r.next_due <= today ? 'due now' : 'due ' + esc(r.next_due)}</span></div>`).join('') || '<p class="muted">Nothing scheduled.</p>'}
    <p class="muted small">Due follow-ups appear automatically when you tap Get next lead in the Call tab.</p></div>`;
}
