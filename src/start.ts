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

    // TRUST_PROXY: `true`/`false`, a hop count (e.g. `1`), or a comma-separated
    // IP/CIDR allowlist (e.g. `127.0.0.1,10.0.0.0/8`). Defaults to disabled.
    const trustProxyEnv = env["TRUST_PROXY"]?.trim()
    const trustProxy: boolean | number | string | undefined =
        !trustProxyEnv || trustProxyEnv === "false"
            ? undefined
            : trustProxyEnv === "true"
              ? true
              : /^\d+$/.test(trustProxyEnv)
                ? Number(trustProxyEnv)
                : trustProxyEnv

    // ENABLE_DOCS: `true`/`false` to force Swagger UI (`/docs`) on or off.
    // When unset, defaultPlugins decides based on NODE_ENV (off in production).
    const enableDocsEnv = env["ENABLE_DOCS"]?.trim()
    const docs: boolean | undefined =
        enableDocsEnv === "true"
            ? true
            : enableDocsEnv === "false"
              ? false
              : undefined

    const keycloakAuth: KeycloakAuthConfig | undefined =
        keycloakUrl && keycloakRealm && keycloakClientId
            ? {
                  url: keycloakUrl,
                  realm: keycloakRealm,
                  clientId: keycloakClientId,
              }
            : undefined

    const locals = {
        pkg,
        host: env["HOST"] ?? "localhost",
        port: Number(env["CONTAINER_EXPOSE_PORT"]) || 8888,
        ...(authPaths?.length ? { authPaths } : {}),
        ...(keycloakRealm ? { authRealm: keycloakRealm } : {}),
    }
    const plugins = defaultPlugins({
        locals,
        ...(keycloakAuth ? { keycloakAuth } : {}),
        ...(docs !== undefined ? { docs } : {}),
    })
    const routes = defaultRoutes()

    const fastify = launcher({
        logger,
        locals,
        plugins,
        routes,
        ...(trustProxy !== undefined ? { opts: { trustProxy } } : {}),
        ...(keycloakAuth
            ? { verifyToken: createKeycloakVerifier(keycloakAuth) }
            : {}),
    })

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.on(signal, async (sig) =>
            fastify
                .close()
                .then(() => {
                    logger.error`Process interrupted and server closed. Received signal: ${sig}`
                    process.exit(0)
                })
                .catch((error) => {
                    logger.error`Server shutdown error: ${error}`
                    process.exit(1)
                }),
        )
    }
})
