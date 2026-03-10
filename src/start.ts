import process from "node:process"
import { getConsoleLogger, main } from "@darthcav/ts-utils"
import pkg from "../package.json" with { type: "json" }
import { defaultPlugins, defaultRoutes, launcher } from "./index.ts"

const logger = await getConsoleLogger(pkg.name, "info")

main(pkg.name, logger, false, () => {
    const locals = { pkg }
    const plugins = defaultPlugins({ locals })
    const routes = defaultRoutes()

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
