// Manager-only account management for callers and lead-adders.
import { Router } from 'express';
import { z } from 'zod';
import { requireRole, hashPassword } from '../lib/auth.js';

const router = Router();
router.use(requireRole('manager'));

const NewUser = z.object({
  username: z.string().min(1),
  password: z.string().min(4),
  name: z.string().min(1),
  role: z.enum(['adder', 'caller', 'manager', 'builder']),
});

router.get('/', (req, res) => {
  const rows = req.app.locals.db
    .prepare('SELECT id, username, name, role, active, created_at FROM users ORDER BY role, name')
    .all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const p = NewUser.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid user', detail: p.error.issues });
  const db = req.app.locals.db;
  try {
    const info = db
      .prepare('INSERT INTO users (username, password_hash, role, name) VALUES (?,?,?,?)')
      .run(p.data.username, hashPassword(p.data.password), p.data.role, p.data.name);
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'username taken' });
    throw e;
  }
});

const Patch = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
  password: z.string().min(4).optional(),
});

router.patch('/:id', (req, res) => {
  const p = Patch.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'invalid patch' });
  const db = req.app.locals.db;
  const id = Number(req.params.id);
  if (p.data.name != null) db.prepare('UPDATE users SET name=? WHERE id=?').run(p.data.name, id);
  if (p.data.active != null) db.prepare('UPDATE users SET active=? WHERE id=?').run(p.data.active ? 1 : 0, id);
  if (p.data.password != null) db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(p.data.password), id);
  res.json({ ok: true });
});

export default router;
