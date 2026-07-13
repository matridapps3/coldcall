// Call-navigator flow: read the branching talk-track (any role) and author it
// (manager only). Nodes are moments in the call; options are the buttons that
// branch the script, fire a WhatsApp template, or end the call with a disposition.
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../lib/auth.js';
import { OUTCOMES } from '../lib/sequence.js';

const router = Router();
const mgr = requireRole('manager');

function loadFlow(db, modeId) {
  const nodes = db.prepare('SELECT * FROM flow_nodes WHERE mode_id=? ORDER BY sort, id').all(modeId);
  const opts = db.prepare(
    `SELECT o.* FROM flow_options o JOIN flow_nodes n ON n.id=o.node_id WHERE n.mode_id=? ORDER BY o.sort, o.id`
  ).all(modeId);
  const byNode = {};
  for (const o of opts) (byNode[o.node_id] ||= []).push(o);
  for (const n of nodes) n.options = byNode[n.id] || [];
  const entry = nodes.find((n) => n.is_entry) || nodes[0] || null;
  return { nodes, entry_id: entry ? entry.id : null };
}

router.get('/:modeId', requireAuth, (req, res) => {
  res.json(loadFlow(req.app.locals.db, Number(req.params.modeId)));
});

// ---- node CRUD (manager) ----
const NewNode = z.object({ title: z.string().min(1), say: z.string().min(1) });
router.post('/:modeId/nodes', mgr, (req, res) => {
  const p = NewNode.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'title and say required' });
  const db = req.app.locals.db;
  const modeId = Number(req.params.modeId);
  const sort = (db.prepare('SELECT MAX(sort) AS m FROM flow_nodes WHERE mode_id=?').get(modeId).m || 0) + 1;
  const info = db.prepare('INSERT INTO flow_nodes (mode_id, title, say, sort) VALUES (?,?,?,?)').run(modeId, p.data.title, p.data.say, sort);
  res.json({ id: info.lastInsertRowid });
});

router.patch('/:modeId/nodes/:nid', mgr, (req, res) => {
  const db = req.app.locals.db;
  const mid = Number(req.params.modeId);
  const nid = Number(req.params.nid);
  // Scope every write to this mode so a mismatched modeId can't touch another mode's node.
  if (!db.prepare('SELECT 1 FROM flow_nodes WHERE id=? AND mode_id=?').get(nid, mid))
    return res.status(404).json({ error: 'node not found in this mode' });
  if (req.body?.title != null) db.prepare('UPDATE flow_nodes SET title=? WHERE id=? AND mode_id=?').run(String(req.body.title), nid, mid);
  if (req.body?.say != null) db.prepare('UPDATE flow_nodes SET say=? WHERE id=? AND mode_id=?').run(String(req.body.say), nid, mid);
  if (req.body?.is_entry != null) {
    // Entry is exclusive per mode.
    if (req.body.is_entry) db.prepare('UPDATE flow_nodes SET is_entry=0 WHERE mode_id=?').run(mid);
    db.prepare('UPDATE flow_nodes SET is_entry=? WHERE id=? AND mode_id=?').run(req.body.is_entry ? 1 : 0, nid, mid);
  }
  res.json({ ok: true });
});

router.delete('/:modeId/nodes/:nid', mgr, (req, res) => {
  req.app.locals.db.prepare('DELETE FROM flow_nodes WHERE id=? AND mode_id=?')
    .run(Number(req.params.nid), Number(req.params.modeId));
  res.json({ ok: true });
});

// ---- option CRUD (manager) ----
const Opt = z.object({
  label: z.string().min(1),
  next_node_id: z.number().int().nullable().optional(),
  outcome: z.enum(OUTCOMES).nullable().optional(),
  template_id: z.number().int().nullable().optional(),
  gen_demo: z.union([z.boolean(), z.number().int()]).optional(),
});
router.post('/:modeId/nodes/:nid/options', mgr, (req, res) => {
  const p = Opt.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'label required' });
  const db = req.app.locals.db;
  const nid = Number(req.params.nid);
  if (!db.prepare('SELECT 1 FROM flow_nodes WHERE id=? AND mode_id=?').get(nid, Number(req.params.modeId)))
    return res.status(404).json({ error: 'node not found in this mode' });
  const sort = (db.prepare('SELECT MAX(sort) AS m FROM flow_options WHERE node_id=?').get(nid).m || 0) + 1;
  const info = db.prepare('INSERT INTO flow_options (node_id, label, next_node_id, outcome, template_id, gen_demo, sort) VALUES (?,?,?,?,?,?,?)')
    .run(nid, p.data.label, p.data.next_node_id ?? null, p.data.outcome ?? null, p.data.template_id ?? null, p.data.gen_demo ? 1 : 0, sort);
  res.json({ id: info.lastInsertRowid });
});

router.patch('/:modeId/options/:oid', mgr, (req, res) => {
  const db = req.app.locals.db;
  const oid = Number(req.params.oid);
  // Confirm the option belongs to a node in this mode before mutating it.
  if (!db.prepare('SELECT 1 FROM flow_options o JOIN flow_nodes n ON n.id=o.node_id WHERE o.id=? AND n.mode_id=?').get(oid, Number(req.params.modeId)))
    return res.status(404).json({ error: 'option not found in this mode' });
  for (const f of ['label', 'next_node_id', 'outcome', 'template_id']) {
    if (req.body?.[f] !== undefined) db.prepare(`UPDATE flow_options SET ${f}=? WHERE id=?`).run(req.body[f], oid);
  }
  if (req.body?.gen_demo !== undefined) db.prepare('UPDATE flow_options SET gen_demo=? WHERE id=?').run(req.body.gen_demo ? 1 : 0, oid);
  res.json({ ok: true });
});

router.delete('/:modeId/options/:oid', mgr, (req, res) => {
  req.app.locals.db.prepare(
    'DELETE FROM flow_options WHERE id=? AND node_id IN (SELECT id FROM flow_nodes WHERE mode_id=?)'
  ).run(Number(req.params.oid), Number(req.params.modeId));
  res.json({ ok: true });
});

export default router;
