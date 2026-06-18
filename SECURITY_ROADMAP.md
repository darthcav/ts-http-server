# Security Roadmap

Tracking document for the security hardening pass on `@darthcav/ts-http-server`.

**Process:** Work the items top-to-bottom, one at a time. For each item: create a `fix/<slug>`
branch, implement the fix, add/adjust tests, run `npm run lint` + `npm test`, push, and **only
then** remove the item from this file.

Severity scale: 🔴 high · 🟠 medium · 🟡 low.

---

## Open items

### 5. 🟡 Log injection via raw `Referer` / `User-Agent`

- **Location:** `src/hooks/onResponse.ts:28`
- **Risk:** attacker-controlled headers are concatenated into a single log line; embedded CR/LF
  allows forged log entries (CWE-117).
- **Fix:** strip/encode control characters from interpolated header values, or emit them as discrete
  structured fields instead of concatenating into the message.
- **Tests:** header containing `\n`/`\r` is sanitized in the emitted line.

### 6. 🟡 Swagger UI + full OpenAPI spec are public

- **Location:** `src/defaults/defaultPlugins.ts:195-221`
- **Risk:** `/docs` and the spec are not under `/api/**`, so they are reachable unauthenticated,
  publishing the full endpoint map. Risky in production.
- **Fix:** gate `/docs` (and the spec) behind auth or an env flag; default to disabled in
  production.
- **Tests:** docs reachable when enabled; blocked/absent when disabled.

### 7. 🟡 CSP allows `'unsafe-inline'` scripts globally

- **Location:** `src/defaults/defaultPlugins.ts:169`
- **Risk:** `scriptSrc` includes `'unsafe-inline'` with `global: true`, weakening XSS protection for
  the whole app rather than just Swagger UI.
- **Fix:** use nonces/hashes, or scope the relaxed CSP to the `/docs` route only.
- **Tests:** CSP header on app routes does not contain `'unsafe-inline'` in `script-src`.

---

## Completed

- **1. 🔴 JWT `audience` not validated** — fixed in `2bee191` (merged to `dev` via `57e527a`).
  Verifier now checks `audience` (`config.clientId`) and pins `algorithms: ["RS256"]`; unused
  `clientSecret` removed from `KeycloakAuthConfig`, `start.ts`, README, and `.env.example`.
- **2. 🟠 CORS reflected every origin** — fixed in `809832c` (merged to `dev` via `993ae88`). CORS
  now defaults to `{ origin: false }` (same-origin only); cross-origin is opt-in via the new
  `DefaultPluginsOptions.cors` allowlist option.
- **3. 🟠 Errors leaked internal messages** — fixed in `1e7062e` (merged to `dev` via `6c89645`).
  Non-Boom errors are logged server-side; the client receives only the generic HTTP status reason
  phrase. Boom errors unchanged.
- **4. 🟠 `trustProxy: true` unconditionally** — fixed in `dcb66e4` (merged to `dev` via `11a224e`).
  `trustProxy` now defaults to `false`; opt in via the `TRUST_PROXY` env var (boolean, hop count, or
  IP/CIDR allowlist).
