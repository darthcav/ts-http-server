import { doesNotMatch, equal, match, ok } from "node:assert/strict"
import { after, before, suite, test } from "node:test"
import { setTimeout } from "node:timers/promises"
import type { Logger } from "@logtape/logtape"
import type { FastifyInstance } from "fastify"
import defaultPlugins from "../defaults/defaultPlugins.ts"
import defaultRoutes from "../defaults/defaultRoutes.ts"
import launcher from "../launcher.ts"

// ---------------------------------------------------------------------------
// Content-Security-Policy scoping suite
//
// The global Helmet CSP must be strict (no `'unsafe-inline'` in `script-src`),
// while Swagger UI (`/docs`) carries its own relaxed-but-safe CSP scoped to the
// route prefix via the swagger-ui `staticCSP` option.
// ---------------------------------------------------------------------------

suite("Content-Security-Policy [HTTP]", () => {
    const noop = (): void => {}
    const testLogger = {
        category: ["test"],
        info: noop,
        error: noop,
        warn: noop,
        debug: noop,
        getChild: () => testLogger,
    } as unknown as Logger

    const locals = {
        pkg: { name: "ts-http-server", version: "0.0.0", description: "Test" },
    }

    const port = 19009
    const base = `http://localhost:${port}`
    let server: FastifyInstance

    before(async () => {
        // docs: true so the /docs routes are registered even though the test
        // env sets NODE_ENV=production (which would otherwise disable them).
        const plugins = defaultPlugins({ locals, docs: true })
        server = launcher({
            logger: testLogger,
            locals: { ...locals, port },
            plugins,
            routes: defaultRoutes(),
            opts: { disableRequestLogging: true },
        })
        await setTimeout(1000)
    })

    after(async () => {
        await setTimeout(500)
        await server.close()
    })

    test("app routes get a strict CSP with no 'unsafe-inline' in script-src", async () => {
        const res = await fetch(`${base}/`)
        await res.text()
        const csp = res.headers.get("content-security-policy") ?? ""
        ok(csp.length > 0)
        // script-src is present and self-based, without unsafe-inline.
        match(csp, /script-src[^;]*'self'/)
        doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/)
    })

    test("/docs carries its own CSP and still renders", async () => {
        const res = await fetch(`${base}/docs/`)
        const body = await res.text()
        equal(res.status, 200)
        match(res.headers.get("content-type") ?? "", /text\/html/)
        const csp = res.headers.get("content-security-policy") ?? ""
        // Swagger UI's staticCSP is self-contained and also avoids unsafe-inline.
        match(csp, /default-src 'self'/)
        match(csp, /script-src 'self'/)
        doesNotMatch(csp, /'unsafe-inline'/)
        ok(body.includes("swagger-ui"))
    })
})
