// Lead intake (adder + manager) and lead oversight/reassignment (manager).
import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../lib/auth.js';
import { normalize } from '../lib/phone.js';
import { parseLeadCsv } from '../lib/csv.js';

const router = Router();

const isDnc = (db, norm) => !!db.prepare('SELECT 1 FROM dnc_list WHERE phone_norm=?').get(norm);
const exists = (db, modeId, norm) => !!db.prepare('SELECT 1 FROM leads WHERE mode_id=? AND phone_norm=?').get(modeId, norm);
const modeExists = (db, modeId) => !!db.prepare('SELECT 1 FROM modes WHERE id=?').get(modeId);

const One = z.object({ mode_id: z.number().int(), company: z.string().min(1), phone: z.string().min(3) });

// Add a single lead. Adder or manager. Rejects unparseable, on-DNC, or duplicate.
router.post('/', requireRole('adder', 'manager'), (req, res) => {
  const p = One.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'mode_id, company, phone required' });
  const db = req.app.locals.db;
  if (!modeExists(db, p.data.mode_id)) return res.status(400).json({ error: 'unknown mode' });
  const norm = normalize(p.data.phone);
  if (!norm) return res.status(400).json({ error: 'unparseable phone' });
  if (isDnc(db, norm)) return res.status(409).json({ error: 'number is on the do-not-call list' });
  if (exists(db, p.data.mode_id, norm)) return res.status(409).json({ error: 'duplicate: this number is already a lead in this mode' });
  const info = db
    .prepare('INSERT INTO leads (mode_id, company, phone, phone_norm, created_by) VALUES (?,?,?,?,?)')
    .run(p.data.mode_id, p.data.company.trim(), p.data.phone.trim(), norm, req.user.id);
  res.json({ id: info.lastInsertRowid });
});

// Bulk / CSV import. Accepts pasted lines or CSV (with optional header row),
// dedupes within the mode, and suppresses do-not-call numbers.
const Bulk = z.object({ mode_id: z.number().int(), text: z.string().min(1) });
router.post('/bulk', requireRole('adder', 'manager'), (req, res) => {
  const p = Bulk.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'mode_id and text required' });
  const db = req.app.locals.db;
  if (!modeExists(db, p.data.mode_id)) return res.status(400).json({ error: 'unknown mode' });
  const { rows, skipped } = parseLeadCsv(p.data.text);
  const ins = db.prepare('INSERT INTO leads (mode_id, company, phone, phone_norm, created_by) VALUES (?,?,?,?,?)');
  let added = 0, duplicates = 0, suppressed = 0;
  const seen = new Set(); // dedupe within this batch too
  const tx = db.transaction(() => {
    for (const { company, phone } of rows) {
      const norm = normalize(phone);
      if (!norm) { skipped.push(`${company}, ${phone}`); continue; }
      if (isDnc(db, norm)) { suppressed++; continue; }
      if (seen.has(norm) || exists(db, p.data.mode_id, norm)) { duplicates++; continue; }
      seen.add(norm);
      ins.run(p.data.mode_id, company, phone, norm, req.user.id);
      added++;
    }
  });
  tx();
  res.json({ added, duplicates, suppressed, skipped });
});

// ---- do-not-call list (manager) ----
router.get('/dnc', requireRole('manager'), (req, res) => {
  res.json(req.app.locals.db.prepare('SELECT id, phone_norm, reason, created_at FROM dnc_list ORDER BY created_at DESC LIMIT 1000').all());
});
router.post('/dnc', requireRole('manager'), (req, res) => {
  const norm = normalize(req.body?.phone);
  if (!norm) return res.status(400).json({ error: 'valid phone required' });
  req.app.locals.db.prepare('INSERT OR IGNORE INTO dnc_list (phone_norm, reason) VALUES (?,?)').run(norm, req.body?.reason || 'manual');
  // also drop any existing leads for this number
  req.app.locals.db.prepare("UPDATE leads SET status='lost' WHERE phone_norm=? AND status IN ('pool','active')").run(norm);
  res.json({ ok: true, phone_norm: norm });
});
router.delete('/dnc/:id', requireRole('manager'), (req, res) => {
  req.app.locals.db.prepare('DELETE FROM dnc_list WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Manager oversight: filterable lead list with owner + last outcome.
router.get('/', requireRole('manager'), (req, res) => {
  const db = req.app.locals.db;
  const where = [];
  const args = [];
  if (req.query.mode_id) { where.push('l.mode_id=?'); args.push(Number(req.query.mode_id)); }
  if (req.query.status) { where.push('l.status=?'); args.push(String(req.query.status)); }
  const sql = `
    SELECT l.*, u.name AS owner_name,
      (SELECT outcome FROM call_logs c WHERE c.lead_id=l.id ORDER BY c.id DESC LIMIT 1) AS last_outcome
    FROM leads l LEFT JOIN users u ON u.id=l.owner_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY l.created_at DESC LIMIT 500`;
  res.json(db.prepare(sql).all(...args));
});

router.patch('/:id/assign', requireRole('manager'), (req, res) => {
  const ownerId = req.body?.owner_id == null ? null : Number(req.body.owner_id);
  const db = req.app.locals.db;
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM leads WHERE id=?').get(id))
    return res.status(404).json({ error: 'lead not found' });
  // Guard the FK before the UPDATE so a bad owner_id is a clean 400, not a 500.
  if (ownerId != null && !db.prepare('SELECT 1 FROM users WHERE id=?').get(ownerId))
    return res.status(400).json({ error: 'owner not found' });
  // Reassigning a pool lead also activates it for that owner.
  if (ownerId == null) {
    db.prepare("UPDATE leads SET owner_id=NULL, status='pool' WHERE id=?").run(id);
  } else {
    db.prepare("UPDATE leads SET owner_id=?, status=CASE WHEN status='pool' THEN 'active' ELSE status END WHERE id=?")
      .run(ownerId, id);
  }
  res.json({ ok: true });
});

export default router;
