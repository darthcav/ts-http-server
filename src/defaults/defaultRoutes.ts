import { methodNotAllowed, notAcceptable } from "@hapi/boom"
import type { RouteOptions } from "fastify"

/**
 * Returns the default route map used in {@link launcher}.
 *
 * Registers:
 * - `GET /` — renders `index.ejs` for `text/html`, throws 406 otherwise.
 * - `DELETE|PATCH|POST|PUT|OPTIONS /` — responds with 405 Method Not Allowed.
 * - `GET /api/` — returns a JSON welcome message.
 * - `DELETE|PATCH|POST|PUT /api/` — responds with 405 Method Not Allowed.
 *
 * Authentication is handled globally by the `preHandler` hook registered in
 * {@link launcher} when `locals.authPaths` is set.
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
        handler: async (_request, reply) => {
            reply.header("allow", "GET, HEAD")
            throw methodNotAllowed()
        },
    })

    return routes
}
