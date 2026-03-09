import type { FastifyReply, FastifyRequest } from "fastify"

/**
 * Fastify `onResponse` hook that logs completed request details:
 *
 * ```
 * {ip} -- {method} {url} HTTP/{httpVersion} {status} {size} {elapsed}ms "{referrer}" "{userAgent}"
 * ```
 *
 * Intended to be registered via:
 * ```ts
 * fastify.addHook("onResponse", onResponse)
 * ```
 *
 * Uses `reply.log.info` so each log record is automatically correlated with
 * the request ID assigned by Fastify.
 */
export default async function onResponse(
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<void> {
    const contentLength = reply.getHeader("content-length")
    const size = contentLength != null ? Number(contentLength) : "-"

    reply.log.info(
        `${request.ip} -- ${request.method} ${request.url} HTTP/${request.raw.httpVersion} ${reply.statusCode} ${size} ${Math.round(reply.elapsedTime)}ms "${request.headers["referer"] ?? "-"}" "${request.headers["user-agent"] ?? "-"}"`,
    )
}
