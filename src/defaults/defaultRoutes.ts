import { methodNotAllowed, notAcceptable, unauthorized } from "@hapi/boom"
import type { FastifyReply, FastifyRequest, RouteOptions } from "fastify"
import type { DefaultRoutesOptions } from "../types.ts"

function createApiAuthPreHandler(
    apiAuth: NonNullable<DefaultRoutesOptions["apiAuth"]>,
) {
    return async function apiAuthPreHandler(
        request: FastifyRequest,
        reply: FastifyReply,
    ): Promise<void> {
        const authorizationHeader = request.headers.authorization
        const isAuthorized =
            "validateAuthorization" in apiAuth
                ? await apiAuth.validateAuthorization(
                      authorizationHeader,
                      request,
                  )
                : authorizationHeader === `Bearer ${apiAuth.bearerToken}`

        if (!isAuthorized) {
            reply.header(
                "www-authenticate",
                `Bearer realm="${apiAuth.realm ?? "api"}"`,
            )
            throw unauthorized("Missing or invalid bearer token")
        }
    }
}

/**
 * Returns the default route map used in {@link launcher}.
 *
 * Registers:
 * - `GET /` — renders `index.ejs` for `text/html`, throws 406 otherwise.
 * - `DELETE|PATCH|POST|PUT|OPTIONS /` — responds with 405 Method Not Allowed.
 *
 * When `opts.apiAuth` is provided, the default `/api/` routes require a bearer
 * token and respond with `401 Unauthorized` plus `WWW-Authenticate: Bearer`
 * when the request does not satisfy the configured validator.
 */
export default function defaultRoutes(
    opts: DefaultRoutesOptions = {},
): Map<string, RouteOptions> {
    const { apiAuth } = opts
    const apiAuthPreHandler = apiAuth ? createApiAuthPreHandler(apiAuth) : null
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
    const apiIndexRoute: RouteOptions = {
        method: "GET",
        url: "/api/",
        exposeHeadRoute: true,
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
    }
    if (apiAuthPreHandler) {
        apiIndexRoute.preHandler = apiAuthPreHandler
    }
    routes.set("API_INDEX", apiIndexRoute)

    const apiIndex405Route: RouteOptions = {
        method: ["DELETE", "PATCH", "POST", "PUT"],
        url: "/api/",
        handler: async (_request, reply) => {
            reply.header("allow", "GET, HEAD")
            throw methodNotAllowed()
        },
    }
    if (apiAuthPreHandler) {
        apiIndex405Route.preHandler = apiAuthPreHandler
    }
    routes.set("API_INDEX_405", apiIndex405Route)

    return routes
}
