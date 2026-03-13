import { equal, match, ok } from "node:assert/strict"
import { request as httpRequest } from "node:http"
import { after, before, suite, test } from "node:test"
import { setTimeout } from "node:timers/promises"
import type { Logger } from "@logtape/logtape"
import type { FastifyInstance, RouteOptions } from "fastify"
import defaultPlugins from "../defaults/defaultPlugins.ts"
import defaultRoutes from "../defaults/defaultRoutes.ts"
import launcher from "../launcher.ts"

// ---------------------------------------------------------------------------
// HTTP server suite
// ---------------------------------------------------------------------------

suite("defaultRoutes [HTTP]", () => {
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
    // Error route for 500 testing
    // ---------------------------------------------------------------------------
    function errorRoute(): Map<string, RouteOptions> {
        const routes = new Map<string, RouteOptions>()
        routes.set("ERROR_ROUTE", {
            method: "GET",
            url: "/error",
            handler: async () => {
                throw new Error("test server error")
            },
        })
        return routes
    }

    // ---------------------------------------------------------------------------
    // Full plugin + route setup (EJS views, static files, accepts negotiation)
    // ---------------------------------------------------------------------------
    const locals = {
        pkg: { name: "ts-http-server", version: "0.0.0", description: "Test" },
    }
    const plugins = defaultPlugins({ locals })
    const routes = new Map([...defaultRoutes(), ...errorRoute()])

    const port = 19002
    const base = `http://localhost:${port}`
    let server: FastifyInstance

    before(async () => {
        server = launcher({
            logger: testLogger,
            locals: { ...locals, port },
            plugins,
            routes,
            opts: { disableRequestLogging: true },
        })
        await setTimeout(1000)
    })

    after(async () => {
        await setTimeout(500)
        await server.close()
    })

    test("GET / → 200 text/html", async () => {
        const res = await fetch(`${base}/`)
        const body = await res.text()
        equal(res.status, 200)
        equal(res.statusText, "OK")
        match(res.headers.get("content-type") ?? "", /text\/html/)
        ok(body.includes("<!doctype html>"))
    })

    test("HEAD / → 200 text/html", async () => {
        const res = await fetch(`${base}/`, { method: "HEAD" })
        equal(res.status, 200)
        equal(res.statusText, "OK")
        match(res.headers.get("content-type") ?? "", /text\/html/)
    })

    test("GET / with application/json → 406 Not Acceptable (json)", async () => {
        const res = await fetch(`${base}/`, {
            headers: { accept: "application/json" },
        })
        const body = (await res.json()) as { statusCode: number; error: string }
        equal(res.status, 406)
        equal(res.statusText, "Not Acceptable")
        match(res.headers.get("content-type") ?? "", /application\/json/)
        equal(body.statusCode, 406)
        equal(body.error, "Not Acceptable")
    })

    test("POST / → 405 Method Not Allowed (html)", async () => {
        const res = await fetch(`${base}/`, { method: "POST" })
        const body = await res.text()
        equal(res.status, 405)
        equal(res.statusText, "Method Not Allowed")
        equal(res.headers.get("allow"), "GET, HEAD")
        match(res.headers.get("content-type") ?? "", /text\/html/)
        ok(body.includes("405"))
    })

    test("POST / with application/json → 405 Method Not Allowed (json)", async () => {
        const res = await fetch(`${base}/`, {
            method: "POST",
            headers: { accept: "application/json" },
        })
        const body = (await res.json()) as { statusCode: number; error: string }
        equal(res.status, 405)
        equal(res.statusText, "Method Not Allowed")
        equal(res.headers.get("allow"), "GET, HEAD")
        match(res.headers.get("content-type") ?? "", /application\/json/)
        equal(body.statusCode, 405)
        equal(body.error, "Method Not Allowed")
    })

    test("GET /missing → 404 Not Found (html)", async () => {
        const res = await fetch(`${base}/missing`)
        const body = await res.text()
        equal(res.status, 404)
        equal(res.statusText, "Not Found")
        match(res.headers.get("content-type") ?? "", /text\/html/)
        ok(body.includes("404"))
    })

    test("GET /missing with application/json → 404 Not Found (json)", async () => {
        const res = await fetch(`${base}/missing`, {
            headers: { accept: "application/json" },
        })
        const body = (await res.json()) as { statusCode: number; error: string }
        equal(res.status, 404)
        equal(res.statusText, "Not Found")
        match(res.headers.get("content-type") ?? "", /application\/json/)
        equal(body.statusCode, 404)
        equal(body.error, "Not Found")
    })

    test("GET /error → 500 Internal Server Error (html)", async () => {
        const res = await fetch(`${base}/error`)
        const body = await res.text()
        equal(res.status, 500)
        equal(res.statusText, "Internal Server Error")
        match(res.headers.get("content-type") ?? "", /text\/html/)
        ok(body.includes("500"))
    })

    test("GET /error with application/json → 500 Internal Server Error (json)", async () => {
        const res = await fetch(`${base}/error`, {
            headers: { accept: "application/json" },
        })
        const body = await res.json()
        equal(res.status, 500)
        equal(res.statusText, "Internal Server Error")
        match(res.headers.get("content-type") ?? "", /application\/json/)
        ok(body)
    })

    test("GET / with Referer header → 200 text/html", async () => {
        const res = await fetch(`${base}/`, {
            headers: { accept: "text/html", referer: `${base}/` },
        })
        equal(res.status, 200)
        match(res.headers.get("content-type") ?? "", /text\/html/)
    })

    test("GET / without User-Agent → 200 (covers onResponse user-agent fallback)", async () => {
        const status = await new Promise<number>((resolve, reject) => {
            const req = httpRequest(
                {
                    hostname: "localhost",
                    port,
                    path: "/",
                    method: "GET",
                    headers: { accept: "text/html" },
                },
                (res) => {
                    res.resume()
                    resolve(res.statusCode ?? 0)
                },
            )
            req.on("error", reject)
            req.end()
        })
        equal(status, 200)
    })

    test("GET /missing with text/plain → 404 plain text (Boom)", async () => {
        const res = await fetch(`${base}/missing`, {
            headers: { accept: "text/plain" },
        })
        const body = await res.text()
        equal(res.status, 404)
        match(res.headers.get("content-type") ?? "", /text\/plain/)
        ok(body.includes("Not Found"))
    })
})
