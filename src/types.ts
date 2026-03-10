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
    // biome-ignore lint/suspicious/noExplicitAny: third-party plugins use varied option types
    plugin: FastifyPluginCallback<any> | FastifyPluginAsync<any>
    /** Optional options forwarded to the plugin on registration. */
    opts?: FastifyPluginOptions
}

/**
 * Application locals decorated onto the Fastify instance and available
 * throughout the request lifecycle.
 */
export type LauncherLocals = {
    /** Package metadata (e.g. contents of `package.json`). */
    pkg?: object
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
