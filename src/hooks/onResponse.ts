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
 * Uses `reply.log.info` for 2xx/3xx and `reply.log.error` for 4xx/5xx,
 * so each log record is automatically correlated with the request ID assigned by Fastify.
 *
 * @param request - The completed Fastify request.
 * @param reply - The Fastify reply containing status, headers, and elapsed time.
 */
export default async function onResponse(
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<void> {
    const contentLength = reply.getHeader("content-length")
    const size = contentLength != null ? Number(contentLength) : "-"

    if (reply.statusCode < 400) {
        reply.log.info(
            `${request.ip} -- ${request.method} ${request.url} HTTP/${request.raw.httpVersion} ${reply.statusCode} ${size} ${Math.round(reply.elapsedTime)}ms "${request.headers["referer"] ?? "-"}" "${request.headers["user-agent"] ?? "-"}"`,
        )
    } else {
        reply.log.error(
            `${request.ip} -- ${request.method} ${request.url} HTTP/${request.raw.httpVersion} ${reply.statusCode} ${size} ${Math.round(reply.elapsedTime)}ms "${request.headers["referer"] ?? "-"}" "${request.headers["user-agent"] ?? "-"}"`,
        )
    }
}
