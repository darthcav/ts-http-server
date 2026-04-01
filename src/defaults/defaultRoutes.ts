import { methodNotAllowed, notAcceptable, unauthorized } from "@hapi/boom"
import type { FastifyReply, FastifyRequest, RouteOptions } from "fastify"

/**
 * Pre-handler that enforces bearer-token authentication on a route.
 *
 * Authentication is only checked when `request.server.locals.authRequired`
 * is `true`; otherwise the request passes through unconditionally. When
 * enforced, the request is validated using the `verifyToken` decorator
 * registered on the Fastify instance.
 */
async function apiAuthPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<void> {
    if (!request.server.locals.authRequired) {
        return
    }

    const isAuthorized = await request.server.verifyToken(
        request.headers.authorization,
    )
    if (!isAuthorized) {
        reply.header("www-authenticate", 'Bearer realm="api"')
        throw unauthorized("Missing or invalid bearer token")
    }
}

/**
 * Returns the default route map used in {@link launcher}.
 *
 * Registers:
 * - `GET /` — renders `index.ejs` for `text/html`, throws 406 otherwise.
 * - `DELETE|PATCH|POST|PUT|OPTIONS /` — responds with 405 Method Not Allowed.
 * - `GET /api/` — returns a JSON welcome message; bearer-token protected
 *   when `locals.authRequired` is `true`.
 * - `DELETE|PATCH|POST|PUT /api/` — responds with 405 Method Not Allowed;
 *   also bearer-token protected when `locals.authRequired` is `true`.
 *
 * Authentication is evaluated at request time: the pre-handler reads
 * `request.server.locals.authRequired` and delegates token verification to
 * the `verifyToken` decorator on the Fastify instance.
 */
export default function defaultRoutes(): Map<string, RouteOptions> {
    const routes = new Map<string, RouteOptions>()

    routes.set("INDEX", {
        method: "GET",
        url: "/",
        exposeHeadRoute: true,
        handler: async (request, reply) => {
            const accept = request.accepts()
            switch (accept.type(["html"])) {
                case "html":
                    return reply.type("text/html").view("index.ejs", {
                        menu_name: "index",
                        header: "Welcome page",
                    })
                default:
                    throw notAcceptable()
            }
        },
    })
    routes.set("INDEX_405", {
        method: ["DELETE", "PATCH", "POST", "PUT", "OPTIONS"],
        url: "/",
        handler: async (_request, reply) => {
            reply.header("allow", "GET, HEAD")
            throw methodNotAllowed()
        },
    })
    routes.set("API_INDEX", {
        method: "GET",
        url: "/api/",
        exposeHeadRoute: true,
        preHandler: apiAuthPreHandler,
        handler: async (request, reply) => {
            const { locals } = request.server
            const accept = request.accepts()
            switch (accept.type(["json"])) {
                case "json":
                    return reply.type("application/json").send({
                        message: `Welcome to the index page of the server API :: ${locals.pkg?.["name"]}`,
                    })
                default:
                    throw notAcceptable()
            }
        },
    })
    routes.set("API_INDEX_405", {
        method: ["DELETE", "PATCH", "POST", "PUT"],
        url: "/api/",
        preHandler: apiAuthPreHandler,
        handler: async (_request, reply) => {
            reply.header("allow", "GET, HEAD")
            throw methodNotAllowed()
        },
    })

    return routes
}
