import process, { env } from "node:process"
import { getConsoleLogger, main } from "@darthcav/ts-utils"
import pkg from "../package.json" with { type: "json" }
import {
    type ApiAuthConfig,
    defaultPlugins,
    defaultRoutes,
    launcher,
} from "./index.ts"

const logger = await getConsoleLogger(pkg.name, "info")

main(pkg.name, logger, async () => {
    const apiBearerToken = env["API_BEARER_TOKEN"]?.trim()
    const apiAuth: ApiAuthConfig | undefined = apiBearerToken
        ? {
              bearerToken: apiBearerToken,
              realm: env["API_AUTH_REALM"]?.trim() || "api",
          }
        : undefined
    const locals = {
        pkg,
        host: env["HOST"] ?? "localhost",
        port: Number(env["CONTAINER_EXPOSE_PORT"]) || 8888,
    }
    const plugins = apiAuth
        ? defaultPlugins({ locals, apiAuth })
        : defaultPlugins({ locals })
    const routes = apiAuth ? defaultRoutes({ apiAuth }) : defaultRoutes()

    const fastify = launcher({ logger, locals, plugins, routes })
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
