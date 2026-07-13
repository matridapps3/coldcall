// SQLite schema, migrations, and first-boot seed for Conyso Outreach.
//
// One file owns the database shape. Pragmas mirror the other Conyso tools
// (WAL for concurrent readers while a caller claims a lead in a write txn).

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { hashPassword } from './auth.js';
import { STARTER_MODES } from './seed-content.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('manager','adder','caller','builder')),
  name          TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS modes (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scripts (
  id      INTEGER PRIMARY KEY,
  mode_id INTEGER NOT NULL REFERENCES modes(id) ON DELETE CASCADE,
  title   TEXT NOT NULL,
  body    TEXT NOT NULL,
  sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS templates (
  id      INTEGER PRIMARY KEY,
  mode_id INTEGER NOT NULL REFERENCES modes(id) ON DELETE CASCADE,
  title   TEXT NOT NULL,
  body    TEXT NOT NULL,
  sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sequence_steps (
  id          INTEGER PRIMARY KEY,
  mode_id     INTEGER NOT NULL REFERENCES modes(id) ON DELETE CASCADE,
  step_no     INTEGER NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('call','whatsapp')),
  title       TEXT NOT NULL,
  template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
  day_delay   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS step_rules (
  id      INTEGER PRIMARY KEY,
  step_id INTEGER NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  action  TEXT NOT NULL CHECK (action IN ('advance','retry','callback','won','lost'))
);

CREATE TABLE IF NOT EXISTS leads (
  id          INTEGER PRIMARY KEY,
  mode_id     INTEGER NOT NULL REFERENCES modes(id) ON DELETE CASCADE,
  company     TEXT NOT NULL,
  phone       TEXT NOT NULL,
  phone_norm  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pool' CHECK (status IN ('pool','active','won','lost')),
  owner_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  step_no     INTEGER NOT NULL DEFAULT 1,
  next_due    TEXT,
  callback_at TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS call_logs (
  id         INTEGER PRIMARY KEY,
  lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  mode_id    INTEGER NOT NULL,
  step_no    INTEGER NOT NULL,
  outcome    TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Live in-call navigator: a branching talk-track per mode. Each node is a
-- moment in the conversation (what to say); each option is a button the caller
-- clicks based on the prospect's response, which branches the script, can fire
-- a WhatsApp template, and/or ends the call with a disposition.
CREATE TABLE IF NOT EXISTS flow_nodes (
  id       INTEGER PRIMARY KEY,
  mode_id  INTEGER NOT NULL REFERENCES modes(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  say      TEXT NOT NULL,
  is_entry INTEGER NOT NULL DEFAULT 0,
  sort     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS flow_options (
  id           INTEGER PRIMARY KEY,
  node_id      INTEGER NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  next_node_id INTEGER REFERENCES flow_nodes(id) ON DELETE SET NULL,
  outcome      TEXT,
  template_id  INTEGER REFERENCES templates(id) ON DELETE SET NULL,
  gen_demo     INTEGER NOT NULL DEFAULT 0,
  sort         INTEGER NOT NULL DEFAULT 0
);

-- Client website-intake quiz. A manager issues a unique code (optionally tied to
-- a won lead); the client opens the public quiz page, enters the code, and submits
-- a full brief stored as JSON for the build team.
CREATE TABLE IF NOT EXISTS intake_codes (
  id           INTEGER PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  lead_id      INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  company      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','submitted')),
  answers      TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  -- post-sale lifecycle (added via migrate() on existing DBs): build_stage,
  -- paid, amount, preview_url, approval, approval_note.
  submitted_at TEXT
);

-- WhatsApp send signal (present-only: logged when a caller opens a template's
-- click-to-chat link). Powers template performance / A/B comparison.
CREATE TABLE IF NOT EXISTS template_sends (
  id          INTEGER PRIMARY KEY,
  template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
  lead_id     INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  mode_id     INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Global do-not-call suppression. A number here is blocked from import and never
-- resurfaces. Auto-populated when a caller logs a 'dnc' outcome.
CREATE TABLE IF NOT EXISTS dnc_list (
  id         INTEGER PRIMARY KEY,
  phone_norm TEXT NOT NULL UNIQUE,
  reason     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Client-uploaded assets (logo/photos) attached to an intake brief.
CREATE TABLE IF NOT EXISTS intake_files (
  id         INTEGER PRIMARY KEY,
  code_id    INTEGER REFERENCES intake_codes(id) ON DELETE CASCADE,
  stored     TEXT NOT NULL,
  original   TEXT,
  size       INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Recurring revenue: annual care plans + domain renewals sold alongside a build.
-- The compounding engine of the factory — every active row is money due next year.
CREATE TABLE IF NOT EXISTS subscriptions (
  id          INTEGER PRIMARY KEY,
  lead_id     INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  intake_id   INTEGER REFERENCES intake_codes(id) ON DELETE SET NULL,
  company     TEXT NOT NULL,
  kind        TEXT NOT NULL,                              -- care_basic | care_plus | domain | other
  label       TEXT,                                       -- freeform, e.g. the domain name
  amount      INTEGER NOT NULL,                           -- annual amount (rupees)
  started_at  TEXT NOT NULL DEFAULT (date('now')),
  renews_at   TEXT NOT NULL,                              -- next renewal date (YYYY-MM-DD)
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','lapsed','cancelled')),
  note        TEXT,
  last_renewed_at TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subs_due    ON subscriptions(status, renews_at);
CREATE INDEX IF NOT EXISTS idx_leads_pool   ON leads(mode_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_norm   ON leads(mode_id, phone_norm);
CREATE INDEX IF NOT EXISTS idx_leads_owner  ON leads(owner_id, status, next_due);
CREATE INDEX IF NOT EXISTS idx_logs_user    ON call_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_steps_mode   ON sequence_steps(mode_id, step_no);
CREATE INDEX IF NOT EXISTS idx_flow_nodes   ON flow_nodes(mode_id, sort);
CREATE INDEX IF NOT EXISTS idx_flow_options ON flow_options(node_id, sort);
`;

export function initDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  migrate(db);
  seedManager(db);
  return db;
}

// Additive column migrations (CREATE TABLE IF NOT EXISTS can't add columns).
function migrate(db) {
  const leadCols = db.prepare('PRAGMA table_info(leads)').all().map((c) => c.name);
  if (!leadCols.includes('callback_time')) db.exec('ALTER TABLE leads ADD COLUMN callback_time TEXT');
  // Personalized-demo workflow + replied hot-lane.
  if (!leadCols.includes('demo_status')) db.exec('ALTER TABLE leads ADD COLUMN demo_status TEXT'); // requested|ready|sent
  if (!leadCols.includes('demo_url')) db.exec('ALTER TABLE leads ADD COLUMN demo_url TEXT');
  if (!leadCols.includes('demo_prompt')) db.exec('ALTER TABLE leads ADD COLUMN demo_prompt TEXT');
  if (!leadCols.includes('demo_requested_at')) db.exec('ALTER TABLE leads ADD COLUMN demo_requested_at TEXT');
  if (!leadCols.includes('replied_at')) db.exec('ALTER TABLE leads ADD COLUMN replied_at TEXT');
  // Demo builds routed through the builder role (in-system, not an external dev).
  if (!leadCols.includes('demo_builder_id')) db.exec('ALTER TABLE leads ADD COLUMN demo_builder_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
  if (!leadCols.includes('demo_ready_at')) db.exec('ALTER TABLE leads ADD COLUMN demo_ready_at TEXT');
  // Navigator option can trigger the demo build (front-loaded: generate on call 1).
  const foCols = db.prepare('PRAGMA table_info(flow_options)').all().map((c) => c.name);
  if (!foCols.includes('gen_demo')) db.exec('ALTER TABLE flow_options ADD COLUMN gen_demo INTEGER NOT NULL DEFAULT 0');
  const ic = db.prepare('PRAGMA table_info(intake_codes)').all().map((c) => c.name);
  const addIc = (col, ddl) => { if (!ic.includes(col)) db.exec(`ALTER TABLE intake_codes ADD COLUMN ${ddl}`); };
  addIc('build_stage', 'build_stage TEXT');
  addIc('paid', 'paid INTEGER NOT NULL DEFAULT 0');
  addIc('amount', 'amount INTEGER');
  addIc('preview_url', 'preview_url TEXT');
  addIc('approval', 'approval TEXT');
  addIc('approval_note', 'approval_note TEXT');
  // Fulfillment: builder assignment + stage timestamps (aging) + post-sale nudges.
  addIc('builder_id', 'builder_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
  addIc('assigned_at', 'assigned_at TEXT');
  addIc('delivered_at', 'delivered_at TEXT');
  addIc('last_nudge_at', 'last_nudge_at TEXT');
  addIc('nudge_count', 'nudge_count INTEGER NOT NULL DEFAULT 0');
  // The users.role CHECK originally excluded 'builder'. SQLite can't ALTER a
  // CHECK, so rebuild the table (ids preserved, so sessions FKs stay valid).
  const usersSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get()?.sql || '';
  if (!usersSql.includes("'builder'")) {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      BEGIN;
      CREATE TABLE users_new (
        id            INTEGER PRIMARY KEY,
        username      TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL CHECK (role IN ('manager','adder','caller','builder')),
        name          TEXT NOT NULL,
        active        INTEGER NOT NULL DEFAULT 1,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO users_new (id, username, password_hash, role, name, active, created_at)
        SELECT id, username, password_hash, role, name, active, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      COMMIT;
    `);
    db.pragma('foreign_keys = ON');
  }
}

// First-boot manager account. Username/password from env, else sane defaults
// (logged loudly so a self-hoster changes them).
function seedManager(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;
  const username = process.env.MANAGER_USER || 'manager';
  const password = process.env.MANAGER_PASS || 'changeme';
  db.prepare(
    `INSERT INTO users (username, password_hash, role, name) VALUES (?,?,?,?)`
  ).run(username, hashPassword(password), 'manager', 'Manager');
  if (!process.env.MANAGER_PASS) {
    console.warn(`[outreach] Seeded manager "${username}" / "changeme" — set MANAGER_USER/MANAGER_PASS and change it.`);
  }
  seedStarterModes(db);
}

// Starter content so the console is usable immediately. Built data-driven from
// the per-vertical SiteBhai campaigns in seed-content.js. CA Firms ships active
// (current target); Salons and Cafes ship configured-but-inactive for later.
function seedStarterModes(db) {
  const insMode = db.prepare('INSERT INTO modes (name, active) VALUES (?,?)');
  const insScript = db.prepare('INSERT INTO scripts (mode_id, title, body, sort) VALUES (?,?,?,?)');
  const insTpl = db.prepare('INSERT INTO templates (mode_id, title, body, sort) VALUES (?,?,?,?)');
  const insStep = db.prepare('INSERT INTO sequence_steps (mode_id, step_no, kind, title, template_id, day_delay) VALUES (?,?,?,?,?,?)');
  const insRule = db.prepare('INSERT INTO step_rules (step_id, outcome, action) VALUES (?,?,?)');
  const insNode = db.prepare('INSERT INTO flow_nodes (mode_id, title, say, is_entry, sort) VALUES (?,?,?,?,?)');
  const insOpt = db.prepare('INSERT INTO flow_options (node_id, label, next_node_id, outcome, template_id, sort) VALUES (?,?,?,?,?,?)');

  for (const m of STARTER_MODES) {
    const modeId = insMode.run(m.name, m.active ?? 1).lastInsertRowid;
    m.scripts.forEach((s, i) => insScript.run(modeId, s.title, s.body, i));
    const tplId = {}; // template key -> inserted id, for step + flow-option linking
    (m.templates || []).forEach((t, i) => { tplId[t.key] = insTpl.run(modeId, t.title, t.body, i).lastInsertRowid; });
    m.steps.forEach((step, i) => {
      const stepId = insStep.run(modeId, i + 1, step.kind, step.title, step.template ? tplId[step.template] : null, step.day_delay).lastInsertRowid;
      for (const [outcome, action] of Object.entries(step.rules || {})) insRule.run(stepId, outcome, action);
    });

    // Call-navigator flow: insert nodes first (key -> id), then options that
    // reference target nodes by key.
    const flow = m.flow || [];
    const nodeId = {};
    flow.forEach((n, i) => { nodeId[n.key] = insNode.run(modeId, n.title, n.say, n.entry ? 1 : 0, i).lastInsertRowid; });
    flow.forEach((n) => {
      (n.options || []).forEach((o, j) => {
        insOpt.run(nodeId[n.key], o.label, o.to ? nodeId[o.to] : null, o.outcome || null, o.template ? tplId[o.template] : null, j);
      });
    });
  }
}
