# Security Roadmap

Tracking document for the security hardening pass on `@darthcav/ts-http-server`.

**Process:** Work the items top-to-bottom, one at a time. For each item: create a `fix/<slug>`
branch, implement the fix, add/adjust tests, run `npm run lint` + `npm test`, push, and **only
then** remove the item from this file.

Severity scale: 🔴 high · 🟠 medium · 🟡 low.

---

## Open items

### 2. 🟠 CORS default reflects every origin

- **Location:** `src/defaults/defaultPlugins.ts:149`
- **Risk:** `@fastify/cors` is registered with `origin: true`, reflecting any `Origin`. An "allow
  all origins" default is a footgun for a library.
- **Fix:** make the CORS origin configurable (e.g. via `DefaultPluginsOptions` / env) and default to
  a closed or explicit allowlist; document the setting.
- **Tests:** allowed origin echoed, disallowed origin rejected, default behavior.

### 3. 🟠 Generic errors leak internal messages to clients

- **Location:** `src/defaults/defaultErrorHandler.ts:70-78`
- **Risk:** for non-Boom errors, `error.message` is rendered into the HTML/plain error response,
  leaking internal details (paths, connection strings, stack-adjacent info) on unexpected 5xx. Boom
  errors are safe.
- **Fix:** for the non-Boom 5xx branch, send a generic `"Internal Server Error"` message to the
  client and `request.log.error` the real error/stack server-side.
- **Tests:** unexpected error → 500 with generic message and no internal detail; Boom errors
  unchanged.

### 4. 🟠 `trustProxy: true` unconditionally

- **Location:** `src/defaults/defaultFastifyOptions.ts:26`
- **Risk:** trusting all proxies lets clients spoof `X-Forwarded-For` (hence `request.ip`, used in
  access logs) when not strictly behind a trusted proxy.
- **Fix:** make `trustProxy` configurable; default to `false` (or a known proxy CIDR / hop count)
  rather than blanket `true`.
- **Tests:** default value; override is honored.

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
