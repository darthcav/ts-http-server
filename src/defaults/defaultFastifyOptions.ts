import { randomUUID } from "node:crypto"
import type { Logger } from "@logtape/logtape"
import type { FastifyServerOptions } from "fastify"
import getConsoleFastifyLogger from "./getConsoleFastifyLogger.ts"

/**
 * Returns base `FastifyServerOptions` used as defaults in {@link launcher}.
 *
 * Uses `getConsoleFastifyLogger` as `loggerInstance` so that all Fastify
 * internal logs are routed through LogTape under `logger.category`.
 * Built-in per-request logging is disabled in favor of the {@link preHandler}
 * and {@link onResponse} hooks, which emit structured access log lines.
 *
 * Generates request IDs via `crypto.randomUUID()` and enables proxy trust.
 * Callers may override any field by spreading their own options on top.
 *
 * @param logger - The application LogTape logger; its category is used as the
 *   base category for Fastify's own logger.
 * @returns Base `FastifyServerOptions` to spread into the `Fastify(...)` call.
 */
export default function defaultFastifyOptions(
    logger: Logger,
): FastifyServerOptions {
    return {
        genReqId: () => randomUUID(),
        trustProxy: true,
        disableRequestLogging: true,
        loggerInstance: getConsoleFastifyLogger([...logger.category]),
    }
}
