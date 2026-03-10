import { join } from "node:path"
import FastifyAccepts from "@fastify/accepts"
import FastifyCompress from "@fastify/compress"
import FastifyCors from "@fastify/cors"
import FastifyEtag from "@fastify/etag"
import FastifyHelmet from "@fastify/helmet"
import FastifyStatic from "@fastify/static"
import FastifyView from "@fastify/view"
import Ejs from "ejs"
import type { FSTPlugin, LauncherLocals } from "../types.ts"

/**
 * Builds the default plugin map for use with `launcher`.
 *
 * Registers: `@fastify/accepts`, `@fastify/compress`,
 * `@fastify/cors`, `@fastify/etag`, `@fastify/helmet`,
 * `@fastify/view` (EJS), and `@fastify/static`.
 *
 * @param opts.locals - Application locals; `locals.pkg` is exposed as the
 *   default context for every EJS view.
 * @param opts.baseDir - Optional base directory for resolving the `src/` folder; defaults to the parent of `import.meta.dirname`.
 * @returns A `Map` of plugin names to plugin entries, suitable for passing as
 *   the `plugins` field of `LauncherOptions`.
 */
export default function defaultPlugins(opts: {
    locals: LauncherLocals
    baseDir?: string | null
}): Map<string, FSTPlugin> {
    const { locals, baseDir = null } = opts
    const plugins = new Map<string, FSTPlugin>()
    const srcDir = baseDir
        ? join(baseDir, "src")
        : join(import.meta.dirname, "..")

    plugins.set("@fastify/accepts", {
        plugin: FastifyAccepts,
    })
    plugins.set("@fastify/compress", {
        plugin: FastifyCompress,
    })
    plugins.set("@fastify/cors", {
        plugin: FastifyCors,
        opts: { origin: true },
    })
    plugins.set("@fastify/etag", {
        plugin: FastifyEtag,
        opts: { algorithm: "sha1" },
    })
    plugins.set("@fastify/helmet", {
        plugin: FastifyHelmet,
        opts: {
            global: true,
            contentSecurityPolicy: {
                directives: {
                    fontSrc: [
                        "'self'",
                        "https://fonts.googleapis.com/",
                        "https://fonts.gstatic.com/",
                    ],
                    scriptSrc: [
                        "'self'",
                        "'unsafe-inline'",
                        "https://cdn.jsdelivr.net/",
                    ],
                },
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
            },
        },
    })
    plugins.set("@fastify/view", {
        plugin: FastifyView,
        opts: {
            engine: { ejs: Ejs },
            root: join(srcDir, "views"),
            defaultContext: { pkg: locals.pkg },
        },
    })
    plugins.set("@fastify/static", {
        plugin: FastifyStatic,
        opts: {
            root: join(srcDir, "public"),
            prefix: "/",
        },
    })

    return plugins
}
