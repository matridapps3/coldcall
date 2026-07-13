// Lead-claim logic, extracted so it can be unit-tested without HTTP.
//
// Prefer a lead the caller already owns and is due; otherwise claim the oldest
// untouched pool lead and lock it to that caller. Runs in a single SQLite
// transaction so two callers can never grab the same pool lead.

export function claimNext(db, uid, modeId, today) {
  const tx = db.transaction(() => {
    // Skip leads parked in the demo lane or the replied hot-lane — those are
    // worked from their own lanes, not pulled as "next".
    let lead = db.prepare(
      `SELECT * FROM leads WHERE owner_id=? AND mode_id=? AND status='active'
         AND replied_at IS NULL AND (demo_status IS NULL OR demo_status='sent')
         AND (next_due IS NULL OR next_due <= ?)
       ORDER BY next_due, callback_time IS NULL, callback_time, id LIMIT 1`
    ).get(uid, modeId, today);
    if (lead) return lead;
    lead = db.prepare("SELECT * FROM leads WHERE mode_id=? AND status='pool' ORDER BY id LIMIT 1").get(modeId);
    if (!lead) return null;
    db.prepare("UPDATE leads SET owner_id=?, status='active', step_no=1, next_due=? WHERE id=?")
      .run(uid, today, lead.id);
    return db.prepare('SELECT * FROM leads WHERE id=?').get(lead.id);
  });
  return tx();
}
