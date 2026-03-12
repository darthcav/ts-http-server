import { equal, ok } from "node:assert/strict"
import { after, before, suite, test } from "node:test"
import { setTimeout } from "node:timers/promises"
import FastifyAccepts from "@fastify/accepts"
import type { Logger } from "@logtape/logtape"
import type { RouteOptions } from "fastify"
import launcher from "../launcher.ts"
import type { FSTPlugin } from "../types.ts"

// ---------------------------------------------------------------------------
// Suite covering decorators map and done callback
// ---------------------------------------------------------------------------

suite("launcher [HTTP] with decorators and done callback", () => {
    // ---------------------------------------------------------------------------
    // Minimal test logger (no real I/O)
    // ---------------------------------------------------------------------------
    const noop = (): void => {}
    const testLogger = {
        category: ["test"],
        info: noop,
        error: noop,
        warn: noop,
        debug: noop,
        getChild: () => testLogger,
    } as unknown as Logger

    // ---------------------------------------------------------------------------
    // Minimal plugins and routes (no EJS/static required)
    // ---------------------------------------------------------------------------
    const plugins = new Map<string, FSTPlugin>([
        ["@fastify/accepts", { plugin: FastifyAccepts }],
    ])
    const routes = new Map<string, RouteOptions>([
        [
            "JSON_OK",
            {
                method: "GET",
                url: "/",
                handler: async (_request, reply) => reply.send({ ok: true }),
            },
        ],
    ])

    const port = 19003
    const base = `http://localhost:${port}`
    let server: import("fastify").FastifyInstance
    let doneWasCalled = false

    before(async () => {
        server = launcher({
            logger: testLogger,
            locals: { port },
            plugins,
            routes,
            decorators: new Map([["myDecorator", true]]),
            opts: { disableRequestLogging: true },
            done: () => {
                doneWasCalled = true
            },
        })
        await setTimeout(500)
    })

    after(async () => {
        await setTimeout(200)
        await server.close()
    })

    test("done callback is invoked on successful listen", () => {
        ok(doneWasCalled)
    })

    test("GET / → 200 JSON with decorators registered", async () => {
        const res = await fetch(`${base}/`)
        equal(res.status, 200)
        const body = (await res.json()) as { ok: boolean }
        equal(body.ok, true)
    })
})
