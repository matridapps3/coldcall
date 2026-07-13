// Website-intake: public code-gated quiz (start/submit/upload/approve, no auth)
// + manager code generation, brief viewing, post-sale lifecycle, and file access.
import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { requireRole, requireAuth } from '../lib/auth.js';
import { FORM, buildBrief, buildPrompt } from '../lib/intake-form.js';
import { bucketOf } from '../lib/fulfillment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'uploads');

const router = Router();

// In-memory upload then write to disk under uploads/<codeId>/. Images + PDF only.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/|^application\/pdf$/.test(file.mimetype)),
});

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
function genCode(db) {
  for (let attempt = 0; attempt < 20; attempt++) {
    let c = '';
    for (let i = 0; i < 6; i++) c += ALPHABET[crypto.randomInt(ALPHABET.length)];
    if (!db.prepare('SELECT 1 FROM intake_codes WHERE code=?').get(c)) return c;
  }
  throw new Error('could not allocate code');
}
const normCode = (s) => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const filesFor = (db, codeId) => db.prepare('SELECT id, original, size, created_at FROM intake_files WHERE code_id=? ORDER BY id').all(codeId);
// A manager sees every code; a builder sees only the builds assigned to them.
const canSeeCode = (user, row) => user.role === 'manager' || (user.role === 'builder' && row.builder_id === user.id);

// ---------- public (no auth, code-gated) ----------
router.post('/start', (req, res) => {
  const code = normCode(req.body?.code);
  if (!code) return res.status(400).json({ error: 'enter your code' });
  const row = req.app.locals.db.prepare('SELECT * FROM intake_codes WHERE code=?').get(code);
  if (!row) return res.status(404).json({ error: 'That code was not found. Please check and try again.' });
  res.json({
    code: row.code, company: row.company, status: row.status,
    build_stage: row.build_stage, preview_url: row.preview_url, approval: row.approval,
    answers: row.answers ? JSON.parse(row.answers) : {}, form: FORM,
    files: filesFor(req.app.locals.db, row.id),
  });
});

router.post('/submit', (req, res) => {
  const Body = z.object({ code: z.string().min(1), answers: z.record(z.any()) });
  const p = Body.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid submission' });
  const code = normCode(p.data.code);
  const db = req.app.locals.db;
  const row = db.prepare('SELECT * FROM intake_codes WHERE code=?').get(code);
  if (!row) return res.status(404).json({ error: 'code not found' });
  db.prepare("UPDATE intake_codes SET answers=?, status='submitted', submitted_at=datetime('now') WHERE code=?")
    .run(JSON.stringify(p.data.answers), code);
  res.json({ ok: true });
});

// Client uploads logo/photos against their code (saved even before final submit).
router.post('/upload', upload.array('files', 12), (req, res) => {
  const code = normCode(req.body?.code);
  const db = req.app.locals.db;
  const row = db.prepare('SELECT id FROM intake_codes WHERE code=?').get(code);
  if (!row) return res.status(404).json({ error: 'code not found' });
  const dir = path.join(UPLOADS, String(row.id));
  fs.mkdirSync(dir, { recursive: true });
  let count = 0;
  for (const f of req.files || []) {
    const ext = (path.extname(f.originalname) || '').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8);
    const stored = crypto.randomBytes(8).toString('hex') + ext;
    fs.writeFileSync(path.join(dir, stored), f.buffer);
    db.prepare('INSERT INTO intake_files (code_id, stored, original, size) VALUES (?,?,?,?)')
      .run(row.id, stored, String(f.originalname).slice(0, 120), f.size);
    count++;
  }
  res.json({ ok: true, count, files: filesFor(db, row.id) });
});

// Client approves the delivered preview or requests changes.
router.post('/approve', (req, res) => {
  const Body = z.object({ code: z.string().min(1), decision: z.enum(['approved', 'changes']), note: z.string().optional() });
  const p = Body.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid request' });
  const db = req.app.locals.db;
  const row = db.prepare('SELECT id FROM intake_codes WHERE code=?').get(normCode(p.data.code));
  if (!row) return res.status(404).json({ error: 'code not found' });
  db.prepare('UPDATE intake_codes SET approval=?, approval_note=? WHERE id=?').run(p.data.decision, p.data.note || null, row.id);
  res.json({ ok: true });
});

// ---------- manager ----------
router.get('/list', requireRole('manager'), (req, res) => {
  res.json(req.app.locals.db.prepare(`
    SELECT c.id, c.code, c.company, c.status, c.build_stage, c.paid, c.amount, c.approval,
           c.created_at, c.submitted_at, c.lead_id, l.company AS lead_company
    FROM intake_codes c LEFT JOIN leads l ON l.id=c.lead_id
    ORDER BY c.created_at DESC LIMIT 500`).all());
});

router.post('/create', requireRole('manager'), (req, res) => {
  const Body = z.object({ company: z.string().min(1), lead_id: z.number().int().nullable().optional() });
  const p = Body.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'company name required' });
  const db = req.app.locals.db;
  // Guard the leads FK so a bad lead_id is a clean 400, not a 500.
  if (p.data.lead_id != null && !db.prepare('SELECT 1 FROM leads WHERE id=?').get(p.data.lead_id))
    return res.status(400).json({ error: 'unknown lead' });
  const code = genCode(db);
  const info = db.prepare('INSERT INTO intake_codes (code, company, lead_id, created_by) VALUES (?,?,?,?)')
    .run(code, p.data.company.trim(), p.data.lead_id ?? null, req.user.id);
  res.json({ id: info.lastInsertRowid, code });
});

router.get('/wonleads', requireRole('manager'), (req, res) => {
  res.json(req.app.locals.db.prepare(`
    SELECT l.id, l.company FROM leads l
    WHERE l.status='won' AND l.id NOT IN (SELECT lead_id FROM intake_codes WHERE lead_id IS NOT NULL)
    ORDER BY l.company LIMIT 300`).all());
});

router.get('/view/:code', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const row = db.prepare('SELECT * FROM intake_codes WHERE code=?').get(normCode(req.params.code));
  if (!row) return res.status(404).json({ error: 'not found' });
  if (!canSeeCode(req.user, row)) return res.status(403).json({ error: 'forbidden' });
  const answers = row.answers ? JSON.parse(row.answers) : {};
  const builder = row.builder_id ? db.prepare('SELECT name FROM users WHERE id=?').get(row.builder_id) : null;
  res.json({
    code: row.code, company: row.company, status: row.status, submitted_at: row.submitted_at,
    build_stage: row.build_stage, paid: !!row.paid, amount: row.amount,
    preview_url: row.preview_url, approval: row.approval, approval_note: row.approval_note,
    builder_id: row.builder_id, builder_name: builder ? builder.name : null,
    answers, form: FORM, files: filesFor(db, row.id),
    brief: buildBrief(FORM, answers, row.company),
    prompt: buildPrompt(FORM, answers, row.company),
  });
});

// Lifecycle update. Manager sets any field; the assigned builder may only move
// the build to building/delivered and paste the preview link.
router.patch('/:code', requireAuth, (req, res) => {
  const Upd = z.object({
    build_stage: z.enum(['building', 'delivered', 'live']).nullable().optional(),
    paid: z.boolean().optional(),
    amount: z.number().int().min(0).nullable().optional(),
    preview_url: z.string().optional(),
  });
  const p = Upd.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid update' });
  const db = req.app.locals.db;
  const row = db.prepare('SELECT * FROM intake_codes WHERE code=?').get(normCode(req.params.code));
  if (!row) return res.status(404).json({ error: 'not found' });
  if (!canSeeCode(req.user, row)) return res.status(403).json({ error: 'forbidden' });
  const d = p.data;
  if (req.user.role !== 'manager') {
    if (d.paid !== undefined || d.amount !== undefined)
      return res.status(403).json({ error: 'only a manager can record payment' });
    if (d.build_stage !== undefined && !['building', 'delivered'].includes(d.build_stage))
      return res.status(403).json({ error: 'a builder can only mark a build delivered' });
  }
  if (d.build_stage !== undefined) {
    db.prepare('UPDATE intake_codes SET build_stage=? WHERE id=?').run(d.build_stage, row.id);
    // Stamp delivery the first time it reaches 'delivered' — anchors approval aging.
    if (d.build_stage === 'delivered' && !row.delivered_at)
      db.prepare("UPDATE intake_codes SET delivered_at=datetime('now') WHERE id=?").run(row.id);
  }
  if (d.paid !== undefined) db.prepare('UPDATE intake_codes SET paid=? WHERE id=?').run(d.paid ? 1 : 0, row.id);
  if (d.amount !== undefined) db.prepare('UPDATE intake_codes SET amount=? WHERE id=?').run(d.amount, row.id);
  if (d.preview_url !== undefined) db.prepare('UPDATE intake_codes SET preview_url=? WHERE id=?').run(d.preview_url || null, row.id);
  res.json({ ok: true });
});

// Assign (or unassign) a builder to a code. Assigning a brief that's in moves it
// into 'building' so it leaves the "to build" column immediately.
router.post('/:code/assign', requireRole('manager'), (req, res) => {
  const builderId = req.body?.builder_id == null ? null : Number(req.body.builder_id);
  const db = req.app.locals.db;
  const row = db.prepare('SELECT * FROM intake_codes WHERE code=?').get(normCode(req.params.code));
  if (!row) return res.status(404).json({ error: 'not found' });
  if (builderId != null) {
    const b = db.prepare("SELECT 1 FROM users WHERE id=? AND role='builder'").get(builderId);
    if (!b) return res.status(400).json({ error: 'not a builder' });
    db.prepare("UPDATE intake_codes SET builder_id=?, assigned_at=datetime('now') WHERE id=?").run(builderId, row.id);
    if (row.status === 'submitted' && !row.build_stage)
      db.prepare("UPDATE intake_codes SET build_stage='building' WHERE id=?").run(row.id);
  } else {
    db.prepare('UPDATE intake_codes SET builder_id=NULL, assigned_at=NULL WHERE id=?').run(row.id);
  }
  res.json({ ok: true });
});

// Post-sale chase: nudge the client when the ball is in their court (brief not
// filled, or preview awaiting approval). Returns a ready WhatsApp message + a
// click-to-chat link (present-only, no API) and records that we nudged.
router.post('/:code/nudge', requireRole('manager'), (req, res) => {
  const db = req.app.locals.db;
  const row = db.prepare('SELECT c.*, l.phone_norm AS phone_norm FROM intake_codes c LEFT JOIN leads l ON l.id=c.lead_id WHERE c.code=?')
    .get(normCode(req.params.code));
  if (!row) return res.status(404).json({ error: 'not found' });
  const bucket = bucketOf(row);
  const base = (process.env.PUBLIC_BASE_URL || req.get('origin') || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  let message;
  if (bucket === 'awaiting_assets') {
    message = `Namaste! ${row.company} ki website banane ke liye bas aapki 2-minute ki detail chahiye — naam, photos, aur services. Yahan bhar dijiye: ${base}/quiz?code=${row.code}`;
  } else if (bucket === 'awaiting_approval' || bucket === 'changes') {
    message = `Namaste! Aapki website ka preview taiyaar hai. Ek baar dekh lijiye aur approve/change yahin bata dijiye: ${base}/review?code=${row.code}`;
  } else {
    return res.status(409).json({ error: 'nothing to nudge for at this stage' });
  }
  db.prepare("UPDATE intake_codes SET last_nudge_at=datetime('now'), nudge_count=nudge_count+1 WHERE id=?").run(row.id);
  const wa_url = row.phone_norm ? `https://wa.me/${row.phone_norm}?text=${encodeURIComponent(message)}` : null;
  res.json({ ok: true, message, wa_url, nudge_count: (row.nudge_count || 0) + 1 });
});

// Download a client-uploaded asset (manager only). Path is built from the DB row,
// not user input, so no traversal risk.
router.get('/file/:id', requireRole('manager'), (req, res) => {
  const f = req.app.locals.db.prepare('SELECT * FROM intake_files WHERE id=?').get(Number(req.params.id));
  if (!f) return res.status(404).end();
  res.download(path.join(UPLOADS, String(f.code_id), f.stored), f.original || f.stored);
});

export default router;
