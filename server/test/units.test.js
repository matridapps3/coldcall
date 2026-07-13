import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, waLink } from '../lib/phone.js';
import { render } from '../lib/render.js';
import { applyOutcome, resolveAction, DEFAULT_ACTIONS } from '../lib/sequence.js';
import { parseLeadCsv } from '../lib/csv.js';

test('csv: detects header and maps company/phone columns', () => {
  const r = parseLeadCsv('Company,Phone\nSharma & Co,9876543210\nVerma,9988776655');
  assert.deepEqual(r.rows, [{ company: 'Sharma & Co', phone: '9876543210' }, { company: 'Verma', phone: '9988776655' }]);
});

test('csv: handles quoted field with comma', () => {
  const r = parseLeadCsv('name,mobile\n"Verma, CA Firm",9988776655');
  assert.deepEqual(r.rows, [{ company: 'Verma, CA Firm', phone: '9988776655' }]);
});

test('csv: headerless first=company last=phone, skips bad rows', () => {
  const r = parseLeadCsv('Sharma & Associates, 9876543210\nbadrow');
  assert.deepEqual(r.rows, [{ company: 'Sharma & Associates', phone: '9876543210' }]);
  assert.deepEqual(r.skipped, ['badrow']);
});

test('phone: domestic India number gets +91', () => {
  assert.equal(normalize('98765 43210'), '919876543210');
  assert.equal(normalize('098765-43210'), '919876543210'); // trunk 0 dropped
});

test('phone: international is preserved', () => {
  assert.equal(normalize('+1 (415) 555-2671'), '14155552671');
  assert.equal(normalize('0044 7911 123456'), '447911123456');
});

test('phone: already-prefixed 91 not doubled', () => {
  assert.equal(normalize('919876543210'), '919876543210');
});

test('phone: empty/garbage -> empty', () => {
  assert.equal(normalize(''), '');
  assert.equal(normalize('---'), '');
});

test('waLink encodes message', () => {
  assert.equal(waLink('919876543210', 'Hi & bye'), 'https://wa.me/919876543210?text=Hi%20%26%20bye');
});

test('render substitutes known vars, blanks unknown', () => {
  assert.equal(render('Hi {{company}} from {{caller}}', { company: 'ABC & Co', caller: 'Ravi' }), 'Hi ABC & Co from Ravi');
  assert.equal(render('Hi {{ company }}!', { company: 'X' }), 'Hi X!');
  assert.equal(render('Hi {{missing}}!', {}), 'Hi !');
});

const steps = [
  { step_no: 1, day_delay: 0 },
  { step_no: 2, day_delay: 2 },
  { step_no: 3, day_delay: 5 },
];
const opts = { today: '2026-06-27' };

test('default action map is sane', () => {
  assert.equal(DEFAULT_ACTIONS.meeting_booked, 'won');
  assert.equal(resolveAction({}, 'no_answer'), 'retry');
  assert.equal(resolveAction({ no_answer: 'lost' }, 'no_answer'), 'lost'); // override wins
});

test('advance moves to next step with its delay', () => {
  const p = applyOutcome({ step_no: 1 }, steps, {}, 'interested', opts);
  assert.equal(p.status, 'active');
  assert.equal(p.step_no, 2);
  assert.equal(p.next_due, '2026-06-29');
});

test('retry stays on step, due after step delay', () => {
  const p = applyOutcome({ step_no: 2 }, steps, {}, 'no_answer', opts);
  assert.equal(p.step_no, 2);
  assert.equal(p.next_due, '2026-06-29');
});

test('callback uses chosen date and stays put', () => {
  const p = applyOutcome({ step_no: 1 }, steps, {}, 'call_back', { ...opts, callbackDate: '2026-07-01' });
  assert.equal(p.step_no, 1);
  assert.equal(p.callback_at, '2026-07-01');
  assert.equal(p.next_due, '2026-07-01');
});

test('meeting_booked -> won, not_interested -> lost', () => {
  assert.equal(applyOutcome({ step_no: 1 }, steps, {}, 'meeting_booked', opts).status, 'won');
  assert.equal(applyOutcome({ step_no: 1 }, steps, {}, 'not_interested', opts).status, 'lost');
});

test('advancing past last step is terminal (lost, exhausted)', () => {
  const p = applyOutcome({ step_no: 3 }, steps, {}, 'interested', opts);
  assert.equal(p.status, 'lost');
});

test('per-step override flips behavior', () => {
  const p = applyOutcome({ step_no: 1 }, steps, { no_answer: 'advance' }, 'no_answer', opts);
  assert.equal(p.step_no, 2);
});

test('will_revert (btaayenge) keeps lead warm and follows up in 2 days', () => {
  const p = applyOutcome({ step_no: 1 }, steps, {}, 'will_revert', opts);
  assert.equal(p.action, 'followup');
  assert.equal(p.status, 'active');
  assert.equal(p.step_no, 1); // stays on the same step
  assert.equal(p.next_due, '2026-06-29'); // today + 2
  assert.equal(p.callback_at, null); // no manual date needed
});

// ---------- fulfillment: bucket classification + renewal math ----------
import { bucketOf, ageAnchor, nextRenewal, daysUntil, renewalState } from '../lib/fulfillment.js';

test('fulfillment: bucketOf places a code in exactly one station', () => {
  assert.equal(bucketOf({ status: 'issued' }), 'awaiting_assets');
  assert.equal(bucketOf({ status: 'submitted' }), 'to_build');
  assert.equal(bucketOf({ status: 'submitted', builder_id: 7 }), 'building');
  assert.equal(bucketOf({ status: 'submitted', build_stage: 'building' }), 'building');
  assert.equal(bucketOf({ build_stage: 'delivered' }), 'awaiting_approval');
  assert.equal(bucketOf({ build_stage: 'delivered', approval: 'changes' }), 'changes');
  assert.equal(bucketOf({ build_stage: 'delivered', approval: 'approved' }), 'approved');
  assert.equal(bucketOf({ build_stage: 'live' }), 'live');
});

test('fulfillment: ageAnchor follows the current station', () => {
  assert.equal(ageAnchor({ status: 'issued', created_at: 'C' }), 'C');
  assert.equal(ageAnchor({ status: 'submitted', submitted_at: 'S', created_at: 'C' }), 'S');
  assert.equal(ageAnchor({ status: 'submitted', builder_id: 1, assigned_at: 'A', submitted_at: 'S' }), 'A');
  assert.equal(ageAnchor({ build_stage: 'delivered', delivered_at: 'D', submitted_at: 'S' }), 'D');
  // falls back when the ideal anchor is missing
  assert.equal(ageAnchor({ status: 'submitted', builder_id: 1, submitted_at: 'S' }), 'S');
});

test('fulfillment: nextRenewal adds a year, clamping Feb 29', () => {
  assert.equal(nextRenewal('2026-07-12'), '2027-07-12');
  assert.equal(nextRenewal('2024-02-29'), '2025-02-28'); // non-leap clamp
  assert.equal(nextRenewal('2027-12-31'), '2028-12-31');
});

test('fulfillment: daysUntil + renewalState classify urgency', () => {
  assert.equal(daysUntil('2026-07-22', '2026-07-12'), 10);
  assert.equal(daysUntil('2026-07-02', '2026-07-12'), -10);
  assert.equal(renewalState('2026-07-02', '2026-07-12'), 'overdue');
  assert.equal(renewalState('2026-07-20', '2026-07-12', 30), 'due_soon');
  assert.equal(renewalState('2026-09-30', '2026-07-12', 30), 'ok');
});
