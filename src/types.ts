import type { Logger } from "@logtape/logtape"
import type {
    FastifyPluginAsync,
    FastifyPluginCallback,
    FastifyPluginOptions,
    FastifyRequest,
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
 * Callback used to validate the `Authorization` header for default API routes.
 *
 * Return `true` to allow the request, `false` to reject it with the default
 * 401 response, or throw to surface a custom error.
 */
export type ApiAuthValidator = (
    authorizationHeader: string | undefined,
    request: FastifyRequest,
) => boolean | Promise<boolean>

/**
 * Optional authentication configuration for the default `/api/` routes and
 * generated OpenAPI document.
 */
export type ApiAuthConfig = {
    /** Optional realm used in the `WWW-Authenticate` challenge header. */
    realm?: string
} & (
    | {
          /** Static bearer token accepted by the default API auth guard. */
          bearerToken: string
          validateAuthorization?: never
      }
    | {
          /** Custom validator for the incoming `Authorization` header. */
          validateAuthorization: ApiAuthValidator
          bearerToken?: never
      }
)

/**
 * Options accepted by the {@link defaultPlugins} function.
 */
export type DefaultPluginsOptions = {
    /** Application locals; `locals.pkg` is exposed as the default EJS context. */
    locals: LauncherLocals
    /** Optional base directory for resolving the `src/` folder; defaults to the parent of `import.meta.dirname`. */
    baseDir?: string | null
    /** Optional auth configuration used to mark the generated `/api/` OpenAPI operations as bearer-protected. */
    apiAuth?: ApiAuthConfig
}

/**
 * Options accepted by the {@link defaultRoutes} function.
 */
export type DefaultRoutesOptions = {
    /** Optional auth configuration; when provided, `/api/` routes require a valid bearer token. */
    apiAuth?: ApiAuthConfig
}

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
    /** Optional Fastify server options (merged over {@link defaultFastifyOptions}). */
    opts?: FastifyServerOptions
    /** Optional callback invoked once the server is listening. */
    done?: () => void
}

/**
 * Fastify module augmentation that exposes {@link LauncherLocals} as a
 * first-class decorator on every `FastifyInstance`.
 *
 * Registered in {@link launcher} via `fastify.decorate("locals", locals)`,
 * this augmentation makes `request.server.locals` fully typed without
 * requiring manual casts or `getDecorator` calls in route handlers.
 */
declare module "fastify" {
    interface FastifyInstance {
        locals: LauncherLocals
    }
}
