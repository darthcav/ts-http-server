import process from "node:process"
import { notFound } from "@hapi/boom"
import Fastify, { type FastifyInstance } from "fastify"
import defaultErrorHandler from "./defaults/defaultErrorHandler.ts"
import defaultFastifyOptions from "./defaults/defaultFastifyOptions.ts"
import { createAuthPreHandler } from "./hooks/authPreHandler.ts"
import { onResponse, preHandler } from "./index.ts"
import type { LauncherOptions } from "./types.ts"

/**
 * Creates and starts a Fastify HTTP server with the given configuration.
 *
 * Steps performed:
 * 1. Creates a `FastifyInstance` merging {@link defaultFastifyOptions} with `opts`.
 * 2. Decorates the instance with `locals`, `verifyToken`, and any extra `decorators`.
 * 3. Registers all `plugins` and `routes`.
 * 4. Sets a `notFound` handler (throws Boom 404) and {@link defaultErrorHandler}.
 * 5. Registers {@link preHandler} and {@link onResponse} hooks.
 * 6. Calls `fastify.listen()` and invokes the optional `done` callback.
 *
 * @param opts - Options object configuring the server; see {@link LauncherOptions} for details.
 * @returns The `FastifyInstance` (e.g. for use with `fastify.close()`).
 */
export default function launcher({
    logger,
    locals,
    plugins,
    routes,
    decorators,
    verifyToken,
    opts,
    done,
}: LauncherOptions): FastifyInstance {
    const host = locals?.host ?? "localhost"
    const port = locals?.port ?? 8888

    const fastify = Fastify({
        ...defaultFastifyOptions(logger),
        ...opts,
    })

    fastify.decorate("locals", locals)
    fastify.decorate("verifyToken", verifyToken ?? (async () => false))

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

    fastify.setNotFoundHandler(async (_request, _reply) => {
        throw notFound()
    })

    fastify.setErrorHandler(defaultErrorHandler)

    if (locals.authPaths?.length) {
        fastify.addHook(
            "preHandler",
            createAuthPreHandler(locals.authPaths, locals.authRealm),
        )
    }

    // TODO: Add hook for `onRequestAbort`
    fastify.addHook("preHandler", preHandler)
    fastify.addHook("onResponse", onResponse)

    fastify.listen({ host, port }, (error) => {
        if (error) {
            logger.error(`${error.message}`)
            process.exit(1)
        }
        done?.()
    })

    return fastify
}
