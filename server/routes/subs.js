// Recurring revenue: annual care plans + domain renewals sold alongside a build.
// Manager-only. Every active row is money due next year — the "due" worklist is
// how the factory actually collects it instead of leaving it on the floor.
import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../lib/auth.js';
import { nextRenewal, renewalState, daysUntil } from '../lib/fulfillment.js';

const router = Router();
router.use(requireRole('manager'));

const todayISO = () => new Date().toISOString().slice(0, 10);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

const KIND = z.enum(['care_basic', 'care_plus', 'domain', 'other']);
const New = z.object({
  company: z.string().min(1),
  kind: KIND,
  amount: z.number().int().min(0),
  label: z.string().optional(),
  renews_at: z.string().optional(),
  started_at: z.string().optional(),
  lead_id: z.number().int().nullable().optional(),
  intake_id: z.number().int().nullable().optional(),
  note: z.string().optional(),
});

const decorate = (s) => ({ ...s, days_left: daysUntil(s.renews_at, todayISO()), state: renewalState(s.renews_at, todayISO()) });

// All subscriptions, optionally filtered by status. Soonest renewal first.
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const status = req.query.status;
  const rows = (status
    ? db.prepare('SELECT * FROM subscriptions WHERE status=? ORDER BY renews_at').all(String(status))
    : db.prepare('SELECT * FROM subscriptions ORDER BY renews_at').all()).map(decorate);
  const active = rows.filter((r) => r.status === 'active');
  res.json({ subs: rows, arr: active.reduce((s, r) => s + r.amount, 0) }); // arr = annual recurring revenue
});

// The chase list: active subs already overdue or renewing within `days`.
router.get('/due', (req, res) => {
  const days = Math.max(0, Math.min(365, Number(req.query.days) || 30));
  const cutoff = nextNDays(days);
  const rows = req.app.locals.db
    .prepare("SELECT * FROM subscriptions WHERE status='active' AND renews_at <= ? ORDER BY renews_at")
    .all(cutoff).map(decorate);
  res.json({ due: rows });
});

router.post('/', (req, res) => {
  const p = New.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'company, kind, amount required' });
  const db = req.app.locals.db;
  const d = p.data;
  if (d.renews_at && !isDate(d.renews_at)) return res.status(400).json({ error: 'renews_at must be YYYY-MM-DD' });
  if (d.started_at && !isDate(d.started_at)) return res.status(400).json({ error: 'started_at must be YYYY-MM-DD' });
  // Guard the FKs so a bad reference is a clean 400, not a 500.
  if (d.lead_id != null && !db.prepare('SELECT 1 FROM leads WHERE id=?').get(d.lead_id))
    return res.status(400).json({ error: 'unknown lead' });
  if (d.intake_id != null && !db.prepare('SELECT 1 FROM intake_codes WHERE id=?').get(d.intake_id))
    return res.status(400).json({ error: 'unknown intake code' });
  const started = d.started_at || todayISO();
  const renews = d.renews_at || nextRenewal(started);
  const info = db.prepare(`INSERT INTO subscriptions
      (lead_id, intake_id, company, kind, label, amount, started_at, renews_at, note, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(d.lead_id ?? null, d.intake_id ?? null, d.company.trim(), d.kind, d.label || null, d.amount, started, renews, d.note || null, req.user.id);
  res.json({ id: info.lastInsertRowid, renews_at: renews });
});

const Patch = z.object({
  status: z.enum(['active', 'lapsed', 'cancelled']).optional(),
  amount: z.number().int().min(0).optional(),
  renews_at: z.string().optional(),
  label: z.string().optional(),
  note: z.string().optional(),
});
router.patch('/:id', (req, res) => {
  const p = Patch.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid update' });
  const db = req.app.locals.db;
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM subscriptions WHERE id=?').get(id)) return res.status(404).json({ error: 'not found' });
  const d = p.data;
  if (d.renews_at !== undefined && !isDate(d.renews_at)) return res.status(400).json({ error: 'renews_at must be YYYY-MM-DD' });
  for (const f of ['status', 'amount', 'renews_at', 'label', 'note']) {
    if (d[f] !== undefined) db.prepare(`UPDATE subscriptions SET ${f}=? WHERE id=?`).run(d[f], id);
  }
  res.json({ ok: true });
});

// Mark renewed: advance one year from the later of today or the current due date
// (so a late renewal doesn't shorten the next term), and re-activate.
router.post('/:id/renew', (req, res) => {
  const db = req.app.locals.db;
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM subscriptions WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const from = row.renews_at > todayISO() ? row.renews_at : todayISO();
  const next = nextRenewal(from);
  db.prepare("UPDATE subscriptions SET renews_at=?, last_renewed_at=?, status='active' WHERE id=?").run(next, todayISO(), id);
  res.json({ ok: true, renews_at: next });
});

router.delete('/:id', (req, res) => {
  req.app.locals.db.prepare('DELETE FROM subscriptions WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

// today + n days, as YYYY-MM-DD (UTC).
function nextNDays(n) {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

export default router;
