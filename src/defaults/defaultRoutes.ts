import process from "node:process"
import { notAcceptable } from "@hapi/boom"
import type { RouteOptions } from "fastify"
import { createMethodNotAllowedHandler } from "../handlers/methodNotAllowedHandler.ts"
import type {
    DefaultRoutesOptions,
    HealthCheck,
    HealthCheckResult,
    HealthStatus,
} from "../types.ts"

/** Returns the worse of two health statuses (`fail` > `warn` > `pass`). */
function worstStatus(a: HealthStatus, b: HealthStatus): HealthStatus {
    if (a === "fail" || b === "fail") {
        return "fail"
    }
    if (a === "warn" || b === "warn") {
        return "warn"
    }
    return "pass"
}

/**
 * Runs all dependency health checks concurrently and aggregates them into the
 * IETF `checks` object plus an overall status.
 *
 * Each check runs in isolation: a thrown error becomes a `fail` result with the
 * error message in `output`. The `time` field is stamped on every result.
 */
async function evaluateChecks(healthChecks: readonly HealthCheck[]): Promise<{
    status: HealthStatus
    checks: Record<string, HealthCheckResult[]>
}> {
    const time = new Date().toISOString()
    const entries = await Promise.all(
        healthChecks.map(async (hc): Promise<[string, HealthCheckResult]> => {
            try {
                return [hc.name, { ...(await hc.run()), time }]
            } catch (error) {
                return [
                    hc.name,
                    {
                        status: "fail",
                        output:
                            error instanceof Error
                                ? error.message
                                : String(error),
                        time,
                    },
                ]
            }
        }),
    )

    const checks: Record<string, HealthCheckResult[]> = {}
    let status: HealthStatus = "pass"
    for (const [name, result] of entries) {
        const group = checks[name] ?? []
        group.push(result)
        checks[name] = group
        status = worstStatus(status, result.status)
    }
    return { status, checks }
}

/**
 * Returns the default route map used in {@link launcher}.
 *
 * Registers:
 * - `GET /` — renders `index.ejs` for `text/html`, throws 406 otherwise.
 * - `DELETE|PATCH|POST|PUT|OPTIONS /` — responds with 405 Method Not Allowed.
 * - `GET /api/` — returns a JSON welcome message.
 * - `DELETE|PATCH|POST|PUT /api/` — responds with 405 Method Not Allowed.
 * - `GET /health` — returns a JSON health/status report
 *   (`application/health+json`, per the IETF "Health Check Response Format for
 *   HTTP APIs" draft). Evaluates any `opts.healthChecks` and responds `200`
 *   when the overall status is `pass`/`warn`, or `503` when it is `fail`.
 * - `DELETE|PATCH|POST|PUT /health` — responds with 405 Method Not Allowed.
 *
 * Authentication is handled globally by the `preHandler` hook registered in
 * {@link launcher} when `locals.authPaths` is set.
 *
 * @param opts - Optional configuration; see {@link DefaultRoutesOptions}.
 * @returns A `Map` of route names to `RouteOptions`, suitable for passing as
 *   the `routes` field of {@link LauncherOptions}.
 */
export default function defaultRoutes(
    opts?: DefaultRoutesOptions,
): Map<string, RouteOptions> {
    const healthChecks = opts?.healthChecks ?? []
    const routes = new Map<string, RouteOptions>()

    routes.set("INDEX", {
        method: "GET",
        url: "/",
        exposeHeadRoute: true,
        handler: async (request, reply) => {
            const accept = request.accepts()
            if (accept.type(["html"]) !== "html") {
                throw notAcceptable()
            }
            return reply.type("text/html").view("index.ejs", {
                menu_name: "index",
                header: "Welcome page",
            })
        },
    })
    routes.set("INDEX_405", {
        method: ["DELETE", "PATCH", "POST", "PUT", "OPTIONS"],
        url: "/",
        handler: createMethodNotAllowedHandler(["GET", "HEAD"]),
    })
    routes.set("API_INDEX", {
        method: "GET",
        url: "/api/",
        exposeHeadRoute: true,
        handler: async (request, reply) => {
            const { locals } = request.server
            const accept = request.accepts()
            if (accept.type(["json"]) !== "json") {
                throw notAcceptable()
            }
            return reply.type("application/json").send({
                message: `Welcome to the index page of the server API :: ${locals.pkg?.["name"]}`,
            })
        },
    })
    routes.set("API_INDEX_405", {
        method: ["DELETE", "PATCH", "POST", "PUT"],
        url: "/api/",
        handler: createMethodNotAllowedHandler(["GET", "HEAD"]),
    })
    routes.set("HEALTH", {
        method: "GET",
        url: "/health",
        exposeHeadRoute: true,
        handler: async (request, reply) => {
            const { pkg } = request.server.locals
            const memory = process.memoryUsage()
            const { status, checks } = await evaluateChecks(healthChecks)
            return reply
                .type("application/health+json")
                .code(status === "fail" ? 503 : 200)
                .send({
                    status,
                    version: pkg?.["version"],
                    releaseId: pkg?.["version"],
                    serviceId: pkg?.["name"],
                    description: pkg?.["description"],
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    ...(healthChecks.length > 0 ? { checks } : {}),
                    environment: {
                        nodeVersion: process.version,
                        platform: process.platform,
                        arch: process.arch,
                        pid: process.pid,
                        nodeEnv: process.env["NODE_ENV"] ?? "development",
                    },
                    memory: {
                        rss: memory.rss,
                        heapTotal: memory.heapTotal,
                        heapUsed: memory.heapUsed,
                        external: memory.external,
                    },
                })
        },
    })
    routes.set("HEALTH_405", {
        method: ["DELETE", "PATCH", "POST", "PUT", "OPTIONS"],
        url: "/health",
        handler: createMethodNotAllowedHandler(["GET", "HEAD"]),
    })

    return routes
}
