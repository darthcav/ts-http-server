import { readFileSync } from "node:fs"
import { join } from "node:path"
import FastifyAccepts from "@fastify/accepts"
import FastifyCompress from "@fastify/compress"
import FastifyCors from "@fastify/cors"
import FastifyEtag from "@fastify/etag"
import FastifyHelmet from "@fastify/helmet"
import FastifyStatic from "@fastify/static"
import FastifySwagger from "@fastify/swagger"
import FastifySwaggerUi from "@fastify/swagger-ui"
import FastifyView from "@fastify/view"
import Ejs from "ejs"
import type { OpenAPIV3_1 } from "openapi-types"
import { parse } from "yaml"
import type { DefaultPluginsOptions, FSTPlugin } from "../types.ts"

function configureApiDocumentAuth(
    apiDoc: OpenAPIV3_1.Document,
    apiAuth?: DefaultPluginsOptions["apiAuth"],
): void {
    if (!apiDoc.paths) {
        return
    }

    const apiPath = apiDoc.paths["/api/"]
    if (!apiPath) {
        return
    }

    if (apiAuth) {
        apiDoc.security = [{ bearerAuth: [] }, {}]
        for (const operation of Object.values(apiPath)) {
            if (
                !operation ||
                typeof operation !== "object" ||
                !("responses" in operation)
            ) {
                continue
            }

            operation.security = [{ bearerAuth: [] }]
            operation.responses ??= {}
            operation.responses["401"] = {
                description: "Unauthorized",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        examples: {
                            "401": { $ref: "#/components/examples/http_401" },
                        },
                    },
                },
            }
        }
        return
    }

    delete apiDoc.security
    for (const operation of Object.values(apiPath)) {
        if (
            !operation ||
            typeof operation !== "object" ||
            !("responses" in operation)
        ) {
            continue
        }

        delete operation.security
        delete operation.responses?.["401"]
    }
}

/**
 * Builds the default plugin map for use with `launcher`.
 *
 * Registers: `@fastify/accepts`, `@fastify/compress`,
 * `@fastify/cors`, `@fastify/etag`, `@fastify/helmet`,
 * `@fastify/view` (EJS), `@fastify/static`, `@fastify/swagger`,
 * and `@fastify/swagger-ui`.
 *
 * Synchronously reads and resolves all `$ref` schema files from
 * `src/openapi/schemas/` before building the plugin map, so `@fastify/swagger`
 * receives a fully inlined document.
 *
 * @param opts.locals - Application locals; `locals.pkg` is exposed as the
 *   default context for every EJS view.
 * @param opts.baseDir - Optional base directory for resolving the `src/`
 *   folder; defaults to the parent of `import.meta.dirname`.
 * @param opts.apiAuth - Optional auth configuration used to mark the generated
 *   `/api/` OpenAPI operations as bearer-protected.
 * @returns A `Map` of plugin names to plugin entries, suitable for passing as
 *   the `plugins` field of `LauncherOptions`.
 */
export default function defaultPlugins(
    opts: DefaultPluginsOptions,
): Map<string, FSTPlugin> {
    const { locals, baseDir = null } = opts
    const plugins = new Map<string, FSTPlugin>()
    const srcDir = baseDir
        ? join(baseDir, "src")
        : join(import.meta.dirname, "..")
    const apiDoc = parse(
        readFileSync(join(srcDir, "openapi", "api.yaml"), "utf8"),
    ) as OpenAPIV3_1.Document
    const schemas = apiDoc.components?.schemas
    if (schemas) {
        for (const key of Object.keys(schemas)) {
            const schema = schemas[key]
            if (schema && "$ref" in schema) {
                const refPath = join(
                    srcDir,
                    "openapi",
                    (schema as { $ref: string }).$ref,
                )
                schemas[key] = parse(
                    readFileSync(refPath, "utf8"),
                ) as OpenAPIV3_1.SchemaObject
            }
        }
    }
    configureApiDocumentAuth(apiDoc, opts.apiAuth)

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
                    connectSrc: ["'self'", "https://cdn.jsdelivr.net/"],
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
    plugins.set("@fastify/swagger", {
        plugin: FastifySwagger,
        opts: {
            mode: "static",
            specification: { document: apiDoc },
            exposeRoute: true,
        },
    })
    plugins.set("@fastify/swagger-ui", {
        plugin: FastifySwaggerUi,
        opts: {
            routePrefix: "/docs",
            uiConfig: {
                deepLinking: true,
                docExpansion: "list",
                dom_id: "#swagger-ui",
                jsonEditor: true,
                showRequestHeaders: true,
                tryItOutEnabled: false,
                onComplete: () => {
                    // @ts-expect-error — runs in browser context, not Node
                    const topbar = document.querySelector("div.topbar")
                    topbar?.remove()
                },
            },
        },
    })

    return plugins
}
