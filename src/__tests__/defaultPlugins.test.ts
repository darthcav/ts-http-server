import { equal, ok } from "node:assert/strict"
import { cwd } from "node:process"
import { suite, test } from "node:test"
import defaultPlugins from "../defaults/defaultPlugins.ts"

suite("defaultPlugins", () => {
    const locals = {
        pkg: { name: "ts-http-server", version: "0.0.0", description: "Test" },
    }

    test("returns all plugins using default baseDir", () => {
        const plugins = defaultPlugins({ locals })
        equal(plugins.size, 7)
        ok(plugins.has("@fastify/accepts"))
        ok(plugins.has("@fastify/view"))
        ok(plugins.has("@fastify/static"))
    })

    test("returns all plugins using explicit baseDir", () => {
        const plugins = defaultPlugins({ locals, baseDir: cwd() })
        equal(plugins.size, 7)
        ok(plugins.has("@fastify/view"))
        ok(plugins.has("@fastify/static"))
    })
})
