// Outcome-branching sequence engine (pure, unit-tested).
//
// A mode's sequence is an ordered list of steps (call / whatsapp), each with a
// day_delay. When a caller logs an OUTCOME on a lead's current step, the engine
// resolves an ACTION (per-step override, else default) and returns a patch for
// the lead's {status, step_no, next_due, callback_at}.

export const OUTCOMES = [
  'no_answer',
  'will_revert',
  'call_back',
  'wrong_number',
  'not_interested',
  'interested',
  'meeting_booked',
  'dnc',
];

export const OUTCOME_LABELS = {
  no_answer: 'No answer',
  will_revert: 'Will get back (btaayenge)',
  call_back: 'Call back later',
  wrong_number: 'Wrong / invalid number',
  not_interested: 'Not interested',
  interested: 'Interested - follow up',
  meeting_booked: 'Meeting booked',
  dnc: 'Do not call',
};

export const ACTIONS = ['advance', 'retry', 'callback', 'followup', 'won', 'lost'];

// Days until a soft "will get back" lead auto-resurfaces for a follow-up.
export const FOLLOWUP_DAYS = 2;

// Applied when a step has no explicit rule for an outcome.
export const DEFAULT_ACTIONS = {
  no_answer: 'retry',
  will_revert: 'followup',
  call_back: 'callback',
  wrong_number: 'lost',
  not_interested: 'lost',
  interested: 'advance',
  meeting_booked: 'won',
  dnc: 'lost',
};

function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(n || 0));
  return d.toISOString().slice(0, 10);
}

export function resolveAction(rulesForStep, outcome) {
  return (rulesForStep && rulesForStep[outcome]) || DEFAULT_ACTIONS[outcome] || 'retry';
}

// lead:    { step_no }
// steps:   ordered array of mode steps [{ step_no, day_delay }, ...]
// rules:   map outcome -> action for the CURRENT step (may be {})
// outcome: one of OUTCOMES
// opts:    { today: 'YYYY-MM-DD', callbackDate: 'YYYY-MM-DD' }
// returns: { status, step_no, next_due, callback_at, action }
export function applyOutcome(lead, steps, rules, outcome, opts = {}) {
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const action = resolveAction(rules, outcome);
  const sorted = [...steps].sort((a, b) => a.step_no - b.step_no);
  const current = sorted.find((s) => s.step_no === lead.step_no) || sorted[0];
  const next = sorted.find((s) => s.step_no > (current ? current.step_no : 0));

  const base = { status: 'active', step_no: lead.step_no, next_due: null, callback_at: null, action };

  switch (action) {
    case 'won':
      return { ...base, status: 'won' };
    case 'lost':
      return { ...base, status: 'lost' };
    case 'callback': {
      const date = opts.callbackDate || addDays(today, 1);
      return { ...base, callback_at: date, next_due: date };
    }
    case 'retry':
      return { ...base, next_due: addDays(today, current ? current.day_delay : 0) };
    case 'followup': // soft "will get back" — keep warm, resurface in a couple of days
      return { ...base, next_due: addDays(today, FOLLOWUP_DAYS) };
    case 'advance':
    default:
      if (!next) return { ...base, status: 'lost' }; // cadence exhausted, no conversion
      return { ...base, step_no: next.step_no, next_due: addDays(today, next.day_delay) };
  }
}
