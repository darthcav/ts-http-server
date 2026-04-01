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
    /** Client ID registered in the realm; used as the expected audience. */
    clientId: string
    /** Client secret for the registered client. */
    clientSecret: string
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
     * When `true`, the default `/api/` routes enforce bearer-token
     * authentication via the `verifyToken` Fastify decorator.
     */
    authRequired?: boolean
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
     * When omitted and `locals.authRequired` is `true`, all authenticated
     * routes will respond with `401 Unauthorized`.
     */
    verifyToken?: TokenVerifier
    /** Optional Fastify server options (merged over {@link defaultFastifyOptions}). */
    opts?: FastifyServerOptions
    /** Optional callback invoked once the server is listening. */
    done?: () => void
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
