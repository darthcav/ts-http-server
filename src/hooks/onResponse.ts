import type { FastifyReply, FastifyRequest } from "fastify"

// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — neutralize control bytes to prevent log injection.
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g

/**
 * Replaces ASCII control characters (`\x00`–`\x1F` and `\x7F`, including CR and
 * LF) with the Unicode replacement character `�` so that client-controlled
 * values cannot forge or split log lines (CWE-117).
 */
function sanitize(value: string): string {
    return value.replace(CONTROL_CHARS, "�")
}

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
 * Client-controlled fields (URL, `Referer`, `User-Agent`) are sanitized via
 * {@link sanitize} so embedded control characters cannot forge log entries.
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

    const url = sanitize(request.url)
    const referer = sanitize(String(request.headers["referer"] ?? "-"))
    const userAgent = sanitize(String(request.headers["user-agent"] ?? "-"))

    const line = `${request.ip} -- ${request.method} ${url} HTTP/${request.raw.httpVersion} ${reply.statusCode} ${size} ${Math.round(reply.elapsedTime)}ms "${referer}" "${userAgent}"`

    if (reply.statusCode < 400) {
        reply.log.info(line)
    } else {
        reply.log.error(line)
    }
}
