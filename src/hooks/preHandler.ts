import type { FastifyReply, FastifyRequest } from "fastify"

/**
 * Fastify `preHandler` hook that logs incoming request details:
 *
 * ```
 * Incoming request: {method} {url} HTTP/{httpVersion} from {ip}
 * ```
 *
 * Intended to be registered via:
 * ```ts
 * fastify.addHook("preHandler", preHandler)
 * ```
 *
 * Uses `request.log.info` so each log record is automatically correlated with
 * the request ID assigned by Fastify.
 */
export default async function preHandler(
    request: FastifyRequest,
    _reply: FastifyReply
): Promise<void> {
    request.log.debug(
        `Incoming request [${request.id}]: ${request.method} ${request.url} HTTP/${request.raw.httpVersion} from ${request.ip}`,
    )
}
