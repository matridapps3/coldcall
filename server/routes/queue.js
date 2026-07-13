// Caller work loop: claim next lead, see current work, log an outcome, callbacks.
import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { requireRole } from '../lib/auth.js';
import { render, leadVars } from '../lib/render.js';
import { waLink } from '../lib/phone.js';
import { applyOutcome, OUTCOMES, OUTCOME_LABELS, resolveAction } from '../lib/sequence.js';
import { claimNext } from '../lib/claim.js';
import { buildDemoPrompt, buildDemoMessage } from '../lib/demo.js';
import { assessWorth } from '../lib/worth.js';

const router = Router();
router.use(requireRole('caller', 'manager'));

const today = () => new Date().toISOString().slice(0, 10);

// Lead-heat: score a lead's demonstrated intent so the caller knows whether it's
// worth spending a (dev-built) demo on. Pulls the lead's own call outcomes + reply
// + whether it took a WhatsApp, then defers to the transparent rules in worth.js.
function computeWorth(db, lead) {
  const outcomes = db.prepare('SELECT outcome FROM call_logs WHERE lead_id=?').all(lead.id).map((r) => r.outcome);
  const messaged = !!db.prepare('SELECT 1 FROM template_sends WHERE lead_id=? LIMIT 1').get(lead.id);
  return assessWorth({ outcomes, replied: !!lead.replied_at, messaged });
}

// Assemble everything the caller needs to work one lead: script(s), the current
// step, and (for whatsapp steps) the rendered message + wa.me link.
function buildWork(db, lead, callerName) {
  const mode = db.prepare('SELECT * FROM modes WHERE id=?').get(lead.mode_id);
  const scripts = db.prepare('SELECT * FROM scripts WHERE mode_id=? ORDER BY sort, id').all(lead.mode_id);
  const templates = db.prepare('SELECT * FROM templates WHERE mode_id=? ORDER BY sort, id').all(lead.mode_id);
  const steps = db.prepare('SELECT * FROM sequence_steps WHERE mode_id=? ORDER BY step_no').all(lead.mode_id);
  const step = steps.find((s) => s.step_no === lead.step_no) || steps[0] || null;
  const vars = leadVars(lead, callerName);

  // Every template, pre-rendered with a ready wa.me link. The caller sends the
  // step's own message on a WhatsApp step, but can also fire any of these on
  // demand when a prospect says "send me the details / a sample".
  const messages = templates.map((t) => {
    const body = render(t.body, vars);
    return { id: t.id, title: t.title, body, whatsapp_url: waLink(lead.phone_norm, body) };
  });
  const stepMessage = step && step.template_id ? messages.find((m) => m.id === step.template_id) : null;

  const rules = {};
  if (step) for (const r of db.prepare('SELECT outcome, action FROM step_rules WHERE step_id=?').all(step.id)) rules[r.outcome] = r.action;

  const outcomes = OUTCOMES.map((o) => ({ value: o, label: OUTCOME_LABELS[o], action: resolveAction(rules, o) }));
  const scriptsRendered = scripts.map((s) => ({ ...s, body: render(s.body, vars) }));

  // Live call-navigator: nodes with say-text rendered, options carry branch
  // target / outcome / template id (mapped to a message in `messages`).
  const flowNodes = db.prepare('SELECT * FROM flow_nodes WHERE mode_id=? ORDER BY sort, id').all(lead.mode_id);
  let flow = null;
  if (flowNodes.length) {
    const entry = flowNodes.find((n) => n.is_entry) || flowNodes[0];
    const nodes = flowNodes.map((n) => ({
      id: n.id, title: n.title, say: render(n.say, vars),
      options: db.prepare('SELECT id, label, next_node_id, outcome, template_id, gen_demo FROM flow_options WHERE node_id=? ORDER BY sort, id').all(n.id),
    }));
    flow = { entry_id: entry.id, nodes };
  }

  // Demo workflow: when a demo link is back, prepare the ready-to-send message.
  let demo_message = null, demo_url = null;
  if (lead.demo_status === 'ready' && lead.demo_url) {
    demo_url = lead.demo_url;
    const body = buildDemoMessage(lead.company, lead.demo_url, callerName);
    demo_message = { body, whatsapp_url: waLink(lead.phone_norm, body) };
  }

  return {
    lead, mode_name: mode?.name, step,
    template_title: stepMessage?.title || null,
    message: stepMessage?.body || null,
    whatsapp_url: stepMessage?.whatsapp_url || null,
    scripts: scriptsRendered, messages, outcomes, flow,
    total_steps: steps.length,
    demo_status: lead.demo_status || null,
    demo_prompt: lead.demo_status === 'requested' ? lead.demo_prompt : null,
    demo_message,
    worth: computeWorth(db, lead),
  };
}

// Claim work. Prefer my own due lead; else pull the oldest pool lead in the mode.
router.post('/next', (req, res) => {
  const mode_id = Number(req.body?.mode_id);
  if (!mode_id) return res.status(400).json({ error: 'mode_id required' });
  const db = req.app.locals.db;
  const lead = claimNext(db, req.user.id, mode_id, today());
  if (!lead) return res.json({ empty: true });
  res.json(buildWork(db, lead, req.user.name));
});

// What I'm currently on (does not pull from pool) — for page reloads.
router.get('/current', (req, res) => {
  const mode_id = Number(req.query.mode_id);
  if (!mode_id) return res.status(400).json({ error: 'mode_id required' });
  const db = req.app.locals.db;
  const lead = db.prepare(
    `SELECT * FROM leads WHERE owner_id=? AND mode_id=? AND status='active'
       AND (next_due IS NULL OR next_due <= ?) ORDER BY next_due, id LIMIT 1`
  ).get(req.user.id, mode_id, today());
  if (!lead) return res.json({ empty: true });
  res.json(buildWork(db, lead, req.user.name));
});

// The caller's workspace: leads due now (mine), upcoming scheduled (mine), the
// pool count available to claim, and how many calls I've logged today.
router.get('/list', (req, res) => {
  const mode_id = Number(req.query.mode_id);
  if (!mode_id) return res.status(400).json({ error: 'mode_id required' });
  const db = req.app.locals.db;
  const uid = req.user.id;
  const t = today();
  const steps = db.prepare('SELECT COUNT(*) AS n FROM sequence_steps WHERE mode_id=?').get(mode_id).n;
  const enrich = (l) => ({
    ...l, total_steps: steps,
    late: l.next_due && l.next_due < t,
    last_outcome: db.prepare('SELECT outcome FROM call_logs WHERE lead_id=? ORDER BY id DESC LIMIT 1').get(l.id)?.outcome || null,
    step_title: db.prepare('SELECT title FROM sequence_steps WHERE mode_id=? AND step_no=?').get(mode_id, l.step_no)?.title || null,
    worth: computeWorth(db, l),
  });
  const cols = 'id, company, phone, step_no, next_due, callback_time, replied_at, demo_status';
  const mine = "owner_id=? AND mode_id=? AND status='active'";
  // Replied leads (worked first), then leads waiting on / ready to send a demo,
  // then the normal due queue, then upcoming scheduled. A lead sits in exactly one.
  const hot = db.prepare(
    `SELECT ${cols} FROM leads WHERE ${mine} AND replied_at IS NOT NULL
      ORDER BY replied_at DESC LIMIT 200`).all(uid, mode_id).map(enrich);
  const demo = db.prepare(
    `SELECT ${cols} FROM leads WHERE ${mine} AND replied_at IS NULL AND demo_status IN ('requested','ready')
      ORDER BY CASE demo_status WHEN 'ready' THEN 0 ELSE 1 END, demo_requested_at LIMIT 200`).all(uid, mode_id).map(enrich);
  const due = db.prepare(
    `SELECT ${cols} FROM leads WHERE ${mine} AND replied_at IS NULL
       AND (demo_status IS NULL OR demo_status='sent') AND (next_due IS NULL OR next_due <= ?)
      ORDER BY next_due, callback_time IS NULL, callback_time, id LIMIT 200`).all(uid, mode_id, t).map(enrich);
  // Ghosts: engaged (got a WhatsApp) but silent (no reply, never turned interested),
  // no demo yet, and not currently due. The reactivation pile: build them a demo.
  const engagedSilent = "EXISTS (SELECT 1 FROM template_sends s WHERE s.lead_id=leads.id) "
    + "AND NOT EXISTS (SELECT 1 FROM call_logs c WHERE c.lead_id=leads.id AND c.outcome IN ('interested','meeting_booked'))";
  const ghosts = db.prepare(
    `SELECT ${cols} FROM leads WHERE ${mine} AND replied_at IS NULL AND demo_status IS NULL
       AND (next_due IS NULL OR next_due > ?) AND ${engagedSilent}
      ORDER BY next_due, id LIMIT 200`).all(uid, mode_id, t).map(enrich);
  const upcoming = db.prepare(
    `SELECT ${cols} FROM leads WHERE ${mine} AND replied_at IS NULL
       AND (demo_status IS NULL OR demo_status='sent') AND next_due > ? AND NOT (${engagedSilent})
      ORDER BY next_due, callback_time, id LIMIT 200`).all(uid, mode_id, t).map(enrich);
  const pool_count = db.prepare("SELECT COUNT(*) AS n FROM leads WHERE mode_id=? AND status='pool'").get(mode_id).n;
  const done_today = db.prepare(
    `SELECT COUNT(*) AS n FROM call_logs WHERE user_id=? AND substr(created_at,1,10)=?`).get(uid, t).n;
  res.json({ hot, demo, due, ghosts, upcoming, pool_count, done_today });
});

// Load a specific lead I own (no pool claim) into the work pane.
router.get('/lead/:id', (req, res) => {
  const db = req.app.locals.db;
  const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(Number(req.params.id));
  if (!lead) return res.status(404).json({ error: 'no such lead' });
  if (lead.owner_id !== req.user.id && req.user.role !== 'manager') return res.status(403).json({ error: 'not your lead' });
  res.json(buildWork(db, lead, req.user.name));
});

// Past call log for a lead, so the caller sees prior conversations on a callback.
router.get('/history/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = db.prepare(
    `SELECT c.step_no, c.outcome, c.note, c.created_at, u.name AS user_name
       FROM call_logs c LEFT JOIN users u ON u.id=c.user_id
      WHERE c.lead_id=? ORDER BY c.id DESC LIMIT 50`).all(Number(req.params.id));
  res.json(rows);
});

// Helper: ownership guard for lead-scoped actions.
function ownedLead(req, res) {
  const lead = req.app.locals.db.prepare('SELECT * FROM leads WHERE id=?').get(Number(req.body?.lead_id));
  if (!lead) { res.status(404).json({ error: 'no such lead' }); return null; }
  if (lead.owner_id !== req.user.id && req.user.role !== 'manager') { res.status(403).json({ error: 'not your lead' }); return null; }
  return lead;
}

// Personalized demo: generate the build prompt, park the lead in the demo lane.
router.post('/demo/request', (req, res) => {
  const lead = ownedLead(req, res); if (!lead) return;
  // Don't clobber an in-flight demo (would wipe a returned link). Re-request only
  // allowed once the previous one was sent (a genuine re-demo) or never started.
  if (lead.demo_status === 'requested' || lead.demo_status === 'ready')
    return res.status(409).json({ error: 'a demo is already in progress for this lead' });
  const db = req.app.locals.db;
  const modeName = db.prepare('SELECT name FROM modes WHERE id=?').get(lead.mode_id)?.name;
  const prompt = buildDemoPrompt(lead.company, modeName, { phone: lead.phone });
  // Start every demo unclaimed: clear any builder attribution from a prior demo
  // so the fresh request shows up as up-for-grabs in the builder claim queue.
  db.prepare("UPDATE leads SET demo_status='requested', demo_prompt=?, demo_requested_at=datetime('now'), demo_url=NULL, demo_builder_id=NULL, demo_ready_at=NULL WHERE id=?")
    .run(prompt, lead.id);
  res.json({ ok: true, prompt });
});

// Caller pastes the deployed Vercel link the developer sent back.
router.post('/demo/link', (req, res) => {
  const lead = ownedLead(req, res); if (!lead) return;
  const url = String(req.body?.url || '').trim();
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'enter the full demo link (https://...)' });
  // A link only makes sense for a demo that was requested (or is being re-pasted).
  if (lead.demo_status !== 'requested' && lead.demo_status !== 'ready')
    return res.status(409).json({ error: 'no demo was requested for this lead' });
  req.app.locals.db.prepare("UPDATE leads SET demo_status='ready', demo_url=? WHERE id=?").run(url, lead.id);
  res.json({ ok: true });
});

// Abandon a demo that never came back (or was a mistake): clear the demo state so
// the lead drops back into the normal queue at its current step. No dead-ends.
router.post('/demo/cancel', (req, res) => {
  const lead = ownedLead(req, res); if (!lead) return;
  req.app.locals.db.prepare('UPDATE leads SET demo_status=NULL, demo_prompt=NULL, demo_url=NULL, demo_requested_at=NULL, demo_builder_id=NULL, demo_ready_at=NULL WHERE id=?').run(lead.id);
  res.json({ ok: true });
});

// On close, the client gets an intake QUIZ (colors/content/pages -> build prompt),
// not just a verbal detail-grab. Mint (or reuse) an intake code for this lead so the
// caller can WhatsApp the /quiz?code=... link right at the moment of the win.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
function genIntakeCode(db) {
  for (let i = 0; i < 20; i++) {
    let c = ''; for (let j = 0; j < 6; j++) c += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
    if (!db.prepare('SELECT 1 FROM intake_codes WHERE code=?').get(c)) return c;
  }
  throw new Error('could not allocate code');
}
router.post('/quiz-code', (req, res) => {
  const lead = ownedLead(req, res); if (!lead) return;
  const db = req.app.locals.db;
  let row = db.prepare('SELECT code FROM intake_codes WHERE lead_id=? ORDER BY id DESC LIMIT 1').get(lead.id);
  if (!row) {
    const code = genIntakeCode(db);
    db.prepare('INSERT INTO intake_codes (code, company, lead_id, created_by) VALUES (?,?,?,?)')
      .run(code, lead.company, lead.id, req.user.id);
    row = { code };
  }
  res.json({ code: row.code });
});

// Mark a lead as replied on WhatsApp -> jumps to the hot lane.
router.post('/replied', (req, res) => {
  const lead = ownedLead(req, res); if (!lead) return;
  req.app.locals.db.prepare("UPDATE leads SET replied_at=datetime('now') WHERE id=?").run(lead.id);
  res.json({ ok: true });
});

const Log = z.object({
  lead_id: z.number().int(),
  outcome: z.enum(OUTCOMES),
  note: z.string().optional(),
  callback_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  callback_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

// Log that a WhatsApp template was sent (caller opened the click-to-chat link).
// Present-only signal that powers template performance / A/B in the dashboard.
router.post('/sent', (req, res) => {
  const lead_id = Number(req.body?.lead_id), template_id = Number(req.body?.template_id);
  if (!lead_id || !template_id) return res.status(400).json({ error: 'lead_id and template_id required' });
  const db = req.app.locals.db;
  const lead = db.prepare('SELECT mode_id, owner_id FROM leads WHERE id=?').get(lead_id);
  if (!lead) return res.status(404).json({ error: 'no such lead' });
  if (lead.owner_id !== req.user.id && req.user.role !== 'manager') return res.status(403).json({ error: 'not your lead' });
  db.prepare('INSERT INTO template_sends (template_id, lead_id, user_id, mode_id) VALUES (?,?,?,?)')
    .run(template_id, lead_id, req.user.id, lead.mode_id);
  res.json({ ok: true });
});

router.post('/log', (req, res) => {
  const p = Log.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'lead_id and valid outcome required' });
  const db = req.app.locals.db;
  const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(p.data.lead_id);
  if (!lead) return res.status(404).json({ error: 'no such lead' });
  if (lead.owner_id !== req.user.id && req.user.role !== 'manager')
    return res.status(403).json({ error: 'not your lead' });
  // Terminal leads (won/lost) must not be re-opened by a stray disposition.
  if (lead.status !== 'active') return res.status(409).json({ error: 'lead is already closed' });

  const steps = db.prepare('SELECT * FROM sequence_steps WHERE mode_id=? ORDER BY step_no').all(lead.mode_id);
  const step = steps.find((s) => s.step_no === lead.step_no) || steps[0];
  const rules = {};
  if (step) for (const r of db.prepare('SELECT outcome, action FROM step_rules WHERE step_id=?').all(step.id)) rules[r.outcome] = r.action;

  const patch = applyOutcome(lead, steps, rules, p.data.outcome, {
    today: today(),
    callbackDate: p.data.callback_date,
  });

  const cbTime = patch.action === 'callback' ? (p.data.callback_time || null) : null;
  // Logging an outcome actions the reply and finishes a demo send, so clear both
  // (a 'ready' demo becomes 'sent'; the reply flag is cleared).
  const demoStatus = lead.demo_status === 'ready' ? 'sent' : lead.demo_status;
  const tx = db.transaction(() => {
    db.prepare('UPDATE leads SET status=?, step_no=?, next_due=?, callback_at=?, callback_time=?, replied_at=NULL, demo_status=? WHERE id=?')
      .run(patch.status, patch.step_no, patch.next_due, patch.callback_at, cbTime, demoStatus, lead.id);
    db.prepare('INSERT INTO call_logs (lead_id, user_id, mode_id, step_no, outcome, note) VALUES (?,?,?,?,?,?)')
      .run(lead.id, req.user.id, lead.mode_id, lead.step_no, p.data.outcome, p.data.note || null);
    // "Do not call" suppresses the number globally so it never resurfaces or re-imports.
    if (p.data.outcome === 'dnc' && lead.phone_norm) {
      db.prepare('INSERT OR IGNORE INTO dnc_list (phone_norm, reason) VALUES (?,?)').run(lead.phone_norm, 'requested on call');
    }
  });
  tx();
  res.json({ ok: true, ...patch });
});

// My pending callbacks / scheduled touches.
router.get('/callbacks', (req, res) => {
  const db = req.app.locals.db;
  const rows = db.prepare(
    `SELECT l.id, l.company, l.phone, l.mode_id, l.step_no, l.next_due, l.callback_at
       FROM leads l JOIN modes m ON m.id=l.mode_id
      WHERE l.owner_id=? AND l.status='active' AND l.next_due IS NOT NULL AND m.active=1
      ORDER BY l.next_due, l.id LIMIT 200`
  ).all(req.user.id);
  res.json(rows);
});

export default router;
