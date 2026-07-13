// SQLite backup using better-sqlite3's online backup API (consistent snapshot
// even while the app is running). Writes timestamped copies and prunes old ones.
import fs from 'fs';
import path from 'path';

export async function backupDb(db, dir, keep = 14) {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(dir, `outreach-${stamp}.db`);
  await db.backup(dest);
  // Keep only the most recent `keep` backups.
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('outreach-') && f.endsWith('.db')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) {
    try { fs.unlinkSync(path.join(dir, f)); } catch {}
  }
  return dest;
}

// Mirror client uploads (logos/photos) into <dir>/uploads. These are the one
// irreplaceable asset in the system — a lost photo can't be regenerated from the
// DB. Stored filenames are content-random and never rewritten, so copy-if-missing
// is a correct, cheap incremental mirror. Returns the number of files copied.
export function mirrorUploads(srcDir, dir) {
  if (!srcDir || !fs.existsSync(srcDir)) return 0;
  const destRoot = path.join(dir, 'uploads');
  let copied = 0;
  for (const sub of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;                    // uploads/<codeId>/<file>
    const srcSub = path.join(srcDir, sub.name);
    const destSub = path.join(destRoot, sub.name);
    fs.mkdirSync(destSub, { recursive: true });
    for (const f of fs.readdirSync(srcSub)) {
      const dest = path.join(destSub, f);
      if (fs.existsSync(dest)) continue;                 // immutable — already mirrored
      try { fs.copyFileSync(path.join(srcSub, f), dest); copied++; } catch {}
    }
  }
  return copied;
}

// Start a periodic backup if BACKUP_DIR is set. Snapshots the DB and mirrors the
// client uploads. Returns the timer (or null).
export function scheduleBackups(db, { dir, uploadsDir, intervalMs = 24 * 60 * 60 * 1000 } = {}) {
  if (!dir) return null;
  const run = async () => {
    try {
      const d = await backupDb(db, dir);
      const n = mirrorUploads(uploadsDir, dir);
      console.log(`[outreach] backup written: ${d}${n ? ` (+${n} new upload${n > 1 ? 's' : ''} mirrored)` : ''}`);
    } catch (e) { console.error('[outreach] backup failed', e); }
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return timer;
}
