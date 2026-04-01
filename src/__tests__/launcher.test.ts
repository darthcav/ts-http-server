import { equal, ok } from "node:assert/strict"
import { after, before, suite, test } from "node:test"
import { setTimeout } from "node:timers/promises"
import FastifyAccepts from "@fastify/accepts"
import type { Logger } from "@logtape/logtape"
import type { RouteOptions } from "fastify"
import launcher from "../launcher.ts"
import type { FSTPlugin } from "../types.ts"

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
    [
        "JSON_405",
        {
            method: ["POST", "PUT", "DELETE", "PATCH"],
            url: "/",
            handler: async (_request, reply) => {
                reply.header("allow", "GET, HEAD")
                return reply.status(405).send({ statusCode: 405 })
            },
        },
    ],
    [
        "ERROR_ROUTE",
        {
            method: "GET",
            url: "/error",
            handler: async () => {
                throw new Error("test server error")
            },
        },
    ],
    [
        "ERROR_INVALID_STATUS",
        {
            method: "GET",
            url: "/error-invalid-status",
            handler: async (
                _request: import("fastify").FastifyRequest,
                reply: import("fastify").FastifyReply,
            ) => {
                reply.status(600)
                throw new Error("error with out-of-range status code")
            },
        },
    ],
    [
        "ERROR_VALID_STATUS",
        {
            method: "GET",
            url: "/error-valid-status",
            handler: async (
                _request: import("fastify").FastifyRequest,
                reply: import("fastify").FastifyReply,
            ) => {
                reply.status(503)
                throw new Error("error with valid 5xx status code")
            },
        },
    ],
])

// ---------------------------------------------------------------------------
// HTTP server suite
// ---------------------------------------------------------------------------

suite("launcher [HTTP]", () => {
    const port = 19001
    const base = `http://localhost:${port}`
    let server: import("fastify").FastifyInstance

    before(async () => {
        server = launcher({
            logger: testLogger,
            locals: { port },
            plugins,
            routes,
            opts: { disableRequestLogging: true },
        })
        await setTimeout(500)
    })

    after(async () => {
        await setTimeout(200)
        await server.close()
    })

    test("GET / → 200 JSON", async () => {
        const res = await fetch(`${base}/`)
        equal(res.status, 200)
        const body = (await res.json()) as { ok: boolean }
        equal(body.ok, true)
    })

    test("POST / → 405", async () => {
        const res = await fetch(`${base}/`, { method: "POST" })
        equal(res.status, 405)
        equal(res.headers.get("allow"), "GET, HEAD")
    })

    test("GET /missing → 404 JSON", async () => {
        const res = await fetch(`${base}/missing`, {
            headers: { accept: "application/json" },
        })
        equal(res.status, 404)
        equal(
            res.headers.get("content-type"),
            "application/json; charset=utf-8",
        )
        const body = (await res.json()) as { statusCode: number }
        ok(body.statusCode)
        equal(body.statusCode, 404)
    })

    test("GET /missing → 404 plain text", async () => {
        const res = await fetch(`${base}/missing`, {
            headers: { accept: "text/plain" },
        })
        equal(res.status, 404)
    })

    test("GET /error → 500 JSON", async () => {
        const res = await fetch(`${base}/error`, {
            headers: { accept: "application/json" },
        })
        equal(res.status, 500)
    })

    test("GET /error → 500 plain text", async () => {
        const res = await fetch(`${base}/error`, {
            headers: { accept: "text/plain" },
        })
        equal(res.status, 500)
    })

    test("GET /error-invalid-status → 500 (statusCode > 599 reset to 500)", async () => {
        const res = await fetch(`${base}/error-invalid-status`, {
            headers: { accept: "application/json" },
        })
        equal(res.status, 500)
    })

    test("GET /error-valid-status → 503 (valid 4xx–5xx status preserved)", async () => {
        const res = await fetch(`${base}/error-valid-status`, {
            headers: { accept: "application/json" },
        })
        equal(res.status, 503)
    })
})
