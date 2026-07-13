'use strict';
// Public, code-gated approval page. The client opens their preview, then approves
// or requests changes. Reuses the same intake code as the quiz.

const root = document.getElementById('review');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function api(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

const S = { code: '', company: '' };
const brand = () => `<div class="quiz-brand">SiteBhai</div>`;

function renderCode(err) {
  root.innerHTML = `
    <div class="card quiz-card quiz-narrow">
      ${brand()}
      <h1>Review your website</h1>
      <p class="muted">Enter your code to see your website preview and approve it.</p>
      <label>Your code</label>
      <input id="code" autocapitalize="characters" placeholder="e.g. K7P2QM" style="text-transform:uppercase;font-family:var(--mono);font-size:18px;letter-spacing:2px"/>
      <div class="err" id="cerr">${err ? esc(err) : ''}</div>
      <button class="primary" id="go" style="width:100%;margin-top:10px">Open</button>
    </div>`;
  const go = async () => {
    const code = document.getElementById('code').value.trim().toUpperCase();
    if (!code) return;
    try { const r = await api('/api/intake/start', { code }); S.code = r.code; S.company = r.company; renderReview(r); }
    catch (e) { renderCode(e.message); }
  };
  document.getElementById('go').onclick = go;
  document.getElementById('code').onkeydown = (e) => { if (e.key === 'Enter') go(); };
}

function renderReview(r) {
  if (!r.preview_url) {
    root.innerHTML = `<div class="card quiz-card quiz-narrow" style="text-align:center">${brand()}
      <h1>We are building your website</h1>
      <p class="muted">Your website for ${esc(S.company)} is being built. We will share the preview here shortly. Please check back soon.</p></div>`;
    return;
  }
  if (r.approval === 'approved') {
    root.innerHTML = `<div class="card quiz-card quiz-narrow" style="text-align:center">${brand()}
      <h1>Approved, thank you</h1>
      <p class="muted">You approved your website for ${esc(S.company)}. We are putting it live and will be in touch.</p>
      <a class="btnlink" href="${esc(r.preview_url)}" target="_blank" rel="noopener" style="margin-top:10px">View preview again</a></div>`;
    return;
  }
  root.innerHTML = `
    <div class="card quiz-card">
      ${brand()}
      <h1>Your website is ready to review</h1>
      <p class="muted">Open the preview for ${esc(S.company)}, then approve it or tell us what to change.</p>
      <a class="primary btnlink" href="${esc(r.preview_url)}" target="_blank" rel="noopener" style="margin:6px 0 18px">Open my website preview</a>
      <label>Changes you'd like (optional)</label>
      <textarea id="note" placeholder="e.g. use a different banner photo, fix the phone number" style="min-height:90px"></textarea>
      <div class="err" id="rerr"></div>
      <div class="row" style="margin-top:14px">
        <button id="changes">Request changes</button>
        <div class="grow"></div>
        <button class="primary" id="approve">Approve website</button>
      </div>
    </div>`;
  const submit = async (decision) => {
    try {
      await api('/api/intake/approve', { code: S.code, decision, note: document.getElementById('note').value || undefined });
      const r2 = await api('/api/intake/start', { code: S.code });
      if (decision === 'approved') renderReview(r2);
      else root.innerHTML = `<div class="card quiz-card quiz-narrow" style="text-align:center">${brand()}
        <h1>Thanks, noted</h1><p class="muted">We have your change requests and will update your website, then share the preview again.</p></div>`;
    } catch (e) { document.getElementById('rerr').textContent = e.message; }
  };
  document.getElementById('approve').onclick = () => submit('approved');
  document.getElementById('changes').onclick = () => submit('changes');
}

const pre = new URLSearchParams(location.search).get('code');
renderCode();
if (pre) { document.getElementById('code').value = pre.toUpperCase(); document.getElementById('go').click(); }
