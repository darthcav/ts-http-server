import { unauthorized } from "@hapi/boom"
import type { FastifyReply, FastifyRequest } from "fastify"
import picomatch from "picomatch"

/**
 * Factory that creates a Fastify `preHandler` hook enforcing bearer-token
 * authentication on any route whose URL matches one of the given glob patterns.
 *
 * The returned hook is intended to be registered globally via
 * `fastify.addHook("preHandler", createAuthPreHandler(authPaths))`.
 * For every request, `request.routeOptions.url` is tested against the compiled
 * picomatch matcher; non-matching routes pass through unconditionally.
 *
 * When a route is protected, token verification is delegated to the
 * `verifyToken` decorator registered on the Fastify instance.
 *
 * @param authPaths - Array of picomatch glob patterns (e.g. `["/api/**"]`).
 * @param realm - Protection-space label used in the `WWW-Authenticate` challenge
 *   (RFC 6750). Typically the Keycloak realm name. Defaults to `"api"`.
 */
export function createAuthPreHandler(
    authPaths: string[],
    realm = "api",
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
    const isProtected = picomatch(authPaths)
    return async function authPreHandler(
        request: FastifyRequest,
        reply: FastifyReply,
    ): Promise<void> {
        if (!isProtected(request.routeOptions.url ?? "")) {
            return
        }
        const isAuthorized = await request.server.verifyToken(
            request.headers.authorization,
        )
        if (!isAuthorized) {
            reply.header("www-authenticate", `Bearer realm="${realm}"`)
            throw unauthorized("Missing or invalid bearer token")
        }
    }
}
