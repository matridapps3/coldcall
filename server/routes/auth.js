// Login / logout / whoami.
import { Router } from 'express';
import { z } from 'zod';
import { verifyPassword, createSession, destroySession } from '../lib/auth.js';

const router = Router();
const Login = z.object({ username: z.string().min(1), password: z.string().min(1) });

router.post('/login', (req, res) => {
  const p = Login.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'username and password required' });
  const db = req.app.locals.db;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(p.data.username);
  if (!user || !verifyPassword(p.data.password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run(); // prune expired
  const token = createSession(db, user.id);
  const secure = req.secure || req.get('x-forwarded-proto') === 'https' ? ' Secure;' : '';
  res.setHeader('Set-Cookie', `oc_session=${token}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${30 * 86400}`);
  res.json({ id: user.id, username: user.username, role: user.role, name: user.name });
});

router.post('/logout', (req, res) => {
  destroySession(req.app.locals.db, req.sessionToken);
  res.setHeader('Set-Cookie', 'oc_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'not authenticated' });
  res.json(req.user);
});

export default router;
