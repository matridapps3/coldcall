'use strict';
// Public, code-gated website-intake wizard. No login. Renders the form returned
// by /api/intake/start, autosaves a draft to localStorage, and submits the brief.

const root = document.getElementById('quiz');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function api(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

const S = { code: '', company: '', form: [], answers: {}, step: 0 };
const draftKey = () => `intake_${S.code}`;
const saveDraft = () => { try { localStorage.setItem(draftKey(), JSON.stringify(S.answers)); } catch {} };

function brand() {
  return `<div class="quiz-brand">SiteBhai</div>`;
}

// ---------- screen 1: enter code ----------
function renderCode(err) {
  root.innerHTML = `
    <div class="card quiz-card quiz-narrow">
      ${brand()}
      <h1>Tell us about your website</h1>
      <p class="muted">Enter the code we shared with you to begin. It takes about 5 minutes, and you can leave and come back.</p>
      <label>Your code</label>
      <input id="code" autocapitalize="characters" placeholder="e.g. K7P2QM" style="text-transform:uppercase;font-family:var(--mono);font-size:18px;letter-spacing:2px" />
      <div class="err" id="cerr">${err ? esc(err) : ''}</div>
      <button class="primary" id="go" style="width:100%;margin-top:10px">Start</button>
    </div>`;
  const start = async () => {
    const code = document.getElementById('code').value.trim().toUpperCase();
    if (!code) return;
    try {
      const r = await api('/api/intake/start', { code });
      S.code = r.code; S.company = r.company; S.form = r.form; S.step = 0; S.files = r.files || [];
      let answers = r.answers && Object.keys(r.answers).length ? r.answers : null;
      if (!answers) { try { answers = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch {} }
      S.answers = answers || {};
      renderStep();
    } catch (e) { renderCode(e.message); }
  };
  document.getElementById('go').onclick = start;
  document.getElementById('code').onkeydown = (e) => { if (e.key === 'Enter') start(); };
}

// ---------- field rendering ----------
function fieldHtml(f) {
  const v = S.answers[f.key] !== undefined ? S.answers[f.key] : f.default;
  const req = f.required ? ' <span class="req">*</span>' : '';
  const help = f.help ? `<div class="fhelp">${esc(f.help)}</div>` : '';
  let control = '';
  if (f.type === 'textarea') {
    control = `<textarea data-key="${f.key}" placeholder="${esc(f.placeholder || '')}">${esc(v || '')}</textarea>`;
  } else if (f.type === 'select') {
    control = `<select data-key="${f.key}"><option value="">Choose...</option>${f.options.map((o) => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  } else if (f.type === 'radio') {
    control = `<div class="opts" data-key="${f.key}">${f.options.map((o) => `<label class="opt ${v === o ? 'sel' : ''}"><input type="radio" name="${f.key}" value="${esc(o)}" ${v === o ? 'checked' : ''}/> ${esc(o)}</label>`).join('')}</div>`;
  } else if (f.type === 'checks') {
    const arr = Array.isArray(v) ? v : [];
    control = `<div class="opts" data-key="${f.key}">${f.options.map((o) => `<label class="opt ${arr.includes(o) ? 'sel' : ''}"><input type="checkbox" value="${esc(o)}" ${arr.includes(o) ? 'checked' : ''}/> ${esc(o)}</label>`).join('')}</div>`;
  } else if (f.type === 'color') {
    const arr = Array.isArray(v) ? v : [];
    control = `<div class="colorpick" data-key="${f.key}">
      <div class="swatches">${arr.map((c) => swatchHtml(c)).join('')}</div>
      <button type="button" class="addcolor">+ Add a color</button></div>`;
  } else {
    const t = { tel: 'tel', email: 'email', url: 'url' }[f.type] || 'text';
    control = `<input type="${t}" data-key="${f.key}" value="${esc(v || '')}" placeholder="${esc(f.placeholder || '')}" />`;
  }
  return `<div class="field" data-field="${f.key}"><label>${esc(f.label)}${req}</label>${help}${control}</div>`;
}

const swatchHtml = (c) => `<span class="sw"><input type="color" value="${esc(c || '#5b7cfa')}"/><button type="button" class="rmsw">&times;</button></span>`;

// ---------- read current step's inputs into S.answers ----------
function readStep() {
  const sec = S.form[S.step];
  if (!sec) return;
  for (const f of sec.fields) {
    const wrap = root.querySelector(`[data-field="${f.key}"]`);
    if (!wrap) continue;
    if (f.type === 'checks') {
      S.answers[f.key] = [...wrap.querySelectorAll('input:checked')].map((i) => i.value);
    } else if (f.type === 'radio') {
      const sel = wrap.querySelector('input:checked');
      S.answers[f.key] = sel ? sel.value : '';
    } else if (f.type === 'color') {
      S.answers[f.key] = [...wrap.querySelectorAll('input[type=color]')].map((i) => i.value);
    } else {
      S.answers[f.key] = wrap.querySelector('[data-key]').value;
    }
  }
  saveDraft();
}

// ---------- wizard step ----------
function renderStep() {
  const total = S.form.length;
  if (S.step >= total) return renderReview();
  const sec = S.form[S.step];
  const pct = Math.round((S.step / total) * 100);
  root.innerHTML = `
    <div class="card quiz-card">
      ${brand()}
      <div class="muted small">Brief for ${esc(S.company)}</div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="muted small">Step ${S.step + 1} of ${total}</div>
      <h1>${esc(sec.section)}</h1>
      ${sec.intro ? `<p class="muted">${esc(sec.intro)}</p>` : ''}
      <div class="fields">${sec.fields.map(fieldHtml).join('')}</div>
      ${/assets/i.test(sec.section) ? uploadWidget() : ''}
      <div class="err" id="serr"></div>
      <div class="row" style="margin-top:18px">
        ${S.step > 0 ? '<button id="back">Back</button>' : '<span></span>'}
        <div class="grow"></div>
        <button class="primary" id="next">${S.step === total - 1 ? 'Review' : 'Next'}</button>
      </div>
    </div>`;
  wireFieldInteractions();
  if (/assets/i.test(sec.section)) wireUpload();
  const back = document.getElementById('back');
  if (back) back.onclick = () => { readStep(); S.step--; renderStep(); window.scrollTo(0, 0); };
  document.getElementById('next').onclick = () => {
    readStep();
    const missing = sec.fields.filter((f) => f.required && !String(S.answers[f.key] || '').trim());
    if (missing.length) { document.getElementById('serr').textContent = `Please fill: ${missing.map((m) => m.label).join(', ')}`; return; }
    S.step++; renderStep(); window.scrollTo(0, 0);
  };
}

function wireFieldInteractions() {
  // radio/checkbox visual selection
  root.querySelectorAll('.opts').forEach((box) => box.addEventListener('change', () => {
    box.querySelectorAll('.opt').forEach((l) => l.classList.toggle('sel', l.querySelector('input').checked));
    saveDraft();
  }));
  root.querySelectorAll('[data-key]').forEach((el) => el.addEventListener('change', () => { readStep(); }));
  // color picker add/remove
  root.querySelectorAll('.colorpick').forEach((cp) => {
    const swatches = cp.querySelector('.swatches');
    cp.querySelector('.addcolor').onclick = () => { swatches.insertAdjacentHTML('beforeend', swatchHtml('#5b7cfa')); bindRemovers(cp); };
    bindRemovers(cp);
  });
}
function bindRemovers(cp) {
  cp.querySelectorAll('.rmsw').forEach((b) => b.onclick = () => { b.closest('.sw').remove(); });
}

// ---------- logo / photo upload ----------
function uploadWidget() {
  const list = (S.files || []).map((f) => `<li>${esc(f.original || 'file')}</li>`).join('');
  return `<div class="field">
    <label>Upload your logo and photos (optional)</label>
    <div class="fhelp">Images or PDF, up to 12 files. You can also send them later via WhatsApp.</div>
    <input type="file" id="files" multiple accept="image/*,application/pdf"/>
    <button id="uploadbtn" style="margin-top:8px">Upload selected</button>
    <ul class="uploaded" id="uploaded">${list}</ul>
  </div>`;
}

function wireUpload() {
  const btn = document.getElementById('uploadbtn'); if (!btn) return;
  btn.onclick = async (e) => {
    e.preventDefault();
    const input = document.getElementById('files');
    if (!input.files.length) return;
    const fd = new FormData();
    fd.append('code', S.code);
    [...input.files].forEach((f) => fd.append('files', f));
    btn.disabled = true; btn.textContent = 'Uploading...';
    try {
      const res = await fetch('/api/intake/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      S.files = data.files || S.files;
      document.getElementById('uploaded').innerHTML = S.files.map((f) => `<li>${esc(f.original || 'file')}</li>`).join('');
      input.value = '';
    } catch (err) { document.getElementById('serr').textContent = err.message; }
    btn.disabled = false; btn.textContent = 'Upload selected';
  };
}

// ---------- review + submit ----------
function renderReview() {
  const rows = [];
  for (const sec of S.form) {
    const items = sec.fields.map((f) => {
      let v = S.answers[f.key];
      if (Array.isArray(v)) v = v.filter(Boolean).join(', ');
      if (!v || !String(v).trim()) return '';
      return `<div class="rev-item"><span class="muted small">${esc(f.label)}</span><div>${esc(v)}</div></div>`;
    }).filter(Boolean).join('');
    if (items) rows.push(`<h3>${esc(sec.section)}</h3>${items}`);
  }
  root.innerHTML = `
    <div class="card quiz-card">
      ${brand()}
      <h1>Review your brief</h1>
      <p class="muted">Check everything below. You can go back to edit, or submit when ready.</p>
      <div class="review">${rows.join('') || '<p class="muted">Nothing filled in yet.</p>'}</div>
      <div class="err" id="rerr"></div>
      <div class="row" style="margin-top:18px">
        <button id="back">Back to edit</button>
        <div class="grow"></div>
        <button class="primary" id="submit">Submit brief</button>
      </div>
    </div>`;
  document.getElementById('back').onclick = () => { S.step = S.form.length - 1; renderStep(); window.scrollTo(0, 0); };
  document.getElementById('submit').onclick = async () => {
    try {
      await api('/api/intake/submit', { code: S.code, answers: S.answers });
      try { localStorage.removeItem(draftKey()); } catch {}
      renderThanks();
    } catch (e) { document.getElementById('rerr').textContent = e.message; }
  };
}

function renderThanks() {
  root.innerHTML = `
    <div class="card quiz-card quiz-narrow" style="text-align:center">
      ${brand()}
      <h1>Thank you</h1>
      <p class="muted">We have received your brief for ${esc(S.company)}. Our team will start building your website and will be in touch shortly. You can close this page.</p>
    </div>`;
}

// boot: prefill code from ?code= if present
const params = new URLSearchParams(location.search);
const pre = params.get('code');
if (pre) {
  renderCode();
  document.getElementById('code').value = pre.toUpperCase();
  document.getElementById('go').click();
} else {
  renderCode();
}
