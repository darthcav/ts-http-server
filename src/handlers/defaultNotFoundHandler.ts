import "@fastify/view"
import { notFound } from "@hapi/boom"
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"

/**
 * Fastify `notFound` handler.
 *
 * Negotiates the response format via `@fastify/accepts`:
 * - `text/html` — EJS `_error` view.
 * - `application/json` — Boom JSON payload.
 * - Otherwise — plain-text JSON serialization.
 *
 * Bound to the Fastify instance (`this`) so it can access `this.locals`.
 */
export default function defaultNotFoundHandler(
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): void {
    const accept = request.accepts()
    const payload = notFound().output.payload

    switch (accept.type(["html", "json"])) {
        case "html":
            void reply.status(payload.statusCode).view("_error", {
                header: `HTTP ${payload.statusCode}`,
                menu_name: "_error",
                status: payload.statusCode,
                uri: request.url,
                message: payload.message,
            })
            return
        case "json":
            void reply
                .status(payload.statusCode)
                .type("application/json")
                .send(payload)
            return
        default:
            void reply
                .status(payload.statusCode)
                .type("text/plain")
                .send(JSON.stringify(payload))
    }
}
