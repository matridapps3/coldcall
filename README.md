# Conyso Outreach — cold-call console

Template-based cold-calling for small sales teams. A lead-adder loads leads
(company + number) into a per-mode pool; callers pull the next lead, work a
script, fire a pre-filled WhatsApp message, and log an outcome that drives an
outcome-branching follow-up sequence. Managers own all configuration and watch
the numbers.

**Present-only by design** — the system never dials or sends. It shows the caller
the script and produces a `wa.me` click-to-chat link; the caller dials on their own
phone and clicks to open WhatsApp. No telephony, no WhatsApp Business API, no LLM,
no per-message cost.

## Roles
- **Manager** — creates accounts, authors modes (scripts + WhatsApp templates +
  sequence), watches the numbers dashboard. The only role that edits config.
- **Lead-adder** — adds leads into a mode's pool (single + bulk paste).
- **Caller** — claims the next lead, works the script + WhatsApp template, logs an
  outcome, manages a personal callback queue.

## Modes
A mode bundles its own call scripts, WhatsApp templates, and follow-up sequence.
Ships with **CA Firms** fully configured, plus inactive **Salons** and **Cafes**
placeholders for later campaigns. Adding a mode is pure configuration — no code.

## Sequence engine
Each mode has an ordered list of call/WhatsApp steps with day-delays. Logging an
outcome resolves an action — `advance` (next step after its delay), `retry` (same
step), `callback` (caller-chosen date), `won`, or `lost`. Sensible defaults apply
unless the manager overrides an outcome per step.

## Run locally
```bash
cd server
npm install
MANAGER_USER=manager MANAGER_PASS=yourpass npm start   # http://localhost:3009
npm test                                               # unit tests
```
First boot seeds a manager (defaults `manager` / `changeme` if env unset — change
it) and the starter modes.

## Operations
- `npm run backup` writes a consistent SQLite snapshot (set `BACKUP_DIR`, else
  `data/backups`). Set `BACKUP_DIR` in the server env to also enable daily
  automatic backups.
- Public endpoints (`/api/auth/login`, `/api/intake/*`) are rate-limited; API
  mutations are protected by SameSite=Lax cookies + a cross-origin check.
- Behind HTTPS the session cookie is marked `Secure` automatically (trusts
  `x-forwarded-proto`).

## Stack
Node 20 + Express + better-sqlite3 + vanilla-JS SPA. Single container, optional
data volume at `/data`. Port **3009**. Mirrors the Conyso Cadence/Ledger shape.
Auth: scrypt password hashing, SQLite session store, httpOnly cookie.
