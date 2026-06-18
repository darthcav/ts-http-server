import { equal, rejects } from "node:assert/strict"
import { suite, test } from "node:test"
import type { Boom } from "@hapi/boom"
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { createMethodNotAllowedHandler } from "../handlers/methodNotAllowedHandler.ts"

suite("createMethodNotAllowedHandler", () => {
    // Minimal reply stub recording the last `Allow` header value.
    function makeReply(): { reply: FastifyReply; allow: () => string } {
        let allow = ""
        const reply = {
            header: (name: string, value: string) => {
                if (name === "allow") {
                    allow = value
                }
                return reply
            },
        } as unknown as FastifyReply
        return { reply, allow: () => allow }
    }

    const request = {} as FastifyRequest
    // Fastify route handlers carry a `this: FastifyInstance` context; the
    // handler does not use it, so a bare stub suffices for invocation.
    const server = {} as FastifyInstance

    test("joins the allowed methods into the Allow header", async () => {
        const { reply, allow } = makeReply()
        const handler = createMethodNotAllowedHandler(["GET", "HEAD", "POST"])

        await rejects(async () => handler.call(server, request, reply))
        equal(allow(), "GET, HEAD, POST")
    })

    test("emits a single method without a separator", async () => {
        const { reply, allow } = makeReply()
        const handler = createMethodNotAllowedHandler(["GET"])

        await rejects(async () => handler.call(server, request, reply))
        equal(allow(), "GET")
    })

    test("throws a Boom 405 error", async () => {
        const { reply } = makeReply()
        const handler = createMethodNotAllowedHandler(["GET", "HEAD"])

        await rejects(
            async () => handler.call(server, request, reply),
            (error: Boom) => {
                equal(error.isBoom, true)
                equal(error.output.statusCode, 405)
                return true
            },
        )
    })
})
