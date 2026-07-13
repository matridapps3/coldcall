// Minimal CSV / pasted-list parser for lead import.
//
// Handles quoted fields with embedded commas, comma OR tab delimiters, and an
// optional header row. Returns { rows: [{company, phone}], skipped: [rawLine] }.
// Column detection: if a header row names company/phone-ish columns, use those;
// otherwise assume the first cell is the company and the last is the phone.

function splitLine(line) {
  // Tab-delimited shortcut (Excel paste) when no comma present.
  if (line.indexOf('\t') > -1 && line.indexOf(',') === -1) return line.split('\t').map((s) => s.trim());
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const COMPANY_HINTS = ['company', 'name', 'business', 'firm', 'client', 'shop', 'salon', 'cafe'];
const PHONE_HINTS = ['phone', 'mobile', 'number', 'contact', 'whatsapp', 'cell'];

export function parseLeadCsv(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = [];
  const skipped = [];
  if (!lines.length) return { rows, skipped };

  // Header detection on the first row.
  const first = splitLine(lines[0]).map((c) => c.toLowerCase());
  let companyIdx = -1, phoneIdx = -1, hasHeader = false;
  first.forEach((cell, i) => {
    if (companyIdx < 0 && COMPANY_HINTS.some((h) => cell.includes(h))) companyIdx = i;
    if (phoneIdx < 0 && PHONE_HINTS.some((h) => cell.includes(h))) phoneIdx = i;
  });
  if (companyIdx > -1 || phoneIdx > -1) hasHeader = true;

  const body = hasHeader ? lines.slice(1) : lines;
  for (const line of body) {
    const cells = splitLine(line);
    let company, phone;
    if (hasHeader) {
      company = companyIdx > -1 ? cells[companyIdx] : cells.slice(0, -1).join(' ');
      phone = phoneIdx > -1 ? cells[phoneIdx] : cells[cells.length - 1];
    } else {
      if (cells.filter(Boolean).length < 2) { skipped.push(line); continue; }
      phone = cells[cells.length - 1];
      company = cells.slice(0, -1).join(', ');
    }
    company = (company || '').trim();
    phone = (phone || '').trim();
    if (!company || !phone) { skipped.push(line); continue; }
    rows.push({ company, phone });
  }
  return { rows, skipped };
}
