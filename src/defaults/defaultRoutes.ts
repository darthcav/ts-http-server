import { methodNotAllowed, notAcceptable } from "@hapi/boom"
import type { RouteOptions } from "fastify"

/**
 * Returns the default route map used in {@link launcher}.
 *
 * Registers:
 * - `GET /` — renders `index.ejs` for `text/html`, throws 406 otherwise.
 * - `DELETE|PATCH|POST|PUT|OPTIONS /` — responds with 405 Method Not Allowed.
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

    return routes
}
