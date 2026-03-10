import type { Boom } from "@hapi/boom"
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify"

/**
 * Fastify error handler supporting Boom errors and generic errors.
 *
 * Negotiates the response format via `@fastify/accepts`:
 * - `text/html` — renders `_error.ejs` (requires `@fastify/view`).
 * - `application/json` — JSON payload.
 * - Otherwise — plain-text.
 *
 * For Boom errors the HTTP status code and payload come from `error.output`.
 * For generic errors a 500 is used unless the reply already has a 4xx/5xx status.
 */
export default async function defaultErrorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<void> {
    const accept = request.accepts()
    const boom = error as unknown as Boom

    if (boom.isBoom) {
        const payload = boom.output.payload
        payload.message = boom.message

        reply.status(payload.statusCode)

        switch (accept.type(["html", "json"])) {
            case "html":
                return reply.type("text/html").view("_error", {
                    menu_name: "",
                    header: `HTTP error ${payload.statusCode} (${payload.message})`,
                    uri: request.url,
                    status: payload.statusCode,
                    message: payload.message,
                })
            case "json":
                return reply.type("application/json").send(payload)
            default:
                return reply
                    .type("text/plain")
                    .send(`${payload.error} :: ${payload.message}`)
        }
    } else {
        if (
            !reply.statusCode ||
            reply.statusCode < 400 ||
            reply.statusCode > 599
        ) {
            reply.status(500)
        }

        switch (accept.type(["html", "json"])) {
            case "html":
                return reply.type("text/html").view("_error", {
                    menu_name: "",
                    header: `HTTP error ${reply.statusCode} (${error.message})`,
                    uri: request.url,
                    status: reply.statusCode,
                    message: error.message,
                })
            case "json":
                return reply.type("application/json").send(error)
            default:
                return reply.type("text/plain").send(JSON.stringify(error))
        }
    }
}
