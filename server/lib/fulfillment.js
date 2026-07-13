// Pure fulfillment helpers — no DB, no I/O, so they unit-test like sequence.js.
//
// The factory floor: an intake code moves through stations from "code issued" to
// "site live". bucketOf() places a code in exactly one station; the manager board
// and the builder queue are both just groupings over this. nextRenewal() drives
// the recurring-revenue (care-plan / domain) renewal math.

// Stations in flow order. `nudge:true` marks a bucket where the ball is in the
// CLIENT's court (hasn't sent the brief / hasn't approved) — those get a chase.
export const BUCKETS = [
  { key: 'awaiting_assets', label: 'Awaiting brief', nudge: true, hint: 'Code issued — client has not filled the quiz yet.' },
  { key: 'to_build', label: 'To build', hint: 'Brief is in. Assign a builder.' },
  { key: 'building', label: 'Building', hint: 'A builder is on it.' },
  { key: 'awaiting_approval', label: 'Awaiting approval', nudge: true, hint: 'Preview delivered — waiting on the client to review.' },
  { key: 'changes', label: 'Changes requested', hint: 'Client asked for changes.' },
  { key: 'approved', label: 'Approved · go live', hint: 'Client approved. Take payment and flip live.' },
  { key: 'live', label: 'Live', hint: 'Delivered and live.' },
];

// Place an intake_code row in exactly one bucket from its lifecycle fields.
export function bucketOf(c) {
  const st = c.build_stage;
  if (st === 'live') return 'live';
  if (st === 'delivered') {
    if (c.approval === 'changes') return 'changes';
    if (c.approval === 'approved') return 'approved';
    return 'awaiting_approval';
  }
  if (st === 'building') return 'building';
  // No build stage yet: driven by whether the client's brief is in.
  if (c.status === 'submitted') return c.builder_id ? 'building' : 'to_build';
  return 'awaiting_assets';
}

// Timestamp a code entered its current bucket — the anchor for "days in stage".
// Falls back down the chain when an earlier timestamp is missing.
export function ageAnchor(c) {
  switch (bucketOf(c)) {
    case 'awaiting_assets': return c.created_at;
    case 'to_build': return c.submitted_at || c.created_at;
    case 'building': return c.assigned_at || c.submitted_at || c.created_at;
    case 'awaiting_approval':
    case 'changes':
    case 'approved':
    case 'live': return c.delivered_at || c.submitted_at || c.created_at;
    default: return c.created_at;
  }
}

// A 'YYYY-MM-DD' date one year on, clamping Feb 29 -> Feb 28 in a non-leap year.
export function nextRenewal(fromISODate) {
  const [y, m, d] = String(fromISODate).split('-').map(Number);
  const ny = y + 1;
  const lastDayOfMonth = new Date(ny, m, 0).getDate(); // m is 1-based; day 0 => last day of month m
  const day = Math.min(d, lastDayOfMonth);
  return `${ny}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Whole days from `fromISODate` to `toISODate` (positive if `to` is later).
// Both are 'YYYY-MM-DD'; compared at UTC midnight so DST can't skew the count.
export function daysUntil(toISODate, fromISODate) {
  const a = Date.parse(fromISODate + 'T00:00:00Z');
  const b = Date.parse(toISODate + 'T00:00:00Z');
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

// Renewal urgency for the "due" worklist. overdue < 0 <= due_soon <= soonDays < ok.
export function renewalState(renews_at, todayISODate, soonDays = 30) {
  const left = daysUntil(renews_at, todayISODate);
  if (left == null) return 'ok';
  if (left < 0) return 'overdue';
  if (left <= soonDays) return 'due_soon';
  return 'ok';
}
