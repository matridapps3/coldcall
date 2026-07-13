// Manager numbers dashboard + a caller's own "today" tally.
import { Router } from 'express';
import { requireRole, requireAuth } from '../lib/auth.js';

const router = Router();

// Deeper analytics: conversion funnel per mode, caller leaderboard, and template
// performance (how often each WhatsApp template is sent and the win-rate after).
router.get('/funnel', requireRole('manager'), (req, res) => {
  const db = req.app.locals.db;
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);

  const funnel = db.prepare(`
    SELECT m.name,
      COUNT(l.id) AS total,
      SUM(CASE WHEN (SELECT COUNT(*) FROM call_logs c WHERE c.lead_id=l.id) > 0 THEN 1 ELSE 0 END) AS contacted,
      SUM(CASE WHEN l.id IN (SELECT lead_id FROM call_logs WHERE outcome IN ('interested','meeting_booked')) THEN 1 ELSE 0 END) AS interested,
      SUM(CASE WHEN l.status='won' THEN 1 ELSE 0 END) AS won,
      SUM(CASE WHEN l.status='lost' THEN 1 ELSE 0 END) AS lost
    FROM modes m LEFT JOIN leads l ON l.mode_id=m.id GROUP BY m.id ORDER BY m.name`).all();

  const leaderboard = db.prepare(`
    SELECT u.id, u.name,
      COUNT(c.id) AS calls,
      SUM(CASE WHEN substr(c.created_at,1,10)=? THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN substr(c.created_at,1,10) >= ? THEN 1 ELSE 0 END) AS week,
      SUM(CASE WHEN c.outcome='meeting_booked' THEN 1 ELSE 0 END) AS meetings,
      COUNT(DISTINCT c.lead_id) AS leads_touched
    FROM users u LEFT JOIN call_logs c ON c.user_id=u.id
    WHERE u.role='caller' GROUP BY u.id ORDER BY meetings DESC, calls DESC`).all(today, weekStart)
    .map((r) => ({ ...r, conversion: r.leads_touched ? Math.round((r.meetings / r.leads_touched) * 100) : 0 }));

  const templates = db.prepare(`
    SELECT t.id, t.title, m.name AS mode,
      (SELECT COUNT(*) FROM template_sends s WHERE s.template_id=t.id) AS sends,
      (SELECT COUNT(DISTINCT s.lead_id) FROM template_sends s JOIN leads l ON l.id=s.lead_id
         WHERE s.template_id=t.id AND l.status='won') AS won_after
    FROM templates t JOIN modes m ON m.id=t.mode_id ORDER BY sends DESC, t.id`).all()
    .map((r) => ({ ...r, win_rate: r.sends ? Math.round((r.won_after / r.sends) * 100) : 0 }));

  res.json({ funnel, leaderboard, templates });
});

// Manager overview: per-caller activity, outcome mix, pipeline by status.
router.get('/', requireRole('manager'), (req, res) => {
  const db = req.app.locals.db;
  const today = new Date().toISOString().slice(0, 10);

  const perCaller = db.prepare(`
    SELECT u.id, u.name,
      COUNT(c.id)                                                   AS calls_total,
      SUM(CASE WHEN substr(c.created_at,1,10)=? THEN 1 ELSE 0 END)  AS calls_today,
      SUM(CASE WHEN c.outcome='meeting_booked' THEN 1 ELSE 0 END)   AS meetings
    FROM users u LEFT JOIN call_logs c ON c.user_id=u.id
    WHERE u.role='caller'
    GROUP BY u.id ORDER BY calls_today DESC, calls_total DESC`).all(today);

  const outcomes = db.prepare(
    `SELECT outcome, COUNT(*) AS n FROM call_logs GROUP BY outcome ORDER BY n DESC`).all();

  const pipeline = db.prepare(
    `SELECT status, COUNT(*) AS n FROM leads GROUP BY status`).all()
    .reduce((m, r) => ((m[r.status] = r.n), m), { pool: 0, active: 0, won: 0, lost: 0 });

  const byMode = db.prepare(`
    SELECT m.name,
      SUM(CASE WHEN l.status='pool' THEN 1 ELSE 0 END)   AS pool,
      SUM(CASE WHEN l.status='active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN l.status='won' THEN 1 ELSE 0 END)    AS won,
      SUM(CASE WHEN l.status='lost' THEN 1 ELSE 0 END)   AS lost
    FROM modes m LEFT JOIN leads l ON l.mode_id=m.id GROUP BY m.id ORDER BY m.name`).all();

  const callsToday = db.prepare(
    `SELECT COUNT(*) AS n FROM call_logs WHERE substr(created_at,1,10)=?`).get(today).n;

  res.json({ perCaller, outcomes, pipeline, byMode, callsToday });
});

// Caller's own tally for the header strip.
router.get('/me', requireAuth, (req, res) => {
  const db = req.app.locals.db;
  const today = new Date().toISOString().slice(0, 10);
  const calls_today = db.prepare(
    `SELECT COUNT(*) AS n FROM call_logs WHERE user_id=? AND substr(created_at,1,10)=?`)
    .get(req.user.id, today).n;
  const meetings = db.prepare(
    `SELECT COUNT(*) AS n FROM call_logs WHERE user_id=? AND outcome='meeting_booked'`)
    .get(req.user.id).n;
  res.json({ calls_today, meetings });
});

export default router;
