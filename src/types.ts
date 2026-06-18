import type { FastifyCorsOptions } from "@fastify/cors"
import type { Logger } from "@logtape/logtape"
import type {
    FastifyPluginAsync,
    FastifyPluginCallback,
    FastifyPluginOptions,
    FastifyServerOptions,
    RouteOptions,
} from "fastify"

/**
 * A plugin entry combining a Fastify plugin function with its options,
 * stored in the plugins `Map` passed to {@link launcher}.
 */
export type FSTPlugin = {
    /** The Fastify plugin function to register. */
    // biome-ignore lint/suspicious/noExplicitAny: plugin opts types vary per third-party plugin; any is required for assignability
    plugin: FastifyPluginCallback<any> | FastifyPluginAsync<any>
    /** Optional options forwarded to the plugin on registration. */
    opts?: FastifyPluginOptions
}

/**
 * Configuration for Keycloak-backed JWT authentication.
 */
export type KeycloakAuthConfig = {
    /** Keycloak server base URL, e.g. `https://auth.example.com`. */
    url: string
    /** Keycloak realm name. */
    realm: string
    /**
     * Client ID registered in the realm. Used as the expected `aud` (audience)
     * claim when verifying bearer tokens, so tokens minted for other clients in
     * the same realm are rejected.
     */
    clientId: string
}

/**
 * Async function that verifies a bearer token from the `Authorization` header.
 *
 * Return `true` to allow the request, `false` to reject it with the default
 * 401 response, or throw to surface a custom error.
 */
export type TokenVerifier = (
    authorizationHeader: string | undefined,
) => Promise<boolean>

/**
 * Application locals decorated onto the Fastify instance and available
 * throughout the request lifecycle.
 */
export type LauncherLocals = {
    /** Package metadata (e.g. contents of `package.json`). */
    pkg?: Record<string, unknown>
    /** Hostname the server will bind to. */
    host?: string
    /** Port the server will listen on. */
    port?: number
    /**
     * Glob patterns (picomatch) for routes that require bearer-token
     * authentication via the `verifyToken` Fastify decorator.
     * When `undefined` or empty, authentication is disabled.
     *
     * Example: `["/api/**"]`
     */
    authPaths?: string[]
    /**
     * Protection-space label used in the `WWW-Authenticate` challenge (RFC 6750).
     * Typically the Keycloak realm name. Defaults to `"api"` when omitted.
     */
    authRealm?: string
    /** Any additional application-specific locals. */
    [key: string]: unknown
}

/**
 * Options passed to the {@link launcher} function.
 */
export type LauncherOptions = {
    /** Logger instance used for error and info output. */
    logger: Logger
    /** Application locals decorated onto the Fastify instance. */
    locals: LauncherLocals
    /** Map of named plugins to register. */
    plugins: Map<string, FSTPlugin>
    /** Map of named routes to register. */
    routes: Map<string, RouteOptions>
    /** Map of named decorators to add to the Fastify instance. */
    decorators?: Map<string, unknown>
    /**
     * Token verifier registered as the `verifyToken` Fastify decorator.
     *
     * When omitted and `locals.authPaths` is set, all protected routes will
     * respond with `401 Unauthorized`.
     */
    verifyToken?: TokenVerifier
    /** Optional Fastify server options (merged over {@link defaultFastifyOptions}). */
    opts?: FastifyServerOptions
    /** Optional callback invoked once the server is listening. */
    done?: () => void
}

/**
 * Status indicator for a health check or the overall service, following the
 * IETF "Health Check Response Format for HTTP APIs" draft.
 *
 * - `pass` — healthy (HTTP `200`).
 * - `warn` — healthy but with concerns (HTTP `200`).
 * - `fail` — unhealthy (HTTP `503`).
 */
export type HealthStatus = "pass" | "warn" | "fail"

/**
 * Result of a single dependency health check, mapped into the `checks` object
 * of the `/health` response per the IETF Health Check Response Format.
 *
 * The `time` field is populated automatically by the `/health` handler; any
 * value supplied here is overwritten.
 */
export type HealthCheckResult = {
    /** Status of the checked component. */
    status: HealthStatus
    /** Unique identifier of the checked component instance. */
    componentId?: string
    /** Type of component, e.g. `datastore`, `system`, `component`. */
    componentType?: string
    /** Observed value of the measurement (e.g. a latency or count). */
    observedValue?: unknown
    /** Unit of `observedValue`, e.g. `ms`, `s`, `%`. */
    observedUnit?: string
    /** Free-form output, typically an error message when `status` is `fail`. */
    output?: string
    /** ISO 8601 time the check was evaluated; set automatically. */
    time?: string
}

/**
 * A named dependency health check evaluated by the default `/health` route.
 *
 * Checks run concurrently on every request. A check that throws is reported as
 * `fail` with the error message in `output`. The overall service `status` is
 * the worst of all check statuses (`fail` > `warn` > `pass`).
 */
export type HealthCheck = {
    /**
     * Component identifier, conventionally `componentName:measurementName`
     * (e.g. `database:responseTime`). Checks sharing a name are grouped into
     * the same array in the `checks` object.
     */
    name: string
    /** Produces the check result; may be async. Thrown errors map to `fail`. */
    run: () => HealthCheckResult | Promise<HealthCheckResult>
}

/**
 * Options accepted by the {@link defaultRoutes} function.
 */
export type DefaultRoutesOptions = {
    /**
     * Dependency health checks evaluated by the default `GET /health` route.
     * When omitted or empty, the report contains no `checks` object and the
     * service status is always `pass`.
     */
    healthChecks?: HealthCheck[]
}

/**
 * Options accepted by the {@link defaultPlugins} function.
 */
export type DefaultPluginsOptions = {
    /** Application locals; `locals.pkg` is exposed as the default EJS context. */
    locals: LauncherLocals
    /** Optional base directory for resolving the `src/` folder; defaults to the parent of `import.meta.dirname`. */
    baseDir?: string | null
    /** Optional Keycloak configuration used to mark the generated `/api/` OpenAPI operations as OpenID Connect–protected. */
    keycloakAuth?: KeycloakAuthConfig
    /**
     * Options forwarded to `@fastify/cors`. Merged over a secure default of
     * `{ origin: false }`, which disables cross-origin requests (same-origin
     * only). To allow specific origins, set `cors: { origin: [...] }` with an
     * explicit allowlist; avoid `origin: true` (reflects every origin) in
     * production.
     */
    cors?: FastifyCorsOptions
    /**
     * Whether to register Swagger UI (`/docs`) and the OpenAPI spec endpoints.
     * These publish the full endpoint map and are reachable unauthenticated, so
     * they are disabled in production by default. When omitted, defaults to
     * `true` unless `NODE_ENV === "production"`, in which case it defaults to
     * `false`. Set explicitly to override.
     */
    docs?: boolean
}

/**
 * Fastify module augmentation that exposes {@link LauncherLocals} and the
 * {@link TokenVerifier} as first-class decorators on every `FastifyInstance`.
 *
 * Both are registered in {@link launcher} via `fastify.decorate(...)`.
 */
declare module "fastify" {
    interface FastifyInstance {
        locals: LauncherLocals
        verifyToken: TokenVerifier
    }
}
