import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessWorth } from '../../lib/worth.js';

test('fresh lead is Not yet', () => {
  const w = assessWorth({ outcomes: [], replied: false, messaged: false });
  assert.equal(w.verdict, 'Not yet');
  assert.equal(w.score, 0);
});

test('only no-answers stays Not yet', () => {
  const w = assessWorth({ outcomes: ['no_answer', 'no_answer'], replied: false, messaged: false });
  assert.equal(w.verdict, 'Not yet');
  assert.match(w.reasons.join(' '), /no-answers/);
});

test('front-loaded: btaayenge on call 1 is already Worth a demo', () => {
  // Picked up + "will get back" and nothing else — the most common good call-1 result.
  const w = assessWorth({ outcomes: ['will_revert'], replied: false, messaged: false });
  assert.equal(w.verdict, 'Worth a demo');
  assert.ok(w.score >= 4);
});

test('front-loaded: asked to call back on call 1 is Worth a demo', () => {
  const w = assessWorth({ outcomes: ['call_back'], replied: false, messaged: false });
  assert.equal(w.verdict, 'Worth a demo');
});

test('got the sample but never connected stays Warming up', () => {
  const w = assessWorth({ outcomes: [], replied: false, messaged: true });
  assert.equal(w.verdict, 'Warming up');
  assert.ok(w.score >= 1 && w.score < 4);
});

test('replied on WhatsApp is Worth a demo', () => {
  const w = assessWorth({ outcomes: ['will_revert'], replied: true, messaged: true });
  assert.equal(w.verdict, 'Worth a demo');
  assert.equal(w.cls, 'good');
  assert.match(w.reasons.join(' '), /replied/);
});

test('said interested is Worth a demo', () => {
  const w = assessWorth({ outcomes: ['interested'], replied: false, messaged: true });
  assert.equal(w.verdict, 'Worth a demo');
});

test('not interested drags score negative', () => {
  const w = assessWorth({ outcomes: ['not_interested'], replied: false, messaged: true });
  assert.ok(w.score < 1);
  assert.equal(w.verdict, 'Not yet');
});

test('dead number is strongly negative', () => {
  const w = assessWorth({ outcomes: ['wrong_number'], replied: false, messaged: false });
  assert.ok(w.score <= -5);
  assert.equal(w.verdict, 'Not yet');
});

test('reasons are capped at three', () => {
  const w = assessWorth({ outcomes: ['meeting_booked', 'interested', 'will_revert', 'call_back'], replied: true, messaged: true });
  assert.ok(w.reasons.length <= 3);
  assert.equal(w.verdict, 'Worth a demo');
});
