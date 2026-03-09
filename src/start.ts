import { getConsoleLogger, main } from "@darthcav/ts-utils"
import pkg from "../package.json" with { type: "json" }
import { defaultPlugins, defaultRoutes, launcher } from "./index.ts"

const logger = await getConsoleLogger(pkg.name, "info")

main(pkg.name, logger, (logger) => {
    const locals = { pkg }
    const plugins = defaultPlugins({ locals })
    const routes = defaultRoutes()

    launcher({ logger, locals, plugins, routes })
})
