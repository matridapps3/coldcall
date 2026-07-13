// Phone normalization + WhatsApp click-to-chat link building.
//
// Pure functions, unit-tested. Default country is India (+91) since the first
// campaigns (CA firms, salons, cafes) are India-based; override per call.

const DEFAULT_CC = '91';

// Returns digits-only E.164-ish string (no '+'), suitable for wa.me, or '' if
// there is nothing dialable. Leading '+' or '00' is treated as already-international.
export function normalize(phone, defaultCC = DEFAULT_CC) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const intl = raw.startsWith('+') || raw.startsWith('00');
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('00')) digits = digits.replace(/^0+/, '');
  if (!digits) return '';
  if (intl) return digits;
  // Domestic number: drop a single national trunk '0', then prepend country code.
  digits = digits.replace(/^0/, '');
  if (digits.startsWith(defaultCC) && digits.length > 10) return digits;
  return defaultCC + digits;
}

export function waLink(norm, text) {
  const base = `https://wa.me/${norm}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
