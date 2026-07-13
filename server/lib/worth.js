// Lead-heat / "is this worth a demo?" scoring.
//
// Demos cost a developer's time, so they should go to leads that have shown intent.
// This turns a lead's own behaviour (call outcomes, whether they replied, whether
// they took the WhatsApp) into a transparent score + a plain verdict the caller can
// act on. Rule-based on purpose: the caller can see exactly why.

// Front-loaded on purpose: the personalized demo is the OPENING move, not a reward.
// The moment a prospect actually talks on call 1 and doesn't flat-refuse, the demo
// is the play — so "picked up + any warmth" already clears the demo bar. Only a hard
// no, a dead number, or nobody-ever-answered holds the demo back.
export function assessWorth({ outcomes = [], replied = false, messaged = false } = {}) {
  const has = (o) => outcomes.includes(o);
  const connected = outcomes.some((o) => !['no_answer', 'wrong_number', 'dnc'].includes(o));
  let score = 0;
  const reasons = [];

  if (has('meeting_booked')) { score += 5; reasons.push('meeting booked'); }
  if (replied) { score += 3; reasons.push('replied on WhatsApp'); }
  if (has('interested')) { score += 3; reasons.push('said interested'); }
  if (has('will_revert')) { score += 2; reasons.push('will get back (btaayenge)'); }
  if (has('call_back')) { score += 2; reasons.push('asked to call back'); }
  if (connected) { score += 2; reasons.push('picked up the call'); }
  if (messaged) { score += 1; reasons.push('took the sample'); }
  if (has('not_interested')) { score -= 3; reasons.push('said not interested'); }
  if (has('dnc') || has('wrong_number')) { score -= 6; reasons.push('dead number / do-not-call'); }

  if (!outcomes.length && !messaged) reasons.length || reasons.push('not worked yet');
  else if (!connected && !replied) { reasons.length || reasons.push('only no-answers so far'); }

  let verdict, cls, tip;
  if (score >= 4) { verdict = 'Worth a demo'; cls = 'good'; tip = 'They talked — send a demo now.'; }
  else if (score >= 1) { verdict = 'Warming up'; cls = 'warn'; tip = 'Get them on a call, then demo.'; }
  else { verdict = 'Not yet'; cls = ''; tip = 'Instant messages only — save the demo.'; }

  return { score, verdict, cls, tip, reasons: reasons.slice(0, 3) };
}
