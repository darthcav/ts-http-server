import { equal, match, ok } from "node:assert/strict"
import { after, before, suite, test } from "node:test"
import { setTimeout } from "node:timers/promises"
import type { Logger } from "@logtape/logtape"
import type { FastifyInstance } from "fastify"
import defaultPlugins from "../defaults/defaultPlugins.ts"
import defaultRoutes from "../defaults/defaultRoutes.ts"
import launcher from "../launcher.ts"

// ---------------------------------------------------------------------------
// Swagger UI asset serving suite
//
// `@fastify/swagger-ui` serves its bundled assets under `<routePrefix>/static`
// through its own nested `@fastify/static` instance. That nested copy is pinned
// to a patched release via the `overrides` field in `package.json`, so these
// tests guard the docs routes against a regression in that resolution.
// ---------------------------------------------------------------------------

suite("Swagger UI [HTTP]", () => {
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

    const port = 19010
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

    test("serves the bundled Swagger UI assets under /docs/static", async () => {
        const assets = [
            ["/docs/static/swagger-ui.css", /text\/css/],
            ["/docs/static/swagger-ui-bundle.js", /javascript/],
            ["/docs/static/swagger-ui-standalone-preset.js", /javascript/],
            ["/docs/static/swagger-initializer.js", /javascript/],
        ] as const

        for (const [path, contentType] of assets) {
            const res = await fetch(`${base}${path}`)
            const body = await res.text()
            equal(res.status, 200, `${path} should be served`)
            match(res.headers.get("content-type") ?? "", contentType)
            ok(body.length > 0)
        }
    })

    test("serves the OpenAPI document as JSON", async () => {
        const res = await fetch(`${base}/docs/json`)
        const body = (await res.json()) as { openapi?: string }
        equal(res.status, 200)
        ok(typeof body.openapi === "string")
    })

    test("rejects path traversal out of the Swagger UI asset directory", async () => {
        // Both the plain and the percent-encoded form must be refused; the
        // latter is the non-canonical variant behind GHSA-83w8-p2f5-377r.
        const paths = [
            "/docs/static/../../package.json",
            "/docs/static/%2e%2e/%2e%2e/package.json",
            "/docs/static/..%2f..%2fpackage.json",
        ]

        for (const path of paths) {
            const res = await fetch(`${base}${path}`, { redirect: "manual" })
            const body = await res.text()
            ok(
                res.status >= 400,
                `${path} should not be served (${res.status})`,
            )
            ok(!body.includes('"@darthcav/ts-http-server"'))
        }
    })
})
