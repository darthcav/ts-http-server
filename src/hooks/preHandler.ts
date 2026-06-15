import type { FastifyReply, FastifyRequest } from "fastify"

/**
 * Browser-initiated probe paths answered with an empty `204 No Content` instead
 * of falling through to the `notFound` handler (which would log a 404 error).
 *
 * Currently covers the Chromium DevTools automatic workspace discovery endpoint.
 */
const NO_CONTENT_PATHS = new Set([
    "/.well-known/appspecific/com.chrome.devtools.json",
])

/**
 * Fastify `preHandler` hook that logs incoming request details:
 *
 * ```
 * Incoming request [{id}]: {method} {url} HTTP/{httpVersion} from {ip}
 * ```
 *
 * Intended to be registered via:
 * ```ts
 * fastify.addHook("preHandler", preHandler)
 * ```
 *
 * Uses `request.log.debug` so each log record is automatically correlated with
 * the request ID assigned by Fastify.
 *
 * Requests whose URL is in `NO_CONTENT_PATHS` (e.g. the Chromium DevTools
 * discovery probe) are short-circuited with an empty `204 No Content` response,
 * preventing them from reaching the `notFound` handler and being logged as 404
 * errors.
 *
 * @param request - The incoming Fastify request to log.
 * @param reply - The Fastify reply, used to short-circuit known probe paths.
 */
export default async function preHandler(
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<void> {
    request.log.debug(
        `Incoming request [${request.id}]: ${request.method} ${request.url} HTTP/${request.raw.httpVersion} from ${request.ip}`,
    )

    if (NO_CONTENT_PATHS.has(request.url)) {
        await reply.code(204).send()
    }
}
