import process, { env } from "node:process"
import { getConsoleLogger, main } from "@darthcav/ts-utils"
import pkg from "../package.json" with { type: "json" }
import { createKeycloakVerifier } from "./auth/keycloak.ts"
import {
    defaultPlugins,
    defaultRoutes,
    type KeycloakAuthConfig,
    launcher,
} from "./index.ts"

const logger = await getConsoleLogger(pkg.name, "info")

main(pkg.name, logger, async () => {
    const authPaths = env["API_AUTH_PATHS"]
        ?.split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

    const keycloakUrl = env["KEYCLOAK_URL"]?.trim()
    const keycloakRealm = env["KEYCLOAK_REALM"]?.trim()
    const keycloakClientId = env["KEYCLOAK_CLIENT_ID"]?.trim()
    const keycloakClientSecret = env["KEYCLOAK_CLIENT_SECRET"]?.trim()

    const keycloakAuth: KeycloakAuthConfig | undefined =
        keycloakUrl && keycloakRealm && keycloakClientId && keycloakClientSecret
            ? {
                  url: keycloakUrl,
                  realm: keycloakRealm,
                  clientId: keycloakClientId,
                  clientSecret: keycloakClientSecret,
              }
            : undefined

    const locals = {
        pkg,
        host: env["HOST"] ?? "localhost",
        port: Number(env["CONTAINER_EXPOSE_PORT"]) || 8888,
        ...(authPaths?.length ? { authPaths } : {}),
        ...(keycloakRealm ? { authRealm: keycloakRealm } : {}),
    }
    const plugins = keycloakAuth
        ? defaultPlugins({ locals, keycloakAuth })
        : defaultPlugins({ locals })
    const routes = defaultRoutes()

    const fastify = keycloakAuth
        ? launcher({
              logger,
              locals,
              plugins,
              routes,
              verifyToken: createKeycloakVerifier(keycloakAuth),
          })
        : launcher({ logger, locals, plugins, routes })

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.on(signal, async (signal) =>
            fastify
                .close()
                .then(() => {
                    logger.error(
                        `Process interrupted and server closed. Received signal: ${signal}`,
                    )
                    process.exit(0)
                })
                .catch((error) => {
                    logger.error(`Server shutdown error: ${error}`)
                    process.exit(1)
                }),
        )
    }
})
