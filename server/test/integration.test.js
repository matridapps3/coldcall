import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDb } from '../lib/db.js';
import { claimNext } from '../lib/claim.js';
import { backupDb } from '../lib/backup.js';

function freshDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outreach-test-'));
  const db = initDb(path.join(dir, 'test.db')); // seeds manager + CA Firms (mode 1)
  const mkUser = (name) => db.prepare("INSERT INTO users (username, password_hash, role, name) VALUES (?,?,?,?)").run(name, 'x', 'caller', name).lastInsertRowid;
  return { db, dir, mkUser };
}

test('claimNext: two callers never grab the same pool lead', () => {
  const { db, mkUser } = freshDb();
  const a = mkUser('a'), b = mkUser('b');
  const ins = db.prepare("INSERT INTO leads (mode_id, company, phone, phone_norm, status) VALUES (1,?,?,?,'pool')");
  ['L1', 'L2', 'L3'].forEach((c, i) => ins.run(c, '90000' + i, '9190000' + i));

  const c1 = claimNext(db, a, 1, '2026-06-27');
  const c2 = claimNext(db, b, 1, '2026-06-27');
  assert.ok(c1 && c2, 'both claims return a lead');
  assert.notEqual(c1.id, c2.id, 'distinct leads claimed');
  assert.equal(c1.owner_id, a);
  assert.equal(c2.owner_id, b);
  assert.equal(c1.status, 'active');
});

test('claimNext: prefers the callers own due lead over the pool', () => {
  const { db, mkUser } = freshDb();
  const a = mkUser('a');
  const ins = db.prepare("INSERT INTO leads (mode_id, company, phone, phone_norm, status) VALUES (1,?,?,?,'pool')");
  ['L1', 'L2'].forEach((c, i) => ins.run(c, '80000' + i, '9180000' + i));
  const first = claimNext(db, a, 1, '2026-06-27');
  const again = claimNext(db, a, 1, '2026-06-27'); // should re-surface the same owned, due lead
  assert.equal(again.id, first.id);
});

test('claimNext: returns null when the pool is empty', () => {
  const { db, mkUser } = freshDb();
  assert.equal(claimNext(db, mkUser('a'), 1, '2026-06-27'), null);
});

test('backupDb writes a snapshot file', async () => {
  const { db, dir } = freshDb();
  const dest = await backupDb(db, path.join(dir, 'backups'));
  assert.ok(fs.existsSync(dest), 'backup file exists');
  assert.ok(fs.statSync(dest).size > 0, 'backup is non-empty');
});
