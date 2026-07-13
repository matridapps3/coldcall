// Template variable rendering for scripts and WhatsApp messages.
//
// Supports {{var}} with optional surrounding whitespace. Unknown vars render
// empty so a half-filled template never leaks "{{partner}}" into a message.

export function render(body, vars = {}) {
  return String(body || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

// The variables every script/template can reference. Keep small and documented;
// the UI shows this list to the manager while authoring.
export function leadVars(lead, callerName) {
  return {
    company: lead?.company || '',
    phone: lead?.phone || '',
    caller: callerName || '',
  };
}
