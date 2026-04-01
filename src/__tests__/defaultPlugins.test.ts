import { equal, ok } from "node:assert/strict"
import { cwd } from "node:process"
import { suite, test } from "node:test"
import type { OpenAPIV3_1 } from "openapi-types"
import defaultPlugins from "../defaults/defaultPlugins.ts"

function getSwaggerDocument(
    plugins: ReturnType<typeof defaultPlugins>,
): OpenAPIV3_1.Document | undefined {
    const swaggerPlugin = plugins.get("@fastify/swagger")
    const specification = swaggerPlugin?.opts?.["specification"]

    if (
        specification &&
        typeof specification === "object" &&
        "document" in specification
    ) {
        return (specification as { document: OpenAPIV3_1.Document }).document
    }

    return undefined
}

suite("defaultPlugins", () => {
    const locals = {
        pkg: { name: "ts-http-server", version: "0.0.0", description: "Test" },
    }

    test("returns all plugins using default baseDir", () => {
        const plugins = defaultPlugins({ locals })
        equal(plugins.size, 9)
        ok(plugins.has("@fastify/accepts"))
        ok(plugins.has("@fastify/view"))
        ok(plugins.has("@fastify/static"))
        ok(plugins.has("@fastify/swagger"))
        ok(plugins.has("@fastify/swagger-ui"))
    })

    test("returns all plugins using explicit baseDir", () => {
        const plugins = defaultPlugins({ locals, baseDir: cwd() })
        equal(plugins.size, 9)
        ok(plugins.has("@fastify/view"))
        ok(plugins.has("@fastify/static"))
        ok(plugins.has("@fastify/swagger"))
        ok(plugins.has("@fastify/swagger-ui"))
    })

    test("keeps /api/ public in OpenAPI when keycloakAuth is omitted", () => {
        const plugins = defaultPlugins({ locals })
        const document = getSwaggerDocument(plugins)

        ok(document)
        equal(document.security, undefined)
        equal(document.paths?.["/api/"]?.get?.security, undefined)
        equal(document.paths?.["/api/"]?.get?.responses?.["401"], undefined)
        // The placeholder openIdConnect scheme defined in api.yaml is cleaned up
        equal(
            document.components?.securitySchemes?.["openIdConnect"],
            undefined,
        )
    })

    test("marks /api/ as OpenID Connect–protected in OpenAPI when keycloakAuth is provided", () => {
        const plugins = defaultPlugins({
            locals,
            keycloakAuth: {
                url: "https://auth.example.com",
                realm: "test-realm",
                clientId: "test-client",
                clientSecret: "test-secret",
            },
        })
        const document = getSwaggerDocument(plugins)

        ok(document)
        equal(Array.isArray(document.security), true)
        equal(
            document.paths?.["/api/"]?.get?.security?.[0]?.["openIdConnect"]
                ?.length,
            0,
        )
        ok(document.paths?.["/api/"]?.get?.responses?.["401"])

        const scheme = document.components?.securitySchemes?.[
            "openIdConnect"
        ] as { type: string; openIdConnectUrl: string } | undefined
        ok(scheme)
        equal(scheme.type, "openIdConnect")
        ok(
            scheme.openIdConnectUrl.includes(
                "https://auth.example.com/realms/test-realm",
            ),
        )
    })
})
