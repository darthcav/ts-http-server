import { methodNotAllowed } from "@hapi/boom"
import type { RouteOptions } from "fastify"

/**
 * Creates a Fastify route handler that responds with `405 Method Not Allowed`,
 * advertising the permitted methods via the `Allow` header (RFC 9110 §10.2.1).
 *
 * Intended for the catch-all route of a path whose allowed methods are handled
 * by separate route definitions, e.g.:
 * ```ts
 * routes.set("INDEX_405", {
 *     method: ["DELETE", "PATCH", "POST", "PUT", "OPTIONS"],
 *     url: "/",
 *     handler: createMethodNotAllowedHandler(["GET", "HEAD"]),
 * })
 * ```
 *
 * @param allowedMethods - The HTTP methods permitted on the route, joined into
 *   the `Allow` response header (e.g. `["GET", "HEAD"]`).
 * @returns A Fastify route handler that sets the `Allow` header and throws a
 *   Boom `405` error.
 */
export function createMethodNotAllowedHandler(
    allowedMethods: string[],
): RouteOptions["handler"] {
    const allow = allowedMethods.join(", ")
    return async (_request, reply) => {
        reply.header("allow", allow)
        throw methodNotAllowed()
    }
}
