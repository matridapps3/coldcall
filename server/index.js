// Conyso Outreach — Node entrypoint.
//
// One Express app: serves the /public SPA and a session-guarded REST API backed
// by SQLite. Present-only cold-call console — no telephony, no WhatsApp API, no
// LLM. Mirrors the Conyso Cadence/Ledger deployment shape (single container).

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './lib/db.js';
import { sessionMiddleware } from './lib/auth.js';
import { rateLimit } from './lib/ratelimit.js';
import { scheduleBackups } from './lib/backup.js';
import auth from './routes/auth.js';
import users from './routes/users.js';
import modes from './routes/modes.js';
import leads from './routes/leads.js';
import queue from './routes/queue.js';
import flow from './routes/flow.js';
import intake from './routes/intake.js';
import fulfillment from './routes/fulfillment.js';
import subs from './routes/subs.js';
import stats from './routes/stats.js';
import playbook from './routes/playbook.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.get('/healthz', (_req, res) => {
  try { app.locals.db.prepare('SELECT 1').get(); res.json({ ok: true, service: 'conyso-outreach' }); }
  catch { res.status(503).json({ ok: false }); }
});

app.use(express.json({ limit: '4mb' }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
    "font-src 'self' data:; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'");
  next();
});

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
app.locals.db = initDb(path.join(DATA_DIR, 'outreach.db'));

app.use(sessionMiddleware(app.locals.db));

// API responses are per-session and mutable — never let the browser cache them
// (otherwise a stale GET /api/modes can show old lead counts / active flags).
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

// CSRF defence-in-depth: SameSite=Lax cookies already block cross-site POSTs;
// additionally reject any state-changing API call whose Origin is cross-host.
app.use('/api', (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin) { try { if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'cross-origin request blocked' }); } catch {} }
  }
  next();
});

// Throttle the brute-forceable surfaces (login + public code-gated endpoints).
app.use('/api/auth/login', rateLimit({ windowMs: 60_000, max: 12 }));
app.use(['/api/intake/start', '/api/intake/submit', '/api/intake/upload', '/api/intake/approve'], rateLimit({ windowMs: 60_000, max: 30 }));

app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/modes', modes);
app.use('/api/leads', leads);
app.use('/api/queue', queue);
app.use('/api/flow', flow);
app.use('/api/intake', intake);
app.use('/api/fulfillment', fulfillment);
app.use('/api/subs', subs);
app.use('/api/stats', stats);
app.use('/api/playbook', playbook);

// Public client-facing pages (code-gated, no login).
app.get('/quiz', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'quiz.html')));
app.get('/review', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'review.html')));

app.use(express.static(path.join(__dirname, 'public')));

// JSON error fallback so client always gets parseable failures. Honour the
// status set by upstream middleware (e.g. body-parser's 400 on malformed JSON).
app.use((err, _req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) console.error('[outreach]', err);
  res.status(status).json({ error: status === 400 ? 'malformed request' : 'internal error' });
});

// Periodic SQLite backups when BACKUP_DIR is set (consistent online snapshots +
// a mirror of client uploads, which can't be regenerated from the DB).
scheduleBackups(app.locals.db, { dir: process.env.BACKUP_DIR, uploadsDir: path.join(DATA_DIR, 'uploads') });

const PORT = process.env.PORT || 3009;
app.listen(PORT, () => console.log(`[outreach] Conyso Outreach listening on :${PORT}`));
