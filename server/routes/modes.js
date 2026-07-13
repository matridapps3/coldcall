// Modes + their bundled scripts, WhatsApp templates, sequence steps, and rules.
//
// Reads are open to any authenticated user (callers need scripts/templates to
// work a lead). Mutations are manager-only.
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../lib/auth.js';
import { OUTCOMES, ACTIONS } from '../lib/sequence.js';

const router = Router();
const mgr = requireRole('manager');

// ---- reads (any role) ----
router.get('/', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const rows = db.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM leads l WHERE l.mode_id=m.id AND l.status='pool')   AS pool_leads,
      (SELECT COUNT(*) FROM leads l WHERE l.mode_id=m.id AND l.status='active') AS active_leads,
      (SELECT COUNT(*) FROM sequence_steps s WHERE s.mode_id=m.id)              AS steps
    FROM modes m ORDER BY m.active DESC, m.name`).all();
  res.json(rows);
});

router.get('/:id', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const id = Number(req.params.id);
  const mode = db.prepare('SELECT * FROM modes WHERE id=?').get(id);
  if (!mode) return res.status(404).json({ error: 'no such mode' });
  const scripts = db.prepare('SELECT * FROM scripts WHERE mode_id=? ORDER BY sort, id').all(id);
  const templates = db.prepare('SELECT * FROM templates WHERE mode_id=? ORDER BY sort, id').all(id);
  const steps = db.prepare('SELECT * FROM sequence_steps WHERE mode_id=? ORDER BY step_no').all(id);
  for (const s of steps) {
    s.rules = db.prepare('SELECT outcome, action FROM step_rules WHERE step_id=?').all(s.id);
  }
  res.json({ ...mode, scripts, templates, steps });
});

// ---- modes ----
router.post('/', mgr, (req, res) => {
  const name = z.string().min(1).safeParse(req.body?.name);
  if (!name.success) return res.status(400).json({ error: 'name required' });
  const info = req.app.locals.db.prepare('INSERT INTO modes (name) VALUES (?)').run(name.data);
  res.json({ id: info.lastInsertRowid });
});

router.patch('/:id', mgr, (req, res) => {
  const db = req.app.locals.db;
  const id = Number(req.params.id);
  if (req.body?.name != null) db.prepare('UPDATE modes SET name=? WHERE id=?').run(String(req.body.name), id);
  if (req.body?.active != null) db.prepare('UPDATE modes SET active=? WHERE id=?').run(req.body.active ? 1 : 0, id);
  res.json({ ok: true });
});

// ---- scripts & templates (same shape) ----
const Content = z.object({ title: z.string().min(1), body: z.string().min(1), sort: z.number().optional() });

for (const kind of ['scripts', 'templates']) {
  router.post(`/:id/${kind}`, mgr, (req, res) => {
    const p = Content.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'title and body required' });
    const info = req.app.locals.db
      .prepare(`INSERT INTO ${kind} (mode_id, title, body, sort) VALUES (?,?,?,?)`)
      .run(Number(req.params.id), p.data.title, p.data.body, p.data.sort || 0);
    res.json({ id: info.lastInsertRowid });
  });
  router.patch(`/:id/${kind}/:cid`, mgr, (req, res) => {
    const db = req.app.locals.db;
    const cid = Number(req.params.cid);
    if (req.body?.title != null) db.prepare(`UPDATE ${kind} SET title=? WHERE id=?`).run(String(req.body.title), cid);
    if (req.body?.body != null) db.prepare(`UPDATE ${kind} SET body=? WHERE id=?`).run(String(req.body.body), cid);
    res.json({ ok: true });
  });
  router.delete(`/:id/${kind}/:cid`, mgr, (req, res) => {
    req.app.locals.db.prepare(`DELETE FROM ${kind} WHERE id=?`).run(Number(req.params.cid));
    res.json({ ok: true });
  });
}

// ---- sequence steps ----
const Step = z.object({
  kind: z.enum(['call', 'whatsapp']),
  title: z.string().min(1),
  template_id: z.number().nullable().optional(),
  day_delay: z.number().int().min(0).optional(),
});

router.post('/:id/steps', mgr, (req, res) => {
  const p = Step.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid step' });
  const db = req.app.locals.db;
  const mode_id = Number(req.params.id);
  const next = (db.prepare('SELECT MAX(step_no) AS m FROM sequence_steps WHERE mode_id=?').get(mode_id).m || 0) + 1;
  const info = db
    .prepare('INSERT INTO sequence_steps (mode_id, step_no, kind, title, template_id, day_delay) VALUES (?,?,?,?,?,?)')
    .run(mode_id, next, p.data.kind, p.data.title, p.data.template_id ?? null, p.data.day_delay ?? 0);
  res.json({ id: info.lastInsertRowid, step_no: next });
});

router.patch('/:id/steps/:sid', mgr, (req, res) => {
  const db = req.app.locals.db;
  const sid = Number(req.params.sid);
  for (const f of ['title', 'kind', 'day_delay', 'template_id']) {
    if (req.body?.[f] !== undefined) db.prepare(`UPDATE sequence_steps SET ${f}=? WHERE id=?`).run(req.body[f], sid);
  }
  res.json({ ok: true });
});

router.delete('/:id/steps/:sid', mgr, (req, res) => {
  req.app.locals.db.prepare('DELETE FROM sequence_steps WHERE id=?').run(Number(req.params.sid));
  res.json({ ok: true });
});

// Replace all per-step outcome→action overrides at once.
const Rules = z.record(z.enum(OUTCOMES), z.enum(ACTIONS));
router.put('/:id/steps/:sid/rules', mgr, (req, res) => {
  const p = Rules.safeParse(req.body || {});
  if (!p.success) return res.status(400).json({ error: 'invalid rules' });
  const db = req.app.locals.db;
  const sid = Number(req.params.sid);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM step_rules WHERE step_id=?').run(sid);
    const ins = db.prepare('INSERT INTO step_rules (step_id, outcome, action) VALUES (?,?,?)');
    for (const [outcome, action] of Object.entries(p.data)) ins.run(sid, outcome, action);
  });
  tx();
  res.json({ ok: true });
});

export default router;
