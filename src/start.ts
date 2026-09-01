import process, { env } from "node:process"
import { getConsoleLogger, main } from "@darthcav/ts-utils"
import pkg from "../package.json" with { type: "json" }
import { createKeycloakVerifier } from "./auth/keycloak.ts"
import { readConfig } from "./config.ts"
import { defaultPlugins, defaultRoutes, launcher } from "./index.ts"

const logger = await getConsoleLogger(pkg.name, "info")

main(pkg.name, logger, async () => {
    const config = readConfig(env)

    for (const warning of config.warnings) {
        logger.warn`Configuration warning: ${warning}`
    }

    const locals = {
        pkg,
        host: config.host,
        port: config.port,
        ...(config.authPaths ? { authPaths: config.authPaths } : {}),
        ...(config.authRealm ? { authRealm: config.authRealm } : {}),
    }
    const plugins = defaultPlugins({
        locals,
        ...(config.keycloakAuth ? { keycloakAuth: config.keycloakAuth } : {}),
        ...(config.docs !== undefined ? { docs: config.docs } : {}),
    })
    const routes = defaultRoutes()

    const fastify = launcher({
        logger,
        locals,
        plugins,
        routes,
        ...(config.trustProxy !== undefined
            ? { opts: { trustProxy: config.trustProxy } }
            : {}),
        ...(config.keycloakAuth
            ? { verifyToken: createKeycloakVerifier(config.keycloakAuth) }
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
