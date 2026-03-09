import type { Server } from "node:net"
import { env, exit } from "node:process"
import Fastify from "fastify"
import defaultFastifyOptions from "./defaults/defaultFastifyOptions.ts"
import defaultErrorHandler from "./handlers/defaultErrorHandler.ts"
import defaultNotFoundHandler from "./handlers/defaultNotFoundHandler.ts"
import { onResponse, preHandler } from "./index.ts"
import type { LauncherOptions } from "./types.ts"

/**
 * Creates and starts a Fastify HTTP server with the given configuration.
 *
 * Steps performed:
 * 1. Creates a `FastifyInstance` merging {@link defaultFastifyOptions} with `opts`.
 * 2. Decorates the instance with `locals` and any extra `decorators`.
 * 3. Registers all `plugins` and `routes`.
 * 4. Sets {@link defaultNotFoundHandler} and {@link defaultErrorHandler}.
 * 5. Registers {@link preHandler} and {@link onResponse} hooks.
 * 6. Calls `fastify.listen()` and invokes the optional `done` callback.
 *
 * @returns The underlying `net.Server` (e.g. for use with `server.close()`).
 */
export default function launcher({
    logger,
    locals,
    plugins,
    routes,
    decorators,
    opts,
    done,
}: LauncherOptions): Server {
    const host = locals?.host ?? "localhost"
    const port = locals?.port ?? Number(env["CONTAINER_EXPOSE_PORT"] ?? 8888)

    const fastify = Fastify({
        ...defaultFastifyOptions(logger),
        ...opts,
    })

    fastify.decorate("locals", locals)

    if (decorators instanceof Map) {
        for (const [key, value] of decorators) {
            fastify.decorate(key, value)
        }
    }

    for (const value of plugins.values()) {
        void fastify.register(value.plugin, value.opts ?? {})
    }

    for (const value of routes.values()) {
        fastify.route(value)
    }

    fastify.setNotFoundHandler(defaultNotFoundHandler)

    fastify.setErrorHandler(defaultErrorHandler)

    // TODO: Add hook for `onRequestAbort`
    fastify.addHook("preHandler", preHandler)
    fastify.addHook("onResponse", onResponse)

    fastify.listen({ host, port }, (error) => {
        if (error) {
            logger.error(
                `${error.message} [${(error as NodeJS.ErrnoException).code ?? ""}]`,
            )
            exit(1)
        }
        done?.()
    })

    return fastify.server
}
