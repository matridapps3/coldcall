// One-off backup: `npm run backup` (or BACKUP_DIR=/path npm run backup).
import path from 'path';
import { initDb } from '../lib/db.js';
import { backupDb, mirrorUploads } from '../lib/backup.js';

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(import.meta.dirname, '..', 'data'));
const dir = process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups');
const db = initDb(path.join(DATA_DIR, 'outreach.db'));
backupDb(db, dir)
  .then((dest) => {
    const n = mirrorUploads(path.join(DATA_DIR, 'uploads'), dir);
    console.log('backup written:', dest, n ? `(+${n} uploads mirrored)` : '');
    process.exit(0);
  })
  .catch((e) => { console.error('backup failed', e); process.exit(1); });
