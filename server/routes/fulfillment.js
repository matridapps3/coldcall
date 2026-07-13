// Fulfillment: the post-'yes' assembly line. Manager sees the whole board
// (every intake code bucketed by station, with aging); a builder sees only the
// builds assigned to them. Assignment, stage transitions, and client nudges live
// in routes/intake.js (they mutate intake_codes) — this file is the read models.
import { Router } from 'express';
import { requireRole } from '../lib/auth.js';
import { BUCKETS, bucketOf, ageAnchor } from '../lib/fulfillment.js';

const router = Router();

// SQLite datetime('now') is UTC; treat the stamp as UTC and return whole days.
function ageDays(stamp) {
  if (!stamp) return null;
  const t = Date.parse(String(stamp).replace(' ', 'T') + 'Z');
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

const boardRow = (c) => ({
  code: c.code, company: c.company, lead_id: c.lead_id, phone: c.phone,
  status: c.status, build_stage: c.build_stage, approval: c.approval, approval_note: c.approval_note,
  paid: !!c.paid, amount: c.amount, preview_url: c.preview_url,
  builder_id: c.builder_id, builder_name: c.builder_name,
  nudge_count: c.nudge_count || 0, last_nudge_at: c.last_nudge_at,
  bucket: bucketOf(c), age_days: ageDays(ageAnchor(c)),
});

// Manager throughput board: all codes grouped into stations, plus builders for
// the assign dropdown and a couple of headline metrics.
router.get('/board', requireRole('manager'), (req, res) => {
  const db = req.app.locals.db;
  const codes = db.prepare(`
    SELECT c.*, l.phone AS phone, b.name AS builder_name
    FROM intake_codes c
    LEFT JOIN leads l ON l.id = c.lead_id
    LEFT JOIN users b ON b.id = c.builder_id
    ORDER BY c.created_at DESC LIMIT 1000`).all().map(boardRow);
  const columns = BUCKETS.map((b) => ({ ...b, items: codes.filter((c) => c.bucket === b.key) }));
  const counts = Object.fromEntries(BUCKETS.map((b) => [b.key, 0]));
  for (const c of codes) counts[c.bucket]++;
  const builders = db.prepare("SELECT id, name FROM users WHERE role='builder' AND active=1 ORDER BY name").all();
  const unpaid = codes.filter((c) => (c.bucket === 'approved' || c.bucket === 'live') && !c.paid).length;
  const demosPending = db.prepare("SELECT COUNT(*) AS n FROM leads WHERE demo_status='requested'").get().n;
  res.json({ columns, counts, builders, metrics: { total: codes.length, unpaid, demos_pending: demosPending } });
});

// Builder queue: the active builds assigned to me (anything not yet live).
router.get('/mine', requireRole('builder'), (req, res) => {
  const db = req.app.locals.db;
  const rows = db.prepare(`
    SELECT code, company, status, build_stage, preview_url, assigned_at, submitted_at, approval, approval_note
    FROM intake_codes
    WHERE builder_id = ? AND (build_stage IS NULL OR build_stage != 'live')
    ORDER BY assigned_at`).all(req.user.id).map((c) => ({ ...c, bucket: bucketOf(c), age_days: ageDays(c.assigned_at) }));
  res.json({ builds: rows });
});

// ---- demo builds: pre-sale, routed through the shared builder claim queue ----
// Demos live on leads (not intake_codes). A caller taps "Generate demo" → the lead
// parks demo_status='requested' with a build prompt; any builder can pull it, build
// it, and paste the deployed link, flipping it to 'ready' for the caller to send.
// demo_builder_id is a SOFT claim so two builders don't collide — it never blocks
// delivery, it just signals "someone's on it".
router.get('/demos', requireRole('builder'), (req, res) => {
  const db = req.app.locals.db;
  const rows = db.prepare(`
    SELECT l.id, l.company, l.demo_prompt, l.demo_requested_at, l.demo_builder_id,
           m.name AS mode_name, b.name AS builder_name
    FROM leads l
    LEFT JOIN modes m ON m.id = l.mode_id
    LEFT JOIN users b ON b.id = l.demo_builder_id
    WHERE l.demo_status='requested'
    ORDER BY (l.demo_builder_id IS NOT NULL), l.demo_requested_at`).all()
    .map((r) => ({ ...r, mine: r.demo_builder_id === req.user.id, age_days: ageDays(r.demo_requested_at) }));
  res.json({ demos: rows });
});

router.post('/demos/:leadId/claim', requireRole('builder'), (req, res) => {
  const db = req.app.locals.db;
  const lead = db.prepare('SELECT id, demo_status, demo_builder_id FROM leads WHERE id=?').get(Number(req.params.leadId));
  if (!lead) return res.status(404).json({ error: 'lead not found' });
  if (lead.demo_status !== 'requested') return res.status(409).json({ error: 'no demo is pending for this lead' });
  if (lead.demo_builder_id && lead.demo_builder_id !== req.user.id) {
    const who = db.prepare('SELECT name FROM users WHERE id=?').get(lead.demo_builder_id);
    return res.status(409).json({ error: `already claimed by ${who ? who.name : 'another builder'}` });
  }
  db.prepare('UPDATE leads SET demo_builder_id=? WHERE id=?').run(req.user.id, lead.id);
  res.json({ ok: true });
});

router.post('/demos/:leadId/link', requireRole('builder'), (req, res) => {
  const url = String(req.body?.url || '').trim();
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'enter the full demo link (https://...)' });
  const db = req.app.locals.db;
  const lead = db.prepare('SELECT id, demo_status FROM leads WHERE id=?').get(Number(req.params.leadId));
  if (!lead) return res.status(404).json({ error: 'lead not found' });
  if (lead.demo_status !== 'requested') return res.status(409).json({ error: 'no demo is pending for this lead' });
  // Whoever delivers gets credited as the builder if nobody had claimed it.
  db.prepare("UPDATE leads SET demo_status='ready', demo_url=?, demo_ready_at=datetime('now'), demo_builder_id=COALESCE(demo_builder_id, ?) WHERE id=?")
    .run(url, req.user.id, lead.id);
  res.json({ ok: true });
});

export default router;
