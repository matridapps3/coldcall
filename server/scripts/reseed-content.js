// Reseed a running install's content (scripts, templates, sequence, call flow)
// from lib/seed-content.js WITHOUT touching leads, users, or intake data.
// Matches modes by name and replaces their content in place.
//
//   node scripts/reseed-content.js      (uses DATA_DIR or ./data)
import path from 'path';
import { initDb } from '../lib/db.js';
import { STARTER_MODES } from '../lib/seed-content.js';

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(import.meta.dirname, '..', 'data'));
const db = initDb(path.join(DATA_DIR, 'outreach.db'));

const insScript = db.prepare('INSERT INTO scripts (mode_id,title,body,sort) VALUES (?,?,?,?)');
const insTpl = db.prepare('INSERT INTO templates (mode_id,title,body,sort) VALUES (?,?,?,?)');
const insStep = db.prepare('INSERT INTO sequence_steps (mode_id,step_no,kind,title,template_id,day_delay) VALUES (?,?,?,?,?,?)');
const insRule = db.prepare('INSERT INTO step_rules (step_id,outcome,action) VALUES (?,?,?)');
const insNode = db.prepare('INSERT INTO flow_nodes (mode_id,title,say,is_entry,sort) VALUES (?,?,?,?,?)');
const insOpt = db.prepare('INSERT INTO flow_options (node_id,label,next_node_id,outcome,template_id,gen_demo,sort) VALUES (?,?,?,?,?,?,?)');

const tx = db.transaction(() => {
  for (const m of STARTER_MODES) {
    let mode = db.prepare('SELECT id FROM modes WHERE name=?').get(m.name);
    if (!mode) {
      const info = db.prepare('INSERT INTO modes (name, active) VALUES (?,?)').run(m.name, m.active ?? 1);
      mode = { id: info.lastInsertRowid };
      console.log('created new mode:', m.name);
    }
    const id = mode.id;
    // Wipe content only. flow_options cascade via flow_nodes; step_rules via steps.
    db.prepare('DELETE FROM flow_nodes WHERE mode_id=?').run(id);
    db.prepare('DELETE FROM sequence_steps WHERE mode_id=?').run(id);
    db.prepare('DELETE FROM scripts WHERE mode_id=?').run(id);
    db.prepare('DELETE FROM templates WHERE mode_id=?').run(id);

    m.scripts.forEach((s, i) => insScript.run(id, s.title, s.body, i));
    const tplId = {};
    (m.templates || []).forEach((t, i) => { tplId[t.key] = insTpl.run(id, t.title, t.body, i).lastInsertRowid; });
    m.steps.forEach((step, i) => {
      const sid = insStep.run(id, i + 1, step.kind, step.title, step.template ? tplId[step.template] : null, step.day_delay).lastInsertRowid;
      for (const [o, a] of Object.entries(step.rules || {})) insRule.run(sid, o, a);
    });
    const nodeId = {};
    (m.flow || []).forEach((n, i) => { nodeId[n.key] = insNode.run(id, n.title, n.say, n.entry ? 1 : 0, i).lastInsertRowid; });
    (m.flow || []).forEach((n) => (n.options || []).forEach((o, j) =>
      insOpt.run(nodeId[n.key], o.label, o.to ? nodeId[o.to] : null, o.outcome || null, o.template ? tplId[o.template] : null, o.demo ? 1 : 0, j)));
    console.log(`reseeded ${m.name}: ${m.scripts.length} scripts, ${(m.templates || []).length} templates, ${m.steps.length} steps, ${(m.flow || []).length} flow nodes`);
  }
});
tx();
console.log('done. leads and users untouched.');
